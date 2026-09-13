import { useRef, useState } from 'react';
import {
  HOUR_INCREMENT,
  MINUTES_PER_HOUR,
  PLANNER_HANDLE_PX,
  PLANNER_HOUR_PX,
  PLANNER_NAME_PX,
  PLANNER_PALETTE_PX,
  PLANNER_ROW_PX,
} from '../data/config.js';
import { STAFF_TIER_LABELS } from '../data/config.js';
import { canEditPlanDay, planningDayOf, weekDays, weekdayLabel, workersForPlanDay } from '../engine/week.js';
import {
  autoMachineFor,
  blockConflicts,
  blockFace,
  blockLeftPx,
  blockWidthPx,
  conflictCopy,
  formatPlannerHours,
  hourFromClientX,
  hourTicks,
  overrideMachinesFor,
  paletteHoursFor,
  plannerPalette,
  snapMinutes,
  surplusWastedHours,
  timelineWidthPx,
} from '../engine/dayPlanner.js';
import { hoursToMinutes, minutesToHours } from '../engine/duration.js';
import { getTask, SURFACE_LABELS } from '../data/tasks.js';
import { catalogMachineTitle } from '../engine/machineDisplay.js';
import { staffCanRunMachine } from '../engine/passes.js';
import ForecastStrip from './ForecastStrip.jsx';
import SeasonBar from './SeasonBar.jsx';
import GradeStrip from './GradeStrip.jsx';
import MachinePassPanel from './MachinePassPanel.jsx';
import { weekPassStrip } from '../engine/weekPasses.js';

const DRAG_MIME = 'application/x-greenkeeper-block';

