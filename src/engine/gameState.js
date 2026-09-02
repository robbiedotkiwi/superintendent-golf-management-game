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

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'LOAD_GAME':
      return action.state;
    default:
      return state;
  }
}
