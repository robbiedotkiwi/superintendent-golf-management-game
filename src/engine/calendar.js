import { DAYS_PER_SEASON, DAYS_PER_YEAR, SEASON_ORDER, STARTING_YEAR } from '../data/constants.js';

export function calendarFromDay(day) {
  const index = day - 1;
  const year = Math.floor(index / DAYS_PER_YEAR) + STARTING_YEAR;
  const season = SEASON_ORDER[Math.floor(index / DAYS_PER_SEASON) % SEASON_ORDER.length];
  return { year, season };
}
