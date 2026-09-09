import {
  CASUAL_MAX_DAYS_PER_WEEK,
  DAYS_PER_WEEK,
  EARLY_START_MINUTES,
  MOWING_WEATHER,
  STARTING_DAY,
  STARTING_TEMP_MAX,
  STARTING_TEMP_MIN,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_MINUTES,
  WEEKDAY_LABELS,
  WEATHER_STORM,
} from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { minutesTodayForWeather } from './weather.js';
import { dayOfWeek } from './staff.js';

export function weekStartDay(day) {
  return Math.floor((Number(day) - 1) / DAYS_PER_WEEK) * DAYS_PER_WEEK + 1;
}

export function weekDays(day) {
  const start = weekStartDay(day);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => start + index);
}

export function weekdayLabel(day) {
  return WEEKDAY_LABELS[dayOfWeek(day) - 1] ?? WEEKDAY_LABELS[0];
}

export function emptyDayPlan() {
  return { tasks: [], irrigation: null, casualIds: [] };
}

export function emptyWeekPlan(weekStart = STARTING_DAY) {
  return {
    weekStart: weekStartDay(weekStart),
    locked: false,
    days: Object.fromEntries(weekDays(weekStart).map((id) => [id, emptyDayPlan()])),
  };
}

export function planningDayOf(state) {
  const day = Number(state.planningDay ?? state.day);
  if (!Number.isInteger(day) || day < 1) return state.day;
  if (day < state.day) return state.day;
  if (weekStartDay(day) !== weekStartDay(state.day)) return state.day;
  return day;
}

export function dayLengthMinutes(state, day) {
  const weather = weatherForPlanDay(state, day);
  return minutesTodayForWeather(weather) + (state.earlyStart ? EARLY_START_MINUTES : 0);
}

export function planDayChrome(state, day) {
  const selected = planningDayOf(state);
  return {
    isToday: day === state.day,
    isSelected: day === selected,
    isPlanningAhead: day === selected && day > state.day,
  };
}

export function weekPlanOf(state) {
  const start = weekStartDay(state.day);
  const plan = state.weekPlan;
  if (plan && weekStartDay(plan.weekStart ?? start) === start) return plan;
  return emptyWeekPlan(start);
}

export function dayPlanOf(state, day) {
  const plan = weekPlanOf(state);
  return plan.days?.[day] ?? emptyDayPlan();
}

export function getDayTasks(state, day) {
  return dayPlanOf(state, day).tasks ?? [];
}

export function forecastEntryForDay(state, day) {
  if (day === state.day) {
    return {
      type: state.weather,
      tempMin: state.tempMin ?? STARTING_TEMP_MIN,
      tempMax: state.tempMax ?? STARTING_TEMP_MAX,
      windSpeed: state.windSpeed,
      windDir: state.windDir,
      actual: true,
    };
  }
  const offset = day - state.day - 1;
  const strip = state.forecastStrip ?? [];
  if (offset >= 0 && offset < strip.length) {
    return { ...strip[offset], actual: false };
  }
  return {
    type: state.weather,
    tempMin: state.tempMin ?? STARTING_TEMP_MIN,
    tempMax: state.tempMax ?? STARTING_TEMP_MAX,
    actual: false,
  };
}

export function weatherForPlanDay(state, day) {
  return forecastEntryForDay(state, day).type ?? state.weather;
}

export function tempsForPlanDay(state, day) {
  const entry = forecastEntryForDay(state, day);
  return {
    tempMin: entry.tempMin ?? state.tempMin ?? STARTING_TEMP_MIN,
    tempMax: entry.tempMax ?? state.tempMax ?? STARTING_TEMP_MAX,
  };
}

export function irrigationForPlanDay(state, day) {
  const stored = dayPlanOf(state, day).irrigation;
  return stored ?? state.irrigation;
}

