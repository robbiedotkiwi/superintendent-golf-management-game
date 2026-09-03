import { getTask, LEVEL_LABELS } from '../data/tasks.js';

export function timeFillPercent(minutes, capacity) {
  if (capacity <= 0) return 0;
  return (minutes / capacity) * 100;
}

function plannedLabel(planned) {
  const task = getTask(planned.taskId);
  const level = planned.level ? LEVEL_LABELS[planned.level] : null;
  return `${task.name}${level ? ` · ${level}` : ''} · ${planned.minutes} min`;
}

export default function TimeBar({
  remaining,
  used,
  capacity,
  plannedTasks,
  onRemove,
  onEndDay,
  onMove,
  onOpenShed,
  onOpenCrew,
  onOpenPond,
  onOpenOffice,
  unread,
  soundOn,
  onToggleSound,
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-stretch gap-3 bg-[var(--soil)] p-3">
      <div className="flex min-w-0 flex-1 items-stretch gap-3">
        <div
          className="relative min-h-16 min-w-0 flex-1 overflow-hidden border border-[var(--sand)] bg-[var(--soil)]"
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
        </div>
        <div className="flex shrink-0 flex-col justify-center">
          <div className="text-[var(--sand)]">Time left</div>
          <div className="font-condensed text-5xl font-bold leading-none">
            {remaining}
            <span className="ml-2 text-2xl font-semibold text-[var(--sand)]">/ {capacity}</span>
          </div>
          {plannedTasks.length > 1 ? (
            <div className="mt-1 flex flex-wrap gap-1 text-xs text-[var(--sand)]">
              {plannedTasks.map((planned) => (
                <span key={planned.taskId} className="flex gap-1">
                  <button type="button" onClick={() => onMove(planned.taskId, -1)} aria-label={`Move ${plannedLabel(planned)} earlier`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => onMove(planned.taskId, 1)} aria-label={`Move ${plannedLabel(planned)} later`}>
                    ↓
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenPond}
        className="border border-[var(--sand)] px-4 text-lg text-[var(--paint)]"
      >
        Pond
      </button>
      <button
        type="button"
        onClick={onOpenOffice}
        className="border border-[var(--sand)] px-4 text-lg text-[var(--paint)]"
      >
        Office{unread ? ` (${unread})` : ''}
      </button>
      <button
        type="button"
        onClick={onOpenCrew}
        className="border border-[var(--sand)] px-4 text-lg text-[var(--paint)]"
      >
        Crew
      </button>
      <button
        type="button"
        onClick={onOpenShed}
        className="border border-[var(--sand)] px-4 text-lg text-[var(--paint)]"
      >
        Shed
      </button>
      <button
        type="button"
        onClick={onToggleSound}
        className="border border-[var(--sand)] px-4 text-lg text-[var(--paint)]"
      >
        Sound {soundOn ? 'on' : 'off'}
      </button>
      <button
        type="button"
        onClick={onEndDay}
        className="bg-[var(--machine-orange)] px-5 text-lg font-semibold text-[var(--paint)]"
      >
        End day
      </button>
    </header>
  );
}
