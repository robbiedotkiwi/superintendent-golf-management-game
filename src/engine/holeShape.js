import {
  BUNKER_BLOB_JIGGLE,
  BUNKER_BLOB_VERTICES,
  BUNKER_SHAPE_SEMI,
  DOGLEG_MIN_TURN,
  FAIRWAY_END_T,
  FAIRWAY_HALF_WIDTH,
  FAIRWAY_START_T,
  FLAG_FAR_FACTOR,
  GREEN_SHAPE_BEAN,
  GREEN_SHAPE_CIRCLE,
  GREEN_SHAPE_KIDNEY_LEFT,
  GREEN_SHAPE_KIDNEY_RIGHT,
  GREEN_SHAPE_LONG,
  GREEN_SHAPE_OVAL,
  GREEN_SHAPE_PEAR,
  GREEN_SHAPE_TEARDROP,
  GREEN_SHAPE_WIDE,
  GREEN_SIZE_MAX,
  GREEN_SIZE_MIN,
  HOLE_NUMBER_RADIUS,
  HOLE_PATH_SAMPLES,
  PERIMETER_HALF_WIDTH,
  RIBBON_CAP_SAMPLES,
  TEE_SIZE,
} from '../data/constants.js';
import {
  densifyPolyline,
  dist,
  maxTurnDegrees,
  normalFromTangent,
  pointAtLength,
  ribbon,
  tangentAtLength,
} from './geometry.js';

export function fairwayHalfWidth() {
  return FAIRWAY_HALF_WIDTH;
}

export function roughHalfWidth() {
  return PERIMETER_HALF_WIDTH;
}

export function fairwayWidthVaries() {
  return false;
}

function ellipsePoints(cx, cy, rx, ry, tx, ty, nx, ny, count = 20) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const ang = (i / count) * Math.PI * 2;
    const x = Math.cos(ang) * rx;
    const y = Math.sin(ang) * ry;
    points.push([cx + tx * x + nx * y, cy + ty * x + ny * y]);
  }
  return points;
}

function kidney(cx, cy, along, tx, ty, nx, ny, side) {
  const points = [];
  const count = 22;
  for (let i = 0; i < count; i += 1) {
    const ang = (i / count) * Math.PI * 2;
    const pinch = 1 + 0.28 * side * Math.sin(ang);
    const squash = 0.78 + 0.18 * Math.cos(ang * 2);
    const x = Math.cos(ang) * along * squash;
    const y = Math.sin(ang) * along * 0.7 * pinch;
    points.push([cx + tx * x + nx * y, cy + ty * x + ny * y]);
  }
  return points;
}

function greenPoints(cx, cy, size, tx, ty, variant) {
  const [nx, ny] = normalFromTangent(tx, ty);
  const span = Math.max(GREEN_SIZE_MIN, Math.min(GREEN_SIZE_MAX, size));
  const along = span / 2;
  switch (variant) {
    case GREEN_SHAPE_CIRCLE:
      return ellipsePoints(cx, cy, along, along, tx, ty, nx, ny);
    case GREEN_SHAPE_OVAL:
      return ellipsePoints(cx, cy, along, along * 0.72, tx, ty, nx, ny);
    case GREEN_SHAPE_LONG:
      return ellipsePoints(cx, cy, along, along * 0.52, tx, ty, nx, ny);
    case GREEN_SHAPE_WIDE:
      return ellipsePoints(cx, cy, along * 0.62, along, tx, ty, nx, ny);
    case GREEN_SHAPE_PEAR:
      return ellipsePoints(cx + tx * along * 0.12, cy + ty * along * 0.12, along * 0.92, along * 0.7, tx, ty, nx, ny);
    case GREEN_SHAPE_TEARDROP:
      return ellipsePoints(cx + tx * along * 0.16, cy + ty * along * 0.16, along * 0.78, along * 0.58, tx, ty, nx, ny);
    case GREEN_SHAPE_KIDNEY_LEFT:
      return kidney(cx, cy, along, tx, ty, nx, ny, 1);
    case GREEN_SHAPE_KIDNEY_RIGHT:
      return kidney(cx, cy, along, tx, ty, nx, ny, -1);
    case GREEN_SHAPE_BEAN:
    default:
      return kidney(cx, cy, along * 0.95, tx, ty, nx, ny, 0.55);
  }
}

function rotatedRect(cx, cy, width, height, tx, ty) {
  const [nx, ny] = normalFromTangent(tx, ty);
  const hx = width / 2;
  const hy = height / 2;
  return [
    [cx - tx * hy - nx * hx, cy - ty * hy - ny * hx],
    [cx - tx * hy + nx * hx, cy - ty * hy + ny * hx],
    [cx + tx * hy + nx * hx, cy + ty * hy + ny * hx],
    [cx + tx * hy - nx * hx, cy + ty * hy - ny * hx],
  ];
}

