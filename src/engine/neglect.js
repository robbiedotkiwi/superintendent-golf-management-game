import {
  COMPLAINT_HOLE_CUT_BODY,
  COMPLAINT_HOLE_CUT_SUBJECT,
  COMPLAINT_HOLE_RAKE_BODY,
  NEGLECT_GM_MULTIPLIER,
  NEGLECT_GOLFER_AFTER,
  NEGLECT_SATISFACTION_PENALTY,
  NEGLECT_THRESHOLD,
  SURFACE_KEYS,
  SURFACE_SINGULAR,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { daysSinceHoleWorked, presentHoles } from './holes.js';

export function lastWorkedDay(surfaceState, surface) {
  if (!surfaceState) return null;
  return surface === 'bunkers' ? surfaceState.lastRakedDay : surfaceState.lastMownDay;
}

export function daysSinceLastWorked(state, surface) {
  const holes = presentHoles(state, surface);
  if (!holes.length) return 0;
  return Math.max(...holes.map((hole) => daysSinceHoleWorked(state, hole.id, surface)));
}

export function neglectThreshold(surface) {
  return NEGLECT_THRESHOLD[surface];
}

export function neglectDoubleThreshold(surface) {
  return NEGLECT_THRESHOLD[surface] * NEGLECT_GM_MULTIPLIER;
}

export function isHoleNeglected(state, holeId, surface) {
  return daysSinceHoleWorked(state, holeId, surface) >= neglectThreshold(surface);
}

export function isNeglected(state, surface) {
  return presentHoles(state, surface).some((hole) => isHoleNeglected(state, hole.id, surface));
}

export function isDoubleNeglected(state, surface) {
  return presentHoles(state, surface).some(
    (hole) => daysSinceHoleWorked(state, hole.id, surface) >= neglectDoubleThreshold(surface),
  );
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
    const verb = surface === 'bunkers' ? 'raked' : 'cut';
    const label = SURFACE_LABELS[surface];
    const singular = SURFACE_SINGULAR[surface];
    const bodyFn = surface === 'bunkers' ? COMPLAINT_HOLE_RAKE_BODY : COMPLAINT_HOLE_CUT_BODY;
    for (const hole of presentHoles(state, surface)) {
      const days = daysSinceHoleWorked(state, hole.id, surface);
      if (days === neglectThreshold(surface) + NEGLECT_GOLFER_AFTER) {
        mail.push({
          from: 'golfer',
          kind: surface,
          subject: COMPLAINT_HOLE_CUT_SUBJECT(label, hole.id),
          body: bodyFn(singular, hole.id, days),
        });
      }
      if (days === neglectDoubleThreshold(surface)) {
        mail.push({
          from: 'gm',
          kind: 'neglect',
          subject: `${label} on ${hole.id} are costing us golfers`,
          body: `${bodyFn(singular, hole.id, days)} Members are writing in. This is now a committee problem.`,
        });
      }
    }
  }
  return mail;
}
