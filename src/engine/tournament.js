import { clampRange } from './satisfaction.js';
import {
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
  TOURNAMENT_WEIGHTS,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';

const RAIN_DAYS = [WEATHER_RAIN, WEATHER_HEAVY_RAIN, WEATHER_STORM];

export function tournamentScore(surfaces) {
  return Object.entries(TOURNAMENT_WEIGHTS).reduce(
    (total, [surface, weight]) => total + (surfaces[surface]?.quality ?? 0) * weight,
    0,
  );
}

export function bandFromScore(score) {
  if (score >= TOURNAMENT_EXCELLENT_MIN) return 'excellent';
  if (score >= TOURNAMENT_GOOD_MIN) return 'good';
  if (score >= TOURNAMENT_ACCEPTABLE_MIN) return 'acceptable';
  return 'poor';
}

export function tournamentResult(surfaces, weather) {
  const score = tournamentScore(surfaces);
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
  const result = tournamentResult(state.surfaces, state.weather);
  return {
    ...state,
    snappedToday: true,
    cash: state.cash + result.pay,
    seasonRevenue: (state.seasonRevenue ?? 0) + result.pay,
    satisfaction: clampRange(state.satisfaction + result.satisfaction, SATISFACTION_MIN, SATISFACTION_MAX),
    lastSnap: result,
  };
}
