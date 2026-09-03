import {
  DAY_LENGTH_MINUTES,
  FORECAST_ACCURACY,
  FORECAST_DAYS,
  FORECAST_OPACITY_MIN,
  FROST_SHORT_MINUTES,
  GRACE_FINE_DAYS,
  GRACE_NO_STORM_DAYS,
  STARTING_MINUTES_USED,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  WEATHER_FINE,
  WEATHER_FROST,
  WEATHER_HEAVY_RAIN,
  WEATHER_OVERCAST,
  WEATHER_STORM,
  WEATHER_WEIGHTS,
  WIND_DIRECTIONS,
  WIND_SPEED_MAX,
  WIND_SPEED_MIN,
} from '../data/constants.js';
import { calendarFromDay } from './calendar.js';
import { createRng } from './rng.js';

function exclusionSet(exclude) {
  if (exclude == null) return new Set();
  return new Set(Array.isArray(exclude) ? exclude : [exclude]);
}

export function pickWeather(weights, rng, exclude = null) {
  const blocked = exclusionSet(exclude);
  let entries = Object.entries(weights).filter(([type, weight]) => weight > 0 && !blocked.has(type));
  if (!entries.length) {
    entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  }
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

export function applyWeatherGrace(type, day) {
  if (day <= GRACE_FINE_DAYS) return WEATHER_FINE;
  if (day <= GRACE_NO_STORM_DAYS && (type === WEATHER_STORM || type === WEATHER_HEAVY_RAIN)) {
    return WEATHER_OVERCAST;
  }
  return type;
}

export function weatherGraceExclusions(day) {
  if (day <= GRACE_NO_STORM_DAYS) return [WEATHER_STORM, WEATHER_HEAVY_RAIN];
  return null;
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

export function rollTrueDay(season, rng, day) {
  if (day != null && day <= GRACE_FINE_DAYS) {
    return { type: WEATHER_FINE, ...rollWind(rng) };
  }
  const exclude = day != null ? weatherGraceExclusions(day) : null;
  const type = applyWeatherGrace(pickWeather(WEATHER_WEIGHTS[season], rng, exclude), day ?? Number.POSITIVE_INFINITY);
  return { type, ...rollWind(rng) };
}

export function corruptDay(trueDay, accuracy, season, rng, day) {
  const type =
    rng.next() < accuracy ? trueDay.type : pickWeather(WEATHER_WEIGHTS[season], rng, trueDay.type);
  return { ...trueDay, type: applyWeatherGrace(type, day ?? Number.POSITIVE_INFINITY) };
}

export function forecastOpacity(index) {
  const accuracy = FORECAST_ACCURACY[index] ?? FORECAST_ACCURACY[FORECAST_ACCURACY.length - 1];
  return FORECAST_OPACITY_MIN + accuracy * (1 - FORECAST_OPACITY_MIN);
}

export function makeWeatherQueue(fromDay, rng) {
  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const day = fromDay + 1 + index;
    const season = calendarFromDay(day).season;
    return rollTrueDay(season, rng, day);
  });
}

export function deriveForecastStrip(queue, fromDay, rng) {
  return queue.map((day, index) => {
    const calendarDay = fromDay + 1 + index;
    const season = calendarFromDay(calendarDay).season;
    return corruptDay(day, FORECAST_ACCURACY[index], season, rng, calendarDay);
  });
}

export function buildForecast(state, rng) {
  const queue =
    Array.isArray(state.weatherQueue) && state.weatherQueue.length === FORECAST_DAYS
      ? state.weatherQueue.map((item, index) => ({
          ...item,
          type: applyWeatherGrace(item.type, state.day + 1 + index),
        }))
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
  const weather = applyWeatherGrace(
    today?.type ?? pickWeather(WEATHER_WEIGHTS[season], rng),
    state.day,
  );
  const nextQueue = queue.slice(1).concat(
    rollTrueDay(calendarFromDay(state.day + FORECAST_DAYS).season, rng, state.day + FORECAST_DAYS),
  );
  const forecastStrip = deriveForecastStrip(nextQueue, state.day, rng);
  return {
    weather,
    forecast: forecastStrip[0].type,
    weatherQueue: nextQueue.map((item, index) => ({
      ...item,
      type: applyWeatherGrace(item.type, state.day + 1 + index),
    })),
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