function parseDrag(event) {
  try {
    return JSON.parse(event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain') || '{}');
  } catch {
    return null;
  }
}

export default function DayPlanner({
  state,
  onPlaceBlock,
  onMoveBlock,
  onResizeBlock,
  onSetBlockMachine,
  onRemove,
  onSelectDay,
  onCopyYesterday,
  onSaveTemplate,
  onApplyTemplate,
}) {
  const day = planningDayOf(state);
  const edit = canEditPlanDay(state, day);
  const crew = workersForPlanDay(state, day).filter((worker) => worker.minutesToday > 0 || (state.weekPlan?.days?.[day]?.tasks ?? []).some((item) => item.workerId === worker.id));
  const [hoverWorkerId, setHoverWorkerId] = useState(crew[0]?.id ?? null);
  const [templateName, setTemplateName] = useState('');
  const [resize, setResize] = useState(null);
  const timelineRefs = useRef({});
  const flags = state.lastCopyFlags ?? [];
  const paletteWorker = crew.find((item) => item.id === hoverWorkerId) ?? crew[0];
  const ticks = hourTicks(state, day);
  const width = timelineWidthPx(state, day);
  const days = weekDays(state.day);
  const dayIndex = days.indexOf(day);
  const strip = weekPassStrip(state);

  function dropOnRow(event, worker) {
    event.preventDefault();
    const payload = parseDrag(event);
    if (!payload || !edit.ok) return;
    const timeline = timelineRefs.current[worker.id];
    const startHour = hourFromClientX(timeline, event.clientX);
    const startMinute = hoursToMinutes(startHour);
    if (payload.kind === 'palette') {
      onPlaceBlock?.({
        day,
        workerId: worker.id,
        taskId: payload.taskId,
        startMinute,
      });
      return;
    }
    if (payload.kind === 'move' && payload.planId) {
      onMoveBlock?.({ day, planId: payload.planId, workerId: worker.id, startMinute });
    }
  }

  function onResizePointer(event, block, edge) {
    if (!edit.ok) return;
    event.preventDefault();
    event.stopPropagation();
    const start = block.startMinute ?? 0;
    const end = start + (block.minutes ?? 0);
    setResize({
      planId: block.planId,
      edge,
      originX: event.clientX,
      start,
      end,
    });
    function move(ev) {
      const deltaHours = (ev.clientX - event.clientX) / PLANNER_HOUR_PX;
      const deltaMin = hoursToMinutes(deltaHours);
      let nextStart = start;
      let nextEnd = end;
      if (edge === 'left') nextStart = snapMinutes(Math.max(0, start + deltaMin));
      else nextEnd = snapMinutes(Math.max(start + HOUR_INCREMENT * MINUTES_PER_HOUR, end + deltaMin));
      if (nextEnd - nextStart < HOUR_INCREMENT * MINUTES_PER_HOUR) {
        if (edge === 'left') nextStart = nextEnd - HOUR_INCREMENT * MINUTES_PER_HOUR;
        else nextEnd = nextStart + HOUR_INCREMENT * MINUTES_PER_HOUR;
      }
      onResizeBlock?.({
        day,
        planId: block.planId,
        startMinute: nextStart,
        minutes: nextEnd - nextStart,
      });
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setResize(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div className="space-y-3" data-day-planner>
      <ForecastStrip state={state} onSelectDay={onSelectDay} />
      <SeasonBar state={state} />
      <GradeStrip state={state} />
      <MachinePassPanel state={state} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className="border border-[var(--sand)] px-2 py-1 disabled:opacity-40"
          disabled={dayIndex <= 0}
          onClick={() => onSelectDay?.(days[dayIndex - 1])}
          data-day-prev
        >
          Previous day
        </button>
        <div className="font-semibold" data-planner-day>
          {weekdayLabel(day)}
          {day === state.day ? ' · today' : day < state.day ? ' · past' : ''}
        </div>
        <button
          type="button"
          className="border border-[var(--sand)] px-2 py-1 disabled:opacity-40"
          disabled={dayIndex < 0 || dayIndex >= days.length - 1}
          onClick={() => onSelectDay?.(days[dayIndex + 1])}
          data-day-next
        >
          Next day
        </button>
        {flags.length ? (
          <span className="text-[10px] text-red-400">Copied with flags: {flags.join(', ')}</span>
        ) : null}
        {!edit.ok ? <span className="text-[10px] text-[var(--sand)]">{edit.reason}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 border border-[var(--sand)] p-2 text-[11px] sm:grid-cols-4" data-week-strip>
        {strip.map((row) => (
          <div key={row.area} data-week-strip-area={row.area}>
            <div className="font-semibold">{SURFACE_LABELS[row.area] ?? row.area}</div>
            <div className="text-[var(--sand)]">
              {formatPlannerHours(row.banked)} / {formatPlannerHours(row.required)} banked
            </div>
            <div className="text-[var(--sand)]">{formatPlannerHours(row.owed)} owed</div>
          </div>
        ))}
      </div>
      <div className="flex gap-3" style={{ minHeight: PLANNER_ROW_PX * Math.max(2, crew.length + 1) }}>
        <aside className="shrink-0 space-y-1 overflow-y-auto border border-[var(--sand)] p-2" style={{ width: PLANNER_PALETTE_PX }} data-task-palette>
          <div className="text-[10px] uppercase tracking-wide text-[var(--sand)]">Tasks</div>
          {plannerPalette().map((item) => {
            const task = getTask(item.taskId);
            const machine = paletteWorker ? autoMachineFor(state, task, paletteWorker) : null;
            const hours = paletteWorker
              ? paletteHoursFor(state, item.taskId, paletteWorker)
              : HOUR_INCREMENT;
            return (
              <div
                key={item.taskId}
                draggable={edit.ok}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'palette', taskId: item.taskId }));
                  event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'palette', taskId: item.taskId }));
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                className="cursor-grab border border-[var(--sand)] px-2 py-1 text-[11px] leading-tight active:cursor-grabbing"
                data-palette-task={item.taskId}
                data-palette-hours={formatPlannerHours(hours)}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-[var(--sand)]">
                  {formatPlannerHours(hours)} hr
                  {machine ? ` · ${catalogMachineTitle(machine.id) || machine.model || machine.name}` : ''}
                </div>
                {paletteWorker ? (
                  <div className="text-[10px] text-[var(--sand)]">for {paletteWorker.name}</div>
                ) : null}
              </div>
            );
          })}
        </aside>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex" style={{ marginLeft: PLANNER_NAME_PX, width }}>
            {ticks.filter((tick) => Number.isInteger(tick) || tick % 1 === 0).map((tick) =>
              Number.isInteger(tick) ? (
                <div key={tick} className="shrink-0 text-[10px] text-[var(--sand)]" style={{ width: PLANNER_HOUR_PX }}>
                  {tick}h
                </div>
              ) : null,
            )}
          </div>
          {crew.map((worker) => {
            const tasks = (state.weekPlan?.days?.[day]?.tasks ?? []).filter((item) => item.workerId === worker.id);
            return (
              <div
                key={worker.id}
                className={`flex border-b border-[var(--sand)]/40 ${
                  hoverWorkerId === worker.id ? 'bg-[var(--machine-orange)]/10' : ''
                }`}
                data-crew-row={worker.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHoverWorkerId(worker.id);
                }}
                onDrop={(event) => dropOnRow(event, worker)}
                onPointerEnter={() => setHoverWorkerId(worker.id)}
              >
                <div className="shrink-0 border-r border-[var(--sand)]/40 p-1 text-[11px] leading-tight" style={{ width: PLANNER_NAME_PX, minHeight: PLANNER_ROW_PX }}>
                  <div className="font-semibold">{worker.name}</div>
                  <div className="text-[var(--sand)]">{STAFF_TIER_LABELS[worker.tier] ?? worker.tier}</div>
                  <div className="text-[var(--sand)]">
                    {formatPlannerHours(minutesToHours(worker.minutesUsed))}/
                    {formatPlannerHours(minutesToHours(worker.minutesToday))} hr
                  </div>
                </div>
                <div
                  ref={(node) => {
                    timelineRefs.current[worker.id] = node;
                  }}
                  className="relative"
                  style={{ width, minHeight: PLANNER_ROW_PX, backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${PLANNER_HOUR_PX - 1}px, rgba(232,228,218,0.12) ${PLANNER_HOUR_PX - 1}px, rgba(232,228,218,0.12) ${PLANNER_HOUR_PX}px)` }}
                >
                  {tasks.map((block) => {
                    const face = blockFace(state, block, worker);
                    const conflicts = blockConflicts(state, block, day);
                    const wasted = surplusWastedHours(state, block, day);
                    const machines = overrideMachinesFor(state, getTask(block.taskId));
                    return (
                      <div
                        key={block.planId}
                        draggable={edit.ok && resize == null}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'move', planId: block.planId }));
                          event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'move', planId: block.planId }));
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        className={`absolute top-1 overflow-hidden border text-[10px] leading-tight ${
                          conflicts.length ? 'border-red-500 bg-red-950/40 text-red-200' : 'border-[var(--machine-orange)] bg-[var(--soil)]'
                        }`}
                        style={{
                          left: blockLeftPx(block.startMinute ?? 0),
                          width: blockWidthPx(block.minutes),
                          height: PLANNER_ROW_PX - 10,
                        }}
                        data-plan-block={block.planId}
                        data-conflict={conflicts.join(',') || undefined}
                      >
                        {edit.ok ? (
                          <button
                            type="button"
                            aria-label="Resize start"
                            className="absolute bottom-0 left-0 top-0 cursor-ew-resize bg-[var(--machine-orange)]/40"
                            style={{ width: PLANNER_HANDLE_PX }}
                            onPointerDown={(event) => onResizePointer(event, block, 'left')}
                          />
                        ) : null}
                        <div className="px-2 py-0.5" style={{ marginLeft: PLANNER_HANDLE_PX, marginRight: PLANNER_HANDLE_PX }}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold">
                              {face.label} · {formatPlannerHours(face.hours)}h
                              {face.fraction != null ? ` · ${face.fraction.toFixed(2)} pass` : ''}
                            </span>
                            {edit.ok ? (
                              <button type="button" onClick={() => onRemove(block.taskId, block.planId, day)}>
                                ×
                              </button>
                            ) : null}
                          </div>
                          <div className="text-[var(--sand)]" data-block-machine>
                            {face.machine || 'No machine'}
                          </div>
                          {machines.length ? (
                            <select
                              className="mt-0.5 w-full bg-[var(--soil)] text-[10px]"
                              value={block.machineId ?? ''}
                              disabled={!edit.ok}
                              aria-label="Machine override"
                              onChange={(event) =>
                                onSetBlockMachine?.({
                                  day,
                                  planId: block.planId,
                                  machineId: event.target.value || null,
                                })
                              }
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <option value="">Auto / own</option>
                              {machines.map((machine) => {
                                const permitted = staffCanRunMachine(worker, machine);
                                const title = machine.model ?? catalogMachineTitle(machine.id) ?? machine.name;
                                return (
                                  <option key={machine.id} value={machine.id}>
                                    {permitted ? title : `${title} (tier)`}
                                  </option>
                                );
                              })}
                            </select>
                          ) : null}
                          {conflicts.map((reason) => (
                            <div key={reason} data-conflict-reason={reason}>
                              {conflictCopy(reason, reason === 'surplus' ? wasted : undefined)}
                            </div>
                          ))}
                        </div>
                        {edit.ok ? (
                          <button
                            type="button"
                            aria-label="Resize end"
                            className="absolute bottom-0 right-0 top-0 cursor-ew-resize bg-[var(--machine-orange)]/40"
                            style={{ width: PLANNER_HANDLE_PX }}
                            onPointerDown={(event) => onResizePointer(event, block, 'right')}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!crew.length ? <p className="p-2 text-sm text-[var(--sand)]">No one is on today.</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className="border border-[var(--sand)] px-2 py-1"
          onClick={() => onCopyYesterday?.(day)}
          data-copy-yesterday
        >
          Copy yesterday
        </button>
        <input
          className="border border-[var(--sand)] bg-[var(--soil)] px-2 py-1"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="Day template name"
          aria-label="Day template name"
        />
        <button type="button" className="border border-[var(--sand)] px-2 py-1" onClick={() => onSaveTemplate?.(templateName)} data-save-template>
          Save template
        </button>
        <select
          className="border border-[var(--sand)] bg-[var(--soil)] px-2 py-1"
          value=""
          onChange={(event) => {
            const id = Number(event.target.value);
            if (id) onApplyTemplate?.(id);
          }}
          aria-label="Apply day template"
        >
          <option value="">Apply template…</option>
          {(state.planTemplates ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
