/**
 * Round 7 Phase C: any machine on any job, suitability, spec speeds.
 * Run: node scripts/r7-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONFIRM_DAMAGING_LABEL,
  GREENSMASTER_ID,
  HOC_SURFACES,
  JOB_SETUP_MINUTES,
  MACHINE_TIME_MULT,
  MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT,
  MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX,
  MACHINE_TIME_MULT_WALK_BEHIND_REEL,
  REELMASTER_ID,
  SUITABILITY_ACCEPTABLE_CEILING_PENALTY,
  SUITABILITY_DAMAGING,
  SUITABILITY_DAMAGING_CEILING_PENALTY,
  SUITABILITY_DAMAGING_QUALITY_HIT,
  SUITABILITY_IDEAL,
  SUITABILITY_LABELS,
  SUITABILITY_PENALTY_COPY,
} from '../src/data/constants.js';
import { getMachine, machineAllows, machineSuitability, machineTimeMult } from '../src/data/equipment.js';
import { getTask } from '../src/data/tasks.js';
import {
  durationOnMachine,
  ineligibleMachines,
  jobCeiling,
  machineNativeCeiling,
  overrideCandidates,
  pickMachine,
  surfaceCeiling,
} from '../src/engine/equipment.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { holeSurface, setTypeQuality } from '../src/engine/holes.js';

assert.equal(MACHINE_TIME_MULT.walkBehindReel, MACHINE_TIME_MULT_WALK_BEHIND_REEL);
assert.equal(MACHINE_TIME_MULT.ridingGreensTriplex, MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX);
assert.equal(MACHINE_TIME_MULT.ridingFairwayUnit, MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT);
assert.equal(SUITABILITY_ACCEPTABLE_CEILING_PENALTY, 12);
assert.equal(SUITABILITY_DAMAGING_CEILING_PENALTY, 30);
assert.equal(SUITABILITY_DAMAGING_QUALITY_HIT, 18);

const start = createInitialState();
const greensTask = getTask('cutGreens');
const mowers = ['pushRotary', GREENSMASTER_ID, REELMASTER_ID, 'walkBehindReel', 'rideOnReel', 'premiumRideOn', 'fairwayUnit', 'ventrac'];
for (const id of mowers) {
  const machine = getMachine(id);
  for (const surface of HOC_SURFACES) {
    assert.equal(machineAllows(machine, surface, greensTask), true, `${id} can be assigned to ${surface}`);
    assert.ok(machineSuitability(machine, surface), `${id} has suitability on ${surface}`);
  }
}

let fleet = { ...start, capitalBudget: 200000 };
for (const id of ['fairwayUnit', 'ventrac', 'rideOnReel', 'pushRotary']) {
  fleet = reducer(fleet, { type: 'BUY_MACHINE', machineId: id });
}
const greensCandidates = overrideCandidates(fleet, 'greens').map((machine) => machine.id);
assert.ok(greensCandidates.includes(REELMASTER_ID));
assert.ok(greensCandidates.includes('fairwayUnit'));
assert.ok(greensCandidates.includes('ventrac'));
assert.ok(greensCandidates.includes('pushRotary'));

const over = reducer(fleet, { type: 'SET_MACHINE_OVERRIDE', surface: 'greens', machineId: REELMASTER_ID });
assert.equal(over.machineOverride.greens, REELMASTER_ID);
assert.equal(pickMachine(over, greensTask)?.id, REELMASTER_ID);

assert.equal(pickMachine(start, greensTask)?.id, GREENSMASTER_ID);
assert.equal(machineSuitability(getMachine(GREENSMASTER_ID), 'greens'), SUITABILITY_IDEAL);
assert.equal(machineSuitability(getMachine(REELMASTER_ID), 'greens'), SUITABILITY_DAMAGING);

const blocked = ineligibleMachines(fleet, greensTask);
assert.ok(blocked.some((item) => item.machine.id === REELMASTER_ID));
assert.match(blocked.find((item) => item.machine.id === REELMASTER_ID).reason, /damage/i);

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
const panelSrc = readFileSync(new URL('../src/components/TaskPanel.jsx', import.meta.url), 'utf8');
const confirmSrc = readFileSync(new URL('../src/components/PlanConfirmButton.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /SUITABILITY_PENALTY_COPY/);
assert.match(turfSrc, /SUITABILITY_LABELS/);
assert.match(panelSrc, /SUITABILITY_PENALTY_COPY/);
assert.match(confirmSrc, /CONFIRM_DAMAGING_LABEL/);
assert.match(confirmSrc, /needsConfirm/);
assert.equal(SUITABILITY_LABELS[SUITABILITY_DAMAGING], 'Damaging');
assert.match(SUITABILITY_PENALTY_COPY(SUITABILITY_DAMAGING), /30/);
assert.match(SUITABILITY_PENALTY_COPY(SUITABILITY_DAMAGING), /18/);
assert.equal(CONFIRM_DAMAGING_LABEL, 'Confirm damaging job');

const silent = canPlanTask(start, 'cutGreens', undefined, { machineId: REELMASTER_ID });
assert.equal(silent.ok, false);
assert.equal(silent.needsConfirm, true);
assert.match(silent.reason, /scalp/);
assert.match(silent.reason, /30/);
assert.match(silent.reason, /18/);
assert.equal(reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', machineId: REELMASTER_ID }).plannedTasks.length, 0);

const confirmed = canPlanTask(start, 'cutGreens', undefined, { machineId: REELMASTER_ID, confirmDamaging: true });
assert.equal(confirmed.ok, true);
let planned = reducer(start, {
  type: 'PLAN_TASK',
  taskId: 'cutGreens',
  machineId: REELMASTER_ID,
  confirmDamaging: true,
});
assert.equal(planned.plannedTasks.length, 1);
assert.equal(planned.plannedTasks[0].machineId, REELMASTER_ID);

const native = machineNativeCeiling(getMachine(REELMASTER_ID), 'greens');
assert.equal(native, 62);
const bonuses = surfaceCeiling(start, 'greens') - 68;
assert.equal(jobCeiling(start, 'greens', REELMASTER_ID), native - SUITABILITY_DAMAGING_CEILING_PENALTY + bonuses);

let damaged = setTypeQuality(createInitialState(), 'greens', 70);
damaged = reducer(damaged, {
  type: 'PLAN_TASK',
  taskId: 'cutGreens',
  machineId: REELMASTER_ID,
  confirmDamaging: true,
});
damaged = reducer(damaged, { type: 'END_DAY' });
assert.equal(holeSurface(damaged, 1, 'greens').quality, 70 - SUITABILITY_DAMAGING_QUALITY_HIT);
assert.equal(holeSurface(damaged, 9, 'greens').quality, 70 - SUITABILITY_DAMAGING_QUALITY_HIT);
let withFairway = { ...start, capitalBudget: 200000 };
withFairway = reducer(withFairway, { type: 'BUY_MACHINE', machineId: 'fairwayUnit' });
assert.equal(surfaceCeiling(withFairway, 'greens'), surfaceCeiling(start, 'greens'), 'fairway unit must not raise the greens cap');

const even = {
  ...fleet,
  machineCondition: {
    ...fleet.machineCondition,
    [GREENSMASTER_ID]: 100,
    rideOnReel: 100,
  },
};
const player = even.workers[0];
const walk = durationOnMachine(even, 'cutGreens', player, GREENSMASTER_ID);
const trip = durationOnMachine(even, 'cutGreens', player, 'rideOnReel');
const setup = JOB_SETUP_MINUTES.green;
const variableRatio = (trip - setup) / (walk - setup);
assert.ok(Math.abs(variableRatio - MACHINE_TIME_MULT.ridingGreensTriplex) < 0.02);
assert.equal(machineTimeMult(getMachine('rideOnReel')), MACHINE_TIME_MULT.ridingGreensTriplex);
assert.equal(machineTimeMult(getMachine(GREENSMASTER_ID)), MACHINE_TIME_MULT.walkBehindReel);

console.log(
  `TRIPLEX_NINE=${trip} WALK_BEHIND_NINE=${walk} SETUP=${setup} VARIABLE_RATIO=${variableRatio.toFixed(3)} MACHINE_TIME_MULT.ridingGreensTriplex=${MACHINE_TIME_MULT.ridingGreensTriplex}`,
);
console.log('GATE C1 PASS every mower can be assigned to every turf surface');
console.log('GATE C2 PASS suitability and penalty are shown before planning');
console.log('GATE C3 PASS a damaging job requires explicit confirmation and is never silent');
console.log(`GATE C4 PASS fairway mower on greens applies ceiling −${SUITABILITY_DAMAGING_CEILING_PENALTY} and −${SUITABILITY_DAMAGING_QUALITY_HIT} quality`);
console.log(`GATE C5 PASS triplex variable time is ${variableRatio.toFixed(3)} of walk-behind (target ${MACHINE_TIME_MULT.ridingGreensTriplex})`);
console.log('round 7 phase C checks passed');
