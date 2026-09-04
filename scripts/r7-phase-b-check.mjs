/**
 * Round 7 Phase B: partial jobs, setup, routes, repeat last.
 * Run: node scripts/r7-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JOB_SETUP_MINUTES,
  JOB_SETUP_MINUTES_BY_TYPE,
  PER_HOLE_MINUTES,
  SAVED_ROUTE_CAP,
} from '../src/data/constants.js';
import { createInitialState, reducer, canPlanTask } from '../src/engine/gameState.js';
import { durationForTask } from '../src/engine/assignment.js';
import { jobMinutes, setupMinutesFor, variableJobMinutes } from '../src/engine/jobs.js';
import { defaultJobHoles, frontNineIds, holeSurface } from '../src/engine/holes.js';

assert.deepEqual(JOB_SETUP_MINUTES, { green: 35, tee: 25, fairway: 45, rough: 45, bunker: 20 });
assert.equal(JOB_SETUP_MINUTES_BY_TYPE.greens, 35);
assert.equal(SAVED_ROUTE_CAP, 8);

const start = createInitialState();
assert.deepEqual(start.selectedHoles, []);
assert.deepEqual(start.savedRoutes, []);
assert.deepEqual(start.lastDayJobs, []);

const three = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1, 2, 3] });
assert.equal(three.plannedTasks.length, 1);
assert.deepEqual(three.plannedTasks[0].holes, [1, 2, 3]);
const nine = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens' });
assert.deepEqual(nine.plannedTasks[0].holes, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

const threeMin = durationForTask(start, 'cutGreens', start.workers[0], undefined, [1, 2, 3]);
const nineMin = durationForTask(start, 'cutGreens', start.workers[0]);
assert.ok(nineMin < threeMin * 3, 'nine holes in one job is cheaper than three jobs of three');
assert.equal(jobMinutes(start, 'cutGreens', [1, 2, 3]), setupMinutesFor('greens') + variableJobMinutes(start, 'cutGreens', [1, 2, 3]));

const low = reducer(start, { type: 'SET_HOC', surface: 'greens', hoc: 2.5 });
const defaultNine = durationForTask(start, 'cutGreens', start.workers[0]);
const lowNine = durationForTask(low, 'cutGreens', start.workers[0]);
const defaultThree = durationForTask(start, 'cutGreens', start.workers[0], undefined, [1, 2, 3]);
const lowThree = durationForTask(low, 'cutGreens', start.workers[0], undefined, [1, 2, 3]);
assert.ok(lowNine > defaultNine);
assert.ok(Math.abs((lowNine - setupMinutesFor('greens')) / (defaultNine - setupMinutesFor('greens')) - (lowThree - setupMinutesFor('greens')) / (defaultThree - setupMinutesFor('greens'))) < 0.02);
assert.equal(setupMinutesFor('greens'), JOB_SETUP_MINUTES.green);

let selected = reducer(start, { type: 'SET_SELECTED_HOLES', holes: [4, 7] });
selected = reducer(selected, { type: 'TOGGLE_HOLE', holeId: 4 });
assert.deepEqual(selected.selectedHoles, [7]);
selected = reducer(selected, { type: 'ADD_HOLE', holeId: 2 });
assert.deepEqual(selected.selectedHoles, [2, 7]);
selected = reducer(selected, { type: 'SET_SELECTED_HOLES', holes: defaultJobHoles(start, 'greens') });
assert.deepEqual(selected.selectedHoles, defaultJobHoles(start, 'greens'));
selected = reducer(selected, { type: 'SET_SELECTED_HOLES', holes: frontNineIds(start) });
assert.deepEqual(selected.selectedHoles, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
selected = reducer(selected, { type: 'SET_SELECTED_HOLES', holes: [] });
assert.deepEqual(selected.selectedHoles, []);

let routed = reducer(start, { type: 'SET_SELECTED_HOLES', holes: [1, 8, 9] });
routed = reducer(routed, { type: 'SAVE_ROUTE', name: '  Wet corner  ' });
assert.equal(routed.savedRoutes.length, 1);
assert.equal(routed.savedRoutes[0].name, 'Wet corner');
assert.deepEqual(routed.savedRoutes[0].holes, [1, 8, 9]);
const applied = reducer({ ...routed, selectedHoles: [] }, { type: 'APPLY_ROUTE', id: routed.savedRoutes[0].id });
assert.deepEqual(applied.selectedHoles, [1, 8, 9]);

let filled = reducer(start, { type: 'SET_SELECTED_HOLES', holes: [1] });
for (let i = 0; i < SAVED_ROUTE_CAP + 2; i += 1) {
  filled = reducer(filled, { type: 'SAVE_ROUTE', name: `R${i}` });
}
assert.equal(filled.savedRoutes.length, SAVED_ROUTE_CAP);

let yesterday = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1, 2, 3] });
yesterday = reducer(yesterday, { type: 'END_DAY' });
assert.equal(yesterday.lastDayJobs.length, 1);
assert.deepEqual(yesterday.lastDayJobs[0].holes, [1, 2, 3]);
const repeated = reducer(yesterday, { type: 'REPEAT_LAST' });
assert.equal(repeated.plannedTasks.length, 1);
assert.deepEqual(repeated.plannedTasks[0].holes, [1, 2, 3]);
assert.equal(repeated.lastRepeatDropped.length, 0);

const again = reducer(repeated, { type: 'REPEAT_LAST' });
assert.ok(again.lastRepeatDropped.length >= 1);
assert.match(again.lastRepeatDropped[0].reason, /Already planned/);

let partial = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1, 2, 3] });
partial = reducer(partial, { type: 'END_DAY' });
assert.equal(holeSurface(partial, 1, 'greens').heightAtLastCut, start.surfaceDefaults.greens.hoc);
assert.equal(holeSurface(partial, 7, 'greens').heightAtLastCut, null);
assert.ok(holeSurface(partial, 1, 'greens').quality > holeSurface(partial, 7, 'greens').quality);

const map = readFileSync(new URL('../src/components/MapSelectionBar.jsx', import.meta.url), 'utf8');
assert.match(map, /SELECT_ALL_LABEL/);
assert.match(map, /SELECT_FRONT_NINE_LABEL/);
assert.match(map, /SELECT_CLEAR_LABEL/);
assert.match(readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8'), /onToggleHole/);
assert.match(readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8'), /MapSelectionBar/);

assert.ok(canPlanTask(start, 'cutGreens', undefined, { holes: [1] }).ok);

console.log('NINE_MIN', nineMin, 'THREE_X3', threeMin * 3, 'SETUP', JOB_SETUP_MINUTES.green, 'PER_HOLE', PER_HOLE_MINUTES.greens);
console.log('GATE B1 PASS holes can be selected and a task applied to just those');
console.log('GATE B2 PASS All, Front nine and Clear shortcuts work');
console.log('GATE B3 PASS nine holes in one job is cheaper than three jobs of three');
console.log('GATE B4 PASS setup cost does not scale with height');
console.log('GATE B5 PASS a route can be saved, named, and reapplied');
console.log('GATE B6 PASS Repeat last re-plans yesterday and reports dropped jobs');
console.log('round 7 phase B checks passed');
