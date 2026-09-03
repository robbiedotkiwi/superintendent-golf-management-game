import { useEffect, useRef, useState } from 'react';
import { OVERRUN_DROP_COPY } from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { workerById } from '../engine/assignment.js';
import { getMachine } from '../engine/equipment.js';

export default function PlanList({ state, compact = false, onReorder, onRemove }) {
  const [dragId, setDragId] = useState(null);
  const dragIdRef = useRef(null);
  const tasks = state.plannedTasks ?? [];
  const tasksRef = useRef(tasks);
  const onReorderRef = useRef(onReorder);
  tasksRef.current = tasks;
  onReorderRef.current = onReorder;

  function move(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const ids = tasksRef.current.map((item) => item.taskId);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    onReorderRef.current?.(ids);
  }

  function startDrag(id, event) {
    dragIdRef.current = id;
    setDragId(id);
    if (event?.dataTransfer) {
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function endDrag() {
    dragIdRef.current = null;
    setDragId(null);
  }

  useEffect(() => {
    function onUp(event) {
      const fromId = dragIdRef.current;
      if (!fromId) return;
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const row = el?.closest('[data-plan-task]');
      if (row?.dataset.planTask) move(fromId, row.dataset.planTask);
      endDrag();
    }
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, []);

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
                data-plan-task={planned.taskId}
                draggable
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if (event.target.closest('button')) return;
                  startDrag(planned.taskId, event);
                }}
                onDragStart={(event) => startDrag(planned.taskId, event)}
                onDragEnd={endDrag}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId = event.dataTransfer.getData('text/plain') || dragIdRef.current;
                  move(fromId, planned.taskId);
                  endDrag();
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
                    draggable={false}
                    onPointerDown={(event) => event.stopPropagation()}
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
