import { tasksForSurface, taskUsesMachine } from '../data/tasks.js';
import { durationForTask, assignWorker, certifiedPresent, workerById } from '../engine/assignment.js';
import { getMachine, ineligibleMachines, pickMachineForTask } from '../engine/equipment.js';
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
              {machine ? <p className="text-sm text-[var(--sand)]">Using {machine.name}</p> : null}
              {blocked.map((item) => (
                <p key={item.machine.id} className="text-sm text-[var(--sand)]">
                  {item.machine.name} not offered — {item.reason}
                </p>
              ))}
              {planned ? (
                <div className="mt-2 space-y-2">
                  <p>
                    Planned · {planned.minutes} min · {workerById(state, planned.workerId)?.name}
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