function bunkerPoints(centerline, spec, seed) {
  const [px, py] = pointAtLength(centerline, spec.t);
  const [tx, ty] = tangentAtLength(centerline, spec.t);
  const [nx, ny] = normalFromTangent(tx, ty);
  const size = spec.size;
  const side = spec.side;
  const offset = FAIRWAY_HALF_WIDTH + size * 0.45;
  const cx = px + nx * side * offset;
  const cy = py + ny * side * offset;
  if (spec.shape === BUNKER_SHAPE_SEMI) {
    const points = [];
    const count = 10;
    for (let i = 0; i <= count; i += 1) {
      const ang = Math.PI * (i / count) - Math.PI / 2;
      const ox = nx * side * Math.cos(ang) + tx * Math.sin(ang);
      const oy = ny * side * Math.cos(ang) + ty * Math.sin(ang);
      points.push([cx + ox * (size / 2), cy + oy * (size / 2)]);
    }
    return points;
  }
  const points = [];
  for (let i = 0; i < BUNKER_BLOB_VERTICES; i += 1) {
    const ang = (i / BUNKER_BLOB_VERTICES) * Math.PI * 2;
    const jiggle = 1 + BUNKER_BLOB_JIGGLE * Math.sin(seed * 13.7 + i * 2.3);
    const squash = 0.7 + 0.3 * Math.sin(ang * 2 + seed);
    const r = (size / 2) * jiggle * squash;
    points.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.72]);
  }
  return points;
}

export function centerlineFromRecipe(recipe) {
  if (recipe.bend) return [recipe.tee, recipe.bend, recipe.green];
  return [recipe.tee, recipe.green];
}

function boundsRadius(points) {
  if (!points?.length) return GREEN_SIZE_MIN / 2;
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  let max = 0;
  for (const [x, y] of points) max = Math.max(max, dist([cx, cy], [x, y]));
  return max;
}

export function expandHole(recipe) {
  const raw = centerlineFromRecipe(recipe);
  const dense = densifyPolyline(raw, HOLE_PATH_SAMPLES);
  const teePt = dense[0];
  const greenPt = dense[dense.length - 1];
  const teeDir = tangentAtLength(dense, 0);
  const greenDir = tangentAtLength(dense, 1);
  const fairwayAnchors = [pointAtLength(dense, FAIRWAY_START_T)];
  if (recipe.bend) fairwayAnchors.push(recipe.bend);
  fairwayAnchors.push(pointAtLength(dense, FAIRWAY_END_T));
  const fairwayLine = densifyPolyline(fairwayAnchors, HOLE_PATH_SAMPLES);
  const greenPoly = greenPoints(greenPt[0], greenPt[1], recipe.greenSize, greenDir[0], greenDir[1], recipe.greenShape);
  const teePoly = rotatedRect(teePt[0], teePt[1], TEE_SIZE.w, TEE_SIZE.h, teeDir[0], teeDir[1]);
  const bunkers = (recipe.bunkers ?? []).map((spec, index) => bunkerPoints(dense, spec, recipe.id * 10 + index));
  const mid = pointAtLength(dense, 0.5);
  const flag = [
    greenPt[0] + greenDir[0] * recipe.greenSize * FLAG_FAR_FACTOR * 0.5,
    greenPt[1] + greenDir[1] * recipe.greenSize * FLAG_FAR_FACTOR * 0.5,
  ];
  const rx = boundsRadius(greenPoly);
  return {
    id: recipe.id,
    dogleg: Boolean(recipe.bend) || maxTurnDegrees(raw) >= DOGLEG_MIN_TURN,
    bent: Boolean(recipe.bend),
    centerline: raw,
    centerlineDense: dense,
    rough: ribbon(dense, () => PERIMETER_HALF_WIDTH, RIBBON_CAP_SAMPLES),
    fairway: ribbon(fairwayLine, () => FAIRWAY_HALF_WIDTH, RIBBON_CAP_SAMPLES),
    bunkers,
    tee: {
      cx: teePt[0],
      cy: teePt[1],
      rx: TEE_SIZE.w / 2,
      ry: TEE_SIZE.h / 2,
      points: teePoly,
    },
    green: {
      cx: greenPt[0],
      cy: greenPt[1],
      rx,
      ry: rx * 0.75,
      variant: recipe.greenShape,
      points: greenPoly,
    },
    marker: { cx: mid[0], cy: mid[1], r: HOLE_NUMBER_RADIUS },
    flag: { x: flag[0], y: flag[1] },
    dryingFactor: recipe.dryingFactor,
  };
}

export function walkDistance(fromHole, toHole) {
  return dist([fromHole.green.cx, fromHole.green.cy], [toHole.tee.cx, toHole.tee.cy]);
}
