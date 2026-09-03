import { getTask } from '../data/tasks.js';
import { calendarFromDay } from './calendar.js';
import { pickWeather } from './weather.js';
import { createRng } from './rng.js';
import { buyFoley, buyMachine, grindInHouse, repairMachine, sendForGrind, pickMachine } from './equipment.js';
import { assignWorker, certifiedPresent, durationForTask, workerById, workerAllows, isWorkerPresent } from './assignment.js';
import {
  applyEarlyStartComplaints,
  hireWorker,
  setVolunteerWeekday,
  trainWorker,
} from './staff.js';
import { generateCandidates } from '../data/staff.js';
import { emptyDisease, emptyUntil } from './disease.js';
import { canBuyAerator, IRRIGATED_SURFACES, isIrrigationPolicy } from './irrigation.js';
import { capitalGrant, leaseMachine, maintenanceGrant, stopLease, takeLoan } from './budget.js';
import { emptyDaysSinceWorked, markMailRead, meetingDue } from './mail.js';
import {
  applySnapTournament,
  inPrepWindow,
  maxTournamentsForSeason,
  scheduleTournamentDays,
  seasonStartDay,
} from './tournament.js';
import { clampStanding } from './satisfaction.js';
import { resolveDay } from './simulation.js';
import {
  DAY_LENGTH_MINUTES,
  HOLE_COUNT,
  MOWING_WEATHER,
  PLAYER_ID,
  PLAYER_MORALE,
  PLAYER_NAME,
  PLAYER_QUALITY_SKILL,
  PLAYER_SPEED_SKILL,
  PLAYER_WAGE,
  STARTING_CASH,
  STARTING_DAY,
  STARTING_DAYS_WORKED_RUNNING,
  STARTING_MACHINE_ID,
  STARTING_MINUTES_USED,
  STARTING_QUALITY_BUNKERS,
  STARTING_QUALITY_FAIRWAYS,
  STARTING_QUALITY_GREENS,
  STARTING_QUALITY_ROUGH,
  STARTING_QUALITY_TEES,
  STARTING_RNG_SEED,
  STARTING_WEATHER,
  TASK_MINUTES,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_ID,
  VOLUNTEER_NAME,
  VOLUNTEER_QUALITY_SKILL,
  VOLUNTEER_SPEED_SKILL,
  WEATHER_STORM,
  WEATHER_WEIGHTS,
  POND_HEALTH_START,
  POND_START_VOLUME,
  STARTING_IRRIGATION,
  SATISFACTION_START,
  GM_STANDING_START,
  GM_TOURNAMENT_DECLINE_STANDING,
  AERATOR_COST,
} from '../data/constants.js';

