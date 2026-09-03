import { tasksForSurface, taskUsesMachine } from '../data/tasks.js';
import { durationForTask, assignWorker, certifiedPresent, workerById, workerAllows } from '../engine/assignment.js';
import { workerAbsenceReason } from '../engine/availability.js';
import { getMachine, ineligibleMachines, pickMachineForTask } from '../engine/equipment.js';
import { machineTitle } from '../engine/machineDisplay.js';
import { inPrepWindow } from '../engine/tournament.js';
import { canPlanTask } from '../engine/gameState.js';
import { formatMoney } from '../engine/format.js';

export default function TaskPanel({ surface, state, onPlan, onRemove, onSetWorker }) {
  const tasks = tasksForSurface(surface);

  return (
    <div className="space-y-3 text-[var(--paint)]">
      {tasks.some((task) => task.requiresSpray) && !certifiedPresent(state, surface) ? (
        <p className="text-sm text-[var(--sand)]">Spray and fertiliser do not appear — no spray-certified worker available.</p>
      ) : null}
      {tasks
        .filter((task) => !task.requiresSpray || certifiedPresent(state, surface))
        .filter((task) => task.kind !== 'prep' || inPrepWindow(state))
        .map((task) => {
          const planned = state.plannedTasks.find((item) => item.taskId === task.id);
          const assigned = planned ? workerById(state, planned.workerId) : assignWorker(state, task);
          const machine = planned?.machineId
            ? getMachine(planned.machineId)
            : taskUsesMachine(task)
              ? pickMachineForTask(state, task, assigned)
              : null;
          const blocked = taskUsesMachine(task) ? ineligibleMachines(state, task) : [];
          const workers = task.requiresSpray
            ? state.workers.filter((worker) => worker.sprayCertified)
            : state.workers;
          return (
            <section key={task.id} className="border border-[var(--sand)] p-3">
              <h3 className="text-lg font-semibold">{task.name}</h3>
              {task.materialsCost ? <p className="text-sm text-[var(--sand)]">Materials {formatMoney(task.materialsCost)}</p> : null}
              {machine ? <p className="text-sm text-[var(--sand)]">Using {machineTitle(machine)}</p> : null}
              {blocked.map((item) => (
                <p key={item.machine.id} className="text-sm text-[var(--sand)]">
                  {machineTitle(item.machine)} not offered — {item.reason}
                </p>
              ))}
              {planned ? (
                <div className="mt-2 space-y-2">
                  <p>
                    Planned · {planned.minutes} min · {workerById(state, planned.workerId)?.name}
                  </p>
                  <div className="block text-sm text-[var(--sand)]">
                    Worker
                    <ul className="mt-1 space-y-1">
                      {workers.map((worker) => {
                        const reason = workerAbsenceReason(state, worker);
                        const selectable = !reason && workerAllows(worker, task.surface);
                        return (
                          <li key={worker.id}>
                            <button
                              type="button"
                              disabled={!selectable}
                              onClick={() => onSetWorker(task.id, worker.id)}
                              className={`block w-full border border-[var(--sand)] px-2 py-1 text-left text-[var(--paint)] disabled:opacity-70 ${
                                reason ? 'line-through' : ''
                              } ${planned.workerId === worker.id ? 'bg-[var(--machine-orange)]' : ''}`}
                            >
                              {reason ?? worker.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <button type="button" onClick={() => onRemove(task.id)} className="border border-[var(--sand)] px-3 py-1">
                    Take off
                  </button>
                </div>
              ) : (
                (() => {
                  const minutes = durationForTask(state, task.id, assigned);
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
              )}
            </section>
          );
        })}
    </div>
  );
}
