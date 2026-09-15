/**
 * UI Phase 5: money format, no Holes stat, collapsed disease, condition in the sidebar.
 * Run: node scripts/ui-phase5-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STARTING_CASH } from '../src/data/constants.ts';
import { formatMoney } from '../src/engine/format.ts';

assert.equal(formatMoney(STARTING_CASH), '$8,000');
assert.equal(formatMoney(12000), '$12,000');
assert.equal(formatMoney(40000), '$40,000');

const sidebar = readFileSync(new URL('../src/components/Sidebar.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(sidebar, /Budgets/);
assert.match(sidebar, /formatMoney\(state\.cash\)/);
assert.match(sidebar, /qualityColor\(condition\)/);
assert.doesNotMatch(sidebar, /label="Holes"/);

const office = readFileSync(new URL('../src/components/Office.tsx', import.meta.url), 'utf8');
assert.match(office, /formatMoney\(state\.cash\)/);
assert.match(office, /\{holeCount\(state\)\}-hole course/);

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.match(app, /<Sidebar/);
assert.doesNotMatch(app, /<Hud /);
assert.doesNotMatch(app, /label="Holes"/);

const map = readFileSync(new URL('../src/components/CourseMap.tsx', import.meta.url), 'utf8');
assert.match(map, /\{holes\}-hole course/);

const weather = readFileSync(new URL('../src/components/WeatherStrip.tsx', import.meta.url), 'utf8');
assert.match(weather, /DiseaseReadout/);
assert.match(weather, /item\.pressure > 0/);

console.log('ui phase5 checks passed');
