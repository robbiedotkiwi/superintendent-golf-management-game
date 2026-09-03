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
  BREAKDOWN_BASE,
  BREAKDOWN_PER_WEAR,
  DAYS_PER_WEEK,
  FOLEY_GRINDER_COST,
  FOLEY_GRIND_MINUTES,
  GRIND_AWAY_COST,
  GRIND_AWAY_DAYS,
  PLAYER_ID,
  QUALITY_MAX,
  REPAIR_MINUTES,
  STARTING_MACHINE_ID,
  WEAR_GAIN_PENALTY,
  WEAR_MAX,
  WEAR_MECHANIC_FACTOR,
  WEAR_PER_USE,
  WEAR_THRESHOLD,
} from '../data/constants.js';
import { getMachine, MACHINES, machineAllows, TURF_DAMAGE_REASON } from '../data/equipment.js';
import { getTask } from '../data/tasks.js';
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

export function pickMachine(state, task) {
  if (!task?.surface) return null;
  const candidates = ownedMachineList(state).filter(
    (machine) => isMachineAvailable(state, machine.id) && machineAllows(machine, task.surface, task),
  );
  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.timeMult - b.timeMult)[0];
}

export function machineTimeMultiplier(state, task) {
  const machine = pickMachine(state, task);
  if (!machine) return 1;
  return machine.timeMult;
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

export function machineDurationForTask(state, taskId) {
  const task = getTask(taskId);
  const base = taskId === 'handWater'
    ? handWaterMinutes(state)
    : task?.mowing
      ? mowingMinutes(state, taskId)
      : TASK_MINUTES[taskId];
  return Math.round(base * machineTimeMultiplier(state, task) * taskTimeMultiplier(state, task));
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
  const plannedTasks = state.plannedTasks.map((planned) => {
    const worker = state.workers.find((item) => item.id === planned.workerId);
    const base = machineDurationForTask(state, planned.taskId);
    const minutes = worker ? Math.round(base * workerTimeMultiplier(worker)) : base;
    return { ...planned, minutes };
  });
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
    ownedMachines: [...state.ownedMachines, machineId],
    machineWear: { ...state.machineWear, [machineId]: 0 },
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
