import {
  CONDITION_WEIGHTS,
  DRYING_FACTOR_DEFAULT,
  EXPANDED_HOLE_COUNT,
  HOC_RANGE,
  HOC_SURFACES,
  HOLE_COUNT,
  HOLE_KIND_BY_TYPE,
  MOISTURE_HIDDEN,
  MOISTURE_START,
  MOISTURE_SURFACES,
  PATTERN_ANGLE_DEFAULT,
  PATTERN_AUTO_ROTATE_DEFAULT,
  PATTERN_PRESENTATION,
  PATTERN_SURFACE_DEFAULT,
  PATTERN_WEAR_DEFAULT,
  PATTERNED_SURFACES,
  STARTING_DAY,
  STARTING_QUALITY_BUNKERS,
  STARTING_QUALITY_FAIRWAYS,
  STARTING_QUALITY_GREENS,
  STARTING_QUALITY_ROUGH,
  STARTING_QUALITY_TEES,
  SURFACE_KEYS,
  TYPE_BY_HOLE_KIND,
} from '../data/constants.js';
import { HOLE_SHAPES } from '../data/courseLayout.js';
import { holesForCount } from '../data/course.js';

export function holeCount(stateOrHoles) {
  if (Array.isArray(stateOrHoles)) return stateOrHoles.length;
  if (stateOrHoles && Array.isArray(stateOrHoles.holes)) return stateOrHoles.holes.length;
  if (typeof stateOrHoles?.holes === 'number') return stateOrHoles.holes;
  if (typeof stateOrHoles === 'number') return stateOrHoles;
  return HOLE_COUNT;
}

export function holeKind(type) {
  return HOLE_KIND_BY_TYPE[type] ?? type;
}

export function surfaceType(kind) {
  return TYPE_BY_HOLE_KIND[kind] ?? kind;
}

export function startingQuality(type) {
  if (type === 'greens' || type === 'green') return STARTING_QUALITY_GREENS;
  if (type === 'tees' || type === 'tee') return STARTING_QUALITY_TEES;
  if (type === 'fairways' || type === 'fairway') return STARTING_QUALITY_FAIRWAYS;
  if (type === 'rough') return STARTING_QUALITY_ROUGH;
  return STARTING_QUALITY_BUNKERS;
}

export function layoutHasBunker(holeId, count = HOLE_COUNT) {
  const layout = holesForCount(count);
  const hole = layout.find((item) => item.id === holeId);
  return Boolean(hole?.bunkers?.length);
}

export function dryingFactorForHole(holeId) {
  const frontId = ((holeId - 1) % HOLE_COUNT) + 1;
  const recipe = HOLE_SHAPES.find((item) => item.id === frontId);
  return recipe?.dryingFactor ?? DRYING_FACTOR_DEFAULT;
}

export function createSurfaceDefaults(grouped) {
  const defaults = {};
  for (const type of HOC_SURFACES) {
    const src = grouped?.[type] ?? {};
    defaults[type] = {
      hoc: src.hoc ?? HOC_RANGE[type].default,
      pattern: src.pattern ?? PATTERN_SURFACE_DEFAULT[type],
      angle: src.angle ?? PATTERN_ANGLE_DEFAULT,
      autoRotate: src.autoRotate ?? PATTERN_AUTO_ROTATE_DEFAULT,
    };
  }
  return defaults;
}

function createMowRecord({
  quality,
  lastMownDay = STARTING_DAY,
  heightAtLastCut = null,
  patternAtLastCut = null,
  angleAtLastCut = null,
  patternWear = PATTERN_WEAR_DEFAULT,
  diseasePressure = 0,
  moisture = MOISTURE_HIDDEN,
  moistureReadDay = MOISTURE_HIDDEN,
  dryingFactor = DRYING_FACTOR_DEFAULT,
  override = null,
  hocAtLastCut = null,
  lastPattern = null,
  lastAngle = null,
} = {}) {
  return {
    quality,
    lastMownDay,
    heightAtLastCut,
    patternAtLastCut,
    angleAtLastCut,
    patternWear,
    diseasePressure,
    moisture,
    moistureReadDay,
    dryingFactor,
    override: override ?? null,
    hocAtLastCut,
    lastPattern,
    lastAngle,
  };
}

function createBunkerRecord({ quality, lastRakedDay = STARTING_DAY } = {}) {
  return { quality, lastRakedDay };
}

function moistureFor(groupedMoisture, type, index, count) {
  if (type === 'greens') {
    const value = groupedMoisture?.greens?.[index];
    return value == null ? MOISTURE_START.greens : value;
  }
  if (type === 'tees') return groupedMoisture?.tees ?? MOISTURE_START.tees;
  if (type === 'fairways') return groupedMoisture?.fairways ?? MOISTURE_START.fairways;
  return MOISTURE_HIDDEN;
}

