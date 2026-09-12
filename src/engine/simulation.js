import {
  DAY_LENGTH_MINUTES,
  CUT_TASK_BY_SURFACE,
  CONDITION_WEIGHTS,
  DECAY_ACCELERATION,
  DECAY_ACCELERATION_BELOW,
  DECAY_BASE,
  GAIN_DIMINISH,
  GAIN_DIMINISH_ABOVE,
  STORM_BUNKER_LOSS,
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
  POND_HEALTH_MAX,
  POND_RESCUE_HEALTH,
  POND_RESCUE_TASK,
  POND_DOSE_TASK,
  QUALITY_MAX,
  QUALITY_MIN,
  ROLLER_GAIN_BONUS,
  SUITABILITY_DAMAGING,
  SUITABILITY_DAMAGING_QUALITY_HIT,
  SEASON_GROWTH,
  SURFACE_KEYS,
  SATISFACTION_MAX,
  SATISFACTION_MIN,
  GRANT_FORECAST_LEAD_DAYS,
  OWN_MOWER_CEILING,
  OWN_MOWER_QUALITY_MULT,
  WET_GAIN_MULT,
  WEATHER_STORM,
} from '../data/constants.js';
import { PASS_AREAS, AUTONOMOUS_AREAS, AUTONOMOUS_NIGHT_MINUTES, AUTONOMOUS_UNSTICK_CHANCE, AUTONOMOUS_UNSTICK_MINUTES, MINUTES_PER_HOUR } from '../data/config.js';
import { applyAreaQualityToHoles, applyWeekPasses, emptyAreaQuality, machineAllowsArea, passHoursFor, resolveDayPasses } from './passes.js';
import { migrateWorkerTier } from './staffTiers.js';
import { generateCandidates, generateCasuals } from '../data/staff.js';
import { getTask, taskAppliesQuality } from '../data/tasks.js';
import { workerById, workerQualityMultiplier, qualityRandomFactor } from './assignment.js';
import { workerBringsOwnMower } from './skills.js';
import { tickGm } from './gm.js';
import { consumeJobFuel, jobBurnsFuel, replaceBurnSpend } from './fuel.js';
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
import { calendarFromDay, daysUntilSeasonEnd } from './calendar.js';
import {
  applyWear,
  applyMachineHours,
  applyConditionLoss,
  autonomousReady,
  autonomousSurfacesOf,
  ensureAutoWeek,
  interruptionMinutesForDay,
  isMachineAvailable,
  getMachine,
  jobCeiling,
  machineSuitability,
  ownedAutonomousMowers,
  ownedMachineList,
  pickMachineForTask,
  rollBreakdowns,
  surfaceCeiling,
  upgradeModifiers,
  wearMultiplier,
} from './equipment.js';
import { applyEarlyStartComplaints, applyMorale, prepareMorningWorkers, wageBill } from './staff.js';
import { activateDayPlan, casualsBookedOn, getDayTasks, lockWeek, rollNewWeek, setDayTasks, weekStartDay } from './week.js';
import { createRng } from './rng.js';
import { applyFertiliser, applySpray, emptyDisease, resolveDisease, syncHoleDisease } from './disease.js';
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
import { closeSeason, seasonGrant } from './budget.js';
import { golferMail, gmMissedTournamentMail, gmSeasonMail, gmTournamentRequestMail, grantForecastMail, meetingDue, pushMail, tickDaysSinceWorked } from './mail.js';
import { neglectMail, neglectSatisfactionDrain } from './neglect.js';
import {
  applyScheduledTournament,
  comingSeason,
  comingSeasonStartDay,
  isTournamentPromptDay,
  seasonEndDay,
  seasonStartDay,
  seasonTournament,
} from './tournament.js';
import { tickProjects } from './projects.js';
import { buildYearReview, emptyYearRecord, hiredIds, recordYearDay } from './history.js';
import { clampRange, clampStanding, tickSatisfaction } from './satisfaction.js';
import { GM_MEETING_SKIP_STANDING } from '../data/constants.js';
import { tickMarket, rollUsedListings } from './market.js';
import { tickEvents } from './events.js';
import { jobHolesFor, snapshotDayJobs } from './jobs.js';
import { buildWeekReview, snapshotWeekStart, weekSummariesOf } from './weekReview.js';

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

