import {
  FERTILISER_CEILING_BONUS,
  HOC_CEILING_BONUS,
  TASK_MINUTES,
  EXTRA_BUNKER_CEILING_BONUS,
  NEW_TEES_CEILING_BONUS,
  AUTO_INTERRUPT_MAX_COUNT,
  AUTO_INTERRUPT_MAX_MINUTES,
  AUTO_INTERRUPT_MIN_COUNT,
  AUTO_INTERRUPT_MIN_MINUTES,
  AUTO_PICK_MINUTES,
  BALL_PICK_MINUTES,
  BREAKDOWN_BASE,
  BREAKDOWN_PER_WEAR,
  CONDITION_LOSS_PER_USE,
  CONDITION_MAX,
  CONDITION_MIN,
  CONDITION_TIME_PENALTY_PER_POINT,
  DAYS_PER_WEEK,
  FOLEY_GRINDER_COST,
  FOLEY_GRIND_MINUTES,
  GRIND_AWAY_COST,
  GRIND_AWAY_DAYS,
  MACHINE_DAILY_MINUTES,
  MIGRATED_MACHINE_CONDITION,
  NEW_PURCHASE_CONDITION,
  PLAYER_ID,
  QUALITY_MAX,
  REPAIR_MINUTES,
  STARTING_MACHINE_CONDITION,
  STARTING_MACHINE_ID,
  WEAR_GAIN_PENALTY,
  WEAR_MAX,
  WEAR_MECHANIC_FACTOR,
  WEAR_PER_USE,
  WEAR_THRESHOLD,
} from '../data/constants.js';
import { getMachine, MACHINES, machineAllows, TURF_DAMAGE_REASON } from '../data/equipment.js';
import { getTask, taskUsesMachine } from '../data/tasks.js';
import { hocFactor, mowingMinutes } from './mowing.js';
import { handWaterMinutes } from './moisture.js';
import { taskTimeMultiplier } from './projects.js';
import { bumpCapitalSpent } from './history.js';
import { workerTimeMultiplier } from './skills.js';
import { hasMechanic } from './staff.js';
import { createRng } from './rng.js';

function remainingMinutes(state) {
  return state.workers.reduce((total, worker) => total + (worker.minutesToday - worker.minutesUsed), 0);
}

export function clampCondition(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MIGRATED_MACHINE_CONDITION;
  return Math.min(CONDITION_MAX, Math.max(CONDITION_MIN, n));
}

export function conditionTimeMultiplier(condition) {
  return 1 + (CONDITION_MAX - clampCondition(condition)) * CONDITION_TIME_PENALTY_PER_POINT;
}

export function conditionOf(state, machineId) {
  const stored = state.machineCondition?.[machineId];
  if (stored == null) return STARTING_MACHINE_CONDITION;
  return clampCondition(stored);
}

export function machineDailyMinutesOf(state, machineId) {
  const stored = state.machineDailyMinutes?.[machineId];
  if (stored == null || !Number.isFinite(Number(stored))) return MACHINE_DAILY_MINUTES;
  return Math.max(0, Math.round(Number(stored)));
}

export function migrateMachineMaps(state) {
  const ownedMachines = state.ownedMachines ?? [STARTING_MACHINE_ID];
  const machineCondition = { ...(state.machineCondition ?? {}) };
  const machineDailyMinutes = { ...(state.machineDailyMinutes ?? {}) };
  for (const id of ownedMachines) {
    if (machineCondition[id] == null) machineCondition[id] = MIGRATED_MACHINE_CONDITION;
    else machineCondition[id] = clampCondition(machineCondition[id]);
    if (machineDailyMinutes[id] == null || !Number.isFinite(Number(machineDailyMinutes[id]))) {
      machineDailyMinutes[id] = MACHINE_DAILY_MINUTES;
    } else {
      machineDailyMinutes[id] = Math.max(0, Math.round(Number(machineDailyMinutes[id])));
    }
  }
  return { ownedMachines, machineCondition, machineDailyMinutes };
}

