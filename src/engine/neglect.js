import { NEGLECT_GM_MULTIPLIER, NEGLECT_GOLFER_AFTER, NEGLECT_SATISFACTION_PENALTY, NEGLECT_THRESHOLD, SURFACE_KEYS } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';

export function lastWorkedDay(surfaceState, surface) {
  if (!surfaceState) return null;
  return surface === 'bunkers' ? surfaceState.lastRakedDay : surfaceState.lastMownDay;
}

export function daysSinceLastWorked(state, surface) {
  const last = lastWorkedDay(state.surfaces?.[surface], surface);
  if (last == null) return 0;
  return Math.max(0, state.day - last);
}

export function neglectThreshold(surface) {
  return NEGLECT_THRESHOLD[surface];
}

export function neglectDoubleThreshold(surface) {
  return NEGLECT_THRESHOLD[surface] * NEGLECT_GM_MULTIPLIER;
}

export function isNeglected(state, surface) {
  return daysSinceLastWorked(state, surface) >= neglectThreshold(surface);
}

export function isDoubleNeglected(state, surface) {
  return daysSinceLastWorked(state, surface) >= neglectDoubleThreshold(surface);
}

export function neglectSatisfactionDrain(state) {
  return SURFACE_KEYS.reduce((total, surface) => {
    if (isDoubleNeglected(state, surface)) return total + NEGLECT_SATISFACTION_PENALTY;
    return total;
  }, 0);
}

export function neglectMail(state) {
  const mail = [];
  for (const surface of SURFACE_KEYS) {
    const days = daysSinceLastWorked(state, surface);
    const verb = surface === 'bunkers' ? 'raked' : 'cut';
    const label = SURFACE_LABELS[surface];
    if (days === neglectThreshold(surface) + NEGLECT_GOLFER_AFTER) {
      mail.push({
        from: 'golfer',
        kind: surface,
        subject: `${label} left too long`,
        body: `The ${label.toLowerCase()} have not been ${verb} in ${days} days.`,
      });
    }
    if (days === neglectDoubleThreshold(surface)) {
      mail.push({
        from: 'gm',
        kind: 'neglect',
        subject: `${label} are costing us golfers`,
        body: `The ${label.toLowerCase()} have not been ${verb} in ${days} days. Members are writing in. This is now a committee problem.`,
      });
    }
  }
  return mail;
}
