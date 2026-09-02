import { QUALITY_LEVELS, SURFACE_KEYS, TASK_MINUTES } from './constants.js';

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
];

export const LEVEL_LABELS = {
  quick: 'Quick',
  standard: 'Standard',
  thorough: 'Thorough',
};

export function getTask(taskId) {
  return TASKS.find((task) => task.id === taskId);
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
