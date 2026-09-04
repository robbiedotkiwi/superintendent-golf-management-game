import {
  MORALE_SLOW_BELOW,
  MORALE_SLOW_MULT,
  QUALITY_RANDOM_AT_1,
  QUALITY_RANDOM_AT_5,
  QUALITY_SKILL_BASE,
  QUALITY_SKILL_STEP,
  SKILL_MAX,
  SKILL_MIN,
  SPEED_SKILL_BASE,
  SPEED_SKILL_STEP,
} from '../data/constants.js';

export function workerAllows(worker, surface) {
  if (!surface) return !worker.isVolunteer;
  if (worker.allowedSurfaces === 'all') return true;
  return worker.allowedSurfaces.includes(surface);
}

export function isWorkerPresent(worker) {
  return worker.minutesToday > 0;
}

export function workerTimeMultiplier(worker) {
  let mult = SPEED_SKILL_BASE - worker.speedSkill * SPEED_SKILL_STEP;
  if (worker.morale < MORALE_SLOW_BELOW) mult *= MORALE_SLOW_MULT;
  return mult;
}

export function workerQualityMultiplier(worker) {
  return QUALITY_SKILL_BASE + worker.qualitySkill * QUALITY_SKILL_STEP;
}

export function qualityRandomFactor(worker, rng) {
  if (worker.id === 'player' || !rng) return 1;
  const t = (worker.qualitySkill - SKILL_MIN) / (SKILL_MAX - SKILL_MIN);
  const spread = QUALITY_RANDOM_AT_1 + (QUALITY_RANDOM_AT_5 - QUALITY_RANDOM_AT_1) * t;
  return 1 + (rng.next() * 2 - 1) * spread;
}