export function stampOwnedMachine(state, machineId, condition = NEW_PURCHASE_CONDITION) {
  return {
    ownedMachines: [...state.ownedMachines, machineId],
    machineWear: { ...state.machineWear, [machineId]: 0 },
    machineCondition: { ...(state.machineCondition ?? {}), [machineId]: clampCondition(condition) },
    machineDailyMinutes: { ...(state.machineDailyMinutes ?? {}), [machineId]: MACHINE_DAILY_MINUTES },
  };
}

export function isMachineAvailable(state, machineId) {
  if (!state.ownedMachines.includes(machineId)) return false;
  if (state.machineBroken[machineId]) return false;
  const awayUntil = state.machineAwayUntil[machineId];
  if (awayUntil && state.day < awayUntil) return false;
  return true;
}

export function ownedMachineList(state) {
  return state.ownedMachines.map(getMachine).filter(Boolean);
}

export const NO_MACHINE_REASON = 'No machine available. Check the shed.';
export const MACHINE_BOOKED_REASON = 'That mower is booked for the day.';

export function claimedMinutesByMachine(state, ignoreTaskId) {
  const claimed = {};
  for (const planned of state.plannedTasks ?? []) {
    if (ignoreTaskId && planned.taskId === ignoreTaskId) continue;
    if (!planned.machineId) continue;
    claimed[planned.machineId] = (claimed[planned.machineId] ?? 0) + planned.minutes;
  }
  return claimed;
}

export function machineMinutesRemaining(state, machineId, ignoreTaskId) {
  const cap = machineDailyMinutesOf(state, machineId);
  const claimed = claimedMinutesByMachine(state, ignoreTaskId)[machineId] ?? 0;
  return cap - claimed;
}

export function allowingMachines(state, task) {
  if (!task?.surface) return [];
  return ownedMachineList(state).filter(
    (machine) => isMachineAvailable(state, machine.id) && machineAllows(machine, task.surface, task),
  );
}

export function durationOnMachine(state, taskId, worker, machineId) {
  const task = getTask(taskId);
  const base =
    taskId === 'pickBalls'
      ? state.hasAutoPicker
        ? AUTO_PICK_MINUTES
        : BALL_PICK_MINUTES
      : taskId === 'handWater'
        ? handWaterMinutes(state)
        : task?.mowing
          ? mowingMinutes(state, taskId)
          : TASK_MINUTES[taskId];
  const withMachine =
    taskId === 'pickBalls'
      ? base
      : Math.round(base * (machineId ? machineMultiplierFor(state, machineId) : 1) * taskTimeMultiplier(state, task));
  if (!worker) return withMachine;
  return Math.round(withMachine * workerTimeMultiplier(worker));
}

export function pickMachine(state, task, options = {}) {
  const { ignoreTaskId, minutesNeeded } = options;
  const candidates = allowingMachines(state, task);
  if (!candidates.length) return null;
  const ranked = [...candidates].sort(
    (a, b) => machineMultiplierFor(state, a.id) - machineMultiplierFor(state, b.id),
  );
  if (!minutesNeeded) return ranked[0];
  for (const machine of ranked) {
    const need = minutesNeeded(machine.id);
    if (machineMinutesRemaining(state, machine.id, ignoreTaskId) >= need) return machine;
  }
  return null;
}

export function pickMachineForTask(state, task, worker, ignoreTaskId) {
  if (!taskUsesMachine(task)) return pickMachine(state, task, { ignoreTaskId });
  return pickMachine(state, task, {
    ignoreTaskId,
    minutesNeeded: (machineId) => durationOnMachine(state, task.id, worker, machineId),
  });
}

export function machinePlanCheck(state, task, worker) {
  if (!task?.mowing) {
    return { ok: true, machine: taskUsesMachine(task) ? pickMachineForTask(state, task, worker) : null };
  }
  if (!allowingMachines(state, task).length) {
    return { ok: false, reason: NO_MACHINE_REASON, machine: null };
  }
  const machine = pickMachineForTask(state, task, worker);
  if (!machine) return { ok: false, reason: MACHINE_BOOKED_REASON, machine: null };
  return { ok: true, machine };
}

