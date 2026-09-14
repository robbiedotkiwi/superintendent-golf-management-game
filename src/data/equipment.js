import {
  AUTONOMOUS_CEILING,
  AUTONOMOUS_COST,
  AUTONOMOUS_ID,
  COVERAGE_WALK_BEHIND_GREENS,
  DAMAGING_JOB_REASON,
  FAIRWAY_UNIT_CEILING,
  FAIRWAY_UNIT_COST,
  FAIRWAY_UNIT_ID,
  GREENSMASTER_CEILING,
  GREENSMASTER_COST,
  GREENSMASTER_ID,
  GREENS_ROLLER_COST,
  GREENS_ROLLER_ID,
  GROUNDSMASTER_CEILING,
  GROUNDSMASTER_COST,
  GROUNDSMASTER_ID,
  HOC_SURFACES,
  MACHINE_BRAND_NEXMOW,
  MACHINE_BRAND_SALSCO,
  MACHINE_BRAND_TORO,
  MACHINE_BRAND_VENTRAC,
  MACHINE_CLASS_BY_TYPE,
  MACHINE_ID_ALIASES,
  MACHINE_SUITABILITY,
  MACHINE_TIME_MULT,
  PREMIUM_REEL_CEILING,
  PREMIUM_REEL_COST,
  PREMIUM_REEL_ID,
  REFERENCE_COVERAGE_M2_PER_HR,
  RIDE_ON_REEL_CEILING,
  RIDE_ON_REEL_COST,
  RIDE_ON_REEL_ID,
  ROLLER_GAIN_BONUS,
  SUITABILITY_DAMAGING,
  TYPE_AUTONOMOUS,
  TYPE_AUTONOMOUS_RIDE_ON,
  TYPE_BALL_PICKER,
  TYPE_GREENS_ROLLER,
  TYPE_PREMIUM_RIDE_ON,
  TYPE_RIDE_ON_FAIRWAY,
  TYPE_RIDE_ON_REEL,
  TYPE_RIDE_ON_ROLLER,
  TYPE_ROTARY_RIDE_ON,
  TYPE_ROUGH_UTILITY,
  TYPE_UTILITY,
  TYPE_WALK_BEHIND_REEL,
  VENTRAC_COST,
  VENTRAC_FAIRWAY_CEILING,
  VENTRAC_ID,
  VENTRAC_ROUGH_CEILING,
  WALK_BEHIND_CEILING,
  WALK_BEHIND_COST,
  WALK_BEHIND_ID,
} from './constants.js';
import { PASS_CLASS_BY_CATALOG, PASS_HOURS, PASS_CLASS_ROLLER } from './config.js';

function defaultTimeMult(spec) {
  const coverage = spec.coverage ?? 0;
  if (!coverage) return 1;
  if (spec.rollOnly) return REFERENCE_COVERAGE_M2_PER_HR.roll / coverage;
  const refSurface = spec.surfaces?.greens
    ? 'greens'
    : spec.surfaces?.tees
      ? 'tees'
      : spec.surfaces?.fairways
        ? 'fairways'
        : spec.surfaces?.rough
          ? 'rough'
          : null;
  const ref = refSurface ? REFERENCE_COVERAGE_M2_PER_HR[refSurface] : 0;
  return ref ? ref / coverage : 1;
}

function machine(spec) {
  const surfaces = spec.surfaces ?? {};
  return {
    id: spec.id,
    name: `${spec.brand} ${spec.model}`,
    brand: spec.brand,
    manufacturer: spec.brand,
    model: spec.model,
    type: spec.type,
    cost: spec.cost,
    ownedAtStart: Boolean(spec.ownedAtStart),
    reel: Boolean(spec.reel),
    autonomous: Boolean(spec.autonomous),
    rollOnly: Boolean(spec.rollOnly),
    ballPicker: Boolean(spec.ballPicker),
    utility: Boolean(spec.utility),
    electric: Boolean(spec.electric),
    fuelMult: spec.fuelMult != null ? spec.fuelMult : spec.electric ? 0 : 1,
    coverageM2PerHr: spec.coverage ?? 0,
    timeMult: spec.timeMult ?? defaultTimeMult(spec),
    rollGainBonus: spec.rollGainBonus,
    category: spec.category,
    tier: spec.tier,
    description: spec.description,
    surfaces,
    ceiling: spec.ceiling ?? {},
  };
}

