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
  STARTING_OPENING_CASH,
  STARTING_WEATHER,
  WALK_BEHIND_COST,
} from '../src/data/constants.js';
import {
  leaseCost,
  loanRepayment,
  maxLoan,
  seasonGrant,
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
assert.equal(start.cash, STARTING_OPENING_CASH);

const bought = reducer(start, { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
assert.equal(bought.cash, start.cash - WALK_BEHIND_COST);

let season = {
  ...createInitialState(),
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  cash: 1000,
};
season = reducer(season, { type: 'END_DAY' });
assert.equal(season.season, 'summer');
assert.ok(season.cash > 1000);
assert.equal(season.cash, 1000 + seasonGrant(season.satisfaction, season.gmStanding));

const leased = reducer(createInitialState(), { type: 'LEASE_MACHINE', machineId: 'walkBehindReel' });
assert.ok(leased.ownedMachines.includes('walkBehindReel'));
assert.ok(leased.leasedMachines.includes('walkBehindReel'));
assert.equal(leased.cash, start.cash);
assert.equal(leaseCost('walkBehindReel'), WALK_BEHIND_COST * LEASE_RATE);
let unpaid = {
  ...leased,
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  cash: 0,
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
assert.notEqual(afterSat.satisfaction, courseCondition(afterSat));
assert.notEqual(afterSat.satisfaction, satStart);

assert.ok(seasonGrant(90, SATISFACTION_START) > seasonGrant(10, SATISFACTION_START));
assert.ok(seasonGrant(SATISFACTION_START, 90) > seasonGrant(SATISFACTION_START, 10));

const revenue = 4000;
assert.equal(maxLoan(revenue), revenue * LOAN_LIMIT_MULTIPLIER);
let loaned = { ...createInitialState(), lastSeasonRevenue: revenue };
loaned = reducer(loaned, { type: 'TAKE_LOAN', amount: revenue });
assert.equal(loaned.cash, STARTING_OPENING_CASH + revenue);
assert.equal(loaned.loan.repay, loanRepayment(revenue));
assert.equal(loaned.loan.repay, revenue * (1 + LOAN_INTEREST));
loaned = {
  ...loaned,
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
const cashBeforeClose = loaned.cash;
loaned = reducer(loaned, { type: 'END_DAY' });
assert.equal(loaned.loan, null);
assert.equal(loaned.cash, cashBeforeClose + seasonGrant(loaned.satisfaction, loaned.gmStanding) - loanRepayment(revenue));

let broke = {
  ...createInitialState(),
  day: DAYS_PER_SEASON,
  cash: -50000,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
broke = reducer(broke, { type: 'END_DAY' });
assert.equal(broke.insolventStreak, 1);
assert.equal(broke.dismissed, false);
broke = {
  ...broke,
  day: DAYS_PER_SEASON * 2,
  cash: -50000,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
broke = reducer(broke, { type: 'END_DAY' });
assert.equal(broke.insolventStreak, INSOLVENT_DISMISS_STREAK);
assert.equal(broke.dismissed, true);

const snap = reducer(createInitialState(), { type: 'SNAP_TOURNAMENT' });
assert.ok(snap.cash > STARTING_OPENING_CASH);
assert.ok(snap.lastSnap);
assert.equal(snap.snappedToday, true);

console.log('phase7 checks passed');
