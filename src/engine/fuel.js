import {
  FUEL_BURN_L_PER_HOUR,
  FUEL_PRICE_PER_L,
  MACHINE_CLASS_ROLLER,
  TYPE_GREENS_ROLLER,
  TYPE_RIDE_ON_ROLLER,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { getMachine, machineClass } from '../data/equipment.js';
import { pickMachineForTask, upgradeModifiers } from './equipment.js';
import { workerById } from './assignment.js';

export function burnLitresPerHour(machine, state) {
  if (!machine) return 0;
  if (machine.electric || machine.fuelMult === 0) return 0;
  const upgradeFuel = state ? upgradeModifiers(state, machine.id).fuelMult : 1;
  if (machine.rollOnly || machine.type === TYPE_GREENS_ROLLER || machine.type === TYPE_RIDE_ON_ROLLER) {
    return (FUEL_BURN_L_PER_HOUR[MACHINE_CLASS_ROLLER] ?? 0) * (machine.fuelMult ?? 1) * upgradeFuel;
  }
  const cls = machineClass(machine);
  const base = (cls && FUEL_BURN_L_PER_HOUR[cls]) || 0;
  return base * (machine.fuelMult ?? 1) * upgradeFuel;
}

export function litresForMinutes(machine, minutes) {
  return burnLitresPerHour(machine) * (Math.max(0, minutes) / 60);
}

export function fuelCost(litres) {
  return Math.round(Number(litres) * FUEL_PRICE_PER_L);
}

export function jobBurnsFuel(task, machine) {
  if (!(task?.mowing || task?.id === 'rollGreens')) return false;
  return burnLitresPerHour(machine) > 0;
}

export function machineForPlanned(state, planned) {
  const task = getTask(planned.taskId);
  if (planned.ownMower) return null;
  if (planned.machineId) return getMachine(planned.machineId);
  return pickMachineForTask(state, task, workerById(state, planned.workerId), undefined, planned.holes);
}

export function consumeJobFuel({ task, machine, minutes, holes }) {
  const list = [...(holes ?? [])];
  if (!jobBurnsFuel(task, machine)) {
    return {
      completedHoles: list,
      runMinutes: minutes,
      stopped: false,
      remainingHoles: [],
      burned: 0,
    };
  }
  return {
    completedHoles: list,
    runMinutes: minutes,
    stopped: false,
    remainingHoles: [],
    burned: litresForMinutes(machine, minutes),
  };
}

export function plannedDayFuel(state) {
  let used = 0;
  for (const planned of state.plannedTasks ?? []) {
    const task = getTask(planned.taskId);
    const machine = machineForPlanned(state, planned);
    if (!jobBurnsFuel(task, machine)) continue;
    used += litresForMinutes(machine, planned.minutes);
  }
  return {
    used,
    cost: fuelCost(used),
    shortfall: 0,
    affected: null,
  };
}

export function replaceBurnSpend(burnedLitres) {
  return fuelCost(burnedLitres);
}
