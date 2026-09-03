import { DAYS_PER_SEASON, DAYS_PER_YEAR, GRACE_NO_DISEASE_SEASON, SEASON_ORDER, STARTING_YEAR } from '../data/constants.js';

export function calendarFromDay(day) {
  const index = day - 1;
  const year = Math.floor(index / DAYS_PER_YEAR) + STARTING_YEAR;
  const season = SEASON_ORDER[Math.floor(index / DAYS_PER_SEASON) % SEASON_ORDER.length];
  return { year, season };
}

export function seasonNumberFromDay(day) {
  return Math.floor((day - 1) / DAYS_PER_SEASON) + 1;
}

export function inDiseaseGrace(day) {
  return seasonNumberFromDay(day) <= GRACE_NO_DISEASE_SEASON;
}
