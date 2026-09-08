#!/usr/bin/env node
/**
 * Weekly planning, 12-week seasons, cash fuel, casuals.
 * Run: node scripts/week-plan-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CASUAL_MAX_DAYS_PER_WEEK,
  CASUAL_WAGE_MULT,
  DAYS_PER_SEASON,
  DAYS_PER_WEEK,
  FUEL_PRICE_PER_L,
  LAST_MONTH_DAYS,
  SEASON_WEEKS,
  STARTING_DAY,
  TOURNAMENT_SETUP_LEAD_DAYS,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { fuelCost, plannedDayFuel } from '../src/engine/fuel.js';
import {
  canBookCasual,
  canEditPlanDay,
  getDayTasks,
  planViewState,
  weekDays,
  weekStartDay,
} from '../src/engine/week.js';
import { scheduleTournamentDays, seasonTournament, tournamentPromptDay } from '../src/engine/tournament.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(DAYS_PER_WEEK, 7);
assert.equal(SEASON_WEEKS, 12);
assert.equal(DAYS_PER_SEASON, 84);
assert.equal(LAST_MONTH_DAYS, 28);
assert.equal(CASUAL_MAX_DAYS_PER_WEEK, 2);
assert.equal(CASUAL_WAGE_MULT, 1.75);

const start = createInitialState();
assert.equal(start.day, STARTING_DAY);
assert.ok(start.weekPlan);
assert.equal(weekStartDay(start.day), 1);
assert.deepEqual(weekDays(start.day), [1, 2, 3, 4, 5, 6, 7]);
assert.equal(start.casualPool.length, 3);
assert.equal(start.fuelLitres, undefined);
assert.ok(start.tournaments.length >= 1);
assert.equal(start.tournaments[0].day, scheduleTournamentDays(STARTING_DAY, 1, start.season)[0]);
assert.ok(start.tournaments[0].day >= DAYS_PER_SEASON - LAST_MONTH_DAYS);
assert.equal(tournamentPromptDay(STARTING_DAY), DAYS_PER_SEASON - TOURNAMENT_SETUP_LEAD_DAYS);
assert.equal(tournamentPromptDay(STARTING_DAY), 77);

const one = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
const oneMin = one.plannedTasks[0].minutes;
const nine = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
const nineMin = nine.plannedTasks[0].minutes;
assert.equal(oneMin, 26);
assert.equal(nineMin, 187);

let thu = reducer(start, { type: 'SET_PLANNING_DAY', day: 4 });
assert.equal(thu.planningDay, 4);
const view = planViewState(thu);
assert.equal(view.plannedTasks.length, 0);
thu = reducer(thu, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
assert.equal(getDayTasks(thu, 1).length, 0);
assert.equal(getDayTasks(thu, 4).length, 1);
assert.equal(thu.plannedTasks.length, 0);

const casual = start.casualPool[0];
let booked = reducer(start, { type: 'BOOK_CASUAL', casualId: casual.id, day: 2 });
assert.ok(canBookCasual(start, casual.id, 2).ok);
assert.equal(canBookCasual(booked, casual.id, 2).ok, false);
booked = reducer(booked, { type: 'BOOK_CASUAL', casualId: casual.id, day: 3 });
assert.equal(canBookCasual(booked, casual.id, 4).ok, false);
assert.equal(casual.wage > 0, true);

const fuelPlan = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
const litres = plannedDayFuel(fuelPlan).used;
const ran = reducer(fuelPlan, { type: 'END_DAY' });
assert.equal(ran.fuelLitres, undefined);
assert.equal(ran.fuelSpendLog.at(-1).spend, fuelCost(litres));
assert.ok(ran.cash <= start.cash - fuelCost(litres));
assert.equal(ran.log.at(-1).fuelStop, null);
assert.equal(ran.weekPlan.locked, true);
assert.equal(canEditPlanDay(ran, ran.day).ok, true);
assert.equal(canEditPlanDay(ran, ran.day + 1).ok, false);

const shed = read('src/components/Shed.jsx');
assert.doesNotMatch(shed, /FUEL_TANK_CAPACITY/);
assert.doesNotMatch(shed, /onBuyFuel/);
assert.match(shed, /No tank/);
const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /plannedDayFuel/);
assert.doesNotMatch(dialog, /FUEL_TANK_CAPACITY/);
const crew = read('src/components/Crew.jsx');
assert.match(crew, /BOOK_CASUAL|onBookCasual/);
const app = read('src/App.jsx');
assert.doesNotMatch(app, /BUY_FUEL/);
assert.match(app, /SET_PLANNING_DAY/);

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
assert.ok(old.weekPlan);
assert.equal(old.fuelLitres, undefined);
assert.ok(Array.isArray(old.casualPool));

const auto = seasonTournament(1, 'spring');
assert.equal(auto[0].day, 71);

console.log('week-plan-check: ok');
