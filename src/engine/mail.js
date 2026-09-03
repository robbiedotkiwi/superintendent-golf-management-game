import {
  DAYS_PER_WEEK,
  BUNKER_NEGLECT_DAYS,
  COMPLAINT_GREENS_QUALITY,
  COMPLAINT_ROUGH_DAYS,
  SURFACE_KEYS,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';

export function emptyDaysSinceWorked() {
  return SURFACE_KEYS.reduce((next, key) => {
    next[key] = 0;
    return next;
  }, {});
}

export function tickDaysSinceWorked(prev, worked) {
  const next = { ...emptyDaysSinceWorked(), ...prev };
  for (const key of SURFACE_KEYS) {
    next[key] = worked.has(key) ? 0 : (next[key] ?? 0) + 1;
  }
  return next;
}

export function pushMail(state, mail) {
  const id = state.nextMailId ?? 1;
  const entry = {
    id,
    read: false,
    day: state.day,
    from: mail.from,
    kind: mail.kind,
    subject: mail.subject,
    body: mail.body,
  };
  return {
    ...state,
    nextMailId: id + 1,
    inbox: [...(state.inbox ?? []), entry],
  };
}

export function unreadCount(state) {
  return (state.inbox ?? []).filter((item) => !item.read).length;
}

export function markMailRead(state, id) {
  return {
    ...state,
    inbox: (state.inbox ?? []).map((item) => (item.id === id ? { ...item, read: true } : item)),
  };
}

export function golferMail(state, daysSinceWorked) {
  const mail = [];
  if ((daysSinceWorked.bunkers ?? 0) > 0 && (daysSinceWorked.bunkers ?? 0) % BUNKER_NEGLECT_DAYS === 0) {
    mail.push({
      from: 'golfer',
      kind: 'bunkers',
      subject: 'Bunkers are a disgrace',
      body: `The ${SURFACE_LABELS.bunkers.toLowerCase()} have not been raked in ${daysSinceWorked.bunkers} days.`,
    });
  }
  if ((daysSinceWorked.rough ?? 0) > 0 && (daysSinceWorked.rough ?? 0) % COMPLAINT_ROUGH_DAYS === 0) {
    mail.push({
      from: 'golfer',
      kind: 'rough',
      subject: 'Rough is eating balls',
      body: 'The rough has not been cut. People are losing golf balls and patience.',
    });
  }
  if (state.surfaces.greens.quality < COMPLAINT_GREENS_QUALITY && meetingDue(state.day)) {
    mail.push({
      from: 'golfer',
      kind: 'greens',
      subject: 'Greens are slow',
      body: 'The greens are slow and bumpy. Something needs to happen.',
    });
  }
  return mail;
}

export function gmSeasonMail({ leftover, insolvent, yearChanged, maintenance, capital }) {
  const mail = [
    {
      from: 'gm',
      kind: 'budget',
      subject: yearChanged ? 'Year budgets posted' : 'Season maintenance posted',
      body: `Maintenance grant ${Math.round(maintenance)}.${yearChanged ? ` Capital grant ${Math.round(capital)}.` : ' Unspent capital is gone.'} Unspent maintenance ${Math.round(leftover)} rolled to cash.`,
    },
  ];
  if (insolvent) {
    mail.push({
      from: 'gm',
      kind: 'solvency',
      subject: 'We are in the red',
      body: 'Cash is below zero at season end. Another one and you are out.',
    });
  }
  return mail;
}

export function meetingDue(day) {
  return day % DAYS_PER_WEEK === 0;
}
