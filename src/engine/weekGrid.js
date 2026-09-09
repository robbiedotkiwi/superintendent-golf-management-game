import { PLAYER_ID } from '../data/constants.js';
import { getTask, SURFACE_LABELS, taskUsesMachine } from '../data/tasks.js';
import { allowingMachines, NO_MACHINE_REASON } from './equipment.js';
import { defaultJobHoles } from './holes.js';
import { migrateIrrigationValue } from './irrigation.js';
import { daysSinceLastWorked } from './neglect.js';
import { workerAllows } from './skills.js';
import {
  getDayTasks,
  irrigationForPlanDay,
  weekDays,
  weekdayLabel,
  workersForPlanDay,
} from './week.js';

export const WEEK_GRID_JOBS = [
  { taskId: 'cutGreens', surface: 'greens', label: 'Mow greens' },
  { taskId: 'rollGreens', surface: 'greens', label: 'Roll greens' },
  { taskId: 'cutTees', surface: 'tees', label: 'Mow tees' },
  { taskId: 'cutFairways', surface: 'fairways', label: 'Mow fairways' },
  { taskId: 'cutRough', surface: 'rough', label: 'Mow rough' },
  { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' },
  { taskId: 'handWater', surface: 'greens', label: 'Hand water' },
  { taskId: 'sprayGreens', surface: 'greens', label: 'Spray greens' },
  { taskId: 'sprayTees', surface: 'tees', label: 'Spray tees' },
  { taskId: 'sprayFairways', surface: 'fairways', label: 'Spray fairways' },
  { taskId: 'fertiliseGreens', surface: 'greens', label: 'Fertilise greens' },
  { taskId: 'fertiliseTees', surface: 'tees', label: 'Fertilise tees' },
  { taskId: 'fertiliseFairways', surface: 'fairways', label: 'Fertilise fairways' },
];

export function rosterPeople(state) {
  const permanent = (state.workers ?? []).filter((worker) => !worker.isCasual);
  const casuals = state.casualPool ?? [];
  const seen = new Set();
  const list = [];
  for (const worker of [...permanent, ...casuals]) {
    if (!worker?.id || seen.has(worker.id)) continue;
    seen.add(worker.id);
    list.push(worker);
  }
  return list;
}

export function rosterWorker(state, workerId) {
  if (!workerId) return null;
  return rosterPeople(state).find((worker) => worker.id === workerId) ?? null;
}

export function workerAvailableOnDay(state, workerId, day) {
  if (!workerId) return false;
  const worker = workersForPlanDay(state, day).find((item) => item.id === workerId);
  return Boolean(worker && worker.minutesToday > 0);
}

export function jobLockReason(state, taskId) {
  const task = getTask(taskId);
  if (!task) return 'Unknown job.';
  if (task.mowing && !allowingMachines(state, task).length) return NO_MACHINE_REASON;
  if (task.requiresSpray) {
    const certified = rosterPeople(state).some(
      (worker) => worker.sprayCertified && workerAllows(worker, task.surface),
    );
    if (!certified) return 'Needs a spray-certified worker.';
  }
  return null;
}

export function daysSinceFact(state, job) {
  const surface = job.surface;
  if (!surface) return null;
  const days = daysSinceLastWorked(state, surface);
  const label = SURFACE_LABELS[surface] ?? surface;
  return `${label} — ${days} days`;
}

export function courseHolesFor(state, taskId) {
  const task = getTask(taskId);
  if (taskId === 'handWater') return [...(state.handWaterTargets ?? defaultJobHoles(state, 'greens'))];
  if (!task?.surface) return [];
  return defaultJobHoles(state, task.surface);
}

export function tasksOnDay(state, day, taskId) {
  return getDayTasks(state, day).filter((item) => item.taskId === taskId);
}

export function deriveJobRow(state, job) {
  const days = weekDays(state.day);
  const cells = days.map((day) => {
    const tasks = tasksOnDay(state, day, job.taskId);
    const task = tasks[0] ?? null;
    const available = task ? workerAvailableOnDay(state, task.workerId, day) : false;
    return {
      day,
      weekday: weekdayLabel(day),
      tasks,
      planned: tasks.length > 0,
      unassigned: Boolean(task) && !available,
      workerId: task?.workerId ?? null,
      machineId: task?.machineId ?? null,
      past: day < state.day,
    };
  });
  const instances = cells.flatMap((cell) => cell.tasks);
  const workerIds = [...new Set(instances.map((item) => item.workerId).filter(Boolean))];
  const machineIds = [...new Set(instances.map((item) => item.machineId ?? null))];
  const mixedWorker = workerIds.length > 1;
  const mixedMachine = machineIds.length > 1;
  return {
    ...job,
    task: getTask(job.taskId),
    usesMachine: taskUsesMachine(getTask(job.taskId)),
    lockReason: jobLockReason(state, job.taskId),
    daysSince: daysSinceFact(state, job),
    cells,
    mixedWorker,
    mixedMachine,
    workerId: mixedWorker ? null : (workerIds[0] ?? null),
    machineId: mixedMachine ? null : (machineIds[0] ?? null),
  };
}

export function deriveWeekGrid(state) {
  return WEEK_GRID_JOBS.map((job) => deriveJobRow(state, job));
}

export function irrigationCells(state, surface) {
  return weekDays(state.day).map((day) => {
    const irrigation = irrigationForPlanDay(state, day);
    return {
      day,
      weekday: weekdayLabel(day),
      mm: migrateIrrigationValue(surface, irrigation?.[surface]),
      past: day < state.day,
    };
  });
}

export function personCapacityForDay(state, day) {
  const workers = workersForPlanDay(state, day).filter((worker) => worker.minutesToday > 0);
  const tasks = getDayTasks(state, day);
  return workers.map((worker) => {
    const used = tasks
      .filter((item) => item.workerId === worker.id)
      .reduce((sum, item) => sum + (item.minutes ?? 0), 0);
    const capacity = worker.minutesToday;
    return {
      id: worker.id,
      name: worker.name,
      used,
      capacity,
      overfilled: used > capacity,
      fill: capacity > 0 ? used / capacity : 0,
    };
  });
}

export function defaultWorkerId(state, row) {
  if (row.workerId) return row.workerId;
  if (row.mixedWorker) return PLAYER_ID;
  const people = rosterPeople(state).filter((worker) => workerAllows(worker, row.surface));
  return people[0]?.id ?? PLAYER_ID;
}
