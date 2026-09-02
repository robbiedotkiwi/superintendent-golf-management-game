import { LEVEL_KEYS } from '../data/constants.js';
import { LEVEL_LABELS, SURFACE_LABELS, tasksForSurface } from '../data/tasks.js';
import { durationForTask, assignWorker, workerById } from '../engine/assignment.js';
import { ineligibleMachines, pickMachine, surfaceCeiling } from '../engine/equipment.js';
import { canPlanTask } from '../engine/gameState.js';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TaskPanel({ surface, state, onPlan, onRemove, onSetWorker, onClose }) {
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
            <p className="mt-1 text-sm">Ceiling {surfaceCeiling(state, surface)}</p>
          </div>
          <div className="flex-1 space-y-5 overflow-auto px-5 pb-6">
            {tasks.map((task) => {
              const planned = state.plannedTasks.find((item) => item.taskId === task.id);
              const machine = pickMachine(state, task);
              const blocked = ineligibleMachines(state, task);
              return (
                <section key={task.id} className="border border-[var(--soil)] p-3">
                  <h3 className="text-lg font-semibold">{task.name}</h3>
                  {machine ? <p className="text-sm">Using {machine.name}</p> : null}
                  {blocked.map((item) => (
                    <p key={item.machine.id} className="text-sm">
                      {item.machine.name} not offered — {item.reason}
                    </p>
                  ))}
                  {planned ? (
                    <div className="mt-2 space-y-2">
                      <p>
                        Planned
                        {task.usesQualityLevel && planned.level ? ` ${LEVEL_LABELS[planned.level]}` : ''} · {planned.minutes}{' '}
                        min · {workerById(state, planned.workerId)?.name}
                      </p>
                      <label className="block text-sm">
                        Worker
                        <select
                          className="ml-2 border border-[var(--soil)] bg-[var(--sand)] p-1"
                          value={planned.workerId}
                          onChange={(event) => onSetWorker(task.id, event.target.value)}
                        >
                          {state.workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemove(task.id)}
                        className="border border-[var(--soil)] px-3 py-1"
                      >
                        Take off
                      </button>
                    </div>
                  ) : (
                    task.usesQualityLevel ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {LEVEL_KEYS.map((level) => {
                        const assigned = assignWorker(state, task, level);
                        const minutes = durationForTask(state, task.id, level, assigned);
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
                    ) : (
                      (() => {
                        const assigned = assignWorker(state, task);
                        const minutes = durationForTask(state, task.id, undefined, assigned);
                        const check = canPlanTask(state, task.id);
                        return (
                          <button
                            type="button"
                            disabled={!check.ok}
                            onClick={() => onPlan(task.id)}
                            className="mt-3 border border-[var(--soil)] px-3 py-2 text-left disabled:opacity-40"
                            title={check.ok ? undefined : check.reason}
                          >
                            <div className="font-semibold">Plan</div>
                            <div className="text-sm">{minutes} min</div>
                            {!check.ok ? <div className="mt-1 text-xs">{check.reason}</div> : null}
                          </button>
                        );
                      })()
                    )
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
