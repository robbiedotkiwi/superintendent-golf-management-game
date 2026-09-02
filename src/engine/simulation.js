import {
  CONDITION_WEIGHTS,
  DECAY_ACCELERATION,
  DECAY_ACCELERATION_BELOW,
  DECAY_BASE,
  GAIN_DIMINISH,
  GAIN_DIMINISH_ABOVE,
  HEAVY_RAIN_BUNKER_LOSS,
  LEVEL_STANDARD_GAIN,
  MOWING_WEATHER,
  QUALITY_MAX,
  QUALITY_MIN,
  ROLLER_GAIN_BONUS,
  SEASON_GROWTH,
  SURFACE_KEYS,
  WEATHER_HEAVY_RAIN,
} from '../data/constants.js';
import { PLAYER_ID } from '../data/constants.js';
import { generateCandidates } from '../data/staff.js';
import { getTask, taskGain } from '../data/tasks.js';
import { workerById } from './assignment.js';
import { calendarFromDay } from './calendar.js';
import {
  applyWear,
  autonomousReady,
  ensureAutoWeek,
  interruptionMinutesForDay,
  isMachineAvailable,
  pickMachine,
  rollBreakdowns,
  surfaceCeiling,
  wearMultiplier,
} from './equipment.js';
import { qualityRandomFactor, workerQualityMultiplier } from './skills.js';
import { applyEarlyStartComplaints, applyMorale, prepareMorningWorkers, wageBill } from './staff.js';
import { createRng } from './rng.js';
import { rollMorningWithRng } from './weather.js';

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
  const surfaces = cloneSurfaces(state.surfaces);
  const before = cloneSurfaces(state.surfaces);
  const conditionBefore = courseCondition(state.surfaces);
  const worked = new Set();
  const done = [];
  const usedMachineIds = [];
  const dropped = [];

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

  for (const plannedTask of planned) {
    const task = getTask(plannedTask.taskId);
    if (!task.surface) {
      done.push({
        taskId: plannedTask.taskId,
        name: task.name,
        surface: null,
        level: plannedTask.level,
        minutes: plannedTask.minutes,
        before: null,
        after: null,
      });
      continue;
    }

    const machine = pickMachine(state, task);
    if (machine) markUsed(machine.id);
    if (task.id === 'rollGreens' && isMachineAvailable(state, 'greensRoller')) {
      markUsed('greensRoller');
    }

    let gain = plannedTask.level ? taskGain(plannedTask.level) : LEVEL_STANDARD_GAIN;
    if (task.id === 'rollGreens' && isMachineAvailable(state, 'greensRoller')) {
      gain += ROLLER_GAIN_BONUS;
    }
    if (machine) {
      gain *= wearMultiplier(state, machine.id);
    }
    const worker = workerById(state, plannedTask.workerId) ?? state.workers[0];
    gain *= workerQualityMultiplier(worker);
    gain *= qualityRandomFactor(worker, rng);

    const qualityBefore = surfaces[task.surface].quality;
    const qualityAfter = applyGain(qualityBefore, gain, surfaceCeiling(state, task.surface));
    surfaces[task.surface].quality = qualityAfter;
    worked.add(task.surface);
    done.push({
      taskId: plannedTask.taskId,
      name: task.name,
      surface: task.surface,
      level: plannedTask.level,
      minutes: plannedTask.minutes,
      before: qualityBefore,
      after: qualityAfter,
    });
  }

  if (autonomousReady(state) && !MOWING_WEATHER.includes(state.weather)) {
    markUsed('autonomousMower');
    for (const surface of ['fairways', 'rough']) {
      if (worked.has(surface)) continue;
      const qualityBefore = surfaces[surface].quality;
      const qualityAfter = applyGain(qualityBefore, LEVEL_STANDARD_GAIN, surfaceCeiling(state, surface));
      surfaces[surface].quality = qualityAfter;
      worked.add(surface);
      done.push({
        taskId: 'autonomousMower',
        name: 'Autonomous cut',
        surface,
        level: 'standard',
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

  const machineWear = applyWear(state, usedMachineIds);
  const wornState = { ...state, machineWear };
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
  let cash = state.cash - wageBill(state.workers);
  const complaint = applyEarlyStartComplaints({ ...state, cash, workers });
  cash = complaint.state.cash;

  const day = state.day + 1;
  const calendar = calendarFromDay(day);
  const seasonChanged = calendar.season !== state.season;
  let next = {
    ...complaint.state,
    day,
    season: calendar.season,
    year: calendar.year,
    cash,
    surfaces,
    machineWear,
    machineBroken,
    plannedTasks: [],
    workers,
  };
  if (seasonChanged) {
    next = {
      ...next,
      candidates: generateCandidates(rng),
      candidatesSeason: calendar.season,
      volunteerDayChangedThisSeason: false,
      neighbourComplaintsThisSeason: 0,
    };
  }
  const scheduled = ensureAutoWeek(next, rng);
  next = scheduled.state;
  const morning = rollMorningWithRng(next, calendar.season, rng);
  next = {
    ...next,
    weather: morning.weather,
    forecast: morning.forecast,
    rngSeed: rng.seed,
    workers: prepareMorningWorkers({ ...next, weather: morning.weather }, morning.weather, rng),
  };

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
    before,
    after: cloneSurfaces(surfaces),
    conditionBefore,
    conditionAfter: courseCondition(surfaces),
  };

  return { state: next, summary };
}
