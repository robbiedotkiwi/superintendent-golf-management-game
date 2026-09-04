/**
 * Round 6 Phase C: two-machine starting fleet and retuned BASE_MINUTES.
 * Run: node scripts/r6-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import {
  BASE_MINUTES,
  DAY_LENGTH_MINUTES,
  DEFAULT_DAY_OVERLOAD_MINUTES,
  DEFAULT_DAY_OVERLOAD_RATIO,
  GREENSMASTER_CEILING,
  GREENSMASTER_ID,
  GREENSMASTER_START_CONDITION,
  GREENSMASTER_TIME_MULT,
  PUSH_ROTARY_ID,
  REELMASTER_CEILING,
  REELMASTER_ID,
  REELMASTER_START_CONDITION,
  REELMASTER_TIME_MULT,
  STARTING_MACHINE_IDS,
  TASK_MINUTES,
  JOB_SETUP_MINUTES,
} from '../src/data/constants.js';
import { getMachine } from '../src/data/equipment.js';
import { durationForTask } from '../src/engine/assignment.js';
import {
  canBuyMachine,
  conditionTimeMultiplier,
  machineMultiplierFor,
} from '../src/engine/equipment.js';
import { canPlanTask, createInitialState } from '../src/engine/gameState.js';
import { mowingMinutes } from '../src/engine/mowing.js';
import { variableJobMinutes } from '../src/engine/jobs.js';

assert.deepEqual(STARTING_MACHINE_IDS, [GREENSMASTER_ID, REELMASTER_ID]);
assert.equal(GREENSMASTER_CEILING, 68);
assert.equal(GREENSMASTER_TIME_MULT, 1);
assert.equal(GREENSMASTER_START_CONDITION, 28);
assert.equal(REELMASTER_CEILING, 62);
assert.equal(REELMASTER_TIME_MULT, 0.35);
assert.equal(REELMASTER_START_CONDITION, 24);

const greensmaster = getMachine(GREENSMASTER_ID);
const reelmaster = getMachine(REELMASTER_ID);
const push = getMachine(PUSH_ROTARY_ID);
assert.ok(greensmaster);
assert.equal(greensmaster.surfaces.greens, true);
assert.equal(greensmaster.surfaces.tees, true);
assert.equal(greensmaster.surfaces.fairways, false);
assert.equal(greensmaster.ceiling.greens, GREENSMASTER_CEILING);
assert.equal(greensmaster.timeMult, GREENSMASTER_TIME_MULT);
assert.ok(reelmaster);
assert.equal(reelmaster.surfaces.fairways, true);
assert.equal(reelmaster.surfaces.rough, true);
assert.equal(reelmaster.surfaces.greens, false);
assert.equal(reelmaster.ceiling.fairways, REELMASTER_CEILING);
assert.equal(reelmaster.timeMult, REELMASTER_TIME_MULT);
assert.equal(push.ownedAtStart, false);

const start = createInitialState();
assert.deepEqual(start.ownedMachines, STARTING_MACHINE_IDS);
assert.equal(start.ownedMachines.includes(PUSH_ROTARY_ID), false);
assert.equal(start.machineCondition[GREENSMASTER_ID], GREENSMASTER_START_CONDITION);
assert.equal(start.machineCondition[REELMASTER_ID], REELMASTER_START_CONDITION);
assert.equal(canBuyMachine(start, PUSH_ROTARY_ID).ok, true);

assert.equal(canPlanTask(start, 'cutFairways').ok, true);
assert.equal(canPlanTask(start, 'cutRough').ok, true);
assert.ok(durationForTask(start, 'cutFairways') < DAY_LENGTH_MINUTES);
assert.ok(durationForTask(start, 'cutRough') < DAY_LENGTH_MINUTES);

assert.equal(
  durationForTask(start, 'cutGreens'),
  Math.round(JOB_SETUP_MINUTES.green + variableJobMinutes(start, 'cutGreens') * machineMultiplierFor(start, GREENSMASTER_ID)),
);
assert.equal(
  durationForTask(start, 'cutFairways'),
  Math.round(JOB_SETUP_MINUTES.fairway + variableJobMinutes(start, 'cutFairways') * machineMultiplierFor(start, REELMASTER_ID)),
);
assert.equal(
  machineMultiplierFor(start, GREENSMASTER_ID),
  GREENSMASTER_TIME_MULT * conditionTimeMultiplier(GREENSMASTER_START_CONDITION),
);
assert.equal(
  machineMultiplierFor(start, REELMASTER_ID),
  REELMASTER_TIME_MULT * conditionTimeMultiplier(REELMASTER_START_CONDITION),
);

const player = start.workers[0];
const tasks = ['cutGreens', 'rollGreens', 'changeCups', 'cutTees', 'cutFairways', 'cutRough', 'rakeBunkers'];
const dayTotal = tasks.reduce((sum, taskId) => sum + durationForTask(start, taskId, player), 0);
const ratio = dayTotal / DAY_LENGTH_MINUTES;
const percent = Math.round(ratio * 100);
assert.equal(dayTotal, DEFAULT_DAY_OVERLOAD_MINUTES);
assert.equal(percent, Math.round(DEFAULT_DAY_OVERLOAD_RATIO * 100));
assert.ok(ratio > 1.5);
assert.ok(ratio < 1.7);
assert.equal(
  dayTotal,
  durationForTask(start, 'cutGreens', player) +
    durationForTask(start, 'rollGreens', player) +
    durationForTask(start, 'changeCups', player) +
    durationForTask(start, 'cutTees', player) +
    durationForTask(start, 'cutFairways', player) +
    durationForTask(start, 'cutRough', player) +
    durationForTask(start, 'rakeBunkers', player),
);

console.log(
  `FULL_DAY_TOTAL=${dayTotal} DAY_LENGTH=${DAY_LENGTH_MINUTES} RATIO=${ratio.toFixed(3)} PERCENT=${percent}% TARGET=${DEFAULT_DAY_OVERLOAD_RATIO} BASE_MINUTES=${JSON.stringify(BASE_MINUTES)}`,
);
console.log('GATE C1 PASS new game owns Greensmaster 1000 at 28 and Reelmaster 3100 at 24');
console.log('GATE C2 PASS Phase 1 duration uses machine timeMult and condition penalty');
console.log('GATE C3 PASS fairways and rough can be cut on day 1 in under a day');
console.log(`GATE C4 PASS full-day total ${dayTotal} is ${percent}% of ${DAY_LENGTH_MINUTES}`);
console.log('GATE C5 PASS push rotary is purchasable and not owned at start');
console.log('round 6 phase C checks passed');
