/**
 * Round 5 Phase C: Start day confirmation and irrigation.
 * Run: node scripts/r5-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DAY_FULLY_COMMITTED_COPY, START_DAY_LABEL } from '../src/data/constants.js';
import { skippedOverdueSurfaces, unusedTimeCopy } from '../src/engine/badges.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';

assert.equal(START_DAY_LABEL, 'Start day');
assert.equal(unusedTimeCopy(30), 'You still have 30 minutes unused.');
assert.equal(unusedTimeCopy(0), DAY_FULLY_COMMITTED_COPY);

const start = createInitialState();
assert.deepEqual(skippedOverdueSurfaces(start), []);
const neglected = {
  ...start,
  day: 10,
  holes: start.holes.map((hole) => ({
    ...hole,
    green: { ...hole.green, lastMownDay: 1 },
    tee: { ...hole.tee, lastMownDay: 10 },
    fairway: { ...hole.fairway, lastMownDay: 10 },
    rough: { ...hole.rough, lastMownDay: 10 },
    bunker: hole.bunker ? { ...hole.bunker, lastRakedDay: 10 } : null,
  })),
};
assert.deepEqual(skippedOverdueSurfaces(neglected), ['greens']);
const planned = reducer(neglected, { type: 'PLAN_TASK', taskId: 'cutGreens' });
assert.deepEqual(skippedOverdueSurfaces(planned), []);

let watered = reducer(planned, { type: 'SET_IRRIGATION', surface: 'tees', policy: 'light' });
assert.equal(watered.plannedTasks.length, 1);
assert.equal(watered.irrigation.tees, 'light');

const needle = 'End' + ' day';
const grep = execSync(`rg -n -F ${JSON.stringify(needle)} src DECISIONS.md BUILD_PLAN.md FIXES_ROUND_2.md || true`, {
  encoding: 'utf8',
  cwd: fileURLToPath(new URL('..', import.meta.url)),
});
assert.equal(grep.trim(), '', grep);

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /START_DAY_LABEL/);
assert.doesNotMatch(sidebar, /End [dD]ay/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<StartDayDialog/);
assert.match(app, /setStartDayOpen\(true\)/);
assert.match(app, /onCloseShed\(\);\s*onEndDay\(\);/);
assert.match(app, /onEndDay=\{\(\) => dispatch\(\{ type: 'END_DAY' \}\)\}/);

const dialog = readFileSync(new URL('../src/components/StartDayDialog.jsx', import.meta.url), 'utf8');
assert.match(dialog, /unusedTimeCopy/);
assert.match(dialog, /skippedOverdueSurfaces/);
assert.match(dialog, /Tonight's irrigation/);
assert.match(dialog, /<ForecastStrip/);
assert.match(dialog, />\s*Back\s*</);
assert.match(dialog, /IRRIGATION_POLICIES/);
assert.match(dialog, /onRemove/);

const tutorial = readFileSync(new URL('../src/components/Tutorial.jsx', import.meta.url), 'utf8');
assert.match(tutorial, /start the day/);
assert.doesNotMatch(tutorial, /end the day/);

console.log('GATE C1 PASS no leftover day-button copy outside the Round 5 spec');
console.log('GATE C2 PASS Start day opens StartDayDialog rather than END_DAY immediately');
console.log('GATE C3 PASS unused minutes copy states remaining time or a full day');
console.log('GATE C4 PASS overdue surfaces with no job are listed');
console.log('GATE C5 PASS irrigation can be set without dropping the plan');
console.log('GATE C6 PASS forecast and Back live in the dialog');
console.log('round 5 phase C checks passed');
