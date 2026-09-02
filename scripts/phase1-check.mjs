/**
 * Headless checks for Phase 1 simulation and planning gates.
 * Run: node scripts/phase1-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DECAY_ACCELERATION,
  DECAY_BASE,
  EQUIPMENT_CEILING,
  LEVEL_STANDARD_GAIN,
  LEVEL_THOROUGH_TIME_MULT,
  QUALITY_MAX,
  QUALITY_MIN,
  STARTING_QUALITY_GREENS,
  TASK_MINUTES,
} from '../src/data/constants.js';
import { taskDuration } from '../src/data/tasks.js';
import {
  canPlanTask,
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { applyDecay, applyGain, clampQuality } from '../src/engine/simulation.js';

function plan(state, taskId, level) {
  return reducer(state, { type: 'PLAN_TASK', taskId, level });
}

function end(state) {
  return reducer(state, { type: 'END_DAY' });
}

let state = createInitialState();
const startMinutes = combinedMinutesRemaining(state);

state = plan(state, 'cutGreens', 'standard');
assert.equal(state.plannedTasks.length, 1);
assert.equal(state.plannedTasks[0].minutes, TASK_MINUTES.cutGreens);
assert.equal(combinedMinutesRemaining(state), startMinutes - TASK_MINUTES.cutGreens);

state = plan(state, 'cutRough', 'thorough');
const roughTime = taskDuration('cutRough', 'thorough');
assert.equal(roughTime, Math.round(TASK_MINUTES.cutRough * LEVEL_THOROUGH_TIME_MULT));
assert.equal(
  combinedMinutesRemaining(state),
  startMinutes - TASK_MINUTES.cutGreens - roughTime,
);

const blocked = canPlanTask(state, 'cutFairways', 'standard');
assert.equal(blocked.ok, false);
assert.match(blocked.reason, /Needs 150 min/);

const beforeRemove = combinedMinutesRemaining(state);
state = reducer(state, { type: 'REMOVE_TASK', taskId: 'cutRough' });
assert.equal(combinedMinutesRemaining(state), beforeRemove + roughTime);
assert.equal(state.plannedTasks.length, 1);

const greensBefore = state.surfaces.greens.quality;
const teesBefore = state.surfaces.tees.quality;
state = end(state);
const greensSummary = state.log[0].done.find((item) => item.taskId === 'cutGreens');
assert.equal(greensSummary.after, applyGain(greensBefore, LEVEL_STANDARD_GAIN));
assert.equal(state.surfaces.greens.quality, greensSummary.after);
assert.equal(state.surfaces.tees.quality, applyDecay(teesBefore));
assert.equal(state.plannedTasks.length, 0);
assert.equal(combinedMinutesRemaining(state), startMinutes);
assert.equal(state.day, 2);

let skip = createInitialState();
for (let i = 0; i < 10; i += 1) {
  skip = end(skip);
}
assert.ok(skip.surfaces.greens.quality < 20);
assert.equal(skip.surfaces.greens.quality, QUALITY_MIN);

let greensOnly = createInitialState();
for (let i = 0; i < 10; i += 1) {
  greensOnly = plan(greensOnly, 'cutGreens', 'thorough');
  greensOnly = end(greensOnly);
}
assert.equal(greensOnly.surfaces.greens.quality, EQUIPMENT_CEILING);
assert.ok(greensOnly.surfaces.tees.quality < greensOnly.surfaces.greens.quality);
assert.ok(greensOnly.surfaces.fairways.quality < 20);
assert.ok(greensOnly.surfaces.rough.quality < 20);
assert.ok(greensOnly.surfaces.bunkers.quality < 20);

assert.equal(clampQuality(QUALITY_MAX + DECAY_BASE), QUALITY_MAX);
assert.equal(clampQuality(QUALITY_MIN - DECAY_BASE), QUALITY_MIN);
assert.equal(applyGain(EQUIPMENT_CEILING, LEVEL_STANDARD_GAIN), EQUIPMENT_CEILING);
assert.equal(applyDecay(DECAY_BASE / DECAY_ACCELERATION), QUALITY_MIN);

const mid = plan(createInitialState(), 'rollGreens', 'quick');
const json = JSON.parse(JSON.stringify(mid));
assert.deepEqual(json.plannedTasks, mid.plannedTasks);
assert.equal(combinedMinutesRemaining(json), combinedMinutesRemaining(mid));

assert.equal(createInitialState().surfaces.greens.quality, STARTING_QUALITY_GREENS);

console.log('phase1 checks passed');
