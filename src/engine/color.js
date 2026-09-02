import { QUALITY_MAX, turf, turfStressed } from '../data/constants.js';

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex(channel) {
  return channel.toString(16).padStart(2, '0');
}

export function lerpHex(from, to, t) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bch = Math.round(a.b + (b.b - a.b) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bch)}`;
}

export function qualityColor(quality) {
  return lerpHex(turfStressed, turf, quality / QUALITY_MAX);
}