function readDayFor(groupedRead, type, index) {
  if (type === 'greens') return groupedRead?.greens?.[index] ?? MOISTURE_HIDDEN;
  if (type === 'tees' || type === 'fairways') return groupedRead?.[type] ?? MOISTURE_HIDDEN;
  return MOISTURE_HIDDEN;
}

function diseaseFor(groupedDisease, type) {
  return groupedDisease?.[type]?.pressure ?? 0;
}

function fanMowFromGrouped(type, grouped, extras, index, holeId) {
  const src = grouped?.[type] ?? {};
  const moistType = MOISTURE_SURFACES.includes(type) ? type : null;
  return createMowRecord({
    quality: src.quality ?? startingQuality(type),
    lastMownDay: src.lastMownDay ?? STARTING_DAY,
    heightAtLastCut: src.heightAtLastCut ?? null,
    patternAtLastCut: src.patternAtLastCut ?? null,
    angleAtLastCut: src.angleAtLastCut ?? null,
    patternWear: src.patternWear ?? PATTERN_WEAR_DEFAULT,
    diseasePressure: diseaseFor(extras.disease, type),
    moisture: moistType ? moistureFor(extras.moisture, moistType, index, extras.count) : MOISTURE_HIDDEN,
    moistureReadDay: moistType ? readDayFor(extras.moistureReadDay, moistType, index) : MOISTURE_HIDDEN,
    dryingFactor: type === 'greens' ? dryingFactorForHole(holeId) : DRYING_FACTOR_DEFAULT,
    override: null,
    hocAtLastCut: src.hocAtLastCut ?? src.hoc ?? HOC_RANGE[type]?.default ?? null,
    lastPattern: src.lastPattern ?? null,
    lastAngle: src.lastAngle ?? null,
  });
}

export function createInitialHoles(count = HOLE_COUNT, extras = {}) {
  const grouped = extras.surfaces;
  const holes = [];
  for (let index = 0; index < count; index += 1) {
    const id = index + 1;
    holes.push({
      id,
      green: fanMowFromGrouped('greens', grouped, { ...extras, count }, index, id),
      tee: fanMowFromGrouped('tees', grouped, { ...extras, count }, index, id),
      fairway: fanMowFromGrouped('fairways', grouped, { ...extras, count }, index, id),
      rough: fanMowFromGrouped('rough', grouped, { ...extras, count }, index, id),
      bunker: layoutHasBunker(id, count)
        ? createBunkerRecord({
            quality: grouped?.bunkers?.quality ?? STARTING_QUALITY_BUNKERS,
            lastRakedDay: grouped?.bunkers?.lastRakedDay ?? STARTING_DAY,
          })
        : null,
    });
  }
  if (!grouped) {
    for (const hole of holes) {
      hole.green.moisture = MOISTURE_START.greens;
      hole.tee.moisture = MOISTURE_START.tees;
      hole.fairway.moisture = MOISTURE_START.fairways;
    }
  }
  return holes;
}

export function isHoleModel(holes) {
  return Array.isArray(holes) && holes.length > 0 && holes[0]?.green && typeof holes[0].green.quality === 'number';
}

export function fanGroupedToHoles(state) {
  const count = typeof state.holes === 'number' ? state.holes : HOLE_COUNT;
  return createInitialHoles(count, {
    surfaces: state.surfaces,
    moisture: state.moisture,
    moistureReadDay: state.moistureReadDay,
    disease: state.disease,
  });
}

export function holeById(state, holeId) {
  const holes = Array.isArray(state) ? state : (state?.holes ?? []);
  return holes.find((hole) => hole.id === holeId) ?? null;
}

export function setQualities(state, values) {
  return Object.entries(values).reduce(
    (next, [type, quality]) => setTypeQuality(next, type, quality),
    state,
  );
}

export function holeSurface(state, holeId, type) {
  const hole = holeById(state, holeId);
  if (!hole) return null;
  return hole[holeKind(type)] ?? null;
}

export function presentHoles(state, type) {
  const holes = Array.isArray(state) ? state : (state?.holes ?? []);
  const kind = holeKind(type);
  return holes.filter((hole) => hole[kind] != null);
}

export function setTypeQuality(state, type, quality) {
  return { ...state, holes: mapHoleSurfaces(state.holes ?? [], type, (record) => ({ ...record, quality })) };
}

