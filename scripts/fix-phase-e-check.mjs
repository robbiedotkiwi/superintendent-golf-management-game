/**
 * Fixes Round 2 Phase E gates.
 * Run: node scripts/fix-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VIEW_DRAG_THRESHOLD,
  VIEW_PAN_X_DEFAULT,
  VIEW_PAN_Y_DEFAULT,
  VIEW_ZOOM_DEFAULT,
  VIEW_ZOOM_MAX,
  VIEW_ZOOM_MIN,
} from '../src/data/constants.js';
import { HOLES, courseBounds } from '../src/data/course.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { withDefaults } from '../src/engine/save.js';
import {
  clampZoom,
  defaultView,
  fitCourse,
  fitToRect,
  holeBounds,
  isDrag,
  panBy,
  viewBoxFromView,
  zoomAround,
} from '../src/engine/view.js';

assert.equal(VIEW_ZOOM_MIN, 0.5);
assert.equal(VIEW_ZOOM_MAX, 4);
assert.equal(VIEW_DRAG_THRESHOLD, 5);
assert.equal(clampZoom(0.1), VIEW_ZOOM_MIN);
assert.equal(clampZoom(9), VIEW_ZOOM_MAX);
assert.equal(isDrag(5, 0), true);
assert.equal(isDrag(3, 3), false);

const bounds = courseBounds(HOLES);
const start = defaultView();
const box = viewBoxFromView(start, bounds);
const worldX = box.x + box.width * 0.3;
const worldY = box.y + box.height * 0.4;
const zoomed = zoomAround(start, bounds, worldX, worldY, 2);
const after = viewBoxFromView(zoomed, bounds);
const fxBefore = (worldX - box.x) / box.width;
const fxAfter = (worldX - after.x) / after.width;
assert.ok(Math.abs(fxBefore - fxAfter) < 0.001, 'wheel zoom stays cursor-anchored');
assert.equal(zoomed.zoom, 2);

const panned = panBy(start, bounds, 10000, 10000);
const pannedBox = viewBoxFromView(panned, bounds);
assert.ok(pannedBox.x < bounds.minX + bounds.width, 'course not panned fully off');
assert.ok(pannedBox.x + pannedBox.width > bounds.minX, 'course still intersects view');

assert.deepEqual(fitCourse(), { zoom: VIEW_ZOOM_DEFAULT, panX: VIEW_PAN_X_DEFAULT, panY: VIEW_PAN_Y_DEFAULT });
const holeFit = fitToRect(bounds, holeBounds(HOLES[0]));
assert.ok(holeFit.zoom > 1, 'fitting a hole zooms in');

const fitted = reducer(createInitialState(), { type: 'SET_VIEW', view: holeFit });
assert.equal(fitted.view.zoom, holeFit.zoom);
const reset = reducer(fitted, { type: 'SET_VIEW', view: fitCourse() });
assert.equal(reset.view.zoom, VIEW_ZOOM_DEFAULT);
assert.equal(reset.view.panX, VIEW_PAN_X_DEFAULT);

const migrated = withDefaults({ day: 1, holes: createInitialState().holes, surfaceDefaults: createInitialState().surfaceDefaults });
assert.equal(migrated.view.zoom, VIEW_ZOOM_DEFAULT);

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /onPointerDown/);
assert.match(map, /onClickCapture/);
assert.match(map, /onDoubleClick/);
assert.match(map, /VIEW_DRAG_THRESHOLD|isDrag/);
assert.match(map, /event\.key === '0'/);

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /Fit/);

console.log('fix phase E checks passed');
