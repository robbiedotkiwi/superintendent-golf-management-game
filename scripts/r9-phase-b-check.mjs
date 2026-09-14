#!/usr/bin/env node
/**
 * Round 9 Phase B: Mowing two-column status.
 * Run: node scripts/r9-phase-b-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  GRASS_GROWTH_MM_PER_DAY,
  HOC_SURFACES,
  NEGLECT_THRESHOLD,
  PATTERN_WEAR_DEFAULT,
  PATTERN_WEAR_INCREMENT,
  SEASON_GROWTH,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { holeKind, holeSurface, mapHoleSurfaces } from '../src/engine/holes.js';
import { mowingStatus, laggingHoleIds, holeGrassLengthMm } from '../src/engine/mowingStatus.js';
import { surfaceCeiling } from '../src/engine/equipment.js';

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /TwoColumn/);
assert.match(turfSrc, /MowingStatus/);
assert.match(turfSrc, /pointer-events-none/);
assert.match(turfSrc, /data-mowing-status/);
assert.equal((turfSrc.match(/function MowingSurface/g) || []).length, 1);

assert.equal(GRASS_GROWTH_MM_PER_DAY.greens, 0.4);
assert.equal(GRASS_GROWTH_MM_PER_DAY.tees, 0.7);
assert.equal(GRASS_GROWTH_MM_PER_DAY.fairways, 1.0);
assert.equal(GRASS_GROWTH_MM_PER_DAY.rough, 2.5);

const start = createInitialState();
for (const surface of HOC_SURFACES) {
  const status = mowingStatus(start, surface);
  assert.equal(status.heightMm, start.surfaceDefaults[surface].hoc);
  assert.equal(status.daysSinceCut, 0);
  assert.equal(status.overdue, false);
  assert.equal(status.quality, start.holes[0][holeKind(surface)].quality);
  assert.equal(status.ceiling, surfaceCeiling(start, surface));
  assert.equal(status.wear, PATTERN_WEAR_DEFAULT);
  assert.deepEqual(status.lagging, []);
  assert.equal(status.grassMm, status.heightMm);
}

let grown = { ...start, day: 5, season: 'spring' };
grown = {
  ...grown,
  holes: mapHoleSurfaces(grown.holes, 'greens', (record) => ({ ...record, lastMownDay: 1, heightAtLastCut: 3.5 })),
};
const greenStatus = mowingStatus(grown, 'greens');
assert.equal(greenStatus.daysSinceCut, 4);
assert.equal(greenStatus.overdue, true);
assert.ok(greenStatus.daysSinceCut >= NEGLECT_THRESHOLD.greens);
const expectedGrass = 3.5 + 4 * GRASS_GROWTH_MM_PER_DAY.greens * SEASON_GROWTH.spring;
assert.equal(greenStatus.grassMm, expectedGrass);
assert.equal(
  holeGrassLengthMm(grown, 'greens', holeSurface(grown, 1, 'greens')),
  expectedGrass,
);

let split = {
  ...start,
  day: 10,
  holes: mapHoleSurfaces(start.holes, 'greens', (record, hole) =>
    hole.id <= 3
      ? { ...record, lastMownDay: 10, heightAtLastCut: 3.5 }
      : { ...record, lastMownDay: 4, heightAtLastCut: 3.5 },
  ),
};
assert.deepEqual(laggingHoleIds(split, 'greens'), [4, 5, 6, 7, 8, 9]);
assert.match(JSON.stringify(mowingStatus(split, 'greens').lagging), /4/);

const worn = {
  ...start,
  holes: mapHoleSurfaces(start.holes, 'greens', (record) => ({
    ...record,
    patternWear: PATTERN_WEAR_INCREMENT,
  })),
};
assert.equal(mowingStatus(worn, 'greens').wearClimbing, true);
assert.equal(mowingStatus(worn, 'greens').wear, PATTERN_WEAR_INCREMENT);

const unchanged = reducer(start, { type: 'SET_HOC', surface: 'greens', hoc: 4 });
assert.notEqual(mowingStatus(unchanged, 'greens').heightMm, mowingStatus(start, 'greens').heightMm);

console.log('r9-phase-b-check: ok');