export function meanQuality(state, type) {
  const records = presentHoles(state, type).map((hole) => hole[holeKind(type)].quality);
  if (!records.length) return 0;
  return records.reduce((sum, value) => sum + value, 0) / records.length;
}

export function courseCondition(state) {
  return SURFACE_KEYS.reduce((total, type) => total + meanQuality(state, type) * CONDITION_WEIGHTS[type], 0);
}

export function courseSettings(state, type) {
  return state.surfaceDefaults?.[type] ?? createSurfaceDefaults()[type];
}

export function surfaceSettings(state, holeId, type) {
  const defaults = courseSettings(state, type) ?? {};
  const record = holeSurface(state, holeId, type);
  const override = record?.override;
  if (!override) return { ...defaults };
  return { ...defaults, ...override };
}

export function cloneHoles(holes) {
  return (holes ?? []).map((hole) => ({
    ...hole,
    green: { ...hole.green, override: hole.green.override ? { ...hole.green.override } : null },
    tee: { ...hole.tee, override: hole.tee.override ? { ...hole.tee.override } : null },
    fairway: { ...hole.fairway, override: hole.fairway.override ? { ...hole.fairway.override } : null },
    rough: { ...hole.rough, override: hole.rough.override ? { ...hole.rough.override } : null },
    bunker: hole.bunker ? { ...hole.bunker } : null,
  }));
}

export function mapHoleSurfaces(holes, type, fn) {
  const kind = holeKind(type);
  return holes.map((hole) => {
    const record = hole[kind];
    if (record == null) return hole;
    return { ...hole, [kind]: fn(record, hole) };
  });
}

export function replaceHoles(state, holes) {
  return { ...state, holes };
}

export function lastWorkedOnRecord(record, type) {
  if (!record) return null;
  return type === 'bunkers' || type === 'bunker' ? record.lastRakedDay : record.lastMownDay;
}

export function daysSinceHoleWorked(state, holeId, type) {
  const last = lastWorkedOnRecord(holeSurface(state, holeId, type), type);
  if (last == null) return 0;
  return Math.max(0, state.day - last);
}

export function mostRecentCut(state, type) {
  let best = null;
  for (const hole of presentHoles(state, type)) {
    const record = hole[holeKind(type)];
    if (record.heightAtLastCut == null) continue;
    if (!best || (record.lastMownDay ?? 0) > (best.record.lastMownDay ?? 0)) {
      best = { hole, record };
    }
  }
  return best;
}

export function expandHoleRecords(state) {
  const current = state.holes ?? [];
  if (current.length >= EXPANDED_HOLE_COUNT) return current;
  const extras = current.slice(0, HOLE_COUNT).map((hole) => ({
    ...hole,
    id: hole.id + HOLE_COUNT,
    green: { ...hole.green, override: hole.green.override ? { ...hole.green.override } : null, dryingFactor: dryingFactorForHole(hole.id + HOLE_COUNT) },
    tee: { ...hole.tee, override: hole.tee.override ? { ...hole.tee.override } : null },
    fairway: { ...hole.fairway, override: hole.fairway.override ? { ...hole.fairway.override } : null },
    rough: { ...hole.rough, override: hole.rough.override ? { ...hole.rough.override } : null },
    bunker: hole.bunker ? { ...hole.bunker } : layoutHasBunker(hole.id + HOLE_COUNT, EXPANDED_HOLE_COUNT)
      ? createBunkerRecord({ quality: startingQuality('bunkers') })
      : null,
  }));
  return [...cloneHoles(current), ...extras];
}

export function legacySurfaces(state) {
  const out = {};
  for (const type of SURFACE_KEYS) {
    const settings = courseSettings(state, type) ?? {};
    const sample = presentHoles(state, type)[0]?.[holeKind(type)];
    out[type] = {
      quality: meanQuality(state, type),
      ...settings,
      lastMownDay: sample?.lastMownDay,
      lastRakedDay: sample?.lastRakedDay,
      heightAtLastCut: sample?.heightAtLastCut,
      patternAtLastCut: sample?.patternAtLastCut,
      angleAtLastCut: sample?.angleAtLastCut,
      hocAtLastCut: sample?.hocAtLastCut,
      patternWear: sample?.patternWear,
    };
  }
  return out;
}

export function presentationFromState(state) {
  return PATTERNED_SURFACES.reduce((total, type) => {
    const holes = presentHoles(state, type);
    if (!holes.length) return total;
    const score = holes.reduce((sum, hole) => {
      const pattern = surfaceSettings(state, hole.id, type).pattern;
      return sum + (PATTERN_PRESENTATION[pattern] ?? 0);
    }, 0);
    return total + score / holes.length;
  }, 0);
}
