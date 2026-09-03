import {
  DAYS_PER_WEEK,
  GM_MEETING_LEAD_DAYS,
  MOISTURE_SURFACES,
  MORALE_BADGE_BELOW,
  SURFACE_KEYS,
} from '../data/constants.js';
import { unreadCount } from './mail.js';
import { moistureStatus, outOfBand } from './moisture.js';
import { isNeglected } from './neglect.js';

export function overdueSurfaces(state) {
  return SURFACE_KEYS.filter((surface) => isNeglected(state, surface));
}

export function turfBadgeCount(state) {
  return overdueSurfaces(state).length;
}

export function hasDiseaseOutbreak(state) {
  return SURFACE_KEYS.some((surface) => Boolean(state.disease?.[surface]?.outbreak));
}

export function hasMoistureOutOfBand(state) {
  return MOISTURE_SURFACES.some((surface) => {
    const status = moistureStatus(state, surface);
    return status.kind !== 'hidden' && outOfBand(status.value, surface);
  });
}

export function turfDot(state) {
  return hasDiseaseOutbreak(state) || hasMoistureOutOfBand(state);
}

export function daysUntilGmMeeting(day) {
  const rem = day % DAYS_PER_WEEK;
  if (rem === 0) return 0;
  return DAYS_PER_WEEK - rem;
}

export function tournamentDecisionOpen(state) {
  return Boolean(state.pendingTournamentSetup || state.gmTournamentRequestPending);
}

export function officeBadgeCount(state) {
  return unreadCount(state);
}

export function officeDot(state) {
  return daysUntilGmMeeting(state.day) === GM_MEETING_LEAD_DAYS || tournamentDecisionOpen(state);
}

export function lowMoraleWorkers(state) {
  return (state.workers ?? []).filter((worker) => (worker.morale ?? 100) < MORALE_BADGE_BELOW);
}

export function waitingComplaints(state) {
  return (state.inbox ?? []).filter(
    (item) => !item.read && (item.from === 'golfer' || item.kind === 'neglect' || item.kind === 'greensQuality'),
  );
}

export function crewBadgeCount(state) {
  return lowMoraleWorkers(state).length + waitingComplaints(state).length;
}

export function returningTomorrow(state) {
  return (state.workers ?? []).filter((worker) => worker.trainingUntilDay === state.day + 1);
}

export function crewDot(state) {
  return returningTomorrow(state).length > 0;
}

export function downMachines(state) {
  return (state.ownedMachines ?? []).filter((id) => {
    if (state.machineBroken?.[id]) return true;
    const away = state.machineAwayUntil?.[id];
    return Boolean(away && state.day < away);
  });
}

export function shedBadgeCount(state) {
  return downMachines(state).length;
}

export function shedDot(state) {
  if ((state.usedListings ?? []).length > 0) return true;
  if ((state.activeSales ?? []).length > 0) return true;
  if (state.lastDeliveryDay === state.day) return true;
  return (state.pendingDeliveries ?? []).some((item) => item.arrivesDay === state.day);
}

export function sectionBadge(state, section) {
  if (section === 'turf') return { count: turfBadgeCount(state), dot: turfDot(state) };
  if (section === 'office') return { count: officeBadgeCount(state), dot: officeDot(state) };
  if (section === 'crew') return { count: crewBadgeCount(state), dot: crewDot(state) };
  if (section === 'shed') return { count: shedBadgeCount(state), dot: shedDot(state) };
  return { count: 0, dot: false };
}
