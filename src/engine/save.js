import {
  GM_STANDING_START,
  HOLE_COUNT,
  POND_HEALTH_START,
  POND_START_VOLUME,
  SATISFACTION_START,
  SAVE_KEY,
  SAVE_VERSION,
  SOUND_DEFAULT_ON,
  STARTING_CAPITAL_BUDGET,
  STARTING_IRRIGATION,
  STARTING_MACHINE_ID,
  STARTING_MAINTENANCE_BUDGET,
  STARTING_RNG_SEED,
  STARTING_WIND_DIR,
  STARTING_WIND_SPEED,
  SURFACE_KEYS,
  FORECAST_DAYS,
  VIEW_PAN_X_DEFAULT,
  VIEW_PAN_Y_DEFAULT,
  VIEW_ZOOM_DEFAULT,
  PLAYOUT_SPEED_DEFAULT,
  PLAYOUT_SKIP_DEFAULT,
  PLAYOUT_SPEEDS,
} from '../data/constants.js';
import { emptyDisease, emptyUntil } from './disease.js';
import { emptyYearRecord } from './history.js';
import { emptyDaysSinceWorked } from './mail.js';
import { mergeSurfaceFields } from './mowing.js';
import { migrateMoisture } from './moisture.js';
import { createRng } from './rng.js';
import { buildForecast } from './weather.js';
import { normalizeSection, normalizeTabs } from './section.js';

export function withDefaults(state) {
  const surfaces = state.surfaces?.greens
    ? SURFACE_KEYS.reduce((next, key) => {
        next[key] = mergeSurfaceFields(key, state.surfaces?.[key] ?? {});
        return next;
      }, {})
    : state.surfaces;
  const plannedTasks = (state.plannedTasks ?? []).map((item) => {
    const rest = { ...item };
    delete rest.level;
    return rest;
  });
  let rngSeed = state.rngSeed;
  let forecast = state.forecast;
  let weatherQueue = state.weatherQueue;
  let forecastStrip = state.forecastStrip;
  let windSpeed = state.windSpeed ?? STARTING_WIND_SPEED;
  let windDir = state.windDir ?? STARTING_WIND_DIR;
  if (
    !Array.isArray(weatherQueue) ||
    weatherQueue.length !== FORECAST_DAYS ||
    !Array.isArray(forecastStrip) ||
    forecastStrip.length !== FORECAST_DAYS
  ) {
    const rng = createRng(rngSeed ?? STARTING_RNG_SEED);
    const built = buildForecast({ ...state, day: state.day ?? 1 }, rng);
    weatherQueue = built.weatherQueue;
    forecastStrip = built.forecastStrip;
    forecast = built.forecast;
    windSpeed = built.windSpeed;
    windDir = built.windDir;
    rngSeed = rng.seed;
  }
  return {
    ...state,
    surfaces,
    plannedTasks,
    forecast,
    weatherQueue,
    forecastStrip,
    windSpeed,
    windDir,
    rngSeed,
    view: {
      zoom: state.view?.zoom ?? VIEW_ZOOM_DEFAULT,
      panX: state.view?.panX ?? VIEW_PAN_X_DEFAULT,
      panY: state.view?.panY ?? VIEW_PAN_Y_DEFAULT,
    },
    ownedMachines: state.ownedMachines ?? [STARTING_MACHINE_ID],
    machineWear: state.machineWear ?? { [STARTING_MACHINE_ID]: 0 },
    machineBroken: state.machineBroken ?? {},
    machineAwayUntil: state.machineAwayUntil ?? {},
    hasFoleyGrinder: Boolean(state.hasFoleyGrinder),
    autoWeek: state.autoWeek ?? { weekStart: state.day ?? 1, hits: [] },
    pond: state.pond ?? { volume: POND_START_VOLUME, health: POND_HEALTH_START },
    irrigation: state.irrigation ?? { ...STARTING_IRRIGATION },
    hasAerator: Boolean(state.hasAerator),
    ...migrateMoisture(state),
    maintenanceBudget: state.maintenanceBudget ?? STARTING_MAINTENANCE_BUDGET,
    capitalBudget: state.capitalBudget ?? STARTING_CAPITAL_BUDGET,
    disease: state.disease ?? emptyDisease(),
    sprayedUntil: state.sprayedUntil ?? emptyUntil(),
    fertiliserUntil: state.fertiliserUntil ?? emptyUntil(),
    satisfaction: state.satisfaction ?? SATISFACTION_START,
    gmStanding: state.gmStanding ?? GM_STANDING_START,
    leasedMachines: state.leasedMachines ?? [],
    loan: state.loan ?? null,
    lastSeasonRevenue: state.lastSeasonRevenue ?? 0,
    seasonRevenue: state.seasonRevenue ?? 0,
    insolventStreak: state.insolventStreak ?? 0,
    dismissed: Boolean(state.dismissed),
    inbox: state.inbox ?? [],
    nextMailId: state.nextMailId ?? 1,
    daysSinceWorked: state.daysSinceWorked ?? emptyDaysSinceWorked(),
    snappedToday: Boolean(state.snappedToday),
    pendingTournamentSetup: Boolean(state.pendingTournamentSetup),
    gmTournamentRequestPending: Boolean(state.gmTournamentRequestPending),
    tournamentSetupSeason: state.tournamentSetupSeason ?? null,
    tournamentSetupDeadline: state.tournamentSetupDeadline ?? null,
    tournamentSetupStartDay: state.tournamentSetupStartDay ?? null,
    tournaments: state.tournaments ?? [],
    tournamentPrepScore: state.tournamentPrepScore ?? 0,
    projects: state.projects ?? [],
    hasDrivingRange: Boolean(state.hasDrivingRange),
    hasAutoPicker: Boolean(state.hasAutoPicker),
    hasExtraBunkers: Boolean(state.hasExtraBunkers),
    hasNewTees: Boolean(state.hasNewTees),
    holes: state.holes ?? HOLE_COUNT,
    saveVersion: state.saveVersion ?? SAVE_VERSION,
    soundEnabled: state.soundEnabled ?? SOUND_DEFAULT_ON,
    tutorialDone: Boolean(state.tutorialDone),
    pendingYearReview: Boolean(state.pendingYearReview),
    lastYearReview: state.lastYearReview ?? null,
    yearRecord: state.yearRecord ?? emptyYearRecord(state.year ?? 1, []),
    playoutSpeed: PLAYOUT_SPEEDS.includes(state.playoutSpeed) ? state.playoutSpeed : PLAYOUT_SPEED_DEFAULT,
    skipPlayout: Boolean(state.skipPlayout ?? PLAYOUT_SKIP_DEFAULT),
    customPresets: Array.isArray(state.customPresets) ? state.customPresets : [],
    nextPresetId: Number.isInteger(state.nextPresetId) && state.nextPresetId > 0 ? state.nextPresetId : 1,
    section: normalizeSection(state.section),
    tabs: normalizeTabs(state.tabs),
  };
}

function isUsable(state) {
  return Boolean(state && typeof state.day === 'number' && state.surfaces?.greens);
}

export function migrateSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const migrated = withDefaults(raw);
  return isUsable(migrated) ? migrated : null;
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
