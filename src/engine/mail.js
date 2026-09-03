import {
  DAYS_PER_WEEK,
  COMPLAINT_GREENS_QUALITY,
  SURFACE_KEYS,
} from '../data/constants.js';
import { formatMoney } from './format.js';

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
    ...(mail.deadlineDay != null ? { deadlineDay: mail.deadlineDay } : {}),
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

export function golferMail(state) {
  const mail = [];
  if (state.surfaces.greens.quality < COMPLAINT_GREENS_QUALITY && meetingDue(state.day)) {
    mail.push({
      from: 'golfer',
      kind: 'greensQuality',
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
      body: `Maintenance grant ${formatMoney(maintenance)}.${yearChanged ? ` Capital grant ${formatMoney(capital)}.` : ' Unspent capital is gone.'} Unspent maintenance ${formatMoney(leftover)} rolled to cash.`,
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

export function gmTournamentRequestMail(season, deadlineDay) {
  const winter = season === 'winter';
  const deadline = deadlineDay != null ? ` Answer by day ${deadlineDay}.` : '';
  return {
    from: 'gm',
    kind: 'tournamentRequest',
    subject: winter ? 'Winter tournament? Risky.' : `Dates for ${season}`,
    body: winter
      ? `Winter golf is a gamble. Rain on the day caps the result at Acceptable. One date, optional.${deadline}`
      : `The committee wants dates for ${season}. Pick how many and we will publish them.${deadline}`,
    deadlineDay,
  };
}

export function gmMissedTournamentMail(season) {
  return {
    from: 'gm',
    kind: 'tournamentMissed',
    subject: `No ${season} dates`,
    body: `You never answered. We published nothing for ${season}. The committee noticed the empty calendar.`,
  };
}
