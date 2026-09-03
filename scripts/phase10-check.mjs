/**
 * Headless checks for Phase 10 polish gates.
 * Run: node scripts/phase10-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAYS_PER_YEAR,
  SAVE_VERSION,
  SOUND_DEFAULT_ON,
  STARTING_CASH,
  STARTING_DAY,
  STARTING_QUALITY_GREENS,
  STARTING_WEATHER,
} from '../src/data/constants.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { playBirds, playMower, prefersReducedMotion } from '../src/engine/sound.js';

assert.equal(SOUND_DEFAULT_ON, false);
assert.equal(createInitialState().soundEnabled, false);
assert.equal(createInitialState().tutorialDone, false);
assert.equal(createInitialState().saveVersion, SAVE_VERSION);

const tutorial = readFileSync(new URL('../src/components/Tutorial.jsx', import.meta.url), 'utf8');
assert.match(tutorial, /DAY_LENGTH_MINUTES/);
assert.match(tutorial, /start the day/i);

let play = createInitialState();
play = reducer(play, { type: 'DISMISS_TUTORIAL' });
play = reducer(play, { type: 'SET_TOURNAMENTS', count: 0 });
assert.equal(play.tutorialDone, true);
assert.equal(canPlanTask(play, 'cutGreens').ok, true);
play = reducer(play, { type: 'PLAN_TASK', taskId: 'cutGreens' });
play = reducer(play, { type: 'END_DAY' });
assert.equal(play.day, STARTING_DAY + 1);

const on = reducer(createInitialState(), { type: 'TOGGLE_SOUND' });
assert.equal(on.soundEnabled, true);
const off = reducer(on, { type: 'TOGGLE_SOUND' });
assert.equal(off.soundEnabled, false);
playMower(false);
playBirds(false);
assert.equal(prefersReducedMotion(), false);

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /mower-run/);

const old = migrateSave({
  day: 9,
  cash: 1234,
  surfaces: { greens: { quality: 41 }, tees: { quality: 40 }, fairways: { quality: 40 }, rough: { quality: 40 }, bunkers: { quality: 40 } },
});
assert.equal(old.day, 9);
assert.equal(old.cash, 1234);
assert.equal(old.surfaces.greens.quality, 41);
assert.equal(old.saveVersion, SAVE_VERSION);
assert.equal(old.soundEnabled, SOUND_DEFAULT_ON);
assert.equal(migrateSave({ day: 2, cash: STARTING_CASH }), null);
assert.equal(migrateSave(null), null);

let year = {
  ...createInitialState(),
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  weather: STARTING_WEATHER,
};
year = reducer(year, { type: 'SET_TOURNAMENTS', count: 0 });
for (let i = 0; i < DAYS_PER_YEAR; i += 1) {
  if (year.pendingTournamentSetup) year = reducer(year, { type: 'SET_TOURNAMENTS', count: 0 });
  year = reducer(year, { type: 'END_DAY' });
}
assert.equal(year.day, STARTING_DAY + DAYS_PER_YEAR);
assert.equal(year.year, 2);
assert.equal(year.pendingYearReview, true);
assert.ok(year.lastYearReview);
assert.equal(year.lastYearReview.conditions.length, DAYS_PER_YEAR);
assert.equal(year.lastYearReview.year, 1);
assert.ok(year.lastYearReview.staffRetained.some((item) => item.id === 'player'));
assert.equal(typeof year.lastYearReview.maintenanceSpent, 'number');
assert.equal(typeof year.lastYearReview.capitalSpent, 'number');
const dismissed = reducer(year, { type: 'DISMISS_YEAR_REVIEW' });
assert.equal(dismissed.pendingYearReview, false);

const reviewUi = readFileSync(new URL('../src/components/YearReview.jsx', import.meta.url), 'utf8');
assert.match(reviewUi, /Year .* in review/);
assert.match(reviewUi, /staffRetained/);
assert.match(reviewUi, /maintenanceSpent/);

assert.equal(STARTING_QUALITY_GREENS > 0, true);
console.log('phase10 checks passed');
