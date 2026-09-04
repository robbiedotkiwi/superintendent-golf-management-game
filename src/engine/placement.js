import {
  POND_CX,
  POND_CY,
  POND_RX,
  POND_RY,
  PROPERTY_MAX_X,
  PROPERTY_MAX_Y,
  PROPERTY_MIN_X,
  PROPERTY_MIN_Y,
  SHED_CLEARANCE,
} from '../data/constants.js';
import { polygonsIntersect } from './geometry.js';

function rectPolygon(rect) {
  return [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ];
}

function ellipsePolygon(cx, cy, rx, ry, count = 24) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const ang = (i / count) * Math.PI * 2;
    points.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]);
  }
  return points;
}

export function shedClearanceRect(shed) {
  return {
    x: shed.x - SHED_CLEARANCE,
    y: shed.y - shed.roof - SHED_CLEARANCE,
    width: shed.width + SHED_CLEARANCE * 2,
    height: shed.height + shed.roof + SHED_CLEARANCE * 2,
  };
}

export function holePlacement(hole, holes, shed) {
  const shedClear = !polygonsIntersect(hole.rough, rectPolygon(shedClearanceRect(shed)));
  const pond = !polygonsIntersect(hole.rough, ellipsePolygon(POND_CX, POND_CY, POND_RX, POND_RY));
  const others = holes
    .filter((other) => other.id !== hole.id)
    .every((other) => !polygonsIntersect(hole.rough, other.rough));
  const inside = hole.rough.every(
    (point) =>
      point[0] >= PROPERTY_MIN_X &&
      point[0] <= PROPERTY_MAX_X &&
      point[1] >= PROPERTY_MIN_Y &&
      point[1] <= PROPERTY_MAX_Y,
  );
  return {
    id: hole.id,
    shed: shedClear,
    pond,
    others,
    boundary: inside,
    ok: shedClear && pond && others && inside,
  };
}

export function placementReport(holes, shed) {
  return holes.map((hole) => holePlacement(hole, holes, shed));
}

export function formatPlacementReport(holes, shed) {
  return placementReport(holes, shed).map((row) => {
    const mark = (pass) => (pass ? 'PASS' : 'FAIL');
    return `HOLE ${row.id} shed ${mark(row.shed)} pond ${mark(row.pond)} others ${mark(row.others)} boundary ${mark(row.boundary)}`;
  });
}

export function assertHolePlacement(holes, shed) {
  const rows = placementReport(holes, shed);
  if (rows.some((row) => !row.ok)) {
    throw new Error(`Hole placement assertions failed:\n${formatPlacementReport(holes, shed).join('\n')}`);
  }
}
