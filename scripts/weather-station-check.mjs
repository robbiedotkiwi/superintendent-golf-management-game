/**
 * Purchasable weather station: ET, dew point, RH, VPD for irrigation.
 * Run: node scripts/weather-station-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MOISTURE_PER_MM,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  WEATHER_FINE,
  WEATHER_RAIN,
  WEATHER_STORM,
  WEATHER_STATION_COST,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { moistureFromMm } from '../src/engine/irrigation.js';
import { surfaceEtMm, surfaceEtPoints } from '../src/engine/moisture.js';
import { migrateSave } from '../src/engine/save.js';
import {
  canBuyWeatherStation,
  dewPointC,
  relativeHumidity,
  stationAtmosphere,
} from '../src/engine/weather.js';

const start = createInitialState();
assert.equal(start.hasWeatherStation, false);
assert.equal(canBuyWeatherStation(start).ok, true);
assert.equal(canBuyWeatherStation({ ...start, cash: 100 }).ok, false);

const bought = reducer(start, { type: 'BUY_WEATHER_STATION' });
assert.equal(bought.hasWeatherStation, true);
assert.equal(bought.cash, start.cash - WEATHER_STATION_COST);
assert.ok((bought.yearRecord?.capitalSpent ?? 0) >= WEATHER_STATION_COST);
assert.equal(canBuyWeatherStation(bought).ok, false);
const again = reducer(bought, { type: 'BUY_WEATHER_STATION' });
assert.equal(again.cash, bought.cash);

const broke = reducer({ ...start, cash: 100 }, { type: 'BUY_WEATHER_STATION' });
assert.equal(broke.hasWeatherStation, false);
assert.equal(broke.cash, 100);

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
assert.equal(migrated.hasWeatherStation, false);

assert.ok(dewPointC(15, 50) < 15);
assert.ok(Math.abs(dewPointC(15, 100) - 15) < 0.05);

const calmFine = relativeHumidity({ weather: WEATHER_FINE, windSpeed: 4 });
const windyFine = relativeHumidity({ weather: WEATHER_FINE, windSpeed: 20 });
const rainy = relativeHumidity({ weather: WEATHER_RAIN, windSpeed: 8 });
assert.ok(rainy > calmFine);
assert.ok(windyFine < calmFine);

const dayOne = stationAtmosphere(start);
assert.equal(dayOne.rh, relativeHumidity(start));
assert.ok(dayOne.dewPoint < (STARTING_TEMP_MIN + STARTING_TEMP_MAX) / 2);
assert.ok(dayOne.vpd > 0);

assert.ok(surfaceEtMm(start, 'greens') > 0);
assert.ok(surfaceEtMm(start, 'tees') > 0);
assert.ok(surfaceEtMm(start, 'fairways') > 0);
assert.equal(surfaceEtMm({ ...start, weather: WEATHER_STORM }, 'greens'), 0);
assert.ok(
  Math.abs(moistureFromMm('tees', surfaceEtMm(start, 'tees')) - surfaceEtPoints(start, 'tees')) < 1e-9,
);
assert.equal(MOISTURE_PER_MM.green, 1.4);

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /WeatherStation/);
assert.match(turfSrc, /onBuyWeatherStation/);
assert.doesNotMatch(turfSrc, /dispatch/);

const stationSrc = readFileSync(new URL('../src/components/WeatherStation.jsx', import.meta.url), 'utf8');
assert.match(stationSrc, /formatMoney\(WEATHER_STATION_COST\)/);
assert.match(stationSrc, /dew point/);
assert.match(stationSrc, /data-weather-station-et/);

const sliderSrc = readFileSync(new URL('../src/components/IrrigationMmSlider.jsx', import.meta.url), 'utf8');
assert.match(sliderSrc, /hasWeatherStation/);
assert.match(sliderSrc, /data-irrigation-et/);

const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(appSrc, /BUY_WEATHER_STATION/);
const gameScreen = appSrc.slice(appSrc.indexOf('function GameScreen'));
assert.doesNotMatch(gameScreen, /\bdispatch\b/);

const constantsSrc = readFileSync(new URL('../src/data/constants.js', import.meta.url), 'utf8');
assert.doesNotMatch(constantsSrc, /courseArea/);

console.log('GATE WS1 PASS buy spends cash and is one-shot');
console.log('GATE WS2 PASS old saves have no station');
console.log('GATE WS3 PASS RH, dew point and VPD come from the day');
console.log('GATE WS4 PASS ET mm matches the moisture drink');
console.log('GATE WS5 PASS readings stay behind the purchase in UI');
console.log('weather station checks passed');
