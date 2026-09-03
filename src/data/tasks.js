import { FERTILISER_BRAND, FERTILISER_MATERIALS_COST, QUALITY_LEVELS, SPRAY_MATERIALS_COST, SURFACE_KEYS, TASK_MINUTES, TOURNAMENT_PREP_DOUBLE_CUT_BONUS, TOURNAMENT_PREP_EDGE_BONUS, TOURNAMENT_PREP_ROLL_BONUS } from './constants.js';

export const SURFACE_LABELS = {
  greens: 'Greens',
  tees: 'Tees',
  fairways: 'Fairways',
  rough: 'Rough',
  bunkers: 'Bunkers',
};

export const TASKS = [
  { id: 'cutGreens', surface: 'greens', name: 'Cut greens', mowing: true, usesQualityLevel: true },
  { id: 'rollGreens', surface: 'greens', name: 'Roll', mowing: false, usesQualityLevel: true },
  { id: 'changeCups', surface: 'greens', name: 'Change cups', mowing: false, usesQualityLevel: true },
  { id: 'cutTees', surface: 'tees', name: 'Cut', mowing: true, usesQualityLevel: true },
  { id: 'cutFairways', surface: 'fairways', name: 'Cut', mowing: true, usesQualityLevel: true },
  { id: 'cutRough', surface: 'rough', name: 'Cut', mowing: true, usesQualityLevel: true },
  { id: 'rakeBunkers', surface: 'bunkers', name: 'Rake', mowing: false, usesQualityLevel: true },
  { id: 'clearDebris', surface: null, name: 'Clear debris', mowing: false, usesQualityLevel: false },
  { id: 'handWater', surface: 'greens', name: 'Hand water', mowing: false, usesQualityLevel: false },
  { id: 'sprayGreens', surface: 'greens', name: 'Spray fungicide', mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'sprayTees', surface: 'tees', name: 'Spray fungicide', mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'sprayFairways', surface: 'fairways', name: 'Spray fungicide', mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST },
  { id: 'fertiliseGreens', surface: 'greens', name: FERTILISER_BRAND, mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: 'fertiliseTees', surface: 'tees', name: FERTILISER_BRAND, mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: 'fertiliseFairways', surface: 'fairways', name: FERTILISER_BRAND, mowing: false, usesQualityLevel: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST },
  { id: 'gmMeeting', surface: null, name: 'GM meeting', mowing: false, usesQualityLevel: false, kind: 'meeting' },
  { id: 'doubleCutGreens', surface: 'greens', name: 'Double-cut greens', mowing: true, usesQualityLevel: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_DOUBLE_CUT_BONUS },
  { id: 'extraRoll', surface: 'greens', name: 'Extra roll', mowing: false, usesQualityLevel: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_ROLL_BONUS },
  { id: 'edgeBunkers', surface: 'bunkers', name: 'Bunker edging', mowing: false, usesQualityLevel: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_EDGE_BONUS },
  { id: 'pickBalls', surface: null, name: 'Pick range balls', mowing: false, usesQualityLevel: false, kind: 'range' },
];

export const LEVEL_LABELS = {
  quick: 'Quick',
  standard: 'Standard',
  thorough: 'Thorough',
};

export function getTask(taskId) {
  return TASKS.find((task) => task.id === taskId);
}

export function taskUsesMachine(task) {
  return Boolean(task?.mowing || task?.id === 'rollGreens');
}

export function tasksForSurface(surface) {
  return TASKS.filter((task) => task.surface === surface);
}

export function taskDuration(taskId, level, timeMult = 1) {
  const task = getTask(taskId);
  if (!task?.usesQualityLevel) return TASK_MINUTES[taskId];
  return Math.round(TASK_MINUTES[taskId] * QUALITY_LEVELS[level].timeMultiplier * timeMult);
}

export function taskGain(level) {
  return QUALITY_LEVELS[level].qualityGain;
}

export { SURFACE_KEYS };
