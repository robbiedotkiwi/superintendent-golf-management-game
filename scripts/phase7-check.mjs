/**
 * Headless checks for Phase 7 money, inbox and satisfaction gates.
 * Run: node scripts/phase7-check.mjs
 */
import assert from 'node:assert/strict';
import {
  BUNKER_NEGLECT_DAYS,
  DAYS_PER_SEASON,
  GM_MEETING_MINUTES,
  GM_MEETING_SKIP_STANDING,
  GM_STANDING_START,
  INSOLVENT_DISMISS_STREAK,
  LEASE_RATE,
  LOAN_INTEREST,
  LOAN_LIMIT_MULTIPLIER,
  SATISFACTION_START,
  STARTING_CASH,
  STARTING_WEATHER,
  WALK_BEHIND_COST,
} from '../src/data/constants.js';
import {
  capitalGrant,
  leaseCost,
  loanRepayment,
  maintenanceGrant,
  maxLoan,
} from '../src/engine/budget.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { courseCondition } from '../src/engine/simulation.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: extras.weather ?? STARTING_WEATHER,
    season: extras.season ?? next.season,
    workers: applyWeatherToWorkers(next.workers, extras.weather ?? STARTING_WEATHER),
  };
}

const start = createInitialState();
assert.equal(start.maintenanceBudget, maintenanceGrant(SATISFACTION_START, GM_STANDING_START));
assert.equal(start.capitalBudget, capitalGrant(SATISFACTION_START, GM_STANDING_START));
assert.ok(start.maintenanceBudget !== start.capitalBudget);

const bought = reducer(start, { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
assert.equal(bought.capitalBudget, start.capitalBudget - WALK_BEHIND_COST);
assert.equal(bought.cash, STARTING_CASH);
assert.equal(bought.maintenanceBudget, start.maintenanceBudget);

let season = {
  ...createInitialState(),
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  maintenanceBudget: 4000,
  capitalBudget: 9000,
  cash: 1000,
};
season = reducer(season, { type: 'END_DAY' });
assert.equal(season.season, 'summer');
assert.equal(season.capitalBudget, 0);
assert.ok(season.cash > 1000);
assert.equal(season.cash, 1000 + 4000);
assert.equal(season.maintenanceBudget, maintenanceGrant(season.satisfaction, season.gmStanding));

const leased = reducer(createInitialState(), { type: 'LEASE_MACHINE', machineId: 'walkBehindReel' });
assert.ok(leased.ownedMachines.includes('walkBehindReel'));
assert.ok(leased.leasedMachines.includes('walkBehindReel'));
assert.equal(leased.capitalBudget, start.capitalBudget);
assert.equal(leaseCost('walkBehindReel'), WALK_BEHIND_COST * LEASE_RATE);
let unpaid = {
  ...leased,
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  maintenanceBudget: 0,
};
unpaid = reducer(unpaid, { type: 'END_DAY' });
assert.equal(unpaid.ownedMachines.includes('walkBehindReel'), false);
assert.equal(unpaid.leasedMachines.includes('walkBehindReel'), false);

let bunkers = {
  ...createInitialState(),
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
for (let i = 0; i < BUNKER_NEGLECT_DAYS; i += 1) bunkers = endKeep(bunkers);
assert.ok(bunkers.inbox.some((item) => item.kind === 'bunkers' && item.from === 'golfer' && !item.read));

assert.equal(canPlanTask(createInitialState(), 'gmMeeting').ok, false);
let meetDay = { ...createInitialState(), day: 7 };
assert.equal(canPlanTask(meetDay, 'gmMeeting').ok, true);
const skipped = endKeep(meetDay);
assert.equal(skipped.gmStanding, GM_STANDING_START - GM_MEETING_SKIP_STANDING);
meetDay = reducer({ ...createInitialState(), day: 7 }, { type: 'PLAN_TASK', taskId: 'gmMeeting' });
assert.equal(meetDay.plannedTasks[0].minutes, GM_MEETING_MINUTES);
const attended = endKeep(meetDay);
assert.equal(attended.gmStanding, GM_STANDING_START);

const satStart = createInitialState().satisfaction;
const afterSat = endKeep(createInitialState());
assert.notEqual(afterSat.satisfaction, courseCondition(afterSat.surfaces));
assert.notEqual(afterSat.satisfaction, satStart);

assert.ok(maintenanceGrant(90, SATISFACTION_START) > maintenanceGrant(10, SATISFACTION_START));
assert.ok(capitalGrant(90, GM_STANDING_START) > capitalGrant(10, GM_STANDING_START));

const revenue = 4000;
assert.equal(maxLoan(revenue), revenue * LOAN_LIMIT_MULTIPLIER);
let loaned = { ...createInitialState(), lastSeasonRevenue: revenue };
loaned = reducer(loaned, { type: 'TAKE_LOAN', amount: revenue });
assert.equal(loaned.cash, STARTING_CASH + revenue);
assert.equal(loaned.loan.repay, loanRepayment(revenue));
assert.equal(loaned.loan.repay, revenue * (1 + LOAN_INTEREST));
loaned = {
  ...loaned,
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
loaned = reducer(loaned, { type: 'END_DAY' });
assert.equal(loaned.loan, null);
assert.equal(
  loaned.maintenanceBudget,
  maintenanceGrant(loaned.satisfaction, loaned.gmStanding) - loanRepayment(revenue),
);

let broke = {
  ...createInitialState(),
  day: DAYS_PER_SEASON,
  cash: -50000,
  maintenanceBudget: 0,
  capitalBudget: 0,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
broke = reducer(broke, { type: 'END_DAY' });
assert.equal(broke.insolventStreak, 1);
assert.equal(broke.dismissed, false);
broke = {
  ...broke,
  day: DAYS_PER_SEASON * 2,
  cash: -50000,
  maintenanceBudget: 0,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
broke = reducer(broke, { type: 'END_DAY' });
assert.equal(broke.insolventStreak, INSOLVENT_DISMISS_STREAK);
assert.equal(broke.dismissed, true);

const snap = reducer(createInitialState(), { type: 'SNAP_TOURNAMENT' });
assert.ok(snap.cash > STARTING_CASH);
assert.ok(snap.lastSnap);
assert.equal(snap.snappedToday, true);

console.log('phase7 checks passed');
