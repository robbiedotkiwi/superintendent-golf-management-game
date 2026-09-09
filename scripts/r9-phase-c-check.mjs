#!/usr/bin/env node
/**
 * Round 9 Phase C: irrigation in millimetres.
 * Run: node scripts/r9-phase-c-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  HOLE_COUNT,
  IRRIGATED_AREA_M2_PER_HOLE,
  IRRIGATION_MM_M3_DIVISOR,
  IRRIGATION_MM_RANGE,
  MOISTURE_PER_MM,
  STARTING_IRRIGATION,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  clampIrrigationMm,
  irrigationDemand,
  irrigationMmToM3,
  migrateIrrigation,
  migrateIrrigationValue,
  moistureFromMm,
  projectedPondVolume,
} from '../src/engine/irrigation.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.deepEqual(IRRIGATION_MM_RANGE.green, { min: 0, max: 10, default: 4, step: 0.5 });
assert.deepEqual(IRRIGATION_MM_RANGE.tee, { min: 0, max: 10, default: 4, step: 0.5 });
assert.deepEqual(IRRIGATION_MM_RANGE.fairway, { min: 0, max: 8, default: 3, step: 0.5 });
assert.deepEqual(IRRIGATED_AREA_M2_PER_HOLE, { green: 500, tee: 250, fairway: 3000 });
assert.deepEqual(MOISTURE_PER_MM, { green: 1.4, tee: 1.1, fairway: 0.9 });
assert.equal(IRRIGATION_MM_M3_DIVISOR, 1000);
assert.deepEqual(STARTING_IRRIGATION, { greens: 4, tees: 4, fairways: 3 });

assert.equal(irrigationMmToM3('greens', 4, 9), 18);
assert.equal(irrigationMmToM3('fairways', 3, 9), 81);
assert.equal(moistureFromMm('greens', 4), 5.6);
assert.equal(moistureFromMm('tees', 4), 4.4);
assert.equal(moistureFromMm('fairways', 3), 2.7);

assert.equal(migrateIrrigationValue('greens', 'off'), 0);
assert.equal(migrateIrrigationValue('greens', 'light'), 2);
assert.equal(migrateIrrigationValue('greens', 'full'), 4);
assert.equal(migrateIrrigationValue('fairways', 'light'), 1.5);
assert.equal(migrateIrrigationValue('fairways', 'full'), 3);
assert.equal(clampIrrigationMm('greens', 4.2), 4);
assert.equal(clampIrrigationMm('greens', 10.5), 10);

const migrated = migrateIrrigation({ greens: 'off', tees: 'light', fairways: 'full' });
assert.deepEqual(migrated, { greens: 0, tees: 2, fairways: 3 });

const start = createInitialState();
assert.deepEqual(start.irrigation, STARTING_IRRIGATION);
const demand = irrigationDemand(start);
assert.equal(demand.demand.greens, 18);
assert.equal(demand.total, 18 + irrigationMmToM3('tees', 4, HOLE_COUNT) + irrigationMmToM3('fairways', 3, HOLE_COUNT));

let set = reducer(start, { type: 'SET_IRRIGATION', surface: 'greens', mm: 0 });
assert.equal(set.irrigation.greens, 0);
assert.ok(projectedPondVolume(set) > projectedPondVolume(start));
set = reducer(set, { type: 'SET_IRRIGATION', surface: 'fairways', mm: 8 });
assert.equal(set.irrigation.fairways, 8);
assert.ok(irrigationDemand(set).demand.fairways > irrigationDemand(start).demand.fairways);

const old = migrateSave({
  day: 4,
  irrigation: { greens: 'off', tees: 'light', fairways: 'full' },
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.deepEqual(old.irrigation, { greens: 0, tees: 2, fairways: 3 });

const turfSrc = read('src/components/Turf.jsx');
assert.match(turfSrc, /IrrigationMmSlider/);
assert.match(turfSrc, /data-irrigation-status/);
assert.match(turfSrc, /rightInteractive/);
assert.match(turfSrc, /CHECK_MOISTURE_LABEL/);
assert.match(turfSrc, /Target band/);
assert.doesNotMatch(turfSrc, /IRRIGATION_POLICIES/);
assert.doesNotMatch(turfSrc, /POLICY_LABELS/);
assert.doesNotMatch(turfSrc, /\bOff\b/);
assert.doesNotMatch(turfSrc, /\bLight\b/);
assert.doesNotMatch(turfSrc, /\bFull\b/);

const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /IrrigationMmSlider/);
assert.doesNotMatch(dialog, /IRRIGATION_POLICIES/);
assert.doesNotMatch(dialog, /\bOff\b/);
assert.doesNotMatch(dialog, /\bLight\b/);
assert.doesNotMatch(dialog, /\bFull\b/);

const slider = read('src/components/IrrigationMmSlider.jsx');
assert.match(slider, /irrigationMmRange/);
assert.match(slider, /data-irrigation-m3/);
assert.match(slider, /data-projected-pond/);

console.log('r9-phase-c-check: ok');