const GREENS_TEES = { greens: true, tees: true, fairways: false, rough: false };
const FAIRWAY_ROUGH = { greens: false, tees: false, fairways: true, rough: true };
const GREENS_FAIRWAY = { greens: true, tees: false, fairways: true, rough: false };
const ROLL_GREENS = { greens: 'roll', tees: false, fairways: false, rough: false };
const NONE = { greens: false, tees: false, fairways: false, rough: false };

export const MACHINES = [
  machine({
    id: GREENSMASTER_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster 1026',
    type: TYPE_WALK_BEHIND_REEL,
    cost: GREENSMASTER_COST,
    ownedAtStart: true,
    reel: true,
    coverage: 2600,
    surfaces: GREENS_TEES,
    ceiling: { greens: GREENSMASTER_CEILING, tees: GREENSMASTER_CEILING },
    category: 'Greens & Tees',
    tier: 'Entry, fixed-head',
    description: "A reliable all-rounder for greens and tees that won't break the budget.",
  }),
  machine({
    id: WALK_BEHIND_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster Flex 2120',
    type: TYPE_WALK_BEHIND_REEL,
    cost: WALK_BEHIND_COST,
    reel: true,
    coverage: 2200,
    surfaces: GREENS_TEES,
    ceiling: { greens: WALK_BEHIND_CEILING, tees: WALK_BEHIND_CEILING },
    category: 'Greens & Tees',
    tier: 'Mid, Flex-head',
    description: 'Follows every bump and slope for a smoother cut on tricky greens.',
  }),
  machine({
    id: 'greensmasterE1026',
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster e1026',
    type: TYPE_WALK_BEHIND_REEL,
    cost: 13500,
    reel: true,
    electric: true,
    coverage: 2600,
    surfaces: GREENS_TEES,
    ceiling: { greens: 72, tees: 72 },
    category: 'Greens & Tees',
    tier: 'Electric',
    description: 'Just as capable as the standard mower, but silent enough to run before sunrise.',
  }),
  machine({
    id: RIDE_ON_REEL_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster 3250-D',
    type: TYPE_RIDE_ON_REEL,
    cost: RIDE_ON_REEL_COST,
    reel: true,
    coverage: 8400,
    surfaces: GREENS_TEES,
    ceiling: { greens: RIDE_ON_REEL_CEILING, tees: RIDE_ON_REEL_CEILING },
    category: 'Greens & Tees',
    tier: 'Entry, ride-on',
    description: 'An easy first step up from walking, built for everyday greens care.',
  }),
  machine({
    id: 'greensmasterTriflex3400',
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster Triflex 3400',
    type: TYPE_RIDE_ON_REEL,
    cost: 52000,
    reel: true,
    coverage: 8400,
    surfaces: GREENS_TEES,
    ceiling: { greens: 92, tees: 92 },
    category: 'Greens & Tees',
    tier: 'Mid, ride-on',
    description: 'The all-round workhorse ride-on that keeps greens smooth and consistent.',
  }),
  machine({
    id: PREMIUM_REEL_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Greensmaster eTriflex 3370',
    type: TYPE_PREMIUM_RIDE_ON,
    cost: PREMIUM_REEL_COST,
    reel: true,
    fuelMult: 0.6,
    coverage: 8400,
    surfaces: GREENS_TEES,
    ceiling: { greens: PREMIUM_REEL_CEILING, tees: PREMIUM_REEL_CEILING },
    category: 'Greens & Tees',
    tier: 'Flagship, hybrid ride-on',
    description: "The top-tier ride-on mower, built to go fully autonomous when you're ready.",
  }),
  machine({
    id: 'reelmaster3555d',
    brand: MACHINE_BRAND_TORO,
    model: 'Reelmaster 3555-D',
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: 78000,
    reel: true,
    coverage: 20100,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 78, rough: 70 },
    category: 'Fairway & Rough',
    tier: 'Entry',
    description: 'Light on the turf and gentle on soft fairways without sacrificing cut quality.',
  }),
  machine({
    id: 'reelmaster5010h',
    brand: MACHINE_BRAND_TORO,
    model: 'Reelmaster 5010-H',
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: 95000,
    reel: true,
    fuelMult: 0.75,
    coverage: 20100,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 82, rough: 72 },
    category: 'Fairway & Rough',
    tier: 'Hybrid',
    description: 'The quietest, most fuel-efficient way to keep fairways in top shape.',
  }),
  machine({
    id: FAIRWAY_UNIT_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Reelmaster 5410-D',
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: FAIRWAY_UNIT_COST,
    reel: true,
    coverage: 22800,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: FAIRWAY_UNIT_CEILING, rough: 80 },
    category: 'Fairway & Rough',
    tier: 'Mid',
    description: 'A dependable, fast fairway mower built for everyday use.',
  }),
  machine({
    id: 'reelmaster5610d',
    brand: MACHINE_BRAND_TORO,
    model: 'Reelmaster 5610-D',
    type: TYPE_RIDE_ON_FAIRWAY,
    cost: 105000,
    reel: true,
    coverage: 22800,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 94, rough: 84 },
    category: 'Fairway & Rough',
    tier: 'Flagship',
    description: 'The most powerful fairway mower in the lineup, built for big, demanding courses.',
  }),
  machine({
    id: GROUNDSMASTER_ID,
    brand: MACHINE_BRAND_TORO,
    model: 'Groundsmaster 3200',
    type: TYPE_ROTARY_RIDE_ON,
    cost: GROUNDSMASTER_COST,
    ownedAtStart: true,
    coverage: 24000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: GROUNDSMASTER_CEILING, rough: GROUNDSMASTER_CEILING },
    category: 'Fairway & Rough',
    tier: 'Entry',
    description: 'A solid entry-level mower for keeping rough and surrounds under control.',
  }),
  machine({
    id: 'groundsmasterE3200',
    brand: MACHINE_BRAND_TORO,
    model: 'Groundsmaster e3200',
    type: TYPE_ROTARY_RIDE_ON,
    cost: 78000,
    electric: true,
    coverage: 24000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 72, rough: 72 },
    category: 'Fairway & Rough',
    tier: 'Entry, electric',
    description: 'All the power of the 3200, with zero noise and zero fuel bills.',
  }),
  machine({
    id: 'groundsmaster4000d',
    brand: MACHINE_BRAND_TORO,
    model: 'Groundsmaster 4000-D',
    type: TYPE_ROTARY_RIDE_ON,
    cost: 135000,
    coverage: 45000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 78, rough: 85 },
    category: 'Fairway & Rough',
    tier: 'Mid, wide-area',
    description: 'Chews through large areas of rough fast without sacrificing quality.',
  }),
  machine({
    id: 'groundsmaster5900',
    brand: MACHINE_BRAND_TORO,
    model: 'Groundsmaster 5900',
    type: TYPE_ROTARY_RIDE_ON,
    cost: 185000,
    coverage: 39000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: 80, rough: 90 },
    category: 'Fairway & Rough',
    tier: 'Flagship',
    description: 'The biggest, fastest rough mower available for large-scale courses.',
  }),
  machine({
    id: VENTRAC_ID,
    brand: MACHINE_BRAND_VENTRAC,
    model: '4500 tractor + MK960 deck',
    type: TYPE_ROUGH_UTILITY,
    cost: VENTRAC_COST,
    coverage: 28000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: VENTRAC_FAIRWAY_CEILING, rough: VENTRAC_ROUGH_CEILING },
    category: 'Fairway & Rough',
    tier: 'Attachment-based',
    description: 'One machine, dozens of jobs - buy the tractor once and keep adding tools.',
  }),
  machine({
    id: GREENS_ROLLER_ID,
    brand: MACHINE_BRAND_SALSCO,
    model: 'Walk-Behind Roller',
    type: TYPE_GREENS_ROLLER,
    cost: GREENS_ROLLER_COST,
    rollOnly: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    coverage: 2200,
    surfaces: ROLL_GREENS,
    category: 'Rollers',
    tier: 'Entry, manual',
    description: 'A simple, affordable way to smooth greens and collars by hand.',
  }),
  machine({
    id: 'greensPro1260',
    brand: MACHINE_BRAND_TORO,
    model: 'GreensPro 1260',
    type: TYPE_RIDE_ON_ROLLER,
    cost: 24000,
    rollOnly: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    coverage: 10800,
    surfaces: ROLL_GREENS,
    category: 'Rollers',
    tier: 'Mid, ride-on',
    description: 'Delivers fast, true rolls that follow every contour of the green.',
  }),
  machine({
    id: 'salscoGgrHp11',
    brand: MACHINE_BRAND_SALSCO,
    model: 'GGR HP11',
    type: TYPE_RIDE_ON_ROLLER,
    cost: 21000,
    rollOnly: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    coverage: 7200,
    surfaces: ROLL_GREENS,
    category: 'Rollers',
    tier: 'Mid, ride-on (alt.)',
    description: 'A dependable ride-on roller that comes ready to tow between greens.',
  }),
  machine({
    id: 'greensProE1700',
    brand: MACHINE_BRAND_TORO,
    model: 'GreensPro e1700',
    type: TYPE_RIDE_ON_ROLLER,
    cost: 34000,
    rollOnly: true,
    electric: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    coverage: 15700,
    surfaces: ROLL_GREENS,
    category: 'Rollers',
    tier: 'Flagship, electric',
    description: 'The widest, quietest roller available - perfect for early morning prep.',
  }),
  machine({
    id: 'salscoTranzFormer',
    brand: MACHINE_BRAND_SALSCO,
    model: 'Tranz-Former',
    type: TYPE_RIDE_ON_ROLLER,
    cost: 29000,
    rollOnly: true,
    rollGainBonus: ROLLER_GAIN_BONUS,
    coverage: 16800,
    surfaces: { greens: 'roll', tees: false, fairways: 'roll', rough: false },
    category: 'Rollers',
    tier: 'Flagship, wide-swath',
    description: 'Rolls fairways and approaches as easily as greens, in a fraction of the time.',
  }),
  machine({
    id: 'etriflex3360Geolink',
    brand: MACHINE_BRAND_TORO,
    model: 'eTriflex 3360 GeoLink',
    type: TYPE_AUTONOMOUS_RIDE_ON,
    cost: 85000,
    reel: true,
    autonomous: true,
    electric: true,
    coverage: 6700,
    surfaces: GREENS_FAIRWAY,
    ceiling: { greens: AUTONOMOUS_CEILING, fairways: AUTONOMOUS_CEILING },
    category: 'Autonomous',
    tier: 'Greens/fairway auto',
    description: 'Mows greens and fairways on its own, with barely any downtime to recharge.',
  }),
  machine({
    id: AUTONOMOUS_ID,
    brand: MACHINE_BRAND_NEXMOW,
    model: 'M2',
    type: TYPE_AUTONOMOUS,
    cost: AUTONOMOUS_COST,
    autonomous: true,
    electric: true,
    coverage: 300,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: AUTONOMOUS_CEILING, rough: AUTONOMOUS_CEILING },
    category: 'Autonomous',
    tier: 'Compact auto',
    description: 'A compact robot mower that quietly keeps small areas tidy around the clock.',
  }),
  machine({
    id: 'turfPro300',
    brand: MACHINE_BRAND_TORO,
    model: 'Turf Pro 300',
    type: TYPE_AUTONOMOUS,
    cost: 28000,
    autonomous: true,
    electric: true,
    coverage: 1000,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: AUTONOMOUS_CEILING, rough: AUTONOMOUS_CEILING },
    category: 'Autonomous',
    tier: 'Small-area auto',
    description: 'Runs longer between charges than anything else in the autonomous range.',
  }),
  machine({
    id: 'turfPro500',
    brand: MACHINE_BRAND_TORO,
    model: 'Turf Pro 500 (+500S)',
    type: TYPE_AUTONOMOUS,
    cost: 36000,
    autonomous: true,
    electric: true,
    coverage: 1200,
    surfaces: FAIRWAY_ROUGH,
    ceiling: { fairways: AUTONOMOUS_CEILING, rough: AUTONOMOUS_CEILING },
    category: 'Autonomous',
    tier: 'Large-area auto',
    description: 'Covers more ground per charge, with an option built for sloped terrain.',
  }),
  machine({
    id: 'rangePro100',
    brand: MACHINE_BRAND_TORO,
    model: 'Range Pro 100',
    type: TYPE_BALL_PICKER,
    cost: 32000,
    autonomous: true,
    ballPicker: true,
    electric: true,
    coverage: 1100,
    surfaces: NONE,
    category: 'Autonomous',
    tier: 'Ball picker',
    description: 'Frees up staff time by collecting range balls all on its own.',
  }),
  machine({
    id: 'workmanGtx',
    brand: MACHINE_BRAND_TORO,
    model: 'Workman GTX (Lithium)',
    type: TYPE_UTILITY,
    cost: 26000,
    utility: true,
    electric: true,
    surfaces: NONE,
    category: 'Utility',
    tier: 'Electric',
    description: "A quiet, low-cost hauler that's perfect for light everyday jobs.",
  }),
  machine({
    id: 'workmanHdx',
    brand: MACHINE_BRAND_TORO,
    model: 'Workman HDX',
    type: TYPE_UTILITY,
    cost: 32000,
    utility: true,
    surfaces: NONE,
    category: 'Utility',
    tier: 'Petrol/diesel',
    description: 'The toughest hauler in the fleet, built for heavy loads and hard work.',
  }),
];

