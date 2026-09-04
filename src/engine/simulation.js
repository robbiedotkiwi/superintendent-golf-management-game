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
import { applyMowingAftermath, hocStressApplies, mowingGain, rotatePatternAngle } from './mowing.js';
import {
  cloneHoles,
  courseCondition as holeCourseCondition,
  holeCount,
  holeKind,
  mapHoleSurfaces,
  meanQuality,
  presentHoles,
  surfaceSettings,
} from './holes.js';
import { calendarFromDay } from './calendar.js';
import {
  applyWear,
  applyConditionLoss,
  autonomousReady,
  ensureAutoWeek,
  interruptionMinutesForDay,
  isMachineAvailable,
  getMachine,
  pickMachineForTask,
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
  writeMoistureToHoles,
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
import { tickMarket, rollUsedListings } from './market.js';
import { tickEvents } from './events.js';

export function clampQuality(value) {
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, value));
}

export function courseCondition(stateOrSurfaces) {
  if (stateOrSurfaces && Array.isArray(stateOrSurfaces.holes)) {
    return holeCourseCondition(stateOrSurfaces);
  }
  if (stateOrSurfaces && SURFACE_KEYS.every((key) => stateOrSurfaces[key]?.quality != null)) {
    return SURFACE_KEYS.reduce((total, key) => total + stateOrSurfaces[key].quality * CONDITION_WEIGHTS[key], 0);
  }
  return holeCourseCondition(stateOrSurfaces);
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

function workingState(state, holes) {
  return { ...state, holes };
}

function capacityOf(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesToday, 0);
}

