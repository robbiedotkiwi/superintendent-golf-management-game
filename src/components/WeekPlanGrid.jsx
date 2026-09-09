import { useMemo, useState } from 'react';
import { SURFACE_LABELS } from '../data/tasks.js';
import { allowingMachines } from '../engine/equipment.js';
import { machineTitle, catalogMachineTitle } from '../engine/machineDisplay.js';
import { canEditPlanDay, weekDays, weekdayLabel } from '../engine/week.js';
import {
  courseHolesFor,
  defaultWorkerId,
  deriveWeekGrid,
  irrigationCells,
  personCapacityForDay,
  rosterPeople,
  rosterWorker,
} from '../engine/weekGrid.js';
import { IRRIGATED_SURFACES, clampIrrigationMm, irrigationMmRange } from '../engine/irrigation.js';
import ForecastStrip from './ForecastStrip.jsx';

function fillPercent(used, capacity) {
  if (capacity <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, (used / capacity) * 100);
}

function PersonBars({ state, day }) {
  const people = personCapacityForDay(state, day);
  const provisional = day > state.day;
  if (!people.length) {
    return <p className="text-[10px] text-[var(--sand)]">No one on</p>;
  }
  return (
    <div className="space-y-1" data-capacity-day={day} data-provisional={provisional || undefined}>
      {people.map((person) => (
        <div key={person.id} data-capacity-person={person.id} data-overfill={person.overfilled || undefined}>
          <div className="flex justify-between gap-1 text-[10px] leading-tight">
            <span className="truncate">{person.name}</span>
            <span>
              {Math.round(person.used)}/{person.capacity}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden bg-[var(--paint)]/20">
            <div
              className={`h-full ${person.overfilled ? 'bg-[var(--machine-orange)]' : 'bg-[var(--sand)]'}`}
              style={{ width: `${fillPercent(person.used, person.capacity)}%` }}
            />
          </div>
        </div>
      ))}
      {provisional ? <p className="text-[10px] text-[var(--sand)]">Provisional</p> : null}
    </div>
  );
}

function IrrigationDayCell({ cell, surface, onSetIrrigation, locked }) {
  const range = irrigationMmRange(surface);
  if (!range) return null;
  return (
    <label className="block text-center text-[11px]">
      <span className="sr-only">{SURFACE_LABELS[surface]} {weekdayLabel(cell.day)}</span>
      <div className="font-condensed text-lg font-bold leading-none">{cell.mm} mm</div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={cell.mm}
        disabled={locked}
        onChange={(event) => onSetIrrigation(surface, clampIrrigationMm(surface, Number(event.target.value)), cell.day)}
        className="mt-1 w-full"
        aria-label={`${SURFACE_LABELS[surface]} irrigation millimetres ${weekdayLabel(cell.day)}`}
      />
    </label>
  );
}

