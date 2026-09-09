import { getTask } from '../data/tasks.js';
import { timeBarLabel, timeBarOverflow, timeBarRemaining, timeFillPercent } from '../engine/timeBar.js';

export { timeBarLabel, timeBarOverflow, timeBarRemaining, timeFillPercent };

function plannedLabel(planned) {
  const task = getTask(planned.taskId);
  return `${task?.name ?? planned.taskId} · ${planned.minutes} min${planned.needsReassignment ? ' · needs reassignment' : ''}`;
}

export default function TimeBar({ remaining, used, capacity, plannedTasks = [], onRemove }) {
  const spent = used ?? Math.max(0, (capacity ?? 0) - (remaining ?? 0));
  const over = timeBarOverflow(spent, capacity);
  const head = over > 0 ? capacity : timeBarRemaining(spent, capacity);
  const sliceBase = Math.max(spent, capacity ?? 0);
  const copy = timeBarLabel(spent, capacity);
  return (
    <div
      className="relative h-14 w-full overflow-hidden border border-[var(--sand)] bg-[var(--paint)]/20"
      role="img"
      aria-label={copy}
      data-timebar-over={over || undefined}
    >
      <div className="absolute inset-0 flex">
        {(plannedTasks ?? []).map((planned, index) => {
          const label = plannedLabel(planned);
          return (
            <button
              key={planned.taskId}
              type="button"
              title={label}
              aria-label={`Remove ${label}`}
              onClick={() => onRemove(planned.taskId)}
              className={`h-full bg-[var(--machine-orange)] hover:brightness-110 ${
                index > 0 ? 'border-l border-[var(--paint)]' : ''
              }`}
              style={{ width: `${timeFillPercent(planned.minutes, sliceBase)}%` }}
            />
          );
        })}
      </div>
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center font-condensed text-2xl font-bold leading-none">
        {head}
        <span className="ml-2 text-lg font-semibold text-[var(--sand)]">/ {capacity}</span>
        {over > 0 ? (
          <span className="ml-2 text-lg font-semibold text-red-500">· {over} over</span>
        ) : null}
      </div>
    </div>
  );
}
