import { useMemo, useState } from 'react';
import { PLAYER_ID } from '../data/constants.js';
import { allowingMachines } from '../engine/equipment.js';
import { machineTitle, catalogMachineTitle } from '../engine/machineDisplay.js';
import { canEditPlanDay, planDayChrome, weekDays, weekdayLabel } from '../engine/week.js';
import {
  capacityBarsForPerson,
  courseHolesFor,
  daysMatchingWorker,
  defaultWorkerId,
  displayCellMinutes,
  EVERYONE_ID,
  isEveryonePlanner,
  jobsThatWontFit,
  machineCapacityForDay,
  rosterPeople,
  rosterWorker,
  rowsForPerson,
} from '../engine/weekGrid.js';
import { workerAllows, workerBringsOwnMower } from '../engine/skills.js';
import ForecastStrip from './ForecastStrip.jsx';

function fillPercent(used, capacity) {
  if (capacity <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, (used / capacity) * 100);
}

function PersonBars({ state, day, workerId }) {
  const people = capacityBarsForPerson(state, day, workerId);
  const wontFit = jobsThatWontFit(state, day, isEveryonePlanner(workerId) ? null : workerId);
  const provisional = day > state.day;
  if (!people.length) {
    return (
      <div data-capacity-day={day} data-wont-fit={wontFit.length}>
        <p className="text-[10px] text-[var(--sand)]">{workerId && !isEveryonePlanner(workerId) ? 'Not on' : 'No one on'}</p>
        {wontFit.length ? (
          <p className="mt-1 text-[10px] font-semibold text-red-500" data-wont-fit-line>
            {wontFit.length} job{wontFit.length === 1 ? '' : 's'} won&apos;t fit
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-1" data-capacity-day={day} data-provisional={provisional || undefined} data-wont-fit={wontFit.length}>
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
              className={`h-full ${person.overfilled ? 'bg-red-600' : 'bg-[var(--sand)]'}`}
              style={{ width: `${fillPercent(person.used, person.capacity)}%` }}
            />
          </div>
        </div>
      ))}
      {wontFit.length ? (
        <p className="text-[10px] font-semibold text-red-500" data-wont-fit-line>
          {wontFit.length} job{wontFit.length === 1 ? '' : 's'} won&apos;t fit
        </p>
      ) : null}
      {provisional ? <p className="text-[10px] text-[var(--sand)]">Provisional</p> : null}
    </div>
  );
}