export function casualsBookedOn(state, day) {
  const ids = new Set(dayPlanOf(state, day).casualIds ?? []);
  return (state.casualPool ?? []).filter((item) => ids.has(item.id));
}

export function casualDaysBooked(state, casualId) {
  const plan = weekPlanOf(state);
  return weekDays(state.day).filter((day) => (plan.days?.[day]?.casualIds ?? []).includes(casualId));
}

export function workersForPlanDay(state, day) {
  const paidBase = dayLengthMinutes(state, day);
  const weekday = dayOfWeek(day);
  const volunteerDay = state.volunteerWeekday ?? VOLUNTEER_DEFAULT_WEEKDAY;
  const tasks = getDayTasks(state, day);
  const used = {};
  for (const item of tasks) {
    used[item.workerId] = (used[item.workerId] ?? 0) + (item.minutes ?? 0);
  }
  const permanent = (state.workers ?? [])
    .filter((worker) => !worker.isCasual)
    .map((worker) => {
      let minutesToday = worker.isVolunteer ? VOLUNTEER_MINUTES : paidBase;
      if (worker.isVolunteer && weekday !== volunteerDay) minutesToday = 0;
      if (worker.trainingUntilDay && day < worker.trainingUntilDay) minutesToday = 0;
      if (day === state.day) minutesToday = worker.minutesToday;
      return {
        ...worker,
        minutesToday,
        minutesUsed: used[worker.id] ?? 0,
      };
    });
  const casuals = casualsBookedOn(state, day).map((casual) => ({
    ...casual,
    isCasual: true,
    isVolunteer: false,
    morale: 100,
    minutesToday: paidBase,
    minutesUsed: used[casual.id] ?? 0,
    daysWorkedRunning: 0,
    sprayCertified: Boolean(casual.sprayCertified),
    allowedSurfaces: casual.allowedSurfaces ?? 'all',
    ownMower: Boolean(casual.ownMower),
  }));
  return [...permanent, ...casuals];
}

export function planViewState(state) {
  const day = planningDayOf(state);
  const entry = forecastEntryForDay(state, day);
  return {
    ...state,
    weather: entry.type ?? state.weather,
    tempMin: entry.tempMin ?? state.tempMin ?? STARTING_TEMP_MIN,
    tempMax: entry.tempMax ?? state.tempMax ?? STARTING_TEMP_MAX,
    windSpeed: entry.windSpeed ?? state.windSpeed,
    windDir: entry.windDir ?? state.windDir,
    plannedTasks: getDayTasks(state, day),
    workers: workersForPlanDay(state, day),
    irrigation: irrigationForPlanDay(state, day),
  };
}

export function simViewState(state) {
  return planViewState({ ...state, planningDay: state.day });
}

export function isFuturePlanDay(state, day = planningDayOf(state)) {
  return day > state.day;
}

export function lockWeek(state) {
  return state;
}

export function weekLockedFor(_state, _day) {
  return false;
}

export function rollNewWeek(state, weekStart, casualPool) {
  return {
    ...state,
    lastWeek: state.weekPlan ?? emptyWeekPlan(weekStartDay((state.day ?? 1) - 1)),
    weekPlan: emptyWeekPlan(weekStart),
    casualPool,
    planningDay: state.day,
    morningDrops: [],
  };
}

export function upsertDayPlan(state, day, patch) {
  const plan = weekPlanOf(state);
  const current = plan.days?.[day] ?? emptyDayPlan();
  const nextDays = { ...plan.days, [day]: { ...current, ...patch } };
  const weekPlan = { ...plan, days: nextDays };
  if (day === state.day && patch.tasks) {
    return { ...state, weekPlan, plannedTasks: patch.tasks };
  }
  return { ...state, weekPlan };
}

export function setDayTasks(state, day, tasks) {
  return upsertDayPlan(state, day, { tasks });
}

