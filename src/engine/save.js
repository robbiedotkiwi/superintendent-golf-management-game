import {
  GM_STANDING_START,
  POND_HEALTH_START,
  POND_START_VOLUME,
  SATISFACTION_START,
  SAVE_KEY,
  STARTING_CAPITAL_BUDGET,
  STARTING_IRRIGATION,
  STARTING_MACHINE_ID,
  STARTING_MAINTENANCE_BUDGET,
} from '../data/constants.js';
import { emptyDisease, emptyUntil } from './disease.js';
import { emptyDaysSinceWorked } from './mail.js';

function withDefaults(state) {
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
  };
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return withDefaults(JSON.parse(raw));
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
