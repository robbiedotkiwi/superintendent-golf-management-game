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
} from '../data/constants.js';
import { emptyDisease, emptyUntil } from './disease.js';
import { emptyYearRecord } from './history.js';
import { emptyDaysSinceWorked } from './mail.js';

export function withDefaults(state) {
  return {
    ...state,
    ownedMachines: state.ownedMachines ?? [STARTING_MACHINE_ID],
    machineWear: state.machineWear ?? { [STARTING_MACHINE_ID]: 0 },
    machineBroken: state.machineBroken ?? {},
    machineAwayUntil: state.machineAwayUntil ?? {},
    hasFoleyGrinder: Boolean(state.hasFoleyGrinder),
    autoWeek: state.autoWeek ?? { weekStart: state.day ?? 1, hits: [] },
    pond: state.pond ?? { volume: POND_START_VOLUME, health: POND_HEALTH_START },
    irrigation: state.irrigation ?? { ...STARTING_IRRIGATION },
    hasAerator: Boolean(state.hasAerator),
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
