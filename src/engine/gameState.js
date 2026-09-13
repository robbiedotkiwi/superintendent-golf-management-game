import { getTask, SURFACE_LABELS } from '../data/tasks.js';
import { calendarFromDay } from './calendar.js';
import { buildForecast, canBuyWeatherStation } from './weather.js';
import { createRng } from './rng.js';
import { buyFoley, buyMachine, buyUpgrade, grindInHouse, repairMachine, sendForGrind, machinePlanCheck, durationOnMachine, recomputePlannedMinutes, allowingMachines, pickMachine, pickMachineForTask, machineMinutesRemaining, MACHINE_BOOKED_REASON, NO_MACHINE_REASON, getMachine, normalizeMachineOverride, machineSuitability } from './equipment.js';
import { machineAllows } from '../data/equipment.js';
import { machineTitle } from './machineDisplay.js';
import { assignWorker, certifiedPresent, workerById, workerAllows, workerBringsOwnMower, isWorkerPresent } from './assignment.js';
import { findPlannedJob, jobHolesFor, applyRoute, canSaveRoute } from './jobs.js';
import {
  getDayTasks,
  planningDayOf,
  planViewState,
  canEditPlanDay,
  setDayTasks,
  bookCasual,
  unbookCasual,
  upsertDayPlan,
  emptyWeekPlan,
  weekStartDay,
  irrigationForPlanDay,
  workersForPlanDay,
} from './week.js';
import { generateCandidates, generateCasuals } from '../data/staff.js';
import { rosterWorker } from './weekGrid.js';
import { migrateWorkerTier } from './staffTiers.js';
import { applyNamedTemplate, copyLastWeek, copyYesterday, nextStartMinute, saveNamedTemplate, snapMinutes } from './slots.js';
import { approveLeave, declineLeave } from './staffMorale.js';
import { coringWindowOk, isDrySpell, sprayWindowOk } from './support.js';
import {
  applyAreaQualityToHoles,
  emptyAreaQuality,
  emptyWeekPassState,
  staffCanRunMachine,
} from './passes.js';
import {
  applyEarlyStartComplaints,
  dismissVolunteer,
  fireWorker,
  hireWorker,
  setVolunteerWeekday,
  trainWorker,
} from './staff.js';
import { emptyDisease, emptyUntil } from './disease.js';
import {
  allGreenIds,
  canBuyGreensSensors,
  canBuyTurfRad,
  emptyMoisture,
  emptyMoistureReadDay,
} from './moisture.js';
import { canBuyAerator, IRRIGATED_SURFACES, clampIrrigationMm, migrateIrrigationValue } from './irrigation.js';
import { leaseMachine, stopLease, takeLoan } from './budget.js';
import { emptyDaysSinceWorked, markMailRead, meetingDue } from './mail.js';
import {
  applySnapTournament,
  comingSeason,
  comingSeasonStartDay,
  inPrepWindow,
  maxTournamentsForSeason,
  scheduleTournamentDays,
  seasonTournament,
} from './tournament.js';
import { clampStanding } from './satisfaction.js';
import { buyAutoPicker, pauseProject, resumeProject, startGrassConversion, startProject } from './projects.js';
import { bumpCapitalSpent, emptyYearRecord } from './history.js';
import { spendCapital } from './cash.js';
import { dismissGm, emptySectionUnlocks, GM_MSG_DAY1, isSectionLocked } from './gm.js';
import { snapshotWeekStart } from './weekReview.js';
import { resolveDay } from './simulation.js';
import {
  CUT_TASK_BY_SURFACE,
  DAMAGING_JOB_REASON,
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
  STARTING_OPENING_CASH,
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
  STARTING_TEMP_MIN,
  STARTING_TEMP_MAX,
  SUITABILITY_DAMAGING,
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
  WEATHER_STATION_COST,
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
  SECTION_MAP,
} from '../data/constants.js';
import { clampAngle, clampHoc, hasHoc, hasPattern, mergeSurfaceFields, angleDelta } from './mowing.js';
import { startingGrass } from './grass.js';
import {
  createInitialHoles,
  createSurfaceDefaults,
  holeCount,
  holeSurface,
  mapHoleSurfaces,
} from './holes.js';
import { courseBounds, holesForCount } from '../data/course.js';
import { clampView, defaultView } from './view.js';
import { defaultSectionTabs, normalizeSection, normalizeTabs, tabListForSection } from './section.js';
import { formatMoney } from './format.js';
import { CAPEX_STATUS_PENDING, STARTING_CAPEX, STARTING_MONTHLY_BUDGET } from '../data/config.js';
import { buyUsed, rollUsedListings, sellMachine } from './market.js';
import { acceptEvent, declineEvent } from './events.js';

