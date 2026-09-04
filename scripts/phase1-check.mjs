/**
 * Headless checks for Phase 1 simulation and planning gates (post Fix Phase A).
 * Run: node scripts/phase1-check.mjs
 */
import assert from 'node:assert/strict';
import {
  BASE_GAIN,
  DAY_LENGTH_MINUTES,
  DECAY_ACCELERATION,
  DECAY_BASE,
  QUALITY_MAX,
  QUALITY_MIN,
  STARTING_QUALITY_GREENS,
  STARTING_SEASON,
  STARTING_WEATHER,
  TASK_MINUTES,
} from '../src/data/constants.js';
import {
  canPlanTask,
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { durationForTask } from '../src/engine/assignment.js';
import { surfaceCeiling } from '../src/engine/equipment.js';
import { mowingGain } from '../src/engine/mowing.js';
import { applyDecay, applyGain, clampQuality } from '../src/engine/simulation.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


function plan(state, taskId) {
  return reducer(state, { type: 'PLAN_TASK', taskId });
}

function end(state) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: STARTING_WEATHER,
    workers: applyWeatherToWorkers(next.workers, STARTING_WEATHER),
  };
}

let state = createInitialState();
const startMinutes = combinedMinutesRemaining(state);
const greensTime = durationForTask(state, 'cutGreens');
const teesTime = durationForTask(state, 'cutTees');
const fairwaysTime = durationForTask(state, 'cutFairways');
const roughTime = durationForTask(state, 'cutRough');

state = plan(state, 'cutGreens');
assert.equal(state.plannedTasks.length, 1);
assert.equal(state.plannedTasks[0].minutes, greensTime);
assert.equal(combinedMinutesRemaining(state), startMinutes - greensTime);

state = plan(state, 'cutTees');
state = plan(state, 'cutFairways');
assert.equal(
  combinedMinutesRemaining(state),
  startMinutes - greensTime - teesTime - fairwaysTime,
);

const blocked = canPlanTask(state, 'cutRough');
assert.equal(blocked.ok, false);
assert.match(blocked.reason, new RegExp(`Needs ${roughTime} min`));

const beforeRemove = combinedMinutesRemaining(state);
state = reducer(state, { type: 'REMOVE_TASK', taskId: 'cutFairways' });
assert.equal(combinedMinutesRemaining(state), beforeRemove + fairwaysTime);
assert.equal(state.plannedTasks.length, 2);

const greensBefore = meanQuality(state, 'greens');
const fairwaysBefore = meanQuality(state, 'fairways');
const expectedGain = mowingGain(state, 'cutGreens', 1);
state = end(state);
const greensSummary = state.log[0].done.find((item) => item.taskId === 'cutGreens');
const expectedGreens = applyGain(greensBefore, expectedGain, surfaceCeiling(createInitialState(), 'greens'));
assert.ok(Math.abs(greensSummary.after - expectedGreens) < 1e-9);
assert.ok(Math.abs(meanQuality(state, 'greens') - greensSummary.after) < 1e-9);
assert.ok(Math.abs(meanQuality(state, 'fairways') - applyDecay(fairwaysBefore, STARTING_SEASON)) < 1e-9);
assert.equal(state.plannedTasks.length, 0);
assert.equal(combinedMinutesRemaining(state), startMinutes);
assert.equal(state.day, 2);

let skip = createInitialState();
for (let i = 0; i < 10; i += 1) {
  skip = end(skip);
}
assert.ok(meanQuality(skip, 'greens') < 20);
assert.equal(meanQuality(skip, 'greens'), QUALITY_MIN);

let greensOnly = reducer(createInitialState(), { type: 'SET_AUTO_ROTATE', surface: 'greens', value: true });
for (let i = 0; i < 10; i += 1) {
  greensOnly = plan(greensOnly, 'cutGreens');
  greensOnly = end(greensOnly);
}
assert.equal(meanQuality(greensOnly, 'greens'), surfaceCeiling(greensOnly, 'greens'));
assert.ok(meanQuality(greensOnly, 'tees') < meanQuality(greensOnly, 'greens'));
assert.ok(meanQuality(greensOnly, 'fairways') < 20);
assert.ok(meanQuality(greensOnly, 'rough') < 20);
assert.ok(meanQuality(greensOnly, 'bunkers') < 20);

assert.equal(clampQuality(QUALITY_MAX + DECAY_BASE), QUALITY_MAX);
assert.equal(clampQuality(QUALITY_MIN - DECAY_BASE), QUALITY_MIN);
const ceiling = surfaceCeiling(createInitialState(), 'greens');
assert.equal(applyGain(ceiling, BASE_GAIN, ceiling), ceiling);
assert.equal(applyDecay(DECAY_BASE / DECAY_ACCELERATION, STARTING_SEASON), QUALITY_MIN);

const mid = plan(createInitialState(), 'rollGreens');
assert.equal(mid.plannedTasks[0].minutes, durationForTask(createInitialState(), 'rollGreens'));
const json = JSON.parse(JSON.stringify(mid));
assert.deepEqual(json.plannedTasks, mid.plannedTasks);
assert.equal(combinedMinutesRemaining(json), combinedMinutesRemaining(mid));

assert.equal(meanQuality(createInitialState(), 'greens'), STARTING_QUALITY_GREENS);
assert.equal(combinedMinutesRemaining(createInitialState()), DAY_LENGTH_MINUTES);

console.log('phase1 checks passed');
