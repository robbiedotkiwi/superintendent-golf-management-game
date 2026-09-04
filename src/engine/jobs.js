import {
  FRONT_NINE_COUNT,
  HOC_RANGE,
  HOC_TIME_MULT,
  JOB_SETUP_MINUTES_BY_TYPE,
  PER_HOLE_MINUTES,
  ROUTE_NAME_MAX,
  SAVED_ROUTE_CAP,
  TASK_MINUTES,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { hocFactor, patternTimeMult } from './mowing.js';
import { defaultJobHoles, formatHoleSet, normalizeJobHoles, sameHoleSet } from './holes.js';

export function setupMinutesFor(taskOrSurface) {
  const surface = typeof taskOrSurface === 'string' ? taskOrSurface : taskOrSurface?.surface;
  if (!surface) return 0;
  return JOB_SETUP_MINUTES_BY_TYPE[surface] ?? 0;
}

export function jobHolesFor(state, task, holeIds) {
  if (!task?.surface) return [];
  return normalizeJobHoles(state, task.surface, holeIds);
}

export function defaultHoleCountFor(state, task) {
  if (!task?.surface) return 0;
  return defaultJobHoles(state, task.surface).length || FRONT_NINE_COUNT;
}

export function perHoleMinutesFor(state, taskId) {
  const task = getTask(taskId);
  if (!task) return 0;
  if (task.mowing) {
    if (taskId === 'doubleCutGreens') {
      return (TASK_MINUTES.doubleCutGreens ?? 0) / defaultHoleCountFor(state, task);
    }
    return PER_HOLE_MINUTES[task.surface] ?? 0;
  }
  if (!task.surface) return 0;
  const whole = TASK_MINUTES[taskId] ?? 0;
  return whole / defaultHoleCountFor(state, task);
}

export function heightPatternMult(state, task) {
  if (!task?.mowing || !task.surface) return 1;
  const height = state.surfaceDefaults?.[task.surface]?.hoc ?? HOC_RANGE[task.surface]?.default;
  const pattern = state.surfaceDefaults?.[task.surface]?.pattern;
  return HOC_TIME_MULT(hocFactor(task.surface, height)) * patternTimeMult(task.surface, pattern);
}

export function variableJobMinutes(state, taskId, holeIds) {
  const task = getTask(taskId);
  if (!task) return TASK_MINUTES[taskId] ?? 0;
  if (!task.surface) return TASK_MINUTES[taskId] ?? 0;
  const holes = jobHolesFor(state, task, holeIds);
  const n = holes.length;
  return perHoleMinutesFor(state, taskId) * n * heightPatternMult(state, task);
}

export function jobMinutes(state, taskId, holeIds) {
  const task = getTask(taskId);
  const setup = setupMinutesFor(task);
  if (!task?.surface) return TASK_MINUTES[taskId] ?? 0;
  return setup + variableJobMinutes(state, taskId, holeIds);
}

export function findPlannedJob(state, taskId, holeIds) {
  const task = getTask(taskId);
  const holes = jobHolesFor(state, task, holeIds);
  return (state.plannedTasks ?? []).find(
    (item) => item.taskId === taskId && sameHoleSet(item.holes ?? [], holes),
  );
}

export function snapshotDayJobs(plannedTasks) {
  return (plannedTasks ?? []).map((item) => ({
    taskId: item.taskId,
    holes: [...(item.holes ?? [])],
    machineId: item.machineId ?? null,
  }));
}

export function canSaveRoute(state, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { ok: false, reason: 'Name the route.' };
  if ((state.savedRoutes ?? []).length >= SAVED_ROUTE_CAP) {
    return { ok: false, reason: `Only ${SAVED_ROUTE_CAP} saved routes.` };
  }
  if (!(state.selectedHoles ?? []).length) return { ok: false, reason: 'Select holes first.' };
  return { ok: true, name: trimmed.slice(0, ROUTE_NAME_MAX) };
}

export function applyRoute(state, routeId) {
  const route = (state.savedRoutes ?? []).find((item) => item.id === routeId);
  if (!route) return state;
  return { ...state, selectedHoles: [...route.holes] };
}

export function describeJob(taskId, holeIds) {
  const task = getTask(taskId);
  const set = formatHoleSet(holeIds);
  return set ? `${task?.name ?? taskId} on ${set}` : (task?.name ?? taskId);
}

export { formatHoleSet, normalizeJobHoles, sameHoleSet };
