/**
 * Headless checks for Phase 2 season, weather and growth gates.
 * Run: node scripts/phase2-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAY_LENGTH_MINUTES,
  DAYS_PER_YEAR,
  FROST_SHORT_MINUTES,
  STARTING_SEASON,
  TASK_MINUTES,
  WEATHER_FROST,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../src/data/constants.js';
import { calendarFromDay } from '../src/engine/calendar.js';
import {
  canPlanTask,
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { applyDecay } from '../src/engine/simulation.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

function end(state) {
  return reducer(state, { type: 'END_DAY' });
}

function withWeather(state, weather) {
  return {
    ...state,
    weather,
    workers: applyWeatherToWorkers(state.workers, weather),
  };
}

const day31 = calendarFromDay(31);
assert.equal(day31.season, 'summer');
assert.equal(day31.year, 1);

const day121 = calendarFromDay(DAYS_PER_YEAR + 1);
assert.equal(day121.season, STARTING_SEASON);
assert.equal(day121.year, 2);

let walked = createInitialState();
while (walked.day < 31) walked = end(walked);
assert.equal(walked.day, 31);
assert.equal(walked.season, 'summer');
assert.equal(walked.year, 1);

while (walked.day < DAYS_PER_YEAR + 1) walked = end(walked);
assert.equal(walked.day, 121);
assert.equal(walked.season, STARTING_SEASON);
assert.equal(walked.year, 2);

const rain = withWeather(createInitialState(), WEATHER_RAIN);
assert.equal(canPlanTask(rain, 'cutGreens').ok, false);
assert.match(canPlanTask(rain, 'cutGreens').reason, /Mowing/);
assert.equal(canPlanTask(rain, 'cutTees').ok, false);
assert.equal(canPlanTask(rain, 'rollGreens').ok, true);
assert.equal(canPlanTask(rain, 'changeCups').ok, true);

const storm = withWeather(createInitialState(), WEATHER_STORM);
assert.equal(canPlanTask(storm, 'rollGreens').ok, false);
assert.match(canPlanTask(storm, 'rollGreens').reason, /debris/i);
const afterDebris = reducer(storm, { type: 'PLAN_TASK', taskId: 'clearDebris' });
assert.equal(afterDebris.plannedTasks[0].minutes, TASK_MINUTES.clearDebris);
assert.equal(canPlanTask(afterDebris, 'rollGreens').ok, true);
assert.equal(canPlanTask(afterDebris, 'cutGreens').ok, false);

const frost = withWeather(createInitialState(), WEATHER_FROST);
assert.equal(combinedMinutesRemaining(frost), DAY_LENGTH_MINUTES - FROST_SHORT_MINUTES);

const startQuality = 55;
const summerLoss = startQuality - applyDecay(startQuality, 'summer');
const winterLoss = startQuality - applyDecay(startQuality, 'winter');
assert.ok(winterLoss < summerLoss);

let rolling = createInitialState();
let previousForecast = rolling.forecast;
let mismatch = false;
for (let i = 0; i < 80; i += 1) {
  rolling = end(rolling);
  if (rolling.weather !== previousForecast) mismatch = true;
  previousForecast = rolling.forecast;
}
assert.equal(mismatch, true);

console.log('phase2 checks passed');
