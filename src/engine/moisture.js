import {
  DROUGHT_DECAY,
  GREEN_DRYING_FACTOR_MAX,
  GREEN_DRYING_FACTOR_MIN,
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
  MOISTURE_IRRIGATION_ADD,
  MOISTURE_MAX,
  MOISTURE_MIN,
  MOISTURE_OVERLAY_DRY_MIX,
  MOISTURE_OVERLAY_OK_MIX_HIGH,
  MOISTURE_OVERLAY_OK_MIX_LOW,
  MOISTURE_OVERLAY_WET_MIX,
  MOISTURE_RAIN_ADD,
  MOISTURE_START,
  MOISTURE_SURFACES,
  MOISTURE_WIND_ET_PER,
  STARTING_WIND_SPEED,
  TURFRAD_COST,
  WEATHER_FINE,
  WEATHER_OVERCAST,
  WIND_SPEED_MIN,
  pondWater,
  sand,
} from '../data/constants.js';
import { HOLES } from '../data/course.js';
import { lerpHex } from './color.js';
import { hocFactor } from './mowing.js';
import { formatMoney } from './format.js';

const WINDY_WEATHER = [WEATHER_FINE, WEATHER_OVERCAST];

export function allGreenIds(holes = HOLE_COUNT) {
  return Array.from({ length: holes }, (_, index) => index + 1);
}

export function emptyMoisture(holes = HOLE_COUNT) {
  return {
    greens: Array.from({ length: holes }, () => MOISTURE_START.greens),
    tees: MOISTURE_START.tees,
    fairways: MOISTURE_START.fairways,
  };
}

export function emptyMoistureReadDay(holes = HOLE_COUNT) {
  return {
    greens: Array.from({ length: holes }, () => MOISTURE_HIDDEN),
    tees: MOISTURE_HIDDEN,
    fairways: MOISTURE_HIDDEN,
  };
}

export function clampMoisture(value) {
  return Math.min(MOISTURE_MAX, Math.max(MOISTURE_MIN, value));
}

export function dryingFactorForGreen(index) {
  const factor = HOLES[index]?.dryingFactor ?? 1;
  return Math.min(GREEN_DRYING_FACTOR_MAX, Math.max(GREEN_DRYING_FACTOR_MIN, factor));
}

export function meanGreenMoisture(moisture) {
  const greens = moisture?.greens ?? [];
  if (!greens.length) return MOISTURE_START.greens;
  return greens.reduce((sum, value) => sum + value, 0) / greens.length;
}

