import {
  AUTONOMOUS_CEILING,
  AUTONOMOUS_COST,
  DAMAGING_JOB_REASON,
  FAIRWAY_UNIT_CEILING,
  FAIRWAY_UNIT_COST,
  FAIRWAY_UNIT_TIME_MULT,
  GREENSMASTER_CEILING,
  GREENSMASTER_COST,
  GREENSMASTER_ID,
  GREENSMASTER_TIME_MULT,
  GREENS_ROLLER_COST,
  GREENS_ROLLER_TIME_MULT,
  HOC_SURFACES,
  MACHINE_BRAND_NEXMOW,
  MACHINE_BRAND_SALSCO,
  MACHINE_BRAND_TORO,
  MACHINE_BRAND_VENTRAC,
  MACHINE_CLASS_BY_TYPE,
  MACHINE_SUITABILITY,
  MACHINE_TIME_MULT,
  MODEL_AUTONOMOUS,
  MODEL_FAIRWAY_UNIT,
  MODEL_GREENSMASTER,
  MODEL_GREENS_ROLLER,
  MODEL_PREMIUM_REEL,
  MODEL_PUSH_ROTARY,
  MODEL_REELMASTER,
  MODEL_RIDE_ON,
  MODEL_VENTRAC,
  MODEL_WALK_BEHIND,
  PREMIUM_REEL_CEILING,
  PREMIUM_REEL_COST,
  PREMIUM_REEL_TIME_MULT,
  PUSH_ROTARY_CEILING,
  PUSH_ROTARY_COST,
  PUSH_ROTARY_ID,
  PUSH_ROTARY_TIME_MULT,
  REELMASTER_CEILING,
  REELMASTER_COST,
  REELMASTER_ID,
  REELMASTER_TIME_MULT,
  RIDE_ON_REEL_CEILING,
  RIDE_ON_REEL_COST,
  RIDE_ON_REEL_TIME_MULT,
  ROLLER_GAIN_BONUS,
  SUITABILITY_DAMAGING,
  TYPE_AUTONOMOUS,
  TYPE_GREENS_ROLLER,
  TYPE_PREMIUM_RIDE_ON,
  TYPE_PUSH_ROTARY,
  TYPE_RIDE_ON_FAIRWAY,
  TYPE_RIDE_ON_REEL,
  TYPE_ROUGH_UTILITY,
  TYPE_WALK_BEHIND_REEL,
  VENTRAC_COST,
  VENTRAC_FAIRWAY_CEILING,
  VENTRAC_ROUGH_CEILING,
  VENTRAC_TIME_MULT,
  WALK_BEHIND_CEILING,
  WALK_BEHIND_COST,
  WALK_BEHIND_TIME_MULT,
} from './constants.js';

