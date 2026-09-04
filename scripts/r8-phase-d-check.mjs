#!/usr/bin/env node
/**
 * Round 8 Phase D: fuel tank, burn from resolved runtime, shortfall, mid-job stop.
 * Run: node scripts/r8-phase-d-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  FORECAST_FUEL_LOOKBACK_DAYS,
  FUEL_BULK_MIN_LITRES,
  FUEL_BULK_PRICE_PER_L,
  FUEL_BURN_L_PER_HOUR,
  FUEL_PRICE_PER_L,
  FUEL_START,
  FUEL_TANK_CAPACITY,
  GREENSMASTER_ID,
  MACHINE_CLASS_ROLLER,
} from '../src/data/constants.js';
import { getMachine } from '../src/data/equipment.js';
import { projectedFuelSpend } from '../src/engine/forecast.js';
import {
  burnLitresPerHour,
  canBuyFuel,
  fuelCost,
  litresForMinutes,
  plannedDayFuel,
} from '../src/engine/fuel.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { holeSurface } from '../src/engine/holes.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(FUEL_TANK_CAPACITY, 400);
assert.equal(FUEL_START, 250);
assert.equal(FUEL_PRICE_PER_L, 2.9);
assert.equal(FUEL_BULK_PRICE_PER_L, 2.35);
assert.equal(FUEL_BULK_MIN_LITRES, 200);
assert.equal(FUEL_BURN_L_PER_HOUR.walkBehindReel, 1.5);
assert.equal(FUEL_BURN_L_PER_HOUR.roller, 2.0);
assert.equal(MACHINE_CLASS_ROLLER, 'roller');
assert.equal(FORECAST_FUEL_LOOKBACK_DAYS, 7);

assert.equal(fuelCost(200), Math.round(200 * FUEL_BULK_PRICE_PER_L));
assert.equal(fuelCost(199), Math.round(199 * FUEL_PRICE_PER_L));

const start = createInitialState();
assert.equal(start.fuelLitres, FUEL_START);
assert.equal(canBuyFuel(start, 200).ok, false);
assert.match(canBuyFuel(start, 200).reason, /overfill/);
const filled = reducer(start, { type: 'BUY_FUEL', litres: 150 });
assert.equal(filled.fuelLitres, FUEL_TANK_CAPACITY);
assert.equal(filled.cash, start.cash - fuelCost(150));
assert.equal(reducer(filled, { type: 'BUY_FUEL', litres: 1 }).fuelLitres, FUEL_TANK_CAPACITY);

const greens = getMachine(GREENSMASTER_ID);
assert.equal(burnLitresPerHour(greens), 1.5);

let one = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
const oneJob = one.plannedTasks[0];
const expectedBurn = litresForMinutes(greens, oneJob.minutes);
one = reducer(one, { type: 'END_DAY' });
assert.ok(Math.abs((start.fuelLitres - one.fuelLitres) - expectedBurn) < 1e-6);
assert.equal(one.fuelSpendLog.at(-1).spend, Math.round(expectedBurn * FUEL_PRICE_PER_L));

let dryPlan = reducer({ ...start, fuelLitres: 0.1 }, { type: 'PLAN_TASK', taskId: 'cutGreens' });
const warn = plannedDayFuel(dryPlan);
assert.ok(warn.shortfall > 0);
assert.equal(warn.affected.taskId, 'cutGreens');

let mid = reducer({ ...start, fuelLitres: 2 }, { type: 'PLAN_TASK', taskId: 'cutGreens' });
mid = reducer(mid, { type: 'END_DAY' });
const summary = mid.log.at(-1);
assert.ok(summary.fuelStop);
assert.ok(summary.fuelStop.completedHoles.length >= 1);
assert.ok(summary.fuelStop.remainingHoles.length >= 1);
assert.ok(
  holeSurface(mid, summary.fuelStop.completedHoles[0], 'greens').quality >
    holeSurface(mid, summary.fuelStop.remainingHoles[0], 'greens').quality,
);
assert.equal(mid.fuelLitres, 0);

const later = {
  ...start,
  day: 8,
  fuelSpendLog: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, spend: 70 })),
};
assert.ok(projectedFuelSpend(later) > 0);

const shed = read('src/components/Shed.jsx');
assert.match(shed, /FUEL_TANK_CAPACITY/);
assert.match(shed, /onBuyFuel/);
const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /plannedDayFuel/);
assert.match(dialog, /Short \{fuel\.shortfall/);
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
assert.equal(old.fuelLitres, FUEL_START);

console.log('r8-phase-d-check: ok');
