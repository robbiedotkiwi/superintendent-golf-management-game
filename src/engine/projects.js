import {
  AUTO_PICKER_COST,
  DRIVING_RANGE_COST,
  DRIVING_RANGE_DAYS,
  EXPANDED_HOLE_COUNT,
  EXTRA_BUNKERS_COST,
  EXTRA_BUNKERS_DAYS,
  EXTRA_BUNKER_TIME_MULT,
  HOLE_COUNT,
  NEW_TEES_COST,
  NEW_TEES_DAYS,
  NEW_TEES_TIME_MULT,
  PLAYER_ID,
  PROJECT_DAILY_MINUTES,
  PROJECT_DRIVING_RANGE,
  PROJECT_EXPAND_18,
  PROJECT_EXTRA_BUNKERS,
  PROJECT_NEW_TEES,
  PROJECT_POND_EXPANSION,
  PROJECT_GRASS_CONVERSION,
  POND_EXPANSION_COST,
  POND_EXPANSION_DAYS,
  GRASS_CONVERSION_COST,
  GRASS_CONVERSION_DAYS,
  GRASS_CONVERSION_QUALITY_HIT,
  QUALITY_MIN,
  SEASON_GROWTH,
} from '../data/constants.js';
import {
  EXPAND_3_HOLE_COST,
  EXPAND_3_HOLE_DAYS,
  EXPAND_9_HOLE_COST,
  EXPAND_9_HOLE_DAYS,
  EXPAND_HOLE_COUNT_3,
  EXPAND_HOLE_COUNT_9,
  GROW_IN_AREAS,
  GROW_IN_DAYS,
  PROJECT_EXPAND_3,
  PROJECT_EXPAND_9,
  PROJECT_FULL_TIME_MINUTES,
  PROJECT_OCCUPIES_PERSON,
} from '../data/config.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { bumpCapitalSpent } from './history.js';
import { conversionTargets, grassById, grassIdFor, speciesAllowedOn } from './grass.js';
import { expandHoleRecords, holeCount, mapHoleSurfaces } from './holes.js';
import { clampHoc } from './mowing.js';
import { needsCapital, spendCapital } from './cash.js';
import { emptyMoisture, emptyMoistureReadDay } from './moisture.js';

export const PROJECTS = {
  [PROJECT_EXPAND_3]: {
    id: PROJECT_EXPAND_3,
    name: 'Add 3 holes',
    cost: EXPAND_3_HOLE_COST,
    days: EXPAND_3_HOLE_DAYS,
    holes: EXPAND_HOLE_COUNT_3,
    occupiesPerson: PROJECT_OCCUPIES_PERSON,
  },
  [PROJECT_EXPAND_9]: {
    id: PROJECT_EXPAND_9,
    name: 'Add 9 holes',
    cost: EXPAND_9_HOLE_COST,
    days: EXPAND_9_HOLE_DAYS,
    holes: EXPAND_HOLE_COUNT_9,
    occupiesPerson: PROJECT_OCCUPIES_PERSON,
  },
  [PROJECT_DRIVING_RANGE]: {
    id: PROJECT_DRIVING_RANGE,
    name: 'Driving range',
    cost: DRIVING_RANGE_COST,
    days: DRIVING_RANGE_DAYS,
  },
  [PROJECT_EXTRA_BUNKERS]: {
    id: PROJECT_EXTRA_BUNKERS,
    name: 'Additional bunkers',
    cost: EXTRA_BUNKERS_COST,
    days: EXTRA_BUNKERS_DAYS,
  },
  [PROJECT_NEW_TEES]: {
    id: PROJECT_NEW_TEES,
    name: 'New tees',
    cost: NEW_TEES_COST,
    days: NEW_TEES_DAYS,
  },
  [PROJECT_POND_EXPANSION]: {
    id: PROJECT_POND_EXPANSION,
    name: 'Pond expansion',
    cost: POND_EXPANSION_COST,
    days: POND_EXPANSION_DAYS,
  },
};

export function projectSpec(id) {
  return PROJECTS[id];
}

export function isExpandProject(id) {
  return id === PROJECT_EXPAND_3 || id === PROJECT_EXPAND_9 || id === PROJECT_EXPAND_18;
}

