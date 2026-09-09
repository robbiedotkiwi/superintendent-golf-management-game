import {
  canEditPlanDay,
  getDayTasks,
  planningDayOf,
  weekDays,
  weekPlanOf,
  weekdayLabel,
} from '../engine/week.js';

export default function WeekDayPicker({
  state,
  onSelectDay,
  plannedDays,
  ariaLabel = 'Plan day',
}) {
  const days = weekDays(state.day);
  const selected = planningDayOf(state);
  const plan = weekPlanOf(state);
  const marked = plannedDays instanceof Set ? plannedDays : new Set(plannedDays ?? []);

  return (
    <div data-week-day-picker aria-label={ariaLabel} className="flex gap-1">
        {days.map((day) => {
          const past = day < state.day;
          const selectedDay = day === selected;
          const edit = canEditPlanDay(state, day);
          const jobs = getDayTasks(state, day).length;
          return (
            <button
              key={day}
              type="button"
              data-plan-day={day}
              disabled={!onSelectDay || past}
              onClick={() => onSelectDay?.(day)}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-sm px-1 py-1 text-center text-[11px] leading-tight ${
                selectedDay ? 'bg-[var(--machine-orange)] text-[var(--paint)]' : 'border border-[var(--sand)]/40'
              } disabled:cursor-default disabled:opacity-40`}
              title={`${weekdayLabel(day)}${edit.ok ? '' : ` · ${edit.reason}`}`}
            >
              <span className="font-semibold">{weekdayLabel(day)}</span>
              <span className="text-[10px] text-[var(--sand)]">
                {marked.size ? (marked.has(day) ? '●' : '○') : jobs ? `${jobs}` : '—'}
              </span>
            {plan.locked && day > state.day ? <span className="text-[9px] text-[var(--sand)]">Locked</span> : null}
          </button>
        );
      })}
    </div>
  );
}
