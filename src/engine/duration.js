import { HOUR_INCREMENT, MINUTES_PER_HOUR } from '../data/config.js';

/**
 * All duration rounding goes in the player's favour: floor to HOUR_INCREMENT.
 * Use this everywhere a duration is computed. Do not reimplement per call site.
 */
export function roundDurationHours(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n / HOUR_INCREMENT + 1e-9) * HOUR_INCREMENT;
}

/**
 * Apply a time multiplier, rounding the discount or penalty down to HOUR_INCREMENT
 * before adding it. Discounts under one increment do nothing (small passes get no
 * senior benefit). Wear +10% on a 4 hr pass is +0.4 → 0, so the pass stays 4.0.
 */
export function applyDurationModifier(hours, multiplier) {
  const base = roundDurationHours(hours);
  const mult = Number(multiplier);
  if (!Number.isFinite(mult) || mult === 1) return base;
  if (mult < 1) {
    const discount = roundDurationHours(base * (1 - mult));
    return roundDurationHours(Math.max(0, base - discount));
  }
  const penalty = roundDurationHours(base * (mult - 1));
  return roundDurationHours(base + penalty);
}

export function hoursToMinutes(hours) {
  return roundDurationHours(hours) * MINUTES_PER_HOUR;
}

export function minutesToHours(minutes) {
  return roundDurationHours((Number(minutes) || 0) / MINUTES_PER_HOUR);
}

export function snapHours(hours) {
  const rounded = roundDurationHours(hours);
  return rounded <= 0 ? 0 : Math.max(HOUR_INCREMENT, rounded);
}

export function snapMinutes(minutes) {
  return hoursToMinutes(snapHours((Number(minutes) || 0) / MINUTES_PER_HOUR));
}