export function hasProject(state, id) {
  return (state.projects ?? []).some((item) => item.id === id);
}

export function projectWorkerIds(state) {
  return new Set(
    (state.projects ?? [])
      .filter((item) => !item.paused && projectSpec(item.id)?.occupiesPerson && item.workerId)
      .map((item) => item.workerId),
  );
}

export function playerSiteMinutes(state) {
  const growth = SEASON_GROWTH[state.season] ?? 1;
  return (state.projects ?? []).reduce((sum, item) => {
    if (item.paused) return sum;
    if (projectSpec(item.id)?.occupiesPerson) return sum;
    const base = PROJECT_DAILY_MINUTES[item.id] ?? 0;
    return sum + Math.round(base * growth);
  }, 0);
}

export function constructionMinutes(state) {
  return (state.projects ?? []).reduce((sum, item) => {
    if (item.paused) return sum;
    if (projectSpec(item.id)?.occupiesPerson) return sum + PROJECT_FULL_TIME_MINUTES;
    return sum + playerSiteMinutes({ ...state, projects: [item] });
  }, 0);
}

export function absorbNote(season) {
  if (season === 'winter') return 'Winter is quiet. Easier to absorb the site work.';
  if (season === 'summer') return 'Summer growth will not wait. Harder to absorb the site work.';
  return 'The course still needs a full day around the works.';
}

export function taskTimeMultiplier(state, task) {
  if (!task || task.id === 'gmMeeting' || task.id === 'pickBalls') return 1;
  let mult = 1;
  if (task.surface === 'bunkers' && state.hasExtraBunkers) mult *= EXTRA_BUNKER_TIME_MULT;
  if (task.surface === 'tees' && state.hasNewTees) mult *= NEW_TEES_TIME_MULT;
  return mult;
}

export function alreadyBuilt(state, id) {
  if (isExpandProject(id)) return holeCount(state) >= EXPANDED_HOLE_COUNT;
  if (id === PROJECT_DRIVING_RANGE) return Boolean(state.hasDrivingRange);
  if (id === PROJECT_EXTRA_BUNKERS) return Boolean(state.hasExtraBunkers);
  if (id === PROJECT_NEW_TEES) return Boolean(state.hasNewTees);
  if (id === PROJECT_POND_EXPANSION) return Boolean(state.hasPondExpansion);
  return false;
}

export function projectKey(project) {
  if (project?.id === PROJECT_GRASS_CONVERSION) {
    return `${project.id}:${project.surface}:${project.speciesId}`;
  }
  return project?.id ?? '';
}

export function projectName(project) {
  if (project?.id === PROJECT_GRASS_CONVERSION) {
    const species = grassById(project.speciesId);
    const surface = SURFACE_LABELS[project.surface] ?? project.surface;
    return `Convert ${surface} to ${species?.name ?? project.speciesId}`;
  }
  return projectSpec(project?.id)?.name ?? project?.id ?? '';
}

export function grassConversionSpec(surface, speciesId) {
  const species = grassById(speciesId);
  if (!species || !GRASS_CONVERSION_COST[surface]) return null;
  return {
    id: PROJECT_GRASS_CONVERSION,
    surface,
    speciesId,
    name: projectName({ id: PROJECT_GRASS_CONVERSION, surface, speciesId }),
    cost: GRASS_CONVERSION_COST[surface],
    days: GRASS_CONVERSION_DAYS[surface],
  };
}

export function hasGrassConversion(state, surface) {
  return (state.projects ?? []).some(
    (item) => item.id === PROJECT_GRASS_CONVERSION && item.surface === surface,
  );
}

export function canStartGrassConversion(state, surface, speciesId) {
  const spec = grassConversionSpec(surface, speciesId);
  if (!spec) return { ok: false, reason: 'Unknown conversion.' };
  if (!speciesAllowedOn(speciesId, surface)) {
    return { ok: false, reason: 'That species does not belong on this surface.' };
  }
  if (grassIdFor(state, surface) === speciesId) {
    return { ok: false, reason: 'Already planted.' };
  }
  if (hasGrassConversion(state, surface)) {
    return { ok: false, reason: 'Already underway or finished.' };
  }
  const projectCash = needsCapital(state, spec.cost);
  if (!projectCash.ok) return projectCash;
  return { ok: true };
}

