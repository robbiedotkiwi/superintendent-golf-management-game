/**
 * Person-first week plan: unified minutes, reassign, irrigation table, carry-over.
 * Run: node scripts/week-plan-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CASUAL_OWN_MOWER_VS_CASUAL,
  CASUAL_OWN_MOWER_WAGE_MULT,
  CASUAL_WAGE_MULT,
  DAY_LENGTH_MINUTES,
  FORECAST_DAYS,
  GREENSMASTER_ID,
  PLAYER_ID,
  PLAYER_SPEED_SKILL,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  VOLUNTEER_ID,
  WEATHER_FINE,
} from '../src/data/constants.js';
import {
  combinedMinutesCapacity,
  combinedMinutesRemaining,
  combinedMinutesUsed,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { durationOnMachine } from '../src/engine/equipment.js';
import { holeSurface, meanQuality } from '../src/engine/holes.js';
import { daysSinceLastWorked } from '../src/engine/neglect.js';
import { getDayTasks, planViewState, weekDays, weekStartDay } from '../src/engine/week.js';
import {
  cellMinutesFor,
  daysMatchingWorker,
  deriveJobRow,
  displayCellMinutes,
  personCapacityForDay,
  rosterWorker,
  rowsForPerson,
} from '../src/engine/weekGrid.js';
import { timeBarLabel, timeBarOverflow, timeBarRemaining } from '../src/engine/timeBar.js';

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

function endDay(state) {
  return withFineWeek(reducer(state, { type: 'END_DAY' }));
}

const assignSrc = readFileSync(new URL('../src/engine/assignment.js', import.meta.url), 'utf8');
const mowingSrc = readFileSync(new URL('../src/engine/mowing.js', import.meta.url), 'utf8');
const gridSrc = readFileSync(new URL('../src/components/WeekPlanGrid.jsx', import.meta.url), 'utf8');
const weekGridSrc = readFileSync(new URL('../src/engine/weekGrid.js', import.meta.url), 'utf8');
const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(assignSrc, /durationForTask|mowingMinutes|baseTaskMinutes/);
assert.doesNotMatch(mowingSrc, /function mowingMinutes/);
assert.doesNotMatch(weekGridSrc, /jobMinutes/);
assert.doesNotMatch(turfSrc, /jobMinutes/);
assert.match(gridSrc, /useState\(PLAYER_ID\)/);
assert.match(gridSrc, /if \(everyone\) return/);
assert.match(gridSrc, /data-irrigation-table/);
assert.match(gridSrc, /data-irrigation-input/);
assert.match(gridSrc, /onSetWorker/);
console.log('GATE WP0 PASS durationForTask and mowingMinutes are gone; irrigation is its own table');

let state = withFineWeek(createInitialState());
const player = rosterWorker(state, PLAYER_ID);
const emptyRow = deriveJobRow(state, { taskId: 'cutGreens', surface: 'greens', label: 'Mow greens' });
const emptyMonday = emptyRow.cells.find((cell) => cell.day === 1);
assert.equal(emptyMonday.planned, false);
const beforeTick = displayCellMinutes(state, emptyRow, emptyMonday, player);
assert.equal(beforeTick, cellMinutesFor(state, 'cutGreens', player));
assert.ok(beforeTick > 0);
assert.equal(beforeTick, durationOnMachine(state, 'cutGreens', player));
state = plan(state, 'cutGreens', 1, PLAYER_ID);
const plannedRow = deriveJobRow(state, { taskId: 'cutGreens', surface: 'greens', label: 'Mow greens' });
const monday = plannedRow.cells.find((cell) => cell.day === 1);
assert.equal(monday.minutes, beforeTick);
assert.equal(monday.tasks[0].minutes, beforeTick);
const playerBar = personCapacityForDay(state, 1).find((item) => item.id === PLAYER_ID);
assert.equal(playerBar.used, beforeTick);
const view = planViewState(state);
assert.equal(combinedMinutesUsed(view), beforeTick);
assert.equal(timeBarRemaining(combinedMinutesUsed(view), combinedMinutesCapacity(view)), combinedMinutesRemaining(view));
console.log('GATE WP1 PASS cell minutes, person bar and TimeBar share durationOnMachine');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = plan(state, 'handWater', 1, PLAYER_ID);
state = plan(state, 'rollGreens', 1, PLAYER_ID);
state = plan(state, 'rakeBunkers', 1, PLAYER_ID);
state = plan(state, 'cutTees', 1, PLAYER_ID);
const overView = planViewState(state);
const used = combinedMinutesUsed(overView);
const capacity = combinedMinutesCapacity(overView);
assert.ok(used > capacity);
assert.equal(timeBarRemaining(used, capacity), 0);
assert.ok(timeBarOverflow(used, capacity) > 0);
assert.equal(timeBarLabel(used, capacity), `${capacity}/${capacity} · ${timeBarOverflow(used, capacity)} over`);
assert.doesNotMatch(timeBarLabel(used, capacity), /-/);
assert.ok(combinedMinutesRemaining(overView) < 0);
console.log('GATE WP2 PASS TimeBar remaining clamps at 0 and names the overflow');

assert.equal(rowsForPerson(state, PLAYER_ID).some((row) => row.taskId === 'cutGreens'), true);
assert.match(gridSrc, /Overview only/);
console.log('GATE WP3 PASS Everyone is overview-only in the grid; person mode can plan');

state = withFineWeek(createInitialState());
state = plan(state, 'rakeBunkers', 1, VOLUNTEER_ID);
assert.equal(getDayTasks(state, 1).length, 1);
assert.equal(getDayTasks(state, 1)[0].workerId, VOLUNTEER_ID);
state = reducer(state, { type: 'SET_TASK_WORKER', taskId: 'rakeBunkers', workerId: PLAYER_ID, day: 1 });
assert.equal(getDayTasks(state, 1).length, 1);
assert.equal(getDayTasks(state, 1)[0].workerId, PLAYER_ID);
console.log('GATE WP4 PASS ticking a taken cell reassigns and does not duplicate');

state = withFineWeek(createInitialState());
state = plan(state, 'rakeBunkers', 1, PLAYER_ID);
state = plan(state, 'rakeBunkers', 2, PLAYER_ID);
state = plan(state, 'rakeBunkers', 3, VOLUNTEER_ID);
let rakeRow = deriveJobRow(state, { taskId: 'rakeBunkers', surface: 'bunkers', label: 'Rake bunkers' });
assert.equal(rakeRow.mixedWorker, true);
assert.deepEqual(daysMatchingWorker(rakeRow, PLAYER_ID), [1, 2]);
assert.deepEqual(daysMatchingWorker(rakeRow, VOLUNTEER_ID), [3]);
for (const day of daysMatchingWorker(rakeRow, PLAYER_ID)) {
  state = reducer(state, { type: 'SET_TASK_WORKER', taskId: 'rakeBunkers', workerId: VOLUNTEER_ID, day });
}
assert.equal(getDayTasks(state, 1)[0].workerId, VOLUNTEER_ID);
assert.equal(getDayTasks(state, 2)[0].workerId, VOLUNTEER_ID);
assert.equal(getDayTasks(state, 3)[0].workerId, VOLUNTEER_ID);
state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = plan(state, 'handWater', 1, PLAYER_ID);
state = plan(state, 'rollGreens', 1, PLAYER_ID);
state = plan(state, 'rakeBunkers', 1, VOLUNTEER_ID);
const overfilled = reducer(state, { type: 'SET_TASK_WORKER', taskId: 'rakeBunkers', workerId: PLAYER_ID, day: 1 });
assert.equal(getDayTasks(overfilled, 1).find((item) => item.taskId === 'rakeBunkers')?.workerId, PLAYER_ID);
console.log('GATE WP5 PASS row worker reassigns matching days and SET_TASK_WORKER allows overfill');

assert.match(gridSrc, /data-irrigation-table/);
assert.doesNotMatch(gridSrc.slice(gridSrc.indexOf('rows.map'), gridSrc.indexOf('data-irrigation-table')), /IRRIGATED_SURFACES/);
console.log('GATE WP6 PASS irrigation stays on its own table while a person is selected');

assert.equal(CASUAL_OWN_MOWER_VS_CASUAL, 1.5);
assert.equal(CASUAL_OWN_MOWER_WAGE_MULT, CASUAL_WAGE_MULT * 1.5);
console.log('GATE WP7 PASS own-mower day rate is 1.5× a standard casual');

state = withFineWeek(createInitialState());
for (const day of weekDays(state.day)) {
  state = plan(state, 'cutGreens', day, PLAYER_ID);
}
while (weekStartDay(state.day) === 1) {
  state = endDay(state);
}
assert.equal(weekStartDay(state.day), 8);
assert.ok(state.lastWeekReview);
assert.equal(state.lastWeekReview.daysSince.greens, daysSinceLastWorked(state, 'greens'));
const nextGreens = deriveJobRow(state, { taskId: 'cutGreens', surface: 'greens', label: 'Mow greens' });
assert.equal(nextGreens.daysSince, `Greens — ${daysSinceLastWorked(state, 'greens')} days`);
const greenAfter = holeSurface(state, 1, 'greens');
assert.equal(greenAfter.lastMownDay, 7);
assert.ok(meanQuality(state, 'greens') > 0);
assert.ok(greenAfter.lastAngle != null || greenAfter.patternWear >= 0);
assert.ok((state.machineHours?.[GREENSMASTER_ID] ?? 0) > 0);
console.log('GATE WP8 PASS week-review days-since matches next week’s grid; hole/machine facts survive roll');

const start = createInitialState();
const you = start.workers.find((worker) => worker.id === PLAYER_ID);
const jobs = [
  'cutGreens',
  'cutTees',
  'cutFairways',
  'cutRough',
  'rollGreens',
  'rakeBunkers',
  'handWater',
];
console.log(`PLAYER_SPEED=${PLAYER_SPEED_SKILL} DAY_LENGTH=${DAY_LENGTH_MINUTES}`);
let weekTotal = 0;
for (const taskId of jobs) {
  const minutes = durationOnMachine(start, taskId, you);
  weekTotal += minutes * 6;
  const daysIfDaily = Math.round((minutes / DAY_LENGTH_MINUTES) * 100);
  console.log(`START ${taskId}=${minutes} (${daysIfDaily}% of a 480-min day)`);
}
console.log(`START six-day total if those seven jobs ran every work day=${weekTotal}`);
const greensTeesFairways =
  durationOnMachine(start, 'cutGreens', you) +
  durationOnMachine(start, 'cutTees', you) +
  durationOnMachine(start, 'cutFairways', you);
console.log(`START greens+tees+fairways=${greensTeesFairways} remaining=${DAY_LENGTH_MINUTES - greensTeesFairways}`);

console.log('week plan checks passed');