export function resolveDay(state) {
  const rng = createRng(state.rngSeed);
  const irrigation = resolveIrrigation(state);
  let holes = cloneHoles(state.holes);
  const before = cloneHoles(state.holes);
  const conditionBefore = courseCondition(state);
  let surfaceDefaults = { ...state.surfaceDefaults };
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
  const holeN = holeCount({ holes });
  let moisture = state.moisture ?? emptyMoisture(holeN);
  let moistureReadDay = state.moistureReadDay ?? emptyMoistureReadDay(holeN);

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
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holeN);
    }
    if (task.id === 'handWater') {
      moisture = applyHandWater(moisture, plannedTask.greens ?? state.handWaterTargets, holeN);
    }
    if (task.mowing && state.hasTurfRad && task.surface) {
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holeN);
    }

    const machine = plannedTask.machineId
      ? getMachine(plannedTask.machineId)
      : pickMachineForTask(state, task, workerById(state, plannedTask.workerId));
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
    const live = workingState({ ...state, surfaceDefaults }, holes);
    let gain = task.mowing
      ? mowingGain(live, task.id, workerQualityMultiplier(worker))
      : BASE_GAIN * workerQualityMultiplier(worker);
    if (task.id === 'rollGreens' && isMachineAvailable(state, 'greensRoller')) {
      gain += ROLLER_GAIN_BONUS;
    }
    if (machine) {
      gain *= wearMultiplier(state, machine.id);
    }
    gain *= qualityRandomFactor(worker, rng);
    if (isAboveBand(moisture, task.surface)) gain *= WET_GAIN_MULT;

    const qualityBefore = meanQuality(live, task.surface);
    const ceiling = surfaceCeiling({ ...live, fertiliserUntil }, task.surface);
    holes = mapHoleSurfaces(holes, task.surface, (record, hole) => {
      let qualityAfter = applyGain(record.quality, gain, ceiling);
      let next = { ...record, quality: qualityAfter };
      if (task.mowing) {
        next = applyMowingAftermath(
          next,
          task.surface,
          state.day,
          wearIncremented,
          surfaceSettings(live, hole.id, task.surface),
        );
      }
      if (task.id === 'rakeBunkers') {
        next = { ...next, lastRakedDay: state.day };
      }
      return next;
    });
    if (task.mowing && surfaceDefaults[task.surface]?.autoRotate) {
      surfaceDefaults = {
        ...surfaceDefaults,
        [task.surface]: {
          ...surfaceDefaults[task.surface],
          angle: rotatePatternAngle(surfaceDefaults[task.surface].angle ?? 0),
        },
      };
    }
    const qualityAfter = meanQuality(workingState({ ...state, surfaceDefaults }, holes), task.surface);
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
      const live = workingState({ ...state, surfaceDefaults }, holes);
      const qualityBefore = meanQuality(live, surface);
      const gain = mowingGain(live, autoBySurface[surface], 1) * (isAboveBand(moisture, surface) ? WET_GAIN_MULT : 1);
      const ceiling = surfaceCeiling({ ...live, fertiliserUntil }, surface);
      holes = mapHoleSurfaces(holes, surface, (record, hole) => {
        const qualityAfter = applyGain(record.quality, gain, ceiling);
        return applyMowingAftermath(
          { ...record, quality: qualityAfter },
          surface,
          state.day,
          wearIncremented,
          surfaceSettings(live, hole.id, surface),
        );
      });
      worked.add(surface);
      if (state.hasTurfRad) {
        moistureReadDay = revealMoisture(moistureReadDay, surface, state.day, holeN);
      }
      done.push({
        taskId: 'autonomousMower',
        name: 'Autonomous cut',
        surface,
        minutes: 0,
        before: qualityBefore,
        after: meanQuality(workingState({ ...state, surfaceDefaults }, holes), surface),
      });
    }
  }

  const skipped = [];
  for (const key of SURFACE_KEYS) {
    if (worked.has(key)) continue;
    const live = workingState({ ...state, surfaceDefaults }, holes);
    const qualityBefore = meanQuality(live, key);
    holes = mapHoleSurfaces(holes, key, (record) => ({
      ...record,
      quality: applyDecay(record.quality, state.season),
    }));
    skipped.push({
      surface: key,
      before: qualityBefore,
      after: meanQuality(workingState({ ...state, surfaceDefaults }, holes), key),
    });
  }

  if (state.weather === WEATHER_HEAVY_RAIN) {
    holes = mapHoleSurfaces(holes, 'bunkers', (record) => ({
      ...record,
      quality: clampQuality(record.quality - HEAVY_RAIN_BUNKER_LOSS),
    }));
  }

  moisture = tickMoisture({ ...state, moisture, holes, surfaceDefaults });
  holes = writeMoistureToHoles(holes, moisture, moistureReadDay);
  const extraDecay = droughtDecay(moisture);
  for (const [surface, amount] of Object.entries(extraDecay)) {
    holes = mapHoleSurfaces(holes, surface, (record) => ({
      ...record,
      quality: clampQuality(record.quality - amount),
    }));
    const skip = skipped.find((item) => item.surface === surface);
    if (skip) skip.after = meanQuality(workingState({ ...state, surfaceDefaults }, holes), surface);
  }

  for (const key of PATTERNED_SURFACES) {
    holes = mapHoleSurfaces(holes, key, (record, hole) => {
      const settings = surfaceSettings(workingState({ ...state, surfaceDefaults }, holes), hole.id, key);
      let next = record;
      if (!wearIncremented.has(key) && !settings.autoRotate) {
        next = {
          ...next,
          patternWear: Math.max(PATTERN_WEAR_DEFAULT, (next.patternWear ?? 0) - PATTERN_WEAR_DECAY),
        };
      }
      if ((next.patternWear ?? 0) > PATTERN_WEAR_THRESHOLD) {
        next = { ...next, quality: clampQuality(next.quality - PATTERN_WEAR_DAMAGE) };
      }
      return next;
    });
  }

  for (const key of HOC_SURFACES) {
    if (hocStressApplies({ ...state, surfaceDefaults, moisture }, key, isBelowBand(moisture, key))) {
      holes = mapHoleSurfaces(holes, key, (record) => ({
        ...record,
        quality: clampQuality(record.quality - HOC_STRESS_DAMAGE),
      }));
    }
  }

  const diseaseTick = resolveDisease({ ...state, disease, sprayedUntil, moisture, holes, surfaceDefaults });
  disease = diseaseTick.disease;
  for (const item of diseaseTick.ongoing) {
    holes = mapHoleSurfaces(holes, item.surface, (record) => ({
      ...record,
      quality: clampQuality(record.quality - item.drop),
      diseasePressure: disease[item.surface]?.pressure ?? record.diseasePressure,
    }));
  }
  for (const item of diseaseTick.outbreaks) {
    holes = mapHoleSurfaces(holes, item.surface, (record) => ({
      ...record,
      quality: clampQuality(record.quality - item.drop),
      diseasePressure: disease[item.surface]?.pressure ?? record.diseasePressure,
    }));
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
  const complaint = applyEarlyStartComplaints({ ...state, maintenanceBudget, workers, holes, surfaceDefaults });
  maintenanceBudget = complaint.state.maintenanceBudget;

  const daysSinceWorked = tickDaysSinceWorked(state.daysSinceWorked, worked);
  let gmStanding = state.gmStanding ?? 0;
  if (meetingDue(state.day) && !planned.some((item) => item.taskId === 'gmMeeting')) {
    gmStanding = clampStanding(gmStanding - GM_MEETING_SKIP_STANDING);
  }

  let mailed = {
    ...complaint.state,
    workers,
    holes,
    surfaceDefaults,
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
    holes,
    surfaceDefaults,
    moisture,
    moistureReadDay,
    pond: irrigation.pond,
    lastMainsCost: irrigation.mainsCost,
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
        condition: courseCondition({ holes, surfaceDefaults }),
        maintenanceSpent:
          wageBill(state.workers) + irrigation.mainsCost + materialsSpent + (complaint.fine ?? 0),
      },
    ),
  };
  next = tickMarket(next);
  next = tickEvents(next);
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
    next = { ...next, usedListings: rollUsedListings(next, rng) };
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
    after: cloneHoles(holes),
    conditionBefore,
    conditionAfter: courseCondition({ holes, surfaceDefaults }),
  };

  return { state: next, summary };
}
