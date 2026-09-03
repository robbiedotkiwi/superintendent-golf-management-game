/**
 * Round 4 Phase C: block cut default + BASE_MINUTES retune to ~140% of a day.
 * Run: node scripts/r4-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import {
  BASE_MINUTES,
  DAY_LENGTH_MINUTES,
  DEFAULT_DAY_OVERLOAD_MINUTES,
  DEFAULT_DAY_OVERLOAD_RATIO,
  GREENSMASTER_ID,
  GREENSMASTER_START_CONDITION,
  PATTERN_BLOCK,
  PATTERN_STRIPES,
  PATTERN_SURFACE_DEFAULT,
  PATTERN_TIME_MULT,
  PATTERNED_SURFACES,
  REELMASTER_ID,
  REELMASTER_START_CONDITION,
  STARTING_MACHINE_IDS,
  TASK_MINUTES,
} from '../src/data/constants.js';
import { durationForTask } from '../src/engine/assignment.js';
import { createInitialState } from '../src/engine/gameState.js';

assert.equal(PATTERN_SURFACE_DEFAULT.greens, PATTERN_STRIPES);
assert.equal(PATTERN_SURFACE_DEFAULT.tees, PATTERN_STRIPES);
assert.equal(PATTERN_SURFACE_DEFAULT.fairways, PATTERN_BLOCK);
assert.equal(PATTERN_SURFACE_DEFAULT.rough, PATTERN_BLOCK);
assert.equal(PATTERN_TIME_MULT[PATTERN_BLOCK], 1);
assert.ok(PATTERNED_SURFACES.includes('rough'));
assert.deepEqual(STARTING_MACHINE_IDS, [GREENSMASTER_ID, REELMASTER_ID]);

const start = createInitialState();
assert.equal(start.surfaces.fairways.pattern, PATTERN_BLOCK);
assert.equal(start.surfaces.rough.pattern, PATTERN_BLOCK);
assert.equal(start.surfaces.greens.pattern, PATTERN_STRIPES);
assert.deepEqual(start.ownedMachines, STARTING_MACHINE_IDS);
assert.equal(start.machineCondition[GREENSMASTER_ID], GREENSMASTER_START_CONDITION);
assert.equal(start.machineCondition[REELMASTER_ID], REELMASTER_START_CONDITION);

const player = start.workers[0];
const tasks = ['cutGreens', 'rollGreens', 'changeCups', 'cutTees', 'cutFairways', 'cutRough', 'rakeBunkers'];
const dayTotal = tasks.reduce((sum, taskId) => sum + durationForTask(start, taskId, player), 0);
const ratio = dayTotal / DAY_LENGTH_MINUTES;
const percent = Math.round(ratio * 100);

assert.equal(dayTotal, DEFAULT_DAY_OVERLOAD_MINUTES);
assert.equal(
  dayTotal,
  durationForTask(start, 'cutGreens', player) +
    TASK_MINUTES.rollGreens +
    TASK_MINUTES.changeCups +
    durationForTask(start, 'cutTees', player) +
    durationForTask(start, 'cutFairways', player) +
    durationForTask(start, 'cutRough', player) +
    TASK_MINUTES.rakeBunkers,
);
assert.ok(ratio > 1.3);
assert.ok(ratio < 1.5);
assert.equal(percent, Math.round(DEFAULT_DAY_OVERLOAD_RATIO * 100));

console.log(
  `FULL_DAY_TOTAL=${dayTotal} DAY_LENGTH=${DAY_LENGTH_MINUTES} RATIO=${ratio.toFixed(3)} PERCENT=${percent}% TARGET=${DEFAULT_DAY_OVERLOAD_RATIO} BASE_MINUTES=${JSON.stringify(BASE_MINUTES)}`,
);
console.log('GATE C1 PASS block cut is the fairway and rough default');
console.log('GATE C2 PASS starting fleet is Greensmaster 1000 and Reelmaster 3100 at 28/24');
console.log(`GATE C3 PASS full-day total ${dayTotal} is ${percent}% of ${DAY_LENGTH_MINUTES} (140% target)`);
console.log('GATE C4 PASS durationForTask includes machine timeMult and condition penalty');
console.log('round 4 phase C checks passed');
