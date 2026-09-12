import { useMemo, useState } from 'react';
import {
  COPY_FLAG_AWAY,
  COPY_FLAG_SHED,
  MINUTES_PER_HOUR,
  PASS_AREAS,
  SLOT_MINUTES,
  WET_PASS_TIME_MULT,
  WET_WEATHER,
} from '../data/config.js';
import { CUT_TASK_BY_SURFACE } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { allowingMachines } from '../engine/equipment.js';
import { catalogMachineTitle } from '../engine/machineDisplay.js';
import { getTask } from '../data/tasks.js';
import { passMinutesFor, staffCanRunMachine } from '../engine/passes.js';
import {
  machineConflictsOnDay,
  mowTaskIdFor,
  nextStartMinute,
  snapMinutes,
} from '../engine/slots.js';
import { canEditPlanDay, planDayChrome, weekDays, weekdayLabel, workersForPlanDay } from '../engine/week.js';
import { rosterPeople } from '../engine/weekGrid.js';
import ForecastStrip from './ForecastStrip.jsx';
import GradeStrip from './GradeStrip.jsx';
import MachinePassPanel from './MachinePassPanel.jsx';

function flagLabel(flag) {
  if (flag === COPY_FLAG_AWAY) return 'person away';
  if (flag === COPY_FLAG_SHED) return 'machine in shed';
  return flag;
}

