/**
 * Headless checks for Phase 0 engine gates.
 * Run: node scripts/phase0-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAY_LENGTH_MINUTES,
  HOLE_COUNT,
  PLAYER_QUALITY_SKILL,
  PLAYER_SPEED_SKILL,
  STARTING_CASH,
  STARTING_DAY,
  STARTING_QUALITY_BUNKERS,
  STARTING_QUALITY_FAIRWAYS,
  STARTING_QUALITY_GREENS,
  STARTING_QUALITY_ROUGH,
  STARTING_QUALITY_TEES,
  STARTING_SEASON,
  STARTING_YEAR,
} from '../src/data/constants.js';
import {
  combinedMinutesRemaining,
  createInitialState,
  initialState,
  reducer,
} from '../src/engine/gameState.js';

const state = createInitialState();

assert.equal(state.day, STARTING_DAY);
assert.equal(state.season, STARTING_SEASON);
assert.equal(state.year, STARTING_YEAR);
assert.equal(state.cash, STARTING_CASH);
assert.equal(state.holes, HOLE_COUNT);
assert.ok(Array.isArray(state.workers));
assert.ok(state.workers.length >= 1);
assert.equal(state.workers[0].minutesToday, DAY_LENGTH_MINUTES);
assert.equal(state.surfaces.greens.quality, STARTING_QUALITY_GREENS);
assert.equal(state.surfaces.tees.quality, STARTING_QUALITY_TEES);
assert.equal(state.surfaces.fairways.quality, STARTING_QUALITY_FAIRWAYS);
assert.equal(state.surfaces.rough.quality, STARTING_QUALITY_ROUGH);
assert.equal(state.surfaces.bunkers.quality, STARTING_QUALITY_BUNKERS);
assert.equal(state.workers[0].speedSkill, PLAYER_SPEED_SKILL);
assert.equal(state.workers[0].qualitySkill, PLAYER_QUALITY_SKILL);

const combined = combinedMinutesRemaining(state);
assert.equal(combined, DAY_LENGTH_MINUTES);
assert.equal(
  combined,
  state.workers.reduce((sum, worker) => sum + (worker.minutesToday - worker.minutesUsed), 0),
);

const extra = createInitialState();
extra.workers.push({
  ...extra.workers[0],
  id: 'hire',
  minutesToday: DAY_LENGTH_MINUTES,
  minutesUsed: 0,
});
assert.equal(combinedMinutesRemaining(extra), DAY_LENGTH_MINUTES + DAY_LENGTH_MINUTES);

const reset = reducer(state, { type: 'NEW_GAME' });
assert.deepEqual(reset, initialState);

const loaded = reducer(state, {
  type: 'LOAD_GAME',
  state: { ...createInitialState(), day: STARTING_DAY + STARTING_DAY, cash: STARTING_CASH / 2 },
});
assert.equal(loaded.day, STARTING_DAY + STARTING_DAY);
assert.equal(loaded.cash, STARTING_CASH / 2);

console.log('phase0 engine checks passed');
