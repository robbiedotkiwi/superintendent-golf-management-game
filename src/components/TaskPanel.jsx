import { tasksForSurface, taskUsesMachine } from '../data/tasks.js';
import {
  SUITABILITY_LABELS,
  SUITABILITY_PENALTY_COPY,
} from '../data/constants.js';
import { durationForTask, assignWorker, certifiedPresent, workerById, workerAllows } from '../engine/assignment.js';
import { workerAbsenceReason } from '../engine/availability.js';
import { getMachine, ineligibleMachines, machineSuitability, pickMachineForTask } from '../engine/equipment.js';
import { machineTitle } from '../engine/machineDisplay.js';
import { inPrepWindow } from '../engine/tournament.js';
import { findPlannedJob } from '../engine/jobs.js';
import { formatHoleSet } from '../engine/holes.js';
import { formatMoney } from '../engine/format.js';
import PlanConfirmButton from './PlanConfirmButton.jsx';

function suitabilityLine(machine, surface) {
  const suit = machineSuitability(machine, surface);
  if (!suit) return null;
  return `${SUITABILITY_LABELS[suit]} · ${SUITABILITY_PENALTY_COPY(suit)}`;
}

export default function TaskPanel({ surface, state, holes, onPlan, onRemove, onSetWorker }) {
  const tasks = tasksForSurface(surface);
  const jobHoles = holes?.length ? holes : undefined;

  return (
    <div className="space-y-3 text-[var(--paint)]">
      {tasks.some((task) => task.requiresSpray) && !certifiedPresent(state, surface) ? (
        <p className="text-sm text-[var(--sand)]">Spray and fertiliser do not appear — no spray-certified worker available.</p>
      ) : null}
      {tasks
        .filter((task) => !task.requiresSpray || certifiedPresent(state, surface))
        .filter((task) => task.kind !== 'prep' || inPrepWindow(state))
        .map((task) => {
          const planned = findPlannedJob(state, task.id, jobHoles);
          const assigned = planned ? workerById(state, planned.workerId) : assignWorker(state, task, jobHoles);
          const machine = planned?.machineId
            ? getMachine(planned.machineId)
            : taskUsesMachine(task)
              ? pickMachineForTask(state, task, assigned)
              : null;
          const blocked = taskUsesMachine(task) ? ineligibleMachines(state, task) : [];
          const workers = task.requiresSpray
            ? state.workers.filter((worker) => worker.sprayCertified)
            : state.workers;
          const suitCopy = machine && task.surface ? suitabilityLine(machine, task.surface) : null;
          return (
            <section key={task.id} className="border border-[var(--sand)] p-3">
              <h3 className="text-lg font-semibold">{task.name}</h3>
              {task.materialsCost ? <p className="text-sm text-[var(--sand)]">Materials {formatMoney(task.materialsCost)}</p> : null}
              {machine ? (
                <p className="text-sm text-[var(--sand)]">
                  Using {machineTitle(machine)}
                  {suitCopy ? ` · ${suitCopy}` : ''}
                </p>
              ) : null}
              {blocked.map((item) => {
                const line = suitabilityLine(item.machine, task.surface);
                return (
                  <p key={item.machine.id} className="text-sm text-[var(--sand)]">
                    {machineTitle(item.machine)}
                    {line ? ` · ${line}` : ` — ${item.reason}`}
                  </p>
                );
              })}
              {planned ? (
                <div className="mt-2 space-y-2">
                  <p>
                    Planned · {planned.minutes} min · {workerById(state, planned.workerId)?.name}
                    {planned.holes?.length ? ` · ${formatHoleSet(planned.holes)}` : ''}
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
                  <button type="button" onClick={() => onRemove(task.id, planned.planId)} className="border border-[var(--sand)] px-3 py-1">
                    Take off
                  </button>
                </div>
              ) : (
                (() => {
                  const minutes = durationForTask(state, task.id, assigned, undefined, jobHoles);
                  return (
                    <PlanConfirmButton
                      state={state}
                      taskId={task.id}
                      holes={jobHoles}
                      onPlan={onPlan}
                      className="mt-3 border border-[var(--sand)] px-3 py-2 text-left disabled:opacity-40"
                    >
                      <div className="font-condensed text-3xl font-bold leading-none">{minutes}</div>
                      <div className="text-xs text-[var(--sand)]">min</div>
                    </PlanConfirmButton>
                  );
                })()
              )}
            </section>
          );
        })}
    </div>
  );
}
