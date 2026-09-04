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
  NINE_FAIRWAYS_TARGET_MINUTES,
  NINE_GREENS_DAY_FRACTION,
  NINE_GREENS_TARGET_MINUTES,
  NINE_ROUGH_TARGET_MINUTES,
  NINE_TEES_TARGET_MINUTES,
  NZ_PRICE_MULT,
  PER_HOLE_MINUTES,
  SPRAY_MATERIALS_COST,
  TRAINING_COST,
  WAGE_BASE,
  WAGE_PER_SKILL,
  WALK_BEHIND_COST,
  WEEKLY_ADMIN_JOBS,
  WEEKLY_BUNKER_JOBS,
  WEEKLY_CADENCE_FRACTION,
  WEEKLY_CADENCE_TARGET_MINUTES,
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
import { durationForTask } from '../src/engine/assignment.js';
import { durationOnMachine } from '../src/engine/equipment.js';
import { createInitialState } from '../src/engine/gameState.js';
import { GREENSMASTER_ID, REELMASTER_ID } from '../src/data/constants.js';

assert.equal(NINE_GREENS_TARGET_MINUTES, 384);
assert.equal(NINE_GREENS_DAY_FRACTION, 0.8);
assert.equal(WEEKLY_WORK_DAYS, 6);
assert.equal(WEEKLY_MINUTES, 2880);
assert.equal(WEEKLY_CADENCE_FRACTION, 0.75);
assert.equal(WEEKLY_CADENCE_TARGET_MINUTES, 2160);
assert.equal(NZ_PRICE_MULT, 2.5);
assert.equal(GREENSMASTER_START_CONDITION, 28);

const start = createInitialState();
const player = start.workers[0];
const greens = durationForTask(start, 'cutGreens', player);
const tees = durationForTask(start, 'cutTees', player);
const fairways = durationForTask(start, 'cutFairways', player);
const rough = durationOnMachine(start, 'cutRough', player, REELMASTER_ID);
const cups = durationForTask(start, 'changeCups', player);
const bunkers = durationForTask(start, 'rakeBunkers', player);
const rolling = durationForTask(start, 'rollGreens', player);
const admin = GM_MEETING_MINUTES * WEEKLY_ADMIN_JOBS;

assert.equal(greens, NINE_GREENS_TARGET_MINUTES);
assert.equal(tees, NINE_TEES_TARGET_MINUTES);
assert.equal(fairways, NINE_FAIRWAYS_TARGET_MINUTES);
assert.equal(rough, NINE_ROUGH_TARGET_MINUTES);
assert.ok(Math.abs(greens / DAY_LENGTH_MINUTES - NINE_GREENS_DAY_FRACTION) < 0.01);
assert.ok(PER_HOLE_MINUTES.greens > 0);
assert.equal(JOB_SETUP_MINUTES.green, 35);

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

assert.equal(weekly, WEEKLY_CADENCE_TARGET_MINUTES);
assert.ok(Math.abs(weekly / WEEKLY_MINUTES - WEEKLY_CADENCE_FRACTION) < 0.01);
assert.ok(weeklyWithWeeklyRough > WEEKLY_MINUTES, 'weekly rough overflows a six-day week');
assert.ok(rough > DAY_LENGTH_MINUTES);

assert.equal(WALK_BEHIND_COST, nzPrice(4500, 1000));
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
  `NINE_GREENS=${greens} TARGET=${NINE_GREENS_TARGET_MINUTES} DAY_FRACTION=${(greens / DAY_LENGTH_MINUTES).toFixed(3)} PER_HOLE_GREENS=${PER_HOLE_MINUTES.greens}`,
);
console.log(
  `WEEKLY_CADENCE=${weekly} TARGET=${WEEKLY_CADENCE_TARGET_MINUTES} WEEK=${WEEKLY_MINUTES} FRACTION=${(weekly / WEEKLY_MINUTES).toFixed(3)} WEEKLY_WITH_WEEKLY_ROUGH=${weeklyWithWeeklyRough}`,
);
console.log(
  `NINE_TEES=${tees} NINE_FAIRWAYS=${fairways} NINE_ROUGH=${rough} CUPS=${cups} BUNKERS=${bunkers} ROLL=${rolling} ADMIN=${admin}`,
);
console.log(
  `NZ_PRICE_MULT=${NZ_PRICE_MULT} WALK_BEHIND_COST=${WALK_BEHIND_COST} WAGE_BASE=${WAGE_BASE} LEASE_RATE=${LEASE_RATE} GRIND_AWAY_COST=${GRIND_AWAY_COST}`,
);
console.log('GATE D1 PASS nine greens on the starting fleet costs 384 minutes');
console.log(`GATE D2 PASS weekly cadence is ${weekly} minutes (${Math.round((weekly / WEEKLY_MINUTES) * 100)}% of ${WEEKLY_MINUTES})`);
console.log(`GATE D3 PASS weekly rough overflows the week (${weeklyWithWeeklyRough} > ${WEEKLY_MINUTES}); one rough job is ${rough} min`);
console.log('GATE D4 PASS prices, wages and costs are 2.5× and rounded');
console.log('round 7 phase D checks passed');
