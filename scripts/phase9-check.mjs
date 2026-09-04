/**
 * Headless checks for Phase 9 expansion gates.
 * Run: node scripts/phase9-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTO_PICK_MINUTES,
  AUTO_PICKER_COST,
  BALL_PICK_MINUTES,
  DRIVING_RANGE_COST,
  EXPAND_18_COST,
  EXPAND_18_DAYS,
  EXPAND_18_SATISFACTION_MIN,
  EXPANDED_HOLE_COUNT,
  EXTRA_BUNKER_CEILING_BONUS,
  HOLE_COUNT,
  PROJECT_DRIVING_RANGE,
  PROJECT_EXPAND_18,
  SATISFACTION_START,
  STARTING_WEATHER,
  TASK_TIME_MULT_18,
} from '../src/data/constants.js';
import { holesForCount } from '../src/data/course.js';
import { durationForTask } from '../src/engine/assignment.js';
import { surfaceCeiling } from '../src/engine/equipment.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { holeCount } from '../src/engine/holes.js';
import {
  absorbNote,
  canStartProject,
  constructionMinutes,
} from '../src/engine/projects.js';

const start = createInitialState();
assert.ok(start.satisfaction < EXPAND_18_SATISFACTION_MIN);
assert.equal(canStartProject(start, PROJECT_EXPAND_18).hidden, true);
assert.equal(canPlanTask(start, 'pickBalls').ok, false);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /check\.hidden/);
assert.match(office, /absorbNote/);
assert.match(office, /dueDay/);

const funded = {
  ...createInitialState(),
  capitalBudget: EXPAND_18_COST + DRIVING_RANGE_COST + AUTO_PICKER_COST,
  satisfaction: EXPAND_18_SATISFACTION_MIN,
};
assert.equal(canStartProject(funded, PROJECT_EXPAND_18).ok, true);
assert.equal(canStartProject({ ...funded, satisfaction: EXPAND_18_SATISFACTION_MIN - 1 }, PROJECT_EXPAND_18).hidden, true);

const summer = reducer({ ...funded, season: 'summer' }, { type: 'START_PROJECT', projectId: PROJECT_EXPAND_18 });
assert.equal(summer.capitalBudget, funded.capitalBudget - EXPAND_18_COST);
assert.equal(summer.projects[0].dueDay, funded.day + EXPAND_18_DAYS);
assert.equal(holeCount(summer), HOLE_COUNT);

const winter = reducer({ ...funded, season: 'winter' }, { type: 'START_PROJECT', projectId: PROJECT_EXPAND_18 });
assert.ok(constructionMinutes(summer) > constructionMinutes(winter));
assert.ok(summer.workers[0].minutesToday < winter.workers[0].minutesToday);
assert.match(absorbNote('summer'), /Harder/);
assert.match(absorbNote('winter'), /Easier/);

let done = {
  ...summer,
  day: summer.projects[0].dueDay - 1,
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
done = reducer(done, { type: 'END_DAY' });
assert.equal(holeCount(done), EXPANDED_HOLE_COUNT);
assert.equal(done.projects.length, 0);
assert.equal(holesForCount(done.holes).length, EXPANDED_HOLE_COUNT);
assert.equal(holesForCount(HOLE_COUNT).length, HOLE_COUNT);

const nineMin = durationForTask(start, 'cutGreens', start.workers[0]);
const eighteenMin = durationForTask({ ...start, holes: EXPANDED_HOLE_COUNT }, 'cutGreens', start.workers[0]);
assert.equal(eighteenMin, nineMin * TASK_TIME_MULT_18);

let range = reducer(
  { ...createInitialState(), capitalBudget: DRIVING_RANGE_COST + AUTO_PICKER_COST },
  { type: 'START_PROJECT', projectId: PROJECT_DRIVING_RANGE },
);
range = {
  ...range,
  day: range.projects[0].dueDay - 1,
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
range = reducer(range, { type: 'END_DAY' });
assert.equal(range.hasDrivingRange, true);
assert.equal(canPlanTask(range, 'pickBalls').ok, true);
range = reducer(range, { type: 'PLAN_TASK', taskId: 'pickBalls' });
assert.equal(range.plannedTasks[0].minutes, BALL_PICK_MINUTES);
range = reducer(range, { type: 'REMOVE_TASK', taskId: 'pickBalls' });
range = reducer(range, { type: 'BUY_AUTO_PICKER' });
assert.equal(range.hasAutoPicker, true);
assert.equal(range.capitalBudget, 0);
const picked = reducer(range, { type: 'PLAN_TASK', taskId: 'pickBalls' });
assert.equal(picked.plannedTasks[0].minutes, AUTO_PICK_MINUTES);

const bunkered = { ...createInitialState(), hasExtraBunkers: true };
assert.equal(
  surfaceCeiling(bunkered, 'bunkers'),
  surfaceCeiling(createInitialState(), 'bunkers') + EXTRA_BUNKER_CEILING_BONUS,
);

assert.ok(SATISFACTION_START < EXPAND_18_SATISFACTION_MIN);
console.log('phase9 checks passed');
