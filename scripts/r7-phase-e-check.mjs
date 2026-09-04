/**
 * Round 7 Phase E: one cash account and the season grant.
 * Run: node scripts/r7-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAYS_PER_SEASON,
  GRANT_BONUS_AMOUNT,
  GRANT_BONUS_THRESHOLD,
  GRANT_FORECAST_KIND,
  GRANT_FORECAST_LEAD_DAYS,
  GRANT_FORECAST_SUBJECT,
  GRANT_PENALTY_AMOUNT,
  SEASON_GRANT_BASE,
  STARTING_CAPITAL_BUDGET,
  STARTING_CASH,
  STARTING_MAINTENANCE_BUDGET,
  STARTING_OPENING_CASH,
  STARTING_WEATHER,
  WALK_BEHIND_COST,
} from '../src/data/constants.js';
import { closeSeason, grantAdjustment, seasonGrant } from '../src/engine/budget.js';
import { daysUntilSeasonEnd } from '../src/engine/calendar.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';

assert.equal(SEASON_GRANT_BASE, 30000);
assert.equal(GRANT_FORECAST_LEAD_DAYS, 7);
assert.equal(GRANT_BONUS_THRESHOLD, 5);
assert.equal(GRANT_BONUS_AMOUNT, 4000);
assert.equal(GRANT_PENALTY_AMOUNT, 4000);
assert.equal(STARTING_OPENING_CASH, STARTING_CASH + STARTING_MAINTENANCE_BUDGET + STARTING_CAPITAL_BUDGET);
assert.equal(daysUntilSeasonEnd(24), GRANT_FORECAST_LEAD_DAYS);
assert.equal(seasonGrant(62, 50), 33600);

const start = createInitialState();
assert.equal(start.cash, STARTING_OPENING_CASH);
assert.equal(Object.hasOwn(start, 'maintenanceBudget'), false);
assert.equal(Object.hasOwn(start, 'capitalBudget'), false);
assert.equal(start.grantForecast, null);

const bought = reducer(start, { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
assert.equal(bought.cash, start.cash - WALK_BEHIND_COST);
assert.ok(bought.ownedMachines.includes('walkBehindReel'));

const covered = closeSeason({
  ...start,
  cash: -10000,
  satisfaction: 50,
  gmStanding: 50,
  leasedMachines: [],
  loan: null,
  grantForecast: null,
});
assert.equal(covered.grant, seasonGrant(50, 50));
assert.equal(covered.state.cash, -10000 + seasonGrant(50, 50));
assert.equal(covered.insolvent, false);

const broke = closeSeason({
  ...start,
  cash: -80000,
  satisfaction: 50,
  gmStanding: 50,
  leasedMachines: [],
  loan: null,
  grantForecast: null,
});
assert.equal(broke.insolvent, true);
assert.equal(broke.state.insolventStreak, 1);

assert.equal(grantAdjustment(50, 55), GRANT_BONUS_AMOUNT);
assert.equal(grantAdjustment(50, 45), -GRANT_PENALTY_AMOUNT);
assert.equal(grantAdjustment(50, 52), 0);

const bonus = closeSeason({
  ...start,
  cash: 0,
  satisfaction: 62,
  gmStanding: 50,
  leasedMachines: [],
  loan: null,
  grantForecast: { season: 'spring', year: 1, satisfaction: 57, grant: 30000 },
});
assert.equal(bonus.adjustment, GRANT_BONUS_AMOUNT);
assert.equal(bonus.state.cash, seasonGrant(62, 50) + GRANT_BONUS_AMOUNT);
assert.equal(bonus.state.grantForecast, null);

const penalty = closeSeason({
  ...start,
  cash: 0,
  satisfaction: 52,
  gmStanding: 50,
  leasedMachines: [],
  loan: null,
  grantForecast: { season: 'spring', year: 1, satisfaction: 57, grant: 30000 },
});
assert.equal(penalty.adjustment, -GRANT_PENALTY_AMOUNT);
assert.equal(penalty.state.cash, seasonGrant(52, 50) - GRANT_PENALTY_AMOUNT);

let forecast = {
  ...createInitialState(),
  day: DAYS_PER_SEASON - GRANT_FORECAST_LEAD_DAYS,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
assert.equal(daysUntilSeasonEnd(forecast.day + 1), GRANT_FORECAST_LEAD_DAYS);
forecast = reducer(forecast, { type: 'END_DAY' });
assert.equal(forecast.day, DAYS_PER_SEASON - GRANT_FORECAST_LEAD_DAYS + 1);
assert.equal(forecast.grantForecast?.satisfaction, forecast.satisfaction);
assert.ok(forecast.inbox.some((item) => item.kind === GRANT_FORECAST_KIND && item.subject === GRANT_FORECAST_SUBJECT));
assert.match(forecast.inbox.find((item) => item.kind === GRANT_FORECAST_KIND).body, /you'll receive/);

const old = migrateSave({
  day: 4,
  cash: 1000,
  maintenanceBudget: 2000,
  capitalBudget: 3000,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(old.cash, 6000);
assert.equal(old.maintenanceBudget, undefined);
assert.equal(old.capitalBudget, undefined);

const refused = migrateSave({
  day: 4,
  cash: 'corrupt',
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(refused, null);

const hud = readFileSync(new URL('../src/components/Hud.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(hud, /maintenanceBudget/);
assert.doesNotMatch(hud, /capitalBudget/);
const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /formatMoney\(state\.cash\)/);
assert.doesNotMatch(office, /maintenanceBudget/);
assert.doesNotMatch(office, /capitalBudget/);
const shed = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(shed, /maintenanceBudget/);
assert.doesNotMatch(shed, /capitalBudget/);

console.log(`GRANT_AT_50=${seasonGrant(50, 50)} GRANT_AT_62=${seasonGrant(62, 50)} OPENING_CASH=${STARTING_OPENING_CASH}`);
console.log('GATE E1 PASS only one money value exists in state and in the UI');
console.log('GATE E2 PASS every cost is charged to cash');
console.log('GATE E3 PASS the season grant is added before solvency; a covered deficit is not insolvent');
console.log('GATE E4 PASS the forecast email arrives seven days before season end with the projected figure');
console.log('GATE E5 PASS beating the threshold pays the bonus; slipping below applies the penalty');
console.log('round 7 phase E checks passed');
