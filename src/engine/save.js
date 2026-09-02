import { SAVE_KEY, STARTING_MACHINE_ID } from '../data/constants.js';

function withDefaults(state) {
  if (state.ownedMachines) return state;
  return {
    ...state,
    ownedMachines: [STARTING_MACHINE_ID],
    machineWear: { [STARTING_MACHINE_ID]: 0 },
    machineBroken: {},
    machineAwayUntil: {},
    hasFoleyGrinder: false,
    autoWeek: { weekStart: state.day ?? 1, hits: [] },
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
