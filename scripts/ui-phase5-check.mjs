/**
 * UI Phase 5: HUD hierarchy, money format, no Holes stat, collapsed disease.
 * Run: node scripts/ui-phase5-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STARTING_CASH } from '../src/data/constants.js';
import { formatMoney } from '../src/engine/format.js';

assert.equal(formatMoney(STARTING_CASH), '$8,000');
assert.equal(formatMoney(12000), '$12,000');
assert.equal(formatMoney(40000), '$40,000');

const hud = readFileSync(new URL('../src/components/Hud.jsx', import.meta.url), 'utf8');
assert.match(hud, /Budgets/);
assert.match(hud, /formatMoney\(state\.cash\)/);
assert.match(hud, /formatMoney\(state\.maintenanceBudget\)/);
assert.match(hud, /formatMoney\(state\.capitalBudget\)/);
assert.match(hud, /qualityColor\(condition\)/);
assert.match(hud, /size="condition"/);
assert.doesNotMatch(hud, /label="Holes"/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<Hud /);
assert.doesNotMatch(app, /label="Holes"/);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /\{state\.holes\}-hole course/);

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /\{holes\}-hole course/);

const weather = readFileSync(new URL('../src/components/WeatherStrip.jsx', import.meta.url), 'utf8');
assert.match(weather, /DiseaseReadout/);
assert.match(weather, /item\.pressure > 0/);

console.log('ui phase5 checks passed');
