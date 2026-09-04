import {
  FUEL_BULK_MIN_LITRES,
  FUEL_BULK_PRICE_PER_L,
  FUEL_BURN_L_PER_HOUR,
  FUEL_PRICE_PER_L,
  FUEL_TANK_CAPACITY,
  MACHINE_CLASS_ROLLER,
  TYPE_GREENS_ROLLER,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { getMachine, machineClass } from '../data/equipment.js';
import { pickMachineForTask } from './equipment.js';
import { setupMinutesFor } from './jobs.js';
import { needsCash, spendCash } from './cash.js';
import { workerById } from './assignment.js';

export function tankRoom(state) {
  return Math.max(0, FUEL_TANK_CAPACITY - (Number(state.fuelLitres) || 0));
}

export function fuelPricePerLitre(litres) {
  return litres >= FUEL_BULK_MIN_LITRES ? FUEL_BULK_PRICE_PER_L : FUEL_PRICE_PER_L;
}

export function fuelCost(litres) {
  return Math.round(Number(litres) * fuelPricePerLitre(litres));
}

export function burnLitresPerHour(machine) {
  if (!machine) return 0;
  if (machine.rollOnly || machine.type === TYPE_GREENS_ROLLER) {
    return FUEL_BURN_L_PER_HOUR[MACHINE_CLASS_ROLLER] ?? 0;
  }
  const cls = machineClass(machine);
  return (cls && FUEL_BURN_L_PER_HOUR[cls]) || 0;
}

export function litresForMinutes(machine, minutes) {
  return burnLitresPerHour(machine) * (Math.max(0, minutes) / 60);
}

export function jobBurnsFuel(task, machine) {
  if (!(task?.mowing || task?.id === 'rollGreens')) return false;
  return burnLitresPerHour(machine) > 0;
}

export function machineForPlanned(state, planned) {
  const task = getTask(planned.taskId);
  if (planned.machineId) return getMachine(planned.machineId);
  return pickMachineForTask(state, task, workerById(state, planned.workerId), undefined, planned.holes);
}

export function canBuyFuel(state, litres) {
  const n = Number(litres);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: 'Pick a volume.' };
  if (n > tankRoom(state) + 1e-9) return { ok: false, reason: 'The tank cannot be overfilled.' };
  const cost = fuelCost(n);
  const cash = needsCash(state, cost);
  if (!cash.ok) return cash;
  return { ok: true, cost, litres: n };
}

export function buyFuel(state, litres) {
  const check = canBuyFuel(state, litres);
  if (!check.ok) return state;
  return {
    ...spendCash(state, check.cost),
    fuelLitres: Math.min(FUEL_TANK_CAPACITY, (Number(state.fuelLitres) || 0) + check.litres),
  };
}

export function consumeJobFuel({ task, machine, minutes, holes, fuelLitres }) {
  const rate = burnLitresPerHour(machine);
  const list = [...(holes ?? [])];
  if (!jobBurnsFuel(task, machine) || rate <= 0) {
    return {
      fuelLitres,
      completedHoles: list,
      runMinutes: minutes,
      stopped: false,
      remainingHoles: [],
      burned: 0,
    };
  }
  const n = Math.max(list.length, 1);
  const setup = setupMinutesFor(task);
  const variable = Math.max(0, minutes - setup);
  const perHole = variable / n;
  if (!list.length) {
    const need = litresForMinutes(machine, minutes);
    if (need > fuelLitres + 1e-9) {
      return {
        fuelLitres: 0,
        completedHoles: [],
        runMinutes: minutes * (fuelLitres / need),
        stopped: true,
        remainingHoles: [],
        burned: fuelLitres,
      };
    }
    return {
      fuelLitres: fuelLitres - need,
      completedHoles: [],
      runMinutes: minutes,
      stopped: false,
      remainingHoles: [],
      burned: need,
    };
  }
  const completedHoles = [];
  let remaining = fuelLitres;
  let runMinutes = 0;
  let burned = 0;
  for (let i = 0; i < list.length; i += 1) {
    const chunk = (i === 0 ? setup : 0) + perHole;
    const need = litresForMinutes(machine, chunk);
    if (need > remaining + 1e-9) {
      return {
        fuelLitres: 0,
        completedHoles,
        runMinutes,
        stopped: true,
        remainingHoles: list.slice(i),
        burned: burned + remaining,
      };
    }
    remaining -= need;
    burned += need;
    runMinutes += chunk;
    completedHoles.push(list[i]);
  }
  return { fuelLitres: remaining, completedHoles, runMinutes, stopped: false, remainingHoles: [], burned };
}

export function plannedDayFuel(state) {
  let used = 0;
  const tank = Number(state.fuelLitres) || 0;
  let affected = null;
  for (const planned of state.plannedTasks ?? []) {
    const task = getTask(planned.taskId);
    const machine = machineForPlanned(state, planned);
    if (!jobBurnsFuel(task, machine)) continue;
    const litres = litresForMinutes(machine, planned.minutes);
    if (!affected && used + litres > tank + 1e-9) {
      affected = {
        taskId: planned.taskId,
        name: task?.name ?? planned.taskId,
        shortfall: used + litres - tank,
        need: litres,
      };
    }
    used += litres;
  }
  return {
    used,
    tank,
    shortfall: Math.max(0, used - tank),
    affected,
  };
}

export function replaceBurnSpend(burnedLitres) {
  return Math.round(burnedLitres * FUEL_PRICE_PER_L);
}