function SlotChip({ task, conflict, onRemove, disabled }) {
  const taskSpec = getTask(task.taskId);
  const label = SURFACE_LABELS[task.surface ?? taskSpec?.surface] ?? taskSpec?.name ?? task.taskId;
  const hours = ((task.minutes ?? 0) / MINUTES_PER_HOUR).toFixed(1);
  const flags = task.copyFlags ?? [];
  return (
    <div
      className={`mb-1 border px-1 py-0.5 text-left text-[10px] leading-tight ${
        flags.length || conflict ? 'border-red-500 text-red-300' : 'border-[var(--machine-orange)]'
      }`}
      data-slot-chip={task.planId}
      data-conflict={conflict || undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <span>
          {label} · {catalogMachineTitle(task.machineId) || 'own'} · {hours}h
        </span>
        {disabled ? null : (
          <button type="button" className="text-[10px]" onClick={() => onRemove(task.taskId, task.planId)}>
            ×
          </button>
        )}
      </div>
      {conflict ? <div>Machine already booked this slot</div> : null}
      {flags.map((flag) => (
        <div key={flag} data-copy-flag={flag}>
          Copied · {flagLabel(flag)}
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
  onCopyYesterday,
  onCopyLastWeek,
  onSaveTemplate,
  onApplyTemplate,
}) {
  const days = weekDays(state.day);
  const people = rosterPeople(state).filter((worker) => !worker.isCasual || (state.casualPool ?? []).some((c) => c.id === worker.id));
  const [draft, setDraft] = useState({});
  const [templateName, setTemplateName] = useState('');
  const flags = state.lastCopyFlags ?? [];

  const rows = useMemo(() => people, [people, state.workers, state.casualPool]);

  function draftFor(workerId, day) {
    return draft[`${workerId}-${day}`] ?? { surface: 'greens', machineId: '', minutes: SLOT_MINUTES * 4 };
  }

  function setDraftFor(workerId, day, patch) {
    const key = `${workerId}-${day}`;
    setDraft((current) => ({ ...current, [key]: { ...draftFor(workerId, day), ...patch } }));
  }

  function addSlot(worker, day) {
    const edit = canEditPlanDay(state, day);
    if (!edit.ok) return;
    const chosen = draftFor(worker.id, day);
    const surface = chosen.surface;
    const taskId = mowTaskIdFor(surface) ?? CUT_TASK_BY_SURFACE[surface];
    const task = getTask(taskId);
    const dayState = { ...state, weather: state.weather };
    const machines = allowingMachines(dayState, task).filter((machine) => staffCanRunMachine(worker, machine));
    const machineId = chosen.machineId || machines[0]?.id;
    const defaultMinutes = passMinutesFor(dayState, machineId, surface, worker) ?? SLOT_MINUTES * 4;
    const minutes = snapMinutes(chosen.minutes || defaultMinutes);
    onPlan(taskId, undefined, {
      day,
      workerId: worker.id,
      machineId,
      minutes,
      confirmDamaging: true,
    });
  }

  return (
    <div className="space-y-3" data-week-grid data-planner="staff">
      <ForecastStrip state={state} onSelectDay={onSelectDay} />
      <GradeStrip state={state} />
      <MachinePassPanel state={state} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="border border-[var(--sand)] px-2 py-1" onClick={() => onCopyYesterday?.(state.planningDay ?? state.day)} data-copy-yesterday>
          Copy yesterday
        </button>
        <button type="button" className="border border-[var(--sand)] px-2 py-1" onClick={() => onCopyLastWeek?.()} data-copy-last-week>
          Copy last week
        </button>
        <input
          className="border border-[var(--sand)] bg-[var(--soil)] px-2 py-1"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="Template name"
          aria-label="Template name"
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
          aria-label="Apply template"
          data-apply-template
        >
          <option value="">Apply template…</option>
          {(state.planTemplates ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {flags.length ? (
          <span className="text-[10px] text-red-400" data-copy-flags>
            Copied with flags: {flags.join(', ')}
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[10rem] border border-[var(--sand)] bg-[var(--soil)] p-2">Staff</th>
              {days.map((day) => {
                const chrome = planDayChrome(state, day);
                return (
                  <th
                    key={day}
                    className={`min-w-[9rem] border border-[var(--sand)] p-2 align-top ${chrome.isToday ? 'bg-[var(--machine-orange)]/20' : ''} ${
                      day < state.day ? 'opacity-40' : ''
                    }`}
                    data-day-col={day}
                  >
                    <button type="button" className="font-semibold" onClick={() => onSelectDay?.(day)}>
                      {weekdayLabel(day)}
                    </button>
                    {WET_WEATHER.includes(state.forecastStrip?.[day - state.day - 1]?.type) ||
                    (day === state.day && WET_WEATHER.includes(state.weather)) ? (
                      <div className="text-[10px] text-[var(--machine-orange)]" data-wet-cut={day}>
                        Wet cut +{Math.round((WET_PASS_TIME_MULT - 1) * 100)}% · penalty
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((worker) => (
              <tr key={worker.id} data-staff-row={worker.id}>
                <th className="sticky left-0 z-10 border border-[var(--sand)] bg-[var(--soil)] p-2 align-top">
                  <div className="font-semibold">{worker.name}</div>
                  <div className="text-[10px] text-[var(--sand)]">{worker.tier}</div>
                </th>
                {days.map((day) => {
                  const edit = canEditPlanDay(state, day);
                  const roster = workersForPlanDay(state, day);
                  const on = roster.find((item) => item.id === worker.id);
                  const tasks = (state.weekPlan?.days?.[day]?.tasks ?? []).filter((item) => item.workerId === worker.id);
                  const used = tasks.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
                  const cap = on?.minutesToday ?? 0;
                  const chosen = draftFor(worker.id, day);
                  const taskId = mowTaskIdFor(chosen.surface);
                  const machines = taskId
                    ? allowingMachines(state, getTask(taskId)).filter((machine) => staffCanRunMachine(worker, machine))
                    : [];
                  return (
                    <td key={day} className="border border-[var(--sand)] p-2 align-top" data-staff-cell={`${worker.id}-${day}`}>
                      <div className="text-[10px] text-[var(--sand)]">
                        {Math.round(used)}/{Math.round(cap)} min
                        {cap > 0 && used / SLOT_MINUTES > 5 / (SLOT_MINUTES / 60) ? null : null}
                      </div>
                      {tasks.map((task) => {
                        const conflict = machineConflictsOnDay(
                          state.weekPlan?.days?.[day]?.tasks ?? [],
                          task.machineId,
                          task.startMinute ?? nextStartMinute(tasks, worker.id),
                          task.minutes,
                          task.planId,
                        ).length;
                        return (
                          <SlotChip
                            key={task.planId ?? `${task.taskId}-${day}`}
                            task={task}
                            conflict={conflict}
                            disabled={!edit.ok}
                            onRemove={(taskId, planId) => onRemove(taskId, planId, day)}
                          />
                        );
                      })}
                      {edit.ok && on?.minutesToday > 0 ? (
                        <div className="mt-1 space-y-1">
                          <select
                            className="w-full border border-[var(--sand)] bg-[var(--soil)] text-[10px]"
                            value={chosen.surface}
                            onChange={(event) => setDraftFor(worker.id, day, { surface: event.target.value })}
                            aria-label={`${worker.name} area ${weekdayLabel(day)}`}
                          >
                            {PASS_AREAS.filter((area) => worker.allowedSurfaces === 'all' || worker.allowedSurfaces?.includes(area)).map((area) => (
                              <option key={area} value={area}>
                                {SURFACE_LABELS[area]}
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full border border-[var(--sand)] bg-[var(--soil)] text-[10px]"
                            value={chosen.machineId}
                            onChange={(event) => setDraftFor(worker.id, day, { machineId: event.target.value })}
                            aria-label={`${worker.name} machine ${weekdayLabel(day)}`}
                          >
                            <option value="">Auto</option>
                            {machines.map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machine.model ?? machine.name}
                              </option>
                            ))}
                          </select>
                          <label className="block text-[10px] text-[var(--sand)]">
                            Hours
                            <input
                              type="number"
                              min={SLOT_MINUTES / MINUTES_PER_HOUR}
                              step={SLOT_MINUTES / MINUTES_PER_HOUR}
                              className="w-full border border-[var(--sand)] bg-[var(--soil)] px-1"
                              value={(chosen.minutes ?? SLOT_MINUTES) / MINUTES_PER_HOUR}
                              onChange={(event) =>
                                setDraftFor(worker.id, day, {
                                  minutes: snapMinutes(Number(event.target.value) * MINUTES_PER_HOUR),
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="w-full border border-[var(--sand)] px-1 py-0.5 text-[10px]"
                            onClick={() => addSlot(worker, day)}
                            data-add-slot={`${worker.id}-${day}`}
                          >
                            Add slot
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[var(--sand)]">{edit.ok ? 'Not on' : edit.reason}</p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