export function machineMultiplierFor(state, machineId) {
  const machine = getMachine(machineId);
  if (!machine) return 1;
  return machine.timeMult * conditionTimeMultiplier(conditionOf(state, machineId));
}

export function machineTimeMultiplier(state, task) {
  const machine = pickMachine(state, task);
  if (!machine) return 1;
  return machineMultiplierFor(state, machine.id);
}

export function surfaceCeiling(state, surface) {
  let best = 0;
  for (const machine of ownedMachineList(state)) {
    if (machine.rollOnly || machine.autonomous) continue;
    if (!machine.surfaces[surface]) continue;
    const value = machine.ceiling[surface];
    if (value > best) best = value;
  }
  return (best || QUALITY_MAX) + fertiliserBonus(state, surface) + projectCeilingBonus(state, surface) + hocCeilingBonus(state, surface);
}

function hocCeilingBonus(state, surface) {
  const height = state.surfaces?.[surface]?.hoc;
  if (height == null) return 0;
  return HOC_CEILING_BONUS(hocFactor(surface, height));
}

function fertiliserBonus(state, surface) {
  if ((state.fertiliserUntil?.[surface] ?? 0) > state.day) return FERTILISER_CEILING_BONUS;
  return 0;
}

function projectCeilingBonus(state, surface) {
  if (surface === 'bunkers' && state.hasExtraBunkers) return EXTRA_BUNKER_CEILING_BONUS;
  if (surface === 'tees' && state.hasNewTees) return NEW_TEES_CEILING_BONUS;
  return 0;
}

export function ineligibleMachines(state, task) {
  if (!task?.surface) return [];
  return ownedMachineList(state)
    .filter((machine) => !machineAllows(machine, task.surface, task) && machine.surfaces[task.surface] === false)
    .map((machine) => ({
      machine,
      reason: TURF_DAMAGE_REASON,
    }));
}

export function machineDurationForTask(state, taskId, machineId) {
  const task = getTask(taskId);
  const id = machineId ?? (taskUsesMachine(task) ? pickMachineForTask(state, task)?.id : null);
  return durationOnMachine(state, taskId, null, id);
}

export function wearMultiplier(state, machineId) {
  const wear = state.machineWear[machineId] ?? 0;
  if (wear > WEAR_THRESHOLD) return 1 - WEAR_GAIN_PENALTY;
  return 1;
}

export function ownsAutonomous(state) {
  return isMachineAvailable(state, 'autonomousMower') || state.ownedMachines.includes('autonomousMower');
}

export function autonomousReady(state) {
  return state.ownedMachines.includes('autonomousMower') && isMachineAvailable(state, 'autonomousMower');
}

export function canBuyMachine(state, machineId) {
  const machine = getMachine(machineId);
  if (!machine || machine.ownedAtStart) return { ok: false, reason: 'Already in the shed.' };
  if (state.ownedMachines.includes(machineId)) return { ok: false, reason: 'Already owned.' };
  if ((state.capitalBudget ?? 0) < machine.cost) {
    return { ok: false, reason: `Needs ${machine.cost} capital, only ${state.capitalBudget ?? 0} posted.` };
  }
  return { ok: true };
}

export function canBuyFoley(state) {
  if (state.hasFoleyGrinder) return { ok: false, reason: 'Already installed.' };
  if ((state.capitalBudget ?? 0) < FOLEY_GRINDER_COST) {
    return { ok: false, reason: `Needs ${FOLEY_GRINDER_COST} capital, only ${state.capitalBudget ?? 0} posted.` };
  }
  return { ok: true };
}

export function canSendGrind(state, machineId) {
  const machine = getMachine(machineId);
  if (!machine?.reel) return { ok: false, reason: 'Not a reel machine.' };
  if (!isMachineAvailable(state, machineId) && !state.machineBroken[machineId]) {
    return { ok: false, reason: 'That unit is not here.' };
  }
  if ((state.maintenanceBudget ?? 0) < GRIND_AWAY_COST) {
    return { ok: false, reason: `Needs ${GRIND_AWAY_COST} from maintenance.` };
  }
  return { ok: true };
}

