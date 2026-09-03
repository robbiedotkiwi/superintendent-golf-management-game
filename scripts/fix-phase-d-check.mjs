/**
 * Fixes Round 2 Phase D gates.
 * Run: node scripts/fix-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BUNKER_DULL,
  DOGLEG_MIN_HOLES,
  DOGLEG_MIN_TURN,
  FAIRWAY_LANDING_T,
  NEGLECT_THRESHOLD,
  PATTERN_CHECKERBOARD,
  PATTERN_DIAMOND,
  PATTERN_OPACITY_FRESH,
  PATTERN_OPACITY_OVERDUE,
  PATTERN_RINGS,
  PATTERN_STRIPES,
  ROUGH_GAP_MIN,
  sand,
  soil,
} from '../src/data/constants.js';
import { HOLES } from '../src/data/course.js';
import { collidingRoughPairs, maxTurnDegrees } from '../src/engine/geometry.js';
import { fairwayHalfWidth, fairwayWidthVaries } from '../src/engine/holeShape.js';
import { luminance, surfaceFill } from '../src/engine/color.js';
import { patternOpacity, patternRotate } from '../src/engine/pattern.js';

assert.equal(surfaceFill('bunkers', 100).toLowerCase(), sand.toLowerCase());
assert.notEqual(surfaceFill('bunkers', 0).toLowerCase(), soil.toLowerCase());
assert.ok(luminance(surfaceFill('bunkers', 0)) > luminance(soil) + 40);
assert.ok(luminance(surfaceFill('bunkers', 0)) < luminance(sand));
assert.equal(BUNKER_DULL.startsWith('#'), true);

const overlaps = collidingRoughPairs(HOLES, ROUGH_GAP_MIN);
assert.deepEqual(overlaps, []);

const doglegs = HOLES.filter((hole) => hole.dogleg);
assert.ok(doglegs.length >= DOGLEG_MIN_HOLES, `doglegs ${doglegs.length}`);
for (const hole of doglegs) {
  assert.ok(maxTurnDegrees(hole.centerline) >= DOGLEG_MIN_TURN, `hole ${hole.id} turn`);
}

assert.equal(fairwayWidthVaries(), true);
assert.ok(fairwayHalfWidth(0) > fairwayHalfWidth(FAIRWAY_LANDING_T));
assert.ok(fairwayHalfWidth(1) > fairwayHalfWidth(FAIRWAY_LANDING_T));

assert.ok(HOLES.some((hole) => hole.bunkers.length >= 2), 'landing and greenside bunkers');
for (const hole of HOLES) {
  for (const bunker of hole.bunkers) {
    assert.ok(bunker.length >= 5, 'bunker is an irregular polygon, not an ellipse');
  }
}

assert.equal(patternOpacity(0, NEGLECT_THRESHOLD.greens), PATTERN_OPACITY_FRESH);
assert.equal(patternOpacity(NEGLECT_THRESHOLD.greens, NEGLECT_THRESHOLD.greens), PATTERN_OPACITY_OVERDUE);
assert.ok(patternOpacity(1, NEGLECT_THRESHOLD.greens) > patternOpacity(2, NEGLECT_THRESHOLD.greens));
assert.equal(patternRotate(PATTERN_STRIPES, 40), 40);
assert.equal(patternRotate(PATTERN_DIAMOND, 40), 85);

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /mow-greens/);
assert.match(map, /patternTransform/);
assert.match(map, /surfacePatternOpacity/);
assert.doesNotMatch(map, /hole\.bunker\?/);
assert.match(map, /hole\.bunkers/);
assert.doesNotMatch(map, /from '\.\.\/engine\/holeShape/);

const layout = readFileSync(new URL('../src/data/courseLayout.js', import.meta.url), 'utf8');
assert.match(layout, /centerline/);

const color = readFileSync(new URL('../src/engine/color.js', import.meta.url), 'utf8');
assert.match(color, /BUNKER_DULL/);
assert.doesNotMatch(color, /lerpHex\(sand, soil/);

assert.ok(map.includes(PATTERN_RINGS) || map.includes('PATTERN_RINGS'));
assert.ok(map.includes(PATTERN_CHECKERBOARD) || map.includes('PATTERN_CHECKERBOARD'));

console.log('fix phase D checks passed');
