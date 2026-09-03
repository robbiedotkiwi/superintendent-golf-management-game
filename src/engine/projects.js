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
  SEASON_GROWTH,
  TASK_TIME_MULT_18,
} from '../data/constants.js';
import { bumpCapitalSpent } from './history.js';

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
  let mult = (state.holes ?? HOLE_COUNT) >= EXPANDED_HOLE_COUNT ? TASK_TIME_MULT_18 : 1;
  if (task.surface === 'bunkers' && state.hasExtraBunkers) mult *= EXTRA_BUNKER_TIME_MULT;
  if (task.surface === 'tees' && state.hasNewTees) mult *= NEW_TEES_TIME_MULT;
  return mult;
}

export function alreadyBuilt(state, id) {
  if (id === PROJECT_EXPAND_18) return (state.holes ?? HOLE_COUNT) >= EXPANDED_HOLE_COUNT;
  if (id === PROJECT_DRIVING_RANGE) return Boolean(state.hasDrivingRange);
  if (id === PROJECT_EXTRA_BUNKERS) return Boolean(state.hasExtraBunkers);
  if (id === PROJECT_NEW_TEES) return Boolean(state.hasNewTees);
  return false;
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
  if ((state.capitalBudget ?? 0) < spec.cost) {
    return { ok: false, reason: `Needs ${spec.cost} capital, only ${Math.round(state.capitalBudget ?? 0)} posted.` };
  }
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
      ...state,
      capitalBudget: state.capitalBudget - spec.cost,
      workers: applySiteMinutes(state, extra),
      projects: [
        ...(state.projects ?? []),
        { id, dueDay: state.day + spec.days, startedSeason: state.season },
      ],
    },
    spec.cost,
  );
}

export function canBuyAutoPicker(state) {
  if (!state.hasDrivingRange) return { ok: false, reason: 'Build the range first.' };
  if (state.hasAutoPicker) return { ok: false, reason: 'Already picking.' };
  if ((state.capitalBudget ?? 0) < AUTO_PICKER_COST) {
    return { ok: false, reason: `Needs ${AUTO_PICKER_COST} capital.` };
  }
  return { ok: true };
}

export function buyAutoPicker(state) {
  const check = canBuyAutoPicker(state);
  if (!check.ok) return state;
  return bumpCapitalSpent(
    { ...state, capitalBudget: state.capitalBudget - AUTO_PICKER_COST, hasAutoPicker: true },
    AUTO_PICKER_COST,
  );
}

function completeProject(state, id) {
  if (id === PROJECT_EXPAND_18) return { ...state, holes: EXPANDED_HOLE_COUNT };
  if (id === PROJECT_DRIVING_RANGE) return { ...state, hasDrivingRange: true };
  if (id === PROJECT_EXTRA_BUNKERS) return { ...state, hasExtraBunkers: true };
  if (id === PROJECT_NEW_TEES) return { ...state, hasNewTees: true };
  return state;
}

export function tickProjects(state) {
  const still = [];
  const completed = [];
  let next = state;
  for (const project of state.projects ?? []) {
    if (next.day >= project.dueDay) {
      next = completeProject(next, project.id);
      completed.push(project.id);
    } else {
      still.push(project);
    }
  }
  return { state: { ...next, projects: still }, completed };
}
