import {
  COPY_FLAG_AWAY,
  COPY_FLAG_SHED,
  SLOT_MINUTES,
  TEMPLATE_CAP,
  TEMPLATE_NAME_MAX,
  WORK_DAY_MINUTES,
} from '../data/config.js';
import { CUT_TASK_BY_SURFACE } from '../data/constants.js';
import { isMachineAvailable } from './equipment.js';
import { getDayTasks, setDayTasks, weekDays, weekStartDay, workersForPlanDay } from './week.js';
import { workerAvailableOnDay } from './weekGrid.js';

export function snapMinutes(minutes) {
  const n = Number(minutes) || 0;
  return Math.max(SLOT_MINUTES, Math.round(n / SLOT_MINUTES) * SLOT_MINUTES);
}

export function slotCount(dayLength = WORK_DAY_MINUTES) {
  return Math.max(1, Math.round(dayLength / SLOT_MINUTES));
}

export function rangesOverlap(aStart, aMinutes, bStart, bMinutes) {
  const a0 = aStart ?? 0;
  const a1 = a0 + (aMinutes ?? 0);
  const b0 = bStart ?? 0;
  const b1 = b0 + (bMinutes ?? 0);
  return a0 < b1 && b0 < a1;
}

export function tasksForWorker(tasks, workerId) {
  return (tasks ?? []).filter((item) => item.workerId === workerId);
}

export function nextStartMinute(tasks, workerId, dayLength = WORK_DAY_MINUTES) {
  const mine = [...tasksForWorker(tasks, workerId)].sort(
    (a, b) => (a.startMinute ?? 0) - (b.startMinute ?? 0),
  );
  let cursor = 0;
  for (const item of mine) {
    const start = item.startMinute ?? cursor;
    if (start - cursor >= SLOT_MINUTES) return cursor;
    cursor = Math.max(cursor, start + (item.minutes ?? 0));
  }
  return cursor <= dayLength - SLOT_MINUTES ? cursor : cursor;
}

export function machineConflictsOnDay(tasks, machineId, startMinute, minutes, ignorePlanId) {
  if (!machineId) return [];
  return (tasks ?? []).filter(
    (item) =>
      item.machineId === machineId &&
      item.planId !== ignorePlanId &&
      rangesOverlap(startMinute, minutes, item.startMinute ?? 0, item.minutes ?? 0),
  );
}

export function stampStartMinutes(tasks, dayLength = WORK_DAY_MINUTES) {
  const used = {};
  return (tasks ?? []).map((item) => {
    if (item.startMinute != null) return item;
    const cursor = used[item.workerId] ?? 0;
    used[item.workerId] = cursor + (item.minutes ?? 0);
    return { ...item, startMinute: cursor };
  });
}

export function copyFlagsFor(state, day, task) {
  const flags = [];
  if (task.workerId && !workerAvailableOnDay(state, task.workerId, day)) flags.push(COPY_FLAG_AWAY);
  if (task.machineId && !isMachineAvailable(state, task.machineId)) flags.push(COPY_FLAG_SHED);
  return flags;
}

export function cloneTasksToDay(state, sourceTasks, destDay, nextPlanId) {
  let id = nextPlanId ?? state.nextPlanId ?? 1;
  const destExisting = getDayTasks(state, destDay);
  const cloned = [];
  for (const task of sourceTasks ?? []) {
    const startMinute = nextStartMinute([...destExisting, ...cloned], task.workerId);
    const copyFlags = copyFlagsFor(state, destDay, task);
    cloned.push({
      ...task,
      planId: id,
      startMinute,
      copyFlags,
    });
    id += 1;
  }
  return { tasks: cloned, nextPlanId: id };
}

export function applyCopiedTasks(state, destDay, sourceTasks) {
  const { tasks, nextPlanId } = cloneTasksToDay(state, sourceTasks, destDay, state.nextPlanId ?? 1);
  const merged = stampStartMinutes([...getDayTasks(state, destDay), ...tasks]);
  return { ...setDayTasks(state, destDay, merged), nextPlanId };
}

export function copyYesterday(state, destDay) {
  const sourceDay = destDay - 1;
  if (weekStartDay(sourceDay) !== weekStartDay(state.day)) {
    return { ...state, lastCopyFlags: [] };
  }
  const source = getDayTasks(state, sourceDay);
  const next = applyCopiedTasks(state, destDay, source);
  return { ...next, lastCopyFlags: getDayTasks(next, destDay).flatMap((item) => item.copyFlags ?? []) };
}

export function copyLastWeek(state) {
  const last = state.lastWeek;
  if (!last?.days) return { ...state, lastCopyFlags: [] };
  const fromDays = weekDays(last.weekStart ?? state.day - 7);
  const toDays = weekDays(state.day);
  let next = { ...state, lastCopyFlags: [] };
  const flags = [];
  for (let i = 0; i < toDays.length; i += 1) {
    if (toDays[i] < state.day) continue;
    const source = last.days?.[fromDays[i]]?.tasks ?? [];
    next = applyCopiedTasks(next, toDays[i], source);
    flags.push(...getDayTasks(next, toDays[i]).flatMap((item) => item.copyFlags ?? []));
  }
  return { ...next, lastCopyFlags: flags };
}

export function saveNamedTemplate(state, name) {
  const trimmed = String(name ?? '').trim().slice(0, TEMPLATE_NAME_MAX);
  if (!trimmed) return state;
  const days = {};
  for (const day of weekDays(state.day)) {
    const weekday = ((day - 1) % 7) + 1;
    days[weekday] = (getDayTasks(state, day) ?? []).map((item) => {
      const rest = { ...item };
      delete rest.planId;
      delete rest.copyFlags;
      return rest;
    });
  }
  const templates = [...(state.planTemplates ?? [])];
  const existing = templates.findIndex((item) => item.name === trimmed);
  const entry = { id: existing >= 0 ? templates[existing].id : (state.nextTemplateId ?? 1), name: trimmed, days };
  if (existing >= 0) templates[existing] = entry;
  else templates.push(entry);
  return {
    ...state,
    planTemplates: templates.slice(-TEMPLATE_CAP),
    nextTemplateId: Math.max(state.nextTemplateId ?? 1, entry.id + 1),
  };
}

export function applyNamedTemplate(state, templateId) {
  const template = (state.planTemplates ?? []).find((item) => item.id === templateId);
  if (!template) return state;
  let next = { ...state };
  const flags = [];
  for (const day of weekDays(state.day)) {
    if (day < state.day) continue;
    const weekday = ((day - 1) % 7) + 1;
    const source = template.days?.[weekday] ?? [];
    next = applyCopiedTasks(next, day, source);
    flags.push(...getDayTasks(next, day).flatMap((item) => item.copyFlags ?? []));
  }
  return { ...next, lastCopyFlags: flags };
}

export function mowTaskIdFor(surface) {
  return CUT_TASK_BY_SURFACE[surface] ?? null;
}

export { workersForPlanDay };
