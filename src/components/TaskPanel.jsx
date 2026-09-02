import { LEVEL_KEYS } from '../data/constants.js';
import { LEVEL_LABELS, SURFACE_LABELS, taskDuration, tasksForSurface } from '../data/tasks.js';
import { canPlanTask } from '../engine/gameState.js';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TaskPanel({ surface, state, onPlan, onRemove, onClose }) {
  const open = Boolean(surface);
  const quality = surface ? state.surfaces[surface].quality : 0;
  const tasks = surface ? tasksForSurface(surface) : [];

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l-4 border-[var(--soil)] bg-[var(--sand)] text-[var(--soil)] transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!open}
    >
      {surface ? (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-[var(--soil)] px-5 py-4">
            <div>
              <h2 className="font-condensed text-4xl font-bold">{SURFACE_LABELS[surface]}</h2>
              <p className="text-sm">Work applies to the whole group.</p>
            </div>
            <button type="button" onClick={onClose} className="px-2 py-1 text-lg">
              Close
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="text-sm">Quality</div>
            <div className="font-condensed text-6xl font-bold leading-none">{formatQuality(quality)}</div>
          </div>
          <div className="flex-1 space-y-5 overflow-auto px-5 pb-6">
            {tasks.map((task) => {
              const planned = state.plannedTasks.find((item) => item.taskId === task.id);
              return (
                <section key={task.id} className="border border-[var(--soil)] p-3">
                  <h3 className="text-lg font-semibold">{task.name}</h3>
                  {planned ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p>
                        Planned {LEVEL_LABELS[planned.level]} · {planned.minutes} min
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemove(task.id)}
                        className="border border-[var(--soil)] px-3 py-1"
                      >
                        Take off
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {LEVEL_KEYS.map((level) => {
                        const minutes = taskDuration(task.id, level);
                        const check = canPlanTask(state, task.id, level);
                        return (
                          <button
                            key={level}
                            type="button"
                            disabled={!check.ok}
                            onClick={() => onPlan(task.id, level)}
                            className="border border-[var(--soil)] px-2 py-2 text-left disabled:opacity-40"
                            title={check.ok ? undefined : check.reason}
                          >
                            <div className="font-semibold">{LEVEL_LABELS[level]}</div>
                            <div className="text-sm">{minutes} min</div>
                            {!check.ok ? <div className="mt-1 text-xs">{check.reason}</div> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : null}
    </aside>
  );
}