export const MACHINES = [
  {
    id: PUSH_ROTARY_ID,
    name: `${MACHINE_BRAND_TORO} ${MODEL_PUSH_ROTARY}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_PUSH_ROTARY,
    type: TYPE_PUSH_ROTARY,
    cost: PUSH_ROTARY_COST,
    ownedAtStart: false,
    reel: false,
    autonomous: false,
    rollOnly: false,
    timeMult: PUSH_ROTARY_TIME_MULT,
    surfaces: { greens: true, tees: true, fairways: true, rough: true },
    ceiling: {
      greens: PUSH_ROTARY_CEILING,
      tees: PUSH_ROTARY_CEILING,
      fairways: PUSH_ROTARY_CEILING,
      rough: PUSH_ROTARY_CEILING,
    },
  },
  {
    id: GREENSMASTER_ID,
    name: `${MACHINE_BRAND_TORO} ${MODEL_GREENSMASTER}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_GREENSMASTER,
    type: TYPE_WALK_BEHIND_REEL,
    cost: GREENSMASTER_COST,
    ownedAtStart: true,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: GREENSMASTER_TIME_MULT,
    surfaces: { greens: true, tees: true, fairways: false, rough: false },
    ceiling: { greens: GREENSMASTER_CEILING, tees: GREENSMASTER_CEILING },
  },
  {
    id: REELMASTER_ID,
    name: `${MACHINE_BRAND_TORO} ${MODEL_REELMASTER}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_REELMASTER,
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: REELMASTER_COST,
    ownedAtStart: true,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: REELMASTER_TIME_MULT,
    surfaces: { greens: false, tees: false, fairways: true, rough: true },
    ceiling: { fairways: REELMASTER_CEILING, rough: REELMASTER_CEILING },
  },
  {
    id: 'walkBehindReel',
    name: `${MACHINE_BRAND_TORO} ${MODEL_WALK_BEHIND}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_WALK_BEHIND,
    type: TYPE_WALK_BEHIND_REEL,
    cost: WALK_BEHIND_COST,
    ownedAtStart: false,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: WALK_BEHIND_TIME_MULT,
    surfaces: { greens: true, tees: true, fairways: false, rough: false },
    ceiling: { greens: WALK_BEHIND_CEILING, tees: WALK_BEHIND_CEILING },
  },
  {
    id: 'rideOnReel',
    name: `${MACHINE_BRAND_TORO} ${MODEL_RIDE_ON}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_RIDE_ON,
    type: TYPE_RIDE_ON_REEL,
    cost: RIDE_ON_REEL_COST,
    ownedAtStart: false,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: RIDE_ON_REEL_TIME_MULT,
    surfaces: { greens: true, tees: true, fairways: true, rough: false },
    ceiling: {
      greens: RIDE_ON_REEL_CEILING,
      tees: RIDE_ON_REEL_CEILING,
      fairways: RIDE_ON_REEL_CEILING,
    },
  },
  {
    id: 'premiumRideOn',
    name: `${MACHINE_BRAND_TORO} ${MODEL_PREMIUM_REEL}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_PREMIUM_REEL,
    type: TYPE_PREMIUM_RIDE_ON,
    cost: PREMIUM_REEL_COST,
    ownedAtStart: false,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: PREMIUM_REEL_TIME_MULT,
    surfaces: { greens: true, tees: true, fairways: true, rough: false },
    ceiling: {
      greens: PREMIUM_REEL_CEILING,
      tees: PREMIUM_REEL_CEILING,
      fairways: PREMIUM_REEL_CEILING,
    },
  },
  {
    id: 'fairwayUnit',
    name: `${MACHINE_BRAND_TORO} ${MODEL_FAIRWAY_UNIT}`,
    brand: MACHINE_BRAND_TORO,
    manufacturer: MACHINE_BRAND_TORO,
    model: MODEL_FAIRWAY_UNIT,
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: FAIRWAY_UNIT_COST,
    ownedAtStart: false,
    reel: true,
    autonomous: false,
    rollOnly: false,
    timeMult: FAIRWAY_UNIT_TIME_MULT,
    surfaces: { greens: false, tees: false, fairways: true, rough: true },
    ceiling: { fairways: FAIRWAY_UNIT_CEILING, rough: FAIRWAY_UNIT_CEILING },
  },
  {
    id: 'ventrac',
    name: `${MACHINE_BRAND_VENTRAC} ${MODEL_VENTRAC}`,
    brand: MACHINE_BRAND_VENTRAC,
    manufacturer: MACHINE_BRAND_VENTRAC,
    model: MODEL_VENTRAC,
    type: TYPE_ROUGH_UTILITY,
    cost: VENTRAC_COST,
    ownedAtStart: false,
    reel: false,
    autonomous: false,
    rollOnly: false,
    timeMult: VENTRAC_TIME_MULT,
    surfaces: { greens: false, tees: false, fairways: true, rough: true },
    ceiling: { fairways: VENTRAC_FAIRWAY_CEILING, rough: VENTRAC_ROUGH_CEILING },
  },
  {
    id: 'greensRoller',
    name: `${MACHINE_BRAND_SALSCO} ${MODEL_GREENS_ROLLER}`,
    brand: MACHINE_BRAND_SALSCO,
    manufacturer: MACHINE_BRAND_SALSCO,
    model: MODEL_GREENS_ROLLER,
    type: TYPE_GREENS_ROLLER,
    cost: GREENS_ROLLER_COST,
    ownedAtStart: false,
    reel: false,
    autonomous: false,
    rollOnly: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    timeMult: GREENS_ROLLER_TIME_MULT,
    surfaces: { greens: 'roll' },
    ceiling: {},
  },
  {
    id: 'autonomousMower',
    name: `${MACHINE_BRAND_NEXMOW} ${MODEL_AUTONOMOUS}`,
    brand: MACHINE_BRAND_NEXMOW,
    manufacturer: MACHINE_BRAND_NEXMOW,
    model: MODEL_AUTONOMOUS,
    type: TYPE_AUTONOMOUS,
    cost: AUTONOMOUS_COST,
    ownedAtStart: false,
    reel: false,
    autonomous: true,
    rollOnly: false,
    timeMult: 0,
    surfaces: { greens: false, tees: false, fairways: true, rough: true },
    ceiling: { fairways: AUTONOMOUS_CEILING, rough: AUTONOMOUS_CEILING },
  },
];

export function getMachine(id) {
  return MACHINES.find((machine) => machine.id === id);
}

export function machineClass(machine) {
  if (!machine) return null;
  return MACHINE_CLASS_BY_TYPE[machine.type] ?? null;
}

export function machineTimeMult(machine) {
  if (!machine) return 1;
  const cls = machineClass(machine);
  if (cls && MACHINE_TIME_MULT[cls] != null) return MACHINE_TIME_MULT[cls];
  return machine.timeMult ?? 1;
}

export function machineSuitability(machine, surface) {
  const cls = machineClass(machine);
  if (!cls || !surface) return null;
  return MACHINE_SUITABILITY[cls]?.[surface] ?? null;
}

export function machineNativeCeiling(machine, surface) {
  if (!machine) return 0;
  const listed = machine.ceiling?.[surface];
  if (listed != null) return listed;
  const values = Object.values(machine.ceiling ?? {}).filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : 0;
}

export function machineCanMow(machine) {
  return Boolean(machine) && !machine.rollOnly && !machine.autonomous;
}

export function machineAllows(machine, surface, task) {
  if (!machine) return false;
  if (machine.rollOnly) return task?.id === 'rollGreens';
  if (task?.id === 'rollGreens') return false;
  if (machine.autonomous) return false;
  if (HOC_SURFACES.includes(surface)) return true;
  return machine.surfaces[surface] === true;
}

export const TURF_DAMAGE_REASON = 'Would damage the turf.';

export function damagingJobReason(machine, surface, surfaceLabel) {
  const name = machine?.name ?? 'That mower';
  return DAMAGING_JOB_REASON(name, surfaceLabel ?? surface);
}

export function isDamagingAssignment(machine, surface) {
  return machineSuitability(machine, surface) === SUITABILITY_DAMAGING;
}
