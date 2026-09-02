import {
  CONDITION_WEIGHTS,
  DAY_LENGTH_MINUTES,
  DECAY_ACCELERATION,
  DECAY_ACCELERATION_BELOW,
  DECAY_BASE,
  EQUIPMENT_CEILING,
  GAIN_DIMINISH,
  GAIN_DIMINISH_ABOVE,
  HEAVY_RAIN_BUNKER_LOSS,
  QUALITY_MAX,
  QUALITY_MIN,
  SEASON_GROWTH,
  STARTING_MINUTES_USED,
  SURFACE_KEYS,
  WEATHER_HEAVY_RAIN,
} from '../data/constants.js';
import { getTask, taskGain } from '../data/tasks.js';
import { calendarFromDay } from './calendar.js';
import { applyWeatherToWorkers, rollMorning } from './weather.js';

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

export function applyDecay(quality, season) {
  return clampQuality(quality - decayAmount(quality, season));
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
    if (!task.surface) {
      done.push({
        taskId: planned.taskId,
        name: task.name,
        surface: null,
        level: planned.level,
        minutes: planned.minutes,
        before: null,
        after: null,
      });
      continue;
    }
    const qualityBefore = surfaces[task.surface].quality;
    const qualityAfter = applyGain(qualityBefore, taskGain(planned.level));
    surfaces[task.surface].quality = qualityAfter;
    worked.add(task.surface);
    done.push({
      taskId: planned.taskId,
      name: task.name,
      surface: task.surface,
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
    const qualityAfter = applyDecay(qualityBefore, state.season);
    surfaces[key].quality = qualityAfter;
    skipped.push({ surface: key, before: qualityBefore, after: qualityAfter });
  }

  if (state.weather === WEATHER_HEAVY_RAIN) {
    surfaces.bunkers.quality = clampQuality(surfaces.bunkers.quality - HEAVY_RAIN_BUNKER_LOSS);
  }

  const day = state.day + 1;
  const calendar = calendarFromDay(day);
  const morning = rollMorning(state, calendar.season);

  const nextState = {
    ...state,
    day,
    season: calendar.season,
    year: calendar.year,
    surfaces,
    weather: morning.weather,
    forecast: morning.forecast,
    rngSeed: morning.rngSeed,
    workers: applyWeatherToWorkers(state.workers, morning.weather),
    plannedTasks: [],
  };

  const summary = {
    day: state.day,
    weather: state.weather,
    done,
    skipped,
    before,
    after: cloneSurfaces(surfaces),
    conditionBefore,
    conditionAfter: courseCondition(surfaces),
  };

  return { state: nextState, summary };
}