export function surfaceMoisture(moisture, surface) {
  if (surface === 'greens') return meanGreenMoisture(moisture);
  return moisture?.[surface] ?? MOISTURE_START[surface];
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

function cloneMoisture(moisture, holes = HOLE_COUNT) {
  const fallback = emptyMoisture(holes);
  return {
    greens: [...(moisture?.greens ?? fallback.greens)],
    tees: moisture?.tees ?? fallback.tees,
    fairways: moisture?.fairways ?? fallback.fairways,
  };
}

function cloneReadDay(readDay, holes = HOLE_COUNT) {
  const fallback = emptyMoistureReadDay(holes);
  return {
    greens: [...(readDay?.greens ?? fallback.greens)],
    tees: readDay?.tees ?? fallback.tees,
    fairways: readDay?.fairways ?? fallback.fairways,
  };
}

function etMultiplier(state, surface) {
  const factor = hocFactor(surface, state.surfaces?.[surface]?.hoc);
  const season = MOISTURE_ET_SEASON[state.season] ?? 1;
  const weather = MOISTURE_ET_WEATHER[state.weather] ?? 1;
  const wind = state.windSpeed ?? STARTING_WIND_SPEED;
  const windMult = WINDY_WEATHER.includes(state.weather)
    ? 1 + Math.max(0, wind - WIND_SPEED_MIN) * MOISTURE_WIND_ET_PER
    : 1;
  return season * weather * HOC_WATER_MULT(factor) * windMult;
}

function irrigationAdd(state, surface) {
  const policy = state.irrigation?.[surface] ?? 'off';
  return MOISTURE_IRRIGATION_ADD[policy] ?? 0;
}

function rainAdd(weather) {
  return MOISTURE_RAIN_ADD[weather] ?? 0;
}

export function tickMoisture(state) {
  const holes = state.holes ?? HOLE_COUNT;
  const next = cloneMoisture(state.moisture, holes);
  const rain = rainAdd(state.weather);
  for (const surface of ['tees', 'fairways']) {
    const et = MOISTURE_ET_BASE[surface] * etMultiplier(state, surface);
    next[surface] = clampMoisture(next[surface] + irrigationAdd(state, surface) + rain - et);
  }
  const greensEt = MOISTURE_ET_BASE.greens * etMultiplier(state, 'greens');
  const greensAdd = irrigationAdd(state, 'greens') + rain;
  next.greens = Array.from({ length: holes }, (_, index) => {
    const prev = next.greens[index] ?? MOISTURE_START.greens;
    return clampMoisture(prev + greensAdd - greensEt * dryingFactorForGreen(index));
  });
  return next;
}

export function applyHandWater(moisture, targets, holes = HOLE_COUNT) {
  const next = cloneMoisture(moisture, holes);
  for (const id of targets ?? []) {
    const index = id - 1;
    if (index < 0 || index >= next.greens.length) continue;
    next.greens[index] = clampMoisture(next.greens[index] + MOISTURE_HAND_WATER_ADD);
  }
  return next;
}

export function revealMoisture(readDay, surface, day, holes = HOLE_COUNT) {
  const next = cloneReadDay(readDay, holes);
  if (surface === 'greens') {
    next.greens = Array.from({ length: holes }, () => day);
  } else if (surface === 'tees' || surface === 'fairways') {
    next[surface] = day;
  }
  return next;
}

function readAge(readDay, day) {
  if (readDay == null) return null;
  return day - readDay;
}

function readingKind(age, neverStale) {
  if (neverStale) return 'fresh';
  if (age == null) return 'hidden';
  if (age >= MOISTURE_DATA_FRESH_DAYS) return 'stale';
  return 'fresh';
}

export function moistureStatus(state, surface, greenIndex = null) {
  const holes = state.holes ?? HOLE_COUNT;
  const moisture = state.moisture ?? emptyMoisture(holes);
  const readDay = state.moistureReadDay ?? emptyMoistureReadDay(holes);
  if (surface === 'greens') {
    const index = greenIndex ?? 0;
    const value = greenIndex == null ? meanGreenMoisture(moisture) : (moisture.greens[index] ?? MOISTURE_START.greens);
    const age = readAge(readDay.greens[index] ?? readDay.greens[0], state.day);
    const kind = readingKind(age, Boolean(state.hasGreensSensors));
    if (kind === 'hidden') return { kind, value: MOISTURE_HIDDEN };
    return { kind, value };
  }
  const value = moisture[surface];
  const age = readAge(readDay[surface], state.day);
  const kind = readingKind(age, false);
  if (kind === 'hidden') return { kind, value: MOISTURE_HIDDEN };
  return { kind, value };
}

export function greensStatuses(state) {
  const holes = state.holes ?? HOLE_COUNT;
  return Array.from({ length: holes }, (_, index) => ({
    hole: index + 1,
    ...moistureStatus(state, 'greens', index),
  }));
}

export function droughtDecay(moisture) {
  const extra = {};
  for (const surface of MOISTURE_SURFACES) {
    if (isBelowBand(moisture, surface)) extra[surface] = DROUGHT_DECAY[surface];
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
  const targets = state.handWaterTargets ?? allGreenIds(state.holes);
  return HAND_WATER_MINUTES_PER_GREEN * targets.length;
}

export function canBuyGreensSensors(state) {
  if (state.hasGreensSensors) return { ok: false, reason: 'Greens already have sensors.' };
  if ((state.capitalBudget ?? 0) < GREENS_SENSORS_COST) {
    return { ok: false, reason: `Needs ${formatMoney(GREENS_SENSORS_COST)} capital, only ${formatMoney(state.capitalBudget)} posted.` };
  }
  return { ok: true };
}

export function canBuyTurfRad(state) {
  if (state.hasTurfRad) return { ok: false, reason: 'TurfRad is already on the mowers.' };
  if ((state.capitalBudget ?? 0) < TURFRAD_COST) {
    return { ok: false, reason: `Needs ${formatMoney(TURFRAD_COST)} capital, only ${formatMoney(state.capitalBudget)} posted.` };
  }
  return { ok: true };
}

export function migrateMoisture(state) {
  const holes = state.holes ?? HOLE_COUNT;
  const moisture = emptyMoisture(holes);
  if (Array.isArray(state.moisture?.greens)) {
    moisture.greens = Array.from({ length: holes }, (_, index) =>
      clampMoisture(state.moisture.greens[index] ?? MOISTURE_START.greens),
    );
    moisture.tees = clampMoisture(state.moisture.tees ?? MOISTURE_START.tees);
    moisture.fairways = clampMoisture(state.moisture.fairways ?? MOISTURE_START.fairways);
  }
  const moistureReadDay = emptyMoistureReadDay(holes);
  if (Array.isArray(state.moistureReadDay?.greens)) {
    moistureReadDay.greens = Array.from({ length: holes }, (_, index) => state.moistureReadDay.greens[index] ?? MOISTURE_HIDDEN);
    moistureReadDay.tees = state.moistureReadDay.tees ?? MOISTURE_HIDDEN;
    moistureReadDay.fairways = state.moistureReadDay.fairways ?? MOISTURE_HIDDEN;
  }
  const targets = Array.isArray(state.handWaterTargets) && state.handWaterTargets.length
    ? state.handWaterTargets.filter((id) => id >= 1 && id <= holes)
    : allGreenIds(holes);
  return {
    moisture,
    moistureReadDay,
    handWaterTargets: targets,
    hasGreensSensors: Boolean(state.hasGreensSensors),
    hasTurfRad: Boolean(state.hasTurfRad),
    moistureOverlay: Boolean(state.moistureOverlay),
  };
}
