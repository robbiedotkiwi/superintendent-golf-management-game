import { getTask } from '../data/tasks.js';
import { calendarFromDay } from './calendar.js';
import { buildForecast } from './weather.js';
import { createRng } from './rng.js';
import { buyFoley, buyMachine, grindInHouse, repairMachine, sendForGrind, machinePlanCheck, durationOnMachine, recomputePlannedMinutes, allowingMachines, pickMachineForTask, MACHINE_BOOKED_REASON, NO_MACHINE_REASON, getMachine, normalizeMachineOverride } from './equipment.js';
import { machineAllows } from '../data/equipment.js';
import { assignWorker, certifiedPresent, workerById, workerAllows, isWorkerPresent } from './assignment.js';
import {
  applyEarlyStartComplaints,
  hireWorker,
  setVolunteerWeekday,
  trainWorker,
} from './staff.js';
import { generateCandidates } from '../data/staff.js';
import { emptyDisease, emptyUntil } from './disease.js';
import {
  allGreenIds,
  canBuyGreensSensors,
  canBuyTurfRad,
  emptyMoisture,
  emptyMoistureReadDay,
} from './moisture.js';
import { canBuyAerator, IRRIGATED_SURFACES, isIrrigationPolicy } from './irrigation.js';
import { capitalGrant, leaseMachine, maintenanceGrant, stopLease, takeLoan } from './budget.js';
import { emptyDaysSinceWorked, markMailRead, meetingDue } from './mail.js';
import {
  applySnapTournament,
  comingSeason,
  comingSeasonStartDay,
  inPrepWindow,
  maxTournamentsForSeason,
  scheduleTournamentDays,
} from './tournament.js';
import { clampStanding } from './satisfaction.js';
import { buyAutoPicker, startProject } from './projects.js';
import { bumpCapitalSpent, emptyYearRecord } from './history.js';
import { resolveDay } from './simulation.js';
import {
  CUT_TASK_BY_SURFACE,
  DAY_LENGTH_MINUTES,
  HOC_SURFACES,
  HOLE_COUNT,
  MACHINE_OVERRIDE_AUTO,
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
  STARTING_MACHINE_CONDITION,
  STARTING_MACHINE_CONDITIONS,
  STARTING_MACHINE_HOURS,
  STARTING_MACHINE_IDS,
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
  POND_HEALTH_START,
  POND_START_VOLUME,
  STARTING_IRRIGATION,
  SATISFACTION_START,
  GM_STANDING_START,
  GM_TOURNAMENT_DECLINE_STANDING,
  AERATOR_COST,
  GREENS_SENSORS_COST,
  TURFRAD_COST,
  MACHINE_DAILY_MINUTES,
  SALESMAN_RELATIONSHIP_START,
  SAVE_VERSION,
  SOUND_DEFAULT_ON,
  PATTERN_KEYS,
  PATTERN_ANGLE_RESET_DELTA,
  VIEW_ZOOM_DEFAULT,
  VIEW_PAN_X_DEFAULT,
  VIEW_PAN_Y_DEFAULT,
  PLAYOUT_SPEED_DEFAULT,
  PLAYOUT_SKIP_DEFAULT,
  PLAYOUT_SPEEDS,
  PRESET_MAX,
  PRESET_NAME_MAX,
  SECTION_MAP,
} from '../data/constants.js';
import { clampAngle, clampHoc, hasHoc, hasPattern, mergeSurfaceFields, angleDelta } from './mowing.js';
import {
  createInitialHoles,
  createSurfaceDefaults,
  holeCount,
  holeSurface,
  mapHoleSurfaces,
  mostRecentCut,
} from './holes.js';
import { courseBounds, holesForCount } from '../data/course.js';
import { clampView, defaultView } from './view.js';
import { defaultSectionTabs, normalizeSection, normalizeTabs, tabListForSection } from './section.js';
import { shippedPresetById } from './presets.js';
import { formatMoney } from './format.js';
import { buyUsed, rollUsedListings, sellMachine } from './market.js';
import { acceptEvent, declineEvent } from './events.js';