export function createInitialState() {
  const calendar = calendarFromDay(STARTING_DAY);
  const rng = createRng(STARTING_RNG_SEED);
  const forecast = pickWeather(WEATHER_WEIGHTS[calendar.season], rng);
  return {
    day: STARTING_DAY,
    season: calendar.season,
    year: calendar.year,
    cash: STARTING_CASH,
    holes: HOLE_COUNT,
    weather: STARTING_WEATHER,
    forecast,
    rngSeed: rng.seed,
    workers: [
      {
        id: PLAYER_ID,
        name: PLAYER_NAME,
        speedSkill: PLAYER_SPEED_SKILL,
        qualitySkill: PLAYER_QUALITY_SKILL,
        morale: PLAYER_MORALE,
        wage: PLAYER_WAGE,
        sprayCertified: false,
        isMechanic: false,
        isVolunteer: false,
        allowedSurfaces: 'all',
        availableFromDay: STARTING_DAY,
        minutesToday: DAY_LENGTH_MINUTES,
        minutesUsed: STARTING_MINUTES_USED,
        daysWorkedRunning: STARTING_DAYS_WORKED_RUNNING,
      },
      {
        id: VOLUNTEER_ID,
        name: VOLUNTEER_NAME,
        speedSkill: VOLUNTEER_SPEED_SKILL,
        qualitySkill: VOLUNTEER_QUALITY_SKILL,
        morale: PLAYER_MORALE,
        wage: PLAYER_WAGE,
        sprayCertified: false,
        isMechanic: false,
        isVolunteer: true,
        allowedSurfaces: ['fairways', 'rough'],
        availableFromDay: STARTING_DAY,
        minutesToday: STARTING_MINUTES_USED,
        minutesUsed: STARTING_MINUTES_USED,
        daysWorkedRunning: STARTING_DAYS_WORKED_RUNNING,
      },
    ],
    surfaces: {
      greens: { quality: STARTING_QUALITY_GREENS },
      tees: { quality: STARTING_QUALITY_TEES },
      fairways: { quality: STARTING_QUALITY_FAIRWAYS },
      rough: { quality: STARTING_QUALITY_ROUGH },
      bunkers: { quality: STARTING_QUALITY_BUNKERS },
    },
    plannedTasks: [],
    log: [],
    ownedMachines: [STARTING_MACHINE_ID],
    machineWear: { [STARTING_MACHINE_ID]: 0 },
    machineBroken: {},
    machineAwayUntil: {},
    hasFoleyGrinder: false,
    autoWeek: { weekStart: STARTING_DAY, hits: [] },
    candidates: generateCandidates(rng),
    candidatesSeason: calendar.season,
    volunteerWeekday: VOLUNTEER_DEFAULT_WEEKDAY,
    volunteerDayChangedThisSeason: false,
    earlyStart: false,
    neighbourComplaintsThisSeason: 0,
    nextHireId: 1,
    pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
    irrigation: { ...STARTING_IRRIGATION },
    hasAerator: false,
    disease: emptyDisease(),
    sprayedUntil: emptyUntil(),
    fertiliserUntil: emptyUntil(),
    satisfaction: SATISFACTION_START,
    gmStanding: GM_STANDING_START,
    maintenanceBudget: maintenanceGrant(SATISFACTION_START, GM_STANDING_START),
    capitalBudget: capitalGrant(SATISFACTION_START, GM_STANDING_START),
    leasedMachines: [],
    loan: null,
    lastSeasonRevenue: 0,
    seasonRevenue: 0,
    insolventStreak: 0,
    dismissed: false,
    daysSinceWorked: emptyDaysSinceWorked(),
    snappedToday: false,
    pendingTournamentSetup: true,
    gmTournamentRequestPending: true,
    tournaments: [],
    tournamentPrepScore: 0,
    inbox: [
      {
        id: 1,
        read: false,
        day: STARTING_DAY,
        from: 'gm',
        kind: 'tournamentRequest',
        subject: 'Put a tournament on the calendar',
        body: 'The committee wants dates this season. Winter is optional and risky.',
      },
    ],
    nextMailId: 2,
  };
}

export const initialState = createInitialState();

export function workerMinutesRemaining(worker) {
  return worker.minutesToday - worker.minutesUsed;
}

export function combinedMinutesRemaining(state) {
  return state.workers.reduce((total, worker) => total + workerMinutesRemaining(worker), 0);
}

export function combinedMinutesCapacity(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesToday, 0);
}

export function combinedMinutesUsed(state) {
  return state.workers.reduce((total, worker) => total + worker.minutesUsed, 0);
}

