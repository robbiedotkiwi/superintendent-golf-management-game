/**
 * Step 2 week run: review, overfill, person filter, own-mower casuals.
 * Run: node scripts/week-review-check.mjs
 */
import assert from 'node:assert/strict';
import {
  FORECAST_DAYS,
  GROUNDSMASTER_ID,
  PLAYER_ID,
  PLAYER_QUALITY_SKILL,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  VOLUNTEER_ID,
  WEATHER_FINE,
} from '../src/data/constants.js';
import { claimedMinutesByMachine, conditionOf } from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { meanQuality } from '../src/engine/holes.js';
import { jobMinutes } from '../src/engine/jobs.js';
import { daysSinceLastWorked } from '../src/engine/neglect.js';
import { canBookCasual, getDayTasks, weekDays, weekStartDay } from '../src/engine/week.js';
import {
  deriveJobRow,
  jobsThatWontFit,
  personCapacityForDay,
  rowsForPerson,
} from '../src/engine/weekGrid.js';
import { aggregateWeekJobs } from '../src/engine/weekReview.js';

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

function ownMowerOf(state) {
  return (state.casualPool ?? []).find((item) => item.ownMower);
}

function standardCasualOf(state) {
  return (state.casualPool ?? []).find((item) => !item.ownMower);
}

function endDay(state) {
  return withFineWeek(reducer(state, { type: 'END_DAY' }));
}

let state = withFineWeek(createInitialState());
const days = weekDays(state.day);
for (const day of days) {
  state = plan(state, 'cutGreens', day, PLAYER_ID);
  state = plan(state, 'rakeBunkers', day, PLAYER_ID);
}
const ranSummaries = [];
while (weekStartDay(state.day) === 1) {
  state = endDay(state);
  ranSummaries.push(state.log.at(-1));
}
assert.equal(ranSummaries.length, 7);
assert.equal(state.pendingWeekReview, true);
assert.ok(state.lastWeekReview);
const summed = aggregateWeekJobs(ranSummaries);
assert.equal(state.lastWeekReview.jobs.planned, summed.planned);
assert.equal(state.lastWeekReview.jobs.completed, summed.completed);
assert.equal(state.lastWeekReview.jobs.dropped, summed.dropped);
assert.ok(state.lastWeek);
assert.equal(weekStartDay(state.lastWeek.weekStart), 1);
console.log('GATE WR1/WR9 PASS week review matches seven day summaries, lastWeek populated');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = plan(state, 'handWater', 1, PLAYER_ID);
state = plan(state, 'rollGreens', 1, PLAYER_ID);
state = plan(state, 'rakeBunkers', 1, PLAYER_ID);
state = plan(state, 'cutTees', 1, PLAYER_ID);
assert.ok(getDayTasks(state, 1).length >= 5, 'overfill ticks are allowed');
const playerBar = personCapacityForDay(state, 1).find((item) => item.id === PLAYER_ID);
assert.ok(playerBar.overfilled);
const wontFit = jobsThatWontFit(state, 1);
assert.ok(wontFit.length >= 1);
state = endDay(state);
const summary = state.log.at(-1);
const droppedTime = (summary.dropped ?? []).filter((item) => item.reason === 'time');
assert.equal(droppedTime.length, wontFit.length);
assert.deepEqual(
  droppedTime.map((item) => item.taskId).sort(),
  wontFit.map((item) => item.taskId).sort(),
);
console.log('GATE WR2 PASS overfill stays plannable, bar is over, resolveDay drops the jobs that will not fit');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = endDay(state);
assert.equal(daysSinceLastWorked(state, 'greens'), 1);
state = plan(state, 'cutTees', 2, PLAYER_ID);
state = plan(state, 'rollGreens', 2, PLAYER_ID);
state = plan(state, 'rakeBunkers', 2, PLAYER_ID);
state = plan(state, 'handWater', 2, PLAYER_ID);
state = plan(state, 'cutFairways', 2, PLAYER_ID);
state = plan(state, 'cutGreens', 2, PLAYER_ID);
assert.ok(jobsThatWontFit(state, 2).some((item) => item.taskId === 'cutGreens'));
state = endDay(state);
assert.ok(state.log.at(-1).dropped.some((item) => item.taskId === 'cutGreens' && item.reason === 'time'));
assert.equal(daysSinceLastWorked(state, 'greens'), 2);
while (weekStartDay(state.day) === 1) {
  state = endDay(state);
}
assert.ok(state.lastWeekReview);
assert.ok(state.lastWeekReview.jobs.dropped >= 1);
assert.equal(state.lastWeekReview.daysSince.greens, daysSinceLastWorked(state, 'greens'));
console.log('GATE WR3 PASS dropped jobs show in the week review and push days-since');

