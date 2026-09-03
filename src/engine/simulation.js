import {
  CONDITION_WEIGHTS,
  DECAY_ACCELERATION,
  DECAY_ACCELERATION_BELOW,
  DECAY_BASE,
  GAIN_DIMINISH,
  GAIN_DIMINISH_ABOVE,
  HEAVY_RAIN_BUNKER_LOSS,
  HOLE_COUNT,
  BASE_GAIN,
  HOC_STRESS_DAMAGE,
  HOC_SURFACES,
  MOWING_WEATHER,
  PATTERN_WEAR_DAMAGE,
  PATTERN_WEAR_DECAY,
  PATTERN_WEAR_DEFAULT,
  PATTERN_WEAR_THRESHOLD,
  PATTERNED_SURFACES,
  QUALITY_MAX,
  QUALITY_MIN,
  ROLLER_GAIN_BONUS,
  SEASON_GROWTH,
  SURFACE_KEYS,
  SATISFACTION_MAX,
  SATISFACTION_MIN,
  WET_GAIN_MULT,
  WEATHER_HEAVY_RAIN,
} from '../data/constants.js';
import { PLAYER_ID } from '../data/constants.js';
import { generateCandidates } from '../data/staff.js';
import { getTask, taskAppliesQuality } from '../data/tasks.js';
import { workerById, workerQualityMultiplier, qualityRandomFactor } from './assignment.js';
import { applyMowingAftermath, hocStressApplies, mowingGain } from './mowing.js';
import { calendarFromDay } from './calendar.js';
import {
  applyWear,
  applyConditionLoss,
  autonomousReady,
  ensureAutoWeek,
  interruptionMinutesForDay,
  isMachineAvailable,
  pickMachine,
  rollBreakdowns,
  surfaceCeiling,
  wearMultiplier,
} from './equipment.js';
import { applyEarlyStartComplaints, applyMorale, prepareMorningWorkers, wageBill } from './staff.js';
import { createRng } from './rng.js';
import { applyFertiliser, applySpray, emptyDisease, resolveDisease } from './disease.js';
import { resolveIrrigation } from './irrigation.js';
import {
  applyHandWater,
  droughtDecay,
  emptyMoisture,
  emptyMoistureReadDay,
  isAboveBand,
  isBelowBand,
  revealMoisture,
  tickMoisture,
} from './moisture.js';
import { rollMorningWithRng } from './weather.js';
import { closeSeason } from './budget.js';
import { golferMail, gmMissedTournamentMail, gmSeasonMail, gmTournamentRequestMail, meetingDue, pushMail, tickDaysSinceWorked } from './mail.js';
import { neglectMail, neglectSatisfactionDrain } from './neglect.js';
import {
  applyScheduledTournament,
  comingSeason,
  comingSeasonStartDay,
  isTournamentPromptDay,
  seasonEndDay,
} from './tournament.js';
import { tickProjects } from './projects.js';
import { buildYearReview, emptyYearRecord, hiredIds, recordYearDay } from './history.js';
import { clampRange, clampStanding, tickSatisfaction } from './satisfaction.js';
import { GM_MEETING_SKIP_STANDING } from '../data/constants.js';

export function clampQuality(value) {
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, value));
}

export function courseCondition(surfaces) {
  return SURFACE_KEYS.reduce((total, key) => total + surfaces[key].quality * CONDITION_WEIGHTS[key], 0);
}

export function decayAmount(quality, season) {
  let decay = DECAY_BASE;
  if (quality < DECAY_ACCELERATION_BELOW) {
    decay *= DECAY_ACCELERATION;
  }
  decay *= SEASON_GROWTH[season];
  return decay;
}

export function applyGain(quality, gain, ceiling = QUALITY_MAX) {
  let adjusted = gain;
  if (quality > GAIN_DIMINISH_ABOVE) {
    adjusted *= GAIN_DIMINISH;
  }
  if (quality >= ceiling) {
    return clampQuality(quality);
  }
  return clampQuality(Math.min(ceiling, quality + adjusted));
}

