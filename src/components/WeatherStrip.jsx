import {
  GM_MEETING_MINUTES,
  STARTING_DISEASE_PRESSURE,
  TASK_MINUTES,
  WEATHER_STORM,
} from '../data/constants.js';
import { HEAT_LABELS, WEATHER_LABELS, weatherCopy } from '../data/events.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { durationForTask } from '../engine/assignment.js';
import { canPlanTask } from '../engine/gameState.js';
import { DISEASE_SURFACES } from '../engine/disease.js';
import { meetingDue } from '../engine/mail.js';
import { daysUntilNextTournament, nextTournament } from '../engine/tournament.js';
import { heatRank } from '../engine/weather.js';
import { getTask } from '../data/tasks.js';
import { planningDayOf, weekdayLabel } from '../engine/week.js';

export function DiseaseReadout({ state }) {
  const hot = DISEASE_SURFACES.map((surface) => {
    const entry = state.disease?.[surface];
    return {
      surface,
      pressure: Math.round(entry?.pressure ?? STARTING_DISEASE_PRESSURE),
      outbreak: Boolean(entry?.outbreak),
    };
  }).filter((item) => item.pressure > 0 || item.outbreak);
  if (!hot.length) {
    return <p className="text-sm">Disease</p>;
  }
  return (
    <p className="text-sm">
      Disease{' '}
      {hot
        .map((item) => `${SURFACE_LABELS[item.surface]} ${item.pressure}${item.outbreak ? '!' : ''}`)
        .join(' · ')}
    </p>
  );
}

export default function WeatherStrip({ state, onPlan, onRemove }) {
  const debris = state.plannedTasks.find((item) => item.taskId === 'clearDebris');
  const debrisCheck = canPlanTask(state, 'clearDebris');
  const meeting = state.plannedTasks.find((item) => item.taskId === 'gmMeeting');
  const meetingCheck = canPlanTask(state, 'gmMeeting');
  const balls = state.plannedTasks.find((item) => item.taskId === 'pickBalls');
  const ballsCheck = canPlanTask(state, 'pickBalls');
  const ballMinutes = durationForTask(state, 'pickBalls');
  const until = daysUntilNextTournament(state);
  const upcoming = nextTournament(state);
  const planDay = planningDayOf(state);
  const planningToday = planDay === state.day;
  const called = state.forecastCall;
  const hotter = called && heatRank(state.heat) > heatRank(called.heat);
  const rainMiss = called && called.type !== state.weather;
  const drops = state.morningDrops ?? [];

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--sand)]/30 px-4 py-2 text-[var(--sand)]">
      <p>
        {planningToday ? 'Today' : `Planning ${weekdayLabel(planDay)}`}
        {': '}
        <span className="text-[var(--paint)]">
          {WEATHER_LABELS[state.weather]} · {HEAT_LABELS[state.heat] ?? state.heat}
        </span>
        {' — '}
        {weatherCopy(state.weather)}
      </p>
      <p>
        Tomorrow: <span className="text-[var(--paint)]">{WEATHER_LABELS[state.forecast]}</span>
        {state.forecastHeat ? (
          <span className="ml-2 text-sm">{HEAT_LABELS[state.forecastHeat]}</span>
        ) : null}
        <span className="ml-2 text-sm">forecast</span>
      </p>
      {hotter || rainMiss ? (
        <p className="text-[var(--machine-orange)]">
          {hotter ? 'Hotter than last night’s forecast. Irrigation may run short. ' : null}
          {rainMiss
            ? `Last night called ${WEATHER_LABELS[called.type] ?? called.type}, got ${WEATHER_LABELS[state.weather]}.`
            : null}
        </p>
      ) : null}
      {drops.length ? (
        <p className="text-[var(--machine-orange)]">
          Morning dump:{' '}
          {drops
            .map((item) => {
              const name = getTask(item.taskId)?.name ?? item.taskId;
              if (item.reason === 'weather') return `${name} (weather)`;
              if (item.reason === 'crew') return `${name} (crew)`;
              return `${name} (time)`;
            })
            .join(' · ')}
        </p>
      ) : null}
      <p className="text-[var(--paint)]">
        {upcoming == null
          ? 'No tournament booked'
          : until === 0
            ? 'Tournament today'
            : `Tournament in ${until} day${until === 1 ? '' : 's'} (day ${upcoming.day})`}
      </p>
      <DiseaseReadout state={state} />
      {meetingDue(state.day) ? (
        meeting ? (
          <button
            type="button"
            onClick={() => onRemove('gmMeeting')}
            className="border border-[var(--sand)] px-3 py-1 text-[var(--paint)]"
          >
            GM meeting planned · {meeting.minutes} min
          </button>
        ) : (
          <button
            type="button"
            disabled={!meetingCheck.ok}
            onClick={() => onPlan('gmMeeting')}
            className="bg-[var(--machine-orange)] px-3 py-1 font-semibold text-[var(--paint)] disabled:opacity-40"
            title={meetingCheck.ok ? undefined : meetingCheck.reason}
          >
            GM meeting · {GM_MEETING_MINUTES} min
          </button>
        )
      ) : null}
      {state.hasDrivingRange ? (
        balls ? (
          <button
            type="button"
            onClick={() => onRemove('pickBalls')}
            className="border border-[var(--sand)] px-3 py-1 text-[var(--paint)]"
          >
            Ball pick planned · {balls.minutes} min
          </button>
        ) : (
          <button
            type="button"
            disabled={!ballsCheck.ok}
            onClick={() => onPlan('pickBalls')}
            className="bg-[var(--machine-orange)] px-3 py-1 font-semibold text-[var(--paint)] disabled:opacity-40"
            title={ballsCheck.ok ? undefined : ballsCheck.reason}
          >
            Pick balls · {ballMinutes} min
          </button>
        )
      ) : null}
      {state.weather === WEATHER_STORM ? (
        debris ? (
          <button
            type="button"
            onClick={() => onRemove('clearDebris')}
            className="border border-[var(--sand)] px-3 py-1 text-[var(--paint)]"
          >
            Debris planned · {debris.minutes} min
          </button>
        ) : (
          <button
            type="button"
            disabled={!debrisCheck.ok}
            onClick={() => onPlan('clearDebris')}
            className="bg-[var(--machine-orange)] px-3 py-1 font-semibold text-[var(--paint)] disabled:opacity-40"
            title={debrisCheck.ok ? undefined : debrisCheck.reason}
          >
            Clear debris · {TASK_MINUTES.clearDebris} min
          </button>
        )
      ) : null}
    </div>
  );
}
