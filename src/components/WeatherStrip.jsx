import { STARTING_DISEASE_PRESSURE, TASK_MINUTES, WEATHER_STORM } from '../data/constants.js';
import { WEATHER_LABELS, weatherCopy } from '../data/events.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { canPlanTask } from '../engine/gameState.js';
import { DISEASE_SURFACES } from '../engine/disease.js';

export default function WeatherStrip({ state, onPlan, onRemove }) {
  const debris = state.plannedTasks.find((item) => item.taskId === 'clearDebris');
  const debrisCheck = canPlanTask(state, 'clearDebris');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sand)]/30 px-4 py-2 text-[var(--sand)]">
      <p>
        Today: <span className="text-[var(--paint)]">{WEATHER_LABELS[state.weather]}</span>
        {' — '}
        {weatherCopy(state.weather)}
      </p>
      <p>
        Tomorrow: <span className="text-[var(--paint)]">{WEATHER_LABELS[state.forecast]}</span>
        <span className="ml-2 text-sm">forecast</span>
      </p>
      <p className="text-sm">
        Disease{' '}
        {DISEASE_SURFACES.map((surface) => {
          const entry = state.disease?.[surface];
          return `${SURFACE_LABELS[surface]} ${Math.round(entry?.pressure ?? STARTING_DISEASE_PRESSURE)}${entry?.outbreak ? '!' : ''}`;
        }).join(' · ')}
      </p>
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
