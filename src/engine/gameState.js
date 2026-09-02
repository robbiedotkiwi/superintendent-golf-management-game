import { getTask, taskDuration } from '../data/tasks.js';
import { calendarFromDay } from './calendar.js';
import { pickWeather } from './weather.js';
import { createRng } from './rng.js';
import { resolveDay } from './simulation.js';
import {
  DAY_LENGTH_MINUTES,
  HOLE_COUNT,
  MOWING_WEATHER,
  PLAYER_ID,
  PLAYER_MORALE,
  PLAYER_NAME,
  PLAYER_QUALITY_SKILL,
  PLAYER_SPEED_SKILL,
  PLAYER_WAGE,
  STARTING_CASH,
  STARTING_DAY,
  STARTING_DAYS_WORKED_RUNNING,
  STARTING_MINUTES_USED,
  STARTING_QUALITY_BUNKERS,
  STARTING_QUALITY_FAIRWAYS,
  STARTING_QUALITY_GREENS,
  STARTING_QUALITY_ROUGH,
  STARTING_QUALITY_TEES,
  STARTING_RNG_SEED,
  STARTING_WEATHER,
  TASK_MINUTES,
  WEATHER_STORM,
  WEATHER_WEIGHTS,
} from '../data/constants.js';

export function createInitialState() {
  const calendar = calendarFromDay(STARTING_DAY);
  const rng = createRng(STARTING_RNG_SEED);
  const forecast = pickWeather(WEATHER_WEIGHTS[calendar.season], rng);
  return {
    day: STARTING_DAY,
    season: calendar.season,
    year: calendar.year,
    cash: STARTING_CASH,
    holes: HOLE_COUNT,
    weather: STARTING_WEATHER,
    forecast,
    rngSeed: rng.seed,
    workers: [
      {
        id: PLAYER_ID,
        name: PLAYER_NAME,
        speedSkill: PLAYER_SPEED_SKILL,
        qualitySkill: PLAYER_QUALITY_SKILL,
        morale: PLAYER_MORALE,
        wage: PLAYER_WAGE,
        sprayCertified: false,
        isMechanic: false,
        isVolunteer: false,
        allowedSurfaces: 'all',
        availableFromDay: STARTING_DAY,
        minutesToday: DAY_LENGTH_MINUTES,
        minutesUsed: STARTING_MINUTES_USED,
        daysWorkedRunning: STARTING_DAYS_WORKED_RUNNING,
      },
    ],
    surfaces: {
      greens: { quality: STARTING_QUALITY_GREENS },
      tees: { quality: STARTING_QUALITY_TEES },
      fairways: { quality: STARTING_QUALITY_FAIRWAYS },
      rough: { quality: STARTING_QUALITY_ROUGH },
      bunkers: { quality: STARTING_QUALITY_BUNKERS },
    },
    plannedTasks: [],
    log: [],
  };
}

export const initialState = createInitialState();

export function workerMinutesRemaining(worker) {
  return worker.minutesToday - worker.minutesUsed;
}

export function combinedMinutesRemaining(state) {
  return state.workers.reduce((total, worker) => total + workerMinutesRemaining(worker), 0);
}

export function combinedMinutesCapacity(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesToday, 0);
}

export function combinedMinutesUsed(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesUsed, 0);
}

function assignPlayer(state) {
  return state.workers.find((worker) => worker.id === PLAYER_ID) ?? state.workers[0];
}

export function canPlanTask(state, taskId, level) {
  const task = getTask(taskId);
  if (!task) return { ok: false, reason: 'Unknown job.' };

  if (task.id === 'clearDebris' && state.weather !== WEATHER_STORM) {
    return { ok: false, reason: 'No debris to clear.' };
  }

  const debrisPlanned = state.plannedTasks.some((planned) => planned.taskId === 'clearDebris');
  if (state.weather === WEATHER_STORM && task.id !== 'clearDebris' && !debrisPlanned) {
    return { ok: false, reason: `Clear debris first (${TASK_MINUTES.clearDebris} min).` };
  }

  if (state.plannedTasks.some((planned) => planned.taskId === taskId)) {
    return { ok: false, reason: 'Already planned. Take it off the list first.' };
  }

  if (task.mowing && MOWING_WEATHER.includes(state.weather)) {
    return { ok: false, reason: 'Mowing is off today.' };
  }

  const minutes = taskDuration(taskId, level);
  const remaining = combinedMinutesRemaining(state);
  if (minutes > remaining) {
    return { ok: false, reason: `Needs ${minutes} min, only ${remaining} left.` };
  }
  return { ok: true, minutes };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'LOAD_GAME':
      return action.state;
    case 'PLAN_TASK': {
      const task = getTask(action.taskId);
      const check = canPlanTask(state, action.taskId, action.level);
      if (!task || !check.ok) return state;
      const worker = assignPlayer(state);
      return {
        ...state,
        plannedTasks: [
          ...state.plannedTasks,
          {
            taskId: action.taskId,
            surface: task.surface,
            level: action.level,
            workerId: worker.id,
            minutes: check.minutes,
          },
        ],
        workers: state.workers.map((item) =>
          item.id === worker.id ? { ...item, minutesUsed: item.minutesUsed + check.minutes } : item,
        ),
      };
    }
    case 'REMOVE_TASK': {
      const planned = state.plannedTasks.find((item) => item.taskId === action.taskId);
      if (!planned) return state;
      return {
        ...state,
        plannedTasks: state.plannedTasks.filter((item) => item.taskId !== action.taskId),
        workers: state.workers.map((item) =>
          item.id === planned.workerId
            ? { ...item, minutesUsed: item.minutesUsed - planned.minutes }
            : item,
        ),
      };
    }
    case 'END_DAY': {
      const { state: next, summary } = resolveDay(state);
      return { ...next, log: [...next.log, summary] };
    }
    default:
      return state;
  }
}
