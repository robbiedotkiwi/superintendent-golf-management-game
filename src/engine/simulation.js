import {
  DAY_LENGTH_MINUTES,
  DECAY_ACCELERATION,
  DECAY_ACCELERATION_BELOW,
  DECAY_BASE,
  EQUIPMENT_CEILING,
  GAIN_DIMINISH,
  GAIN_DIMINISH_ABOVE,
  QUALITY_MAX,
  QUALITY_MIN,
  STARTING_MINUTES_USED,
  SURFACE_KEYS,
  CONDITION_WEIGHTS,
} from '../data/constants.js';
import { getTask, taskGain } from '../data/tasks.js';

export function clampQuality(value) {
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, value));
}

export function courseCondition(surfaces) {
  return SURFACE_KEYS.reduce((total, key) => total + surfaces[key].quality * CONDITION_WEIGHTS[key], 0);
}

export function decayAmount(quality) {
  if (quality < DECAY_ACCELERATION_BELOW) {
    return DECAY_BASE * DECAY_ACCELERATION;
  }
  return DECAY_BASE;
}

export function applyGain(quality, gain, ceiling = EQUIPMENT_CEILING) {
  let adjusted = gain;
  if (quality > GAIN_DIMINISH_ABOVE) {
    adjusted *= GAIN_DIMINISH;
  }
  if (quality >= ceiling) {
    return clampQuality(quality);
  }
  return clampQuality(Math.min(ceiling, quality + adjusted));
}

export function applyDecay(quality) {
  return clampQuality(quality - decayAmount(quality));
}

function cloneSurfaces(surfaces) {
  return SURFACE_KEYS.reduce((next, key) => {
    next[key] = { ...surfaces[key] };
    return next;
  }, {});
}

export function resolveDay(state) {
  const surfaces = cloneSurfaces(state.surfaces);
  const before = cloneSurfaces(state.surfaces);
  const conditionBefore = courseCondition(state.surfaces);
  const worked = new Set();
  const done = [];

  for (const planned of state.plannedTasks) {
    const task = getTask(planned.taskId);
    const surface = task.surface;
    const qualityBefore = surfaces[surface].quality;
    const qualityAfter = applyGain(qualityBefore, taskGain(planned.level));
    surfaces[surface].quality = qualityAfter;
    worked.add(surface);
    done.push({
      taskId: planned.taskId,
      name: task.name,
      surface,
      level: planned.level,
      minutes: planned.minutes,
      before: qualityBefore,
      after: qualityAfter,
    });
  }

  const skipped = [];
  for (const key of SURFACE_KEYS) {
    if (worked.has(key)) continue;
    const qualityBefore = surfaces[key].quality;
    const qualityAfter = applyDecay(qualityBefore);
    surfaces[key].quality = qualityAfter;
    skipped.push({ surface: key, before: qualityBefore, after: qualityAfter });
  }

  const nextWorkers = state.workers.map((worker) => ({
    ...worker,
    minutesUsed: STARTING_MINUTES_USED,
    minutesToday: DAY_LENGTH_MINUTES,
  }));

  const nextState = {
    ...state,
    day: state.day + 1,
    surfaces,
    workers: nextWorkers,
    plannedTasks: [],
  };

  const summary = {
    day: state.day,
    done,
    skipped,
    before,
    after: cloneSurfaces(surfaces),
    conditionBefore,
    conditionAfter: courseCondition(surfaces),
  };

  return { state: nextState, summary };
}
