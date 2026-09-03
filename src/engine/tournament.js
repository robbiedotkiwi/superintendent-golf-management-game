import { clampRange } from './satisfaction.js';
import { presentationScore } from './mowing.js';
import { logTournament } from './history.js';
import {
  DAYS_PER_SEASON,
  SATISFACTION_MAX,
  SATISFACTION_MIN,
  TOURNAMENT_ACCEPTABLE_MIN,
  TOURNAMENT_ACCEPTABLE_PAY,
  TOURNAMENT_ACCEPTABLE_SAT,
  TOURNAMENT_EXCELLENT_MIN,
  TOURNAMENT_EXCELLENT_PAY,
  TOURNAMENT_EXCELLENT_SAT,
  TOURNAMENT_GOOD_MIN,
  TOURNAMENT_GOOD_PAY,
  TOURNAMENT_GOOD_SAT,
  TOURNAMENT_POOR_PAY,
  TOURNAMENT_POOR_SAT,
  TOURNAMENT_PREP_DAYS,
  TOURNAMENT_SEASON_MAX,
  TOURNAMENT_WEIGHTS,
  TOURNAMENT_WINTER_MAX,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';

const RAIN_DAYS = [WEATHER_RAIN, WEATHER_HEAVY_RAIN, WEATHER_STORM];

export function tournamentScore(surfaces) {
  const quality = Object.entries(TOURNAMENT_WEIGHTS).reduce(
    (total, [surface, weight]) => total + (surfaces[surface]?.quality ?? 0) * weight,
    0,
  );
  return quality + presentationScore(surfaces);
}

export function bandFromScore(score) {
  if (score >= TOURNAMENT_EXCELLENT_MIN) return 'excellent';
  if (score >= TOURNAMENT_GOOD_MIN) return 'good';
  if (score >= TOURNAMENT_ACCEPTABLE_MIN) return 'acceptable';
  return 'poor';
}

export function tournamentResult(surfaces, weather, extraScore = 0) {
  const score = tournamentScore(surfaces) + extraScore;
  let band = bandFromScore(score);
  if (RAIN_DAYS.includes(weather) && (band === 'excellent' || band === 'good')) {
    band = 'acceptable';
  }
  const table = {
    excellent: { pay: TOURNAMENT_EXCELLENT_PAY, satisfaction: TOURNAMENT_EXCELLENT_SAT },
    good: { pay: TOURNAMENT_GOOD_PAY, satisfaction: TOURNAMENT_GOOD_SAT },
    acceptable: { pay: TOURNAMENT_ACCEPTABLE_PAY, satisfaction: TOURNAMENT_ACCEPTABLE_SAT },
    poor: { pay: TOURNAMENT_POOR_PAY, satisfaction: TOURNAMENT_POOR_SAT },
  };
  return { score, band, ...table[band], rained: RAIN_DAYS.includes(weather) };
}

export function applySnapTournament(state) {
  if (state.snappedToday) return state;
  const result = tournamentResult(state.surfaces, state.weather, 0);
  return {
    ...state,
    snappedToday: true,
    cash: state.cash + result.pay,
    seasonRevenue: (state.seasonRevenue ?? 0) + result.pay,
    satisfaction: clampRange(state.satisfaction + result.satisfaction, SATISFACTION_MIN, SATISFACTION_MAX),
    lastSnap: result,
    yearRecord: logTournament(state, result),
  };
}

export function seasonStartDay(day) {
  return Math.floor((day - 1) / DAYS_PER_SEASON) * DAYS_PER_SEASON + 1;
}

export function maxTournamentsForSeason(season) {
  return season === 'winter' ? TOURNAMENT_WINTER_MAX : TOURNAMENT_SEASON_MAX;
}

export function scheduleTournamentDays(startDay, count, season) {
  const n = Math.min(Math.max(count, 0), maxTournamentsForSeason(season));
  if (n <= 0) return [];
  const spacing = Math.floor(DAYS_PER_SEASON / (n + 1));
  return Array.from({ length: n }, (_, index) => startDay + spacing * (index + 1));
}

export function nextTournament(state) {
  return (state.tournaments ?? []).find((item) => !item.done && item.day >= state.day) ?? null;
}

export function daysUntilNextTournament(state) {
  const next = nextTournament(state);
  if (!next) return null;
  return next.day - state.day;
}

export function inPrepWindow(state) {
  const next = nextTournament(state);
  if (!next) return false;
  const days = next.day - state.day;
  return days >= 1 && days <= TOURNAMENT_PREP_DAYS;
}

export function applyScheduledTournament(state, surfaces) {
  const event = (state.tournaments ?? []).find((item) => item.day === state.day && !item.done);
  if (!event) return { state, result: null };
  const result = tournamentResult(surfaces, state.weather, state.tournamentPrepScore ?? 0);
  return {
    state: {
      ...state,
      cash: state.cash + result.pay,
      seasonRevenue: (state.seasonRevenue ?? 0) + result.pay,
      satisfaction: clampRange(state.satisfaction + result.satisfaction, SATISFACTION_MIN, SATISFACTION_MAX),
      tournamentPrepScore: 0,
      lastTournament: result,
      tournaments: state.tournaments.map((item) => (item.day === state.day ? { ...item, done: true } : item)),
      yearRecord: logTournament(state, result),
    },
    result,
  };
}
