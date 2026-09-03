/**
 * Round 3 Phase A: day playout is presentation of an already-resolved day.
 * Run: node scripts/r3-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PLAYOUT_EMPTY_MS,
  PLAYOUT_END_HOLD_MS,
  PLAYOUT_MIN_EVENT_MS,
  PLAYOUT_MS_PER_MINUTE,
  PLAYOUT_SKIP_DEFAULT,
  PLAYOUT_SPEED_DEFAULT,
  PLAYOUT_SPEEDS,
  STARTING_QUALITY_GREENS,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  PLAYOUT_DONE,
  PLAYOUT_PLAYING,
  PLAYOUT_SKIPPED,
  buildPlayout,
  eventDurationMs,
  playoutSurfaces,
  shouldSkipPlayout,
  skipPlayout,
  tickPlayout,
} from '../src/engine/playout.js';
import { migrateSave } from '../src/engine/save.js';

function fingerprint(state) {
  return {
    day: state.day,
    season: state.season,
    cash: state.cash,
    rngSeed: state.rngSeed,
    weather: state.weather,
    satisfaction: state.satisfaction,
    maintenanceBudget: state.maintenanceBudget,
    capitalBudget: state.capitalBudget,
    pond: state.pond,
    moisture: state.moisture,
    greens: state.surfaces.greens.quality,
    tees: state.surfaces.tees.quality,
    fairways: state.surfaces.fairways.quality,
    rough: state.surfaces.rough.quality,
    bunkers: state.surfaces.bunkers.quality,
    logDays: state.log.map((item) => item.day),
    planned: state.plannedTasks,
  };
}

function planDay(seedState) {
  let next = seedState;
  next = reducer(next, { type: 'PLAN_TASK', taskId: 'cutGreens' });
  next = reducer(next, { type: 'PLAN_TASK', taskId: 'changeCups' });
  next = reducer(next, { type: 'PLAN_TASK', taskId: 'rakeBunkers' });
  return next;
}

function resolveOnce(state) {
  return reducer(state, { type: 'END_DAY' });
}

function watchFilm(summary) {
  let film = buildPlayout(summary);
  let guard = 0;
  while (film.status === PLAYOUT_PLAYING) {
    film = tickPlayout(film, 1_000_000, PLAYOUT_SPEED_DEFAULT);
    guard += 1;
    assert.ok(guard < 50, 'watch loop should finish');
  }
  return film;
}

const playoutSrc = readFileSync(new URL('../src/engine/playout.js', import.meta.url), 'utf8');
assert.doesNotMatch(playoutSrc, /resolveDay/);
assert.doesNotMatch(playoutSrc, /from '\.\/simulation/);
assert.doesNotMatch(playoutSrc, /from '\.\/gameState/);
assert.match(playoutSrc, /summary\?\.done/);

assert.deepEqual(PLAYOUT_SPEEDS, [1, 2, 4]);
assert.equal(PLAYOUT_SPEED_DEFAULT, 1);
assert.equal(PLAYOUT_SKIP_DEFAULT, false);
assert.equal(PLAYOUT_MS_PER_MINUTE, 12);
assert.equal(PLAYOUT_MIN_EVENT_MS, 480);
assert.equal(PLAYOUT_EMPTY_MS, 600);
assert.equal(PLAYOUT_END_HOLD_MS, 240);

const start = createInitialState();
assert.equal(start.playoutSpeed, PLAYOUT_SPEED_DEFAULT);
assert.equal(start.skipPlayout, PLAYOUT_SKIP_DEFAULT);

const migrated = migrateSave({
  day: 4,
  surfaces: { greens: { quality: 50 }, tees: { quality: 50 }, fairways: { quality: 50 }, rough: { quality: 45 }, bunkers: { quality: 40 } },
});
assert.equal(migrated.playoutSpeed, PLAYOUT_SPEED_DEFAULT);
assert.equal(migrated.skipPlayout, PLAYOUT_SKIP_DEFAULT);

const speedSet = reducer(start, { type: 'SET_PLAYOUT_SPEED', speed: 4 });
assert.equal(speedSet.playoutSpeed, 4);
assert.equal(speedSet.surfaces.greens.quality, STARTING_QUALITY_GREENS);
const badSpeed = reducer(speedSet, { type: 'SET_PLAYOUT_SPEED', speed: 3 });
assert.equal(badSpeed.playoutSpeed, 4);
const skipSet = reducer(start, { type: 'SET_SKIP_PLAYOUT', value: true });
assert.equal(skipSet.skipPlayout, true);
assert.equal(skipSet.day, start.day);

assert.equal(shouldSkipPlayout(true, false), true);
assert.equal(shouldSkipPlayout(false, true), true);
assert.equal(shouldSkipPlayout(false, false), false);

const plannedA = planDay(createInitialState());
const plannedB = planDay(createInitialState());
assert.deepEqual(fingerprint(plannedA), fingerprint(plannedB));

const watchedState = resolveOnce(plannedA);
const skippedState = resolveOnce(plannedB);
const watchedFilm = watchFilm(watchedState.log[watchedState.log.length - 1]);
const skippedFilm = skipPlayout(buildPlayout(skippedState.log[skippedState.log.length - 1]));

assert.equal(watchedFilm.status, PLAYOUT_DONE);
assert.equal(skippedFilm.status, PLAYOUT_SKIPPED);

const watchedPrint = fingerprint(watchedState);
const skippedPrint = fingerprint(skippedState);
console.log('WATCH', JSON.stringify(watchedPrint));
console.log('SKIP ', JSON.stringify(skippedPrint));
assert.deepEqual(watchedPrint, skippedPrint);
assert.deepEqual(watchedState, skippedState);
console.log('IDENTICAL: true');

const frozen = structuredClone(watchedState);
watchFilm(watchedState.log.at(-1));
skipPlayout(buildPlayout(skippedState.log.at(-1)));
assert.deepEqual(watchedState, frozen);

const film = buildPlayout(watchedState.log.at(-1));
assert.ok(film.events.length >= 2);
const first = film.events[0];
assert.equal(eventDurationMs(first, 1), Math.max(PLAYOUT_MIN_EVENT_MS, first.minutes * PLAYOUT_MS_PER_MINUTE));
assert.equal(eventDurationMs(first, 2), eventDurationMs(first, 1) / 2);
assert.equal(eventDurationMs(first, 4), eventDurationMs(first, 1) / 4);

const mid = tickPlayout(film, eventDurationMs(first, 1) / 2, 1);
assert.equal(mid.status, PLAYOUT_PLAYING);
assert.equal(mid.cursor, 0);
const surfacesBefore = playoutSurfaces(watchedState.log.at(-1), mid);
assert.equal(surfacesBefore.greens.quality, watchedState.log.at(-1).before.greens.quality);
const afterFirst = tickPlayout(film, eventDurationMs(first, 1), 1);
assert.equal(afterFirst.status, PLAYOUT_PLAYING);
assert.equal(afterFirst.cursor, 1);
const surfacesAfter = playoutSurfaces(watchedState.log.at(-1), afterFirst);
assert.equal(surfacesAfter.greens.quality, first.after);

const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(appSrc, /buildPlayout/);
assert.match(appSrc, /skipPlayout/);
assert.match(appSrc, /onEndDay=\{\(\) => dispatch\(\{ type: 'END_DAY' \}\)\}/);
assert.doesNotMatch(appSrc, /resolveDay\(/);

console.log('round 3 phase A checks passed');
