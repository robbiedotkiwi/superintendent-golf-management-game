import {
  FORECAST_DAYS,
  WEATHER_FINE,
  WEATHER_FROST,
  WEATHER_OVERCAST,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';
import { FORECAST_UNRELIABLE_FROM_DAY, WET_PASS_TIME_MULT, WET_WEATHER } from '../data/config.js';
import { WEATHER_LABELS } from '../data/events.js';
import { dayOfWeek } from '../engine/staff.js';
import { forecastOpacity, formatTempRange } from '../engine/weather.js';
import {
  canEditPlanDay,
  forecastEntryForDay,
  getDayTasks,
  planningDayOf,
  weekDays,
  weekPlanOf,
  weekdayLabel,
} from '../engine/week.js';

function WeatherIcon({ type }) {
  const common = { viewBox: '0 0 24 24', className: 'h-5 w-5', fill: 'currentColor', 'aria-hidden': true };
  if (type === WEATHER_FINE) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
      </svg>
    );
  }
  if (type === WEATHER_OVERCAST) {
    return (
      <svg {...common}>
        <path d="M7 16h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 16z" />
      </svg>
    );
  }
  if (type === WEATHER_RAIN) {
    return (
      <svg {...common}>
        <path d="M7 14h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 14z" />
        <path d="M9 16v3M12 16v4M15 16v3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (type === WEATHER_STORM) {
    return (
      <svg {...common}>
        <path d="M7 13h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 13z" />
        <path d="M13 12 9 20h4l-2 4 7-10h-4l2-4z" />
      </svg>
    );
  }
  if (type === WEATHER_FROST) {
    return (
      <svg {...common}>
        <path d="M12 3v18M5 7l14 10M19 7 5 17M4 12h16" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

export default function ForecastStrip({ state, onSelectDay, selectedDay }) {
  const days = weekDays(state.day);
  const selected = selectedDay ?? planningDayOf(state);
  const plan = weekPlanOf(state);
  const rolling = state.forecastStrip ?? [];

  return (
    <div id="forecast-strip" aria-label="Week plan" className="mt-3">
      <div className="flex gap-1">
        {days.map((day) => {
          const entry = forecastEntryForDay(state, day);
          const jobs = getDayTasks(state, day).length;
          const past = day < state.day;
          const isToday = day === state.day;
          const selectedDayChip = day === selected;
          const planningAhead = selectedDayChip && day > state.day;
          const edit = canEditPlanDay(state, day);
          const forecastIndex = day - state.day - 1;
          const opacity = past ? 0.45 : isToday ? 1 : forecastOpacity(Math.max(0, forecastIndex));
          const heat = formatTempRange(entry.tempMin, entry.tempMax);
          const weather = WEATHER_LABELS[entry.type] ?? entry.type;
          return (
            <button
              key={day}
              type="button"
              disabled={!onSelectDay || past}
              onClick={() => onSelectDay?.(day)}
              data-forecast-day={day}
              data-today={isToday || undefined}
              data-planning-ahead={planningAhead || undefined}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-sm px-0.5 py-1 text-center text-[10px] leading-tight text-[var(--paint)] ${
                isToday
                  ? 'bg-[var(--machine-orange)] text-[var(--paint)]'
                  : planningAhead
                    ? 'border border-dashed border-[var(--machine-orange)] bg-[var(--machine-orange)]/15'
                    : selectedDayChip
                      ? 'bg-[var(--machine-orange)] text-[var(--paint)]'
                      : 'border border-[var(--sand)]/40'
              } disabled:cursor-default`}
              style={{ opacity }}
              title={`${weekdayLabel(day)} ${day}${edit.ok ? '' : ` · ${edit.reason}`}`}
            >
              <div className="font-semibold">{weekdayLabel(day)}</div>
              {isToday ? <div className="text-[9px] font-semibold">Today</div> : null}
              {planningAhead ? <div className="text-[9px] font-semibold">Planning</div> : null}
              <WeatherIcon type={entry.type} />
              <div className="truncate">{weather}</div>
              <div className="text-[var(--sand)]">{heat}</div>
              <div className="text-[var(--sand)]">
                {entry.windSpeed != null ? `${entry.windSpeed} ${entry.windDir ?? ''}` : ''}
              </div>
              <div className="text-[var(--sand)]">{jobs ? `${jobs} job${jobs === 1 ? '' : 's'}` : '—'}</div>
              {WET_WEATHER.includes(entry.type) ? (
                <div className="text-[9px] text-[var(--machine-orange)]" data-wet-forecast={day}>
                  Wet +{Math.round((WET_PASS_TIME_MULT - 1) * 100)}%
                </div>
              ) : null}
              {dayOfWeek(day) >= FORECAST_UNRELIABLE_FROM_DAY ? (
                <div className="text-[9px] text-[var(--sand)]" data-unreliable={day}>
                  Unreliable
                </div>
              ) : null}
              {plan.locked && day > state.day ? <div className="text-[9px] text-[var(--sand)]">Locked</div> : null}
            </button>
          );
        })}
      </div>
      {onSelectDay ? (
        <p className="mt-1 text-[10px] leading-tight text-[var(--sand)]">
          Past days are frozen. Remaining days stay editable. Rain early or a hotter afternoon can still dump the plan.
        </p>
      ) : rolling.length === FORECAST_DAYS ? null : (
        <div aria-hidden="true" />
      )}
    </div>
  );
}
