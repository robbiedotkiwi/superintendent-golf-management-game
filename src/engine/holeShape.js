import {
  BUNKER_BLOB_JIGGLE,
  BUNKER_BLOB_VERTICES,
  BUNKER_RX,
  DOGLEG_MIN_TURN,
  FAIRWAY_APPROACH_T,
  FAIRWAY_GREEN_EXTRA,
  FAIRWAY_HALF_WIDTH,
  FAIRWAY_LANDING_T,
  FAIRWAY_TEE_EXTRA,
  GREEN_RX,
  GREEN_RY,
  HOLE_PATH_SAMPLES,
  RIBBON_CAP_SAMPLES,
  ROUGH_BEYOND_FAIRWAY,
  ROUGH_END_EXTRA,
  ROUGH_WIDTH_VARIATION,
  TEE_MARKER_OFFSET,
  TEE_RX,
  TEE_RY,
} from '../data/constants.js';
import {
  densifyPolyline,
  dist,
  lerp,
  maxTurnDegrees,
  normalFromTangent,
  pointAtLength,
  ribbon,
  tangentAtLength,
} from './geometry.js';

function smooth(t) {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

export function fairwayHalfWidth(t) {
  const tee = FAIRWAY_HALF_WIDTH + FAIRWAY_TEE_EXTRA;
  const landing = FAIRWAY_HALF_WIDTH;
  const green = FAIRWAY_HALF_WIDTH + FAIRWAY_GREEN_EXTRA;
  if (t <= FAIRWAY_LANDING_T) return lerp(tee, landing, smooth(t / FAIRWAY_LANDING_T));
  if (t <= FAIRWAY_APPROACH_T) {
    return lerp(landing, green, smooth((t - FAIRWAY_LANDING_T) / (FAIRWAY_APPROACH_T - FAIRWAY_LANDING_T)));
  }
  return green;
}

export function roughHalfWidth(t, holeId) {
  const envelope = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
  const variation = (0.5 + 0.5 * Math.sin(t * Math.PI * 2 + holeId * 1.7)) * ROUGH_WIDTH_VARIATION;
  const beyond = (ROUGH_BEYOND_FAIRWAY + variation) * envelope;
  const collar = GREEN_RX + ROUGH_END_EXTRA;
  return Math.max(collar, fairwayHalfWidth(t) + beyond);
}

export function fairwayWidthVaries() {
  return fairwayHalfWidth(0) > fairwayHalfWidth(FAIRWAY_LANDING_T) && fairwayHalfWidth(1) > fairwayHalfWidth(FAIRWAY_LANDING_T);
}

function irregularBlob(cx, cy, radius, seed) {
  const points = [];
  for (let i = 0; i < BUNKER_BLOB_VERTICES; i += 1) {
    const ang = (i / BUNKER_BLOB_VERTICES) * Math.PI * 2;
    const jiggle = 1 + BUNKER_BLOB_JIGGLE * Math.sin(seed * 13.7 + i * 2.3);
    const squash = 0.72 + 0.28 * Math.sin(ang * 2 + seed);
    const r = radius * jiggle * squash;
    points.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.78]);
  }
  return points;
}

function bunkerAt(centerline, t, side, radius, seed) {
  const [px, py] = pointAtLength(centerline, t);
  const [tx, ty] = tangentAtLength(centerline, t);
  const [nx, ny] = normalFromTangent(tx, ty);
  const offset = fairwayHalfWidth(t) + radius * 0.55;
  return irregularBlob(px + nx * side * offset, py + ny * side * offset, radius, seed);
}

export function expandHole(recipe) {
  const dense = densifyPolyline(recipe.centerline, HOLE_PATH_SAMPLES);
  const teePt = dense[0];
  const greenPt = dense[dense.length - 1];
  const teeBack = tangentAtLength(dense, 0);
  const marker = [teePt[0] - teeBack[0] * TEE_MARKER_OFFSET, teePt[1] - teeBack[1] * TEE_MARKER_OFFSET];
  const bunkers = (recipe.bunkers ?? []).map((spec, index) =>
    bunkerAt(dense, spec.t, spec.side, spec.radius ?? BUNKER_RX, recipe.id * 10 + index + (spec.seed ?? 0)),
  );
  return {
    id: recipe.id,
    dogleg: Boolean(recipe.dogleg) || maxTurnDegrees(recipe.centerline) >= DOGLEG_MIN_TURN,
    centerline: recipe.centerline,
    rough: ribbon(dense, (t) => roughHalfWidth(t, recipe.id), RIBBON_CAP_SAMPLES),
    fairway: ribbon(dense, fairwayHalfWidth, RIBBON_CAP_SAMPLES),
    bunkers,
    tee: { cx: teePt[0], cy: teePt[1], rx: TEE_RX, ry: TEE_RY },
    green: { cx: greenPt[0], cy: greenPt[1], rx: GREEN_RX, ry: GREEN_RY },
    marker: { cx: marker[0], cy: marker[1] },
  };
}

export function walkDistance(fromHole, toHole) {
  return dist([fromHole.green.cx, fromHole.green.cy], [toHole.tee.cx, toHole.tee.cy]);
}
