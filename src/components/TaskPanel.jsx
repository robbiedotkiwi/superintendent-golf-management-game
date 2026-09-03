import { LEVEL_KEYS } from '../data/constants.js';
import { LEVEL_LABELS, SURFACE_LABELS, tasksForSurface, taskUsesMachine } from '../data/tasks.js';
import { durationForTask, assignWorker, certifiedPresent, workerById } from '../engine/assignment.js';
import { ineligibleMachines, pickMachine, surfaceCeiling } from '../engine/equipment.js';
import { inPrepWindow } from '../engine/tournament.js';
import { canPlanTask } from '../engine/gameState.js';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TaskPanel({ surface, state, onPlan, onRemove, onSetWorker, onClose }) {
  const quality = state.surfaces[surface].quality;
  const tasks = tasksForSurface(surface);

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-72 max-w-[min(18rem,100%)] flex-col border-l-4 border-[var(--sand)] bg-[var(--soil)] text-[var(--paint)]"
    >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--sand)] px-4 py-3">
            <div>
              <h2 className="font-condensed text-4xl font-bold">{SURFACE_LABELS[surface]}</h2>
              <p className="text-sm text-[var(--sand)]">Work applies to the whole group.</p>
            </div>
            <button type="button" onClick={onClose} className="px-2 py-1 text-lg">
              Close
            </button>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm text-[var(--sand)]">Quality</div>
            <div className="font-condensed text-6xl font-bold leading-none">{formatQuality(quality)}</div>
            <p className="mt-1 text-sm text-[var(--sand)]">Ceiling {surfaceCeiling(state, surface)}</p>
            {state.disease?.[surface] ? (
              <p className="mt-2 text-sm">
                Disease pressure {Math.round(state.disease[surface].pressure)}
                {state.disease[surface].outbreak ? ' · outbreak' : ''}
              </p>
            ) : null}
          </div>
          <div className="flex-1 space-y-4 overflow-auto px-4 pb-5">
            {tasks.some((task) => task.requiresSpray) && !certifiedPresent(state, surface) ? (
              <p className="text-sm text-[var(--sand)]">Spray and fertiliser do not appear — no spray-certified worker available.</p>
            ) : null}
            {tasks
              .filter((task) => !task.requiresSpray || certifiedPresent(state, surface))
              .filter((task) => task.kind !== 'prep' || inPrepWindow(state))
              .map((task) => {
              const planned = state.plannedTasks.find((item) => item.taskId === task.id);
              const machine = taskUsesMachine(task) ? pickMachine(state, task) : null;
              const blocked = taskUsesMachine(task) ? ineligibleMachines(state, task) : [];
              const workers = task.requiresSpray
                ? state.workers.filter((worker) => worker.sprayCertified)
                : state.workers;
              return (
                <section key={task.id} className="border border-[var(--sand)] p-3">
                  <h3 className="text-lg font-semibold">{task.name}</h3>
                  {task.materialsCost ? <p className="text-sm text-[var(--sand)]">Materials {task.materialsCost}</p> : null}
                  {machine ? <p className="text-sm text-[var(--sand)]">Using {machine.name}</p> : null}
                  {blocked.map((item) => (
                    <p key={item.machine.id} className="text-sm text-[var(--sand)]">
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
                      <label className="block text-sm text-[var(--sand)]">
                        Worker
                        <select
                          className="ml-2 border border-[var(--sand)] bg-[var(--soil)] p-1 text-[var(--paint)]"
                          value={planned.workerId}
                          onChange={(event) => onSetWorker(task.id, event.target.value)}
                        >
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemove(task.id)}
                        className="border border-[var(--sand)] px-3 py-1"
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
                            className="border border-[var(--sand)] px-2 py-2 text-left disabled:opacity-40"
                            title={check.ok ? undefined : check.reason}
                          >
                            <div className="font-condensed text-3xl font-bold leading-none">{minutes}</div>
                            <div className="text-xs text-[var(--sand)]">min</div>
                            <div className="mt-1 text-sm">{LEVEL_LABELS[level]}</div>
                            {!check.ok ? <div className="mt-1 text-xs text-[var(--sand)]">{check.reason}</div> : null}
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
                            className="mt-3 border border-[var(--sand)] px-3 py-2 text-left disabled:opacity-40"
                            title={check.ok ? undefined : check.reason}
                          >
                            <div className="font-condensed text-3xl font-bold leading-none">{minutes}</div>
                            <div className="text-xs text-[var(--sand)]">min</div>
                            {!check.ok ? <div className="mt-1 text-xs text-[var(--sand)]">{check.reason}</div> : null}
                          </button>
                        );
                      })()
                    )
                  )}
                </section>
              );
            })}
          </div>
    </aside>
  );
}