export function createInitialState() {
  const calendar = calendarFromDay(STARTING_DAY);
  const rng = createRng(STARTING_RNG_SEED);
  const forecast = buildForecast({ day: STARTING_DAY, weather: STARTING_WEATHER }, rng);
  const rngSeed = rng.seed;
  const candidates = generateCandidates(rng);
  const usedListings = rollUsedListings(
    {
      ownedMachines: [...STARTING_MACHINE_IDS],
      pendingDeliveries: [],
      activeSales: [],
      salesmanRelationship: SALESMAN_RELATIONSHIP_START,
    },
    rng,
  );
  return {
    day: STARTING_DAY,
    season: calendar.season,
    year: calendar.year,
    cash: STARTING_CASH,
    holes: createInitialHoles(HOLE_COUNT),
    surfaceDefaults: createSurfaceDefaults(),
    weather: STARTING_WEATHER,
    ...forecast,
    rngSeed,
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
    view: {
      zoom: VIEW_ZOOM_DEFAULT,
      panX: VIEW_PAN_X_DEFAULT,
      panY: VIEW_PAN_Y_DEFAULT,
    },
    plannedTasks: [],
    log: [],
    ownedMachines: [...STARTING_MACHINE_IDS],
    machineWear: Object.fromEntries(STARTING_MACHINE_IDS.map((id) => [id, 0])),
    machineBroken: {},
    machineAwayUntil: {},
    machineCondition: Object.fromEntries(
      STARTING_MACHINE_IDS.map((id) => [id, STARTING_MACHINE_CONDITIONS[id] ?? STARTING_MACHINE_CONDITION]),
    ),
    machineDailyMinutes: Object.fromEntries(STARTING_MACHINE_IDS.map((id) => [id, MACHINE_DAILY_MINUTES])),
    machineHours: Object.fromEntries(
      STARTING_MACHINE_IDS.map((id) => [id, STARTING_MACHINE_HOURS[id] ?? 0]),
    ),
    machineOverride: normalizeMachineOverride(null),
    salesmanRelationship: SALESMAN_RELATIONSHIP_START,
    usedListings,
    pendingDeliveries: [],
    activeSales: [],
    eventInvitations: [],
    hasFoleyGrinder: false,
    autoWeek: { weekStart: STARTING_DAY, hits: [] },
    candidates,
    candidatesSeason: calendar.season,
    volunteerWeekday: VOLUNTEER_DEFAULT_WEEKDAY,
    volunteerDayChangedThisSeason: false,
    earlyStart: false,
    neighbourComplaintsThisSeason: 0,
    nextHireId: 1,
    pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
    irrigation: { ...STARTING_IRRIGATION },
    hasAerator: false,
    moisture: emptyMoisture(HOLE_COUNT),
    moistureReadDay: emptyMoistureReadDay(HOLE_COUNT),
    handWaterTargets: allGreenIds(HOLE_COUNT),
    hasGreensSensors: false,
    hasTurfRad: false,
    moistureOverlay: false,
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
    pendingTournamentSetup: false,
    gmTournamentRequestPending: false,
    tournamentSetupSeason: null,
    tournamentSetupDeadline: null,
    tournamentSetupStartDay: null,
    tournaments: [],
    tournamentPrepScore: 0,
    projects: [],
    hasDrivingRange: false,
    hasAutoPicker: false,
    hasExtraBunkers: false,
    hasNewTees: false,
    saveVersion: SAVE_VERSION,
    soundEnabled: SOUND_DEFAULT_ON,
    tutorialDone: false,
    pendingYearReview: false,
    lastYearReview: null,
    yearRecord: emptyYearRecord(calendar.year, [PLAYER_ID]),
    inbox: [],
    nextMailId: 1,
    playoutSpeed: PLAYOUT_SPEED_DEFAULT,
    skipPlayout: PLAYOUT_SKIP_DEFAULT,
    customPresets: [],
    nextPresetId: 1,
    lastMainsCost: 0,
    lastDeliveryDay: null,
    section: SECTION_MAP,
    tabs: defaultSectionTabs(),
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

export function canPlanTask(state, taskId, workerId) {
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

  if (task.id === 'pickBalls' && !state.hasDrivingRange) {
    return { ok: false, reason: 'No driving range yet.' };
  }

  if (task.kind === 'prep' && !inPrepWindow(state)) {
    return { ok: false, reason: 'Prep only in the three days before a tournament.' };
  }

  if (task.id === 'handWater' && (state.handWaterTargets ?? []).length === 0) {
    return { ok: false, reason: 'Select at least one green.' };
  }

  if (state.plannedTasks.some((planned) => planned.taskId === taskId)) {
    return { ok: false, reason: 'Already planned. Take it off the list first.' };
  }

  if (task.mowing && MOWING_WEATHER.includes(state.weather)) {
    return { ok: false, reason: 'Mowing is off today.' };
  }

  if (task.mowing && !allowingMachines(state, task).length) {
    return { ok: false, reason: NO_MACHINE_REASON };
  }

  const requested = workerId ? workerById(state, workerId) : null;
  if (requested && (!isWorkerPresent(requested) || !workerAllows(requested, task.surface))) {
    return { ok: false, reason: 'No one available for that job.' };
  }

  const worker = requested ?? assignWorker(state, task);

  if (task.requiresSpray && !certifiedPresent(state, task.surface)) {
    return { ok: false, reason: 'No spray-certified worker available.' };
  }

  if (task.materialsCost) {
    const already = state.plannedTasks.reduce((sum, item) => {
      const planned = getTask(item.taskId);
      return sum + (planned?.materialsCost ?? 0);
    }, 0);
    if (already + task.materialsCost > (state.maintenanceBudget ?? 0)) {
      return { ok: false, reason: `Needs ${formatMoney(task.materialsCost)} from the maintenance budget.` };
    }
  }

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
    if (task.mowing) {
      const catalogId = allowingMachines(state, task)[0]?.id;
      const someoneHasTime = state.workers.some(
        (item) =>
          isWorkerPresent(item) &&
          workerAllows(item, task.surface) &&
          (!task.requiresSpray || item.sprayCertified) &&
          item.minutesToday - item.minutesUsed >= durationOnMachine(state, taskId, item, catalogId),
      );
      if (someoneHasTime && !pickMachineForTask(state, task, fallback)) {
        return { ok: false, reason: MACHINE_BOOKED_REASON };
      }
    }
    const minutes = durationOnMachine(state, taskId, fallback, allowingMachines(state, task)[0]?.id);
    const remaining = fallback.minutesToday - fallback.minutesUsed;
    return { ok: false, reason: `Needs ${minutes} min, only ${remaining} left.` };
  }
  const machineCheck = machinePlanCheck(state, task, worker);
  if (!machineCheck.ok) return machineCheck;
  const minutes = durationOnMachine(state, taskId, worker, machineCheck.machine?.id);
  const remaining = worker.minutesToday - worker.minutesUsed;
  if (minutes > remaining) {
    return { ok: false, reason: `Needs ${minutes} min on ${worker.name}, only ${remaining} left.` };
  }
  return { ok: true, minutes, workerId: worker.id, machineId: machineCheck.machine?.id ?? null };
}

function removePlannedTask(state, taskId) {
  const planned = state.plannedTasks.find((item) => item.taskId === taskId);
  if (!planned) return state;
  return {
    ...state,
    plannedTasks: state.plannedTasks.filter((item) => item.taskId !== taskId),
    workers: state.workers.map((item) =>
      item.id === planned.workerId ? { ...item, minutesUsed: item.minutesUsed - planned.minutes } : item,
    ),
  };
}

function dropUnfittableMowing(state, surface) {
  let next = state;
  for (const planned of [...state.plannedTasks]) {
    const task = getTask(planned.taskId);
    if (!task?.mowing || task.surface !== surface) continue;
    const worker = next.workers.find((item) => item.id === planned.workerId);
    const current = next.plannedTasks.find((item) => item.taskId === planned.taskId);
    if (!worker || !current) continue;
    if (worker.minutesUsed > worker.minutesToday) {
      next = removePlannedTask(next, planned.taskId);
    }
  }
  return next;
}

function applySurfacePatch(state, surface, patch) {
  const current = state.surfaceDefaults?.[surface] ?? {};
  const next = {
    ...state,
    surfaceDefaults: {
      ...state.surfaceDefaults,
      [surface]: { ...current, ...patch },
    },
  };
  return dropUnfittableMowing(recomputePlannedMinutes(next), surface);
}

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'LOAD_GAME':
      return action.state;
    case 'PLAN_TASK': {
      const task = getTask(action.taskId);
      const check = canPlanTask(state, action.taskId, action.workerId);
      if (!task || !check.ok) return state;
      return {
        ...state,
        plannedTasks: [
          ...state.plannedTasks,
          {
            taskId: action.taskId,
            surface: task.surface,
            workerId: check.workerId,
            minutes: check.minutes,
            machineId: check.machineId ?? null,
            ...(action.taskId === 'handWater' ? { greens: [...(state.handWaterTargets ?? [])] } : {}),
          },
        ],
        workers: state.workers.map((item) =>
          item.id === check.workerId ? { ...item, minutesUsed: item.minutesUsed + check.minutes } : item,
        ),
      };
    }
    case 'REMOVE_TASK':
      return removePlannedTask(state, action.taskId);
    case 'END_DAY': {
      if (state.dismissed) return state;
      const { state: next, summary } = resolveDay(state);
      return { ...next, log: [...next.log, summary] };
    }
    case 'SET_TOURNAMENTS': {
      if (!state.pendingTournamentSetup || state.dismissed) return state;
      const season = state.tournamentSetupSeason ?? comingSeason(state.day);
      const start = state.tournamentSetupStartDay ?? comingSeasonStartDay(state.day);
      const max = maxTournamentsForSeason(season);
      const count = Math.min(Math.max(Number(action.count) || 0, 0), max);
      const days = scheduleTournamentDays(start, count, season);
      return {
        ...state,
        pendingTournamentSetup: false,
        gmTournamentRequestPending: false,
        tournamentSetupSeason: null,
        tournamentSetupDeadline: null,
        tournamentSetupStartDay: null,
        tournaments: [
          ...(state.tournaments ?? []).filter((item) => item.season !== season && !item.done),
          ...days.map((day) => ({
            day,
            done: false,
            season,
            risky: season === 'winter',
          })),
        ],
        inbox: (state.inbox ?? []).map((item) =>
          item.kind === 'tournamentRequest' ? { ...item, read: true } : item,
        ),
      };
    }
    case 'DECLINE_TOURNAMENT_REQUEST': {
      if (!state.gmTournamentRequestPending) return state;
      return {
        ...state,
        pendingTournamentSetup: false,
        gmTournamentRequestPending: false,
        tournamentSetupSeason: null,
        tournamentSetupDeadline: null,
        tournamentSetupStartDay: null,
        gmStanding: clampStanding(state.gmStanding - GM_TOURNAMENT_DECLINE_STANDING),
        inbox: (state.inbox ?? []).map((item) =>
          item.kind === 'tournamentRequest' ? { ...item, read: true } : item,
        ),
      };
    }
    case 'START_PROJECT':
      return startProject(state, action.projectId);
    case 'BUY_AUTO_PICKER':
      return buyAutoPicker(state);
    case 'BUY_MACHINE':
      return buyMachine(state, action.machineId);
    case 'BUY_USED':
      return buyUsed(state, action.listingId);
    case 'SELL_MACHINE':
      return sellMachine(state, action.machineId);
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
    case 'REORDER_TASKS': {
      const order = action.order;
      if (!Array.isArray(order) || order.length !== state.plannedTasks.length) return state;
      const byId = new Map(state.plannedTasks.map((item) => [item.taskId, item]));
      const next = [];
      for (const taskId of order) {
        const item = byId.get(taskId);
        if (!item) return state;
        next.push(item);
        byId.delete(taskId);
      }
      if (byId.size > 0) return state;
      return { ...state, plannedTasks: next };
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
      const probe = {
        ...state,
        plannedTasks: state.plannedTasks.filter((item) => item.taskId !== planned.taskId),
      };
      const machineCheck = machinePlanCheck(probe, task, worker);
      if (!machineCheck.ok) return state;
      const minutes = durationOnMachine(probe, planned.taskId, worker, machineCheck.machine?.id);
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
          item.taskId === action.taskId
            ? { ...item, workerId: worker.id, minutes, machineId: machineCheck.machine?.id ?? null }
            : item,
        ),
        workers: next.workers.map((item) =>
          item.id === worker.id ? { ...item, minutesUsed: item.minutesUsed + minutes } : item,
        ),
      };
      return next;
    }
    case 'SET_HOC': {
      if (!hasHoc(action.surface)) return state;
      return applySurfacePatch(state, action.surface, { hoc: clampHoc(action.surface, action.hoc) });
    }
    case 'SET_PATTERN': {
      if (!hasPattern(action.surface) || !PATTERN_KEYS.includes(action.pattern)) return state;
      return applySurfacePatch(state, action.surface, { pattern: action.pattern });
    }
    case 'SET_ANGLE': {
      if (!hasPattern(action.surface)) return state;
      const angle = clampAngle(action.angle);
      const prev = state.surfaceDefaults?.[action.surface]?.angle ?? 0;
      const patch = { angle };
      if (angleDelta(angle, prev) >= PATTERN_ANGLE_RESET_DELTA) {
        patch.patternWear = 0;
      }
      return applySurfacePatch(state, action.surface, patch);
    }
    case 'SET_AUTO_ROTATE': {
      if (!hasPattern(action.surface)) return state;
      return applySurfacePatch(state, action.surface, { autoRotate: Boolean(action.value) });
    }
    case 'MATCH_LAST_MOWING': {
      let next = state;
      for (const surface of HOC_SURFACES) {
        const recent = mostRecentCut(next, surface);
        if (!recent) continue;
        const record = recent.record;
        const patch = { hoc: clampHoc(surface, record.heightAtLastCut) };
        if (hasPattern(surface) && record.patternAtLastCut != null && PATTERN_KEYS.includes(record.patternAtLastCut)) {
          patch.pattern = record.patternAtLastCut;
        }
        if (hasPattern(surface) && record.angleAtLastCut != null) {
          const angle = clampAngle(record.angleAtLastCut);
          patch.angle = angle;
          const prev = next.surfaceDefaults?.[surface]?.angle ?? 0;
          if (angleDelta(angle, prev) >= PATTERN_ANGLE_RESET_DELTA) {
            patch.patternWear = 0;
          }
        }
        next = applySurfacePatch(next, surface, patch);
      }
      return next;
    }
    case 'SET_HOLE_OVERRIDE': {
      const surface = action.surface;
      const holeId = action.holeId;
      if (!hasHoc(surface) && !hasPattern(surface)) return state;
      if (!holeSurface(state, holeId, surface)) return state;
      const override = action.override == null ? null : { ...action.override };
      return {
        ...state,
        holes: mapHoleSurfaces(state.holes, surface, (record, hole) =>
          hole.id === holeId ? { ...record, override } : record,
        ),
      };
    }
    case 'SET_MACHINE_OVERRIDE': {
      const surface = action.surface;
      if (!HOC_SURFACES.includes(surface)) return state;
      let machineId = action.machineId ?? null;
      if (machineId === MACHINE_OVERRIDE_AUTO || machineId === '') machineId = null;
      if (machineId) {
        const machine = getMachine(machineId);
        const task = getTask(CUT_TASK_BY_SURFACE[surface]);
        if (!machine || !machineAllows(machine, surface, task)) return state;
      }
      return recomputePlannedMinutes({
        ...state,
        machineOverride: { ...normalizeMachineOverride(state.machineOverride), [surface]: machineId },
      });
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
      return bumpCapitalSpent(
        { ...state, capitalBudget: state.capitalBudget - AERATOR_COST, hasAerator: true },
        AERATOR_COST,
      );
    }
    case 'BUY_GREENS_SENSORS': {
      const check = canBuyGreensSensors(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(
        { ...state, capitalBudget: state.capitalBudget - GREENS_SENSORS_COST, hasGreensSensors: true },
        GREENS_SENSORS_COST,
      );
    }
    case 'BUY_TURFRAD': {
      const check = canBuyTurfRad(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(
        { ...state, capitalBudget: state.capitalBudget - TURFRAD_COST, hasTurfRad: true },
        TURFRAD_COST,
      );
    }
    case 'TOGGLE_MOISTURE_OVERLAY':
      return { ...state, moistureOverlay: !state.moistureOverlay };
    case 'SET_HAND_WATER_TARGETS': {
      const holes = holeCount(state);
      const allowed = new Set(allGreenIds(holes));
      const targets = [...new Set((action.targets ?? []).filter((id) => allowed.has(id)))].sort((a, b) => a - b);
      let next = { ...state, handWaterTargets: targets };
      if (next.plannedTasks.some((item) => item.taskId === 'handWater')) {
        if (targets.length === 0) return removePlannedTask(next, 'handWater');
        next = {
          ...next,
          plannedTasks: next.plannedTasks.map((item) =>
            item.taskId === 'handWater' ? { ...item, greens: targets } : item,
          ),
        };
        next = recomputePlannedMinutes(next);
        const planned = next.plannedTasks.find((item) => item.taskId === 'handWater');
        const worker = planned ? next.workers.find((item) => item.id === planned.workerId) : null;
        if (worker && worker.minutesUsed > worker.minutesToday) {
          return removePlannedTask(next, 'handWater');
        }
      }
      return next;
    }
    case 'SET_VIEW': {
      const layout = holesForCount(holeCount(state));
      return { ...state, view: clampView({ ...defaultView(), ...action.view }, courseBounds(layout)) };
    }
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'DISMISS_TUTORIAL':
      return { ...state, tutorialDone: true };
    case 'DISMISS_YEAR_REVIEW':
      return { ...state, pendingYearReview: false };
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
    case 'ACCEPT_EVENT':
      return acceptEvent(state, action.inviteId);
    case 'DECLINE_EVENT':
      return declineEvent(state, action.inviteId);
    case 'SET_PLAYOUT_SPEED':
      return PLAYOUT_SPEEDS.includes(action.speed) ? { ...state, playoutSpeed: action.speed } : state;
    case 'SET_SKIP_PLAYOUT':
      return { ...state, skipPlayout: Boolean(action.value) };
    case 'SAVE_PRESET': {
      const surface = action.surface;
      const record = state.surfaceDefaults?.[surface];
      if (!record || (!hasHoc(surface) && !hasPattern(surface))) return state;
      const list = state.customPresets ?? [];
      if (list.length >= PRESET_MAX) return state;
      const trimmed = String(action.name ?? '')
        .trim()
        .slice(0, PRESET_NAME_MAX);
      const id = state.nextPresetId ?? 1;
      return {
        ...state,
        nextPresetId: id + 1,
        customPresets: [
          ...list,
          {
            id,
            name: trimmed || `Preset ${id}`,
            surface,
            hoc: record.hoc,
            pattern: record.pattern,
            angle: record.angle,
            autoRotate: Boolean(record.autoRotate),
          },
        ],
      };
    }
    case 'APPLY_PRESET': {
      const preset = (state.customPresets ?? []).find((item) => item.id === action.id);
      if (!preset || !state.surfaceDefaults?.[preset.surface]) return state;
      let next = state;
      if (hasHoc(preset.surface) && preset.hoc != null) {
        next = applySurfacePatch(next, preset.surface, { hoc: clampHoc(preset.surface, preset.hoc) });
      }
      if (hasPattern(preset.surface)) {
        next = applySurfacePatch(next, preset.surface, {
          ...(PATTERN_KEYS.includes(preset.pattern) ? { pattern: preset.pattern } : {}),
          angle: clampAngle(preset.angle ?? 0),
          autoRotate: Boolean(preset.autoRotate),
        });
      }
      return next;
    }
    case 'APPLY_SHIPPED_PRESET': {
      const preset = shippedPresetById(action.id);
      if (!preset) return state;
      let next = state;
      for (const [surface, settings] of Object.entries(preset.surfaces)) {
        if (!next.surfaceDefaults?.[surface] && !hasHoc(surface) && !hasPattern(surface)) continue;
        if (hasHoc(surface) && settings.hoc != null) {
          next = applySurfacePatch(next, surface, { hoc: clampHoc(surface, settings.hoc) });
        }
        if (hasPattern(surface)) {
          next = applySurfacePatch(next, surface, {
            ...(PATTERN_KEYS.includes(settings.pattern) ? { pattern: settings.pattern } : {}),
            angle: clampAngle(settings.angle ?? 0),
            autoRotate: Boolean(settings.autoRotate),
          });
        }
      }
      return next;
    }
    case 'DELETE_PRESET':
      return {
        ...state,
        customPresets: (state.customPresets ?? []).filter((item) => item.id !== action.id),
      };
    case 'SET_SECTION':
      return { ...state, section: normalizeSection(action.section) };
    case 'SET_TAB': {
      const section = normalizeSection(action.section);
      const allowed = tabListForSection(section);
      if (!allowed.includes(action.tab)) return state;
      return { ...state, tabs: { ...normalizeTabs(state.tabs), [section]: action.tab } };
    }
    default:
      return state;
  }
}
