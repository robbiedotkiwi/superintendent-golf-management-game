/**
 * Fixes Round 2 Phase F gates.
 * Run: node scripts/fix-phase-f-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FORECAST_ACCURACY,
  FORECAST_DAYS,
  FORECAST_OPACITY_MIN,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { createRng } from '../src/engine/rng.js';
import { deriveForecastStrip, forecastOpacity, makeWeatherQueue } from '../src/engine/weather.js';

assert.equal(FORECAST_DAYS, 7);
assert.equal(FORECAST_ACCURACY.length, 7);
assert.equal(FORECAST_ACCURACY[0], 0.9);
assert.equal(FORECAST_ACCURACY[6], 0.25);

const start = createInitialState();
assert.equal(start.forecastStrip.length, FORECAST_DAYS);
assert.equal(start.weatherQueue.length, FORECAST_DAYS);
for (const day of start.forecastStrip) {
  assert.equal(typeof day.type, 'string');
  assert.equal(typeof day.windSpeed, 'number');
  assert.equal(typeof day.windDir, 'string');
}
assert.equal(start.forecast, start.forecastStrip[0].type);

const trials = 800;
const hits = [0, 0, 0, 0, 0, 0, 0];
for (let i = 0; i < trials; i += 1) {
  const rng = createRng(1000 + i);
  const queue = makeWeatherQueue(1, rng);
  const strip = deriveForecastStrip(queue, 1, rng);
  for (let d = 0; d < 7; d += 1) {
    if (strip[d].type === queue[d].type) hits[d] += 1;
  }
}
assert.ok(hits[0] / trials > 0.8, `tomorrow accuracy ${hits[0] / trials}`);
assert.ok(hits[6] / trials < 0.45, `day seven accuracy ${hits[6] / trials}`);
assert.ok(forecastOpacity(0) > forecastOpacity(6));
assert.ok(forecastOpacity(6) >= FORECAST_OPACITY_MIN);

let rolling = start;
const firstStrip = JSON.stringify(rolling.forecastStrip);
rolling = reducer(rolling, { type: 'END_DAY' });
assert.notEqual(JSON.stringify(rolling.forecastStrip), firstStrip);
assert.equal(rolling.forecastStrip.length, 7);

const dialog = readFileSync(new URL('../src/components/StartDayDialog.jsx', import.meta.url), 'utf8');
assert.match(dialog, /<ForecastStrip/);
const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(turf, /<ForecastStrip/);
const stripSrc = readFileSync(new URL('../src/components/ForecastStrip.jsx', import.meta.url), 'utf8');
assert.match(stripSrc, /id="forecast-strip"/);
assert.match(stripSrc, /forecastOpacity/);
assert.doesNotMatch(stripSrc, /%/);
assert.match(stripSrc, /windSpeed/);

console.log('fix phase F checks passed');