export function grassConversionOptions(state, surface) {
  return conversionTargets(surface).filter((species) => species.id !== grassIdFor(state, surface));
}

export function canStartProject(state, id, workerId = PLAYER_ID) {
  const spec = projectSpec(id);
  if (!spec) return { ok: false, reason: 'Unknown project.' };
  if (alreadyBuilt(state, id) || hasProject(state, id)) {
    return { ok: false, reason: 'Already underway or finished.' };
  }
  if (spec.minSatisfaction != null && (state.satisfaction ?? 0) < spec.minSatisfaction) {
    return { ok: false, hidden: true, reason: `Offered above satisfaction ${spec.minSatisfaction}.` };
  }
  if (isExpandProject(id)) {
    if ((state.projects ?? []).some((item) => isExpandProject(item.id))) {
      return { ok: false, reason: 'An expansion is already underway.' };
    }
    if (holeCount(state) + (spec.holes ?? 0) > EXPANDED_HOLE_COUNT) {
      return { ok: false, reason: `The course tops out at ${EXPANDED_HOLE_COUNT} holes.` };
    }
  }
  if (spec.occupiesPerson) {
    const worker = (state.workers ?? []).find((item) => item.id === workerId);
    if (!worker || worker.isVolunteer || worker.isCasual) {
      return { ok: false, reason: 'Assign one person full time.' };
    }
    if (projectWorkerIds(state).has(workerId)) {
      return { ok: false, reason: 'That person is already on a project.' };
    }
  }
  const projectCash = needsCapital(state, spec.cost);
  if (!projectCash.ok) return projectCash;
  return { ok: true };
}

function applySiteMinutes(state, extra) {
  if (extra <= 0) return state.workers;
  return state.workers.map((worker) => {
    if (worker.id !== PLAYER_ID) return worker;
    return {
      ...worker,
      minutesToday: Math.max(worker.minutesUsed, worker.minutesToday - extra),
    };
  });
}

export function startProject(state, id, workerId = PLAYER_ID) {
  const check = canStartProject(state, id, workerId);
  if (!check.ok) return state;
  const spec = projectSpec(id);
  const extra = spec.occupiesPerson
    ? 0
    : Math.round((PROJECT_DAILY_MINUTES[id] ?? 0) * (SEASON_GROWTH[state.season] ?? 1));
  return bumpCapitalSpent(
    {
      ...spendCapital(state, spec.cost),
      workers: applySiteMinutes(state, extra),
      projects: [
        ...(state.projects ?? []),
        {
          id,
          dueDay: state.day + spec.days,
          remainingDays: spec.days,
          paused: false,
          workerId: spec.occupiesPerson ? workerId : null,
          startedSeason: state.season,
        },
      ],
    },
    spec.cost,
  );
}

export function startGrassConversion(state, surface, speciesId) {
  const check = canStartGrassConversion(state, surface, speciesId);
  if (!check.ok) return state;
  const spec = grassConversionSpec(surface, speciesId);
  const extra = Math.round(
    (PROJECT_DAILY_MINUTES[PROJECT_GRASS_CONVERSION] ?? 0) * (SEASON_GROWTH[state.season] ?? 1),
  );
  return bumpCapitalSpent(
    {
      ...spendCapital(state, spec.cost),
      workers: applySiteMinutes(state, extra),
      projects: [
        ...(state.projects ?? []),
        {
          id: PROJECT_GRASS_CONVERSION,
          surface,
          speciesId,
          dueDay: state.day + spec.days,
          startedSeason: state.season,
        },
      ],
    },
    spec.cost,
  );
}

export function canBuyAutoPicker(state) {
  if (!state.hasDrivingRange) return { ok: false, reason: 'Build the range first.' };
  if (state.hasAutoPicker) return { ok: false, reason: 'Already picking.' };
  const pickerCash = needsCapital(state, AUTO_PICKER_COST);
  if (!pickerCash.ok) return pickerCash;
  return { ok: true };
}

export function buyAutoPicker(state) {
  const check = canBuyAutoPicker(state);
  if (!check.ok) return state;
  return bumpCapitalSpent(spendCapital({ ...state, hasAutoPicker: true }, AUTO_PICKER_COST), AUTO_PICKER_COST);
}

