import {
  HOLE_COUNT,
  MAP_PX_PER_METRE,
  REFERENCE_COVERAGE_M2_PER_HR,
} from '../data/constants.js';
import { HOLE_SHAPES } from '../data/courseLayout.js';
import { polygonArea } from './geometry.js';

export function pxAreaToM2(px2) {
  return Number(px2) / (MAP_PX_PER_METRE * MAP_PX_PER_METRE);
}

function holeSurfaceAreasPx(hole) {
  const greens = polygonArea(hole.green?.points);
  const tees = polygonArea(hole.tee?.points);
  const fairways = polygonArea(hole.fairway);
  const bunkers = (hole.bunkers ?? []).reduce((total, bunker) => total + polygonArea(bunker), 0);
  const roughOuter = polygonArea(hole.rough);
  const rough = Math.max(0, roughOuter - greens - tees - fairways - bunkers);
  return { greens, tees, fairways, rough, bunkers };
}

const SAMPLE_PX = holeSurfaceAreasPx(HOLE_SHAPES[0]);

export const AREA_PX2_PER_HOLE = SAMPLE_PX;

export const AREA_M2_PER_HOLE = {
  greens: pxAreaToM2(SAMPLE_PX.greens),
  tees: pxAreaToM2(SAMPLE_PX.tees),
  fairways: pxAreaToM2(SAMPLE_PX.fairways),
  rough: pxAreaToM2(SAMPLE_PX.rough),
  bunkers: pxAreaToM2(SAMPLE_PX.bunkers),
};

export const COURSE_AREA_M2 = {
  greens: AREA_M2_PER_HOLE.greens * HOLE_COUNT,
  tees: AREA_M2_PER_HOLE.tees * HOLE_COUNT,
  fairways: AREA_M2_PER_HOLE.fairways * HOLE_COUNT,
  rough: AREA_M2_PER_HOLE.rough * HOLE_COUNT,
  bunkers: AREA_M2_PER_HOLE.bunkers * HOLE_COUNT,
};

export function perHoleMowMinutes(surface, coverageM2PerHr = REFERENCE_COVERAGE_M2_PER_HR[surface]) {
  const area = AREA_M2_PER_HOLE[surface];
  if (!area || !coverageM2PerHr) return 0;
  return (area / coverageM2PerHr) * 60;
}

export const PER_HOLE_MINUTES = {
  greens: perHoleMowMinutes('greens'),
  tees: perHoleMowMinutes('tees'),
  fairways: perHoleMowMinutes('fairways'),
  rough: perHoleMowMinutes('rough'),
};

export const BASE_MINUTES = {
  greens: PER_HOLE_MINUTES.greens * HOLE_COUNT,
  tees: PER_HOLE_MINUTES.tees * HOLE_COUNT,
  fairways: PER_HOLE_MINUTES.fairways * HOLE_COUNT,
  rough: PER_HOLE_MINUTES.rough * HOLE_COUNT,
};
