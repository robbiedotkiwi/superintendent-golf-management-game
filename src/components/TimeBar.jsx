import { getTask, LEVEL_LABELS } from '../data/tasks.js';

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
}) {
  const usedPercent = capacity <= 0 ? 0 : (used / capacity) * 100;

  return (
    <header className="flex items-stretch gap-3 bg-[var(--soil)] p-3">
      <div className="relative min-h-16 flex-1 overflow-hidden border border-[var(--sand)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--machine-orange)]"
          style={{ width: `${usedPercent}%` }}
        />
        <div className="relative flex h-full items-center justify-between px-4 py-2">
          <div>
            <div className="text-[var(--sand)]">Time left</div>
            <div className="font-condensed text-5xl font-bold leading-none">
              {remaining}
              <span className="ml-2 text-2xl font-semibold text-[var(--sand)]">/ {capacity} min</span>
            </div>
          </div>
          <ul className="hidden max-w-xl flex-wrap justify-end gap-2 md:flex">
            {plannedTasks.map((planned) => {
              const task = getTask(planned.taskId);
              const level = planned.level ? LEVEL_LABELS[planned.level] : null;
              return (
                <li key={planned.taskId} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRemove(planned.taskId)}
                    className="border border-[var(--soil)] bg-[var(--sand)] px-2 py-1 text-sm text-[var(--soil)]"
                  >
                    {task.name}
                    {level ? ` · ${level}` : ''} · {planned.minutes} min
                  </button>
                  <button type="button" onClick={() => onMove(planned.taskId, -1)} className="text-sm text-[var(--paint)]">
                    Up
                  </button>
                  <button type="button" onClick={() => onMove(planned.taskId, 1)} className="text-sm text-[var(--paint)]">
                    Down
                  </button>
                </li>
              );
            })}
          </ul>
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
        onClick={onEndDay}
        className="bg-[var(--machine-orange)] px-5 text-lg font-semibold text-[var(--paint)]"
      >
        End day
      </button>
    </header>
  );
}
