import {
  HOUR_INCREMENT,
  MAX_PASSES_PER_AREA_PER_DAY,
  MINUTES_PER_HOUR,
  PASS_AREAS,
  PLANNER_HOUR_PX,
  PLANNER_PALETTE,
  WORK_DAY_HOURS,
} from '../data/config.js';
import { getTask, SURFACE_LABELS } from '../data/tasks.js';
import { catalogMachineTitle } from './machineDisplay.js';
import { allowingMachines, durationOnMachine, pickMachineForTask } from './equipment.js';
import { hoursToMinutes, minutesToHours, snapHours, snapMinutes } from './duration.js';
import { machineConflictsOnDay, rangesOverlap } from './slots.js';
import { staffCanRunMachine, hoursToPassFraction, passHoursFor } from './passes.js';
import { dayLengthMinutes, getDayTasks, workersForPlanDay } from './week.js';
import { getMachine } from '../data/equipment.js';

export function plannerPalette() {
  return PLANNER_PALETTE;
}

export function paletteLabel(taskId) {
  return PLANNER_PALETTE.find((item) => item.taskId === taskId)?.label ?? getTask(taskId)?.name ?? taskId;
}

export function autoMachineFor(state, task, worker) {
  if (!task) return null;
  const allowed = allowingMachines(state, task).filter((machine) => staffCanRunMachine(worker, machine));
  if (!allowed.length) return pickMachineForTask(state, task, worker);
  const ranked = [...allowed].sort((a, b) => {
    const da = durationOnMachine(state, task.id, worker, a.id);
    const db = durationOnMachine(state, task.id, worker, b.id);
    return da - db;
  });
  return ranked[0] ?? null;
}

export function defaultBlockMinutes(state, taskId, worker, machineId) {
  const minutes = durationOnMachine(state, taskId, worker, machineId);
  return snapMinutes(minutes || HOUR_INCREMENT * MINUTES_PER_HOUR);
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
  const machine = catalogMachineTitle(block.machineId) || (block.ownMower ? 'own' : '');
  return {
    label,
    machine,
    hours,
    fraction: fraction != null && fraction < 1 - 1e-6 ? fraction : null,
  };
}

export { rangesOverlap };
export { hoursToMinutes, snapHours, snapMinutes };
