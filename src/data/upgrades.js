import {
  MACHINE_CLASS_RIDING_FAIRWAY_UNIT,
  MACHINE_CLASS_RIDING_GREENS_TRIPLEX,
  MACHINE_CLASS_ROLLER,
  MACHINE_CLASS_ROUGH_UTILITY,
  MACHINE_CLASS_WALK_BEHIND_REEL,
} from './constants.js';
import { machineClass } from './equipment.js';

export const UPGRADE_COST_LOW = 2500;
export const UPGRADE_COST_MEDIUM = 8000;
export const UPGRADE_COST_HIGH = 18000;

export const UPGRADES = [
  {
    id: 'greensBlade8',
    name: '8-blade reel',
    category: 'Greens & Tees',
    cost: UPGRADE_COST_LOW,
    slot: 'blades',
    classes: [MACHINE_CLASS_WALK_BEHIND_REEL],
    timeMult: 0.8,
    qualityMult: 0.85,
    description: 'Fewer blades: a faster pass with a rougher finish.',
  },
  {
    id: 'greensBlade14',
    name: '14-blade reel',
    category: 'Greens & Tees',
    cost: UPGRADE_COST_LOW,
    slot: 'blades',
    classes: [MACHINE_CLASS_WALK_BEHIND_REEL],
    timeMult: 1.15,
    qualityMult: 1.2,
    description: 'More blades: a finer finish, but a slower pass.',
  },
  {
    id: 'ledLightKit',
    name: 'LED light kit',
    category: 'Greens & Tees',
    cost: UPGRADE_COST_LOW,
    classes: [MACHINE_CLASS_WALK_BEHIND_REEL, MACHINE_CLASS_RIDING_GREENS_TRIPLEX, MACHINE_CLASS_RIDING_FAIRWAY_UNIT, MACHINE_CLASS_ROUGH_UTILITY],
    silentEarly: true,
    description: 'Lets the crew start before dawn without neighbour complaints.',
  },
  {
    id: 'triRollerKit',
    name: 'Tri-roller kit',
    category: 'Greens & Tees',
    cost: UPGRADE_COST_MEDIUM,
    classes: [MACHINE_CLASS_RIDING_GREENS_TRIPLEX],
    enablesRoll: true,
    description: 'Rolls greens from the same ride-on without a separate roller.',
  },
  {
    id: 'rearRollerBrush',
    name: 'Rear roller brush',
    category: 'Greens & Tees',
    cost: UPGRADE_COST_LOW,
    classes: [MACHINE_CLASS_WALK_BEHIND_REEL, MACHINE_CLASS_RIDING_GREENS_TRIPLEX],
    qualityMult: 1.03,
    description: 'Sweeps clippings off the roller for a cleaner cut.',
  },
  {
    id: 'fairwayGroomer',
    name: 'Groomer / verticut attachment',
    category: 'Fairway',
    cost: UPGRADE_COST_LOW,
    classes: [MACHINE_CLASS_RIDING_FAIRWAY_UNIT],
    timeMult: 1.1,
    qualityMult: 1.15,
    description: 'Improves cut quality and grain at the cost of a slower pass.',
  },
  {
    id: 'recyclerKit',
    name: 'Recycler / mulching kit',
    category: 'Rough',
    cost: UPGRADE_COST_LOW,
    classes: [MACHINE_CLASS_ROUGH_UTILITY],
    timeMult: 0.9,
    description: 'Skips the clippings clean-up pass on rough.',
  },
  {
    id: 'rollerWeight',
    name: 'Water-fillable drum weight',
    category: 'Rollers',
    cost: UPGRADE_COST_LOW,
    classes: [MACHINE_CLASS_ROLLER],
    qualityMult: 1.12,
    description: 'More weight for a faster, smoother green.',
  },
];

export function getUpgrade(id) {
  return UPGRADES.find((item) => item.id === id);
}

export function upgradeAppliesTo(upgrade, machine) {
  if (!upgrade || !machine) return false;
  if (upgrade.ids?.includes(machine.id)) return true;
  const cls = machineClass(machine);
  return Boolean(cls && upgrade.classes?.includes(cls));
}

export function upgradesForMachine(machine) {
  return UPGRADES.filter((upgrade) => upgradeAppliesTo(upgrade, machine));
}
