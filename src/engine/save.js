import {
  POND_HEALTH_START,
  POND_START_VOLUME,
  SAVE_KEY,
  STARTING_IRRIGATION,
  STARTING_MACHINE_ID,
} from '../data/constants.js';

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
