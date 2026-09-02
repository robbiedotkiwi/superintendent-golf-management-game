import {
  DAY_LENGTH_MINUTES,
  FORECAST_ACCURACY,
  FROST_SHORT_MINUTES,
  STARTING_MINUTES_USED,
  WEATHER_FROST,
  WEATHER_WEIGHTS,
} from '../data/constants.js';
import { createRng } from './rng.js';

export function pickWeather(weights, rng, exclude = null) {
  let entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  if (exclude) {
    const without = entries.filter(([type]) => type !== exclude);
    if (without.length) entries = without;
  }
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

export function minutesTodayForWeather(weather) {
  if (weather === WEATHER_FROST) {
    return DAY_LENGTH_MINUTES - FROST_SHORT_MINUTES;
  }
  return DAY_LENGTH_MINUTES;
}

export function applyWeatherToWorkers(workers, weather) {
  const minutesToday = minutesTodayForWeather(weather);
  return workers.map((worker) => {
    if (worker.isVolunteer) {
      return { ...worker, minutesUsed: STARTING_MINUTES_USED };
    }
    return {
      ...worker,
      minutesToday,
      minutesUsed: STARTING_MINUTES_USED,
    };
  });
}

export function rollMorningWithRng(state, season, rng) {
  const weights = WEATHER_WEIGHTS[season];
  let weather;
  if (state.forecast) {
    if (rng.next() < FORECAST_ACCURACY) {
      weather = state.forecast;
    } else {
      weather = pickWeather(weights, rng, state.forecast);
    }
  } else {
    weather = pickWeather(weights, rng);
  }
  const forecast = pickWeather(weights, rng);
  return { weather, forecast };
}

export function rollMorning(state, season) {
  const rng = createRng(state.rngSeed);
  const morning = rollMorningWithRng(state, season, rng);
  return { ...morning, rngSeed: rng.seed };
}