export function canonicalMachineId(id) {
  if (!id) return id;
  return MACHINE_ID_ALIASES[id] ?? id;
}

export function getMachine(id) {
  const resolved = canonicalMachineId(id);
  return MACHINES.find((item) => item.id === resolved);
}

export function machineClass(machine) {
  if (!machine) return null;
  return MACHINE_CLASS_BY_TYPE[machine.type] ?? null;
}

export function primaryMowSurface(machine) {
  if (!machine) return null;
  for (const surface of ['greens', 'tees', 'fairways', 'rough']) {
    if (machine.surfaces?.[surface] === true) return surface;
  }
  if (machine.rollOnly) return 'greens';
  return null;
}

export function coverageFor(machine, surface) {
  if (!machine) return 0;
  return Number(machine.coverageM2PerHr) || 0;
}

export function machineTimeMult(machine, surface) {
  if (!machine) return 1;
  const coverage = coverageFor(machine, surface);
  if (machine.rollOnly) {
    const ref = REFERENCE_COVERAGE_M2_PER_HR.roll || COVERAGE_WALK_BEHIND_GREENS;
    return coverage > 0 ? ref / coverage : machine.timeMult ?? 1;
  }
  const refSurface = surface && REFERENCE_COVERAGE_M2_PER_HR[surface] ? surface : primaryMowSurface(machine);
  const ref = REFERENCE_COVERAGE_M2_PER_HR[refSurface];
  if (coverage > 0 && ref > 0) return ref / coverage;
  const cls = machineClass(machine);
  if (cls && MACHINE_TIME_MULT[cls] != null) return MACHINE_TIME_MULT[cls];
  return 1;
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
  return Boolean(machine) && !machine.rollOnly && !machine.autonomous && !machine.utility && !machine.ballPicker;
}

