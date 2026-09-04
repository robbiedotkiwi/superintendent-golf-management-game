/**
 * Round 3 Phase E: named height/pattern presets.
 * Run: node scripts/r3-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRESET_MAX, PRESET_NAME_MAX } from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { presetsForSurface } from '../src/engine/presets.js';
import { migrateSave } from '../src/engine/save.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


assert.equal(PRESET_MAX, 8);
assert.equal(PRESET_NAME_MAX, 24);

const start = createInitialState();
assert.deepEqual(start.customPresets, []);
assert.equal(start.nextPresetId, 1);

const migrated = migrateSave({
  day: 2,
  surfaces: {
    greens: { quality: 55 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.deepEqual(migrated.customPresets, []);
assert.equal(migrated.nextPresetId, 1);

let state = reducer(start, { type: 'SET_HOC', surface: 'greens', hoc: 2.8 });
state = reducer(state, { type: 'SET_PATTERN', surface: 'greens', pattern: 'rings' });
state = reducer(state, { type: 'SET_ANGLE', surface: 'greens', angle: 45 });
state = reducer(state, { type: 'SAVE_PRESET', surface: 'greens', name: '  Tournament  ' });
assert.equal(state.customPresets.length, 1);
assert.equal(state.customPresets[0].name, 'Tournament');
assert.equal(state.customPresets[0].hoc, 2.8);
assert.equal(state.customPresets[0].pattern, 'rings');
assert.equal(state.customPresets[0].angle, 45);
assert.equal(presetsForSurface(state, 'tees').length, 0);

state = reducer(state, { type: 'SET_HOC', surface: 'greens', hoc: 3.5 });
state = reducer(state, { type: 'SET_PATTERN', surface: 'greens', pattern: 'stripes' });
state = reducer(state, { type: 'APPLY_PRESET', id: 1 });
assert.equal(courseSettings(state, 'greens').hoc, 2.8);
assert.equal(courseSettings(state, 'greens').pattern, 'rings');
assert.equal(courseSettings(state, 'greens').angle, 45);

const long = reducer(start, { type: 'SAVE_PRESET', surface: 'fairways', name: 'x'.repeat(40) });
assert.equal(long.customPresets[0].name.length, PRESET_NAME_MAX);

let filled = start;
for (let i = 0; i < PRESET_MAX + 2; i += 1) {
  filled = reducer(filled, { type: 'SAVE_PRESET', surface: 'rough', name: `R${i}` });
}
assert.equal(filled.customPresets.length, PRESET_MAX);

const removed = reducer(state, { type: 'DELETE_PRESET', id: 1 });
assert.equal(removed.customPresets.length, 0);
assert.equal(courseSettings(removed, 'greens').hoc, 2.8);

const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turf, /onSavePreset/);
assert.match(turf, /onApplyPreset/);
assert.doesNotMatch(readFileSync(new URL('../src/engine/mowing.js', import.meta.url), 'utf8'), /SAVE_PRESET/);

console.log('round 3 phase E checks passed');