export function canGrindInHouse(state, machineId) {
  if (!state.hasFoleyGrinder) return { ok: false, reason: 'No Foley grinder in the shed.' };
  const machine = getMachine(machineId);
  if (!machine?.reel) return { ok: false, reason: 'Not a reel machine.' };
  if (!state.ownedMachines.includes(machineId)) return { ok: false, reason: 'Not owned.' };
  if (state.machineAwayUntil[machineId] && state.day < state.machineAwayUntil[machineId]) {
    return { ok: false, reason: 'Still away for grinding.' };
  }
  if (remainingMinutes(state) < FOLEY_GRIND_MINUTES) {
    return { ok: false, reason: `Needs ${FOLEY_GRIND_MINUTES} min.` };
  }
  return { ok: true };
}

export function canRepair(state, machineId) {
  if (!state.machineBroken[machineId]) return { ok: false, reason: 'Not broken.' };
  const cost = hasMechanic(state) ? 0 : REPAIR_MINUTES;
  if (remainingMinutes(state) < cost) {
    return { ok: false, reason: `Needs ${cost} min.` };
  }
  return { ok: true, minutes: cost };
}

export function spendWorkerMinutes(state, minutes) {
  const worker = state.workers.find((item) => item.id === PLAYER_ID) ?? state.workers[0];
  return {
    ...state,
    workers: state.workers.map((item) =>
      item.id === worker.id ? { ...item, minutesUsed: item.minutesUsed + minutes } : item,
    ),
  };
}

export function recomputePlannedMinutes(state) {
  const oldByWorker = {};
  for (const planned of state.plannedTasks) {
    oldByWorker[planned.workerId] = (oldByWorker[planned.workerId] ?? 0) + planned.minutes;
  }
  const plannedTasks = [];
  for (const planned of state.plannedTasks) {
    const task = getTask(planned.taskId);
    const worker = state.workers.find((item) => item.id === planned.workerId);
    const probe = { ...state, plannedTasks };
    let machineId = null;
    if (task?.mowing) {
      const machine = pickMachineForTask(probe, task, worker);
      if (!machine) continue;
      machineId = machine.id;
    } else if (taskUsesMachine(task)) {
      machineId = pickMachineForTask(probe, task, worker)?.id ?? null;
    }
    const minutes = durationOnMachine(probe, planned.taskId, worker, machineId);
    plannedTasks.push({ ...planned, minutes, machineId });
  }
  const newByWorker = {};
  for (const planned of plannedTasks) {
    newByWorker[planned.workerId] = (newByWorker[planned.workerId] ?? 0) + planned.minutes;
  }
  return {
    ...state,
    plannedTasks,
    workers: state.workers.map((worker) => {
      const extra = worker.minutesUsed - (oldByWorker[worker.id] ?? 0);
      return { ...worker, minutesUsed: extra + (newByWorker[worker.id] ?? 0) };
    }),
  };
}

export function buyMachine(state, machineId) {
  const check = canBuyMachine(state, machineId);
  if (!check.ok) return state;
  const machine = getMachine(machineId);
  let next = {
    ...state,
    capitalBudget: state.capitalBudget - machine.cost,
    ...stampOwnedMachine(state, machineId, NEW_PURCHASE_CONDITION),
  };
  if (machine.autonomous) {
    const rng = createRng(next.rngSeed);
    const scheduled = ensureAutoWeek(next, rng, true);
    next = { ...scheduled.state, rngSeed: rng.seed };
  }
  next = bumpCapitalSpent(next, machine.cost);
  return recomputePlannedMinutes(next);
}

export function buyFoley(state) {
  const check = canBuyFoley(state);
  if (!check.ok) return state;
  return bumpCapitalSpent(
    { ...state, capitalBudget: state.capitalBudget - FOLEY_GRINDER_COST, hasFoleyGrinder: true },
    FOLEY_GRINDER_COST,
  );
}