state = withFineWeek(createInitialState());
state = plan(state, 'rakeBunkers', 1, VOLUNTEER_ID);
state = plan(state, 'cutGreens', 1, PLAYER_ID);
const playerRows = rowsForPerson(state, PLAYER_ID).map((row) => row.taskId);
const volunteerRows = rowsForPerson(state, VOLUNTEER_ID).map((row) => row.taskId);
const allRows = rowsForPerson(state, 'all').map((row) => row.taskId);
assert.ok(playerRows.includes('cutGreens'));
assert.ok(!playerRows.includes('rakeBunkers'));
assert.ok(volunteerRows.includes('rakeBunkers'));
assert.ok(allRows.includes('cutGreens') && allRows.includes('rakeBunkers'));
console.log('GATE WR4 PASS person filter shows only that worker’s rows, all restores');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
const greensRow = deriveJobRow(state, { taskId: 'cutGreens', surface: 'greens', label: 'Mow greens' });
const monday = greensRow.cells.find((cell) => cell.day === 1);
assert.ok(monday.planned);
assert.equal(monday.minutes, jobMinutes(state, 'cutGreens', monday.tasks[0].holes));
console.log('GATE WR5 PASS cell minutes match jobMinutes');

state = withFineWeek(createInitialState());
const own = ownMowerOf(state);
assert.ok(own);
const ownTuned = {
  ...state,
  casualPool: state.casualPool.map((item) =>
    item.id === own.id ? { ...item, qualitySkill: PLAYER_QUALITY_SKILL, speedSkill: 3 } : item,
  ),
};
let withOwn = reducer(ownTuned, { type: 'BOOK_CASUAL', casualId: own.id, day: 1 });
withOwn = plan(withOwn, 'cutFairways', 1, own.id);
const ownJob = getDayTasks(withOwn, 1).find((item) => item.taskId === 'cutFairways');
assert.ok(ownJob);
assert.equal(ownJob.ownMower, true);
assert.equal(ownJob.machineId, null);
assert.equal(claimedMinutesByMachine(withOwn)[GROUNDSMASTER_ID], undefined);
const conditionBefore = conditionOf(withOwn, GROUNDSMASTER_ID);
const qualityBefore = meanQuality(withOwn, 'fairways');
withOwn = endDay(withOwn);
assert.equal(conditionOf(withOwn, GROUNDSMASTER_ID), conditionBefore);
assert.ok(meanQuality(withOwn, 'fairways') > qualityBefore);
const ownGain = meanQuality(withOwn, 'fairways') - qualityBefore;

let withPlayer = plan(withFineWeek(createInitialState()), 'cutFairways', 1, PLAYER_ID);
const playerJob = getDayTasks(withPlayer, 1).find((item) => item.taskId === 'cutFairways');
assert.ok(playerJob.machineId);
const playerBefore = meanQuality(withPlayer, 'fairways');
withPlayer = endDay(withPlayer);
const playerGain = meanQuality(withPlayer, 'fairways') - playerBefore;
assert.ok(ownGain < playerGain, `own-mower gain ${ownGain} should be below own gear ${playerGain}`);
console.log('GATE WR6 PASS own-mower casual skips course machines and cuts a little worse');

state = withFineWeek(createInitialState());
state = reducer(state, { type: 'BOOK_CASUAL', casualId: own.id, day: 1 });
const greensAttempt = plan(state, 'cutGreens', 1, own.id);
assert.equal(getDayTasks(greensAttempt, 1).some((item) => item.taskId === 'cutGreens'), false);
const teesAttempt = plan(state, 'cutTees', 1, own.id);
assert.equal(getDayTasks(teesAttempt, 1).some((item) => item.taskId === 'cutTees'), false);
console.log('GATE WR7 PASS own-mower casuals cannot take greens or tees');

state = withFineWeek(createInitialState());
const standard = standardCasualOf(state);
assert.ok(standard);
let booked = reducer(state, { type: 'BOOK_CASUAL', casualId: own.id, day: 1 });
booked = reducer(booked, { type: 'BOOK_CASUAL', casualId: own.id, day: 2 });
assert.equal(canBookCasual(booked, own.id, 3).ok, false);
booked = reducer(booked, { type: 'BOOK_CASUAL', casualId: standard.id, day: 1 });
booked = reducer(booked, { type: 'BOOK_CASUAL', casualId: standard.id, day: 2 });
assert.equal(canBookCasual(booked, standard.id, 3).ok, false);
console.log('GATE WR8 PASS both casual types use the same two-day weekly cap');

const afterWeek = withFineWeek(createInitialState());
let rolling = afterWeek;
for (const day of weekDays(1)) {
  rolling = plan(rolling, 'cutGreens', day, PLAYER_ID);
}
while (weekStartDay(rolling.day) === 1) rolling = endDay(rolling);
assert.equal(rolling.pendingWeekReview, true);
assert.ok(rolling.lastWeekReview);
assert.ok(rolling.lastWeek);
const dismissed = reducer(rolling, { type: 'DISMISS_WEEK_REVIEW' });
assert.equal(dismissed.pendingWeekReview, false);
console.log('GATE WR9b PASS week review dismisses');

console.log('week review checks passed');
