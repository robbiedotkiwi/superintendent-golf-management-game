import {
  DAYS_PER_SEASON,
  SEASON_WEEKS,
} from '../data/config.js';
import {
  DAYS_PER_WEEK,
  GRACE_NO_DISEASE_SEASON,
  SEASON_ORDER,
  STARTING_YEAR,
} from '../data/constants.js';

const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASON_ORDER.length;

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

export function seasonStartDay(day) {
  return Math.floor((day - 1) / DAYS_PER_SEASON) * DAYS_PER_SEASON + 1;
}

export function seasonEndDay(day) {
  return seasonStartDay(day) + DAYS_PER_SEASON - 1;
}

export function daysUntilSeasonEnd(day) {
  return seasonEndDay(day) - day + 1;
}

export function weekOfSeason(day) {
  return Math.floor(((day - 1) % DAYS_PER_SEASON) / DAYS_PER_WEEK) + 1;
}

export function seasonWeekCount() {
  return SEASON_WEEKS;
}