export function machineAllows(machine, surface, task) {
  if (!machine) return false;
  if (machine.utility || machine.ballPicker) return false;
  if (machine.rollOnly || machineClass(machine) === PASS_CLASS_ROLLER || PASS_CLASS_BY_CATALOG[machineClass(machine)] === PASS_CLASS_ROLLER) {
    return task?.id === 'rollGreens' && surface === 'greens';
  }
  if (task?.id === 'rollGreens') return false;
  if (machine.autonomous) return false;
  const passClass = PASS_CLASS_BY_CATALOG[machineClass(machine)] ?? machineClass(machine);
  const hours = PASS_HOURS[passClass];
  if (hours && surface in hours) {
    const v = hours[surface];
    return v != null && Number.isFinite(v) && v > 0;
  }
  if (HOC_SURFACES.includes(surface)) return false;
  return machine.surfaces?.[surface] === true;
}

export const TURF_DAMAGE_REASON = 'Would damage the turf.';

export function damagingJobReason(machine, surface, surfaceLabel) {
  const name = machine?.name ?? 'That mower';
  return DAMAGING_JOB_REASON(name, surfaceLabel ?? surface);
}

export function isDamagingAssignment(machine, surface) {
  return machineSuitability(machine, surface) === SUITABILITY_DAMAGING;
}
