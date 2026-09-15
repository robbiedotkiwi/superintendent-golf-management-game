import {
  HOUR_INCREMENT,
  MAX_PASSES_PER_AREA_PER_DAY,
  MINUTES_PER_HOUR,
  PASS_AREAS,
  PLANNER_HOUR_PX,
  PLANNER_PALETTE,
  TASK_MACHINE_CLASS_LABELS,
  WORK_DAY_HOURS,
} from '../data/config.ts';
import { getTask, SURFACE_LABELS, machineRequirementOf, taskUsesMachine } from '../data/tasks.ts';
import { catalogMachineTitle } from './machineDisplay.ts';
import { allowingMachines, canHireForTask, durationOnMachine, missingMachineReason, pickMachineForTask } from './equipment.ts';
import { hoursToMinutes, minutesToHours, snapHours, snapMinutes } from './duration.ts';
import { machineConflictsOnDay, rangesOverlap } from './slots.ts';
import { staffCanRunMachine, hoursToPassFraction, passHoursFor } from './passes.ts';
import { dayLengthMinutes, getDayTasks, workersForPlanDay } from './week.ts';
import { getMachine } from '../data/equipment.ts';

export function plannerPalette() {
  return PLANNER_PALETTE;
}

export function paletteLabel(taskId) {
  return PLANNER_PALETTE.find((item) => item.taskId === taskId)?.label ?? getTask(taskId)?.name ?? taskId;
}

export function autoMachineFor(state, task, worker) {
  if (!taskUsesMachine(task)) return null;
  const allowed = allowingMachines(state, task).filter((machine) => staffCanRunMachine(worker, machine));
  if (!allowed.length) return pickMachineForTask(state, task, worker);
  const ranked = [...allowed].sort((a, b) => {
    const da = durationOnMachine(state, task.id, worker, a.id);
    const db = durationOnMachine(state, task.id, worker, b.id);
    return da - db;
  });
  return ranked[0] ?? null;
}

export function paletteMachineStatus(state, task) {
  if (!taskUsesMachine(task)) return { ok: true };
  if (allowingMachines(state, task).length) return { ok: true };
  if (canHireForTask(state, task)) return { ok: true, hired: true };
  return { ok: false, reason: missingMachineReason(task) };
}

export function defaultBlockMinutes(state, taskId, worker, machineId) {
  const minutes = durationOnMachine(state, taskId, worker, machineId);
  return snapMinutes(minutes || HOUR_INCREMENT * MINUTES_PER_HOUR);
}

export function paletteHoursFor(state, taskId, worker) {
  const task = getTask(taskId);
  const machine = worker ? autoMachineFor(state, task, worker) : null;
  return minutesToHours(defaultBlockMinutes(state, taskId, worker, machine?.id));
}

export function hourFromClientX(timelineEl, clientX) {
  if (!timelineEl) return 0;
  const rect = timelineEl.getBoundingClientRect();
  const x = clientX - rect.left + (timelineEl.scrollLeft ?? 0);
  return snapHours(x / PLANNER_HOUR_PX);
}

export function blockLeftPx(startMinute) {
  return minutesToHours(startMinute) * PLANNER_HOUR_PX;
}

export function blockWidthPx(minutes) {
  return Math.max(PLANNER_HOUR_PX * HOUR_INCREMENT, minutesToHours(minutes) * PLANNER_HOUR_PX);
}

export function timelineWidthPx(state, day) {
  const hours = Math.max(WORK_DAY_HOURS, minutesToHours(dayLengthMinutes(state, day)));
  return hours * PLANNER_HOUR_PX;
}

export function hourTicks(state, day) {
  const hours = Math.max(WORK_DAY_HOURS, minutesToHours(dayLengthMinutes(state, day)));
  const ticks = [];
  for (let h = 0; h <= hours + 1e-9; h += HOUR_INCREMENT) {
    ticks.push(Number(h.toFixed(1)));
  }
  return ticks;
}

