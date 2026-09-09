/**
 * Round 7 Phase D: rebalance the day from targets; NZ prices ×2.5.
 * Run: node scripts/r7-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAY_LENGTH_MINUTES,
  FERTILISER_MATERIALS_COST,
  FOLEY_GRINDER_COST,
  GM_MEETING_MINUTES,
  GREENSMASTER_START_CONDITION,
  GRIND_AWAY_COST,
  JOB_SETUP_MINUTES,
  LEASE_RATE,
  MECHANIC_WAGE,
  NZ_PRICE_MULT,
  SPRAY_MATERIALS_COST,
  TRAINING_COST,
  WAGE_BASE,
  WAGE_PER_SKILL,
  WALK_BEHIND_COST,
  WEEKLY_ADMIN_JOBS,
  WEEKLY_BUNKER_JOBS,
  WEEKLY_CADENCE_FRACTION,
  WEEKLY_CUPS_JOBS,
  WEEKLY_CUTS_FAIRWAYS,
  WEEKLY_CUTS_GREENS,
  WEEKLY_CUTS_ROUGH,
  WEEKLY_CUTS_TEES,
  WEEKLY_MINUTES,
  WEEKLY_ROLL_JOBS,
  WEEKLY_WORK_DAYS,
  nzPrice,
} from '../src/data/constants.js';
import { PER_HOLE_MINUTES } from '../src/engine/courseArea.js';
import { durationOnMachine } from '../src/engine/equipment.js';
import { createInitialState } from '../src/engine/gameState.js';
import { GREENSMASTER_ID, REELMASTER_ID } from '../src/data/constants.js';

assert.equal(WEEKLY_WORK_DAYS, 6);
assert.equal(WEEKLY_MINUTES, 2880);
assert.equal(WEEKLY_CADENCE_FRACTION, 0.75);
assert.equal(NZ_PRICE_MULT, 2.5);
assert.equal(GREENSMASTER_START_CONDITION, 28);

const start = createInitialState();
const player = start.workers[0];
const greens = durationOnMachine(start, 'cutGreens', player);
const tees = durationOnMachine(start, 'cutTees', player);
const fairways = durationOnMachine(start, 'cutFairways', player);
const rough = durationOnMachine(start, 'cutRough', player, REELMASTER_ID);
const cups = durationOnMachine(start, 'changeCups', player);
const bunkers = durationOnMachine(start, 'rakeBunkers', player);
const rolling = durationOnMachine(start, 'rollGreens', player);
const admin = GM_MEETING_MINUTES * WEEKLY_ADMIN_JOBS;

assert.ok(greens < DAY_LENGTH_MINUTES);
assert.ok(tees < DAY_LENGTH_MINUTES);
assert.ok(fairways < DAY_LENGTH_MINUTES);
assert.ok(rough < DAY_LENGTH_MINUTES);
assert.ok(PER_HOLE_MINUTES.greens > 0);
assert.equal(JOB_SETUP_MINUTES.green, 6);

const weekly =
  WEEKLY_CUTS_GREENS * greens +
  WEEKLY_CUTS_TEES * tees +
  WEEKLY_CUTS_FAIRWAYS * fairways +
  WEEKLY_CUTS_ROUGH * rough +
  WEEKLY_CUPS_JOBS * cups +
  WEEKLY_BUNKER_JOBS * bunkers +
  WEEKLY_ROLL_JOBS * rolling +
  admin;
const weeklyWithWeeklyRough =
  WEEKLY_CUTS_GREENS * greens +
  WEEKLY_CUTS_TEES * tees +
  WEEKLY_CUTS_FAIRWAYS * fairways +
  rough +
  WEEKLY_CUPS_JOBS * cups +
  WEEKLY_BUNKER_JOBS * bunkers +
  WEEKLY_ROLL_JOBS * rolling +
  admin;

assert.ok(weekly < WEEKLY_MINUTES);
assert.ok(weeklyWithWeeklyRough < WEEKLY_MINUTES);

assert.equal(WALK_BEHIND_COST, 10800);
assert.equal(TRAINING_COST, nzPrice(1200, 100));
assert.equal(SPRAY_MATERIALS_COST, nzPrice(600, 100));
assert.equal(FERTILISER_MATERIALS_COST, nzPrice(450, 100));
assert.equal(GRIND_AWAY_COST, nzPrice(400, 100));
assert.equal(FOLEY_GRINDER_COST, nzPrice(15000, 1000));
assert.equal(WAGE_BASE, nzPrice(45, 5));
assert.equal(WAGE_PER_SKILL, nzPrice(12, 5));
assert.equal(MECHANIC_WAGE, nzPrice(90, 5));
assert.equal(LEASE_RATE, 0.1 * NZ_PRICE_MULT);
assert.equal(durationOnMachine(start, 'cutGreens', player, GREENSMASTER_ID), greens);

console.log(
  `NINE_GREENS=${greens} DAY_FRACTION=${(greens / DAY_LENGTH_MINUTES).toFixed(3)} PER_HOLE_GREENS=${PER_HOLE_MINUTES.greens}`,
);
console.log(
  `WEEKLY_CADENCE=${weekly} WEEK=${WEEKLY_MINUTES} FRACTION=${(weekly / WEEKLY_MINUTES).toFixed(3)} WEEKLY_WITH_WEEKLY_ROUGH=${weeklyWithWeeklyRough}`,
);
console.log(
  `NINE_TEES=${tees} NINE_FAIRWAYS=${fairways} NINE_ROUGH=${rough} CUPS=${cups} BUNKERS=${bunkers} ROLL=${rolling} ADMIN=${admin}`,
);
console.log(
  `NZ_PRICE_MULT=${NZ_PRICE_MULT} WALK_BEHIND_COST=${WALK_BEHIND_COST} WAGE_BASE=${WAGE_BASE} LEASE_RATE=${LEASE_RATE} GRIND_AWAY_COST=${GRIND_AWAY_COST}`,
);
console.log(`GATE D1 PASS nine greens on the starting fleet costs ${greens} minutes at map scale`);
console.log(`GATE D2 PASS weekly cadence is ${weekly} minutes (${Math.round((weekly / WEEKLY_MINUTES) * 100)}% of ${WEEKLY_MINUTES})`);
console.log(`GATE D3 PASS one rough job is ${rough} min at map scale`);
console.log('GATE D4 PASS prices, wages and costs are 2.5× and rounded');
console.log('round 7 phase D checks passed');
