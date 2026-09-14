import {
  AUTONOMOUS_MOW_EFFICIENCY,
  MORALE_SLOW_BELOW,
  MORALE_SLOW_MULT,
  MOW_SPEED_EFFICIENCY_AT_1,
  MOW_SPEED_EFFICIENCY_AT_5,
  PLAYER_SPEED_SKILL,
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
  if (!surface) return true;
  if (worker.allowedSurfaces === 'all') return true;
  return Array.isArray(worker.allowedSurfaces) && worker.allowedSurfaces.includes(surface);
}

export function workerBringsOwnMower(worker, surface) {
  if (!worker?.ownMower) return false;
  if (!surface) return false;
  return workerAllows(worker, surface);
}

export function isWorkerPresent(worker) {
  return worker.minutesToday > 0;
}

export function workerTimeMultiplier(worker) {
  let mult = SPEED_SKILL_BASE - worker.speedSkill * SPEED_SKILL_STEP;
  if (worker.morale < MORALE_SLOW_BELOW) mult *= MORALE_SLOW_MULT;
  return mult;
}

export function mowingSpeedEfficiency(speedSkill) {
  const skill = Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.round(Number(speedSkill) || SKILL_MIN)));
  const at1 = Math.round(MOW_SPEED_EFFICIENCY_AT_1 * 100);
  const at5 = Math.round(MOW_SPEED_EFFICIENCY_AT_5 * 100);
  return (at1 + ((skill - SKILL_MIN) * (at5 - at1)) / (SKILL_MAX - SKILL_MIN)) / 100;
}

export function mowingOperatorTimeMultiplier(worker, options = {}) {
  if (options.autonomous) return 1 / AUTONOMOUS_MOW_EFFICIENCY;
  const speed = worker?.speedSkill ?? PLAYER_SPEED_SKILL;
  let time = 1 / mowingSpeedEfficiency(speed);
  if (worker && worker.morale < MORALE_SLOW_BELOW) time *= MORALE_SLOW_MULT;
  return time;
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
