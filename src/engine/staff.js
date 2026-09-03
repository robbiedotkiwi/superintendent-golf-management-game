import {
  DAYS_PER_WEEK,
  EARLY_START_FINE,
  EARLY_START_FINE_COUNT,
  EARLY_START_MINUTES,
  EARLY_START_WARNING_COUNT,
  MORALE_MAX,
  MORALE_NOSHOW_BELOW,
  MORALE_NOSHOW_CHANCE,
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
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_MINUTES,
} from '../data/constants.js';
import { minutesTodayForWeather } from './weather.js';
import { constructionMinutes } from './projects.js';

export function dayOfWeek(day) {
  return ((day - 1) % DAYS_PER_WEEK) + 1;
}

export function hasMechanic(state) {
  return state.workers.some((worker) => worker.isMechanic && !worker.isVolunteer);
}

export function prepareMorningWorkers(state, weather, rng) {
  const paidBase = minutesTodayForWeather(weather) + (state.earlyStart ? EARLY_START_MINUTES : 0);
  return state.workers.map((worker) => {
    let minutesToday = worker.isVolunteer ? VOLUNTEER_MINUTES : paidBase;
    if (worker.isVolunteer && dayOfWeek(state.day) !== (state.volunteerWeekday ?? VOLUNTEER_DEFAULT_WEEKDAY)) {
      minutesToday = 0;
    }
    if (worker.trainingUntilDay && state.day < worker.trainingUntilDay) {
      minutesToday = 0;
    }
    if (worker.trainingUntilDay && state.day >= worker.trainingUntilDay && worker.trainingAxis) {
      worker = applyTrainingReturn(worker);
    }
    if (minutesToday > 0 && worker.morale < MORALE_NOSHOW_BELOW && rng.next() < MORALE_NOSHOW_CHANCE) {
      minutesToday = 0;
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
    if (worker.isVolunteer) return { ...worker, daysWorkedRunning: 0 };
    const worked = worker.minutesUsed > 0;
    let morale = worker.morale;
    let daysWorkedRunning = worker.daysWorkedRunning;
    if (worked) {
      daysWorkedRunning += 1;
      if (worker.minutesUsed > MORALE_SAFE_MINUTES) morale -= MORALE_OVERWORK_DROP;
      if (daysWorkedRunning > MORALE_STREAK_LIMIT) morale -= MORALE_STREAK_DROP;
    } else {
      daysWorkedRunning = 0;
      morale += MORALE_RECOVER;
    }
    morale = Math.min(MORALE_MAX, Math.max(0, morale));
    return { ...worker, morale, daysWorkedRunning };
  });
}

export function wageBill(workers) {
  return workers.reduce((total, worker) => total + (worker.isVolunteer ? 0 : worker.wage), 0);
}

export function hireWorker(state, candidate) {
  const template = state.workers.find((worker) => worker.id === PLAYER_ID) ?? state.workers[0];
  const hire = {
    ...candidate,
    id: `hire-${state.nextHireId ?? 1}`,
    morale: 100,
    availableFromDay: state.day,
    minutesToday: template.minutesToday,
    minutesUsed: 0,
    daysWorkedRunning: 0,
    trainingUntilDay: null,
    trainingAxis: null,
  };
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

export function applyEarlyStartComplaints(state) {
  if (!state.earlyStart) return { state, warning: false, fine: 0 };
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
      maintenanceBudget: state.maintenanceBudget - fine,
    },
    warning,
    fine,
  };
}
