import {
  DISEASE_OUTBREAK_DAILY,
  DISEASE_OUTBREAK_DROP,
  DISEASE_OUTBREAK_THRESHOLD,
  DISEASE_PRESSURE_BASE,
  DISEASE_PRESSURE_MAX,
  DISEASE_PRESSURE_MIN,
  DISEASE_SEASON,
  DISEASE_SUSCEPTIBILITY,
  DISEASE_UNDERWATER_MULT,
  DISEASE_WET_MULT,
  FERTILISER_DAYS,
  SPRAY_SUPPRESS_DAYS,
  STARTING_DISEASE_PRESSURE,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';

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

export function pressureGain(state, surface, watered) {
  const susceptibility = DISEASE_SUSCEPTIBILITY[surface] ?? 0;
  if (susceptibility === 0) return 0;
  if (isSuppressed(state, surface)) return 0;
  let gain = DISEASE_PRESSURE_BASE * susceptibility * DISEASE_SEASON[state.season];
  if (WET_WEATHER.includes(state.weather)) gain *= DISEASE_WET_MULT;
  if (watered && watered[surface] === false) gain *= DISEASE_UNDERWATER_MULT;
  return gain;
}

export function applySpray(state, surface) {
  return {
    ...state,
    sprayedUntil: { ...state.sprayedUntil, [surface]: state.day + SPRAY_SUPPRESS_DAYS },
    disease: {
      ...state.disease,
      [surface]: { pressure: STARTING_DISEASE_PRESSURE, outbreak: false },
    },
  };
}

export function applyFertiliser(state, surface) {
  return {
    ...state,
    fertiliserUntil: { ...state.fertiliserUntil, [surface]: state.day + FERTILISER_DAYS },
  };
}

export function resolveDisease(state, watered) {
  const disease = {};
  const outbreaks = [];
  const ongoing = [];
  for (const surface of DISEASE_SURFACES) {
    const prev = state.disease?.[surface] ?? { pressure: STARTING_DISEASE_PRESSURE, outbreak: false };
    let pressure = prev.pressure;
    let outbreak = prev.outbreak;
    pressure = Math.min(DISEASE_PRESSURE_MAX, Math.max(DISEASE_PRESSURE_MIN, pressure + pressureGain(state, surface, watered)));
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

export function diseaseSurfacesVisible(state) {
  return DISEASE_SURFACES.map((surface) => ({
    surface,
    pressure: state.disease?.[surface]?.pressure ?? STARTING_DISEASE_PRESSURE,
    outbreak: Boolean(state.disease?.[surface]?.outbreak),
  }));
}