export function canEditPlanDay(state, day = planningDayOf(state)) {
  if (day < state.day) return { ok: false, reason: 'That day is already over.' };
  if (weekStartDay(day) !== weekStartDay(state.day)) {
    return { ok: false, reason: 'Plan this week only.' };
  }
  if (weekLockedFor(state, day)) return { ok: false, reason: 'The rest of the week is locked.' };
  return { ok: true };
}

export function canBookCasual(state, casualId, day) {
  if (day < state.day) return { ok: false, reason: 'That day is already over.' };
  if (weekStartDay(day) !== weekStartDay(state.day)) {
    return { ok: false, reason: 'Book this week only.' };
  }
  const casual = (state.casualPool ?? []).find((item) => item.id === casualId);
  if (!casual) return { ok: false, reason: 'That casual is not on the bench.' };
  const booked = casualDaysBooked(state, casualId);
  if (booked.includes(day)) return { ok: false, reason: 'Already booked that day.' };
  if (booked.length >= CASUAL_MAX_DAYS_PER_WEEK) {
    return { ok: false, reason: `Casuals can only work ${CASUAL_MAX_DAYS_PER_WEEK} days this week.` };
  }
  return { ok: true };
}

export function bookCasual(state, casualId, day) {
  const check = canBookCasual(state, casualId, day);
  if (!check.ok) return state;
  const current = dayPlanOf(state, day);
  return upsertDayPlan(state, day, { casualIds: [...(current.casualIds ?? []), casualId] });
}

export function unbookCasual(state, casualId, day) {
  const current = dayPlanOf(state, day);
  const tasks = (current.tasks ?? []).filter((item) => item.workerId !== casualId);
  return upsertDayPlan(state, day, {
    casualIds: (current.casualIds ?? []).filter((id) => id !== casualId),
    tasks,
  });
}

export function activateDayPlan(state) {
  const day = state.day;
  const { tasks, dropped } = dropInvalidDayTasks(state, day);
  const next = setDayTasks(state, day, tasks);
  return {
    ...next,
    plannedTasks: tasks,
    workers: workersForPlanDay({ ...next, plannedTasks: tasks }, day),
    irrigation: irrigationForPlanDay(next, day),
    morningDrops: dropped,
    planningDay: day,
  };
}

export function dropInvalidDayTasks(state, day) {
  const weather = weatherForPlanDay(state, day);
  const workers = workersForPlanDay(state, day);
  const present = new Set(workers.filter((worker) => worker.minutesToday > 0).map((worker) => worker.id));
  const dropped = [];
  const kept = [];
  for (const item of getDayTasks(state, day)) {
    const task = getTask(item.taskId);
    if (task?.mowing && MOWING_WEATHER.includes(weather)) {
      dropped.push({ ...item, reason: 'weather' });
      continue;
    }
    if (task?.id === 'clearDebris' && weather !== WEATHER_STORM) {
      dropped.push({ ...item, reason: 'weather' });
      continue;
    }
    if (!present.has(item.workerId)) {
      dropped.push({ ...item, reason: 'crew' });
      continue;
    }
    kept.push(item);
  }
  const used = {};
  const usedMachine = {};
  const fitted = [];
  const dayLen = dayLengthMinutes(state, day);
  for (const item of kept) {
    const worker = workers.find((entry) => entry.id === item.workerId);
    const already = used[item.workerId] ?? 0;
    if (!worker || already + item.minutes > worker.minutesToday) {
      dropped.push({ ...item, reason: 'time', fit: 'person' });
      continue;
    }
    if (item.machineId) {
      const alreadyMachine = usedMachine[item.machineId] ?? 0;
      if (alreadyMachine + item.minutes > dayLen) {
        dropped.push({ ...item, reason: 'time', fit: 'machine' });
        continue;
      }
      usedMachine[item.machineId] = alreadyMachine + item.minutes;
    }
    used[item.workerId] = already + item.minutes;
    fitted.push(item);
  }
  return { tasks: fitted, dropped };
}

