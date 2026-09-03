/**
 * UI Phase 3: routing, boundary, flags, numbered tees, shed on the edge.
 * Run: node scripts/ui-phase3-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOLE_COUNT } from '../src/data/constants.js';
import { HOLES, SHED_HEIGHT, SHED_WIDTH, SHED_X, SHED_Y, courseBoundaryPath } from '../src/data/course.js';
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
const shedCy = SHED_Y + SHED_HEIGHT / 2;
const hole9 = HOLES[8];
assert.ok(
  dist(hole9.green.cx, hole9.green.cy, shedCx, shedCy) < 140,
  'hole 9 returns near the shed',
);
assert.ok(
  dist(HOLES[0].tee.cx, HOLES[0].tee.cy, shedCx, shedCy) < 140,
  'hole 1 starts near the shed',
);

for (let i = 0; i < HOLES.length - 1; i += 1) {
  const from = HOLES[i].green;
  const to = HOLES[i + 1].tee;
  const walk = dist(from.cx, from.cy, to.cx, to.cy);
  assert.ok(walk < 90, `hole ${i + 1} green is adjacent to hole ${i + 2} tee (${walk.toFixed(1)})`);
}

const centroid = HOLES.reduce(
  (acc, hole) => ({
    x: acc.x + (hole.tee.cx + hole.green.cx) / 2 / HOLES.length,
    y: acc.y + (hole.tee.cy + hole.green.cy) / 2 / HOLES.length,
  }),
  { x: 0, y: 0 },
);
assert.ok(SHED_Y > centroid.y, 'shed sits on the south edge, not in a ring centre');

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
assert.match(map, /\{holes\}-hole course/);

console.log('ui phase3 checks passed');
