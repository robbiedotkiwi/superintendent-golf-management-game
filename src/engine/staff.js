import {
  DAYS_PER_WEEK,
  EARLY_START_FINE,
  EARLY_START_FINE_COUNT,
  EARLY_START_MINUTES,
  EARLY_START_WARNING_COUNT,
  FIRING_MORALE_HIT,
  FIRING_SEVERANCE_DAYS,
  MORALE_MAX,
  MORALE_OVERWORK_DROP,
  MORALE_RECOVER,
  MORALE_SAFE_MINUTES,
  MORALE_STREAK_DROP,
  MORALE_STREAK_LIMIT,
  PLAYER_ID,
  SKILL_MAX,
  TRAINING_COST,
  TRAINING_DAYS,
  TRAINING_SKILL_GAIN,
  VOLUNTEER_DAY,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_LEGACY_WEEKDAY,
  VOLUNTEER_MINUTES,
  VOLUNTEER_QUALITY_SKILL,
  VOLUNTEER_SPEED_SKILL,
} from '../data/constants.js';
import { VOLUNTEER_SURFACES } from '../data/config.js';
import { cashOnHand } from './cash.js';
import { migrateWorkerTier } from './staffTiers.js';
import { applyWorkedDayMorale, rollSickDay, tickLowMoraleStreak, volunteerMinutesForDay } from './staffMorale.js';
import { minutesTodayForWeather } from './weather.js';
import { constructionMinutes } from './projects.js';

export function dayOfWeek(day) {
  return ((day - 1) % DAYS_PER_WEEK) + 1;
}

export function migrateVolunteerWeekday(value) {
  if (value == null || Number(value) === VOLUNTEER_LEGACY_WEEKDAY) return VOLUNTEER_DAY;
  const weekday = Number(value);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > DAYS_PER_WEEK) return VOLUNTEER_DAY;
  return weekday;
}

export function migrateVolunteerWorker(worker) {
  if (!worker?.isVolunteer) return worker;
  return {
    ...worker,
    speedSkill: VOLUNTEER_SPEED_SKILL,
    qualitySkill: VOLUNTEER_QUALITY_SKILL,
    allowedSurfaces: VOLUNTEER_SURFACES,
  };
}

export function hasMechanic(state) {
  return state.workers.some((worker) => worker.isMechanic && !worker.isVolunteer);
}

export function prepareMorningWorkers(state, weather, rng) {
  const paidBase = minutesTodayForWeather(weather) + (state.earlyStart ? EARLY_START_MINUTES : 0);
  return state.workers.map((worker) => {
    let minutesToday = worker.isVolunteer ? volunteerMinutesForDay(state, state.day) : paidBase;
    if (worker.isVolunteer && minutesToday === 0) {
      minutesToday = 0;
    }
    if (worker.trainingUntilDay && state.day < worker.trainingUntilDay) {
      minutesToday = 0;
    }
    if (worker.trainingUntilDay && state.day >= worker.trainingUntilDay && worker.trainingAxis) {
      worker = applyTrainingReturn(worker);
    }
    if (worker.leaveUntilDay && state.day < worker.leaveUntilDay) {
      minutesToday = 0;
    }
    if (worker.resigned) {
      minutesToday = 0;
    }
    if (worker.sickUntilDay && state.day < worker.sickUntilDay) {
      minutesToday = 0;
    }
    if (minutesToday > 0 && worker.id !== PLAYER_ID && !worker.isVolunteer) {
      worker = rollSickDay({ ...worker, minutesToday }, rng, state.day);
      if (worker.sickUntilDay && state.day < worker.sickUntilDay) minutesToday = 0;
    }
    if (worker.id === PLAYER_ID) {
      minutesToday = Math.max(0, minutesToday - constructionMinutes(state));
    }
    return { ...worker, minutesToday, minutesUsed: 0 };
  });
}

function applyTrainingReturn(worker) {
  const next = { ...worker, trainingUntilDay: null, trainingAxis: null };
  if (worker.trainingAxis === 'spray') {
    next.sprayCertified = true;
  } else if (worker.trainingAxis === 'speedSkill' || worker.trainingAxis === 'qualitySkill') {
    next[worker.trainingAxis] = Math.min(SKILL_MAX, worker[worker.trainingAxis] + TRAINING_SKILL_GAIN);
  }
  return next;
}

export function applyMorale(workers) {
  return workers.map((worker) => {
    if (worker.isVolunteer) return { ...worker, daysWorkedRunning: 0, daysWorkedThisWeek: 0 };
    const worked = worker.minutesUsed > 0;
    let morale = worker.morale;
    let daysWorkedRunning = worker.daysWorkedRunning;
    let daysWorkedThisWeek = worker.daysWorkedThisWeek ?? 0;
    if (worked) {
      daysWorkedRunning += 1;
      daysWorkedThisWeek += 1;
      if (worker.minutesUsed > MORALE_SAFE_MINUTES) morale -= MORALE_OVERWORK_DROP;
      if (daysWorkedRunning > MORALE_STREAK_LIMIT) morale -= MORALE_STREAK_DROP;
      ({ morale } = applyWorkedDayMorale({ ...worker, morale }, daysWorkedThisWeek));
    } else {
      daysWorkedRunning = 0;
      morale += MORALE_RECOVER;
    }
    morale = Math.min(MORALE_MAX, Math.max(0, morale));
    return tickLowMoraleStreak({ ...worker, morale, daysWorkedRunning, daysWorkedThisWeek });
  });
}

export function wageBill(workers) {
  return workers.reduce((total, worker) => total + (worker.isVolunteer ? 0 : worker.wage), 0);
}

