/**
 * Round 5 Phase A: named Figma course layout and placement assertions.
 * Run: node scripts/r5-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CENTRELINE_WIDTH,
  FAIRWAY_WIDTH,
  GREEN_SHAPE_CIRCLE,
  GREEN_SIZE_RANGE,
  HOLE_NUMBER_RADIUS,
  SHED_CLEARANCE,
  TEE_SIZE,
} from '../src/data/constants.js';
import { HOLES } from '../src/data/course.js';
import { SHED } from '../src/data/courseLayout.js';
import { formatPlacementReport, placementReport } from '../src/engine/placement.js';

assert.equal(TEE_SIZE.w, 34);
assert.equal(TEE_SIZE.h, 20);
assert.equal(FAIRWAY_WIDTH, 58);
assert.deepEqual(GREEN_SIZE_RANGE, [58, 82]);
assert.equal(CENTRELINE_WIDTH, 2);
assert.equal(HOLE_NUMBER_RADIUS, 50);
assert.equal(SHED_CLEARANCE, 40);

const BUNKERS_BY_HOLE = { 1: 1, 2: 2, 3: 0, 4: 1, 5: 1, 6: 0, 7: 1, 8: 2, 9: 0 };

const lines = formatPlacementReport(HOLES, SHED);
for (const line of lines) console.log(line);
const rows = placementReport(HOLES, SHED);
assert.equal(rows.length, 9);
for (const row of rows) {
  assert.equal(row.ok, true, `hole ${row.id} ${JSON.stringify(row)}`);
}

for (const hole of HOLES) {
  assert.ok(hole.rough?.length, `hole ${hole.id} perimeter`);
  assert.ok(hole.tee?.points?.length, `hole ${hole.id} tee`);
  assert.ok(hole.fairway?.length, `hole ${hole.id} fairway`);
  assert.ok(hole.green?.points?.length, `hole ${hole.id} green`);
  assert.equal(hole.bunkers.length, BUNKERS_BY_HOLE[hole.id], `hole ${hole.id} named Figma bunkers`);
  assert.ok(hole.centerline?.length >= 2, `hole ${hole.id} centreline`);
  assert.equal(hole.green.variant, GREEN_SHAPE_CIRCLE, `hole ${hole.id} green is a circle`);
  assert.ok(hole.marker.cx > hole.green.cx, `hole ${hole.id} number sits right of the green`);
  const teeToGreen = [hole.green.cx - hole.tee.cx, hole.green.cy - hole.tee.cy];
  const teeToFlag = [hole.flag.x - hole.tee.cx, hole.flag.y - hole.tee.cy];
  const far =
    teeToFlag[0] * teeToGreen[0] + teeToFlag[1] * teeToGreen[1] >
    (hole.green.cx - hole.tee.cx) * (hole.green.cx - hole.tee.cx) * 0.2;
  const beyondGreen =
    Math.hypot(hole.flag.x - hole.tee.cx, hole.flag.y - hole.tee.cy) >=
    Math.hypot(hole.green.cx - hole.tee.cx, hole.green.cy - hole.tee.cy) - 2;
  assert.ok(far || beyondGreen, `hole ${hole.id} flag on far side`);
}

assert.equal(HOLES.filter((hole) => hole.bent).length, 0, 'Figma holes are straight');

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(map, /key=\{`centreline-/);
assert.match(map, /HOLE_NUMBER_RADIUS/);
assert.match(map, /hole\.flag/);

const layout = readFileSync(new URL('../src/data/courseLayout.js', import.meta.url), 'utf8');
assert.match(layout, /greenShape/);
assert.match(layout, /tee:/);
assert.match(layout, /green:/);
assert.match(layout, /centerline/);

console.log('GATE A1 PASS every hole has perimeter, tee, fairway, green, centreline');
console.log('GATE A2 PASS greens match the named Figma circle greens');
console.log('GATE A3 PASS number sits in the named Hole Number slot');
console.log('GATE A4 PASS flags sit on the far side of the green from the tee');
console.log('GATE A5 PASS placement assertions pass for shed, pond, others, boundary');
console.log('round 5 phase A checks passed');
