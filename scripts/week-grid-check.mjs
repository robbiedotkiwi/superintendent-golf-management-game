/**
 * Step 1 week grid: derived from weekPlan.days tasks.
 * Run: node scripts/week-grid-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FORECAST_DAYS,
  PLAYER_ID,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  TURF_SHOW_LEGACY_TABS,
  TURF_TAB_WEEK,
  VOLUNTEER_ID,
  WEATHER_FINE,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import {
  canEditPlanDay,
  getDayTasks,
  weekDays,
  weekStartDay,
} from '../src/engine/week.js';
import {
  deriveJobRow,
  personCapacityForDay,
  workerAvailableOnDay,
} from '../src/engine/weekGrid.js';

const fineDay = {
  type: WEATHER_FINE,
  tempMin: STARTING_TEMP_MIN,
  tempMax: STARTING_TEMP_MAX,
  windSpeed: STARTING_WIND_SPEED,
  windDir: STARTING_WIND_DIR,
};

function withFineWeek(state) {
  return {
    ...state,
    weather: WEATHER_FINE,
    weatherQueue: Array.from({ length: FORECAST_DAYS }, () => ({ ...fineDay })),
    forecastStrip: Array.from({ length: FORECAST_DAYS }, () => ({ ...fineDay })),
  };
}

function plan(state, taskId, day, workerId) {
  return reducer(state, {
    type: 'PLAN_TASK',
    taskId,
    day,
    workerId,
    confirmDamaging: true,
  });
}

let state = withFineWeek(createInitialState());
assert.equal(state.tabs.turf, TURF_TAB_WEEK);
assert.equal(TURF_SHOW_LEGACY_TABS, false);
assert.equal(state.lastWeek, null);

const days = weekDays(state.day);
for (const day of days) {
  state = plan(state, 'cutGreens', day, PLAYER_ID);
}
for (const day of days) {
  const tasks = getDayTasks(state, day);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].taskId, 'cutGreens');
  assert.equal(tasks[0].workerId, PLAYER_ID);
}

const ran = [];
for (let i = 0; i < 7; i += 1) {
  const today = state.day;
  const planned = getDayTasks(state, today).map((item) => item.taskId);
  assert.ok(planned.includes('cutGreens'), `day ${today} still has the greens cut`);
  state = withFineWeek(reducer(state, { type: 'END_DAY' }));
  const summary = state.log.at(-1);
  assert.ok(summary.done.some((item) => item.taskId === 'cutGreens'), `day ${today} ran the greens cut`);
  ran.push(today);
}
assert.equal(ran.length, 7);
assert.ok(state.lastWeek);
assert.equal(weekStartDay(state.lastWeek.weekStart), 1);
assert.equal(getDayTasks({ ...state, day: 1, weekPlan: state.lastWeek }, 1)[0]?.taskId, 'cutGreens');
console.log('GATE WG1 PASS planned week is what resolveDay runs, lastWeek snapshotted');

state = withFineWeek(createInitialState());
state = plan(state, 'rakeBunkers', 1, PLAYER_ID);
state = reducer(state, { type: 'SET_PLANNING_DAY', day: 3 });
state = plan(state, 'rakeBunkers', 3, PLAYER_ID);
let row = deriveJobRow(state, { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' });
assert.equal(row.mixedWorker, false);
assert.equal(row.cells.filter((cell) => cell.planned).length, 2);

state = reducer(state, { type: 'SET_PLANNING_DAY', day: 3 });
state = reducer(state, { type: 'SET_TASK_WORKER', taskId: 'rakeBunkers', workerId: VOLUNTEER_ID, day: 3 });
row = deriveJobRow(state, { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' });
assert.equal(row.mixedWorker, true);
assert.equal(row.workerId, null);
assert.equal(getDayTasks(state, 1)[0].workerId, PLAYER_ID);
assert.equal(getDayTasks(state, 3)[0].workerId, VOLUNTEER_ID);
console.log('GATE WG2/WG3 PASS map-planned jobs group, mixed worker is not overwritten');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = plan(state, 'handWater', 1, PLAYER_ID);
state = plan(state, 'rollGreens', 1, PLAYER_ID);
state = plan(state, 'rakeBunkers', 1, PLAYER_ID);
const bars = personCapacityForDay(state, 1);
const playerBar = bars.find((item) => item.id === PLAYER_ID);
assert.ok(playerBar);
assert.ok(playerBar.overfilled, 'player bar shows overfill before Start Day');
assert.ok(playerBar.used > playerBar.capacity);
console.log('GATE WG4 PASS overfill is visible in the grid before Start Day');

state = withFineWeek(createInitialState());
for (const day of days) {
  state = plan(state, 'rakeBunkers', day, VOLUNTEER_ID);
}
row = deriveJobRow(state, { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' });
const volunteerCells = row.cells;
assert.equal(volunteerCells.filter((cell) => cell.unassigned).length, 6);
assert.equal(volunteerCells.filter((cell) => cell.planned && !cell.unassigned).length, 1);
assert.equal(workerAvailableOnDay(state, VOLUNTEER_ID, 3), true);
assert.equal(workerAvailableOnDay(state, VOLUNTEER_ID, 1), false);
state = withFineWeek(reducer(state, { type: 'END_DAY' }));
assert.equal(state.log.at(-1).done.some((item) => item.taskId === 'rakeBunkers'), false);
console.log('GATE WG5 PASS volunteer off-days are unassigned and do not run');

state = withFineWeek(createInitialState());
const casual = state.casualPool[0];
assert.ok(casual);
state = reducer(state, { type: 'BOOK_CASUAL', casualId: casual.id, day: 1 });
state = reducer(state, { type: 'BOOK_CASUAL', casualId: casual.id, day: 2 });
for (const day of days) {
  state = plan(state, 'rakeBunkers', day, casual.id);
}
row = deriveJobRow(state, { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' });
assert.equal(row.cells.filter((cell) => cell.unassigned).length, 5);
assert.equal(row.cells.filter((cell) => cell.planned && !cell.unassigned).length, 2);
assert.equal(workerAvailableOnDay(state, casual.id, 1), true);
assert.equal(workerAvailableOnDay(state, casual.id, 4), false);
state = withFineWeek(reducer(state, { type: 'END_DAY' }));
assert.ok(state.log.at(-1).done.some((item) => item.taskId === 'rakeBunkers'));
console.log('GATE WG6 PASS casuals only run on their two booked days');

state = withFineWeek(createInitialState());
for (const day of days) {
  state = plan(state, 'cutGreens', day, PLAYER_ID);
}
assert.equal(canEditPlanDay(state, 2).ok, true);
state = withFineWeek(reducer(state, { type: 'END_DAY' }));
assert.equal(state.day, 2);
assert.equal(canEditPlanDay(state, 1).ok, false);
assert.equal(canEditPlanDay(state, 2).ok, true);
assert.equal(canEditPlanDay(state, 7).ok, true);
state = plan(state, 'rakeBunkers', 7, PLAYER_ID);
assert.equal(getDayTasks(state, 7).some((item) => item.taskId === 'rakeBunkers'), true);
console.log('GATE WG7 PASS Monday freezes, Tue-Sun stay editable');

while (weekStartDay(state.day) === 1) {
  state = withFineWeek(reducer(state, { type: 'END_DAY' }));
}
assert.equal(weekStartDay(state.day), 8);
assert.ok(state.lastWeek);
assert.ok(getDayTasks({ ...state, day: 1, weekPlan: state.lastWeek }, 1).some((item) => item.taskId === 'cutGreens'));
console.log('GATE WG8 PASS rolling the week populates lastWeek');

const migrated = migrateSave({
  day: 4,
  cash: 12,
  surfaces: {
    greens: { quality: 40 },
    tees: { quality: 40 },
    fairways: { quality: 40 },
    rough: { quality: 40 },
    bunkers: { quality: 40 },
  },
});
assert.equal(migrated.lastWeek, null);

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /TURF_TAB_WEEK/);
assert.match(turfSrc, /TURF_SHOW_LEGACY_TABS/);
assert.match(turfSrc, /WeekPlanGrid/);
assert.doesNotMatch(turfSrc, /<ForecastStrip/);
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const gameScreen = appSrc.slice(appSrc.indexOf('function GameScreen'));
assert.doesNotMatch(gameScreen, /\bdispatch\b/);
const constantsSrc = readFileSync(new URL('../src/data/constants.js', import.meta.url), 'utf8');
assert.doesNotMatch(constantsSrc, /courseArea/);

console.log('week grid checks passed');
