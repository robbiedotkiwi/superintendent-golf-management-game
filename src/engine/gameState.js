import { getTask, taskDuration } from '../data/tasks.js';
import { resolveDay } from './simulation.js';
import {
  DAY_LENGTH_MINUTES,
  HOLE_COUNT,
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
  STARTING_SEASON,
  STARTING_YEAR,
} from '../data/constants.js';

export function createInitialState() {
  return {
    day: STARTING_DAY,
    season: STARTING_SEASON,
    year: STARTING_YEAR,
    cash: STARTING_CASH,
    holes: HOLE_COUNT,
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
  if (state.plannedTasks.some((planned) => planned.taskId === taskId)) {
    return { ok: false, reason: 'Already planned. Take it off the list first.' };
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