export function hireWorker(state, candidate) {
  const template = state.workers.find((worker) => worker.id === PLAYER_ID) ?? state.workers[0];
  const hire = migrateWorkerTier({
    ...candidate,
    id: `hire-${state.nextHireId ?? 1}`,
    morale: 100,
    availableFromDay: state.day,
    minutesToday: template.minutesToday,
    minutesUsed: 0,
    daysWorkedRunning: 0,
    daysWorkedThisWeek: 0,
    trainingUntilDay: null,
    trainingAxis: null,
    resigned: false,
    lowMoraleStreak: 0,
  });
  return {
    ...state,
    nextHireId: (state.nextHireId ?? 1) + 1,
    workers: [...state.workers, hire],
    candidates: state.candidates.filter((item) => item.id !== candidate.id),
  };
}

export function trainWorker(state, workerId, axis) {
  if (state.cash < TRAINING_COST) return state;
  const worker = state.workers.find((item) => item.id === workerId);
  if (!worker || worker.isVolunteer) return state;
  if (worker.trainingUntilDay && state.day < worker.trainingUntilDay) return state;
  if (axis === 'spray' && worker.sprayCertified) return state;
  return {
    ...state,
    cash: state.cash - TRAINING_COST,
    workers: state.workers.map((item) =>
      item.id === workerId
        ? {
            ...item,
            trainingUntilDay: state.day + TRAINING_DAYS,
            trainingAxis: axis,
            minutesToday: 0,
            minutesUsed: 0,
          }
        : item,
    ),
  };
}

export function setVolunteerWeekday(state, weekday) {
  if (state.volunteerDayChangedThisSeason) return state;
  return { ...state, volunteerWeekday: weekday, volunteerDayChangedThisSeason: true };
}

export function severanceCost(worker) {
  return (worker?.wage ?? 0) * FIRING_SEVERANCE_DAYS;
}

function flagWorkerJobs(plannedTasks, workerId) {
  return (plannedTasks ?? []).map((item) =>
    item.workerId === workerId ? { ...item, workerId: null, needsReassignment: true } : item,
  );
}

export function canFireWorker(state, workerId) {
  if (workerId === PLAYER_ID) return { ok: false, reason: 'You cannot fire yourself.' };
  const worker = (state.workers ?? []).find((item) => item.id === workerId);
  if (!worker) return { ok: false, reason: 'Not on the books.' };
  if (worker.isVolunteer) return { ok: false, reason: 'The volunteer cannot be fired.' };
  return { ok: true, worker, severance: severanceCost(worker) };
}

function flagWeekPlanJobs(state, workerId) {
  const plan = state.weekPlan;
  if (!plan?.days) return state;
  const days = { ...plan.days };
  for (const [day, entry] of Object.entries(days)) {
    days[day] = { ...entry, tasks: flagWorkerJobs(entry.tasks, workerId) };
  }
  return { ...state, weekPlan: { ...plan, days } };
}

export function departResignedWorkers(state) {
  const gone = (state.workers ?? []).filter((worker) => worker.resigned && worker.id !== PLAYER_ID);
  if (!gone.length) return { ...state, resignedToday: [] };
  let next = { ...state, resignedToday: gone.map((worker) => ({ id: worker.id, name: worker.name })) };
  for (const worker of gone) {
    next = {
      ...next,
      workers: next.workers.filter((item) => item.id !== worker.id),
      plannedTasks: flagWorkerJobs(next.plannedTasks, worker.id),
      firingHistory: [
        ...(next.firingHistory ?? []),
        { day: next.day, workerId: worker.id, name: worker.name, kind: 'resigned', severance: 0 },
      ],
    };
    next = flagWeekPlanJobs(next, worker.id);
  }
  return next;
}

export function fireWorker(state, workerId) {
  const check = canFireWorker(state, workerId);
  if (!check.ok) return state;
  const worker = check.worker;
  const severance = check.severance;
  return {
    ...state,
    cash: cashOnHand(state) - severance,
    workers: state.workers
      .filter((item) => item.id !== workerId)
      .map((item) => ({
        ...item,
        morale: Math.min(MORALE_MAX, Math.max(0, (item.morale ?? MORALE_MAX) - FIRING_MORALE_HIT)),
      })),
    plannedTasks: flagWorkerJobs(state.plannedTasks, workerId),
    firingHistory: [
      ...(state.firingHistory ?? []),
      { day: state.day, workerId, name: worker.name, kind: 'fired', severance },
    ],
  };
}

export function dismissVolunteer(state) {
  const volunteer = (state.workers ?? []).find((item) => item.isVolunteer);
  if (!volunteer || state.volunteerDismissed) return state;
  return {
    ...state,
    workers: state.workers.filter((item) => !item.isVolunteer),
    plannedTasks: flagWorkerJobs(state.plannedTasks, volunteer.id),
    volunteerDismissed: true,
    firingHistory: [
      ...(state.firingHistory ?? []),
      { day: state.day, workerId: volunteer.id, name: volunteer.name, kind: 'volunteerGone', severance: 0 },
    ],
  };
}

export function applyEarlyStartComplaints(state) {
  if (!state.earlyStart) return { state, warning: false, fine: 0 };
  const silent = Object.values(state.machineUpgrades ?? {}).some((list) => (list ?? []).includes('ledLightKit'));
  if (silent) return { state, warning: false, fine: 0 };
  const complaints = (state.neighbourComplaintsThisSeason ?? 0) + 1;
  let fine = 0;
  let warning = false;
  if (complaints === EARLY_START_WARNING_COUNT) warning = true;
  if (complaints === EARLY_START_FINE_COUNT) {
    fine = EARLY_START_FINE;
  }
  return {
    state: {
      ...state,
      neighbourComplaintsThisSeason: complaints,
      cash: (state.cash ?? 0) - fine,
    },
    warning,
    fine,
  };
}