function MachineBars({ state, day, workerId }) {
  const machines = machineCapacityForDay(state, day, workerId);
  if (!machines.length) return null;
  return (
    <div className="mt-2 space-y-1" data-machine-capacity-day={day}>
      {machines.map((machine) => (
        <div key={machine.id} data-capacity-machine={machine.id} data-overfill={machine.overfilled || undefined}>
          <div className={`flex justify-between gap-1 text-[10px] leading-tight ${machine.overfilled ? 'text-red-500' : ''}`}>
            <span className="truncate">
              {catalogMachineTitle(machine.id)} — {Math.round(machine.used)}/{machine.capacity}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden bg-[var(--paint)]/20">
            <div
              className={`h-full ${machine.overfilled ? 'bg-red-600' : 'bg-[var(--sand)]'}`}
              style={{ width: `${fillPercent(machine.used, machine.capacity)}%` }}
            />
          </div>
          {machine.wontFit ? (
            <p className="text-[10px] font-semibold text-red-500" data-machine-wont-fit={machine.id}>
              {machine.wontFit} job{machine.wontFit === 1 ? '' : 's'} won&apos;t fit
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function WeekPlanGrid({
  state,
  onPlan,
  onRemove,
  onSelectDay,
  onSetWorker,
}) {
  const days = weekDays(state.day);
  const [plannerId, setPlannerId] = useState(PLAYER_ID);
  const everyone = isEveryonePlanner(plannerId);
  const planner = everyone ? null : rosterWorker(state, plannerId);
  const rows = useMemo(() => rowsForPerson(state, plannerId), [state, plannerId]);
  const [defaults, setDefaults] = useState({});

  function rowDefault(row) {
    const saved = defaults[row.taskId];
    return {
      workerId: saved?.workerId ?? (everyone ? defaultWorkerId(state, row) : plannerId),
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
    if (everyone) return;
    const edit = canEditPlanDay(state, cell.day);
    if (!edit.ok || row.lockReason) return;
    if (cell.planned) {
      const own = cell.tasks.every((task) => task.workerId === plannerId);
      if (own) {
        for (const task of cell.tasks) {
          onRemove(task.taskId, task.planId, cell.day);
        }
        return;
      }
      onSetWorker?.(row.taskId, plannerId, cell.day);
      return;
    }
    const chosen = rowDefault(row);
    const worker = rosterWorker(state, plannerId);
    onPlan(row.taskId, courseHolesFor(state, row.taskId), {
      day: cell.day,
      workerId: plannerId,
      machineId: workerBringsOwnMower(worker, row.surface) ? undefined : chosen.machineId || undefined,
      confirmDamaging: true,
    });
  }

  const people = rosterPeople(state);

  return (
    <div className="space-y-3" data-week-grid data-planner={plannerId}>
      <ForecastStrip state={state} onSelectDay={onSelectDay} />
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--sand)]">Show</span>
        <select
          className="border border-[var(--sand)] bg-[var(--soil)] px-2 py-1"
          value={plannerId}
          onChange={(event) => setPlannerId(event.target.value)}
          aria-label="Planning mode"
          data-person-filter
        >
          <option value={EVERYONE_ID}>Everyone</option>
          {people.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
              {worker.ownMower ? ' · own mower' : ''}
              {worker.isCasual && !worker.ownMower ? ' · casual' : ''}
              {worker.isVolunteer ? ' · volunteer' : ''}
            </option>
          ))}
        </select>
        {everyone ? (
          <span className="text-xs text-[var(--sand)]">Overview only — pick a person to plan</span>
        ) : null}
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[14rem] border border-[var(--sand)] bg-[var(--soil)] p-2">Job</th>
              {days.map((day) => {
                const chrome = planDayChrome(state, day);
                return (
                  <th
                    key={day}
                    className={`min-w-[7.5rem] border border-[var(--sand)] p-2 align-top ${
                      chrome.isToday ? 'bg-[var(--machine-orange)]/20' : ''
                    } ${chrome.isPlanningAhead ? 'outline outline-1 outline-dashed outline-[var(--machine-orange)]' : ''} ${
                      day < state.day ? 'opacity-40' : ''
                    }`}
                    data-day-col={day}
                    data-today={chrome.isToday || undefined}
                    data-planning-ahead={chrome.isPlanningAhead || undefined}
                  >
                    <div className="font-semibold">{weekdayLabel(day)}</div>
                    {chrome.isToday ? (
                      <div className="text-[10px] font-semibold text-[var(--machine-orange)]">Today</div>
                    ) : null}
                    {chrome.isPlanningAhead ? (
                      <div className="text-[10px] font-semibold text-[var(--machine-orange)]">Planning</div>
                    ) : null}
                    <div className="mt-2">
                      <PersonBars state={state} day={day} workerId={plannerId} />
                      <MachineBars state={state} day={day} workerId={plannerId} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const chosen = rowDefault(row);
              const locked = Boolean(row.lockReason);
              const chosenWorker = rosterWorker(state, everyone ? chosen.workerId : plannerId);
              const assignedWorker = rosterWorker(state, row.workerId);
              const assignedOwnMower = Boolean(
                !row.mixedWorker && workerBringsOwnMower(assignedWorker, row.surface),
              );
              const rowOwnMower = assignedOwnMower || workerBringsOwnMower(chosenWorker, row.surface);
              const assignable = people.filter((worker) => workerAllows(worker, row.surface));
              const workerLabel = row.mixedWorker
                ? 'mixed'
                : assignedWorker?.name ?? '—';
              const machineLabel = assignedOwnMower
                ? 'Own mower'
                : row.mixedMachine
                  ? 'mixed'
                  : row.machineId
                    ? catalogMachineTitle(row.machineId)
                    : row.usesMachine
                      ? 'Auto'
                      : '—';
              const machines = row.usesMachine && !rowOwnMower ? allowingMachines(state, row.task) : [];
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
                    {everyone ? (
                      <label className="mt-2 block text-xs text-[var(--sand)]">
                        Worker
                        <select
                          className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-1 py-1 text-[var(--paint)]"
                          value={row.mixedWorker && !defaults[row.taskId]?.workerId ? 'mixed' : chosen.workerId}
                          disabled={locked}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'mixed') return;
                            const oldId = row.workerId;
                            setRowDefault(row.taskId, { workerId: value });
                            if (!oldId || row.mixedWorker) return;
                            for (const day of daysMatchingWorker(row, oldId)) {
                              if (!canEditPlanDay(state, day).ok) continue;
                              onSetWorker?.(row.taskId, value, day);
                            }
                          }}
                          aria-label={`${row.label} worker`}
                          data-row-worker-select={row.taskId}
                        >
                          {row.mixedWorker ? <option value="mixed">mixed</option> : null}
                          {assignable.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                              {worker.ownMower ? ' · own mower' : ''}
                              {worker.isCasual && !worker.ownMower ? ' · casual' : ''}
                              {worker.isVolunteer ? ' · volunteer' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {row.usesMachine && !rowOwnMower ? (
                      <label className="mt-2 block text-xs text-[var(--sand)]">
                        Machine
                        <select
                          className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-1 py-1 text-[var(--paint)]"
                          value={row.mixedMachine && !defaults[row.taskId]?.machineId ? 'mixed' : chosen.machineId || ''}
                          disabled={locked || everyone}
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
                    const takenByOther = Boolean(planner && cell.planned && cell.workerId && cell.workerId !== plannerId);
                    const disabled = locked || !edit.ok || everyone;
                    const minutes = displayCellMinutes(state, row, cell, planner, chosen.machineId);
                    const showMinutes = planner ? minutes > 0 : cell.planned;
                    return (
                      <td key={cell.day} className="border border-[var(--sand)] p-2 text-center align-middle">
                        <button
                          type="button"
                          data-grid-cell={`${row.taskId}-${cell.day}`}
                          data-unassigned={cell.unassigned || undefined}
                          data-taken-by={takenByOther ? cell.workerId : undefined}
                          disabled={disabled}
                          onClick={() => toggleCell(row, cell)}
                          className={`min-h-8 min-w-8 border px-1 ${
                            cell.unassigned
                              ? 'border-dashed border-[var(--sand)] bg-transparent text-[var(--sand)]'
                              : takenByOther
                                ? 'border-[var(--sand)] bg-[var(--paint)]/10 text-[11px]'
                                : cell.planned
                                  ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]'
                                  : 'border-[var(--sand)]/40'
                          } disabled:opacity-40`}
                          aria-pressed={cell.planned && !takenByOther}
                          aria-label={`${row.label} ${cell.weekday}${takenByOther ? ` taken by ${cell.workerName}` : cell.unassigned ? ' unassigned' : ''}`}
                          title={
                            takenByOther
                              ? `Taken by ${cell.workerName}. Click to reassign.`
                              : cell.unassigned
                                ? 'Assigned person is not available. This cell will not run.'
                                : everyone
                                  ? 'Pick a person to plan'
                                  : edit.ok
                                    ? undefined
                                    : edit.reason
                          }
                        >
                          {takenByOther ? cell.workerName : cell.unassigned ? '·' : cell.planned ? '✓' : ''}
                        </button>
                        {showMinutes ? (
                          <div className="mt-1 text-[10px] text-[var(--sand)]" data-cell-minutes={`${row.taskId}-${cell.day}`}>
                            {Math.round(minutes)} min
                          </div>
                        ) : null}
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
