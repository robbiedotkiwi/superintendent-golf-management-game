import {
  DROUGHT_DECAY,
  GREENS_SENSORS_COST,
  HAND_WATER_MINUTES_PER_GREEN,
  HOC_WATER_MULT,
  HOLE_COUNT,
  MOISTURE_BAND,
  MOISTURE_DATA_FRESH_DAYS,
  MOISTURE_ET_BASE,
  MOISTURE_ET_SEASON,
  MOISTURE_ET_WEATHER,
  MOISTURE_HAND_WATER_ADD,
  MOISTURE_HIDDEN,
  MOISTURE_MAX,
  MOISTURE_MIN,
  MOISTURE_OVERLAY_DRY_MIX,
  MOISTURE_OVERLAY_OK_MIX_HIGH,
  MOISTURE_OVERLAY_OK_MIX_LOW,
  MOISTURE_OVERLAY_WET_MIX,
  MOISTURE_PER_MM,
  MOISTURE_RAIN_ADD,
  MOISTURE_START,
  MOISTURE_SURFACES,
  MOISTURE_WIND_ET_PER,
  STARTING_WIND_SPEED,
  TURFRAD_COST,
  IRRIGATION_SURFACE_KEY,
  WEATHER_FINE,
  WEATHER_OVERCAST,
  WIND_SPEED_MIN,
  pondWater,
  sand,
} from '../data/constants.ts';
import { lerpHex } from './color.ts';
import { hocFactor } from './mowing.ts';
import { droughtMult } from './grass.ts';
import { needsCapital } from './cash.ts';
import { holeCount, mapHoleSurfaces } from './holes.ts';
import { moistureFromMm, migrateIrrigationValue } from './irrigation.ts';
import { moistureEtTempFactor } from './weather.ts';

const WINDY_WEATHER = [WEATHER_FINE, WEATHER_OVERCAST];
const AREA_SURFACES = ['greens', 'tees', 'fairways'];

export function allGreenIds(holes = HOLE_COUNT) {
  return Array.from({ length: holes }, (_, index) => index + 1);
}

export function emptyMoisture() {
  return {
    greens: MOISTURE_START.greens,
    tees: MOISTURE_START.tees,
    fairways: MOISTURE_START.fairways,
  };
}

export function emptyMoistureReadDay() {
  return {
    greens: MOISTURE_HIDDEN,
    tees: MOISTURE_HIDDEN,
    fairways: MOISTURE_HIDDEN,
  };
}

export function clampMoisture(value) {
  return Math.min(MOISTURE_MAX, Math.max(MOISTURE_MIN, value));
}

