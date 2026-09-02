import {
  BUNKER_HOLE_COUNT,
  BUNKER_OFFSET,
  BUNKER_RX,
  BUNKER_RY,
  FAIRWAY_HALF_WIDTH,
  GREEN_RX,
  GREEN_RY,
  HOLE_COUNT,
  HOLE_PATH_SAMPLES,
  ROUGH_HALF_WIDTH,
  TEE_RX,
  TEE_RY,
} from './constants.js';

const HOLE_LAYOUT = [
  { id: 1, tee: [130, 630], green: [230, 410], curve: 70, bunker: false },
  { id: 2, tee: [80, 350], green: [210, 150], curve: -85, bunker: true },
  { id: 3, tee: [300, 80], green: [520, 60], curve: 50, bunker: false },
  { id: 4, tee: [580, 50], green: [820, 120], curve: -55, bunker: false },
  { id: 5, tee: [900, 180], green: [950, 400], curve: 95, bunker: true },
  { id: 6, tee: [970, 470], green: [830, 650], curve: -75, bunker: false },
  { id: 7, tee: [740, 690], green: [520, 670], curve: 45, bunker: true },
  { id: 8, tee: [420, 700], green: [260, 650], curve: -35, bunker: false },
  { id: 9, tee: [400, 490], green: [600, 330], curve: 110, bunker: false },
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
export const MAP_WIDTH = 1040;
export const MAP_HEIGHT = 760;
export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
