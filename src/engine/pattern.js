import {
  NEGLECT_THRESHOLD,
  PATTERN_CHECK_SIZE,
  PATTERN_OPACITY_FRESH,
  PATTERN_OPACITY_OVERDUE,
  PATTERN_OVERLAY_MIX,
  PATTERN_RING_SPACING,
  PATTERN_STRIPES,
  PATTERN_STRIPE_SPACING,
  PATTERN_STRIPE_WIDTH,
  PATTERN_CHECKERBOARD,
  PATTERN_DIAMOND,
  PATTERN_RINGS,
} from '../data/constants.js';
import { lerpHex } from './color.js';
import { daysSinceLastWorked } from './neglect.js';

export function patternOpacity(daysSince, threshold) {
  if (threshold <= 0 || daysSince >= threshold) return PATTERN_OPACITY_OVERDUE;
  if (daysSince <= 0) return PATTERN_OPACITY_FRESH;
  const t = daysSince / threshold;
  return PATTERN_OPACITY_FRESH + (PATTERN_OPACITY_OVERDUE - PATTERN_OPACITY_FRESH) * t;
}

export function surfacePatternOpacity(state, surface) {
  return patternOpacity(daysSinceLastWorked(state, surface), NEGLECT_THRESHOLD[surface]);
}

export function patternStripeColor(baseFill, paint) {
  return lerpHex(baseFill, paint, PATTERN_OVERLAY_MIX);
}

export function patternTile(pattern) {
  if (pattern === PATTERN_RINGS) {
    return { width: PATTERN_RING_SPACING, height: PATTERN_RING_SPACING, kind: PATTERN_RINGS };
  }
  if (pattern === PATTERN_CHECKERBOARD || pattern === PATTERN_DIAMOND) {
    return { width: PATTERN_CHECK_SIZE, height: PATTERN_CHECK_SIZE, kind: pattern };
  }
  return { width: PATTERN_STRIPE_SPACING, height: PATTERN_STRIPE_SPACING, kind: PATTERN_STRIPES };
}

export function patternRotate(pattern, angle) {
  if (pattern === PATTERN_DIAMOND) return angle + 45;
  return angle;
}

export { PATTERN_STRIPE_WIDTH, PATTERN_CHECK_SIZE, PATTERN_RING_SPACING };
