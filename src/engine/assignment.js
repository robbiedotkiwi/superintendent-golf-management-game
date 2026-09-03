import { getTask, taskDuration } from '../data/tasks.js';
import { AUTO_PICK_MINUTES, BALL_PICK_MINUTES } from '../data/constants.js';
import { machineTimeMultiplier } from './equipment.js';
import { taskTimeMultiplier } from './projects.js';
import { isWorkerPresent, workerAllows, workerTimeMultiplier } from './skills.js';

export { workerAllows, isWorkerPresent, workerTimeMultiplier };
export { workerQualityMultiplier, qualityRandomFactor } from './skills.js';

export function preferredStat(surface) {
  if (surface === 'greens' || surface === 'tees') return 'qualitySkill';
  return 'speedSkill';
}

export function durationForTask(state, taskId, level, worker) {
  const task = getTask(taskId);
  const base =
    taskId === 'pickBalls'
      ? state.hasAutoPicker
        ? AUTO_PICK_MINUTES
        : BALL_PICK_MINUTES
      : taskDuration(taskId, level, machineTimeMultiplier(state, task));
  const scaled = Math.round(base * taskTimeMultiplier(state, task));
  if (!worker) return scaled;
  return Math.round(scaled * workerTimeMultiplier(worker));
}

export function assignWorker(state, task, level) {
  const stat = preferredStat(task.surface);
  const ranked = [...state.workers]
    .filter((worker) => isWorkerPresent(worker) && workerAllows(worker, task.surface))
    .filter((worker) => (task.requiresSpray ? worker.sprayCertified : true))
    .sort((a, b) => b[stat] - a[stat] || b.speedSkill - a.speedSkill);
  for (const worker of ranked) {
    const minutes = durationForTask(state, task.id, level, worker);
    if (worker.minutesToday - worker.minutesUsed >= minutes) return worker;
  }
  return null;
}

export function certifiedPresent(state, surface) {
  return state.workers.some(
    (worker) => worker.sprayCertified && isWorkerPresent(worker) && workerAllows(worker, surface),
  );
}

export function workerById(state, id) {
  return state.workers.find((worker) => worker.id === id);
}
