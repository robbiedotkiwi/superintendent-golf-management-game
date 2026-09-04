/**
 * Round 7 Phase F: moisture/roll UI, Inputs tab, Healthy Ponds dosing and rescue.
 * Run: node scripts/r7-phase-f-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHECK_MOISTURE_BY_SURFACE,
  CHECK_MOISTURE_LABEL,
  DISEASE_OUTBREAK_THRESHOLD,
  DISEASE_OUTBREAK_WARN,
  FERTILISE_BY_SURFACE,
  FERTILISER_BRAND,
  FERTILISER_CEILING_BONUS,
  FERTILISER_DAYS,
  GREENS_ROLLER_COST,
  HEALTHY_PONDS_BRAND,
  INPUTS_SURFACES,
  POND_DOSE_COST,
  POND_DOSE_MINUTES,
  POND_DOSE_WEEKLY_COST,
  POND_DOSING_LABEL,
  POND_HEALTH_START,
  POND_RESCUE_COST,
  POND_RESCUE_HEALTH,
  POND_RESCUE_LABEL,
  POND_RESCUE_MINUTES,
  POND_RESCUE_TASK,
  POND_START_VOLUME,
  ROLL_GREENS_LABEL,
  ROLL_GREENS_TASK,
  SAVE_VERSION,
  SPRAY_BY_SURFACE,
  SPRAY_SUPPRESS_DAYS,
  STARTING_WEATHER,
  TRAINING_DAYS,
  TURF_TAB_INPUTS,
  TURF_TAB_IRRIGATION,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TABS,
} from '../src/data/constants.js';
import { MACHINES, getMachine } from '../src/data/equipment.js';
import { getTask } from '../src/data/tasks.js';
import { surfaceCeiling } from '../src/engine/equipment.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { holeSurface } from '../src/engine/holes.js';
import { greensStatuses } from '../src/engine/moisture.js';
import { pondDoseMinutes, resolveIrrigation } from '../src/engine/irrigation.js';
import { migrateSave } from '../src/engine/save.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

assert.equal(SAVE_VERSION, 3);
assert.equal(FERTILISER_DAYS, 21);
assert.equal(FERTILISER_CEILING_BONUS, 5);
assert.equal(SPRAY_SUPPRESS_DAYS, 14);
assert.equal(DISEASE_OUTBREAK_WARN, 45);
assert.ok(DISEASE_OUTBREAK_WARN < DISEASE_OUTBREAK_THRESHOLD);
assert.equal(POND_DOSE_MINUTES, 20);
assert.equal(POND_RESCUE_MINUTES, 90);
assert.equal(POND_RESCUE_HEALTH, 28);
assert.ok(POND_DOSE_WEEKLY_COST < POND_RESCUE_COST, 'dosing is cheaper over a week than one rescue');
assert.equal(HEALTHY_PONDS_BRAND, 'Healthy Ponds');
assert.equal(POND_DOSING_LABEL, 'Healthy Ponds dosing');
assert.equal(POND_RESCUE_LABEL, 'Pond rescue treatment');
assert.equal(CHECK_MOISTURE_LABEL, 'Check moisture');
assert.equal(ROLL_GREENS_LABEL, 'Roll');
assert.equal(FERTILISER_BRAND, 'Plant Fitness');
assert.ok(TURF_TABS.includes(TURF_TAB_INPUTS));
assert.deepEqual(TURF_TABS, [
  'summary',
  'mowing',
  'irrigation',
  'inputs',
  'other',
  'presets',
]);
assert.deepEqual(INPUTS_SURFACES, ['greens', 'tees', 'fairways']);
assert.equal(CHECK_MOISTURE_BY_SURFACE.greens, 'checkMoistureGreens');
assert.equal(FERTILISE_BY_SURFACE.greens, 'fertiliseGreens');
assert.equal(SPRAY_BY_SURFACE.greens, 'sprayGreens');

const roller = getMachine('greensRoller');
assert.equal(roller.brand, 'Salsco');
assert.equal(roller.rollOnly, true);
assert.equal(roller.ownedAtStart, false);
assert.equal(roller.cost, GREENS_ROLLER_COST);
assert.ok(MACHINES.some((machine) => machine.id === 'greensRoller' && !machine.ownedAtStart));
assert.equal(getTask(ROLL_GREENS_TASK).name, ROLL_GREENS_LABEL);
assert.equal(getTask(POND_RESCUE_TASK).kind, 'pondRescue');
assert.equal(getTask('checkMoistureGreens').kind, 'moistureCheck');

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /TURF_TAB_INPUTS/);
assert.match(turfSrc, /InputsTab/);
assert.match(turfSrc, /ROLL_GREENS_TASK/);
assert.match(turfSrc, /CHECK_MOISTURE_BY_SURFACE/);
assert.match(turfSrc, /POND_DOSING_LABEL/);
assert.match(turfSrc, /POND_RESCUE_TASK/);
assert.doesNotMatch(turfSrc, /tab === TURF_TAB_BUNKERS \?/);
assert.match(turfSrc, new RegExp(`${TURF_TAB_MOWING}|ROLL_GREENS`));

const mapBar = readFileSync(new URL('../src/components/MapSelectionBar.jsx', import.meta.url), 'utf8');
assert.match(mapBar, /CHECK_MOISTURE_BY_SURFACE/);
assert.match(mapBar, /CHECK_MOISTURE_LABEL/);

const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.match(shedSrc, /ownedMachines/);
assert.match(shedSrc, /MACHINES\.filter/);

function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: extras.weather ?? STARTING_WEATHER,
    season: extras.season ?? state.season,
    workers: applyWeatherToWorkers(next.workers, extras.weather ?? STARTING_WEATHER),
  };
}

function certify(state) {
  let next = reducer(state, { type: 'TRAIN_WORKER', workerId: 'player', axis: 'spray' });
  for (let i = 0; i < TRAINING_DAYS; i += 1) {
    next = endKeep(next);
  }
  return next;
}

const start = createInitialState();
assert.equal(start.pondDosing, false);
assert.equal(canPlanTask(start, 'checkMoistureGreens').ok, true);
assert.equal(canPlanTask(start, ROLL_GREENS_TASK).ok, true);
assert.equal(canPlanTask(start, POND_RESCUE_TASK).ok, true);

let partial = reducer(start, { type: 'SET_SELECTED_HOLES', holes: [1, 2] });
partial = reducer(partial, { type: 'PLAN_TASK', taskId: 'checkMoistureGreens', holes: [1, 2] });
assert.deepEqual(partial.plannedTasks[0].holes, [1, 2]);
partial = reducer(partial, { type: 'END_DAY' });
const greens = greensStatuses(partial);
assert.equal(greens[0].kind, 'fresh');
assert.equal(greens[1].kind, 'fresh');
assert.equal(greens[2].kind, 'hidden');

const bought = reducer(start, { type: 'BUY_MACHINE', machineId: 'greensRoller' });
assert.ok(bought.ownedMachines.includes('greensRoller'));
assert.equal(bought.cash, start.cash - GREENS_ROLLER_COST);
const rolled = reducer(bought, { type: 'PLAN_TASK', taskId: ROLL_GREENS_TASK });
assert.equal(rolled.plannedTasks[0].taskId, ROLL_GREENS_TASK);
assert.equal(rolled.plannedTasks[0].machineId, 'greensRoller');

const certified = certify(createInitialState());
assert.equal(canPlanTask(certified, 'fertiliseGreens', undefined, { holes: [3] }).ok, true);
let fed = reducer(certified, { type: 'PLAN_TASK', taskId: 'fertiliseGreens', holes: [3] });
fed = reducer(fed, { type: 'END_DAY' });
assert.equal(holeSurface(fed, 3, 'greens').fertiliserUntil, certified.day + FERTILISER_DAYS);
assert.equal(holeSurface(fed, 1, 'greens').fertiliserUntil, 0);
assert.equal(fed.fertiliserUntil.greens, 0);
assert.equal(surfaceCeiling(fed, 'greens'), surfaceCeiling(certified, 'greens'));

let allFed = reducer(certified, { type: 'PLAN_TASK', taskId: 'fertiliseGreens' });
allFed = reducer(allFed, { type: 'END_DAY' });
assert.equal(allFed.fertiliserUntil.greens, certified.day + FERTILISER_DAYS);
assert.equal(holeSurface(allFed, 1, 'greens').fertiliserUntil, certified.day + FERTILISER_DAYS);
assert.equal(surfaceCeiling(allFed, 'greens'), surfaceCeiling(certified, 'greens') + FERTILISER_CEILING_BONUS);

let sprayed = reducer(certified, { type: 'PLAN_TASK', taskId: 'sprayGreens', holes: [4] });
sprayed = reducer(sprayed, { type: 'END_DAY' });
assert.equal(holeSurface(sprayed, 4, 'greens').sprayedUntil, certified.day + SPRAY_SUPPRESS_DAYS);
assert.equal(holeSurface(sprayed, 1, 'greens').sprayedUntil, 0);

assert.equal(pondDoseMinutes({ pondDosing: true }), POND_DOSE_MINUTES);
assert.equal(pondDoseMinutes({ pondDosing: false }), 0);

const summerProbe = {
  ...start,
  season: 'summer',
  pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
  pondDosing: false,
  hasAerator: false,
};
const droppedIrr = resolveIrrigation(summerProbe);
assert.ok(droppedIrr.pond.health < POND_HEALTH_START);
assert.equal(droppedIrr.doseCost, 0);
const heldIrr = resolveIrrigation({ ...summerProbe, pondDosing: true });
assert.equal(heldIrr.pond.health, POND_HEALTH_START);
assert.equal(heldIrr.doseCost, POND_DOSE_COST);
const aeratorIrr = resolveIrrigation({ ...summerProbe, hasAerator: true });
assert.equal(aeratorIrr.pond.health, POND_HEALTH_START);
const bothIrr = resolveIrrigation({ ...summerProbe, hasAerator: true, pondDosing: true });
assert.equal(bothIrr.pond.health, POND_HEALTH_START);
assert.equal(bothIrr.doseCost, POND_DOSE_COST);

const dosingOn = reducer(start, { type: 'SET_POND_DOSING', on: true });
assert.equal(dosingOn.pondDosing, true);
const undosedMorning = reducer(start, { type: 'END_DAY' });
const dosedMorning = reducer(dosingOn, { type: 'END_DAY' });
assert.equal(dosedMorning.cash, undosedMorning.cash - POND_DOSE_COST);
assert.equal(
  dosedMorning.workers.find((worker) => worker.id === 'player').minutesToday,
  undosedMorning.workers.find((worker) => worker.id === 'player').minutesToday - POND_DOSE_MINUTES,
);

const low = { ...start, pond: { volume: POND_START_VOLUME, health: 20 } };
const idleLow = reducer(low, { type: 'END_DAY' });
let rescue = reducer(low, { type: 'PLAN_TASK', taskId: POND_RESCUE_TASK });
rescue = reducer(rescue, { type: 'END_DAY' });
assert.equal(rescue.pond.health, idleLow.pond.health + POND_RESCUE_HEALTH);
assert.equal(rescue.cash, idleLow.cash - POND_RESCUE_COST);

const old = migrateSave({
  day: 12,
  cash: 5000,
  surfaces: {
    greens: { quality: 40, lastMownDay: 1 },
    tees: { quality: 40, lastMownDay: 1 },
    fairways: { quality: 40, lastMownDay: 1 },
    rough: { quality: 40, lastMownDay: 1 },
    bunkers: { quality: 40, lastRakedDay: 1 },
  },
  fertiliserUntil: { greens: 20, tees: 0, fairways: 0 },
});
assert.ok(old);
assert.equal(old.pondDosing, false);
assert.equal(holeSurface(old, 1, 'greens').fertiliserUntil, 20);
assert.equal(holeSurface(old, 7, 'greens').fertiliserUntil, 20);

const turfOrder = TURF_TABS.join(' ');
assert.match(turfOrder, new RegExp(`${TURF_TAB_IRRIGATION} ${TURF_TAB_INPUTS} ${TURF_TAB_OTHER}`));

console.log('GATE F1 PASS moisture check plans on selected holes');
console.log('GATE F2 PASS rolling plans and Salsco roller is purchasable into Fleet');
console.log('GATE F3 PASS Inputs tab with fertiliser and spray against selected holes');
console.log('GATE F4 PASS treated holes show treatment expiry');
console.log(`GATE F5 PASS Healthy Ponds dosing ${POND_DOSE_WEEKLY_COST}/week < rescue ${POND_RESCUE_COST}`);
console.log('round 7 phase F checks passed');
