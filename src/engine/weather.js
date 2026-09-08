import {
  COLD_TEMP_C,
  DAY_LENGTH_MINUTES,
  FORECAST_ACCURACY,
  FORECAST_DAYS,
  FORECAST_OPACITY_MIN,
  FROST_SHORT_MINUTES,
  FROST_TEMP_MIN_CAP,
  GRACE_FINE_DAYS,
  GRACE_NO_STORM_DAYS,
  MOISTURE_ET_TEMP_HIGH,
  MOISTURE_ET_TEMP_HIGH_C,
  MOISTURE_ET_TEMP_LOW,
  MOISTURE_ET_TEMP_LOW_C,
  STARTING_MINUTES_USED,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  TEMP_ABS_MAX,
  TEMP_ABS_MIN,
  TEMP_HOTTER_DELTA,
  TEMP_RANGES,
  TEMP_SPAN_MIN,
  TEMP_WEATHER_SHIFT,
  WEATHER_FINE,
  WEATHER_FROST,
  WEATHER_HEAVY_RAIN_LEGACY,
  WEATHER_OVERCAST,
  WEATHER_RAIN,
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

function clampInt(value, lo, hi) {
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

function randInt(lo, hi, rng) {
  const span = hi - lo + 1;
  return lo + Math.floor(rng.next() * span);
}

export function canonicalWeather(type) {
  if (type === WEATHER_HEAVY_RAIN_LEGACY) return WEATHER_STORM;
  return type;
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
  const next = canonicalWeather(type);
  if (day <= GRACE_FINE_DAYS) return WEATHER_FINE;
  if (day <= GRACE_NO_STORM_DAYS && next === WEATHER_STORM) {
    return WEATHER_OVERCAST;
  }
  return next;
}

export function weatherGraceExclusions(day) {
  if (day <= GRACE_NO_STORM_DAYS) return [WEATHER_STORM];
  return null;
}

export function minutesTodayForWeather(weather) {
  if (canonicalWeather(weather) === WEATHER_FROST) {
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

export function tempsFromLegacyHeat(heat) {
  if (heat === 'cool') return { tempMin: 8, tempMax: 14 };
  if (heat === 'hot') return { tempMin: 16, tempMax: 26 };
  return { tempMin: STARTING_TEMP_MIN, tempMax: STARTING_TEMP_MAX };
}

export function applyTempsForWeather(temps, type) {
  const weather = canonicalWeather(type);
  let tempMin = Number(temps?.tempMin);
  let tempMax = Number(temps?.tempMax);
  if (!Number.isFinite(tempMin)) tempMin = STARTING_TEMP_MIN;
  if (!Number.isFinite(tempMax)) tempMax = STARTING_TEMP_MAX;
  tempMin = clampInt(tempMin, TEMP_ABS_MIN, TEMP_ABS_MAX);
  tempMax = clampInt(tempMax, TEMP_ABS_MIN, TEMP_ABS_MAX);
  if (weather === WEATHER_FROST) {
    tempMin = Math.min(tempMin, FROST_TEMP_MIN_CAP);
  }
  if (tempMax < tempMin + TEMP_SPAN_MIN) tempMax = tempMin + TEMP_SPAN_MIN;
  return { tempMin, tempMax };
}

export function rollTemps(season, type, rng) {
  const range = TEMP_RANGES[season] ?? TEMP_RANGES.spring;
  const shift = TEMP_WEATHER_SHIFT[canonicalWeather(type)] ?? { min: 0, max: 0 };
  const tempMin = randInt(range.minLo, range.minHi, rng) + shift.min;
  const tempMax = randInt(range.maxLo, range.maxHi, rng) + shift.max;
  return applyTempsForWeather({ tempMin, tempMax }, type);
}

export function formatTempRange(tempMin, tempMax) {
  if (!Number.isFinite(Number(tempMin)) || !Number.isFinite(Number(tempMax))) return '';
  return `${Math.round(tempMin)}–${Math.round(tempMax)}°`;
}

export function moistureEtTempFactor(tempMin, tempMax) {
  const mean = (Number(tempMin) + Number(tempMax)) / 2;
  if (!Number.isFinite(mean)) return 1;
  const span = MOISTURE_ET_TEMP_HIGH_C - MOISTURE_ET_TEMP_LOW_C;
  const t = span === 0 ? 0 : (mean - MOISTURE_ET_TEMP_LOW_C) / span;
  const clamped = Math.max(0, Math.min(1, t));
  return MOISTURE_ET_TEMP_LOW + clamped * (MOISTURE_ET_TEMP_HIGH - MOISTURE_ET_TEMP_LOW);
}

export function isColdWeather(state) {
  if (canonicalWeather(state?.weather) === WEATHER_FROST) return true;
  return Number(state?.tempMin) <= COLD_TEMP_C;
}

export function isHotterThanCall(state) {
  const calledMax = Number(state?.forecastCall?.tempMax);
  const actualMax = Number(state?.tempMax);
  if (!Number.isFinite(calledMax) || !Number.isFinite(actualMax)) return false;
  return actualMax >= calledMax + TEMP_HOTTER_DELTA;
}

export function rollTrueDay(season, rng, day) {
  if (day != null && day <= GRACE_FINE_DAYS) {
    return { type: WEATHER_FINE, ...rollTemps(season, WEATHER_FINE, rng), ...rollWind(rng) };
  }
  const exclude = day != null ? weatherGraceExclusions(day) : null;
  const type = applyWeatherGrace(pickWeather(WEATHER_WEIGHTS[season], rng, exclude), day ?? Number.POSITIVE_INFINITY);
  return { type, ...rollTemps(season, type, rng), ...rollWind(rng) };
}

export function corruptDay(trueDay, accuracy, season, rng, day) {
  const type =
    rng.next() < accuracy ? trueDay.type : pickWeather(WEATHER_WEIGHTS[season], rng, trueDay.type);
  const nextType = applyWeatherGrace(type, day ?? Number.POSITIVE_INFINITY);
  const temps =
    rng.next() < accuracy
      ? { tempMin: trueDay.tempMin, tempMax: trueDay.tempMax }
      : rollTemps(season, nextType, rng);
  return { ...trueDay, type: nextType, ...applyTempsForWeather(temps, nextType) };
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
      ? state.weatherQueue.map((item, index) => {
          const type = applyWeatherGrace(item.type, state.day + 1 + index);
          return { ...item, type, ...applyTempsForWeather(item, type) };
        })
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
  const temps = applyTempsForWeather(today, weather);
  const nextQueue = queue.slice(1).concat(
    rollTrueDay(calendarFromDay(state.day + FORECAST_DAYS).season, rng, state.day + FORECAST_DAYS),
  );
  const forecastStrip = deriveForecastStrip(nextQueue, state.day, rng);
  return {
    weather,
    ...temps,
    forecast: forecastStrip[0].type,
    weatherQueue: nextQueue.map((item, index) => {
      const type = applyWeatherGrace(item.type, state.day + 1 + index);
      return { ...item, type, ...applyTempsForWeather(item, type) };
    }),
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
