/**
 * Jobs in the grid, Start Day uses sim day, machine budgets, hours-on-minutes.
 * Run: node scripts/week-jobs-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAY_LENGTH_MINUTES,
  FORECAST_DAYS,
  GROUNDSMASTER_ID,
  PLAYER_ID,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  TURF_TAB_IRRIGATION,
  TURF_TAB_PATTERNS,
  TURF_TAB_WEEK,
  VOLUNTEER_ID,
  WEAR_PER_USE,
  WEATHER_FINE,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { visibleTurfTabs } from '../src/engine/section.js';
import {
  dayLengthMinutes,
  dropInvalidDayTasks,
  getDayTasks,
  irrigationForPlanDay,
  planDayChrome,
  planViewState,
  planningDayOf,
  setDayTasks,
  simViewState,
  weekdayLabel,
} from '../src/engine/week.js';
import {
  WEEK_GRID_JOBS,
  machineCapacityForDay,
  personCapacityForDay,
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

function endDay(state) {
  return withFineWeek(reducer(state, { type: 'END_DAY' }));
}

const jobIds = WEEK_GRID_JOBS.map((job) => job.taskId);
assert.ok(jobIds.includes('changeCups'));
assert.ok(jobIds.includes('handWater'));
assert.ok(jobIds.includes('checkMoistureGreens'));
assert.ok(jobIds.includes('checkMoistureTees'));
assert.ok(jobIds.includes('checkMoistureFairways'));
assert.deepEqual(visibleTurfTabs(), [TURF_TAB_WEEK, TURF_TAB_IRRIGATION, TURF_TAB_PATTERNS]);

const gridSrc = readFileSync(new URL('../src/components/WeekPlanGrid.jsx', import.meta.url), 'utf8');
const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
const irrigationSrc = readFileSync(new URL('../src/components/IrrigationWeekTab.jsx', import.meta.url), 'utf8');
const dialogSrc = readFileSync(new URL('../src/components/StartDayDialog.jsx', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(gridSrc, /data-irrigation-table/);
assert.match(irrigationSrc, /data-irrigation-table/);
assert.match(turfSrc, /IrrigationWeekTab/);
assert.match(dialogSrc, /Start \{weekday\}/);
assert.match(appSrc, /simViewState/);
assert.match(appSrc, /today=\{today\}/);
assert.doesNotMatch(dialogSrc, /onSelectDay/);

let state = withFineWeek(createInitialState());
state = plan(state, 'changeCups', 1, PLAYER_ID);
state = plan(state, 'checkMoistureGreens', 1, PLAYER_ID);
state = plan(state, 'handWater', 1, PLAYER_ID);
const cups = getDayTasks(state, 1).find((item) => item.taskId === 'changeCups');
const moisture = getDayTasks(state, 1).find((item) => item.taskId === 'checkMoistureGreens');
const water = getDayTasks(state, 1).find((item) => item.taskId === 'handWater');
assert.ok(cups && moisture && water);
assert.ok(cups.minutes > 0);
assert.ok(moisture.minutes > 0);
assert.ok(water.minutes > 0);
const playerBar = personCapacityForDay(state, 1).find((item) => item.id === PLAYER_ID);
assert.equal(playerBar.used, cups.minutes + moisture.minutes + water.minutes);
assert.ok(playerBar.used > 0);
console.log('GATE WJ1 PASS change cups, moisture and hand water are grid jobs and consume person minutes');

state = withFineWeek(createInitialState());
state = plan(state, 'cutGreens', 1, PLAYER_ID);
state = reducer(state, { type: 'SET_PLANNING_DAY', day: 5 });
state = reducer(state, { type: 'SET_IRRIGATION', surface: 'greens', mm: 8, day: 5 });
assert.equal(irrigationForPlanDay(state, 5).greens, 8);
assert.notEqual(irrigationForPlanDay(state, 1).greens, 8);
console.log('GATE WJ2 PASS irrigation tab days stay editable with a person plan in place');

state = withFineWeek(createInitialState());
state = endDay(state);
assert.equal(state.day, 2);
assert.equal(weekdayLabel(state.day), 'Tue');
state = plan(state, 'rakeBunkers', 2, PLAYER_ID);
state = plan(state, 'cutGreens', 5, PLAYER_ID);
state = reducer(state, { type: 'SET_PLANNING_DAY', day: 5 });
assert.equal(planningDayOf(state), 5);
assert.equal(weekdayLabel(planningDayOf(state)), 'Fri');
assert.ok(planDayChrome(state, 2).isToday);
assert.ok(planDayChrome(state, 5).isPlanningAhead);
assert.equal(planViewState(state).plannedTasks[0]?.taskId, 'cutGreens');
const today = simViewState(state);
assert.equal(today.day, 2);
assert.equal(planningDayOf(today), 2);
assert.equal(today.plannedTasks[0]?.taskId, 'rakeBunkers');
assert.ok(today.plannedTasks.every((item) => item.taskId !== 'cutGreens'));
const resolved = endDay(state);
assert.ok(resolved.log.at(-1).done.some((item) => item.taskId === 'rakeBunkers'));
assert.ok(!resolved.log.at(-1).done.some((item) => item.taskId === 'cutGreens'));
assert.ok(getDayTasks(resolved, 5).some((item) => item.taskId === 'cutGreens'));
console.log('GATE WJ3 PASS Start Day on Tuesday with Friday selected resolves Tuesday');

state = withFineWeek(createInitialState());
state = plan(state, 'cutRough', 3, PLAYER_ID);
state = plan(state, 'cutFairways', 3, VOLUNTEER_ID);
const rough = getDayTasks(state, 3).find((item) => item.taskId === 'cutRough');
const fairways = getDayTasks(state, 3).find((item) => item.taskId === 'cutFairways');
assert.equal(rough.machineId, GROUNDSMASTER_ID);
assert.equal(fairways.machineId, GROUNDSMASTER_ID);
const machineDayLen = dayLengthMinutes(state, 3);
assert.equal(machineDayLen, DAY_LENGTH_MINUTES);
const machineBar = machineCapacityForDay(state, 3, PLAYER_ID).find((item) => item.id === GROUNDSMASTER_ID);
assert.ok(machineBar);
assert.equal(machineBar.used, rough.minutes + fairways.minutes);
assert.ok(machineBar.used > machineBar.capacity);
assert.ok(machineBar.overfilled);
assert.ok(machineBar.wontFit >= 1);
const dropped = dropInvalidDayTasks(state, 3).dropped.filter(
  (item) => item.reason === 'time' && item.fit === 'machine',
);
assert.ok(dropped.length >= 1);
state = endDay(state);
state = endDay(state);
assert.equal(state.day, 3);
const ran = endDay(state);
const doneMow = ran.log.at(-1).done.filter((item) => item.taskId === 'cutRough' || item.taskId === 'cutFairways');
assert.equal(doneMow.length, 1, 'machine overfill drops a job at resolve');
console.log('GATE WJ4 PASS shared machine overfill is red, named, and drops in resolveDay');

function hoursAfter(minutes) {
  let next = withFineWeek(createInitialState());
  next = {
    ...next,
    machineHours: { ...next.machineHours, [GROUNDSMASTER_ID]: 0 },
  };
  next = plan(next, 'cutRough', 1, PLAYER_ID);
  const tasks = getDayTasks(next, 1).map((item) =>
    item.taskId === 'cutRough' ? { ...item, minutes } : item,
  );
  next = setDayTasks(next, 1, tasks);
  next = endDay(next);
  return next.machineHours[GROUNDSMASTER_ID];
}

const hours311 = hoursAfter(311);
const hours155 = hoursAfter(155);
assert.ok(Math.abs(hours311 - 311 / 60) < 1e-9);
assert.ok(Math.abs(hours155 - 155 / 60) < 1e-9);
assert.ok(Math.abs(hours311 / hours155 - 311 / 155) < 1e-9);
console.log('GATE WJ5 PASS machine hours accrue on minutes run');

let reel = withFineWeek(createInitialState());
reel = plan(reel, 'cutGreens', 1, PLAYER_ID);
const greensMachine = reel.plannedTasks[0].machineId;
const greensMinutes = reel.plannedTasks[0].minutes;
assert.ok(greensMinutes > 0);
reel = endDay(reel);
assert.ok(
  Math.abs((reel.machineWear[greensMachine] ?? 0) - WEAR_PER_USE * (greensMinutes / DAY_LENGTH_MINUTES)) < 1e-6,
);
console.log('GATE WJ6 PASS reel wear scales with minutes run');

console.log('week jobs checks passed');
