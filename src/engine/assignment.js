import { durationOnMachine, pickMachineForTask } from './equipment.js';
import { isWorkerPresent, workerAllows, workerBringsOwnMower } from './skills.js';

export { workerAllows, workerBringsOwnMower, isWorkerPresent, workerTimeMultiplier, mowingSpeedEfficiency, mowingOperatorTimeMultiplier } from './skills.js';
export { workerQualityMultiplier, qualityRandomFactor } from './skills.js';
export { durationOnMachine };

export function preferredStat(surface) {
  if (surface === 'greens' || surface === 'tees') return 'qualitySkill';
  return 'speedSkill';
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
    const minutes = durationOnMachine(state, task.id, worker, ownMower ? null : machine?.id, holeIds);
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
