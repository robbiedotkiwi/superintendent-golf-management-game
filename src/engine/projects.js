import {
  AUTO_PICKER_COST,
  DRIVING_RANGE_COST,
  DRIVING_RANGE_DAYS,
  EXPAND_18_COST,
  EXPAND_18_DAYS,
  EXPAND_18_SATISFACTION_MIN,
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
  TASK_TIME_MULT_18,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { bumpCapitalSpent } from './history.js';
import { conversionTargets, grassById, grassIdFor, speciesAllowedOn } from './grass.js';
import { expandHoleRecords, holeCount, mapHoleSurfaces } from './holes.js';
import { clampHoc } from './mowing.js';
import { needsCash, spendCash } from './cash.js';

export const PROJECTS = {
  [PROJECT_EXPAND_18]: {
    id: PROJECT_EXPAND_18,
    name: 'Expand to 18 holes',
    cost: EXPAND_18_COST,
    days: EXPAND_18_DAYS,
    minSatisfaction: EXPAND_18_SATISFACTION_MIN,
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

export function hasProject(state, id) {
  return (state.projects ?? []).some((item) => item.id === id);
}

export function constructionMinutes(state) {
  const growth = SEASON_GROWTH[state.season] ?? 1;
  return (state.projects ?? []).reduce((sum, item) => {
    const base = PROJECT_DAILY_MINUTES[item.id] ?? 0;
    return sum + Math.round(base * growth);
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
  if (id === PROJECT_EXPAND_18) return holeCount(state) >= EXPANDED_HOLE_COUNT;
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
  const projectCash = needsCash(state, spec.cost);
  if (!projectCash.ok) return projectCash;
  return { ok: true };
}

export function grassConversionOptions(state, surface) {
  return conversionTargets(surface).filter((species) => species.id !== grassIdFor(state, surface));
}

export function canStartProject(state, id) {
  const spec = projectSpec(id);
  if (!spec) return { ok: false, reason: 'Unknown project.' };
  if (alreadyBuilt(state, id) || hasProject(state, id)) {
    return { ok: false, reason: 'Already underway or finished.' };
  }
  if (spec.minSatisfaction != null && (state.satisfaction ?? 0) < spec.minSatisfaction) {
    return { ok: false, hidden: true, reason: `Offered above satisfaction ${spec.minSatisfaction}.` };
  }
  const projectCash = needsCash(state, spec.cost);
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

export function startProject(state, id) {
  const check = canStartProject(state, id);
  if (!check.ok) return state;
  const spec = projectSpec(id);
  const extra = Math.round((PROJECT_DAILY_MINUTES[id] ?? 0) * (SEASON_GROWTH[state.season] ?? 1));
  return bumpCapitalSpent(
    {
      ...spendCash(state, spec.cost),
      workers: applySiteMinutes(state, extra),
      projects: [
        ...(state.projects ?? []),
        { id, dueDay: state.day + spec.days, startedSeason: state.season },
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
      ...spendCash(state, spec.cost),
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
  const pickerCash = needsCash(state, AUTO_PICKER_COST);
  if (!pickerCash.ok) return pickerCash;
  return { ok: true };
}

export function buyAutoPicker(state) {
  const check = canBuyAutoPicker(state);
  if (!check.ok) return state;
  return bumpCapitalSpent(spendCash({ ...state, hasAutoPicker: true }, AUTO_PICKER_COST), AUTO_PICKER_COST);
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

function completeProject(state, project) {
  const id = typeof project === 'string' ? project : project?.id;
  if (id === PROJECT_EXPAND_18) return { ...state, holes: expandHoleRecords(state) };
  if (id === PROJECT_DRIVING_RANGE) return { ...state, hasDrivingRange: true };
  if (id === PROJECT_EXTRA_BUNKERS) return { ...state, hasExtraBunkers: true };
  if (id === PROJECT_NEW_TEES) return { ...state, hasNewTees: true };
  if (id === PROJECT_POND_EXPANSION) return { ...state, hasPondExpansion: true };
  if (id === PROJECT_GRASS_CONVERSION) return completeGrassConversion(state, project);
  return state;
}

export function tickProjects(state) {
  const still = [];
  const completed = [];
  let next = state;
  for (const project of state.projects ?? []) {
    if (next.day >= project.dueDay) {
      next = completeProject(next, project);
      completed.push(projectName(project));
    } else {
      still.push(project);
    }
  }
  return { state: { ...next, projects: still }, completed };
}
