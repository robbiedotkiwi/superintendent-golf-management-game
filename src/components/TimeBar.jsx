import { getTask } from '../data/tasks.js';

export function timeFillPercent(minutes, capacity) {
  if (capacity <= 0) return 0;
  return (minutes / capacity) * 100;
}

function plannedLabel(planned) {
  const task = getTask(planned.taskId);
  return `${task.name} · ${planned.minutes} min`;
}

export default function TimeBar({ remaining, used, capacity, plannedTasks, onRemove }) {
  return (
    <div
      className="relative h-14 w-full overflow-hidden border border-[var(--sand)] bg-[var(--paint)]/20"
      role="img"
      aria-label={`${used} of ${capacity} minutes planned`}
    >
      <div className="absolute inset-0 flex">
        {plannedTasks.map((planned, index) => {
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
              style={{ width: `${timeFillPercent(planned.minutes, capacity)}%` }}
            />
          );
        })}
      </div>
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center font-condensed text-2xl font-bold leading-none">
        {remaining}
        <span className="ml-2 text-lg font-semibold text-[var(--sand)]">/ {capacity}</span>
      </div>
    </div>
  );
}
