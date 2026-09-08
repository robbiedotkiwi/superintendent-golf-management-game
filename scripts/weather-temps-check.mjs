/**
 * Weather: no heavy rain, daily min/max temps, cold-morning tip.
 * Run: node scripts/weather-temps-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLD_TEMP_C,
  FROST_SHORT_MINUTES,
  FROST_TEMP_MIN_CAP,
  MOISTURE_ET_TEMP_HIGH,
  MOISTURE_ET_TEMP_LOW,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  WEATHER_FINE,
  WEATHER_FROST,
  WEATHER_STORM,
  WEATHER_WEIGHTS,
} from '../src/data/constants.js';
import { COLD_WEATHER_TIP_TITLE, coldWeatherCopy, WEATHER_LABELS } from '../src/data/events.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import {
  applyTempsForWeather,
  canonicalWeather,
  formatTempRange,
  isColdWeather,
  moistureEtTempFactor,
  rollTrueDay,
} from '../src/engine/weather.js';
import { createRng } from '../src/engine/rng.js';

assert.equal(WEATHER_LABELS.storm, 'Storm');
assert.equal(WEATHER_LABELS.heavyRain, undefined);
for (const season of Object.keys(WEATHER_WEIGHTS)) {
  assert.equal(WEATHER_WEIGHTS[season].heavyRain, undefined);
  assert.ok(WEATHER_WEIGHTS[season].storm > 0);
}

const start = createInitialState();
assert.equal(start.weather, WEATHER_FINE);
assert.equal(start.tempMin, STARTING_TEMP_MIN);
assert.equal(start.tempMax, STARTING_TEMP_MAX);
assert.equal(start.heat, undefined);
assert.equal(start.coldWeatherTipDone, false);
assert.ok(start.tempMax > start.tempMin);
for (const item of start.forecastStrip) {
  assert.equal(typeof item.tempMin, 'number');
  assert.equal(typeof item.tempMax, 'number');
  assert.ok(item.tempMax >= item.tempMin + 5);
  assert.notEqual(item.type, 'heavyRain');
}

assert.equal(canonicalWeather('heavyRain'), WEATHER_STORM);
const frostTemps = applyTempsForWeather({ tempMin: 9, tempMax: 16 }, WEATHER_FROST);
assert.ok(frostTemps.tempMin <= FROST_TEMP_MIN_CAP);

assert.equal(moistureEtTempFactor(8, 8), MOISTURE_ET_TEMP_LOW);
assert.equal(moistureEtTempFactor(24, 24), MOISTURE_ET_TEMP_HIGH);
assert.equal(formatTempRange(11, 19), '11–19°');

assert.equal(isColdWeather({ weather: WEATHER_FINE, tempMin: 11 }), false);
assert.equal(isColdWeather({ weather: WEATHER_FINE, tempMin: COLD_TEMP_C }), true);
assert.equal(isColdWeather({ weather: WEATHER_FROST, tempMin: 8 }), true);

assert.match(coldWeatherCopy(2), /Overnight low 2/);
assert.match(coldWeatherCopy(2), new RegExp(String(FROST_SHORT_MINUTES)));
assert.equal(COLD_WEATHER_TIP_TITLE, 'Cold morning');

const dismissed = reducer(start, { type: 'DISMISS_COLD_WEATHER_TIP' });
assert.equal(dismissed.coldWeatherTipDone, true);

const migrated = migrateSave({
  day: 12,
  weather: 'heavyRain',
  heat: 'hot',
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(migrated.weather, WEATHER_STORM);
assert.equal(migrated.tempMin, 16);
assert.equal(migrated.tempMax, 26);

let sawFrost = false;
for (let seed = 1; seed <= 4000 && !sawFrost; seed += 1) {
  const day = rollTrueDay('winter', createRng(seed), 20);
  if (day.type === WEATHER_FROST) {
    sawFrost = true;
    assert.ok(day.tempMin <= FROST_TEMP_MIN_CAP);
  }
}
assert.ok(sawFrost, 'winter can roll frost');

const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(appSrc, /COLD_WEATHER_TIP_TITLE/);
assert.match(appSrc, /DISMISS_COLD_WEATHER_TIP/);
const sidebarSrc = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebarSrc, /formatTempRange/);
assert.doesNotMatch(sidebarSrc, /HEAT_LABELS/);

console.log('GATE W1 PASS weather list has no heavy rain');
console.log('GATE W2 PASS days carry min/max temps');
console.log('GATE W3 PASS frost caps the overnight low');
console.log('GATE W4 PASS old heavy-rain saves become storm with migrated temps');
console.log('GATE W5 PASS cold-morning tip copy and dismiss');
console.log('weather temp checks passed');
