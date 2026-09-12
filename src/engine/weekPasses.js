import { PASS_AREAS, PASSES_REQUIRED_PER_WEEK } from '../data/config.js';
import { gradeLetter } from './grades.js';
import {
  applyWeekPasses,
  bestMachineCap,
  emptyAreaListMap,
  emptyAreaMap,
  resolveDayPasses,
  weeklyPassRatio,
  weeklyTargetQuality,
} from './passes.js';
import { getDayTasks, weatherForPlanDay, weekDays, workersForPlanDay } from './week.js';

export function projectedPassesFromPlan(state) {
  let acc = {
    weekPasses: { ...(state.weekPasses ?? emptyAreaMap(0)) },
    weekWastedHours: { ...(state.weekWastedHours ?? emptyAreaMap(0)) },
    weekPassDays: Object.fromEntries(
      PASS_AREAS.map((area) => [area, [...(state.weekPassDays?.[area] ?? [])]]),
    ),
  };
  for (const day of weekDays(state.day)) {
    if (day < state.day) continue;
    const dayState = { ...state, weather: weatherForPlanDay(state, day), day };
    const jobs = getDayTasks(state, day);
    const workers = workersForPlanDay(state, day);
    const dayResult = resolveDayPasses(dayState, jobs, workers);
    acc = applyWeekPasses(acc, dayResult, day);
  }
  return acc;
}

export function projectedWeeklyGrade(state) {
  const projected = projectedPassesFromPlan(state);
  return Object.fromEntries(
    PASS_AREAS.map((area) => {
      const cap = bestMachineCap(state, area)?.score ?? 100;
      const required = PASSES_REQUIRED_PER_WEEK[area];
      const achieved = projected.weekPasses[area] ?? 0;
      const target = weeklyTargetQuality(weeklyPassRatio(achieved, area), cap);
      const days = projected.weekPassDays[area] ?? [];
      return [
        area,
        {
          achieved,
          required,
          wastedHours: projected.weekWastedHours[area] ?? 0,
          dailyCapped: days.includes(state.planningDay ?? state.day) || days.includes(state.day),
          cappedDays: days,
          target,
          letter: gradeLetter(target),
          cappedByMachine: weeklyPassRatio(achieved, area) * 100 > cap + 0.01,
          capLetter: bestMachineCap(state, area)?.letter ?? null,
          capScore: cap,
        },
      ];
    }),
  );
}
