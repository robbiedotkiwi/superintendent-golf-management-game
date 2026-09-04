#!/usr/bin/env node
/**
 * Round 8 Phase B: sidebar cash and Office money forecast.
 * Run: node scripts/r8-phase-b-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  FORECAST_FUEL_LOOKBACK_DAYS,
  POND_DOSE_COST,
  PUSH_ROTARY_ID,
  SIDEBAR_FIT_HEIGHT,
} from '../src/data/constants.js';
import { leaseCost, loanRepayment, seasonGrant } from '../src/engine/budget.js';
import { daysUntilSeasonEnd } from '../src/engine/calendar.js';
import { projectedFuelSpend, seasonCashForecast } from '../src/engine/forecast.js';
import { createInitialState } from '../src/engine/gameState.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(FORECAST_FUEL_LOOKBACK_DAYS, 7);
assert.equal(SIDEBAR_FIT_HEIGHT, 720);

const sidebar = read('src/components/Sidebar.jsx');
assert.match(sidebar, /Condition/);
assert.match(sidebar, /formatMoney\(state\.cash\)/);
assert.ok(sidebar.indexOf('Condition') < sidebar.indexOf('formatMoney(state.cash)'));

const office = read('src/components/Office.jsx');
assert.match(office, /<CashForecast/);
const forecastSrc = read('src/components/CashForecast.jsx');
assert.match(forecastSrc, />Cash now</);
assert.match(forecastSrc, /Committed outgoings to season end/);
assert.match(forecastSrc, /Projected fuel spend/);
assert.match(forecastSrc, /Expected grant/);
assert.match(forecastSrc, /Projected closing balance/);
assert.match(forecastSrc, /Goes negative on day \{forecast\.insolventDay\}/);
assert.match(forecastSrc, /estimate · moves with satisfaction/);
assert.match(forecastSrc, /FORECAST_FUEL_LOOKBACK_DAYS/);

const start = createInitialState();
assert.deepEqual(start.fuelSpendLog, []);
const remaining = daysUntilSeasonEnd(start.day);
assert.equal(remaining, 30);

const hired = {
  ...start,
  cash: 250,
  workers: [
    ...start.workers,
    { id: 'hire-1', name: 'Test Hand', wage: 200, isVolunteer: false },
  ],
};
const wages = seasonCashForecast(hired);
assert.equal(wages.wages.length, 1);
assert.equal(wages.wages[0].amount, 200 * remaining);
assert.equal(wages.insolventDay, 2);
assert.match(String(wages.insolventDay), /2/);

const highSat = seasonCashForecast({ ...start, satisfaction: 80 });
const lowSat = seasonCashForecast({ ...start, satisfaction: 40 });
assert.equal(highSat.grant, seasonGrant(80, start.gmStanding));
assert.equal(lowSat.grant, seasonGrant(40, start.gmStanding));
assert.ok(highSat.grant > lowSat.grant);

const leased = seasonCashForecast({ ...start, leasedMachines: [PUSH_ROTARY_ID] });
assert.equal(leased.leases[0].amount, leaseCost(PUSH_ROTARY_ID));

const dosing = seasonCashForecast({ ...start, pondDosing: true });
assert.equal(dosing.dosing.amount, POND_DOSE_COST * remaining);

const loaned = seasonCashForecast({
  ...start,
  loan: { amount: 1000, repay: loanRepayment(1000), dueSeason: 'summer', dueYear: 1 },
});
assert.equal(loaned.loan.amount, loanRepayment(1000));

const delivered = seasonCashForecast({
  ...start,
  pendingDeliveries: [{ id: 'used-x', machineId: PUSH_ROTARY_ID, arrivesDay: 3, price: 5000 }],
});
assert.equal(delivered.deliveries[0].amount, 0);
assert.equal(delivered.deliveries[0].prepaid, 5000);

assert.equal(projectedFuelSpend(start), 0);
assert.equal(wages.fuel, 0);
const burning = {
  ...start,
  day: 8,
  fuelSpendLog: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, spend: 70 })),
};
assert.equal(projectedFuelSpend(burning), Math.round((70 * 7) / FORECAST_FUEL_LOOKBACK_DAYS) * daysUntilSeasonEnd(8));

const emptyFuel = seasonCashForecast(start);
assert.equal(emptyFuel.fuel, 0);
assert.equal(emptyFuel.closing, emptyFuel.cashNow + emptyFuel.grant);

console.log('r8-phase-b-check: ok');
