#!/usr/bin/env node
/**
 * Round 9 Phase A: remove Turf Summary and Presets.
 * Run: node scripts/r9-phase-a-check.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  SECTION_TURF,
  TURF_TAB_INPUTS,
  TURF_TAB_IRRIGATION,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TABS,
  TURF_TAB_DEFAULT,
  TURF_TAB_LABELS,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { courseSettings } from '../src/engine/holes.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.deepEqual(TURF_TABS, [
  TURF_TAB_MOWING,
  TURF_TAB_IRRIGATION,
  TURF_TAB_INPUTS,
  TURF_TAB_OTHER,
]);
assert.equal(TURF_TABS.length, 4);
assert.equal(TURF_TAB_DEFAULT, TURF_TAB_MOWING);
assert.equal(TURF_TAB_LABELS[TURF_TAB_MOWING], 'Mowing');
assert.equal(Object.keys(TURF_TAB_LABELS).length, 4);

const start = createInitialState();
assert.equal(start.tabs[SECTION_TURF], TURF_TAB_MOWING);
assert.equal(start.customPresets, undefined);
assert.equal(start.nextPresetId, undefined);
assert.equal(reducer(start, { type: 'SAVE_PRESET', surface: 'greens', name: 'Daily' }), start);
assert.equal(reducer(start, { type: 'MATCH_LAST_MOWING' }), start);
assert.equal(reducer(start, { type: 'APPLY_SHIPPED_PRESET', id: 'tournament' }), start);

const old = migrateSave({
  day: 12,
  tabs: { [SECTION_TURF]: 'summary' },
  customPresets: [
    { id: 1, name: 'Open', surface: 'greens', hoc: 2.8, pattern: 'rings', angle: 45, autoRotate: false },
  ],
  nextPresetId: 9,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(old.tabs[SECTION_TURF], TURF_TAB_MOWING);
assert.equal(old.customPresets, undefined);
assert.equal(old.nextPresetId, undefined);
assert.equal(courseSettings(old, 'greens').hoc, courseSettings(start, 'greens').hoc);

const presetsTab = migrateSave({
  day: 8,
  tabs: { [SECTION_TURF]: 'presets' },
  holes: old.holes,
  surfaceDefaults: old.surfaceDefaults,
});
assert.equal(presetsTab.tabs[SECTION_TURF], TURF_TAB_MOWING);

const turfSrc = read('src/components/Turf.jsx');
assert.match(turfSrc, /TURF_TAB_MOWING/);
assert.match(turfSrc, /TURF_TAB_IRRIGATION/);
assert.match(turfSrc, /TURF_TAB_INPUTS/);
assert.match(turfSrc, /TURF_TAB_OTHER/);
assert.doesNotMatch(turfSrc, /TURF_TAB_SUMMARY/);
assert.doesNotMatch(turfSrc, /TURF_TAB_PRESETS/);
assert.doesNotMatch(turfSrc, /<ForecastStrip/);
assert.doesNotMatch(turfSrc, /MATCH_LAST/);
assert.doesNotMatch(turfSrc, /onSavePreset|onApplyPreset|SHIPPED_PRESETS|PresetsTab/);

const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /<ForecastStrip/);

const app = read('src/App.jsx');
assert.doesNotMatch(app, /SAVE_PRESET|MATCH_LAST_MOWING|onSavePreset|onMatchLastMowing/);

const banned = [
  'TURF_TAB_SUMMARY',
  'TURF_TAB_PRESETS',
  'MATCH_LAST_MOWING',
  'SHIPPED_PRESET',
  'PRESET_MAX',
  'PRESET_NAME_MAX',
  'customPresets',
  'nextPresetId',
  'SAVE_PRESET',
  'APPLY_PRESET',
  'APPLY_SHIPPED_PRESET',
  'DELETE_PRESET',
  'onSavePreset',
  'onMatchLastMowing',
  'MATCH_LAST_MOWING_LABEL',
];
const grep = execSync(
  `rg -n ${banned.map((term) => `-e '${term}'`).join(' ')} -g '!src/engine/save.js' src || true`,
  { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname },
);
assert.equal(grep.trim(), '', `leftover Summary/Presets hits:\n${grep}`);
const saveSrc = read('src/engine/save.js');
assert.match(saveSrc, /delete next\.customPresets/);
assert.match(saveSrc, /delete next\.nextPresetId/);
assert.doesNotMatch(saveSrc, /customPresets:/);

console.log('r9-phase-a-check: ok');
