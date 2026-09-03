import { SHIPPED_PRESETS } from '../data/constants.js';

export function presetsForSurface(state, surface) {
  return (state.customPresets ?? []).filter((item) => item.surface === surface);
}

export function shippedPresetById(id) {
  return SHIPPED_PRESETS.find((item) => item.id === id) ?? null;
}

export function shippedPresets() {
  return SHIPPED_PRESETS;
}
