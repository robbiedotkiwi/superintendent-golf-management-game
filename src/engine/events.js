import {
  DAYS_PER_SEASON,
  EVENT_ACCEPT_STANDING,
  EVENT_DECLINE_STANDING,
  EVENT_INVITE_DAY_OF_SEASON,
  EVENT_KIND_MEMBER_DAY,
  EVENT_MAIL_KIND,
  EVENT_RESPOND_DAYS,
  EVENT_RESPONSE_ACCEPT,
  EVENT_RESPONSE_DECLINE,
} from '../data/constants.js';
import { pushMail } from './mail.js';
import { clampStanding } from './satisfaction.js';

export function dayOfSeason(day) {
  return ((day - 1) % DAYS_PER_SEASON) + 1;
}

export function invitationById(state, inviteId) {
  return (state.eventInvitations ?? []).find((item) => item.id === inviteId) ?? null;
}

function seasonStamp(state) {
  return `${state.year}-${state.season}`;
}

export function tickEvents(state) {
  if (dayOfSeason(state.day) !== EVENT_INVITE_DAY_OF_SEASON) return state;
  const stamp = seasonStamp(state);
  if ((state.eventInvitations ?? []).some((item) => item.seasonStamp === stamp)) return state;
  const invite = {
    id: `event-${state.day}`,
    kind: EVENT_KIND_MEMBER_DAY,
    day: state.day,
    respondBy: state.day + EVENT_RESPOND_DAYS,
    seasonStamp: stamp,
    response: null,
  };
  return pushMail(
    {
      ...state,
      eventInvitations: [...(state.eventInvitations ?? []), invite],
    },
    {
      from: 'club',
      kind: EVENT_MAIL_KIND,
      inviteId: invite.id,
      deadlineDay: invite.respondBy,
      subject: 'Member day invitation',
      body: 'The members want a mid-season day on the course. Accept and the GM notices. Decline and standing dips.',
    },
  );
}

export function canRespondToEvent(state, inviteId) {
  const invite = invitationById(state, inviteId);
  if (!invite) return { ok: false, reason: 'That invitation is gone.' };
  if (invite.response) return { ok: false, reason: 'Already answered.' };
  return { ok: true, invite };
}

export function acceptEvent(state, inviteId) {
  const check = canRespondToEvent(state, inviteId);
  if (!check.ok) return state;
  return {
    ...state,
    gmStanding: clampStanding((state.gmStanding ?? 0) + EVENT_ACCEPT_STANDING),
    eventInvitations: (state.eventInvitations ?? []).map((item) =>
      item.id === inviteId ? { ...item, response: EVENT_RESPONSE_ACCEPT } : item,
    ),
    inbox: (state.inbox ?? []).map((item) => (item.inviteId === inviteId ? { ...item, read: true } : item)),
  };
}

export function declineEvent(state, inviteId) {
  const check = canRespondToEvent(state, inviteId);
  if (!check.ok) return state;
  return {
    ...state,
    gmStanding: clampStanding((state.gmStanding ?? 0) - EVENT_DECLINE_STANDING),
    eventInvitations: (state.eventInvitations ?? []).map((item) =>
      item.id === inviteId ? { ...item, response: EVENT_RESPONSE_DECLINE } : item,
    ),
    inbox: (state.inbox ?? []).map((item) => (item.inviteId === inviteId ? { ...item, read: true } : item)),
  };
}
