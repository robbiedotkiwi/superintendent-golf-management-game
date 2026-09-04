import { useEffect, useRef, useState } from 'react';
import { OVERRUN_DROP_COPY } from '../data/constants.js';
import { getTask } from '../data/tasks.js';
import { workerById } from '../engine/assignment.js';
import { getMachine } from '../engine/equipment.js';
import { machineTitle } from '../engine/machineDisplay.js';
import { formatHoleSet } from '../engine/holes.js';

export default function PlanList({ state, compact = false, onReorder, onRemove }) {
  const [dragId, setDragId] = useState(null);
  const dragIdRef = useRef(null);
  const tasks = state.plannedTasks ?? [];
  const tasksRef = useRef(tasks);
  const onReorderRef = useRef(onReorder);
  tasksRef.current = tasks;
  onReorderRef.current = onReorder;

  function moveToPoint(fromId, clientY, row) {
    if (!fromId || !row) return;
    const toId = row.dataset.planTask;
    if (!toId || toId === fromId) return;
    const ids = tasksRef.current.map((item) => item.taskId);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const rect = row.getBoundingClientRect();
    let insert = clientY < rect.top + rect.height / 2 ? to : to + 1;
    if (from < insert) insert -= 1;
    if (insert === from) return;
    ids.splice(from, 1);
    ids.splice(insert, 0, fromId);
    onReorderRef.current?.(ids);
  }

  function startDrag(id) {
    dragIdRef.current = id;
    setDragId(id);
  }

  function endDrag() {
    dragIdRef.current = null;
    setDragId(null);
  }

  useEffect(() => {
    function rowAt(event) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      return el?.closest('[data-plan-task]') ?? null;
    }
    function onMove(event) {
      const fromId = dragIdRef.current;
      if (!fromId) return;
      moveToPoint(fromId, event.clientY, rowAt(event));
    }
    function onUp(event) {
      const fromId = dragIdRef.current;
      if (fromId) moveToPoint(fromId, event.clientY, rowAt(event));
      endDrag();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
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
            const rowId = planned.planId ?? planned.taskId;
            return (
              <li
                key={rowId}
                data-plan-task={planned.taskId}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if (event.target.closest('button')) return;
                  event.preventDefault();
                  startDrag(planned.taskId);
                }}
                className={`flex cursor-grab select-none items-start justify-between gap-2 border border-[var(--sand)] p-2 active:cursor-grabbing ${
                  dragId === planned.taskId ? 'opacity-50' : ''
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {index + 1}. {task?.name ?? planned.taskId}
                  </div>
                  <p className="text-sm text-[var(--sand)]">
                    {worker?.name ?? 'Unassigned'}
                    {machine ? ` · ${machineTitle(machine)}` : ''}
                    {planned.holes?.length ? ` · ${formatHoleSet(planned.holes)}` : ''}
                    {` · ${planned.minutes} min`}
                  </p>
                </div>
                {onRemove ? (
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onRemove(planned.taskId, planned.planId)}
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
