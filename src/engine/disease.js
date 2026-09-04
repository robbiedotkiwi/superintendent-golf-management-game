import {
  DISEASE_OUTBREAK_DAILY,
  DISEASE_OUTBREAK_DROP,
  DISEASE_OUTBREAK_THRESHOLD,
  DISEASE_OUTBREAK_WARN,
  DISEASE_PRESSURE_BASE,
  DISEASE_PRESSURE_MAX,
  DISEASE_PRESSURE_MIN,
  DISEASE_SEASON,
  DISEASE_SUSCEPTIBILITY,
  DISEASE_WET_MULT,
  FERTILISER_DAYS,
  SPRAY_SUPPRESS_DAYS,
  STARTING_DISEASE_PRESSURE,
  WET_DISEASE_MULT,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';
import { inDiseaseGrace } from './calendar.js';
import { defaultJobHoles, isHoleModel, mapHoleSurfaces } from './holes.js';
import { isAboveBand } from './moisture.js';

export const DISEASE_SURFACES = ['greens', 'tees', 'fairways', 'rough'];

const WET_WEATHER = [WEATHER_RAIN, WEATHER_HEAVY_RAIN, WEATHER_STORM];

export function emptyDisease() {
  return DISEASE_SURFACES.reduce((next, surface) => {
    next[surface] = { pressure: STARTING_DISEASE_PRESSURE, outbreak: false };
    return next;
  }, {});
}

export function emptyUntil() {
  return { greens: 0, tees: 0, fairways: 0 };
}

export function isSuppressed(state, surface) {
  return state.day < (state.sprayedUntil?.[surface] ?? 0);
}

export function holeIsSuppressed(state, record, surface) {
  if ((record?.sprayedUntil ?? 0) > state.day) return true;
  return isSuppressed(state, surface);
}

export function approachingOutbreak(pressure) {
  return pressure >= DISEASE_OUTBREAK_WARN && pressure < DISEASE_OUTBREAK_THRESHOLD;
}

export function holeDiseasePressure(state, record, surface) {
  if (record?.diseasePressure != null) return record.diseasePressure;
  return state.disease?.[surface]?.pressure ?? STARTING_DISEASE_PRESSURE;
}

export function holeTreatmentUntil(record, typeUntil) {
  return record?.fertiliserUntil || typeUntil || 0;
}

export function holeSprayUntil(record, typeUntil) {
  return record?.sprayedUntil || typeUntil || 0;
}

function targetsFor(state, surface, holeIds) {
  if (Array.isArray(holeIds) && holeIds.length) return holeIds;
  if (isHoleModel(state.holes)) return defaultJobHoles(state, surface);
  return [];
}

function coversType(state, surface, targets) {
  if (!isHoleModel(state.holes)) return true;
  const all = defaultJobHoles(state, surface);
  return all.length > 0 && all.every((id) => targets.includes(id));
}

export function pressureGain(state, surface) {
  if (inDiseaseGrace(state.day)) return 0;
  const susceptibility = DISEASE_SUSCEPTIBILITY[surface] ?? 0;
  if (susceptibility === 0) return 0;
  if (isSuppressed(state, surface)) return 0;
  let gain = DISEASE_PRESSURE_BASE * susceptibility * DISEASE_SEASON[state.season];
  if (WET_WEATHER.includes(state.weather)) gain *= DISEASE_WET_MULT;
  if (isAboveBand(state.moisture, surface)) gain *= WET_DISEASE_MULT;
  return gain;
}

export function applySpray(state, surface, holeIds) {
  const until = state.day + SPRAY_SUPPRESS_DAYS;
  const targets = targetsFor(state, surface, holeIds);
  let holes = state.holes;
  if (isHoleModel(holes)) {
    holes = mapHoleSurfaces(holes, surface, (record, hole) => {
      if (targets.length && !targets.includes(hole.id)) return record;
      return { ...record, sprayedUntil: until, diseasePressure: STARTING_DISEASE_PRESSURE };
    });
  }
  const live = { ...state, holes };
  const allTreated = coversType(live, surface, targets);
  return {
    ...state,
    holes,
    sprayedUntil: {
      ...state.sprayedUntil,
      [surface]: allTreated ? until : (state.sprayedUntil?.[surface] ?? 0),
    },
    disease: allTreated
      ? {
          ...state.disease,
          [surface]: { pressure: STARTING_DISEASE_PRESSURE, outbreak: false },
        }
      : state.disease,
  };
}

export function applyFertiliser(state, surface, holeIds) {
  const until = state.day + FERTILISER_DAYS;
  const targets = targetsFor(state, surface, holeIds);
  let holes = state.holes;
  if (isHoleModel(holes)) {
    holes = mapHoleSurfaces(holes, surface, (record, hole) => {
      if (targets.length && !targets.includes(hole.id)) return record;
      return { ...record, fertiliserUntil: until };
    });
  }
  const live = { ...state, holes };
  const allTreated = coversType(live, surface, targets);
  return {
    ...state,
    holes,
    fertiliserUntil: {
      ...state.fertiliserUntil,
      [surface]: allTreated ? until : (state.fertiliserUntil?.[surface] ?? 0),
    },
  };
}

export function resolveDisease(state) {
  const disease = {};
  const outbreaks = [];
  const ongoing = [];
  for (const surface of DISEASE_SURFACES) {
    const prev = state.disease?.[surface] ?? { pressure: STARTING_DISEASE_PRESSURE, outbreak: false };
    let pressure = prev.pressure;
    let outbreak = prev.outbreak;
    if (inDiseaseGrace(state.day)) {
      pressure = STARTING_DISEASE_PRESSURE;
      outbreak = false;
    } else {
      pressure = Math.min(DISEASE_PRESSURE_MAX, Math.max(DISEASE_PRESSURE_MIN, pressure + pressureGain(state, surface)));
    }
    if (DISEASE_SUSCEPTIBILITY[surface] === 0) {
      pressure = STARTING_DISEASE_PRESSURE;
      outbreak = false;
    }
    if (outbreak && !isSuppressed(state, surface)) {
      ongoing.push({ surface, drop: DISEASE_OUTBREAK_DAILY });
    }
    if (!outbreak && pressure >= DISEASE_OUTBREAK_THRESHOLD && (DISEASE_SUSCEPTIBILITY[surface] ?? 0) > 0) {
      outbreak = true;
      outbreaks.push({ surface, drop: DISEASE_OUTBREAK_DROP, pressure });
    }
    disease[surface] = { pressure, outbreak };
  }
  return { disease, outbreaks, ongoing };
}

export function syncHoleDisease(holes, state, disease) {
  if (!isHoleModel(holes)) return holes;
  let next = holes;
  for (const surface of DISEASE_SURFACES) {
    if (surface === 'rough') {
      next = mapHoleSurfaces(next, surface, (record) => ({
        ...record,
        diseasePressure: STARTING_DISEASE_PRESSURE,
      }));
      continue;
    }
    next = mapHoleSurfaces(next, surface, (record) => {
      if (holeIsSuppressed(state, record, surface)) {
        return { ...record, diseasePressure: STARTING_DISEASE_PRESSURE };
      }
      return { ...record, diseasePressure: disease[surface]?.pressure ?? record.diseasePressure };
    });
  }
  return next;
}

export function diseaseSurfacesVisible(state) {
  return DISEASE_SURFACES.map((surface) => ({
    surface,
    pressure: state.disease?.[surface]?.pressure ?? STARTING_DISEASE_PRESSURE,
    outbreak: Boolean(state.disease?.[surface]?.outbreak),
  }));
}