export function applyDecay(quality, season) {
  return clampQuality(quality - decayAmount(quality, season));
}

function cloneSurfaces(surfaces) {
  return SURFACE_KEYS.reduce((next, key) => {
    next[key] = { ...surfaces[key] };
    return next;
  }, {});
}

function capacityOf(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesToday, 0);
}

export function resolveDay(state) {
  const rng = createRng(state.rngSeed);
  const irrigation = resolveIrrigation(state);
  const surfaces = cloneSurfaces(state.surfaces);
  const before = cloneSurfaces(state.surfaces);
  const conditionBefore = courseCondition(state.surfaces);
  const worked = new Set();
  const done = [];
  const usedMachineIds = [];
  const dropped = [];

  let disease = emptyDisease();
  for (const surface of Object.keys(disease)) {
    if (state.disease?.[surface]) disease[surface] = { ...state.disease[surface] };
  }
  let sprayedUntil = { ...(state.sprayedUntil ?? {}) };
  let fertiliserUntil = { ...(state.fertiliserUntil ?? {}) };
  let maintenanceBudget = state.maintenanceBudget ?? 0;
  let materialsSpent = 0;
  let tournamentPrepScore = state.tournamentPrepScore ?? 0;

  let planned = [...state.plannedTasks];
  const extra = interruptionMinutesForDay(state);
  let plannedMinutes = planned.reduce((sum, item) => sum + item.minutes, 0);
  while (extra > 0 && plannedMinutes + extra > capacityOf(state) && planned.length) {
    const item = planned.pop();
    plannedMinutes -= item.minutes;
    dropped.push(item);
  }

  function markUsed(id) {
    if (id && !usedMachineIds.includes(id)) usedMachineIds.push(id);
  }

  const wearIncremented = new Set();
  const holes = state.holes ?? HOLE_COUNT;
  let moisture = state.moisture ?? emptyMoisture(holes);
  let moistureReadDay = state.moistureReadDay ?? emptyMoistureReadDay(holes);

  for (const plannedTask of planned) {
    const task = getTask(plannedTask.taskId);
    if (task.kind === 'spray' && task.surface) {
      const sprayed = applySpray({ ...state, disease, sprayedUntil }, task.surface);
      disease = sprayed.disease;
      sprayedUntil = sprayed.sprayedUntil;
    }
    if (task.kind === 'fertiliser' && task.surface) {
      fertiliserUntil = applyFertiliser({ ...state, fertiliserUntil }, task.surface).fertiliserUntil;
    }
    if (task.materialsCost) {
      maintenanceBudget -= task.materialsCost;
      materialsSpent += task.materialsCost;
    }
    if (task.kind === 'prep') {
      tournamentPrepScore += task.prepBonus ?? 0;
      if (task.surface) worked.add(task.surface);
    }
    if (task.kind === 'moistureCheck' && task.surface) {
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holes);
    }
    if (task.id === 'handWater') {
      moisture = applyHandWater(moisture, plannedTask.greens ?? state.handWaterTargets, holes);
    }
    if (task.mowing && state.hasTurfRad && task.surface) {
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holes);
    }

    const machine = pickMachine(state, task);
    if (machine && (task.mowing || task.id === 'rollGreens')) markUsed(machine.id);
    if (task.id === 'rollGreens' && isMachineAvailable(state, 'greensRoller')) {
      markUsed('greensRoller');
    }

    if (!taskAppliesQuality(task) || !task.surface) {
      done.push({
        taskId: plannedTask.taskId,
        name: task.name,
        surface: task.surface,
        minutes: plannedTask.minutes,
        before: null,
        after: null,
      });
      continue;
    }

    const worker = workerById(state, plannedTask.workerId) ?? state.workers[0];
    let gain = task.mowing
      ? mowingGain({ ...state, surfaces }, task.id, workerQualityMultiplier(worker))
      : BASE_GAIN * workerQualityMultiplier(worker);
    if (task.id === 'rollGreens' && isMachineAvailable(state, 'greensRoller')) {
      gain += ROLLER_GAIN_BONUS;
    }
    if (machine) {
      gain *= wearMultiplier(state, machine.id);
    }
    gain *= qualityRandomFactor(worker, rng);
    if (isAboveBand(moisture, task.surface)) gain *= WET_GAIN_MULT;

    const qualityBefore = surfaces[task.surface].quality;
    let qualityAfter = applyGain(qualityBefore, gain, surfaceCeiling({ ...state, fertiliserUntil, surfaces }, task.surface));
    surfaces[task.surface] = { ...surfaces[task.surface], quality: qualityAfter };
    if (task.mowing) {
      surfaces[task.surface] = applyMowingAftermath(surfaces[task.surface], task.surface, state.day, wearIncremented);
      qualityAfter = surfaces[task.surface].quality;
    }
    if (task.id === 'rakeBunkers') {
      surfaces.bunkers = { ...surfaces.bunkers, lastRakedDay: state.day };
    }
    worked.add(task.surface);
    done.push({
      taskId: plannedTask.taskId,
      name: task.name,
      surface: task.surface,
      minutes: plannedTask.minutes,
      before: qualityBefore,
      after: qualityAfter,
    });
  }

  if (autonomousReady(state) && !MOWING_WEATHER.includes(state.weather)) {
    markUsed('autonomousMower');
    const autoBySurface = { fairways: 'cutFairways', rough: 'cutRough' };
    for (const surface of ['fairways', 'rough']) {
      if (worked.has(surface)) continue;
      const qualityBefore = surfaces[surface].quality;
      const gain = mowingGain({ ...state, surfaces }, autoBySurface[surface], 1) * (isAboveBand(moisture, surface) ? WET_GAIN_MULT : 1);
      let qualityAfter = applyGain(
        qualityBefore,
        gain,
        surfaceCeiling({ ...state, fertiliserUntil, surfaces }, surface),
      );
      surfaces[surface] = applyMowingAftermath(
        { ...surfaces[surface], quality: qualityAfter },
        surface,
        state.day,
        wearIncremented,
      );
      qualityAfter = surfaces[surface].quality;
      worked.add(surface);
      if (state.hasTurfRad) {
        moistureReadDay = revealMoisture(moistureReadDay, surface, state.day, holes);
      }
      done.push({
        taskId: 'autonomousMower',
        name: 'Autonomous cut',
        surface,
        minutes: 0,
        before: qualityBefore,
        after: qualityAfter,
      });
    }
  }

  const skipped = [];
  for (const key of SURFACE_KEYS) {
    if (worked.has(key)) continue;
    const qualityBefore = surfaces[key].quality;
    const qualityAfter = applyDecay(qualityBefore, state.season);
    surfaces[key].quality = qualityAfter;
    skipped.push({ surface: key, before: qualityBefore, after: qualityAfter });
  }

  if (state.weather === WEATHER_HEAVY_RAIN) {
    surfaces.bunkers.quality = clampQuality(surfaces.bunkers.quality - HEAVY_RAIN_BUNKER_LOSS);
  }

  moisture = tickMoisture({ ...state, moisture, surfaces });
  const extraDecay = droughtDecay(moisture);
  for (const [surface, amount] of Object.entries(extraDecay)) {
    surfaces[surface].quality = clampQuality(surfaces[surface].quality - amount);
    const skip = skipped.find((item) => item.surface === surface);
    if (skip) skip.after = surfaces[surface].quality;
  }

  for (const key of PATTERNED_SURFACES) {
    if (!wearIncremented.has(key) && !surfaces[key].autoRotate) {
      surfaces[key] = {
        ...surfaces[key],
        patternWear: Math.max(PATTERN_WEAR_DEFAULT, (surfaces[key].patternWear ?? 0) - PATTERN_WEAR_DECAY),
      };
    }
    if ((surfaces[key].patternWear ?? 0) > PATTERN_WEAR_THRESHOLD) {
      surfaces[key] = {
        ...surfaces[key],
        quality: clampQuality(surfaces[key].quality - PATTERN_WEAR_DAMAGE),
      };
    }
  }

  for (const key of HOC_SURFACES) {
    if (hocStressApplies({ ...state, surfaces, moisture }, key, isBelowBand(moisture, key))) {
      surfaces[key] = {
        ...surfaces[key],
        quality: clampQuality(surfaces[key].quality - HOC_STRESS_DAMAGE),
      };
    }
  }

  const diseaseTick = resolveDisease({ ...state, disease, sprayedUntil, moisture });
  disease = diseaseTick.disease;
  for (const item of diseaseTick.ongoing) {
    surfaces[item.surface].quality = clampQuality(surfaces[item.surface].quality - item.drop);
  }
  for (const item of diseaseTick.outbreaks) {
    surfaces[item.surface].quality = clampQuality(surfaces[item.surface].quality - item.drop);
  }

  const machineWear = applyWear(state, usedMachineIds);
  const machineCondition = applyConditionLoss(state, usedMachineIds);
  const wornState = { ...state, machineWear, machineCondition };
  const { machineBroken, breakdowns } = rollBreakdowns(wornState, usedMachineIds, rng);

  let workers = state.workers.map((worker) => ({ ...worker }));
  for (const item of dropped) {
    workers = workers.map((worker) =>
      worker.id === item.workerId ? { ...worker, minutesUsed: worker.minutesUsed - item.minutes } : worker,
    );
  }
  if (extra > 0) {
    workers = workers.map((worker) =>
      worker.id === PLAYER_ID ? { ...worker, minutesUsed: worker.minutesUsed + extra } : worker,
    );
  }
  workers = applyMorale(workers);
  maintenanceBudget = maintenanceBudget - wageBill(state.workers) - irrigation.mainsCost;
  const complaint = applyEarlyStartComplaints({ ...state, maintenanceBudget, workers, surfaces });
  maintenanceBudget = complaint.state.maintenanceBudget;

  const daysSinceWorked = tickDaysSinceWorked(state.daysSinceWorked, worked);
  let gmStanding = state.gmStanding ?? 0;
  if (meetingDue(state.day) && !planned.some((item) => item.taskId === 'gmMeeting')) {
    gmStanding = clampStanding(gmStanding - GM_MEETING_SKIP_STANDING);
  }

  let mailed = {
    ...complaint.state,
    workers,
    surfaces,
    maintenanceBudget,
    daysSinceWorked,
    gmStanding,
    inbox: state.inbox ?? [],
    nextMailId: state.nextMailId ?? 1,
    pond: irrigation.pond,
  };
  for (const mail of golferMail(mailed)) {
    mailed = pushMail(mailed, mail);
  }
  const neglectMorning = { ...mailed, day: state.day + 1 };
  for (const mail of neglectMail(neglectMorning)) {
    mailed = pushMail(mailed, mail);
  }
  const satisfaction = clampRange(
    tickSatisfaction(mailed) - neglectSatisfactionDrain(neglectMorning),
    SATISFACTION_MIN,
    SATISFACTION_MAX,
  );

  const tournament = applyScheduledTournament(
    {
      ...mailed,
      cash: state.cash,
      satisfaction,
      tournamentPrepScore,
      tournaments: state.tournaments ?? [],
      weather: state.weather,
    },
    surfaces,
  );

  const day = state.day + 1;
  const calendar = calendarFromDay(day);
  const seasonChanged = calendar.season !== state.season;
  const yearChanged = calendar.year !== state.year;
  let next = {
    ...tournament.state,
    day,
    season: calendar.season,
    year: calendar.year,
    cash: tournament.state.cash,
    surfaces,
    moisture,
    moistureReadDay,
    pond: irrigation.pond,
    maintenanceBudget,
    disease,
    sprayedUntil,
    fertiliserUntil,
    machineWear,
    machineCondition,
    machineBroken,
    plannedTasks: [],
    workers,
    satisfaction: tournament.state.satisfaction,
    gmStanding,
    daysSinceWorked,
    snappedToday: false,
    tournamentPrepScore: tournament.state.tournamentPrepScore,
    tournaments: tournament.state.tournaments,
    yearRecord: recordYearDay(
      { ...tournament.state, day: state.day, year: state.year },
      {
        condition: courseCondition(surfaces),
        maintenanceSpent:
          wageBill(state.workers) + irrigation.mainsCost + materialsSpent + (complaint.fine ?? 0),
      },
    ),
  };
  let seasonClose = null;
  if (seasonChanged) {
    const ignored = next.pendingTournamentSetup;
    next = {
      ...next,
      candidates: generateCandidates(rng),
      candidatesSeason: calendar.season,
      volunteerDayChangedThisSeason: false,
      neighbourComplaintsThisSeason: 0,
      pendingTournamentSetup: false,
      gmTournamentRequestPending: false,
      tournamentSetupSeason: null,
      tournamentSetupDeadline: null,
      tournamentSetupStartDay: null,
      tournamentPrepScore: 0,
      tournaments: ignored
        ? []
        : (next.tournaments ?? []).filter((item) => item.season === calendar.season || item.day >= next.day),
    };
    seasonClose = closeSeason(next, { yearChanged });
    next = seasonClose.state;
    for (const mail of seasonClose.mail.concat(
      gmSeasonMail({
        leftover: seasonClose.leftover,
        insolvent: seasonClose.insolvent,
        yearChanged,
        maintenance: next.maintenanceBudget,
        capital: next.capitalBudget,
      }),
    )) {
      next = pushMail(next, mail);
    }
    if (ignored) {
      next = pushMail(next, gmMissedTournamentMail(calendar.season));
    }
    if (yearChanged) {
      next = {
        ...next,
        lastYearReview: buildYearReview({ ...next, yearRecord: next.yearRecord, workers: next.workers }),
        pendingYearReview: true,
        yearRecord: emptyYearRecord(calendar.year, hiredIds(next)),
      };
    }
  }
  const built = tickProjects(next);
  next = built.state;
  const scheduled = ensureAutoWeek(next, rng);
  next = scheduled.state;
  const morning = rollMorningWithRng(next, calendar.season, rng);
  next = {
    ...next,
    weather: morning.weather,
    forecast: morning.forecast,
    weatherQueue: morning.weatherQueue,
    forecastStrip: morning.forecastStrip,
    windSpeed: morning.windSpeed,
    windDir: morning.windDir,
    rngSeed: rng.seed,
    workers: prepareMorningWorkers({ ...next, weather: morning.weather }, morning.weather, rng),
  };

  if (isTournamentPromptDay(next.day) && !next.pendingTournamentSetup) {
    const setupSeason = comingSeason(next.day);
    const deadline = seasonEndDay(next.day);
    next = {
      ...next,
      pendingTournamentSetup: true,
      gmTournamentRequestPending: true,
      tournamentSetupSeason: setupSeason,
      tournamentSetupDeadline: deadline,
      tournamentSetupStartDay: comingSeasonStartDay(next.day),
    };
    next = pushMail(next, gmTournamentRequestMail(setupSeason, deadline));
  }

  const summary = {
    day: state.day,
    weather: state.weather,
    done,
    skipped,
    dropped,
    interruptions: extra,
    breakdowns,
    wages: wageBill(state.workers),
    gmWarning: complaint.warning,
    neighbourFine: complaint.fine,
    mainsCost: irrigation.mainsCost,
    mainsM3: irrigation.shortfall,
    pond: irrigation.pond,
    materialsSpent,
    maintenanceBudget,
    outbreaks: diseaseTick.outbreaks,
    diseaseOngoing: diseaseTick.ongoing,
    disease,
    tournament: tournament.result,
    projectsCompleted: built.completed,
    seasonClose: seasonClose
      ? { leftover: seasonClose.leftover, insolvent: seasonClose.insolvent, dismissed: next.dismissed }
      : null,
    before,
    after: cloneSurfaces(surfaces),
    conditionBefore,
    conditionAfter: courseCondition(surfaces),
  };

  return { state: next, summary };
}