export function sendForGrind(state, machineId) {
  const check = canSendGrind(state, machineId);
  if (!check.ok) return state;
  const next = {
    ...state,
    maintenanceBudget: state.maintenanceBudget - GRIND_AWAY_COST,
    machineAwayUntil: { ...state.machineAwayUntil, [machineId]: state.day + GRIND_AWAY_DAYS },
    machineWear: { ...state.machineWear, [machineId]: 0 },
    machineBroken: { ...state.machineBroken, [machineId]: false },
  };
  return recomputePlannedMinutes(next);
}

export function grindInHouse(state, machineId) {
  const check = canGrindInHouse(state, machineId);
  if (!check.ok) return state;
  const spent = spendWorkerMinutes(state, FOLEY_GRIND_MINUTES);
  return {
    ...spent,
    machineWear: { ...spent.machineWear, [machineId]: 0 },
  };
}

export function repairMachine(state, machineId) {
  const check = canRepair(state, machineId);
  if (!check.ok) return state;
  const spent = spendWorkerMinutes(state, check.minutes ?? 0);
  const next = {
    ...spent,
    machineBroken: { ...spent.machineBroken, [machineId]: false },
  };
  return recomputePlannedMinutes(next);
}

export function breakdownChance(wear) {
  return BREAKDOWN_BASE + wear * BREAKDOWN_PER_WEAR;
}

export function rollBreakdowns(state, usedIds, rng) {
  const machineBroken = { ...state.machineBroken };
  const breakdowns = [];
  for (const id of usedIds) {
    const wear = state.machineWear[id] ?? 0;
    if (rng.next() < breakdownChance(wear)) {
      machineBroken[id] = true;
      breakdowns.push(id);
    }
  }
  return { machineBroken, breakdowns };
}

export function applyWear(state, usedIds) {
  const machineWear = { ...state.machineWear };
  for (const id of usedIds) {
    const machine = getMachine(id);
    if (!machine?.reel) continue;
    const step = hasMechanic(state) ? WEAR_PER_USE * WEAR_MECHANIC_FACTOR : WEAR_PER_USE;
    machineWear[id] = Math.min(WEAR_MAX, (machineWear[id] ?? 0) + step);
  }
  return machineWear;
}

export function applyConditionLoss(state, usedIds) {
  const machineCondition = { ...(state.machineCondition ?? {}) };
  for (const id of usedIds) {
    const current = conditionOf(state, id);
    machineCondition[id] = clampCondition(current - CONDITION_LOSS_PER_USE);
  }
  return machineCondition;
}

export function ensureAutoWeek(state, rng, force = false) {
  const weekStart = state.day - ((state.day - 1) % DAYS_PER_WEEK);
  if (!force && state.autoWeek?.weekStart === weekStart) return { state, rng };
  if (!state.ownedMachines.includes('autonomousMower')) {
    return { state: { ...state, autoWeek: { weekStart, hits: [] } }, rng };
  }
  const span = AUTO_INTERRUPT_MAX_COUNT - AUTO_INTERRUPT_MIN_COUNT;
  const count = AUTO_INTERRUPT_MIN_COUNT + Math.floor(rng.next() * (span + 1));
  const hits = [];
  const usedOffsets = new Set();
  for (let i = 0; i < count; i += 1) {
    let offset = Math.floor(rng.next() * DAYS_PER_WEEK);
    let guard = 0;
    while (usedOffsets.has(offset) && guard < DAYS_PER_WEEK) {
      offset = (offset + 1) % DAYS_PER_WEEK;
      guard += 1;
    }
    usedOffsets.add(offset);
    const spanMin = AUTO_INTERRUPT_MAX_MINUTES - AUTO_INTERRUPT_MIN_MINUTES;
    const minutes = AUTO_INTERRUPT_MIN_MINUTES + Math.floor(rng.next() * (spanMin + 1));
    hits.push({ day: weekStart + offset, minutes });
  }
  return { state: { ...state, autoWeek: { weekStart, hits } }, rng };
}

export function interruptionMinutesForDay(state) {
  if (!state.ownedMachines.includes('autonomousMower')) return 0;
  return (state.autoWeek?.hits ?? []).filter((hit) => hit.day === state.day).reduce((sum, hit) => sum + hit.minutes, 0);
}

export { MACHINES, getMachine, TURF_DAMAGE_REASON };
