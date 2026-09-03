/**
 * Fixes Round 2 Phase B gates.
 * Run: node scripts/fix-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import {
  NEGLECT_GM_MULTIPLIER,
  NEGLECT_GOLFER_AFTER,
  NEGLECT_SATISFACTION_PENALTY,
  NEGLECT_THRESHOLD,
  STARTING_DAY,
  STARTING_WEATHER,
  SURFACE_KEYS,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { daysSinceLastWorked, isDoubleNeglected, neglectSatisfactionDrain } from '../src/engine/neglect.js';
import { migrateSave } from '../src/engine/save.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

function endKeep(state) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: STARTING_WEATHER,
    workers: applyWeatherToWorkers(next.workers, STARTING_WEATHER),
  };
}

function skipDays(count) {
  let state = createInitialState();
  for (let i = 0; i < count; i += 1) state = endKeep(state);
  return state;
}

const start = createInitialState();
for (const surface of SURFACE_KEYS) {
  assert.equal(daysSinceLastWorked(start, surface), 0);
}
assert.equal(start.surfaces.greens.lastMownDay, STARTING_DAY);
assert.equal(start.surfaces.bunkers.lastRakedDay, STARTING_DAY);

let cut = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens' });
cut = endKeep(cut);
assert.equal(cut.surfaces.greens.lastMownDay, STARTING_DAY);
assert.equal(daysSinceLastWorked(cut, 'greens'), 1);

const saved = migrateSave(JSON.parse(JSON.stringify(cut)));
assert.equal(saved.surfaces.greens.lastMownDay, STARTING_DAY);
assert.equal(daysSinceLastWorked(saved, 'greens'), 1);

const three = skipDays(3);
assert.equal(daysSinceLastWorked(three, 'greens'), NEGLECT_THRESHOLD.greens + NEGLECT_GOLFER_AFTER);
assert.ok(three.inbox.some((item) => item.from === 'golfer' && item.kind === 'greens' && /greens/i.test(item.body)));
assert.equal(
  three.inbox.some((item) => item.from === 'golfer' && item.kind === 'rough'),
  false,
);

const ten = skipDays(10);
assert.equal(daysSinceLastWorked(ten, 'rough'), 10);
assert.ok(daysSinceLastWorked(ten, 'rough') <= NEGLECT_THRESHOLD.rough);
assert.equal(
  ten.inbox.some((item) => item.from === 'golfer' && item.kind === 'rough'),
  false,
);
assert.ok(ten.inbox.some((item) => item.from === 'golfer' && item.kind === 'greens'));

const eleven = skipDays(11);
assert.ok(eleven.inbox.some((item) => item.from === 'golfer' && item.kind === 'rough' && /rough/i.test(item.body)));

const doubleGreens = NEGLECT_THRESHOLD.greens * NEGLECT_GM_MULTIPLIER;
const gmDay = skipDays(doubleGreens);
assert.equal(daysSinceLastWorked(gmDay, 'greens'), doubleGreens);
assert.ok(isDoubleNeglected(gmDay, 'greens'));
assert.ok(gmDay.inbox.some((item) => item.from === 'gm' && item.kind === 'neglect' && /greens/i.test(item.body)));
assert.equal(neglectSatisfactionDrain(gmDay), NEGLECT_SATISFACTION_PENALTY);

const beforeDrain = skipDays(doubleGreens - 1);
assert.equal(neglectSatisfactionDrain(beforeDrain), 0);

console.log('fix phase B checks passed');
