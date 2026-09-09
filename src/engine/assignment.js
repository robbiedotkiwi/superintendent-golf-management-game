import { getTask, taskUsesMachine } from '../data/tasks.js';
import { AUTO_PICK_MINUTES, BALL_PICK_MINUTES, TASK_MINUTES } from '../data/constants.js';
import { durationOnMachine, pickMachine, pickMachineForTask, hasBallPicker } from './equipment.js';
import { mowingMinutes } from './mowing.js';
import { handWaterMinutes } from './moisture.js';
import { isWorkerPresent, workerAllows, workerBringsOwnMower } from './skills.js';

export { workerAllows, workerBringsOwnMower, isWorkerPresent, workerTimeMultiplier, mowingSpeedEfficiency, mowingOperatorTimeMultiplier } from './skills.js';
export { workerQualityMultiplier, qualityRandomFactor } from './skills.js';

export function preferredStat(surface) {
  if (surface === 'greens' || surface === 'tees') return 'qualitySkill';
  return 'speedSkill';
}

export function baseTaskMinutes(state, taskId) {
  const task = getTask(taskId);
  if (taskId === 'pickBalls') return hasBallPicker(state) ? AUTO_PICK_MINUTES : BALL_PICK_MINUTES;
  if (taskId === 'handWater') return handWaterMinutes(state);
  if (task?.mowing) return mowingMinutes(state, taskId);
  return TASK_MINUTES[taskId];
}

export function durationForTask(state, taskId, worker, machineId, holeIds) {
  const task = getTask(taskId);
  const id =
    machineId ??
    (taskUsesMachine(task) ? pickMachine(state, task)?.id : null);
  return durationOnMachine(state, taskId, worker, id, holeIds);
}

export function assignWorker(state, task, holeIds) {
  const stat = preferredStat(task.surface);
  const ranked = [...state.workers]
    .filter((worker) => isWorkerPresent(worker) && workerAllows(worker, task.surface))
    .filter((worker) => (task.requiresSpray ? worker.sprayCertified : true))
    .sort((a, b) => b[stat] - a[stat] || b.speedSkill - a.speedSkill);
  for (const worker of ranked) {
    const ownMower = workerBringsOwnMower(worker, task.surface);
    if (task.mowing && !ownMower && !pickMachineForTask(state, task, worker, undefined, holeIds)) continue;
    const machine = ownMower ? null : pickMachineForTask(state, task, worker, undefined, holeIds);
    const minutes = durationForTask(state, task.id, worker, machine?.id, holeIds);
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
