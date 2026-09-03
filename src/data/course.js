import {
  BACK_NINE_OFFSET_X,
  BOUNDARY_EXPAND,
  BUNKER_HOLE_COUNT,
  DOGLEG_MIN_HOLES,
  EXPANDED_HOLE_COUNT,
  HOLE_COUNT,
  MAP_VIEW_PADDING,
  POND_CX,
  POND_CY,
  POND_LABEL_OFFSET,
  POND_RX,
  POND_RY,
  RANGE_HEIGHT,
  RANGE_WIDTH,
  RANGE_X,
  RANGE_Y,
  ROUGH_GAP_MIN,
  TEE_MARKER_RADIUS,
} from './constants.js';
import { HOLE_SHAPES, SHED } from './courseLayout.js';
import { assertNoRoughOverlap, offsetPoints, polygonPath } from '../engine/geometry.js';

if (HOLE_SHAPES.length !== HOLE_COUNT) {
  throw new Error('Hole layout must match HOLE_COUNT');
}

if (HOLE_SHAPES.filter((hole) => hole.bunkers.length > 0).length < BUNKER_HOLE_COUNT) {
  throw new Error('Bunker holes must match BUNKER_HOLE_COUNT');
}

if (HOLE_SHAPES.filter((hole) => hole.dogleg).length < DOGLEG_MIN_HOLES) {
  throw new Error(`At least ${DOGLEG_MIN_HOLES} holes must dogleg`);
}

assertNoRoughOverlap(HOLE_SHAPES, ROUGH_GAP_MIN);

export const HOLES = HOLE_SHAPES;
export const SHED_X = SHED.x;
export const SHED_Y = SHED.y;
export const SHED_WIDTH = SHED.width;
export const SHED_HEIGHT = SHED.height;
export const SHED_ROOF = SHED.roof;
export const SHED_DOOR_WIDTH = SHED.doorWidth;
export const SHED_DOOR_HEIGHT = SHED.doorHeight;

function includePoint(box, x, y) {
  box.minX = Math.min(box.minX, x);
  box.minY = Math.min(box.minY, y);
  box.maxX = Math.max(box.maxX, x);
  box.maxY = Math.max(box.maxY, y);
}

function includeEllipse(box, shape) {
  includePoint(box, shape.cx - shape.rx, shape.cy - shape.ry);
  includePoint(box, shape.cx + shape.rx, shape.cy + shape.ry);
}

function includePoly(box, points) {
  for (const [x, y] of points) includePoint(box, x, y);
}

export function courseBounds(layout) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const hole of layout) {
    includePoly(box, hole.rough);
    includePoly(box, hole.fairway);
    includeEllipse(box, hole.tee);
    includeEllipse(box, hole.green);
    includePoint(box, hole.marker.cx - TEE_MARKER_RADIUS, hole.marker.cy - TEE_MARKER_RADIUS);
    includePoint(box, hole.marker.cx + TEE_MARKER_RADIUS, hole.marker.cy + TEE_MARKER_RADIUS);
    for (const bunker of hole.bunkers) includePoly(box, bunker);
  }
  includePoint(box, SHED_X, SHED_Y - SHED_ROOF);
  includePoint(box, SHED_X + SHED_WIDTH, SHED_Y + SHED_HEIGHT);
  includePoint(box, POND_CX - POND_RX, POND_CY - POND_RY);
  includePoint(box, POND_CX + POND_RX, POND_CY + POND_RY + POND_LABEL_OFFSET);
  includePoint(box, RANGE_X, RANGE_Y);
  includePoint(box, RANGE_X + RANGE_WIDTH, RANGE_Y + RANGE_HEIGHT);
  const pad = MAP_VIEW_PADDING;
  return {
    minX: box.minX - pad,
    minY: box.minY - pad,
    width: box.maxX - box.minX + pad * 2,
    height: box.maxY - box.minY + pad * 2,
  };
}

export function mapViewBoxFromBounds(bounds) {
  return `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`;
}

export const MAP_VIEWBOX = mapViewBoxFromBounds(courseBounds(HOLES));

function cross(origin, a, b) {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const lower = [];
  for (const point of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const point = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expandPolygon(poly, amount) {
  const count = poly.length;
  if (count < 3) return poly;
  return poly.map((cur, index) => {
    const prev = poly[(index + count - 1) % count];
    const next = poly[(index + 1) % count];
    const len1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) || 1;
    const len2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1;
    const o1 = [(cur[1] - prev[1]) / len1, -(cur[0] - prev[0]) / len1];
    const o2 = [(next[1] - cur[1]) / len2, -(next[0] - cur[0]) / len2];
    return [cur[0] + (o1[0] + o2[0]) * amount, cur[1] + (o1[1] + o2[1]) * amount];
  });
}

export function courseBoundaryPath(layout) {
  const points = [];
  for (const hole of layout) {
    for (const point of hole.rough) points.push(point);
  }
  points.push([SHED_X, SHED_Y - SHED_ROOF], [SHED_X + SHED_WIDTH, SHED_Y + SHED_HEIGHT]);
  points.push(
    [POND_CX - POND_RX, POND_CY],
    [POND_CX + POND_RX, POND_CY],
    [POND_CX, POND_CY - POND_RY],
    [POND_CX, POND_CY + POND_RY],
  );
  const hull = expandPolygon(convexHull(points), BOUNDARY_EXPAND);
  return polygonPath(hull);
}

function offsetHole(hole, dx, id) {
  return {
    ...hole,
    id,
    centerline: offsetPoints(hole.centerline, dx),
    rough: offsetPoints(hole.rough, dx),
    fairway: offsetPoints(hole.fairway, dx),
    bunkers: hole.bunkers.map((poly) => offsetPoints(poly, dx)),
    tee: { ...hole.tee, cx: hole.tee.cx + dx },
    green: { ...hole.green, cx: hole.green.cx + dx },
    marker: { ...hole.marker, cx: hole.marker.cx + dx },
  };
}

export const BACK_NINE = HOLES.map((hole) => offsetHole(hole, BACK_NINE_OFFSET_X, hole.id + HOLE_COUNT));

export function holesForCount(count) {
  return count >= EXPANDED_HOLE_COUNT ? HOLES.concat(BACK_NINE) : HOLES;
}

export function mapWidthForHoles(count) {
  return courseBounds(holesForCount(count)).width;
}

export function mapViewBoxForHoles(count) {
  return mapViewBoxFromBounds(courseBounds(holesForCount(count)));
}

export function holePath(points) {
  return polygonPath(points);
}

export function mowerPathFor(layout = HOLES) {
  const hole = layout[0];
  if (!hole?.centerline) return '';
  return hole.centerline
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`)
    .join(' ');
}
