import { PLAYER_ID } from '../data/constants.js';
import { getTask, SURFACE_LABELS, taskUsesMachine } from '../data/tasks.js';
import { allowingMachines, durationOnMachine, NO_MACHINE_REASON, pickMachineForTask } from './equipment.js';
import { defaultJobHoles } from './holes.js';
import { migrateIrrigationValue } from './irrigation.js';
import { daysSinceLastWorked } from './neglect.js';
import { workerAllows, workerBringsOwnMower } from './skills.js';
import {
  dropInvalidDayTasks,
  getDayTasks,
  irrigationForPlanDay,
  weekDays,
  weekdayLabel,
  workersForPlanDay,
} from './week.js';

export const EVERYONE_ID = 'all';

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

export function isEveryonePlanner(plannerId) {
  return !plannerId || plannerId === EVERYONE_ID;
}

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
  if (task.mowing && !allowingMachines(state, task).length) {
    const ownMower = rosterPeople(state).some((worker) => workerBringsOwnMower(worker, task.surface));
    if (!ownMower) return NO_MACHINE_REASON;
  }
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

export function resolvePlanMachineId(state, task, worker, overrideId, holes) {
  if (!task) return null;
  if (workerBringsOwnMower(worker, task.surface)) return null;
  if (overrideId) return overrideId;
  if (!taskUsesMachine(task)) return null;
  return pickMachineForTask(state, task, worker, undefined, holes)?.id ?? null;
}

export function cellMinutesFor(state, taskId, worker, overrideId, holes) {
  if (!worker) return 0;
  const task = getTask(taskId);
  const machineId = resolvePlanMachineId(state, task, worker, overrideId || undefined, holes);
  return durationOnMachine(state, taskId, worker, machineId, holes);
}

export function displayCellMinutes(state, job, cell, planner, machineOverride) {
  if (!planner) return cell.planned ? (cell.tasks[0]?.minutes ?? 0) : 0;
  const holes = cell.tasks[0]?.holes ?? courseHolesFor(state, job.taskId);
  return cellMinutesFor(state, job.taskId, planner, machineOverride, holes);
}

export function daysMatchingWorker(row, workerId) {
  if (!workerId) return [];
  return row.cells.filter((cell) => cell.planned && cell.workerId === workerId && !cell.past).map((cell) => cell.day);
}

export function deriveJobRow(state, job) {
  const days = weekDays(state.day);
  const cells = days.map((day) => {
    const tasks = tasksOnDay(state, day, job.taskId);
    const task = tasks[0] ?? null;
    const available = task ? workerAvailableOnDay(state, task.workerId, day) : false;
    const holes = task?.holes ?? courseHolesFor(state, job.taskId);
    const worker = rosterWorker(state, task?.workerId);
    return {
      day,
      weekday: weekdayLabel(day),
      tasks,
      planned: tasks.length > 0,
      unassigned: Boolean(task) && !available,
      workerId: task?.workerId ?? null,
      workerName: worker?.name ?? null,
      machineId: task?.machineId ?? null,
      minutes: task?.minutes ?? 0,
      holes,
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

export function jobsThatWontFit(state, day, workerId = null) {
  const dropped = dropInvalidDayTasks(state, day).dropped.filter((item) => item.reason === 'time');
  if (!workerId) return dropped;
  return dropped.filter((item) => item.workerId === workerId);
}

export function rowsForPerson(state, workerId) {
  const rows = deriveWeekGrid(state);
  if (isEveryonePlanner(workerId)) return rows;
  const worker = rosterWorker(state, workerId);
  if (!worker) return [];
  return rows.filter(
    (row) =>
      workerAllows(worker, row.surface) ||
      row.cells.some((cell) => cell.tasks.some((task) => task.workerId === workerId)),
  );
}

export function capacityBarsForPerson(state, day, workerId) {
  const bars = personCapacityForDay(state, day);
  if (isEveryonePlanner(workerId)) return bars;
  return bars.filter((item) => item.id === workerId);
}

export function defaultWorkerId(state, row) {
  if (row.workerId) return row.workerId;
  if (row.mixedWorker) return PLAYER_ID;
  const people = rosterPeople(state).filter((worker) => workerAllows(worker, row.surface));
  return people[0]?.id ?? PLAYER_ID;
}
