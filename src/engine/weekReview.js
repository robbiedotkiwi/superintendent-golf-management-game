import { SURFACE_KEYS } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { meanQuality } from './holes.js';
import { daysSinceLastWorked } from './neglect.js';
import { weekStartDay } from './week.js';

export function snapshotWeekStart(state) {
  return {
    weekStart: weekStartDay(state.day ?? 1),
    quality: Object.fromEntries(SURFACE_KEYS.map((key) => [key, meanQuality(state, key)])),
    satisfaction: state.satisfaction ?? 0,
    gmStanding: state.gmStanding ?? 0,
    cash: state.cash ?? 0,
  };
}

export function weekSummariesOf(log, weekDay, extra) {
  const start = weekStartDay(weekDay);
  const prior = (log ?? []).filter((item) => weekStartDay(item.day) === start);
  return extra ? [...prior, extra] : prior;
}

export function aggregateWeekJobs(summaries) {
  return (summaries ?? []).reduce(
    (acc, item) => ({
      planned: acc.planned + (item.planned?.length ?? 0),
      completed: acc.completed + (item.done?.length ?? 0),
      dropped: acc.dropped + (item.dropped?.length ?? 0),
      skipped: acc.skipped + (item.skipped?.length ?? 0),
      wages: acc.wages + (item.wages ?? 0),
      fuelSpend: acc.fuelSpend + (item.fuelSpend ?? 0),
      mainsCost: acc.mainsCost + (item.mainsCost ?? 0),
      materialsSpent: acc.materialsSpent + (item.materialsSpent ?? 0),
      neighbourFine: acc.neighbourFine + (item.neighbourFine ?? 0),
      casualSpend: acc.casualSpend + (item.casualWages ?? 0),
    }),
    {
      planned: 0,
      completed: 0,
      dropped: 0,
      skipped: 0,
      wages: 0,
      fuelSpend: 0,
      mainsCost: 0,
      materialsSpent: 0,
      neighbourFine: 0,
      casualSpend: 0,
    },
  );
}

export function buildWeekReview({ start, end, summaries }) {
  const jobs = aggregateWeekJobs(summaries);
  const moneySpent =
    jobs.wages + jobs.fuelSpend + jobs.mainsCost + jobs.materialsSpent + jobs.neighbourFine;
  return {
    weekStart: start?.weekStart ?? weekStartDay(end?.day ?? 1),
    quality: SURFACE_KEYS.map((surface) => ({
      surface,
      label: SURFACE_LABELS[surface] ?? surface,
      before: start?.quality?.[surface] ?? meanQuality(end, surface),
      after: meanQuality(end, surface),
    })),
    satisfaction: {
      before: start?.satisfaction ?? end?.satisfaction ?? 0,
      after: end?.satisfaction ?? 0,
    },
    gmStanding: {
      before: start?.gmStanding ?? end?.gmStanding ?? 0,
      after: end?.gmStanding ?? 0,
    },
    jobs: {
      planned: jobs.planned,
      completed: jobs.completed,
      dropped: jobs.dropped,
    },
    moneySpent,
    casualSpend: jobs.casualSpend,
    cash: {
      before: start?.cash ?? end?.cash ?? 0,
      after: end?.cash ?? 0,
    },
    daysSince: Object.fromEntries(
      SURFACE_KEYS.map((surface) => [surface, daysSinceLastWorked(end, surface)]),
    ),
    days: (summaries ?? []).map((item) => item.day),
  };
}
