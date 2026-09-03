export function presetsForSurface(state, surface) {
  return (state.customPresets ?? []).filter((item) => item.surface === surface);
}
