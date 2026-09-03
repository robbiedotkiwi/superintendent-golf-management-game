import {
  DAY_LENGTH_MINUTES,
  FORECAST_ACCURACY,
  FORECAST_DAYS,
  FORECAST_OPACITY_MIN,
  FROST_SHORT_MINUTES,
  STARTING_MINUTES_USED,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  WEATHER_FROST,
  WEATHER_WEIGHTS,
  WIND_DIRECTIONS,
  WIND_SPEED_MAX,
  WIND_SPEED_MIN,
} from '../data/constants.js';
import { calendarFromDay } from './calendar.js';
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

export function rollWind(rng) {
  const span = WIND_SPEED_MAX - WIND_SPEED_MIN + 1;
  const windSpeed = WIND_SPEED_MIN + Math.floor(rng.next() * span);
  const windDir = WIND_DIRECTIONS[Math.floor(rng.next() * WIND_DIRECTIONS.length)];
  return { windSpeed, windDir };
}

export function rollTrueDay(season, rng) {
  return { type: pickWeather(WEATHER_WEIGHTS[season], rng), ...rollWind(rng) };
}

export function corruptDay(trueDay, accuracy, season, rng) {
  if (rng.next() < accuracy) return { ...trueDay };
  return { ...trueDay, type: pickWeather(WEATHER_WEIGHTS[season], rng, trueDay.type) };
}

export function forecastOpacity(index) {
  const accuracy = FORECAST_ACCURACY[index] ?? FORECAST_ACCURACY[FORECAST_ACCURACY.length - 1];
  return FORECAST_OPACITY_MIN + accuracy * (1 - FORECAST_OPACITY_MIN);
}

export function makeWeatherQueue(fromDay, rng) {
  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const season = calendarFromDay(fromDay + 1 + index).season;
    return rollTrueDay(season, rng);
  });
}

export function deriveForecastStrip(queue, fromDay, rng) {
  return queue.map((day, index) => {
    const season = calendarFromDay(fromDay + 1 + index).season;
    return corruptDay(day, FORECAST_ACCURACY[index], season, rng);
  });
}

export function buildForecast(state, rng) {
  const queue =
    Array.isArray(state.weatherQueue) && state.weatherQueue.length === FORECAST_DAYS
      ? state.weatherQueue
      : makeWeatherQueue(state.day, rng);
  const forecastStrip = deriveForecastStrip(queue, state.day, rng);
  return {
    weatherQueue: queue,
    forecastStrip,
    forecast: forecastStrip[0]?.type ?? state.forecast,
    windSpeed: state.windSpeed ?? STARTING_WIND_SPEED,
    windDir: state.windDir ?? STARTING_WIND_DIR,
  };
}

export function rollMorningWithRng(state, season, rng) {
  const queue =
    Array.isArray(state.weatherQueue) && state.weatherQueue.length === FORECAST_DAYS
      ? state.weatherQueue
      : makeWeatherQueue(state.day - 1, rng);
  const today = queue[0];
  const weather = today?.type ?? pickWeather(WEATHER_WEIGHTS[season], rng);
  const nextQueue = queue.slice(1).concat(rollTrueDay(calendarFromDay(state.day + FORECAST_DAYS).season, rng));
  const forecastStrip = deriveForecastStrip(nextQueue, state.day, rng);
  return {
    weather,
    forecast: forecastStrip[0].type,
    weatherQueue: nextQueue,
    forecastStrip,
    windSpeed: today?.windSpeed ?? STARTING_WIND_SPEED,
    windDir: today?.windDir ?? STARTING_WIND_DIR,
  };
}

export function rollMorning(state, season) {
  const rng = createRng(state.rngSeed);
  const morning = rollMorningWithRng(state, season, rng);
  return { ...morning, rngSeed: rng.seed };
}
