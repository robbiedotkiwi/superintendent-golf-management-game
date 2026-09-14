import {
  DAYS_OVER_FIVE_MORALE_HIT,
  DAYS_OVER_SIX_MORALE_HIT,
  LEAVE_APPROVE_MORALE,
  LEAVE_DECLINE_MORALE,
  LEAVE_DEFAULT_DAYS,
  LEAVE_REQUEST_CHANCE_PER_WEEK,
  MAX_WORK_DAYS,
  RESIGN_MORALE_THRESHOLD,
  RESIGN_STREAK_DAYS,
  SICK_CHANCE_AT_MORALE_0,
  SICK_CHANCE_AT_MORALE_100,
  SICK_DAYS_MAX,
  SICK_DAYS_MIN,
  STANDARD_WORK_DAYS,
  VOLUNTEER_REWARD_DAYS,
  VOLUNTEER_REWARD_HOURS_PER_DAY,
  VOLUNTEER_REWARD_SATISFACTION,
  VOLUNTEER_WEEKLY_HOURS,
  MINUTES_PER_HOUR,
} from '../data/config.js';
import { DAYS_PER_WEEK, PLAYER_ID } from '../data/constants.js';

function weekdayOf(day) {
  return ((Number(day) - 1) % DAYS_PER_WEEK) + 1;
}

function weekDaysOf(day) {
  const start = Math.floor((Number(day) - 1) / DAYS_PER_WEEK) * DAYS_PER_WEEK + 1;
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => start + index);
}

export function sickChance(morale) {
  const t = Math.min(1, Math.max(0, (Number(morale) || 0) / 100));
  return SICK_CHANCE_AT_MORALE_0 + (SICK_CHANCE_AT_MORALE_100 - SICK_CHANCE_AT_MORALE_0) * t;
}

export function volunteerHoursFor(state) {
  return (state.satisfaction ?? 0) >= VOLUNTEER_REWARD_SATISFACTION
    ? VOLUNTEER_REWARD_HOURS_PER_DAY
    : VOLUNTEER_WEEKLY_HOURS;
}

export function volunteerOnDuty(state, day) {
  const weekday = weekdayOf(day);
  const start = state.volunteerWeekday;
  if ((state.satisfaction ?? 0) >= VOLUNTEER_REWARD_SATISFACTION) {
    const second = (start % 7) + 1;
    return weekday === start || weekday === second;
  }
  return weekday === start;
}

export function volunteerMinutesForDay(state, day) {
  if (!volunteerOnDuty(state, day)) return 0;
  return volunteerHoursFor(state) * MINUTES_PER_HOUR;
}

export function daysScheduledThisWeek(state, workerId) {
  return weekDaysOf(state.day).filter((day) =>
    (state.weekPlan?.days?.[day]?.tasks ?? []).some((item) => item.workerId === workerId),
  ).length;
}

export function applyWorkedDayMorale(worker, daysThisWeek) {
  if (worker.isVolunteer || worker.id === PLAYER_ID) return worker;
  let morale = worker.morale;
  if (daysThisWeek === STANDARD_WORK_DAYS + 1) morale += DAYS_OVER_FIVE_MORALE_HIT;
  else if (daysThisWeek >= MAX_WORK_DAYS) morale += DAYS_OVER_SIX_MORALE_HIT;
  return { ...worker, morale: Math.min(100, Math.max(0, morale)) };
}

export function tickLowMoraleStreak(worker) {
  if (worker.id === PLAYER_ID || worker.isVolunteer) {
    return { ...worker, lowMoraleStreak: 0, resigned: false };
  }
  let streak = worker.lowMoraleStreak ?? 0;
  if ((worker.morale ?? 100) < RESIGN_MORALE_THRESHOLD) streak += 1;
  else streak = 0;
  const resigned = streak >= RESIGN_STREAK_DAYS;
  return { ...worker, lowMoraleStreak: streak, resigned };
}

export function rollSickDay(worker, rng, day) {
  if (worker.id === PLAYER_ID || worker.isVolunteer || worker.isCasual) return worker;
  if (worker.leaveUntilDay && day < worker.leaveUntilDay) return worker;
  if (worker.sickUntilDay && day < worker.sickUntilDay) return worker;
  if (rng.next() >= sickChance(worker.morale)) return worker;
  const span = SICK_DAYS_MAX - SICK_DAYS_MIN + 1;
  const days = SICK_DAYS_MIN + Math.floor(rng.next() * span);
  return { ...worker, sickUntilDay: day + days };
}

export function maybeLeaveRequest(state, rng) {
  if (rng.next() >= LEAVE_REQUEST_CHANCE_PER_WEEK) return state;
  const pool = (state.workers ?? []).filter(
    (worker) => worker.id !== PLAYER_ID && !worker.isVolunteer && !worker.isCasual && !worker.resigned,
  );
  if (!pool.length) return state;
  const worker = pool[Math.floor(rng.next() * pool.length)];
  if ((state.leaveRequests ?? []).some((item) => item.workerId === worker.id && !item.resolved)) return state;
  return {
    ...state,
    leaveRequests: [
      ...(state.leaveRequests ?? []),
      {
        id: (state.nextLeaveId ?? 1),
        workerId: worker.id,
        name: worker.name,
        days: LEAVE_DEFAULT_DAYS,
        approveMorale: LEAVE_APPROVE_MORALE,
        declineMorale: LEAVE_DECLINE_MORALE,
      },
    ],
    nextLeaveId: (state.nextLeaveId ?? 1) + 1,
  };
}

export function approveLeave(state, requestId) {
  const request = (state.leaveRequests ?? []).find((item) => item.id === requestId);
  if (!request) return state;
  return {
    ...state,
    leaveRequests: (state.leaveRequests ?? []).map((item) =>
      item.id === requestId ? { ...item, resolved: 'approved' } : item,
    ),
    workers: state.workers.map((worker) =>
      worker.id === request.workerId
        ? {
            ...worker,
            morale: Math.min(100, worker.morale + LEAVE_APPROVE_MORALE),
            leaveUntilDay: state.day + request.days,
          }
        : worker,
    ),
  };
}

export function declineLeave(state, requestId) {
  const request = (state.leaveRequests ?? []).find((item) => item.id === requestId);
  if (!request) return state;
  return {
    ...state,
    leaveRequests: (state.leaveRequests ?? []).map((item) =>
      item.id === requestId ? { ...item, resolved: 'declined' } : item,
    ),
    workers: state.workers.map((worker) =>
      worker.id === request.workerId
        ? { ...worker, morale: Math.max(0, worker.morale + LEAVE_DECLINE_MORALE) }
        : worker,
    ),
  };
}