export function canPlanTask(state, taskId, level, workerId) {
  const task = getTask(taskId);
  if (!task) return { ok: false, reason: 'Unknown job.' };

  if (task.id === 'clearDebris' && state.weather !== WEATHER_STORM) {
    return { ok: false, reason: 'No debris to clear.' };
  }

  const debrisPlanned = state.plannedTasks.some((planned) => planned.taskId === 'clearDebris');
  if (state.weather === WEATHER_STORM && task.id !== 'clearDebris' && !debrisPlanned) {
    return { ok: false, reason: `Clear debris first (${TASK_MINUTES.clearDebris} min).` };
  }

  if (task.id === 'gmMeeting' && !meetingDue(state.day)) {
    return { ok: false, reason: 'No GM meeting today.' };
  }

  if (task.kind === 'prep' && !inPrepWindow(state)) {
    return { ok: false, reason: 'Prep only in the three days before a tournament.' };
  }

  if (state.plannedTasks.some((planned) => planned.taskId === taskId)) {
    return { ok: false, reason: 'Already planned. Take it off the list first.' };
  }

  if (task.mowing && MOWING_WEATHER.includes(state.weather)) {
    return { ok: false, reason: 'Mowing is off today.' };
  }

  if (task.mowing && !pickMachine(state, task)) {
    return { ok: false, reason: 'No machine available. Check the shed.' };
  }

  if (task.requiresSpray && !certifiedPresent(state, task.surface)) {
    return { ok: false, reason: 'No spray-certified worker available.' };
  }

  if (task.materialsCost) {
    const already = state.plannedTasks.reduce((sum, item) => {
      const planned = getTask(item.taskId);
      return sum + (planned?.materialsCost ?? 0);
    }, 0);
    if (already + task.materialsCost > (state.maintenanceBudget ?? 0)) {
      return { ok: false, reason: `Needs ${task.materialsCost} from the maintenance budget.` };
    }
  }

  const worker = workerId ? workerById(state, workerId) : assignWorker(state, task, level);
  if (task.requiresSpray && worker && !worker.sprayCertified) {
    return { ok: false, reason: 'No spray-certified worker available.' };
  }
  if (!worker) {
    const fallback = state.workers.find(
      (item) =>
        isWorkerPresent(item) &&
        workerAllows(item, task.surface) &&
        (!task.requiresSpray || item.sprayCertified),
    );
    if (!fallback) {
      return { ok: false, reason: 'No one available for that job.' };
    }
    const minutes = durationForTask(state, taskId, level, fallback);
    const remaining = fallback.minutesToday - fallback.minutesUsed;
    return { ok: false, reason: `Needs ${minutes} min, only ${remaining} left.` };
  }
  const minutes = durationForTask(state, taskId, level, worker);
  const remaining = worker.minutesToday - worker.minutesUsed;
  if (minutes > remaining) {
    return { ok: false, reason: `Needs ${minutes} min on ${worker.name}, only ${remaining} left.` };
  }
  return { ok: true, minutes, workerId: worker.id };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'LOAD_GAME':
      return action.state;
    case 'PLAN_TASK': {
      const task = getTask(action.taskId);
      const check = canPlanTask(state, action.taskId, action.level, action.workerId);
      if (!task || !check.ok) return state;
      return {
        ...state,
        plannedTasks: [
          ...state.plannedTasks,
          {
            taskId: action.taskId,
            surface: task.surface,
            level: action.level,
            workerId: check.workerId,
            minutes: check.minutes,
          },
        ],
        workers: state.workers.map((item) =>
          item.id === check.workerId ? { ...item, minutesUsed: item.minutesUsed + check.minutes } : item,
        ),
      };
    }
    case 'REMOVE_TASK': {
      const planned = state.plannedTasks.find((item) => item.taskId === action.taskId);
      if (!planned) return state;
      return {
        ...state,
        plannedTasks: state.plannedTasks.filter((item) => item.taskId !== action.taskId),
        workers: state.workers.map((item) =>
          item.id === planned.workerId
            ? { ...item, minutesUsed: item.minutesUsed - planned.minutes }
            : item,
        ),
      };
    }
    case 'END_DAY': {
      if (state.dismissed) return state;
      const { state: next, summary } = resolveDay(state);
      return { ...next, log: [...next.log, summary] };
    }
    case 'SET_TOURNAMENTS': {
      if (!state.pendingTournamentSetup || state.dismissed) return state;
      const max = maxTournamentsForSeason(state.season);
      const count = Math.min(Math.max(Number(action.count) || 0, 0), max);
      const days = scheduleTournamentDays(seasonStartDay(state.day), count, state.season);
      const declined = count === 0 && state.gmTournamentRequestPending;
      return {
        ...state,
        pendingTournamentSetup: false,
        gmTournamentRequestPending: false,
        gmStanding: declined
          ? clampStanding(state.gmStanding - GM_TOURNAMENT_DECLINE_STANDING)
          : state.gmStanding,
        tournaments: days.map((day) => ({
          day,
          done: false,
          season: state.season,
          risky: state.season === 'winter',
        })),
        inbox: (state.inbox ?? []).map((item) =>
          item.kind === 'tournamentRequest' ? { ...item, read: true } : item,
        ),
      };
    }
    case 'DECLINE_TOURNAMENT_REQUEST': {
      if (!state.gmTournamentRequestPending) return state;
      return {
        ...state,
        gmTournamentRequestPending: false,
        gmStanding: clampStanding(state.gmStanding - GM_TOURNAMENT_DECLINE_STANDING),
        inbox: (state.inbox ?? []).map((item) =>
          item.kind === 'tournamentRequest' ? { ...item, read: true } : item,
        ),
      };
    }
    case 'BUY_MACHINE':
      return buyMachine(state, action.machineId);
    case 'BUY_FOLEY':
      return buyFoley(state);
    case 'SEND_GRIND':
      return sendForGrind(state, action.machineId);
    case 'GRIND_IN_HOUSE':
      return grindInHouse(state, action.machineId);
    case 'REPAIR_MACHINE':
      return repairMachine(state, action.machineId);
    case 'MOVE_TASK': {
      const list = [...state.plannedTasks];
      const index = list.findIndex((item) => item.taskId === action.taskId);
      const nextIndex = index + action.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return state;
      const swap = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = swap;
      return { ...state, plannedTasks: list };
    }
    case 'HIRE_WORKER': {
      const candidate = state.candidates.find((item) => item.id === action.candidateId);
      if (!candidate) return state;
      return hireWorker(state, candidate);
    }
    case 'TRAIN_WORKER':
      return trainWorker(state, action.workerId, action.axis);
    case 'SET_VOLUNTEER_WEEKDAY':
      return setVolunteerWeekday(state, action.weekday);
    case 'SET_EARLY_START':
      return { ...state, earlyStart: Boolean(action.value) };
    case 'SET_TASK_WORKER': {
      const planned = state.plannedTasks.find((item) => item.taskId === action.taskId);
      const worker = workerById(state, action.workerId);
      const task = planned ? getTask(planned.taskId) : null;
      if (!planned || !worker || !task) return state;
      if (!workerAllows(worker, task.surface) || !isWorkerPresent(worker)) return state;
      if (task.requiresSpray && !worker.sprayCertified) return state;
      const minutes = durationForTask(state, planned.taskId, planned.level, worker);
      if (worker.minutesToday - worker.minutesUsed + (planned.workerId === worker.id ? planned.minutes : 0) < minutes) {
        return state;
      }
      let next = {
        ...state,
        workers: state.workers.map((item) => {
          if (item.id === planned.workerId) return { ...item, minutesUsed: item.minutesUsed - planned.minutes };
          return item;
        }),
      };
      next = {
        ...next,
        plannedTasks: next.plannedTasks.map((item) =>
          item.taskId === action.taskId ? { ...item, workerId: worker.id, minutes } : item,
        ),
        workers: next.workers.map((item) =>
          item.id === worker.id ? { ...item, minutesUsed: item.minutesUsed + minutes } : item,
        ),
      };
      return next;
    }
    case 'SET_IRRIGATION': {
      if (!IRRIGATED_SURFACES.includes(action.surface) || !isIrrigationPolicy(action.policy)) return state;
      return {
        ...state,
        irrigation: { ...state.irrigation, [action.surface]: action.policy },
      };
    }
    case 'BUY_AERATOR': {
      const check = canBuyAerator(state);
      if (!check.ok) return state;
      return { ...state, capitalBudget: state.capitalBudget - AERATOR_COST, hasAerator: true };
    }
    case 'LEASE_MACHINE':
      return leaseMachine(state, action.machineId);
    case 'STOP_LEASE':
      return stopLease(state, action.machineId);
    case 'TAKE_LOAN':
      return takeLoan(state, action.amount);
    case 'SNAP_TOURNAMENT':
      return applySnapTournament(state);
    case 'READ_MAIL':
      return markMailRead(state, action.id);
    default:
      return state;
  }
}
