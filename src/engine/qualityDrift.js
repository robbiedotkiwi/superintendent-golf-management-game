import {
  PASS_AREAS,
  QUALITY_DRIFT_RATE_PER_DAY,
  QUALITY_PENALTY_MISS_WEEK,
  QUALITY_PENALTY_SCALP,
  QUALITY_PENALTY_WET_CUT,
  WET_WEATHER,
} from '../data/config.js';
import { getTask } from '../data/tasks.js';
import { clampQuality } from './grades.js';
import { inHocStressBand } from './mowing.js';
import { areaGradeCap, emptyAreaQuality, growInOffset, weeklyPassRatio, weeklyTargetQuality } from './passes.js';
import { courseSettings } from './holes.js';

export function weeklyTargetForArea(state, area, passes) {
  const cap = areaGradeCap(state, area);
  const roll = state.weekRollPasses?.[area] ?? 0;
  return clampQuality(weeklyTargetQuality(weeklyPassRatio(passes, area) + roll, cap) + growInOffset(state, area));
}

export function driftQuality(current, target, rate = QUALITY_DRIFT_RATE_PER_DAY) {
  return clampQuality(current + (target - current) * rate);
}

export function areaMowed(planned, area) {
  return (planned ?? []).some((item) => {
    const task = getTask(item.taskId);
    const surface = task?.surface ?? item.surface;
    return surface === area && (task?.mowing || item.taskId === 'autonomousMower');
  });
}

export function scalpMowed(state, planned, area) {
  if (!areaMowed(planned, area)) return false;
  const hoc = courseSettings(state, area)?.hoc;
  return inHocStressBand(area, hoc, state);
}

export function applyDailyQualityDrift(state, planned, weekPasses) {
  const prev = emptyAreaQuality(state.areaQuality);
  const next = emptyAreaQuality(state.areaQuality);
  const events = [];
  const wet = WET_WEATHER.includes(state.weather);
  for (const area of PASS_AREAS) {
    const target = weeklyTargetForArea(state, area, weekPasses?.[area] ?? 0);
    let quality = driftQuality(prev[area], target);
    if (wet && areaMowed(planned, area)) {
      quality -= QUALITY_PENALTY_WET_CUT;
      events.push({ area, kind: 'wetCut', amount: QUALITY_PENALTY_WET_CUT });
    }
    if (scalpMowed(state, planned, area)) {
      quality -= QUALITY_PENALTY_SCALP;
      events.push({ area, kind: 'scalp', amount: QUALITY_PENALTY_SCALP });
    }
    next[area] = clampQuality(quality);
  }
  next.bunkers = prev.bunkers;
  return { areaQuality: next, areaQualityPrev: prev, events };
}

export function applyMissedWeekPenalties(state) {
  const next = emptyAreaQuality(state.areaQuality);
  const events = [];
  for (const area of PASS_AREAS) {
    if ((state.weekPasses?.[area] ?? 0) > 0) continue;
    next[area] = clampQuality((state.areaQuality?.[area] ?? 0) - QUALITY_PENALTY_MISS_WEEK);
    events.push({ area, kind: 'missWeek', amount: QUALITY_PENALTY_MISS_WEEK });
  }
  return { areaQuality: next, events };
}
