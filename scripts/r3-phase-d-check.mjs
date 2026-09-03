/**
 * Round 3 Phase D: Escape from any sub-tab returns to the map.
 * Run: node scripts/r3-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SECTION_MAP } from '../src/data/constants.js';

assert.equal(SECTION_MAP, 'course');

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /event\.key !== 'Escape'/);
assert.match(app, /view !== SECTION_MAP/);
assert.match(app, /onCloseShed\(\)/);
assert.match(app, /onSelect\(null\)/);

console.log('round 3 phase D checks passed');
