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
      <nav aria-label="Locations" className="flex items-stretch overflow-hidden border border-[var(--sand)]">
        <button type="button" onClick={onOpenPond} className="px-4 text-lg">
          Pond
        </button>
        <button type="button" onClick={onOpenOffice} className="relative border-l border-[var(--sand)] px-4 pr-5 text-lg">
          Office
          {unread ? (
            <span className="absolute right-1 top-1 min-w-5 rounded-full bg-[var(--machine-orange)] px-1 text-center text-xs font-bold leading-5 text-[var(--paint)]">
              {unread}
            </span>
          ) : null}
        </button>
        <button type="button" onClick={onOpenCrew} className="border-l border-[var(--sand)] px-4 text-lg">
          Crew
        </button>
        <button type="button" onClick={onOpenShed} className="border-l border-[var(--sand)] px-4 text-lg">
          Shed
        </button>
      </nav>
      <button
        type="button"
        onClick={onToggleSound}
        title={soundOn ? 'Sound on' : 'Sound off'}
        aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
        aria-pressed={soundOn}
        className="flex h-10 w-10 shrink-0 items-center justify-center self-center text-[var(--sand)] hover:text-[var(--paint)]"
      >
        {soundOn ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4zM14 3.2v2.1c2.9.9 5 3.5 5 6.7s-2.1 5.8-5 6.7v2.1c4-.9 7-4.5 7-8.8S18 4.1 14 3.2z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
            <path d="M16.5 12c0-1.8-1-3.3-2.5-4v2.2l2.4 2.4c.1-.2.1-.4.1-.6zm2.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5c.7-1.3 1-2.7 1-4.1 0-4.3-3-7.9-7-8.8v2.1c2.9.9 5 3.5 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={onEndDay}
        className="ml-6 bg-[var(--machine-orange)] px-6 text-lg font-semibold text-[var(--paint)]"
      >
        End day
      </button>
    </header>
  );
}