export function createInitialState() {
  const calendar = calendarFromDay(STARTING_DAY);
  const rng = createRng(STARTING_RNG_SEED);
  const forecast = buildForecast({ day: STARTING_DAY, weather: STARTING_WEATHER }, rng);
  const rngSeed = rng.seed;
  const candidates = generateCandidates(rng).map(migrateWorkerTier);
  const casualPool = generateCasuals(rng).map(migrateWorkerTier);
  const usedListings = rollUsedListings(
    {
      ownedMachines: [...STARTING_MACHINE_IDS],
      pendingDeliveries: [],
      activeSales: [],
      salesmanRelationship: SALESMAN_RELATIONSHIP_START,
    },
    rng,
  );
  const grass = startingGrass();
  const holes = createInitialHoles(HOLE_COUNT, { grass });
  const areaQuality = emptyAreaQuality();
  const passWeek = emptyWeekPassState();
  const workers = [
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
        allowedSurfaces: 'all',
        availableFromDay: STARTING_DAY,
        minutesToday: STARTING_MINUTES_USED,
        minutesUsed: STARTING_MINUTES_USED,
        daysWorkedRunning: STARTING_DAYS_WORKED_RUNNING,
      },
    ].map(migrateWorkerTier);
  const state = {
    day: STARTING_DAY,
    season: calendar.season,
    year: calendar.year,
    cash: STARTING_OPENING_CASH,
    fuelSpendLog: [],
    holes: applyAreaQualityToHoles(holes, areaQuality),
    areaQuality,
    surfaceDefaults: createSurfaceDefaults(undefined, grass),
    grass,
    weather: STARTING_WEATHER,
    tempMin: STARTING_TEMP_MIN,
    tempMax: STARTING_TEMP_MAX,
    forecastCall: null,
    ...forecast,
    rngSeed,
    workers,
    view: {
      zoom: VIEW_ZOOM_DEFAULT,
      panX: VIEW_PAN_X_DEFAULT,
      panY: VIEW_PAN_Y_DEFAULT,
    },
    plannedTasks: [],
    nextPlanId: 1,
    planningDay: STARTING_DAY,
    weekPlan: emptyWeekPlan(STARTING_DAY),
    ...passWeek,
    planTemplates: [],
    nextTemplateId: 1,
    lastCopyFlags: [],
    leaveRequests: [],
    nextLeaveId: 1,
    coringUntilDay: 0,
    coredThisSeason: false,
    coringSkipStreak: 0,
    greensCeilingPenalty: 0,
    generalDutiesSkipWeeks: 0,
    areaQualityPrev: emptyAreaQuality(),
    morningDrops: [],
    selectedHoles: [],
    savedRoutes: [],
    nextRouteId: 1,
    lastDayJobs: [],
    lastWeek: null,
    lastWeekReview: null,
    pendingWeekReview: false,
    lastRepeatDropped: [],
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
    machineUpgrades: {},
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
    casualPool,
    volunteerWeekday: VOLUNTEER_DEFAULT_WEEKDAY,
    volunteerDayChangedThisSeason: false,
    earlyStart: false,
    neighbourComplaintsThisSeason: 0,
    nextHireId: 1,
    pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
    irrigation: { ...STARTING_IRRIGATION },
    hasAerator: false,
    lastPondDoseDay: STARTING_DAY,
    moisture: emptyMoisture(HOLE_COUNT),
    moistureReadDay: emptyMoistureReadDay(HOLE_COUNT),
    handWaterTargets: allGreenIds(HOLE_COUNT),
    hasGreensSensors: false,
    hasTurfRad: false,
    hasWeatherStation: false,
    moistureOverlay: false,
    disease: emptyDisease(),
    sprayedUntil: emptyUntil(),
    fertiliserUntil: emptyUntil(),
    satisfaction: SATISFACTION_START,
    gmStanding: GM_STANDING_START,
    grantForecast: null,
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
    tournaments: seasonTournament(STARTING_DAY, calendar.season),
    tournamentPrepScore: 0,
    projects: [],
    hasDrivingRange: false,
    hasAutoPicker: false,
    hasExtraBunkers: false,
    hasNewTees: false,
    hasPondExpansion: false,
    saveVersion: SAVE_VERSION,
    soundEnabled: SOUND_DEFAULT_ON,
    tutorialDone: true,
    coldWeatherTipDone: false,
    gmQueue: [GM_MSG_DAY1],
    gmSeen: { [GM_MSG_DAY1]: true },
    sectionUnlocks: emptySectionUnlocks(),
    lockHint: null,
    pendingYearReview: false,
    lastYearReview: null,
    yearRecord: emptyYearRecord(calendar.year, [PLAYER_ID]),
    inbox: [],
    nextMailId: 1,
    playoutSpeed: PLAYOUT_SPEED_DEFAULT,
    skipPlayout: PLAYOUT_SKIP_DEFAULT,
    lastMainsCost: 0,
    lastDeliveryDay: null,
    firingHistory: [],
    volunteerDismissed: false,
    capex: STARTING_CAPEX,
    capexStatus: CAPEX_STATUS_PENDING,
    capexGrantedKey: null,
    growInUntil: {},
    lastMonthlyBudget: STARTING_MONTHLY_BUDGET,
    section: SECTION_MAP,
    tabs: defaultSectionTabs(),
  };
  return { ...state, weekStartSnapshot: snapshotWeekStart(state) };
}

