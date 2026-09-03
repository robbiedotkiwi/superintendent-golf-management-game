import {
  COMPLAINT_GREENS_QUALITY,
  COMPLAINT_ROUGH_DAYS,
  CONDITION_WEIGHTS,
  GM_STANDING_MAX,
  GM_STANDING_MIN,
  POND_HEALTH_START,
  SATISFACTION_COMPLAINT_PENALTY,
  SATISFACTION_LAG,
  SATISFACTION_MAX,
  SATISFACTION_MIN,
  SATISFACTION_POND_WEIGHT,
  SURFACE_KEYS,
} from '../data/constants.js';
import { presentationScore } from './mowing.js';

export function clampRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function unreadComplaints(state) {
  return (state.inbox ?? []).filter((item) => item.from === 'golfer' && !item.read).length;
}

export function conditionForSatisfaction(surfaces) {
  return SURFACE_KEYS.reduce((total, key) => total + surfaces[key].quality * CONDITION_WEIGHTS[key], 0);
}

export function satisfactionTarget(state) {
  let target = conditionForSatisfaction(state.surfaces);
  target += presentationScore(state.surfaces);
  target += ((state.pond?.health ?? POND_HEALTH_START) - POND_HEALTH_START) * SATISFACTION_POND_WEIGHT;
  target -= unreadComplaints(state) * SATISFACTION_COMPLAINT_PENALTY;
  return clampRange(target, SATISFACTION_MIN, SATISFACTION_MAX);
}

export function tickSatisfaction(state) {
  const target = satisfactionTarget(state);
  const next = state.satisfaction + (target - state.satisfaction) * SATISFACTION_LAG;
  return clampRange(next, SATISFACTION_MIN, SATISFACTION_MAX);
}

export function clampStanding(value) {
  return clampRange(value, GM_STANDING_MIN, GM_STANDING_MAX);
}

export { COMPLAINT_GREENS_QUALITY, COMPLAINT_ROUGH_DAYS };
