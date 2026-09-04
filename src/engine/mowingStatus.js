import {
  GRASS_GROWTH_MM_PER_DAY,
  HOC_RANGE,
  PATTERN_WEAR_DEFAULT,
  SEASON_GROWTH,
} from '../data/constants.js';
import { surfaceCeiling } from './equipment.js';
import { courseSettings, holeKind, meanQuality, presentHoles } from './holes.js';
import { daysSinceLastWorked, isNeglected } from './neglect.js';
import { hasPattern } from './mowing.js';

export function holeGrassLengthMm(state, surface, record) {
  const hoc =
    record?.heightAtLastCut ??
    courseSettings(state, surface)?.hoc ??
    HOC_RANGE[surface]?.default ??
    0;
  const last = record?.lastMownDay;
  const days = last == null ? 0 : Math.max(0, state.day - last);
  const rate = GRASS_GROWTH_MM_PER_DAY[surface] ?? 0;
  const season = SEASON_GROWTH[state.season] ?? 1;
  return hoc + days * rate * season;
}

export function surfaceGrassLengthMm(state, surface) {
  const holes = presentHoles(state, surface);
  if (!holes.length) return holeGrassLengthMm(state, surface, null);
  return Math.max(...holes.map((hole) => holeGrassLengthMm(state, surface, hole[holeKind(surface)])));
}

export function surfacePatternWear(state, surface) {
  const holes = presentHoles(state, surface);
  if (!holes.length) return courseSettings(state, surface)?.patternWear ?? PATTERN_WEAR_DEFAULT;
  return Math.max(...holes.map((hole) => hole[holeKind(surface)]?.patternWear ?? PATTERN_WEAR_DEFAULT));
}

export function wearIsClimbing(wear) {
  return (wear ?? PATTERN_WEAR_DEFAULT) > PATTERN_WEAR_DEFAULT;
}

export function laggingHoleIds(state, surface) {
  const holes = presentHoles(state, surface);
  if (holes.length < 2) return [];
  const kind = holeKind(surface);
  const days = holes.map((hole) => {
    const last = hole[kind]?.lastMownDay;
    return last == null ? Number.POSITIVE_INFINITY : Math.max(0, state.day - last);
  });
  const newest = Math.min(...days.filter((value) => Number.isFinite(value)));
  if (!Number.isFinite(newest)) return [];
  const lagging = holes.filter((_, index) => days[index] > newest).map((hole) => hole.id);
  return lagging.length === holes.length ? [] : lagging;
}

export function mowingStatus(state, surface) {
  const settings = courseSettings(state, surface) ?? {};
  const wear = surfacePatternWear(state, surface);
  return {
    heightMm: settings.hoc ?? HOC_RANGE[surface]?.default ?? null,
    grassMm: surfaceGrassLengthMm(state, surface),
    daysSinceCut: daysSinceLastWorked(state, surface),
    overdue: isNeglected(state, surface),
    quality: meanQuality(state, surface),
    ceiling: surfaceCeiling(state, surface),
    wear,
    wearClimbing: hasPattern(surface) && wearIsClimbing(wear),
    lagging: laggingHoleIds(state, surface),
  };
}