export const initialState = createInitialState();

export function workerMinutesRemaining(worker) {
  return worker.minutesToday - worker.minutesUsed;
}

export function combinedMinutesRemaining(state) {
  return (state.workers ?? []).reduce((total, worker) => total + workerMinutesRemaining(worker), 0);
}

export function combinedMinutesCapacity(state) {
  return (state.workers ?? []).reduce((total, worker) => total + worker.minutesToday, 0);
}

export function combinedMinutesUsed(state) {
  return (state.workers ?? []).reduce((total, worker) => total + worker.minutesUsed, 0);
}

function actionPlanDay(state, actionOrDay) {
  const raw = actionOrDay && typeof actionOrDay === 'object' ? actionOrDay.day : actionOrDay;
  if (raw == null) return planningDayOf(state);
  const day = Number(raw);
  if (!Number.isInteger(day) || weekStartDay(day) !== weekStartDay(state.day)) return planningDayOf(state);
  return day;
}

export function canPlanTask(state, taskId, workerId, options = {}) {
  const day = actionPlanDay(state, options);
  const edit = canEditPlanDay(state, day);
  if (!edit.ok) return edit;
  const roster = [...(state.workers ?? []), ...(state.casualPool ?? [])];
  state = planViewState({ ...state, planningDay: day });
  const task = getTask(taskId);
  if (!task) return { ok: false, reason: 'Unknown job.' };
  const holes =
    task.id === 'handWater'
      ? allGreenIds(holeCount(state))
      : jobHolesFor(state, task, options.holes);

  if (task.id === 'clearDebris' && state.weather !== WEATHER_STORM) {
    return { ok: false, reason: 'No debris to clear.' };
  }

  const debrisPlanned = state.plannedTasks.some((planned) => planned.taskId === 'clearDebris');
  if (state.weather === WEATHER_STORM && task.id !== 'clearDebris' && !debrisPlanned) {
    return { ok: false, reason: `Clear debris first (${TASK_MINUTES.clearDebris} min).` };
  }

  if (task.id === 'gmMeeting' && !meetingDue(planningDayOf(state))) {
    return { ok: false, reason: 'No GM meeting that day.' };
  }
  if (task.kind === 'moistureCheck' && !isDrySpell(state, actionPlanDay(state, options))) {
    return { ok: false, reason: 'Moisture checks are for dry spells.' };
  }
  if (task.kind === 'spray') {
    const window = sprayWindowOk(state, actionPlanDay(state, options));
    if (!window.ok) return window;
  }
  if (task.kind === 'coring') {
    const window = coringWindowOk(state);
    if (!window.ok) return window;
  }

  if (task.id === 'pickBalls' && !state.hasDrivingRange) {
    return { ok: false, reason: 'No driving range yet.' };
  }

  if (task.kind === 'prep' && !inPrepWindow({ ...state, day: planningDayOf(state) })) {
    return { ok: false, reason: 'Prep only in the three days before a tournament.' };
  }

  if (!task.mowing && (task.surface ? findPlannedJob(state, taskId, holes) : state.plannedTasks.some((planned) => planned.taskId === taskId))) {
    return { ok: false, reason: 'Already planned. Take it off the list first.' };
  }

  const requested = workerId
    ? workerById(state, workerId) ?? roster.find((item) => item.id === workerId) ?? null
    : null;
  if (requested && !workerAllows(requested, task.surface)) {
    return { ok: false, reason: 'No one available for that job.' };
  }

  const ownMowerReady = requested
    ? workerBringsOwnMower(requested, task.surface)
    : roster.some((item) => workerBringsOwnMower(item, task.surface));
  if (task.mowing && !allowingMachines(state, task).length && !ownMowerReady) {
    return { ok: false, reason: NO_MACHINE_REASON };
  }

  const worker = requested ?? assignWorker(state, task, holes);

  if (task.requiresSpray && !certifiedPresent(state, task.surface)) {
    return { ok: false, reason: 'No spray-certified worker available.' };
  }

  if (task.materialsCost) {
    const already = state.plannedTasks.reduce((sum, item) => {
      const planned = getTask(item.taskId);
      return sum + (planned?.materialsCost ?? 0);
    }, 0);
    if (already + task.materialsCost > (state.cash ?? 0)) {
      return { ok: false, reason: `Needs ${formatMoney(task.materialsCost)}, only ${formatMoney(state.cash ?? 0)}.` };
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
    const auto = pickMachineForTask(state, task, fallback, undefined, holes);
    const picked = auto ?? pickMachine(state, task);
    if (task.mowing) {
      const someoneHasTime = state.workers.some(
        (item) =>
          isWorkerPresent(item) &&
          workerAllows(item, task.surface) &&
          (!task.requiresSpray || item.sprayCertified) &&
          item.minutesToday - item.minutesUsed >= durationOnMachine(state, taskId, item, picked?.id, holes),
      );
      if (someoneHasTime && !auto) {
        return { ok: false, reason: MACHINE_BOOKED_REASON };
      }
    }
    const minutes = durationOnMachine(state, taskId, fallback, picked?.id, holes);
    const remaining = fallback.minutesToday - fallback.minutesUsed;
    return { ok: false, reason: `Needs ${minutes} min, only ${remaining} left.` };
  }
  const machineCheck = machinePlanCheck(state, task, worker, options.machineId, holes);
  if (!machineCheck.ok) return machineCheck;
  if (machineCheck.machine && !staffCanRunMachine(worker, machineCheck.machine)) {
    return { ok: false, reason: 'That person cannot run that machine.' };
  }
  let minutes = durationOnMachine(state, taskId, worker, machineCheck.machine?.id, holes);
  if (options.minutes != null) minutes = snapMinutes(options.minutes);
  const remaining = worker.minutesToday - worker.minutesUsed;
  if (!requested || options.minutes != null) {
    if (minutes > remaining) {
      return { ok: false, reason: `Needs ${minutes} min on ${worker.name}, only ${remaining} left.` };
    }
    if (machineCheck.machine && machineMinutesRemaining(state, machineCheck.machine.id) < minutes) {
      return { ok: false, reason: MACHINE_BOOKED_REASON };
    }
  }
  const suitability = machineSuitability(machineCheck.machine, task.surface);
  return {
    ok: true,
    minutes,
    workerId: worker.id,
    machineId: machineCheck.ownMower ? null : machineCheck.machine?.id ?? null,
    holes,
    suitability,
    ownMower: Boolean(machineCheck.ownMower),
  };
}

function commitDayTasks(state, tasks, day = planningDayOf(state)) {
  const next = setDayTasks(state, day, tasks);
  if (day !== state.day) return next;
  const used = {};
  for (const item of tasks) {
    used[item.workerId] = (used[item.workerId] ?? 0) + (item.minutes ?? 0);
  }
  return {
    ...next,
    plannedTasks: tasks,
    workers: next.workers.map((worker) =>
      worker.isCasual ? worker : { ...worker, minutesUsed: used[worker.id] ?? 0 },
    ),
  };
}

function removePlannedTask(state, taskId, planId, day = planningDayOf(state)) {
  const tasks = getDayTasks(state, day);
  const planned = planId
    ? tasks.find((item) => item.planId === planId)
    : tasks.find((item) => item.taskId === taskId);
  if (!planned) return state;
  return commitDayTasks(
    state,
    tasks.filter((item) => (planId ? item.planId !== planId : item.taskId !== taskId)),
    day,
  );
}

function recomputePlanningDay(state) {
  const view = planViewState(state);
  const next = recomputePlannedMinutes(view);
  return commitDayTasks(state, next.plannedTasks);
}

function dropUnfittableMowing(state, surface) {
  const view = planViewState(state);
  let next = state;
  for (const planned of [...view.plannedTasks]) {
    const task = getTask(planned.taskId);
    if (!task?.mowing || task.surface !== surface) continue;
    const worker = view.workers.find((item) => item.id === planned.workerId);
    if (!worker) continue;
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
  return dropUnfittableMowing(recomputePlanningDay(next), surface);
}

export function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'LOAD_GAME':
      return action.state;
    case 'PLAN_TASK': {
      const task = getTask(action.taskId);
      const day = actionPlanDay(state, action);
      const check = canPlanTask(state, action.taskId, action.workerId, {
        holes: action.holes,
        machineId: action.machineId,
        confirmDamaging: action.confirmDamaging,
        minutes: action.minutes,
        day,
      });
      if (!task || !check.ok) return state;
      const tasks = [
        ...getDayTasks(state, day),
        {
          planId: state.nextPlanId ?? 1,
          taskId: action.taskId,
          surface: task.surface,
          workerId: check.workerId,
          minutes: check.minutes,
          startMinute: action.startMinute ?? nextStartMinute(getDayTasks(state, day), check.workerId),
          machineId: check.machineId ?? null,
          ownMower: Boolean(check.ownMower),
          holes: check.holes ?? [],
          ...(action.taskId === 'handWater'
            ? { greens: allGreenIds(holeCount(state)) }
            : {}),
        },
      ];
      return commitDayTasks({ ...state, nextPlanId: (state.nextPlanId ?? 1) + 1 }, tasks, day);
    }
    case 'SET_SELECTED_HOLES': {
      const holes = Array.isArray(action.holes) ? [...new Set(action.holes.map(Number))].sort((a, b) => a - b) : [];
      return { ...state, selectedHoles: holes };
    }
    case 'TOGGLE_HOLE': {
      const id = Number(action.holeId);
      if (!Number.isInteger(id) || id < 1) return state;
      const current = state.selectedHoles ?? [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].sort((a, b) => a - b);
      return { ...state, selectedHoles: next };
    }
    case 'ADD_HOLE': {
      const id = Number(action.holeId);
      if (!Number.isInteger(id) || id < 1) return state;
      if ((state.selectedHoles ?? []).includes(id)) return state;
      return { ...state, selectedHoles: [...(state.selectedHoles ?? []), id].sort((a, b) => a - b) };
    }
    case 'SAVE_ROUTE': {
      const check = canSaveRoute(state, action.name);
      if (!check.ok) return state;
      return {
        ...state,
        nextRouteId: (state.nextRouteId ?? 1) + 1,
        savedRoutes: [
          ...(state.savedRoutes ?? []),
          { id: state.nextRouteId ?? 1, name: check.name, holes: [...state.selectedHoles] },
        ],
      };
    }
    case 'APPLY_ROUTE':
      return applyRoute(state, action.id);
    case 'DELETE_ROUTE':
      return {
        ...state,
        savedRoutes: (state.savedRoutes ?? []).filter((item) => item.id !== action.id),
      };
    case 'REPEAT_LAST': {
      const dropped = [];
      let next = { ...state, lastRepeatDropped: [] };
      for (const job of state.lastDayJobs ?? []) {
        const check = canPlanTask(next, job.taskId, undefined, {
          holes: job.holes,
          machineId: job.machineId,
          confirmDamaging: true,
        });
        if (!check.ok) {
          dropped.push({ taskId: job.taskId, holes: job.holes, reason: check.reason });
          continue;
        }
        next = reducer(next, {
          type: 'PLAN_TASK',
          taskId: job.taskId,
          holes: job.holes,
          machineId: job.machineId,
        });
      }
      return { ...next, lastRepeatDropped: dropped };
    }
    case 'REMOVE_TASK':
      return removePlannedTask(state, action.taskId, action.planId, actionPlanDay(state, action));
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
      return startProject(state, action.projectId, action.workerId);
    case 'PAUSE_PROJECT':
      return pauseProject(state, action.projectId);
    case 'RESUME_PROJECT':
      return resumeProject(state, action.projectId);
    case 'START_GRASS_CONVERSION':
      return startGrassConversion(state, action.surface, action.speciesId);
    case 'BUY_AUTO_PICKER':
      return buyAutoPicker(state);
    case 'BUY_MACHINE':
      return buyMachine(state, action.machineId);
    case 'BUY_UPGRADE':
      return buyUpgrade(state, action.machineId, action.upgradeId);
    case 'BUY_USED':
      return buyUsed(state, action.listingId);
    case 'SELL_MACHINE':
      return sellMachine(state, action.machineId);
    case 'BUY_FOLEY':
      return buyFoley(state);
    case 'SET_PLANNING_DAY': {
      const day = Number(action.day);
      if (!Number.isInteger(day) || weekStartDay(day) !== weekStartDay(state.day)) return state;
      return { ...state, planningDay: day };
    }
    case 'BOOK_CASUAL':
      return bookCasual(state, action.casualId, action.day ?? planningDayOf(state));
    case 'UNBOOK_CASUAL':
      return unbookCasual(state, action.casualId, action.day ?? planningDayOf(state));
    case 'SEND_GRIND':
      return sendForGrind(state, action.machineId);
    case 'GRIND_IN_HOUSE':
      return grindInHouse(state, action.machineId);
    case 'REPAIR_MACHINE':
      return repairMachine(state, action.machineId);
    case 'MOVE_TASK': {
      const list = [...getDayTasks(state, planningDayOf(state))];
      const index = list.findIndex((item) => item.taskId === action.taskId);
      const nextIndex = index + action.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return state;
      const swap = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = swap;
      return commitDayTasks(state, list);
    }
    case 'REORDER_TASKS': {
      const order = action.order;
      const current = getDayTasks(state, planningDayOf(state));
      if (!Array.isArray(order) || order.length !== current.length) return state;
      const byId = new Map(current.map((item) => [item.taskId, item]));
      const next = [];
      for (const taskId of order) {
        const item = byId.get(taskId);
        if (!item) return state;
        next.push(item);
        byId.delete(taskId);
      }
      if (byId.size > 0) return state;
      return commitDayTasks(state, next);
    }
    case 'HIRE_WORKER': {
      const candidate = state.candidates.find((item) => item.id === action.candidateId);
      if (!candidate) return state;
      return hireWorker(state, candidate);
    }
    case 'TRAIN_WORKER':
      return trainWorker(state, action.workerId, action.axis);
    case 'FIRE_WORKER':
      return fireWorker(state, action.workerId);
    case 'APPROVE_LEAVE':
      return approveLeave(state, action.requestId);
    case 'DECLINE_LEAVE':
      return declineLeave(state, action.requestId);
    case 'DISMISS_VOLUNTEER':
      return dismissVolunteer(state);
    case 'SET_VOLUNTEER_WEEKDAY':
      return setVolunteerWeekday(state, action.weekday);
    case 'SET_EARLY_START':
      return { ...state, earlyStart: Boolean(action.value) };
    case 'SET_TASK_WORKER': {
      const day = actionPlanDay(state, action);
      const view = planViewState({ ...state, planningDay: day });
      const planned = view.plannedTasks.find((item) => item.taskId === action.taskId);
      const worker =
        view.workers.find((item) => item.id === action.workerId) ?? rosterWorker(state, action.workerId);
      const task = planned ? getTask(planned.taskId) : null;
      if (!planned || !worker || !task) return state;
      if (!workerAllows(worker, task.surface)) return state;
      if (task.requiresSpray && !worker.sprayCertified) return state;
      const probe = {
        ...view,
        plannedTasks: view.plannedTasks.filter((item) => item.taskId !== planned.taskId),
      };
      const machineCheck = machinePlanCheck(probe, task, worker, undefined, planned.holes);
      if (!machineCheck.ok) return state;
      const minutes = durationOnMachine(probe, planned.taskId, worker, machineCheck.machine?.id ?? null, planned.holes);
      const tasks = view.plannedTasks.map((item) =>
        item.taskId === action.taskId
          ? {
              ...item,
              workerId: worker.id,
              minutes,
              machineId: machineCheck.machine?.id ?? null,
              ownMower: Boolean(workerBringsOwnMower(worker, task.surface)),
              needsReassignment: false,
            }
          : item,
      );
      return commitDayTasks(state, tasks, day);
    }
    case 'SET_HOC': {
      if (!hasHoc(action.surface)) return state;
      return applySurfacePatch(state, action.surface, { hoc: clampHoc(action.surface, action.hoc, state) });
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
      return recomputePlanningDay({
        ...state,
        machineOverride: { ...normalizeMachineOverride(state.machineOverride), [surface]: machineId },
      });
    }
    case 'SET_IRRIGATION': {
      if (!IRRIGATED_SURFACES.includes(action.surface)) return state;
      const mm =
        action.mm != null ? action.mm : migrateIrrigationValue(action.surface, action.policy);
      const value = clampIrrigationMm(action.surface, mm);
      const day = actionPlanDay(state, action);
      const edit = canEditPlanDay(state, day);
      if (!edit.ok && day !== state.day) return state;
      const irrigation = { ...irrigationForPlanDay(state, day), [action.surface]: value };
      let next = upsertDayPlan(state, day, { irrigation });
      if (day === state.day) next = { ...next, irrigation: { ...next.irrigation, [action.surface]: value } };
      return next;
    }
    case 'BUY_AERATOR': {
      const check = canBuyAerator(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(spendCapital({ ...state, hasAerator: true }, AERATOR_COST), AERATOR_COST);
    }
    case 'BUY_GREENS_SENSORS': {
      const check = canBuyGreensSensors(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(spendCapital({ ...state, hasGreensSensors: true }, GREENS_SENSORS_COST), GREENS_SENSORS_COST);
    }
    case 'BUY_TURFRAD': {
      const check = canBuyTurfRad(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(spendCapital({ ...state, hasTurfRad: true }, TURFRAD_COST), TURFRAD_COST);
    }
    case 'BUY_WEATHER_STATION': {
      const check = canBuyWeatherStation(state);
      if (!check.ok) return state;
      return bumpCapitalSpent(spendCapital({ ...state, hasWeatherStation: true }, WEATHER_STATION_COST), WEATHER_STATION_COST);
    }
    case 'TOGGLE_MOISTURE_OVERLAY':
      return { ...state, moistureOverlay: !state.moistureOverlay };
    case 'SET_HAND_WATER_TARGETS': {
      const holes = holeCount(state);
      const allowed = new Set(allGreenIds(holes));
      const targets = [...new Set((action.targets ?? []).filter((id) => allowed.has(id)))].sort((a, b) => a - b);
      let next = { ...state, handWaterTargets: targets };
      if (getDayTasks(next, planningDayOf(next)).some((item) => item.taskId === 'handWater')) {
        if (targets.length === 0) return removePlannedTask(next, 'handWater');
        next = commitDayTasks(
          next,
          getDayTasks(next, planningDayOf(next)).map((item) =>
            item.taskId === 'handWater' ? { ...item, greens: targets } : item,
          ),
        );
        next = recomputePlanningDay(next);
        const planned = getDayTasks(next, planningDayOf(next)).find((item) => item.taskId === 'handWater');
        const worker = planned ? workersForPlanDay(next, planningDayOf(next)).find((item) => item.id === planned.workerId) : null;
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
    case 'DISMISS_COLD_WEATHER_TIP':
      return { ...state, coldWeatherTipDone: true };
    case 'DISMISS_GM':
      return dismissGm(state);
    case 'DISMISS_LOCK_HINT':
      return { ...state, lockHint: null };
    case 'DISMISS_YEAR_REVIEW':
      return { ...state, pendingYearReview: false };
    case 'DISMISS_WEEK_REVIEW':
      return { ...state, pendingWeekReview: false };
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
    case 'SET_SECTION': {
      const section = normalizeSection(action.section);
      if (isSectionLocked(state, section)) {
        return { ...state, lockHint: section };
      }
      return { ...state, section, lockHint: null };
    }
    case 'SET_TAB': {
      const section = normalizeSection(action.section);
      const allowed = tabListForSection(section);
      if (!allowed.includes(action.tab)) return state;
      return { ...state, tabs: { ...normalizeTabs(state.tabs), [section]: action.tab } };
    }
    case 'COPY_YESTERDAY':
      return copyYesterday(state, action.day ?? planningDayOf(state));
    case 'COPY_LAST_WEEK':
      return copyLastWeek(state);
    case 'SAVE_TEMPLATE':
      return saveNamedTemplate(state, action.name);
    case 'APPLY_TEMPLATE':
      return applyNamedTemplate(state, action.templateId);
    default:
      return state;
  }
}