function completeGrassConversion(state, project) {
  const surface = project.surface;
  const speciesId = project.speciesId;
  if (!speciesAllowedOn(speciesId, surface)) return state;
  const grass = { ...(state.grass ?? {}), [surface]: speciesId };
  const probe = { ...state, grass };
  const current = state.surfaceDefaults?.[surface] ?? {};
  const hoc = clampHoc(surface, current.hoc, probe);
  return {
    ...state,
    grass,
    surfaceDefaults: {
      ...state.surfaceDefaults,
      [surface]: { ...current, hoc },
    },
    holes: mapHoleSurfaces(state.holes, surface, (record) => {
      const override = record.override
        ? { ...record.override, hoc: clampHoc(surface, record.override.hoc ?? hoc, probe) }
        : record.override;
      return {
        ...record,
        override,
        quality: Math.max(QUALITY_MIN, record.quality - GRASS_CONVERSION_QUALITY_HIT),
      };
    }),
  };
}

function padMoisture(state, n) {
  const greens = Array.isArray(state.moisture?.greens) ? [...state.moisture.greens] : [];
  while (greens.length < n) greens.push(emptyMoisture(1).greens[0]);
  const read = Array.isArray(state.moistureReadDay?.greens) ? [...state.moistureReadDay.greens] : [];
  const hidden = emptyMoistureReadDay(1).greens[0];
  while (read.length < n) read.push(hidden);
  return {
    moisture: { ...(state.moisture ?? emptyMoisture(n)), greens },
    moistureReadDay: { ...(state.moistureReadDay ?? emptyMoistureReadDay(n)), greens: read },
  };
}

function applyGrowIn(state) {
  const until = { ...(state.growInUntil ?? {}) };
  for (const area of GROW_IN_AREAS) {
    until[area] = state.day + GROW_IN_DAYS;
  }
  return { ...state, growInUntil: until };
}

function completeExpansion(state, holesToAdd) {
  const holes = expandHoleRecords(state, holesToAdd ?? HOLE_COUNT);
  const n = holes.length;
  return applyGrowIn({
    ...state,
    holes,
    ...padMoisture(state, n),
  });
}

function completeProject(state, project) {
  const id = typeof project === 'string' ? project : project?.id;
  const spec = projectSpec(id);
  if (id === PROJECT_EXPAND_3 || id === PROJECT_EXPAND_9) {
    return completeExpansion(state, spec?.holes);
  }
  if (id === PROJECT_EXPAND_18) return completeExpansion(state, HOLE_COUNT);
  if (id === PROJECT_DRIVING_RANGE) return { ...state, hasDrivingRange: true };
  if (id === PROJECT_EXTRA_BUNKERS) return { ...state, hasExtraBunkers: true };
  if (id === PROJECT_NEW_TEES) return { ...state, hasNewTees: true };
  if (id === PROJECT_POND_EXPANSION) return { ...state, hasPondExpansion: true };
  if (id === PROJECT_GRASS_CONVERSION) return completeGrassConversion(state, project);
  return state;
}

export function pauseProject(state, projectId) {
  return {
    ...state,
    projects: (state.projects ?? []).map((item) =>
      item.id === projectId || projectKey(item) === projectId ? { ...item, paused: true } : item,
    ),
  };
}

export function resumeProject(state, projectId) {
  return {
    ...state,
    projects: (state.projects ?? []).map((item) =>
      item.id === projectId || projectKey(item) === projectId ? { ...item, paused: false } : item,
    ),
  };
}

export function tickProjects(state) {
  const still = [];
  const completed = [];
  let next = state;
  for (const project of state.projects ?? []) {
    if (project.paused) {
      still.push(project);
      continue;
    }
    const remaining = project.remainingDays ?? Math.max(0, (project.dueDay ?? next.day) - next.day + 1);
    if (remaining <= 1) {
      next = completeProject(next, project);
      completed.push(projectName(project));
    } else {
      still.push({
        ...project,
        remainingDays: remaining - 1,
        dueDay: next.day + remaining - 1,
      });
    }
  }
  return { state: { ...next, projects: still }, completed };
}
