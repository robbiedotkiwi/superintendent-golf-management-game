/**
 * UI Phase 3: routing, boundary, flags, numbered tees, shed on the edge.
 * Run: node scripts/ui-phase3-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOLE_COUNT, HOLE_NUMBER_FONT, POND_CX, POND_CY, TEE_MARKER_RADIUS } from '../src/data/constants.js';
import { HOLES, SHED_WIDTH, SHED_X, SHED_Y, courseBoundaryPath } from '../src/data/course.js';
import { boundaryFill, healthyFill, luminance } from '../src/engine/color.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

assert.equal(HOLES.length, HOLE_COUNT);
assert.deepEqual(
  HOLES.map((hole) => hole.id),
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
);

const shedCx = SHED_X + SHED_WIDTH / 2;
const hole8 = HOLES[7];
assert.ok(hole8.rough.every((point) => point[1] <= SHED_Y), 'hole 8 sits above the shed');
assert.ok(Math.abs(HOLES[6].tee.cx - POND_CX) < 450, 'pond sits under the hole 7 column');
assert.ok(Math.abs(shedCx - hole8.tee.cx) < 400, 'shed sits under the hole 8 column');

const centroid = HOLES.reduce(
  (acc, hole) => ({
    x: acc.x + (hole.tee.cx + hole.green.cx) / 2 / HOLES.length,
    y: acc.y + (hole.tee.cy + hole.green.cy) / 2 / HOLES.length,
  }),
  { x: 0, y: 0 },
);
assert.ok(SHED_Y > centroid.y, 'shed sits on the south edge, not in a ring centre');
assert.ok(
  dist(POND_CX, POND_CY, centroid.x, centroid.y) > 80,
  'pond is a side hazard, not the hub of a ring',
);
assert.ok(TEE_MARKER_RADIUS >= 18, 'tee markers large enough to read when scaled');
assert.ok(HOLE_NUMBER_FONT >= 20, 'tee numbers large enough to read when scaled');

const boundary = courseBoundaryPath(HOLES);
assert.match(boundary, /^M/);
assert.match(boundary, /Z$/);
assert.ok(boundary.split(' L').length >= 6, 'boundary is an irregular closed shape');

assert.ok(luminance(boundaryFill()) < luminance(healthyFill('rough')), 'boundary darker than rough');

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /courseBoundaryPath/);
assert.match(map, /FLAG_POLE/);
assert.match(map, /SHED_ROOF/);
assert.match(map, /\{hole\.id\}/);
assert.match(map, /hole\.marker/);
assert.match(map, /HOLE_NUMBER_RADIUS|TEE_MARKER_RADIUS/);
assert.match(map, /\{holes\}-hole course/);

console.log('ui phase3 checks passed');
