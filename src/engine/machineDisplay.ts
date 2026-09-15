import {
  DELIVERY_SOURCE_LABELS,
  DELIVERY_SOURCE_USED,
  HOURS_NEW,
  MACHINE_STATUS_ARRIVING,
  MACHINE_STATUS_BROKEN,
  MACHINE_STATUS_GRINDING,
  MACHINE_STATUS_LEASED,
  MACHINE_STATUS_NEW,
  MACHINE_STATUS_USED,
} from '../data/constants.ts';
import { getMachine } from '../data/equipment.ts';
import { leaseCost } from './budget.ts';
import { formatMoney } from './format.ts';
import { machineHoursOf } from './equipment.ts';

export function machineTitle(machine) {
  if (!machine) return '';
  if (machine.manufacturer && machine.model) return `${machine.manufacturer} ${machine.model}`;
  return machine.name ?? machine.id ?? '';
}

export function machineTypeLine(machine) {
  return machine?.type ?? '';
}

export function machineStatusLine(state, machineId) {
  if (state.machineBroken?.[machineId]) return MACHINE_STATUS_BROKEN;
  const awayUntil = state.machineAwayUntil?.[machineId];
  if (awayUntil && state.day < awayUntil) return MACHINE_STATUS_GRINDING(awayUntil);
  if ((state.leasedMachines ?? []).includes(machineId)) {
    return MACHINE_STATUS_LEASED(formatMoney(leaseCost(machineId)));
  }
  const hours = machineHoursOf(state, machineId);
  if (hours > HOURS_NEW) return MACHINE_STATUS_USED(hours);
  return MACHINE_STATUS_NEW;
}

export function deliverySourceLabel(source) {
  return DELIVERY_SOURCE_LABELS[source] ?? DELIVERY_SOURCE_LABELS[DELIVERY_SOURCE_USED];
}

export function deliveryDaysRemaining(state, item) {
  return Math.max(0, Number(item.arrivesDay) - state.day);
}

export function catalogMachineTitle(id) {
  return machineTitle(getMachine(id));
}
