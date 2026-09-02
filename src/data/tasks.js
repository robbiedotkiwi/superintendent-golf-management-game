import { QUALITY_LEVELS, SURFACE_KEYS, TASK_MINUTES } from './constants.js';

export const SURFACE_LABELS = {
  greens: 'Greens',
  tees: 'Tees',
  fairways: 'Fairways',
  rough: 'Rough',
  bunkers: 'Bunkers',
};

export const TASKS = [
  { id: 'cutGreens', surface: 'greens', name: 'Cut greens' },
  { id: 'rollGreens', surface: 'greens', name: 'Roll' },
  { id: 'changeCups', surface: 'greens', name: 'Change cups' },
  { id: 'cutTees', surface: 'tees', name: 'Cut' },
  { id: 'cutFairways', surface: 'fairways', name: 'Cut' },
  { id: 'cutRough', surface: 'rough', name: 'Cut' },
  { id: 'rakeBunkers', surface: 'bunkers', name: 'Rake' },
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

export function taskDuration(taskId, level) {
  return Math.round(TASK_MINUTES[taskId] * QUALITY_LEVELS[level].timeMultiplier);
}

export function taskGain(level) {
  return QUALITY_LEVELS[level].qualityGain;
}

export { SURFACE_KEYS };
