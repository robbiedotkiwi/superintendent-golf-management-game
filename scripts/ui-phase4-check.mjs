/**
 * UI Phase 4: time bar fills by task segment; default greens cut is a quarter day.
 * Run: node scripts/ui-phase4-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAY_LENGTH_MINUTES } from '../src/data/constants.js';
import { durationForTask } from '../src/engine/assignment.js';
import { createInitialState } from '../src/engine/gameState.js';

const cutGreens = durationForTask(createInitialState(), 'cutGreens');
assert.equal(DAY_LENGTH_MINUTES, 480);
assert.ok(cutGreens > 0);
assert.ok(cutGreens < DAY_LENGTH_MINUTES);

const src = readFileSync(new URL('../src/components/TimeBar.jsx', import.meta.url), 'utf8');
assert.match(src, /export function timeFillPercent/);
assert.match(src, /machine-orange/);
assert.match(src, /onRemove\(planned\.taskId\)/);
assert.match(src, /title=\{label\}/);
assert.match(src, /border-l border-\[var\(--paint\)\]/);
assert.match(src, /timeFillPercent\(planned\.minutes, capacity\)/);

console.log('ui phase4 checks passed');
