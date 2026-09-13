import { GRADE_BANDS, GRADE_TREND_DELTA, QUALITY_MAX, QUALITY_MIN } from '../data/config.js';

export function clampQuality(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return QUALITY_MIN;
  return Math.min(QUALITY_MAX, Math.max(QUALITY_MIN, n));
}

export function gradeLetter(quality) {
  const score = clampQuality(quality);
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band.letter;
  }
  return 'F';
}

export function gradeFloor(letter) {
  const band = GRADE_BANDS.find((item) => item.letter === letter);
  return band ? band.min : QUALITY_MIN;
}

export function gradeCapScore(letter) {
  if (!letter) return QUALITY_MAX;
  const index = GRADE_BANDS.findIndex((item) => item.letter === letter);
  if (index <= 0) return QUALITY_MAX;
  return GRADE_BANDS[index].min + (GRADE_BANDS[index - 1].min - GRADE_BANDS[index].min) - 1;
}

export function gradeTrend(before, after) {
  const delta = clampQuality(after) - clampQuality(before);
  if (delta > GRADE_TREND_DELTA) return 'up';
  if (delta < -GRADE_TREND_DELTA) return 'down';
  return 'flat';
}
