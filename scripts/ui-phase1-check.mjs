/**
 * UI Phase 1: course viewBox is computed from geometry and covers 9 and 18 holes.
 * Run: node scripts/ui-phase1-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPANDED_HOLE_COUNT, HOLE_COUNT, MAP_VIEW_PADDING, POND_CX, POND_CY } from '../src/data/constants.js';
import {
  BACK_NINE,
  HOLES,
  SHED_HEIGHT,
  SHED_WIDTH,
  SHED_X,
  SHED_Y,
  courseBounds,
  holesForCount,
  mapViewBoxForHoles,
} from '../src/data/course.js';

function viewBoxParts(box) {
  const [minX, minY, width, height] = box.split(' ').map(Number);
  return { minX, minY, width, height, maxX: minX + width, maxY: minY + height };
}

function inside(box, x, y) {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}

const nine = courseBounds(holesForCount(HOLE_COUNT));
const eighteen = courseBounds(holesForCount(EXPANDED_HOLE_COUNT));
assert.ok(nine.width > 0 && nine.height > 0);
assert.ok(eighteen.width > nine.width);
assert.equal(holesForCount(EXPANDED_HOLE_COUNT).length, HOLE_COUNT + BACK_NINE.length);

const nineBox = viewBoxParts(mapViewBoxForHoles(HOLE_COUNT));
for (const hole of HOLES) {
  assert.ok(inside(nineBox, hole.tee.cx, hole.tee.cy), `tee ${hole.id} in viewBox`);
  assert.ok(inside(nineBox, hole.green.cx, hole.green.cy), `green ${hole.id} in viewBox`);
}
assert.ok(inside(nineBox, SHED_X + SHED_WIDTH / 2, SHED_Y + SHED_HEIGHT / 2));
assert.ok(inside(nineBox, POND_CX, POND_CY));
assert.equal(nineBox.minX, nine.minX);
assert.ok(nine.width > MAP_VIEW_PADDING);

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /preserveAspectRatio="xMidYMid meet"/);
assert.match(map, /courseBounds/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /overflow-hidden/);
assert.match(app, /h-screen/);

console.log('ui phase1 checks passed');
