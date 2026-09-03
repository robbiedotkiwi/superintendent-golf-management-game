/**
 * UI Phase 5: money format, no Holes stat, collapsed disease, condition in the sidebar.
 * Run: node scripts/ui-phase5-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STARTING_CASH } from '../src/data/constants.js';
import { formatMoney } from '../src/engine/format.js';

assert.equal(formatMoney(STARTING_CASH), '$8,000');
assert.equal(formatMoney(12000), '$12,000');
assert.equal(formatMoney(40000), '$40,000');

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(sidebar, /Budgets/);
assert.doesNotMatch(sidebar, /formatMoney\(state\.cash\)/);
assert.match(sidebar, /qualityColor\(condition\)/);
assert.doesNotMatch(sidebar, /label="Holes"/);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /formatMoney\(state\.cash\)/);
assert.match(office, /formatMoney\(state\.maintenanceBudget\)/);
assert.match(office, /formatMoney\(state\.capitalBudget\)/);
assert.match(office, /\{state\.holes\}-hole course/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<Sidebar/);
assert.doesNotMatch(app, /<Hud /);
assert.doesNotMatch(app, /label="Holes"/);

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /\{holes\}-hole course/);

const weather = readFileSync(new URL('../src/components/WeatherStrip.jsx', import.meta.url), 'utf8');
assert.match(weather, /DiseaseReadout/);
assert.match(weather, /item\.pressure > 0/);

console.log('ui phase5 checks passed');
