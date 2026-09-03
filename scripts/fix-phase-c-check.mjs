/**
 * Fixes Round 2 Phase C gates.
 * Run: node scripts/fix-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SIDEBAR_WIDTH } from '../src/data/constants.js';

assert.equal(SIDEBAR_WIDTH, 380);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<Sidebar/);
assert.doesNotMatch(app, /<Hud /);
assert.doesNotMatch(app, /<WeatherStrip/);
assert.doesNotMatch(app, /<TimeBar/);
assert.match(app, /flex h-screen max-h-screen overflow-hidden/);
assert.doesNotMatch(app, /flex-col overflow-hidden/);

const mapBlock = app.slice(app.indexOf('relative min-h-0 min-w-0 flex-1'));
assert.doesNotMatch(mapBlock, /<IrrigationPanel/);
assert.match(mapBlock, /<CourseMap/);
assert.match(mapBlock, /<MapJobPopover/);

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /SIDEBAR_WIDTH/);
assert.match(sidebar, /Condition/);
assert.match(sidebar, /shrink-0 border-t/);
assert.match(sidebar, /<TimeBar/);
assert.match(sidebar, /START_DAY_LABEL|Start day/);
assert.doesNotMatch(sidebar, /ForecastStrip/);
assert.doesNotMatch(sidebar, /Satisfaction/);
assert.doesNotMatch(sidebar, /Budgets/);
assert.doesNotMatch(sidebar, /SURFACE_KEYS/);

const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turf, /ForecastStrip|forecast-strip/);

const timebar = readFileSync(new URL('../src/components/TimeBar.jsx', import.meta.url), 'utf8');
assert.match(timebar, /bg-\[var\(--paint\)\]\/20/);
assert.match(timebar, /onRemove\(planned\.taskId\)/);
assert.match(timebar, /\{remaining\}/);
assert.match(timebar, /\{capacity\}/);
assert.doesNotMatch(timebar, /Start day/);

const panel = readFileSync(new URL('../src/components/TaskPanel.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(panel, /absolute inset-y-0/);

console.log('fix phase C checks passed');