export function formatPlannerHours(hours) {
  const n = Number(hours) || 0;
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export function passFractionForBlock(state, block, worker) {
  const task = getTask(block.taskId);
  if (!task?.mowing || !PASS_AREAS.includes(task.surface)) return null;
  const passHours = passHoursFor(state, block.machineId, task.surface, worker);
  if (!(passHours > 0)) return null;
  return hoursToPassFraction(minutesToHours(block.minutes), passHours);
}

export function overrideMachinesFor(state, task) {
  return allowingMachines(state, task);
}

export function surplusWastedHours(state, block, day = state.day) {
  const task = getTask(block.taskId);
  if (!task?.mowing || !PASS_AREAS.includes(task.surface)) return 0;
  const tasks = getDayTasks(state, day);
  const worker = workersForPlanDay(state, day).find((item) => item.id === block.workerId);
  const others = tasks.filter(
    (item) => item.planId !== block.planId && getTask(item.taskId)?.surface === task.surface && getTask(item.taskId)?.mowing,
  );
  const booked = others.reduce((sum, item) => sum + minutesToHours(item.minutes), 0);
  const passHours = passHoursFor(state, block.machineId, task.surface, worker);
  if (!(passHours > 0)) return 0;
  const already = hoursToPassFraction(booked, passHours);
  if (already < MAX_PASSES_PER_AREA_PER_DAY) return 0;
  return minutesToHours(block.minutes);
}

export function resizeBounds(state, block, day = state.day) {
  const worker = workersForPlanDay(state, day).find((item) => item.id === block.workerId);
  const dayLen = worker?.minutesToday ?? dayLengthMinutes(state, day);
  const originalStart = block.startMinute ?? 0;
  const originalEnd = originalStart + (block.minutes ?? 0);
  const others = getDayTasks(state, day).filter(
    (item) => item.workerId === block.workerId && item.planId !== block.planId,
  );
  let prevEnd = 0;
  let nextStart = dayLen;
  for (const other of others) {
    const start = other.startMinute ?? 0;
    const end = start + (other.minutes ?? 0);
    if (end <= originalStart) prevEnd = Math.max(prevEnd, end);
    else if (start >= originalEnd) nextStart = Math.min(nextStart, start);
  }
  return {
    minStart: Math.max(0, prevEnd),
    maxEnd: Math.min(dayLen, nextStart),
  };
}

export function clampBlockResize(state, block, day, startMinute, minutes) {
  const minSize = hoursToMinutes(HOUR_INCREMENT);
  const { minStart, maxEnd } = resizeBounds(state, block, day);
  const span = maxEnd - minStart;
  if (span < minSize) {
    return { startMinute: block.startMinute ?? 0, minutes: block.minutes ?? minSize };
  }
  let start = snapMinutes(Math.max(0, startMinute ?? 0));
  let dur = snapMinutes(Math.max(minSize, minutes ?? minSize));
  start = Math.max(minStart, Math.min(start, maxEnd - minSize));
  dur = Math.min(dur, maxEnd - start);
  dur = Math.max(minSize, dur);
  if (start + dur > maxEnd) {
    start = Math.max(minStart, maxEnd - dur);
    dur = Math.min(dur, maxEnd - start);
  }
  return { startMinute: start, minutes: dur };
}

export function blockConflicts(state, block, day = state.day) {
  const reasons = [];
  const tasks = getDayTasks(state, day);
  const worker = workersForPlanDay(state, day).find((item) => item.id === block.workerId);
  const machine = block.machineId ? getMachine(block.machineId) : null;
  if (block.machineId) {
    const clashes = machineConflictsOnDay(tasks, block.machineId, block.startMinute, block.minutes, block.planId);
    if (clashes.length) reasons.push('machine');
  }
  if (machine && worker && !staffCanRunMachine(worker, machine)) reasons.push('tier');
  const dayLen = worker?.minutesToday ?? dayLengthMinutes(state, day);
  if ((block.startMinute ?? 0) + (block.minutes ?? 0) > dayLen) reasons.push('overrun');
  if (surplusWastedHours(state, block, day) > 0) reasons.push('surplus');
  return reasons;
}

export function conflictCopy(reason, wastedHours) {
  if (reason === 'machine') return 'Machine already booked in this window';
  if (reason === 'tier') return "This person's tier cannot run that machine";
  if (reason === 'overrun') return "Over this person's day length";
  if (reason === 'surplus') {
    const hours = wastedHours > 0 ? ` (${formatPlannerHours(wastedHours)} hr wasted)` : '';
    return `Second pass today — surplus hours wasted${hours}`;
  }
  return reason;
}

export function blockFace(state, block, worker) {
  const task = getTask(block.taskId);
  const hours = minutesToHours(block.minutes);
  const fraction = passFractionForBlock(state, block, worker);
  const label = SURFACE_LABELS[task?.surface] ?? paletteLabel(block.taskId);
  let machine = catalogMachineTitle(block.machineId) || (block.ownMower ? 'own' : '');
  if (!machine && block.hiredMachine) {
    const req = machineRequirementOf(task);
    machine = `hired ${TASK_MACHINE_CLASS_LABELS[req.class] ?? 'machine'}`;
  }
  return {
    label,
    machine,
    hours,
    fraction: fraction != null && fraction < 1 - 1e-6 ? fraction : null,
  };
}

export { rangesOverlap };
export { hoursToMinutes, snapHours, snapMinutes };
