import {
  CHECK_MOISTURE_LABEL,
  FERTILISER_BRAND,
  FERTILISER_MATERIALS_COST,
  POND_DOSE_COST,
  POND_DOSING_LABEL,
  POND_DOSE_TASK,
  POND_RESCUE_COST,
  POND_RESCUE_LABEL,
  POND_RESCUE_TASK,
  ROLL_GREENS_LABEL,
  ROLL_GREENS_TASK,
  SPRAY_MATERIALS_COST,
  SURFACE_KEYS,
  TASK_MINUTES,
  TOURNAMENT_PREP_DOUBLE_CUT_BONUS,
  TOURNAMENT_PREP_EDGE_BONUS,
  TOURNAMENT_PREP_ROLL_BONUS,
} from './constants.js';
import {
  MACHINE_HIRE_COST_BY_CLASS,
  TASK_MACHINE_CLASS_CORER,
  TASK_MACHINE_CLASS_MOWER,
  TASK_MACHINE_CLASS_ROLLER,
  TASK_MACHINE_CLASS_SPRAYER,
  TASK_MACHINE_REQUIRE_CLASS,
  TASK_MACHINE_REQUIRE_NONE,
} from './config.js';

export const SURFACE_LABELS = {
  greens: 'Greens',
  tees: 'Tees',
  fairways: 'Fairways',
  rough: 'Rough',
  bunkers: 'Bunkers',
};

const NO_MACHINE = { require: TASK_MACHINE_REQUIRE_NONE };
const MOWER = { require: TASK_MACHINE_REQUIRE_CLASS, class: TASK_MACHINE_CLASS_MOWER };
const ROLLER = { require: TASK_MACHINE_REQUIRE_CLASS, class: TASK_MACHINE_CLASS_ROLLER };
const SPRAYER = { require: TASK_MACHINE_REQUIRE_CLASS, class: TASK_MACHINE_CLASS_SPRAYER };
const CORER = {
  require: TASK_MACHINE_REQUIRE_CLASS,
  class: TASK_MACHINE_CLASS_CORER,
  hireable: true,
};

export const TASKS = [
  { id: 'cutGreens', surface: 'greens', name: 'Cut greens', mowing: true, machine: MOWER },
  { id: ROLL_GREENS_TASK, surface: 'greens', name: ROLL_GREENS_LABEL, mowing: false, appliesQuality: true, machine: ROLLER },
  { id: 'changeCups', surface: 'greens', name: 'Change cups', mowing: false, appliesQuality: true, machine: NO_MACHINE },
  { id: 'cutTees', surface: 'tees', name: 'Cut', mowing: true, machine: MOWER },
  { id: 'cutFairways', surface: 'fairways', name: 'Cut', mowing: true, machine: MOWER },
  { id: 'cutRough', surface: 'rough', name: 'Cut', mowing: true, machine: MOWER },
  { id: 'rakeBunkers', surface: 'bunkers', name: 'Rake', mowing: false, appliesQuality: true, machine: NO_MACHINE },
  { id: 'clearDebris', surface: null, name: 'Clear debris', mowing: false, machine: NO_MACHINE },
  { id: 'handWater', surface: 'greens', name: 'Hand water', mowing: false, machine: NO_MACHINE },
  { id: 'checkMoistureGreens', surface: 'greens', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck', machine: NO_MACHINE },
  { id: 'checkMoistureTees', surface: 'tees', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck', machine: NO_MACHINE },
  { id: 'checkMoistureFairways', surface: 'fairways', name: CHECK_MOISTURE_LABEL, mowing: false, kind: 'moistureCheck', machine: NO_MACHINE },
  { id: 'sprayGreens', surface: 'greens', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST, machine: SPRAYER },
  { id: 'sprayTees', surface: 'tees', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST, machine: SPRAYER },
  { id: 'sprayFairways', surface: 'fairways', name: 'Spray fungicide', mowing: false, requiresSpray: true, kind: 'spray', materialsCost: SPRAY_MATERIALS_COST, machine: SPRAYER },
  { id: 'fertiliseGreens', surface: 'greens', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST, machine: NO_MACHINE },
  { id: 'fertiliseTees', surface: 'tees', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST, machine: NO_MACHINE },
  { id: 'fertiliseFairways', surface: 'fairways', name: FERTILISER_BRAND, mowing: false, requiresSpray: true, kind: 'fertiliser', materialsCost: FERTILISER_MATERIALS_COST, machine: NO_MACHINE },
  { id: POND_RESCUE_TASK, surface: null, name: POND_RESCUE_LABEL, mowing: false, kind: 'pondRescue', materialsCost: POND_RESCUE_COST, machine: NO_MACHINE },
  { id: POND_DOSE_TASK, surface: null, name: POND_DOSING_LABEL, mowing: false, kind: 'pondDose', materialsCost: POND_DOSE_COST, machine: NO_MACHINE },
  { id: 'gmMeeting', surface: null, name: 'GM meeting', mowing: false, kind: 'meeting', machine: NO_MACHINE },
  { id: 'generalDuties', surface: null, name: 'General duties', mowing: false, kind: 'duties', machine: NO_MACHINE },
  { id: 'weedEat', surface: 'rough', name: 'Weed eating', mowing: false, machine: NO_MACHINE },
  { id: 'coreGreens', surface: 'greens', name: 'Core greens', mowing: false, kind: 'coring', machine: CORER },
  { id: 'doubleCutGreens', surface: 'greens', name: 'Double-cut greens', mowing: true, kind: 'prep', prepBonus: TOURNAMENT_PREP_DOUBLE_CUT_BONUS, machine: MOWER },
  { id: 'extraRoll', surface: 'greens', name: 'Extra roll', mowing: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_ROLL_BONUS, machine: ROLLER },
  { id: 'edgeBunkers', surface: 'bunkers', name: 'Bunker edging', mowing: false, kind: 'prep', prepBonus: TOURNAMENT_PREP_EDGE_BONUS, machine: NO_MACHINE },
  { id: 'pickBalls', surface: null, name: 'Pick range balls', mowing: false, kind: 'range', machine: NO_MACHINE },
];

export function getTask(taskId) {
  return TASKS.find((task) => task.id === taskId);
}

export function machineRequirementOf(task) {
  return task?.machine ?? NO_MACHINE;
}

export function taskUsesMachine(task) {
  return machineRequirementOf(task).require !== TASK_MACHINE_REQUIRE_NONE;
}

export function hireCostFor(task) {
  const req = machineRequirementOf(task);
  if (!req.hireable) return 0;
  if (req.hireCost != null) return req.hireCost;
  return MACHINE_HIRE_COST_BY_CLASS[req.class] ?? 0;
}

export function tasksForSurface(surface) {
  return TASKS.filter((task) => task.surface === surface);
}

export function taskAppliesQuality(task) {
  return Boolean(task?.mowing || task?.appliesQuality);
}

export { SURFACE_KEYS, TASK_MINUTES };
