import {
  BUNKER_STRESS_MIX,
  BUNKER_DULL,
  BOUNDARY_DARKEN,
  GREEN_OUTLINE_MIX,
  QUALITY_MAX,
  SURFACE_DARKEN_ROUGH,
  SURFACE_LIGHTEN_GREENS,
  SURFACE_LIGHTEN_TEES,
  SURFACE_STRESS_MIX,
  paint,
  sand,
  soil,
  turf,
  turfStressed,
} from '../data/constants.js';

export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex(channel) {
  return Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0');
}

export function lerpHex(from, to, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * clamped);
  const g = Math.round(a.g + (b.g - a.g) * clamped);
  const bch = Math.round(a.b + (b.b - a.b) * clamped);
  return `#${toHex(r)}${toHex(g)}${toHex(bch)}`;
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function healthyFill(surface) {
  if (surface === 'greens') return lerpHex(turf, paint, SURFACE_LIGHTEN_GREENS);
  if (surface === 'tees') return lerpHex(turf, paint, SURFACE_LIGHTEN_TEES);
  if (surface === 'rough') return lerpHex(turf, soil, SURFACE_DARKEN_ROUGH);
  if (surface === 'bunkers') return sand;
  return turf;
}

export function stressedFill(surface) {
  if (surface === 'bunkers') return lerpHex(sand, BUNKER_DULL, BUNKER_STRESS_MIX);
  return lerpHex(healthyFill(surface), turfStressed, SURFACE_STRESS_MIX);
}

export function surfaceFill(surface, quality) {
  return lerpHex(stressedFill(surface), healthyFill(surface), quality / QUALITY_MAX);
}

export function boundaryFill() {
  return lerpHex(healthyFill('rough'), soil, BOUNDARY_DARKEN);
}

export function greenOutline(quality) {
  return lerpHex(surfaceFill('greens', quality), soil, GREEN_OUTLINE_MIX);
}

export function qualityColor(quality) {
  return surfaceFill('fairways', quality);
}

export function inPaletteRange(hex, swatches) {
  const rgb = hexToRgb(hex);
  const channels = swatches.map(hexToRgb);
  const min = {
    r: Math.min(...channels.map((c) => c.r)),
    g: Math.min(...channels.map((c) => c.g)),
    b: Math.min(...channels.map((c) => c.b)),
  };
  const max = {
    r: Math.max(...channels.map((c) => c.r)),
    g: Math.max(...channels.map((c) => c.g)),
    b: Math.max(...channels.map((c) => c.b)),
  };
  return rgb.r >= min.r && rgb.r <= max.r && rgb.g >= min.g && rgb.g <= max.g && rgb.b >= min.b && rgb.b <= max.b;
}
