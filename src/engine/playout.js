import {
  PLAYOUT_EMPTY_MS,
  PLAYOUT_END_HOLD_MS,
  PLAYOUT_MIN_EVENT_MS,
  PLAYOUT_MS_PER_MINUTE,
  PLAYOUT_SPEEDS,
  SURFACE_KEYS,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';

export const PLAYOUT_PLAYING = 'playing';
export const PLAYOUT_DONE = 'done';
export const PLAYOUT_SKIPPED = 'skipped';

function cloneSurfaces(surfaces) {
  return SURFACE_KEYS.reduce((next, key) => {
    next[key] = { ...(surfaces?.[key] ?? {}) };
    return next;
  }, {});
}

function isMowingEvent(taskId) {
  if (taskId === 'autonomousMower') return true;
  return Boolean(getTask(taskId)?.mowing);
}

export function normalizePlayoutSpeed(speed) {
  return PLAYOUT_SPEEDS.includes(speed) ? speed : PLAYOUT_SPEEDS[0];
}

export function eventDurationMs(event, speed) {
  const rate = normalizePlayoutSpeed(speed);
  if (event?.hold) return PLAYOUT_END_HOLD_MS / rate;
  const minutes = Number(event?.minutes) || 0;
  const raw = minutes > 0 ? Math.max(PLAYOUT_MIN_EVENT_MS, minutes * PLAYOUT_MS_PER_MINUTE) : PLAYOUT_EMPTY_MS;
  return raw / rate;
}

export function buildPlayout(summary) {
  const events = (summary?.done ?? []).map((item) => ({
    taskId: item.taskId,
    name: item.name,
    surface: item.surface ?? null,
    minutes: item.minutes ?? 0,
    before: item.before,
    after: item.after,
    mowing: isMowingEvent(item.taskId),
    hold: false,
  }));
  if (events.length === 0) {
    events.push({
      taskId: null,
      name: 'Nothing went out',
      surface: null,
      minutes: 0,
      before: null,
      after: null,
      mowing: false,
      hold: false,
    });
  }
  events.push({
    taskId: null,
    name: 'Day in',
    surface: null,
    minutes: 0,
    before: null,
    after: null,
    mowing: false,
    hold: true,
  });
  return {
    day: summary?.day ?? 0,
    events,
    cursor: 0,
    elapsedMs: 0,
    status: PLAYOUT_PLAYING,
  };
}

export function skipPlayout(playout) {
  if (!playout) return playout;
  return {
    ...playout,
    cursor: playout.events.length,
    elapsedMs: 0,
    status: PLAYOUT_SKIPPED,
  };
}

export function tickPlayout(playout, dtMs, speed) {
  if (!playout || playout.status !== PLAYOUT_PLAYING) return playout;
  let elapsed = playout.elapsedMs + Math.max(0, dtMs);
  let cursor = playout.cursor;
  while (cursor < playout.events.length) {
    const duration = eventDurationMs(playout.events[cursor], speed);
    if (elapsed < duration) {
      return { ...playout, cursor, elapsedMs: elapsed, status: PLAYOUT_PLAYING };
    }
    elapsed -= duration;
    cursor += 1;
  }
  return { ...playout, cursor: playout.events.length, elapsedMs: 0, status: PLAYOUT_DONE };
}

export function currentPlayoutEvent(playout) {
  if (!playout || playout.status !== PLAYOUT_PLAYING) return null;
  return playout.events[playout.cursor] ?? null;
}

export function playoutSurfaces(summary, playout) {
  const surfaces = cloneSurfaces(summary?.before);
  if (!playout) return surfaces;
  const applied = playout.status === PLAYOUT_PLAYING ? playout.cursor : playout.events.length;
  for (let i = 0; i < applied; i += 1) {
    const event = playout.events[i];
    if (event?.surface && event.after != null && surfaces[event.surface]) {
      surfaces[event.surface] = { ...surfaces[event.surface], quality: event.after };
    }
  }
  return surfaces;
}

export function shouldSkipPlayout(skipPref, reducedMotion) {
  return Boolean(skipPref) || Boolean(reducedMotion);
}