function asAreaValue(value, fallback) {
  if (Array.isArray(value)) {
    const nums = value.filter((item) => item != null && Number.isFinite(Number(item))).map(Number);
    if (!nums.length) return fallback;
    return nums.reduce((sum, item) => sum + item, 0) / nums.length;
  }
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asReadDay(value) {
  if (Array.isArray(value)) {
    const days = value.filter((item) => item != null && Number.isFinite(Number(item))).map(Number);
    if (!days.length) return MOISTURE_HIDDEN;
    return Math.max(...days);
  }
  if (value == null) return MOISTURE_HIDDEN;
  const n = Number(value);
  return Number.isFinite(n) ? n : MOISTURE_HIDDEN;
}

export function meanGreenMoisture(moisture) {
  return asAreaValue(moisture?.greens, MOISTURE_START.greens);
}

export function surfaceMoisture(moisture, surface) {
  if (surface === 'greens') return meanGreenMoisture(moisture);
  return asAreaValue(moisture?.[surface], MOISTURE_START[surface]);
}

export function isBelowBand(moisture, surface) {
  const band = MOISTURE_BAND[surface];
  if (!band) return false;
  return surfaceMoisture(moisture, surface) < band.min;
}

export function isAboveBand(moisture, surface) {
  const band = MOISTURE_BAND[surface];
  if (!band) return false;
  return surfaceMoisture(moisture, surface) > band.max;
}

export function greenBandState(value) {
  const band = MOISTURE_BAND.greens;
  if (value < band.min) return 'dry';
  if (value > band.max) return 'wet';
  return 'ok';
}

function cloneMoisture(moisture) {
  const fallback = emptyMoisture();
  return {
    greens: clampMoisture(asAreaValue(moisture?.greens, fallback.greens)),
    tees: clampMoisture(asAreaValue(moisture?.tees, fallback.tees)),
    fairways: clampMoisture(asAreaValue(moisture?.fairways, fallback.fairways)),
  };
}

function cloneReadDay(readDay) {
  return {
    greens: asReadDay(readDay?.greens),
    tees: asReadDay(readDay?.tees),
    fairways: asReadDay(readDay?.fairways),
  };
}

function etMultiplier(state, surface) {
  const factor = hocFactor(surface, state.surfaceDefaults?.[surface]?.hoc, state);
  const season = MOISTURE_ET_SEASON[state.season] ?? 1;
  const weather = MOISTURE_ET_WEATHER[state.weather] ?? 1;
  const heat = moistureEtTempFactor(state.tempMin, state.tempMax);
  const wind = state.windSpeed ?? STARTING_WIND_SPEED;
  const windMult = WINDY_WEATHER.includes(state.weather)
    ? 1 + Math.max(0, wind - WIND_SPEED_MIN) * MOISTURE_WIND_ET_PER
    : 1;
  return season * weather * heat * HOC_WATER_MULT(factor) * windMult;
}

export function surfaceEtPoints(state, surface) {
  const base = MOISTURE_ET_BASE[surface];
  if (!base) return 0;
  return base * etMultiplier(state, surface);
}

export function surfaceEtMm(state, surface) {
  const key = IRRIGATION_SURFACE_KEY[surface];
  const per = MOISTURE_PER_MM[key];
  if (!per) return 0;
  return surfaceEtPoints(state, surface) / per;
}

function irrigationAdd(state, surface) {
  const mm = migrateIrrigationValue(surface, state.irrigation?.[surface]);
  return moistureFromMm(surface, mm);
}

function rainAdd(weather) {
  return MOISTURE_RAIN_ADD[weather] ?? 0;
}

export function tickMoisture(state) {
  const next = cloneMoisture(state.moisture);
  const rain = rainAdd(state.weather);
  for (const surface of AREA_SURFACES) {
    const et = MOISTURE_ET_BASE[surface] * etMultiplier(state, surface);
    next[surface] = clampMoisture(next[surface] + irrigationAdd(state, surface) + rain - et);
  }
  return next;
}

export function writeMoistureToHoles(holes, moisture, moistureReadDay) {
  let next = holes;
  for (const surface of AREA_SURFACES) {
    next = mapHoleSurfaces(next, surface, (record) => ({
      ...record,
      moisture: moisture?.[surface] ?? record.moisture,
      moistureReadDay: moistureReadDay?.[surface] ?? record.moistureReadDay,
    }));
  }
  return next;
}

export function applyHandWater(moisture) {
  const next = cloneMoisture(moisture);
  next.greens = clampMoisture(next.greens + MOISTURE_HAND_WATER_ADD);
  return next;
}

export function revealMoisture(readDay, surface, day) {
  const next = cloneReadDay(readDay);
  if (surface === 'greens' || surface === 'tees' || surface === 'fairways') {
    next[surface] = day;
  }
  return next;
}

function readAge(readDay, day) {
  if (readDay == null || readDay === MOISTURE_HIDDEN) return null;
  return day - readDay;
}

function readingKind(age, neverStale) {
  if (neverStale) return 'fresh';
  if (age == null) return 'hidden';
  if (age >= MOISTURE_DATA_FRESH_DAYS) return 'stale';
  return 'fresh';
}

export function moistureStatus(state, surface) {
  const moisture = state.moisture ?? emptyMoisture();
  const readDay = state.moistureReadDay ?? emptyMoistureReadDay();
  const value = surfaceMoisture(moisture, surface);
  const neverStale = surface === 'greens' && Boolean(state.hasGreensSensors);
  const age = readAge(readDay[surface], state.day);
  const kind = readingKind(age, neverStale);
  if (kind === 'hidden') return { kind, value: MOISTURE_HIDDEN };
  return { kind, value };
}

export function droughtDecay(moisture, state) {
  const extra = {};
  for (const surface of MOISTURE_SURFACES) {
    if (isBelowBand(moisture, surface)) extra[surface] = DROUGHT_DECAY[surface] * droughtMult(state, surface);
  }
  return extra;
}

export function moistureOverlayColor(value, surface) {
  const band = MOISTURE_BAND[surface];
  if (!band || value == null) return null;
  if (value < band.min) {
    const t = band.min <= 0 ? 0 : value / band.min;
    return lerpHex(sand, lerpHex(sand, pondWater, MOISTURE_OVERLAY_DRY_MIX), t);
  }
  if (value > band.max) {
    const span = MOISTURE_MAX - band.max || 1;
    const t = Math.min(1, (value - band.max) / span);
    return lerpHex(lerpHex(sand, pondWater, MOISTURE_OVERLAY_WET_MIX), pondWater, t);
  }
  const t = (value - band.min) / (band.max - band.min || 1);
  return lerpHex(lerpHex(sand, pondWater, MOISTURE_OVERLAY_OK_MIX_LOW), lerpHex(sand, pondWater, MOISTURE_OVERLAY_OK_MIX_HIGH), t);
}

export function outOfBand(value, surface) {
  const band = MOISTURE_BAND[surface];
  if (!band || value == null) return false;
  return value < band.min || value > band.max;
}

export function handWaterMinutes(state) {
  return HAND_WATER_MINUTES_PER_GREEN * holeCount(state);
}

export function canBuyGreensSensors(state) {
  if (state.hasGreensSensors) return { ok: false, reason: 'Greens already have sensors.' };
  const sensorCash = needsCapital(state, GREENS_SENSORS_COST);
  if (!sensorCash.ok) return sensorCash;
  return { ok: true };
}

export function canBuyTurfRad(state) {
  if (state.hasTurfRad) return { ok: false, reason: 'TurfRad is already on the mowers.' };
  const radCash = needsCapital(state, TURFRAD_COST);
  if (!radCash.ok) return radCash;
  return { ok: true };
}

export function migrateMoisture(state) {
  const moisture = emptyMoisture();
  moisture.greens = clampMoisture(asAreaValue(state.moisture?.greens, MOISTURE_START.greens));
  moisture.tees = clampMoisture(asAreaValue(state.moisture?.tees, MOISTURE_START.tees));
  moisture.fairways = clampMoisture(asAreaValue(state.moisture?.fairways, MOISTURE_START.fairways));
  const moistureReadDay = emptyMoistureReadDay();
  moistureReadDay.greens = asReadDay(state.moistureReadDay?.greens);
  moistureReadDay.tees = asReadDay(state.moistureReadDay?.tees);
  moistureReadDay.fairways = asReadDay(state.moistureReadDay?.fairways);
  return {
    moisture,
    moistureReadDay,
    hasGreensSensors: Boolean(state.hasGreensSensors),
    hasTurfRad: Boolean(state.hasTurfRad),
    hasWeatherStation: Boolean(state.hasWeatherStation),
    moistureOverlay: Boolean(state.moistureOverlay),
  };
}