function ownedRoller(state) {
  return ownedMachineList(state).find((machine) => machine.rollOnly && isMachineAvailable(state, machine.id));
}

export function resolveDay(state) {
  const plannedJobs = getDayTasks(state, state.day).map((item) => ({ ...item }));
  const casualWages = casualsBookedOn(state, state.day).reduce((sum, casual) => sum + (casual.wage ?? 0), 0);
  const satisfactionBefore = state.satisfaction ?? 0;
  const gmStandingBefore = state.gmStanding ?? 0;
  state = activateDayPlan(setDayTasks(state, state.day, state.plannedTasks ?? getDayTasks(state, state.day)));
  const rng = createRng(state.rngSeed);
  const dosePlanned = (state.plannedTasks ?? []).some((item) => item.taskId === POND_DOSE_TASK);
  const irrigation = resolveIrrigation({
    ...state,
    lastPondDoseDay: dosePlanned ? state.day : state.lastPondDoseDay,
  });
  let pond = { ...irrigation.pond };
  let cash = state.cash ?? 0;
  let lastPondDoseDay = state.lastPondDoseDay;
  let holes = cloneHoles(state.holes);
  const before = cloneHoles(state.holes);
  const conditionBefore = courseCondition(state);
  let surfaceDefaults = { ...state.surfaceDefaults };
  const worked = new Set();
  const workedHolesByType = Object.fromEntries(SURFACE_KEYS.map((key) => [key, new Set()]));
  const lastDayJobs = snapshotDayJobs(state.plannedTasks);
  const done = [];
  const usedMachineIds = [];
  const usedMinutesByMachine = {};
  const dropped = [...(state.morningDrops ?? [])];

  let disease = emptyDisease();
  for (const surface of Object.keys(disease)) {
    if (state.disease?.[surface]) disease[surface] = { ...state.disease[surface] };
  }
  let sprayedUntil = { ...(state.sprayedUntil ?? {}) };
  let fertiliserUntil = { ...(state.fertiliserUntil ?? {}) };
  let materialsSpent = 0;
  let tournamentPrepScore = state.tournamentPrepScore ?? 0;

  let planned = [...state.plannedTasks];
  const extra = interruptionMinutesForDay(state);
  let plannedMinutes = planned.reduce((sum, item) => sum + item.minutes, 0);
  let fuelBurned = 0;
  while (extra > 0 && plannedMinutes + extra > capacityOf(state) && planned.length) {
    const item = planned.pop();
    plannedMinutes -= item.minutes;
    dropped.push(item);
  }

  function markUsed(id, minutes = 0) {
    if (!id) return;
    if (!usedMachineIds.includes(id)) usedMachineIds.push(id);
    const run = Number(minutes) || 0;
    if (run > 0) usedMinutesByMachine[id] = (usedMinutesByMachine[id] ?? 0) + run;
  }

  const wearIncremented = new Set();
  const holeN = holeCount({ holes });
  let moisture = state.moisture ?? emptyMoisture(holeN);
  let moistureReadDay = state.moistureReadDay ?? emptyMoistureReadDay(holeN);

  for (const plannedTask of planned) {
    if (plannedTask.needsReassignment || !workerById(state, plannedTask.workerId)) {
      dropped.push({ ...plannedTask, reason: 'unassigned' });
      continue;
    }
    const task = getTask(plannedTask.taskId);
    const worker = workerById(state, plannedTask.workerId) ?? state.workers[0];
    const ownMower = Boolean(plannedTask.ownMower) || workerBringsOwnMower(worker, task.surface);
    const machine = ownMower
      ? null
      : plannedTask.machineId
        ? getMachine(plannedTask.machineId)
        : pickMachineForTask(state, task, worker, undefined, plannedTask.holes);
    let jobHoles = jobHolesFor(state, task, plannedTask.holes);
    const fuel = consumeJobFuel({
      task,
      machine,
      minutes: plannedTask.minutes,
      holes: jobHoles,
    });
    fuelBurned += fuel.burned;
    const runMinutes = plannedTask.minutes;
    if (task.kind === 'spray' && task.surface) {
      const sprayed = applySpray({ ...state, disease, sprayedUntil, holes }, task.surface, jobHoles);
      disease = sprayed.disease;
      sprayedUntil = sprayed.sprayedUntil;
      holes = sprayed.holes ?? holes;
    }
    if (task.kind === 'fertiliser' && task.surface) {
      const fed = applyFertiliser({ ...state, fertiliserUntil, holes }, task.surface, jobHoles);
      fertiliserUntil = fed.fertiliserUntil;
      holes = fed.holes ?? holes;
    }
    if (task.id === POND_RESCUE_TASK) {
      pond = {
        ...pond,
        health: Math.max(0, Math.min(POND_HEALTH_MAX, pond.health + POND_RESCUE_HEALTH)),
      };
    }
    if (task.id === POND_DOSE_TASK) {
      lastPondDoseDay = state.day;
    }
    if (task.materialsCost) {
      cash -= task.materialsCost;
      materialsSpent += task.materialsCost;
    }
    if (task.surface && (taskAppliesQuality(task) || task.kind === 'prep')) {
      for (const id of jobHoles) workedHolesByType[task.surface].add(id);
      if (jobHoles.length) worked.add(task.surface);
    }
    if (task.kind === 'prep') {
      tournamentPrepScore += task.prepBonus ?? 0;
    }
    if (task.kind === 'moistureCheck' && task.surface) {
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holeN, jobHoles);
    }
    if (task.id === 'handWater') {
      moisture = applyHandWater(moisture, plannedTask.greens ?? state.handWaterTargets, holeN);
    }
    if (task.mowing && state.hasTurfRad && task.surface) {
      moistureReadDay = revealMoisture(moistureReadDay, task.surface, state.day, holeN);
    }

    if (machine && runMinutes > 0 && (task.mowing || task.id === 'rollGreens')) markUsed(machine.id, runMinutes);
    if (task.id === 'rollGreens' && runMinutes > 0) {
      const roller = ownedRoller(state);
      if (roller) markUsed(roller.id, runMinutes);
    }

    if (!taskAppliesQuality(task) || !task.surface) {
      done.push({
        taskId: plannedTask.taskId,
        name: task.name,
        surface: task.surface,
        minutes: runMinutes,
        before: null,
        after: null,
      });
      continue;
    }

    const live = workingState({ ...state, surfaceDefaults }, holes);
    const qualityBefore = meanQuality(live, task.surface);

    holes = mapHoleSurfaces(holes, task.surface, (record, hole) => {
      if (jobHoles.length && !jobHoles.includes(hole.id)) return record;
      let next = record;
      if (task.mowing) {
        next = applyMowingAftermath(
          next,
          task.surface,
          state.day,
          wearIncremented,
          surfaceSettings(live, hole.id, task.surface),
          live,
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
      minutes: runMinutes,
      before: qualityBefore,
      after: qualityAfter,
    });
  }

  if (autonomousReady(state)) {
    for (const autoMachine of ownedAutonomousMowers(state)) {
      if (!isMachineAvailable(state, autoMachine.id)) continue;
      markUsed(autoMachine.id);
      for (const surface of AUTONOMOUS_AREAS) {
        if (!machineAllowsArea(autoMachine, surface)) continue;
        const cutId = CUT_TASK_BY_SURFACE[surface];
        if (!cutId) continue;
        const live = workingState({ ...state, surfaceDefaults }, holes);
        const qualityBefore = meanQuality(live, surface);
        const hours = passHoursFor(state, autoMachine.id, surface, null, { ignoreStaff: true });
        const nightHours = AUTONOMOUS_NIGHT_MINUTES / MINUTES_PER_HOUR;
        const bookedHours = Math.min(hours ?? 0, nightHours);
        if (bookedHours > 0) {
          planned.push({
            taskId: 'autonomousMower',
            surface,
            minutes: bookedHours * MINUTES_PER_HOUR,
            machineId: autoMachine.id,
            ignoreStaff: true,
          });
        }
        holes = mapHoleSurfaces(holes, surface, (record, hole) => {
          return applyMowingAftermath(
            record,
            surface,
            state.day,
            wearIncremented,
            surfaceSettings(live, hole.id, surface),
            live,
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
          minutes: bookedHours * MINUTES_PER_HOUR,
          before: qualityBefore,
          after: meanQuality(workingState({ ...state, surfaceDefaults }, holes), surface),
        });
      }
    }
  }

  const dayPasses = resolveDayPasses(state, planned, state.workers);
  const weekPassState = applyWeekPasses(state, dayPasses, state.day);
  let unstickMinutes = 0;
  if (
    ownedAutonomousMowers(state).some((machine) => isMachineAvailable(state, machine.id)) &&
    rng.next() < AUTONOMOUS_UNSTICK_CHANCE
  ) {
    unstickMinutes = AUTONOMOUS_UNSTICK_MINUTES;
  }

  const skipped = [];
  for (const key of SURFACE_KEYS) {
    const live = workingState({ ...state, surfaceDefaults }, holes);
    const qualityBefore = meanQuality(live, key);
    const protectedHoles = workedHolesByType[key];
    let decayed = false;
    if (!PASS_AREAS.includes(key)) {
      holes = mapHoleSurfaces(holes, key, (record, hole) => {
        if (protectedHoles.has(hole.id)) return record;
        decayed = true;
        return { ...record, quality: applyDecay(record.quality, state.season) };
      });
    } else if (![...protectedHoles].length) {
      skipped.push({
        surface: key,
        before: qualityBefore,
        after: qualityBefore,
      });
      continue;
    }
    if (decayed) {
      skipped.push({
        surface: key,
        before: qualityBefore,
        after: meanQuality(workingState({ ...state, surfaceDefaults }, holes), key),
      });
    }
  }

  if (state.weather === WEATHER_STORM) {
    holes = mapHoleSurfaces(holes, 'bunkers', (record) => ({
      ...record,
      quality: clampQuality(record.quality - STORM_BUNKER_LOSS),
    }));
  }

  moisture = tickMoisture({ ...state, moisture, holes, surfaceDefaults });
  holes = writeMoistureToHoles(holes, moisture, moistureReadDay);
  const extraDecay = droughtDecay(moisture, { ...state, moisture, holes, surfaceDefaults });
  for (const [surface, amount] of Object.entries(extraDecay)) {
    if (PASS_AREAS.includes(surface)) continue;
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
      if ((next.patternWear ?? 0) > PATTERN_WEAR_THRESHOLD && !PASS_AREAS.includes(key)) {
        next = { ...next, quality: clampQuality(next.quality - PATTERN_WEAR_DAMAGE) };
      }
      return next;
    });
  }

  for (const key of HOC_SURFACES) {
    if (PASS_AREAS.includes(key)) continue;
    if (hocStressApplies({ ...state, surfaceDefaults, moisture }, key, isBelowBand(moisture, key))) {
      holes = mapHoleSurfaces(holes, key, (record) => ({
        ...record,
        quality: clampQuality(record.quality - HOC_STRESS_DAMAGE),
      }));
    }
  }

  const diseaseTick = resolveDisease({ ...state, disease, sprayedUntil, moisture, holes, surfaceDefaults });
  disease = diseaseTick.disease;
  holes = syncHoleDisease(holes, { ...state, sprayedUntil, disease }, disease);
  for (const item of diseaseTick.ongoing) {
    if (PASS_AREAS.includes(item.surface)) continue;
    holes = mapHoleSurfaces(holes, item.surface, (record) => ({
      ...record,
      quality: clampQuality(record.quality - item.drop),
      diseasePressure: disease[item.surface]?.pressure ?? record.diseasePressure,
    }));
  }
  for (const item of diseaseTick.outbreaks) {
    if (PASS_AREAS.includes(item.surface)) continue;
    holes = mapHoleSurfaces(holes, item.surface, (record) => ({
      ...record,
      quality: clampQuality(record.quality - item.drop),
      diseasePressure: disease[item.surface]?.pressure ?? record.diseasePressure,
    }));
  }

  const wearMinutes = { ...usedMinutesByMachine };
  for (const id of usedMachineIds) {
    if (wearMinutes[id] == null) wearMinutes[id] = DAY_LENGTH_MINUTES;
  }
  const machineWear = applyWear(state, wearMinutes);
  const machineHours = applyMachineHours(state, usedMinutesByMachine);
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
  const fuelSpend = replaceBurnSpend(fuelBurned);
  cash = cash - wageBill(state.workers) - irrigation.mainsCost - fuelSpend;
  const complaint = applyEarlyStartComplaints({ ...state, cash, workers, holes, surfaceDefaults });
  cash = complaint.state.cash;

  const daysSinceWorked = tickDaysSinceWorked(state.daysSinceWorked, worked);
  let gmStanding = state.gmStanding ?? 0;
  if (meetingDue(state.day) && !planned.some((item) => item.taskId === 'gmMeeting')) {
    gmStanding = clampStanding(gmStanding - GM_MEETING_SKIP_STANDING);
  }

  let mailed = {
    ...complaint.state,
    cash,
    holes,
    surfaceDefaults,
    daysSinceWorked,
    gmStanding,
    inbox: state.inbox ?? [],
    nextMailId: state.nextMailId ?? 1,
    pond,
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
      cash,
      satisfaction,
      tournamentPrepScore,
      tournaments: state.tournaments ?? [],
      weather: state.weather,
    },
  );

  const areaQuality = emptyAreaQuality(state.areaQuality);
  holes = applyAreaQualityToHoles(holes, areaQuality);

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
    areaQuality,
    ...weekPassState,
    surfaceDefaults,
    moisture,
    moistureReadDay,
    pond,
    lastPondDoseDay,
    lastMainsCost: irrigation.mainsCost,
    disease,
    sprayedUntil,
    fertiliserUntil,
    machineWear,
    machineHours,
    machineCondition,
    machineBroken,
    plannedTasks: [],
    lastDayJobs,
    lastRepeatDropped: [],
    fuelSpendLog: [...(state.fuelSpendLog ?? []), { day: state.day, spend: fuelSpend }].slice(-30),
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
          wageBill(state.workers) + irrigation.mainsCost + materialsSpent + fuelSpend + (complaint.fine ?? 0),
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
      candidates: generateCandidates(rng).map(migrateWorkerTier),
      candidatesSeason: calendar.season,
      volunteerDayChangedThisSeason: false,
      neighbourComplaintsThisSeason: 0,
      pendingTournamentSetup: false,
      gmTournamentRequestPending: false,
      tournamentSetupSeason: null,
      tournamentSetupDeadline: null,
      tournamentSetupStartDay: null,
      tournamentPrepScore: 0,
      tournaments: (() => {
        const kept = ignored
          ? []
          : (next.tournaments ?? []).filter((item) => item.season === calendar.season || item.day >= next.day);
        if (kept.some((item) => item.season === calendar.season)) return kept;
        return [...kept, ...seasonTournament(seasonStartDay(next.day), calendar.season)];
      })(),
    };
    seasonClose = closeSeason(next);
    next = seasonClose.state;
    for (const mail of seasonClose.mail.concat(
      gmSeasonMail({
        grant: seasonClose.grant,
        adjustment: seasonClose.adjustment,
        insolvent: seasonClose.insolvent,
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
  const predicted = next.forecastStrip?.[0];
  const morning = rollMorningWithRng(next, calendar.season, rng);
  next = {
    ...next,
    weather: morning.weather,
    tempMin: morning.tempMin,
    tempMax: morning.tempMax,
    forecast: morning.forecast,
    forecastCall: predicted
      ? { type: predicted.type, tempMin: predicted.tempMin ?? null, tempMax: predicted.tempMax ?? null }
      : null,
    weatherQueue: morning.weatherQueue,
    forecastStrip: morning.forecastStrip,
    windSpeed: morning.windSpeed,
    windDir: morning.windDir,
    rngSeed: rng.seed,
    workers: prepareMorningWorkers(
      { ...next, weather: morning.weather, workers: (next.workers ?? []).filter((worker) => !worker.isCasual) },
      morning.weather,
      rng,
    ),
  };

  if (weekStartDay(next.day) !== weekStartDay(state.day)) {
    const dayJobs = {
      day: state.day,
      planned: plannedJobs,
      done,
      skipped,
      dropped,
      wages: wageBill(state.workers),
      casualWages,
      fuelSpend,
      mainsCost: irrigation.mainsCost,
      materialsSpent,
      neighbourFine: complaint.fine ?? 0,
    };
    const review = buildWeekReview({
      start: state.weekStartSnapshot ?? snapshotWeekStart(state),
      end: next,
      summaries: weekSummariesOf(state.log, state.day, dayJobs),
    });
    next = {
      ...next,
      pendingWeekReview: true,
      lastWeekReview: review,
    };
    next = rollNewWeek(next, next.day, generateCasuals(rng).map(migrateWorkerTier));
    next = { ...next, weekStartSnapshot: snapshotWeekStart(next) };
  } else {
    next = lockWeek(next);
  }
  next = activateDayPlan(next);

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

  if (
    daysUntilSeasonEnd(next.day) === GRANT_FORECAST_LEAD_DAYS &&
    !(next.grantForecast?.season === next.season && next.grantForecast?.year === next.year)
  ) {
    const projected = seasonGrant(next.satisfaction, next.gmStanding);
    next = {
      ...next,
      grantForecast: {
        season: next.season,
        year: next.year,
        satisfaction: next.satisfaction,
        grant: projected,
      },
    };
    next = pushMail(next, grantForecastMail({ satisfaction: next.satisfaction, grant: projected }));
  }

  next = tickGm(next, { breakdowns });

  const summary = {
    day: state.day,
    weather: state.weather,
    tempMin: state.tempMin,
    tempMax: state.tempMax,
    planned: plannedJobs,
    done,
    skipped,
    dropped,
    fuelStop: null,
    fuelSpend,
    interruptions: extra,
    breakdowns,
    wages: wageBill(state.workers),
    casualWages,
    gmWarning: complaint.warning,
    neighbourFine: complaint.fine,
    mainsCost: irrigation.mainsCost,
    mainsM3: irrigation.shortfall,
    pond,
    materialsSpent,
    outbreaks: diseaseTick.outbreaks,
    diseaseOngoing: diseaseTick.ongoing,
    disease,
    tournament: tournament.result,
    projectsCompleted: built.completed,
    seasonClose: seasonClose
      ? { grant: seasonClose.grant, adjustment: seasonClose.adjustment, insolvent: seasonClose.insolvent, dismissed: next.dismissed }
      : null,
    before,
    after: cloneHoles(holes),
    conditionBefore,
    conditionAfter: courseCondition({ holes, surfaceDefaults }),
    satisfactionBefore,
    satisfactionAfter: next.satisfaction,
    gmStandingBefore,
    gmStandingAfter: next.gmStanding,
    dayPasses,
    unstickMinutes,
  };

  return { state: next, summary };
}

