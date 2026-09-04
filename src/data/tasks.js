import {
  CHECK_MOISTURE_LABEL,
  FERTILISER_BRAND,
  FERTILISER_MATERIALS_COST,
  POND_RESCUE_COST,
  POND_RESCUE_LABEL,
  POND_RESCUE_TASK,
  ROLL_GREENS_LABEL,
  ROLL_GREENS_TASK,
  SPRAY_MATERIALS_COST,
  SURFACE_KEYS,
  TASK_MINUTES,
  TOURNAMENT_PREP_DOUBLE_CUT_BONUS,
  TOURNAMENT_PREP_EDGE_BONUS,
  TOURNAMENT_PREP_ROLL_BONUS,
} from './constants.js';

export const SURFACE_LABELS = {
  greens: 'Greens',
  tees: 'Tees',
  fairways: 'Fairways',
  rough: 'Rough',
  bunkers: 'Bunkers',
};

export const TASKS = [
  { id: 'cutGreens', surface: 'greens', name: 'Cut greens', mowing: true },
  { id: ROLL_GREENS_TASK, surface: 'greens', name: ROLL_GREENS_LABEL, mowing: false, appliesQuality: true },
  { id: 'changeCups', surface: 'greens', name: 'Change cups', mowing: false, appliesQuality: true },
  { id: 'cutTees', surface: 'tees', name: 'Cut', mowing: true },
  { id: 'cutFairways', surface: 'fairways', name: 'Cut', mowing: true },
  { id: 'cutRough', surface: 'rough', name: 'Cut', mowing: true },
  { id: 'rakeBunkers', surface: 'bunkers', name: 'Rake', mowing: false, appliesQuality: true },
  { id: 'clearDebris', surface: null, name: 'Clear debris', mowing: false },
  { id: 'handWater', surface: 'greens', name: 'Hand water', mowing: false },
  { id: 'checkMoistureGreens', surface: 'greens', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck' },
  { id: 'checkMoistureTees', surface: 'tees', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck' },
  { id: 'checkMoistureFairways', surface: 'fairways', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck' },
  { id: 'sprayGreens', surface: 'greens', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'sprayTees', surface: 'tees', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'sprayFairways', surface: 'fairways', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'fertiliseGreens', surface: 'greens', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: 'fertiliseTees', surface: 'tees', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: 'fertiliseFairways', surface: 'fairways', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: POND_RESCUE_TASK, surface: null, name: POND_RESCUE_LABEL, mowing: false, kind: 'pondRescue', materialsCost: POND_RESCUE_COST },
  { id: 'gmMeeting', surface: null, name: 'GM meeting', mowing: false, kind: 'meeting' },
  { id: 'doubleCutGreens', surface: 'greens', name: 'Double-cut greens', mowing: true, kind: 'prep', prepBonus: TOURNAMENT_PREP_DOUBLE_CUT_BONUS },
  { id: 'extraRoll', surface: 'greens', name: 'Extra roll', mowing: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_ROLL_BONUS },
  { id: 'edgeBunkers', surface: 'bunkers', name: 'Bunker edging', mowing: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_EDGE_BONUS },
  { id: 'pickBalls', surface: null, name: 'Pick range balls', mowing: false, kind: 'range' },
];

export function getTask(taskId) {
  return TASKS.find((task) => task.id === taskId);
}

export function taskUsesMachine(task) {
  return Boolean(task?.mowing || task?.id === ROLL_GREENS_TASK);
}

export function tasksForSurface(surface) {
  return TASKS.filter((task) => task.surface === surface);
}

export function taskAppliesQuality(task) {
  return Boolean(task?.mowing || task?.appliesQuality);
}

export { SURFACE_KEYS, TASK_MINUTES };