export default function WeekPlanGrid({
  state,
  onPlan,
  onRemove,
  onSelectDay,
  onSetIrrigation,
}) {
  const days = weekDays(state.day);
  const rows = useMemo(() => deriveWeekGrid(state), [state]);
  const [defaults, setDefaults] = useState({});

  function rowDefault(row) {
    const saved = defaults[row.taskId];
    return {
      workerId: saved?.workerId ?? defaultWorkerId(state, row),
      machineId: saved?.machineId ?? row.machineId ?? '',
    };
  }

  function setRowDefault(taskId, patch) {
    setDefaults((current) => ({
      ...current,
      [taskId]: { ...rowDefault(rows.find((row) => row.taskId === taskId) ?? { taskId }), ...current[taskId], ...patch },
    }));
  }

  function toggleCell(row, cell) {
    const edit = canEditPlanDay(state, cell.day);
    if (!edit.ok || row.lockReason) return;
    if (cell.planned) {
      for (const task of cell.tasks) {
        onRemove(task.taskId, task.planId, cell.day);
      }
      return;
    }
    const chosen = rowDefault(row);
    onPlan(row.taskId, courseHolesFor(state, row.taskId), {
      day: cell.day,
      workerId: chosen.workerId,
      machineId: chosen.machineId || undefined,
      confirmDamaging: true,
    });
  }

  const people = rosterPeople(state);

  return (
    <div className="space-y-3" data-week-grid>
      <ForecastStrip state={state} onSelectDay={onSelectDay} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[14rem] border border-[var(--sand)] bg-[var(--soil)] p-2">Job</th>
              {days.map((day) => (
                <th
                  key={day}
                  className={`min-w-[7.5rem] border border-[var(--sand)] p-2 align-top ${
                    day === state.day ? 'bg-[var(--machine-orange)]/20' : ''
                  } ${day < state.day ? 'opacity-40' : ''}`}
                >
                  <div className="font-semibold">{weekdayLabel(day)}</div>
                  <div className="mt-2">
                    <PersonBars state={state} day={day} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IRRIGATED_SURFACES.map((surface) => (
              <tr key={`irrigate-${surface}`} data-grid-row={`irrigate-${surface}`}>
                <th className="sticky left-0 z-10 border border-[var(--sand)] bg-[var(--soil)] p-2 align-top">
                  <div className="font-semibold">Irrigate {SURFACE_LABELS[surface]}</div>
                  <p className="mt-1 text-xs text-[var(--sand)]">Nightly millimetres. Not a timed job.</p>
                </th>
                {irrigationCells(state, surface).map((cell) => {
                  const edit = canEditPlanDay(state, cell.day);
                  return (
                    <td key={cell.day} className="border border-[var(--sand)] p-2 align-top">
                      <IrrigationDayCell
                        cell={cell}
                        surface={surface}
                        onSetIrrigation={onSetIrrigation}
                        locked={!edit.ok}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.map((row) => {
              const chosen = rowDefault(row);
              const locked = Boolean(row.lockReason);
              const workerLabel = row.mixedWorker
                ? 'mixed'
                : rosterWorker(state, row.workerId)?.name ?? '—';
              const machineLabel = row.mixedMachine
                ? 'mixed'
                : row.machineId
                  ? catalogMachineTitle(row.machineId)
                  : row.usesMachine
                    ? 'Auto'
                    : '—';
              const machines = row.usesMachine ? allowingMachines(state, row.task) : [];
              return (
                <tr
                  key={row.taskId}
                  data-grid-row={row.taskId}
                  data-locked={locked || undefined}
                  className={locked ? 'opacity-50' : ''}
                  title={row.lockReason ?? undefined}
                >
                  <th className="sticky left-0 z-10 border border-[var(--sand)] bg-[var(--soil)] p-2 align-top">
                    <div className="font-semibold">{row.label}</div>
                    {row.daysSince ? (
                      <p className="mt-1 text-xs text-[var(--sand)]" data-days-since={row.taskId}>
                        {row.daysSince}
                      </p>
                    ) : null}
                    <label className="mt-2 block text-xs text-[var(--sand)]">
                      Worker
                      <select
                        className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-1 py-1 text-[var(--paint)]"
                        value={row.mixedWorker && !defaults[row.taskId]?.workerId ? 'mixed' : chosen.workerId}
                        disabled={locked}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === 'mixed') return;
                          setRowDefault(row.taskId, { workerId: value });
                        }}
                        aria-label={`${row.label} worker`}
                      >
                        {row.mixedWorker ? <option value="mixed">mixed</option> : null}
                        {people.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                            {worker.isCasual ? ' · casual' : ''}
                            {worker.isVolunteer ? ' · volunteer' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    {row.usesMachine ? (
                      <label className="mt-2 block text-xs text-[var(--sand)]">
                        Machine
                        <select
                          className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-1 py-1 text-[var(--paint)]"
                          value={row.mixedMachine && !defaults[row.taskId]?.machineId ? 'mixed' : chosen.machineId || ''}
                          disabled={locked}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'mixed') return;
                            setRowDefault(row.taskId, { machineId: value });
                          }}
                          aria-label={`${row.label} machine`}
                        >
                          {row.mixedMachine ? <option value="mixed">mixed</option> : null}
                          <option value="">Auto</option>
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machineTitle(machine)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <p className="mt-1 text-[11px]" data-row-worker={row.taskId}>
                      {workerLabel}
                      {row.usesMachine ? ` · ${machineLabel}` : ''}
                    </p>
                  </th>
                  {row.cells.map((cell) => {
                    const edit = canEditPlanDay(state, cell.day);
                    const disabled = locked || !edit.ok;
                    return (
                      <td key={cell.day} className="border border-[var(--sand)] p-2 text-center align-middle">
                        <button
                          type="button"
                          data-grid-cell={`${row.taskId}-${cell.day}`}
                          data-unassigned={cell.unassigned || undefined}
                          disabled={disabled}
                          onClick={() => toggleCell(row, cell)}
                          className={`h-8 w-8 border ${
                            cell.unassigned
                              ? 'border-dashed border-[var(--sand)] bg-transparent text-[var(--sand)]'
                              : cell.planned
                                ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]'
                                : 'border-[var(--sand)]/40'
                          } disabled:opacity-40`}
                          aria-pressed={cell.planned}
                          aria-label={`${row.label} ${cell.weekday}${cell.unassigned ? ' unassigned' : ''}`}
                          title={
                            cell.unassigned
                              ? 'Assigned person is not available. This cell will not run.'
                              : edit.ok
                                ? undefined
                                : edit.reason
                          }
                        >
                          {cell.unassigned ? '·' : cell.planned ? '✓' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
