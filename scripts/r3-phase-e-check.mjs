/**
 * Round 3 Phase E: named height/pattern presets — removed in Round 9 Phase A.
 * Old saves carrying preset data load without error, dropping it silently.
 * Run: node scripts/r3-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { courseSettings } from '../src/engine/holes.js';

const start = createInitialState();
assert.equal(start.customPresets, undefined);
assert.equal(start.nextPresetId, undefined);

const migrated = migrateSave({
  day: 2,
  customPresets: [{ id: 1, name: 'Tournament', surface: 'greens', hoc: 2.8, pattern: 'rings', angle: 45 }],
  nextPresetId: 4,
  surfaces: {
    greens: { quality: 55 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(migrated.customPresets, undefined);
assert.equal(migrated.nextPresetId, undefined);

const hoc = courseSettings(start, 'greens').hoc;
const after = reducer(start, { type: 'SAVE_PRESET', surface: 'greens', name: 'Tournament' });
assert.equal(after, start);
assert.equal(courseSettings(after, 'greens').hoc, hoc);

const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(turf, /onSavePreset/);
assert.doesNotMatch(turf, /onApplyPreset/);
assert.doesNotMatch(readFileSync(new URL('../src/engine/mowing.js', import.meta.url), 'utf8'), /SAVE_PRESET/);

console.log('round 3 phase E checks passed');
