import {
  FUEL_LOW_FRACTION,
  FUEL_TANK_CAPACITY,
  GM_UNLOCK_CREW_DAY,
  GM_UNLOCK_OFFICE_DAY,
  GM_WAGE_WEEK_DAYS,
  MOWING_WEATHER,
  SATISFACTION_MOVE_POINTS,
  SATISFACTION_START,
  SECTION_CREW,
  SECTION_OFFICE,
} from '../data/constants.js';
import { overdueSurfaces } from './badges.js';
import { cashOnHand } from './cash.js';
import { wageBill } from './staff.js';

export const GM_MSG_DAY1 = 'gmDay1';
export const GM_MSG_DAY2 = 'gmDay2';
export const GM_MSG_DAY3 = 'gmDay3';
export const GM_MSG_DAY7 = 'gmDay7';
export const GM_TRIGGER_RAIN = 'gmRain';
export const GM_TRIGGER_FUEL = 'gmFuel';
export const GM_TRIGGER_OVERDUE = 'gmOverdue';
export const GM_TRIGGER_BREAKDOWN = 'gmBreakdown';
export const GM_TRIGGER_CASH = 'gmCash';
export const GM_TRIGGER_SAT = 'gmSatisfaction';

export const GM_MESSAGE_IDS = [
  GM_MSG_DAY1,
  GM_MSG_DAY2,
  GM_MSG_DAY3,
  GM_MSG_DAY7,
  GM_TRIGGER_RAIN,
  GM_TRIGGER_FUEL,
  GM_TRIGGER_OVERDUE,
  GM_TRIGGER_BREAKDOWN,
  GM_TRIGGER_CASH,
  GM_TRIGGER_SAT,
];

export const GM_MESSAGES = {
  [GM_MSG_DAY1]: {
    from: 'The GM',
    body: "I'm the GM. Nine holes, members who notice, and not enough daylight. Keep the course playable. That's the job.",
  },
  [GM_MSG_DAY2]: {
    from: 'The GM',
    body: "Pick the holes you can actually finish, put the work on the plan, and watch the time. An empty bar is a worse course tomorrow.",
  },
  [GM_MSG_DAY3]: {
    from: 'The GM',
    body: "Volunteer is in today. Crew is open — that's your people. Don't waste them on jobs they can't do.",
  },
  [GM_MSG_DAY7]: {
    from: 'The GM',
    body: "Office is yours. Mail, money, the season. I expect you to see a hole in the books coming, not explain it after.",
  },
  [GM_TRIGGER_RAIN]: {
    from: 'The GM',
    body: "You can't mow this. Do the work that still happens in the wet, or sit tight. Don't chew the greens to prove a point.",
  },
  [GM_TRIGGER_FUEL]: {
    from: 'The GM',
    body: "Tank's getting low. Fuel's in the shed. Ride-ons drink it. Running dry mid-job leaves holes half done.",
  },
  [GM_TRIGGER_OVERDUE]: {
    from: 'The GM',
    body: "That surface is past it. Neglect shows on the card. Catch it up before I start hearing about it from members.",
  },
  [GM_TRIGGER_BREAKDOWN]: {
    from: 'The GM',
    body: "Machine's down. Get it repaired or the job sits. Condition is what keeps them running.",
  },
  [GM_TRIGGER_CASH]: {
    from: 'The GM',
    body: "You've got less than a week's wages sitting there. Open the forecast. The season grant is what keeps this place solvent — if we still look like a golf club.",
  },
  [GM_TRIGGER_SAT]: {
    from: 'The GM',
    body: "Members noticed. Satisfaction is how we get paid at season end. Don't treat it as decoration.",
  },
};

export const GM_LOCK_HINT = {
  [SECTION_CREW]: "Locked. I'll open this when you've got a crew to run.",
  [SECTION_OFFICE]: "Locked. I'll call you into the office when I need you there.",
};

export function emptySectionUnlocks() {
  return { crew: false, office: false };
}

export function allSectionUnlocks() {
  return { crew: true, office: true };
}

export function allGmSeen() {
  return Object.fromEntries(GM_MESSAGE_IDS.map((id) => [id, true]));
}

export function isSectionLocked(state, section) {
  if (section === SECTION_CREW) return !state.sectionUnlocks?.crew;
  if (section === SECTION_OFFICE) return !state.sectionUnlocks?.office;
  return false;
}

function enqueueGm(state, id) {
  if (!id || state.gmSeen?.[id] || (state.gmQueue ?? []).includes(id)) return state;
  return {
    ...state,
    gmQueue: [...(state.gmQueue ?? []), id],
    gmSeen: { ...(state.gmSeen ?? {}), [id]: true },
  };
}

export function unlockSection(state, key) {
  return {
    ...state,
    sectionUnlocks: { crew: false, office: false, ...state.sectionUnlocks, [key]: true },
  };
}

export function tickGm(state, extras = {}) {
  let next = {
    ...state,
    gmQueue: [...(state.gmQueue ?? [])],
    gmSeen: { ...(state.gmSeen ?? {}) },
    sectionUnlocks: { crew: false, office: false, ...state.sectionUnlocks },
  };
  if (next.day === 2) next = enqueueGm(next, GM_MSG_DAY2);
  if (next.day === GM_UNLOCK_CREW_DAY) {
    next = unlockSection(next, 'crew');
    next = enqueueGm(next, GM_MSG_DAY3);
  }
  if (next.day === GM_UNLOCK_OFFICE_DAY) {
    next = unlockSection(next, 'office');
    next = enqueueGm(next, GM_MSG_DAY7);
  }
  if (MOWING_WEATHER.includes(next.weather)) next = enqueueGm(next, GM_TRIGGER_RAIN);
  if ((next.fuelLitres ?? 0) < FUEL_TANK_CAPACITY * FUEL_LOW_FRACTION) next = enqueueGm(next, GM_TRIGGER_FUEL);
  if (overdueSurfaces(next).length) next = enqueueGm(next, GM_TRIGGER_OVERDUE);
  if (extras.breakdowns?.length) next = enqueueGm(next, GM_TRIGGER_BREAKDOWN);
  const weekWages = wageBill(next.workers ?? []) * GM_WAGE_WEEK_DAYS;
  if (weekWages > 0 && cashOnHand(next) < weekWages) next = enqueueGm(next, GM_TRIGGER_CASH);
  if (Math.abs((next.satisfaction ?? 0) - SATISFACTION_START) >= SATISFACTION_MOVE_POINTS) {
    next = enqueueGm(next, GM_TRIGGER_SAT);
  }
  return next;
}

export function dismissGm(state) {
  const queue = [...(state.gmQueue ?? [])];
  if (!queue.length) return state;
  queue.shift();
  return { ...state, gmQueue: queue };
}

export function currentGmMessage(state) {
  const id = (state.gmQueue ?? [])[0];
  return id ? { id, ...GM_MESSAGES[id] } : null;
}
