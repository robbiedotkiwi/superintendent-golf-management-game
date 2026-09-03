import { useState } from 'react';
import { OVERRUN_DROP_COPY } from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { workerById } from '../engine/assignment.js';
import { getMachine } from '../engine/equipment.js';

export default function PlanList({ state, compact = false, onReorder, onRemove }) {
  const [dragId, setDragId] = useState(null);
  const tasks = state.plannedTasks ?? [];

  function handleDrop(toId) {
    if (!dragId || !toId || dragId === toId) {
      setDragId(null);
      return;
    }
    const ids = tasks.map((item) => item.taskId);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder?.(ids);
    setDragId(null);
  }

  return (
    <div className={compact ? 'text-sm' : ''}>
      <p className="text-sm text-[var(--sand)]">{OVERRUN_DROP_COPY}</p>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--sand)]">Nothing planned.</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {tasks.map((planned, index) => {
            const task = getTask(planned.taskId);
            const worker = workerById(state, planned.workerId);
            const machine = planned.machineId ? getMachine(planned.machineId) : null;
            return (
              <li
                key={planned.taskId}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', planned.taskId);
                  event.dataTransfer.effectAllowed = 'move';
                  setDragId(planned.taskId);
                }}
                onDragEnd={() => setDragId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(planned.taskId);
                }}
                className={`flex cursor-grab items-start justify-between gap-2 border border-[var(--sand)] p-2 active:cursor-grabbing ${
                  dragId === planned.taskId ? 'opacity-50' : ''
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {index + 1}. {task?.name ?? planned.taskId}
                  </div>
                  <p className="text-sm text-[var(--sand)]">
                    {worker?.name ?? 'Unassigned'}
                    {machine ? ` · ${machine.name}` : ''}
                    {` · ${planned.minutes} min`}
                  </p>
                </div>
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(planned.taskId)}
                    className="border border-[var(--sand)] px-2 py-1 text-sm"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
