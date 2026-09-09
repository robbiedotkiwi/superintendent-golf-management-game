import {
  SOUND_BIRD_FREQ,
  SOUND_BIRD_FREQ_B,
  SOUND_MOWER_FREQ,
  SOUND_TICK_MS,
} from '../data/constants.js';

let audioCtx = null;

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function context() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function beep(freq, duration, type = 'sine', gainValue = 0.04) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  osc.start(now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.stop(now + duration);
}

export function playMower(enabled) {
  if (!enabled) return;
  beep(SOUND_MOWER_FREQ, SOUND_TICK_MS / 1000, 'sawtooth', 0.03);
}

export function playBirds(enabled) {
  if (!enabled) return;
  beep(SOUND_BIRD_FREQ, 0.08, 'sine', 0.03);
  setTimeout(() => beep(SOUND_BIRD_FREQ_B, 0.07, 'sine', 0.03), 90);
}
