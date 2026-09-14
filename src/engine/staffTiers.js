import {
  PLAYER_TIER,
  REEL_CLASSES,
  ROTARY_CLASSES,
  SENIOR_PASS_TIME_MULT,
  STAFF_RATING_JUNIOR,
  STAFF_RATING_SENIOR,
  STAFF_RATING_UNSKILLED,
  STAFF_TIER_JUNIOR,
  STAFF_TIER_LABELS,
  STAFF_TIER_SENIOR,
  STAFF_TIER_UNSKILLED,
  UNSKILLED_PASS_TIME_MULT,
  JUNIOR_PASS_TIME_MULT,
  VOLUNTEER_SURFACES,
  VOLUNTEER_TIER,
} from '../data/config.js';
import { PLAYER_ID, VOLUNTEER_ID } from '../data/constants.js';

export { STAFF_TIER_JUNIOR, STAFF_TIER_SENIOR, STAFF_TIER_UNSKILLED, STAFF_TIER_LABELS };

export function staffPassTimeMult(worker) {
  if (worker?.tier === STAFF_TIER_SENIOR) return SENIOR_PASS_TIME_MULT;
  if (worker?.tier === STAFF_TIER_JUNIOR) return JUNIOR_PASS_TIME_MULT;
  return UNSKILLED_PASS_TIME_MULT;
}

export function staffCanRunClass(worker, passClass) {
  if (!passClass) return false;
  if (ROTARY_CLASSES.includes(passClass)) return true;
  if (REEL_CLASSES.includes(passClass)) {
    return worker?.tier === STAFF_TIER_JUNIOR || worker?.tier === STAFF_TIER_SENIOR;
  }
  return true;
}

export function ratingForTier(tier) {
  if (tier === STAFF_TIER_SENIOR) return STAFF_RATING_SENIOR;
  if (tier === STAFF_TIER_JUNIOR) return STAFF_RATING_JUNIOR;
  return STAFF_RATING_UNSKILLED;
}

export function tierFromSkills(worker) {
  if (worker?.id === PLAYER_ID) return PLAYER_TIER;
  if (worker?.id === VOLUNTEER_ID || worker?.isVolunteer) return VOLUNTEER_TIER;
  if (worker?.tier) return worker.tier;
  const quality = Number(worker?.qualitySkill) || 0;
  const speed = Number(worker?.speedSkill) || 0;
  const avg = (quality + speed) / 2;
  if (avg >= 4) return STAFF_TIER_SENIOR;
  if (avg >= 2.5) return STAFF_TIER_JUNIOR;
  return STAFF_TIER_UNSKILLED;
}

export function migrateWorkerTier(worker) {
  if (!worker) return worker;
  const tier = tierFromSkills(worker);
  const next = {
    ...worker,
    tier,
    rating: worker.rating ?? ratingForTier(tier),
  };
  if (worker.id === VOLUNTEER_ID || worker.isVolunteer) {
    next.allowedSurfaces = VOLUNTEER_SURFACES;
  }
  return next;
}
