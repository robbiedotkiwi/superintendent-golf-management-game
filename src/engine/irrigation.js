import {
  AERATOR_COST,
  GROUNDWATER_M3,
  IRRIGATED_AREA_M2_PER_HOLE,
  IRRIGATION_MM_M3_DIVISOR,
  IRRIGATION_MM_RANGE,
  IRRIGATION_SURFACE_KEY,
  MAINS_COST_PER_M3,
  MOISTURE_PER_MM,
  POND_CAPACITY,
  POND_EXPANDED_CAPACITY,
  POND_EXPANDED_GROUNDWATER_M3,
  POND_EXPANDED_HEALTH_DECAY_MULT,
  POND_HEALTH_LOW_DROP,
  POND_HEALTH_MAX,
  POND_HEALTH_SUMMER_DROP,
  POND_LOW_FRACTION,
  POND_DOSE_WEEK_DAYS,
  POND_DOSE_DUE_COPY,
  RAIN_POND_M3,
  STARTING_IRRIGATION,
  STORM_POND_M3,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';
import { holeCount } from './holes.js';
import { needsCash } from './cash.js';

export const IRRIGATED_SURFACES = ['greens', 'tees', 'fairways'];

export function irrigationMmKey(surface) {
  return IRRIGATION_SURFACE_KEY[surface];
}

export function irrigationMmRange(surface) {
  return IRRIGATION_MM_RANGE[irrigationMmKey(surface)];
}

export function clampIrrigationMm(surface, mm) {
  const range = irrigationMmRange(surface);
  if (!range) return 0;
  const n = Number(mm);
  if (!Number.isFinite(n)) return range.default;
  const stepped = Math.round(n / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, Number(stepped.toFixed(2))));
}

export function migrateIrrigationValue(surface, value) {
  const range = irrigationMmRange(surface);
  if (typeof value === 'number' && Number.isFinite(value)) return clampIrrigationMm(surface, value);
  if (value === 'off') return 0;
  if (value === 'light') return range.default / 2;
  if (value === 'full') return range.default;
  return STARTING_IRRIGATION[surface] ?? range.default;
}

export function migrateIrrigation(irrigation) {
  const source = irrigation && typeof irrigation === 'object' ? irrigation : {};
  return Object.fromEntries(IRRIGATED_SURFACES.map((surface) => [surface, migrateIrrigationValue(surface, source[surface])]));
}

export function irrigationMmToM3(surface, mm, holes) {
  const key = irrigationMmKey(surface);
  return (Number(mm) * IRRIGATED_AREA_M2_PER_HOLE[key] * holes) / IRRIGATION_MM_M3_DIVISOR;
}

export function moistureFromMm(surface, mm) {
  const key = irrigationMmKey(surface);
  return Number(mm) * MOISTURE_PER_MM[key];
}

export function irrigationDemand(state) {
  const holes = holeCount(state);
  const demand = {};
  let total = 0;
  for (const surface of IRRIGATED_SURFACES) {
    const mm = migrateIrrigationValue(surface, state.irrigation?.[surface]);
    const amount = irrigationMmToM3(surface, mm, holes);
    demand[surface] = amount;
    total += amount;
  }
  return { demand, total };
}

export function projectedPondVolume(state) {
  return Math.max(0, (state.pond?.volume ?? 0) - irrigationDemand(state).total);
}

export function rainFill(weather) {
  if (weather === WEATHER_RAIN) return RAIN_POND_M3;
  if (weather === WEATHER_HEAVY_RAIN || weather === WEATHER_STORM) return STORM_POND_M3;
  return 0;
}

export function pondCapacity(state) {
  return state?.hasPondExpansion ? POND_EXPANDED_CAPACITY : POND_CAPACITY;
}

export function groundwaterM3(state) {
  return state?.hasPondExpansion ? POND_EXPANDED_GROUNDWATER_M3 : GROUNDWATER_M3;
}

export function pondHealthDecayMult(state) {
  return state?.hasPondExpansion ? POND_EXPANDED_HEALTH_DECAY_MULT : 1;
}

export function daysSincePondDose(state) {
  const last = Number(state.lastPondDoseDay);
  if (!Number.isFinite(last)) return Number.POSITIVE_INFINITY;
  return Math.max(0, state.day - last);
}

export function isPondDoseCurrent(state) {
  return daysSincePondDose(state) < POND_DOSE_WEEK_DAYS;
}

export function isPondDoseDue(state) {
  return !isPondDoseCurrent(state);
}

export function pondDoseBriefing(state) {
  if (!isPondDoseDue(state)) return null;
  return POND_DOSE_DUE_COPY;
}

export function resolveIrrigation(state) {
  const { demand, total } = irrigationDemand(state);
  let volume = state.pond.volume;
  let fromPond = Math.min(volume, total);
  volume -= fromPond;
  const shortfall = total - fromPond;
  const mainsCost = shortfall * MAINS_COST_PER_M3;
  const capacity = pondCapacity(state);
  volume = Math.min(capacity, volume + groundwaterM3(state) + rainFill(state.weather));

  let health = state.pond.health;
  const low = volume / capacity < POND_LOW_FRACTION;
  const held = Boolean(state.hasAerator) || isPondDoseCurrent(state);
  if (!held) {
    const mult = pondHealthDecayMult(state);
    if (state.season === 'summer') health -= POND_HEALTH_SUMMER_DROP * mult;
    if (low) health -= POND_HEALTH_LOW_DROP * mult;
  }
  health = Math.max(0, Math.min(POND_HEALTH_MAX, health));

  return {
    pond: { volume, health },
    mainsCost,
    shortfall,
    demand,
    doseCost: 0,
    dosed: isPondDoseCurrent(state),
  };
}

export function pondPercent(volume, capacity = POND_CAPACITY) {
  if (!capacity) return 0;
  return (volume / capacity) * 100;
}

export function canBuyAerator(state) {
  if (state.hasAerator) return { ok: false, reason: 'Already in the pond.' };
  const aeratorCash = needsCash(state, AERATOR_COST);
  if (!aeratorCash.ok) return aeratorCash;
  return { ok: true };
}
