#!/usr/bin/env node
/**
 * Round 8 Phase A: shared hole-selector chips on the map and Turf.
 * Run: node scripts/r8-phase-a-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  HOLE_COUNT,
  HOLE_SELECTOR_COUNT,
  SELECT_ALL_LABEL,
  SELECT_CLEAR_LABEL,
  SELECT_FRONT_NINE_LABEL,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { defaultJobHoles, frontNineIds } from '../src/engine/holes.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(HOLE_SELECTOR_COUNT, 9);
assert.equal(HOLE_SELECTOR_COUNT, HOLE_COUNT);
assert.equal(SELECT_ALL_LABEL, 'All');
assert.equal(SELECT_FRONT_NINE_LABEL, 'Front nine');
assert.equal(SELECT_CLEAR_LABEL, 'Clear');

const holeSel = read('src/components/HoleSelector.jsx');
const map = read('src/components/MapSelectionBar.jsx');
const turf = read('src/components/Turf.jsx');
const constants = read('src/data/constants.js');
const app = read('src/App.jsx');

assert.match(constants, /export const HOLE_SELECTOR_COUNT = HOLE_COUNT/);

assert.match(holeSel, /Array\.from\(\{ length: count \}/);
assert.match(holeSel, /aria-pressed=\{on\}/);
assert.match(holeSel, /SELECT_ALL_LABEL/);
assert.match(holeSel, /SELECT_FRONT_NINE_LABEL/);
assert.match(holeSel, /SELECT_CLEAR_LABEL/);
assert.match(holeSel, /state\.selectedHoles/);
assert.match(holeSel, /onToggleHole/);
assert.match(holeSel, /onSelectHoles/);
assert.match(holeSel, /selectAllHoles\(state\)/);
assert.match(holeSel, /selectFrontNine\(state\)/);
assert.match(holeSel, /onSelectHoles\(\[\]\)/);

assert.match(map, /<HoleSelector/);
assert.doesNotMatch(map, /onSelectAll=/);
assert.match(map, /onToggleHole/);
assert.match(map, /onSelectHoles/);

assert.match(turf, /<HoleSelector/);
assert.doesNotMatch(turf, /useState\([^)]*selectedHoles/);
assert.match(turf, /tab === TURF_TAB_MOWING/);
assert.match(turf, /tab === TURF_TAB_IRRIGATION/);
assert.match(turf, /tab === TURF_TAB_INPUTS/);
assert.match(turf, /jobHolesFromSelection\(state\)/);
assert.match(turf, /onToggleHole/);
assert.match(turf, /onSelectHoles/);
assert.match(turf, /holes=\{holes\}/);

assert.match(app, /type: 'TOGGLE_HOLE'/);
assert.match(app, /type: 'SET_SELECTED_HOLES'/);
assert.match(app, /onToggleHole=\{onToggleHole\}/);
assert.match(app, /onSelectHoles=\{onSelectHoles\}/);

const start = createInitialState();
let selected = reducer(start, { type: 'TOGGLE_HOLE', holeId: 3 });
assert.deepEqual(selected.selectedHoles, [3]);
selected = reducer(selected, { type: 'TOGGLE_HOLE', holeId: 3 });
assert.deepEqual(selected.selectedHoles, []);
selected = reducer(start, { type: 'SET_SELECTED_HOLES', holes: defaultJobHoles(start, 'greens') });
assert.deepEqual(selected.selectedHoles, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
selected = reducer(start, { type: 'SET_SELECTED_HOLES', holes: frontNineIds(start) });
assert.deepEqual(selected.selectedHoles, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
selected = reducer(selected, { type: 'SET_SELECTED_HOLES', holes: [] });
assert.deepEqual(selected.selectedHoles, []);

const fromTurf = reducer(start, { type: 'SET_SELECTED_HOLES', holes: [1, 2, 3] });
const planned = reducer(fromTurf, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: fromTurf.selectedHoles });
assert.deepEqual(planned.plannedTasks[0].holes, [1, 2, 3]);

console.log('r8-phase-a-check: ok');
