import { getTask, taskUsesMachine } from '../data/tasks.js';
import { AUTO_PICK_MINUTES, BALL_PICK_MINUTES, TASK_MINUTES } from '../data/constants.js';
import { durationOnMachine, pickMachineForTask } from './equipment.js';
import { mowingMinutes } from './mowing.js';
import { handWaterMinutes } from './moisture.js';
import { isWorkerPresent, workerAllows } from './skills.js';

export { workerAllows, isWorkerPresent, workerTimeMultiplier } from './skills.js';
export { workerQualityMultiplier, qualityRandomFactor } from './skills.js';

export function preferredStat(surface) {
  if (surface === 'greens' || surface === 'tees') return 'qualitySkill';
  return 'speedSkill';
}

export function baseTaskMinutes(state, taskId) {
  const task = getTask(taskId);
  if (taskId === 'pickBalls') return state.hasAutoPicker ? AUTO_PICK_MINUTES : BALL_PICK_MINUTES;
  if (taskId === 'handWater') return handWaterMinutes(state);
  if (task?.mowing) return mowingMinutes(state, taskId);
  return TASK_MINUTES[taskId];
}

export function durationForTask(state, taskId, worker, machineId) {
  const task = getTask(taskId);
  const id =
    machineId ??
    (taskUsesMachine(task) ? pickMachineForTask(state, task, worker)?.id : null);
  return durationOnMachine(state, taskId, worker, id);
}

export function assignWorker(state, task) {
  const stat = preferredStat(task.surface);
  const ranked = [...state.workers]
    .filter((worker) => isWorkerPresent(worker) && workerAllows(worker, task.surface))
    .filter((worker) => (task.requiresSpray ? worker.sprayCertified : true))
    .sort((a, b) => b[stat] - a[stat] || b.speedSkill - a.speedSkill);
  for (const worker of ranked) {
    if (task.mowing && !pickMachineForTask(state, task, worker)) continue;
    const machine = pickMachineForTask(state, task, worker);
    const minutes = durationForTask(state, task.id, worker, machine?.id);
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
