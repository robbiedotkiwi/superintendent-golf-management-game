import {
  BASE_GAIN,
  HOC_CHANGE_PENALTY,
  HOC_GAIN_MULT,
  HOC_RANGE,
  HOC_STRESS_THRESHOLD,
  MOISTURE_HIDDEN,
  MOISTURE_SURFACES,
  PATTERN_ANGLE_DEFAULT,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_ANGLE_RESET_DELTA,
  PATTERN_AUTO_ROTATE_DEFAULT,
  PATTERN_AUTO_ROTATE_STEP,
  PATTERN_DEFAULT,
  PATTERN_PRESENTATION,
  PATTERN_SURFACE_DEFAULT,
  PATTERN_TIME_MULT,
  PATTERN_UNAVAILABLE_TIME_MULT,
  PATTERN_WEAR_DEFAULT,
  PATTERN_WEAR_INCREMENT,
  PATTERNED_SURFACES,
  QUALITY_MIN,
  STARTING_DAY,
  TASK_MINUTES,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { BASE_MINUTES } from './courseArea.js';
import { hocRangeFor, thatchWearMult, wearRecoveryMult } from './grass.js';

export function hasHoc(surface) {
  return Boolean(HOC_RANGE[surface]);
}

export function hasPattern(surface) {
  return PATTERNED_SURFACES.includes(surface);
}

export function clampHoc(surface, height, state) {
  const range = hocRangeFor(state, surface) ?? HOC_RANGE[surface];
  if (!range) return height;
  return Math.min(range.max, Math.max(range.min, Number(height)));
}

export function clampAngle(angle) {
  return Math.min(PATTERN_ANGLE_MAX, Math.max(PATTERN_ANGLE_MIN, Number(angle)));
}

export function hocFactor(surface, height, state) {
  const range = hocRangeFor(state, surface) ?? HOC_RANGE[surface];
  if (!range) return 0;
  const span = range.max - range.min;
  if (span === 0) return 0;
  const clamped = clampHoc(surface, height ?? range.default, state);
  return (range.max - clamped) / span;
}

export function inHocStressBand(surface, height, state) {
  return hocFactor(surface, height, state) > HOC_STRESS_THRESHOLD;
}

export function hocStressApplies(state, surface, dry) {
  if (!inHocStressBand(surface, state.surfaceDefaults?.[surface]?.hoc, state)) return false;
  if (state.season === 'summer') return true;
  if (MOISTURE_SURFACES.includes(surface) && dry) return true;
  return false;
}

export function patternTimeMult(surface, pattern) {
  if (!hasPattern(surface)) return PATTERN_UNAVAILABLE_TIME_MULT;
  return PATTERN_TIME_MULT[pattern] ?? PATTERN_TIME_MULT[PATTERN_DEFAULT];
}

export function mowingBaseMinutes(taskId, surface) {
  if (taskId === 'doubleCutGreens') return TASK_MINUTES.doubleCutGreens;
  return BASE_MINUTES[surface];
}

export function mowingGain(state, taskId, workerQualityFactor = 1) {
  const task = getTask(taskId);
  const surface = task?.surface;
  const height = state.surfaceDefaults?.[surface]?.hoc ?? hocRangeFor(state, surface)?.default ?? HOC_RANGE[surface]?.default;
  return BASE_GAIN * HOC_GAIN_MULT(hocFactor(surface, height, state)) * workerQualityFactor * wearRecoveryMult(state, surface);
}

export function presentationOf(surfaceState) {
  if (!surfaceState?.pattern) return 0;
  return PATTERN_PRESENTATION[surfaceState.pattern] ?? 0;
}

export function presentationScore(stateOrSurfaces) {
  if (stateOrSurfaces && Array.isArray(stateOrSurfaces.holes)) {
    return PATTERNED_SURFACES.reduce((total, type) => {
      const defaults = stateOrSurfaces.surfaceDefaults?.[type];
      return total + presentationOf(defaults);
    }, 0);
  }
  return PATTERNED_SURFACES.reduce((total, key) => total + presentationOf(stateOrSurfaces?.[key]), 0);
}

export function angleDelta(a, b) {
  const delta = Math.abs(a - b) % PATTERN_ANGLE_MAX;
  return Math.min(delta, PATTERN_ANGLE_MAX - delta);
}

export function rotatePatternAngle(angle) {
  return (angle + PATTERN_AUTO_ROTATE_STEP) % PATTERN_ANGLE_MAX;
}

export function defaultSurfaceFields(kind, state) {
  const fields = {};
  const range = hocRangeFor(state, kind) ?? HOC_RANGE[kind];
  if (range) {
    fields.hoc = range.default;
    fields.hocAtLastCut = range.default;
    fields.lastMownDay = STARTING_DAY;
    fields.heightAtLastCut = null;
  }
  if (kind === 'bunkers') {
    fields.lastRakedDay = STARTING_DAY;
  }
  if (hasPattern(kind)) {
    fields.pattern = PATTERN_SURFACE_DEFAULT[kind] ?? PATTERN_DEFAULT;
    fields.angle = PATTERN_ANGLE_DEFAULT;
    fields.autoRotate = PATTERN_AUTO_ROTATE_DEFAULT;
    fields.patternWear = PATTERN_WEAR_DEFAULT;
    fields.lastPattern = null;
    fields.lastAngle = null;
    fields.patternAtLastCut = null;
    fields.angleAtLastCut = null;
  }
  if (MOISTURE_SURFACES.includes(kind)) {
    fields.moisture = MOISTURE_HIDDEN;
  }
  return fields;
}

export function mergeSurfaceFields(kind, surface = {}, state) {
  const defaults = defaultSurfaceFields(kind, state);
  const next = { ...defaults, ...surface };
  if (HOC_RANGE[kind]) {
    next.hoc = surface.hoc ?? defaults.hoc;
    next.hocAtLastCut = surface.hocAtLastCut ?? next.hoc;
    next.lastMownDay = surface.lastMownDay ?? defaults.lastMownDay;
    next.heightAtLastCut = surface.heightAtLastCut !== undefined ? surface.heightAtLastCut : defaults.heightAtLastCut;
  }
  if (kind === 'bunkers') {
    next.lastRakedDay = surface.lastRakedDay ?? defaults.lastRakedDay;
  }
  if (hasPattern(kind)) {
    next.pattern = surface.pattern ?? defaults.pattern;
    next.angle = surface.angle ?? defaults.angle;
    next.autoRotate = surface.autoRotate ?? defaults.autoRotate;
    next.patternWear = surface.patternWear ?? defaults.patternWear;
    next.lastPattern = surface.lastPattern ?? defaults.lastPattern;
    next.lastAngle = surface.lastAngle ?? defaults.lastAngle;
    next.patternAtLastCut = surface.patternAtLastCut !== undefined ? surface.patternAtLastCut : defaults.patternAtLastCut;
    next.angleAtLastCut = surface.angleAtLastCut !== undefined ? surface.angleAtLastCut : defaults.angleAtLastCut;
  }
  if (MOISTURE_SURFACES.includes(kind)) {
    next.moisture = surface.moisture === undefined ? defaults.moisture : surface.moisture;
  }
  return next;
}

export function applyMowingAftermath(surface, kind, day, wearIncremented, settings = {}, state) {
  const next = { ...surface };
  const hoc = settings.hoc ?? next.hoc;
  const pattern = settings.pattern ?? next.pattern;
  const angle = settings.angle ?? next.angle;
  const autoRotate = settings.autoRotate ?? next.autoRotate;
  const wearIncrement = PATTERN_WEAR_INCREMENT * thatchWearMult(state, kind);
  if (HOC_RANGE[kind] && next.hocAtLastCut != null && hoc !== next.hocAtLastCut) {
    next.quality = Math.max(QUALITY_MIN, next.quality - HOC_CHANGE_PENALTY);
  }
  if (HOC_RANGE[kind]) {
    next.hocAtLastCut = hoc;
    next.heightAtLastCut = hoc;
    next.lastMownDay = day;
  }
  if (hasPattern(kind)) {
    const cutAngle = angle;
    const cutPattern = pattern;
    if (autoRotate) {
      next.patternWear = PATTERN_WEAR_DEFAULT;
    } else if (
      next.lastPattern != null &&
      next.lastPattern === cutPattern &&
      next.lastAngle != null &&
      angleDelta(cutAngle, next.lastAngle) < PATTERN_ANGLE_RESET_DELTA
    ) {
      next.patternWear = (next.patternWear ?? PATTERN_WEAR_DEFAULT) + wearIncrement;
      wearIncremented?.add(kind);
    } else if (next.lastAngle != null && angleDelta(cutAngle, next.lastAngle) >= PATTERN_ANGLE_RESET_DELTA) {
      next.patternWear = PATTERN_WEAR_DEFAULT;
    }
    next.lastPattern = cutPattern;
    next.lastAngle = cutAngle;
    next.patternAtLastCut = cutPattern;
    next.angleAtLastCut = cutAngle;
    if (autoRotate && next.override) {
      next.override = { ...next.override, angle: rotatePatternAngle(cutAngle) };
    }
  }
  return next;
}
