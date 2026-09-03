import {
  BACK_NINE_OFFSET_X,
  BOUNDARY_EXPAND,
  BUNKER_HOLE_COUNT,
  BUNKER_OFFSET,
  BUNKER_RX,
  BUNKER_RY,
  EXPANDED_HOLE_COUNT,
  FAIRWAY_HALF_WIDTH,
  GREEN_RX,
  GREEN_RY,
  HOLE_COUNT,
  HOLE_PATH_SAMPLES,
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
  ROUGH_HALF_WIDTH,
  TEE_RX,
  TEE_RY,
} from './constants.js';

const HOLE_LAYOUT = [
  { id: 1, tee: [440, 580], green: [700, 460], curve: 48, bunker: false },
  { id: 2, tee: [730, 440], green: [800, 220], curve: -52, bunker: true },
  { id: 3, tee: [780, 190], green: [530, 70], curve: 55, bunker: false },
  { id: 4, tee: [500, 70], green: [240, 130], curve: -42, bunker: false },
  { id: 5, tee: [210, 160], green: [130, 360], curve: 68, bunker: true },
  { id: 6, tee: [150, 390], green: [260, 520], curve: -48, bunker: false },
  { id: 7, tee: [300, 540], green: [520, 500], curve: 36, bunker: true },
  { id: 8, tee: [550, 480], green: [640, 300], curve: -62, bunker: false },
  { id: 9, tee: [620, 280], green: [490, 555], curve: 70, bunker: false },
];

function quadPoint(x1, y1, cx, cy, x2, y2, t) {
  const mt = 1 - t;
  return [
    mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
    mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
  ];
}

function quadTan(x1, y1, cx, cy, x2, y2, t) {
  const mt = 1 - t;
  return [2 * mt * (cx - x1) + 2 * t * (x2 - cx), 2 * mt * (cy - y1) + 2 * t * (y2 - cy)];
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

function controlPoint(tee, green, curve) {
  const [x1, y1] = tee;
  const [x2, y2] = green;
  const [nx, ny] = normalize(-(y2 - y1), x2 - x1);
  return [(x1 + x2) / 2 + nx * curve, (y1 + y2) / 2 + ny * curve];
}

function sausagePath(tee, green, curve, halfWidth) {
  const [x1, y1] = tee;
  const [x2, y2] = green;
  const [cx, cy] = controlPoint(tee, green, curve);
  const left = [];
  const right = [];
  for (let i = 0; i <= HOLE_PATH_SAMPLES; i += 1) {
    const t = i / HOLE_PATH_SAMPLES;
    const [px, py] = quadPoint(x1, y1, cx, cy, x2, y2, t);
    const [tx, ty] = quadTan(x1, y1, cx, cy, x2, y2, t);
    const [nx, ny] = normalize(-ty, tx);
    left.push([px + nx * halfWidth, py + ny * halfWidth]);
    right.push([px - nx * halfWidth, py - ny * halfWidth]);
  }
  const ring = left.concat(right.reverse());
  return ring.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ') + ' Z';
}

function buildHole(layout) {
  const [x1, y1] = layout.tee;
  const [x2, y2] = layout.green;
  const [cx, cy] = controlPoint(layout.tee, layout.green, layout.curve);
  const [tx, ty] = quadTan(x1, y1, cx, cy, x2, y2, 1);
  const [nx, ny] = normalize(-ty, tx);
  return {
    id: layout.id,
    rough: sausagePath(layout.tee, layout.green, layout.curve, ROUGH_HALF_WIDTH),
    fairway: sausagePath(layout.tee, layout.green, layout.curve, FAIRWAY_HALF_WIDTH),
    tee: { cx: x1, cy: y1, rx: TEE_RX, ry: TEE_RY },
    green: { cx: x2, cy: y2, rx: GREEN_RX, ry: GREEN_RY },
    bunker: layout.bunker
      ? {
          cx: x2 + nx * BUNKER_OFFSET,
          cy: y2 + ny * BUNKER_OFFSET,
          rx: BUNKER_RX,
          ry: BUNKER_RY,
        }
      : null,
  };
}

if (HOLE_LAYOUT.length !== HOLE_COUNT) {
  throw new Error('Hole layout must match HOLE_COUNT');
}

if (HOLE_LAYOUT.filter((hole) => hole.bunker).length !== BUNKER_HOLE_COUNT) {
  throw new Error('Bunker holes must match BUNKER_HOLE_COUNT');
}

export const HOLES = HOLE_LAYOUT.map(buildHole);
export const SHED_X = 400;
export const SHED_Y = 600;
export const SHED_WIDTH = 88;
export const SHED_HEIGHT = 42;
export const SHED_ROOF = 20;
export const SHED_DOOR_WIDTH = 16;
export const SHED_DOOR_HEIGHT = 20;

function pathPoints(d) {
  const points = [];
  const re = /(-?[\d.]+),(-?[\d.]+)/g;
  let match;
  while ((match = re.exec(d))) {
    points.push([Number(match[1]), Number(match[2])]);
  }
  return points;
}

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

export function courseBounds(layout) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const hole of layout) {
    for (const [x, y] of pathPoints(hole.rough)) includePoint(box, x, y);
    for (const [x, y] of pathPoints(hole.fairway)) includePoint(box, x, y);
    includeEllipse(box, hole.tee);
    includeEllipse(box, hole.green);
    if (hole.bunker) includeEllipse(box, hole.bunker);
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

export const MAP_WIDTH = 1040;
export const MAP_HEIGHT = 760;
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
    const e1 = [cur[0] - prev[0], cur[1] - prev[1]];
    const e2 = [next[0] - cur[0], next[1] - cur[1]];
    const o1 = normalize(e1[1], -e1[0]);
    const o2 = normalize(e2[1], -e2[0]);
    return [cur[0] + (o1[0] + o2[0]) * amount, cur[1] + (o1[1] + o2[1]) * amount];
  });
}

export function courseBoundaryPath(layout) {
  const points = [];
  for (const hole of layout) {
    for (const point of pathPoints(hole.rough)) points.push(point);
  }
  points.push([SHED_X, SHED_Y - SHED_ROOF], [SHED_X + SHED_WIDTH, SHED_Y + SHED_HEIGHT]);
  const hull = expandPolygon(convexHull(points), BOUNDARY_EXPAND);
  return hull.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ') + ' Z';
}

function offsetPath(path, dx) {
  return path.replace(/([ML])(-?[\d.]+),(-?[\d.]+)/g, (_, cmd, x, y) => `${cmd}${(Number(x) + dx).toFixed(1)},${y}`);
}

function offsetHole(hole, dx, id) {
  return {
    id,
    rough: offsetPath(hole.rough, dx),
    fairway: offsetPath(hole.fairway, dx),
    tee: { ...hole.tee, cx: hole.tee.cx + dx },
    green: { ...hole.green, cx: hole.green.cx + dx },
    bunker: hole.bunker ? { ...hole.bunker, cx: hole.bunker.cx + dx } : null,
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
