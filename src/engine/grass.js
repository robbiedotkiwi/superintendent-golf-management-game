import {
  HOC_RANGE,
  HOC_STEP,
  HOC_SURFACES,
} from '../data/constants.js';
import {
  GRASS_BY_ID,
  GRASS_TYPES,
  GROWTH_INDEX_NEUTRAL,
  STARTING_GRASS,
} from '../data/grass.js';

const AREA_TO_SURFACE = {
  greens: 'greens',
  tees: 'tees',
  fairways: 'fairways',
  rough: 'rough',
  surrounds: 'rough',
};

const DISEASE_RISK_MULT = {
  low: 0.75,
  medium: 1,
  high: 1.35,
};

const DROUGHT_TOLERANCE_MULT = {
  high: 0.6,
  medium: 1,
  low: 1.4,
};

const THATCH_WEAR_MULT = {
  low: 0.75,
  medium: 1,
  high: 1.35,
};

const WEAR_RECOVERY_MULT = {
  slow: 0.85,
  fast: 1,
  very_fast: 1.15,
};

export function startingGrass() {
  return { ...STARTING_GRASS };
}

export function grassById(id) {
  return GRASS_BY_ID[id] ?? null;
}

export function normalizeGrass(grass) {
  const next = startingGrass();
  if (!grass || typeof grass !== 'object') return next;
  for (const surface of HOC_SURFACES) {
    const id = grass[surface];
    if (grassById(id)) next[surface] = id;
  }
  return next;
}

export function grassIdFor(state, surface) {
  const id = state?.grass?.[surface];
  if (grassById(id)) return id;
  if (state?.grass) return STARTING_GRASS[surface] ?? null;
  return null;
}

export function grassSpeciesFor(state, surface) {
  return grassById(grassIdFor(state, surface));
}

export function surfacesForSpecies(species) {
  const set = new Set();
  for (const area of species?.areas ?? []) {
    const surface = AREA_TO_SURFACE[area];
    if (surface) set.add(surface);
  }
  return [...set];
}

export function speciesAllowedOn(speciesOrId, surface) {
  const species = typeof speciesOrId === 'string' ? grassById(speciesOrId) : speciesOrId;
  if (!species) return false;
  return surfacesForSpecies(species).includes(surface);
}

export function conversionTargets(surface) {
  return GRASS_TYPES.filter((species) => speciesAllowedOn(species, surface));
}

function snapHoc(value, surface, range) {
  const step = HOC_STEP[surface] ?? 1;
  const snapped = Math.round(Number(value) / step) * step;
  const places = step < 1 ? 1 : 0;
  const rounded = Number(snapped.toFixed(places));
  return Math.min(range.max, Math.max(range.min, rounded));
}

export function hocRangeFor(state, surface) {
  const catalog = HOC_RANGE[surface];
  if (!catalog) return catalog;
  if (!state?.grass) return catalog;
  const species = grassSpeciesFor(state, surface);
  const cut = species?.cutHeightMm;
  if (!cut) return catalog;
  const min = cut.min;
  const max = cut.max;
  const catalogSpan = catalog.max - catalog.min;
  const catalogFactor = catalogSpan === 0 ? 0 : (catalog.max - catalog.default) / catalogSpan;
  const rawDefault = max - catalogFactor * (max - min);
  return { min, max, default: snapHoc(rawDefault, surface, { min, max }) };
}

export function grassGrowthFactor(state, surface) {
  const species = grassSpeciesFor(state, surface);
  const index = species?.growthIndex?.[state?.season];
  if (index == null) return 1;
  return index / GROWTH_INDEX_NEUTRAL;
}

export function diseaseRiskMult(state, surface) {
  const risk = grassSpeciesFor(state, surface)?.diseaseRisk;
  return DISEASE_RISK_MULT[risk] ?? 1;
}

export function droughtMult(state, surface) {
  const tolerance = grassSpeciesFor(state, surface)?.droughtTolerance;
  return DROUGHT_TOLERANCE_MULT[tolerance] ?? 1;
}

export function thatchWearMult(state, surface) {
  const risk = grassSpeciesFor(state, surface)?.thatchRisk;
  return THATCH_WEAR_MULT[risk] ?? 1;
}

export function wearRecoveryMult(state, surface) {
  const recovery = grassSpeciesFor(state, surface)?.wearRecovery;
  return WEAR_RECOVERY_MULT[recovery] ?? 1;
}

export function isGrassDormant(state, surface) {
  const species = grassSpeciesFor(state, surface);
  return Boolean(species?.dormant && state?.season === 'winter');
}
