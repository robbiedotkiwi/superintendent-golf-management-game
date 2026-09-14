#!/usr/bin/env node
/**
 * Round 8 Phase D: fuel is a cash cost, not a tank.
 * Run: node scripts/r8-phase-d-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  FORECAST_FUEL_LOOKBACK_DAYS,
  FUEL_BURN_L_PER_HOUR,
  FUEL_PRICE_PER_L,
  GREENSMASTER_ID,
  MACHINE_CLASS_ROLLER,
} from '../src/data/constants.js';
import { getMachine } from '../src/data/equipment.js';
import { projectedFuelSpend } from '../src/engine/forecast.js';
import {
  burnLitresPerHour,
  fuelCost,
  litresForMinutes,
  plannedDayFuel,
} from '../src/engine/fuel.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(FUEL_PRICE_PER_L, 2.9);
assert.equal(FUEL_BURN_L_PER_HOUR.walkBehindReel, 1.5);
assert.equal(FUEL_BURN_L_PER_HOUR.roller, 2.0);
assert.equal(MACHINE_CLASS_ROLLER, 'roller');
assert.equal(FORECAST_FUEL_LOOKBACK_DAYS, 7);
assert.equal(fuelCost(10), Math.round(10 * FUEL_PRICE_PER_L));

const start = createInitialState();
assert.equal(start.fuelLitres, undefined);

const greens = getMachine(GREENSMASTER_ID);
assert.equal(burnLitresPerHour(greens), 1.5);

let one = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
const oneJob = one.plannedTasks[0];
const expectedBurn = litresForMinutes(greens, oneJob.minutes);
const quote = plannedDayFuel(one);
assert.equal(quote.shortfall, 0);
assert.equal(quote.cost, fuelCost(expectedBurn));
one = reducer(one, { type: 'END_DAY' });
assert.equal(one.fuelSpendLog.at(-1).spend, Math.round(expectedBurn * FUEL_PRICE_PER_L));
assert.equal(one.log.at(-1).fuelStop, null);

const later = {
  ...start,
  day: 8,
  fuelSpendLog: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, spend: 70 })),
};
assert.ok(projectedFuelSpend(later) > 0);

const shed = read('src/components/Shed.jsx');
assert.doesNotMatch(shed, /FUEL_TANK_CAPACITY/);
assert.doesNotMatch(shed, /onBuyFuel/);
const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /plannedDayFuel/);
assert.doesNotMatch(dialog, /Short \{fuel\.shortfall/);
const forecast = read('src/components/CashForecast.jsx');
assert.match(forecast, /Projected fuel spend/);

const old = migrateSave({
  day: 4,
  cash: 60000,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(old.fuelLitres, undefined);

console.log('r8-phase-d-check: ok');
