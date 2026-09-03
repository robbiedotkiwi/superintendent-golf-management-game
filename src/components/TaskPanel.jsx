import { useState } from 'react';
import {
  HOC_RANGE,
  HOC_STEP,
  HOC_STRESS_DAMAGE,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_KEYS,
  PATTERN_LABELS,
  PRESET_MAX,
  PRESET_NAME_MAX,
} from '../data/constants.js';
import { tasksForSurface, taskUsesMachine } from '../data/tasks.js';
import { durationForTask, assignWorker, certifiedPresent, workerById } from '../engine/assignment.js';
import { getMachine, ineligibleMachines, pickMachineForTask, surfaceCeiling } from '../engine/equipment.js';
import { hasHoc, hasPattern, inHocStressBand } from '../engine/mowing.js';
import { allGreenIds } from '../engine/moisture.js';
import { inPrepWindow } from '../engine/tournament.js';
import { canPlanTask } from '../engine/gameState.js';
import { presetsForSurface } from '../engine/presets.js';
import { GreensMoistureList } from './MoistureReadout.jsx';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TaskPanel({
  surface,
  state,
  onPlan,
  onRemove,
  onSetWorker,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetHandWaterTargets,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}) {
  const [presetName, setPresetName] = useState('');
  const record = state.surfaces[surface];
  const tasks = tasksForSurface(surface);
  const showHoc = hasHoc(surface);
  const showPattern = hasPattern(surface);
  const stress = showHoc && inHocStressBand(surface, record.hoc);
  const presets = presetsForSurface(state, surface);
  const presetFull = (state.customPresets ?? []).length >= PRESET_MAX;

  return (
    <div className="space-y-3 border-t border-[var(--sand)] pt-3 text-[var(--paint)]">
      <p className="text-sm text-[var(--sand)]">Ceiling {formatQuality(surfaceCeiling(state, surface))}</p>
      {state.disease?.[surface] ? (
        <p className="text-sm">
          Disease pressure {Math.round(state.disease[surface].pressure)}
          {state.disease[surface].outbreak ? ' · outbreak' : ''}
        </p>
      ) : null}
      {showHoc ? (
        <section className="border border-[var(--sand)] p-3">
          <label className="block">
            <span className="text-sm text-[var(--sand)]">Height of cut</span>
            <div className="font-condensed text-3xl font-bold leading-none">{record.hoc} mm</div>
            <input
              type="range"
              min={HOC_RANGE[surface].min}
              max={HOC_RANGE[surface].max}
              step={HOC_STEP[surface]}
              value={record.hoc}
              onChange={(event) => onSetHoc(surface, Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          {stress ? (
            <p className="mt-2 text-sm text-[var(--machine-orange)]">
              Low cut — {HOC_STRESS_DAMAGE} quality/day in summer or when dry
            </p>
          ) : null}
        </section>
      ) : null}
      {showPattern ? (
        <section className="border border-[var(--sand)] p-3">
          <div className="text-sm text-[var(--sand)]">Pattern</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PATTERN_KEYS.map((pattern) => (
              <button
                key={pattern}
                type="button"
                onClick={() => onSetPattern(surface, pattern)}
                className={`border px-2 py-2 text-left ${
                  record.pattern === pattern
                    ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)] text-[var(--paint)]'
                    : 'border-[var(--sand)]'
                }`}
              >
                {PATTERN_LABELS[pattern]}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="text-sm text-[var(--sand)]">Angle {record.angle}°</span>
            <input
              type="range"
              min={PATTERN_ANGLE_MIN}
              max={PATTERN_ANGLE_MAX}
              step={1}
              value={record.angle}
              onChange={(event) => onSetAngle(surface, Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(record.autoRotate)}
              onChange={(event) => onSetAutoRotate(surface, event.target.checked)}
            />
            Auto-rotate each cut
          </label>
        </section>
      ) : null}
      {showHoc || showPattern ? (
        <section className="border border-[var(--sand)] p-3">
          <div className="text-sm text-[var(--sand)]">Presets</div>
          {presets.length === 0 ? <p className="mt-2 text-sm text-[var(--sand)]">None saved for this surface.</p> : null}
          <ul className="mt-2 space-y-2">
            {presets.map((preset) => (
              <li key={preset.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">{preset.name}</span>
                <button type="button" onClick={() => onApplyPreset(preset.id)} className="border border-[var(--sand)] px-2 py-1 text-sm">
                  Apply
                </button>
                <button type="button" onClick={() => onDeletePreset(preset.id)} className="border border-[var(--sand)] px-2 py-1 text-sm">
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              maxLength={PRESET_NAME_MAX}
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Name"
              className="min-w-0 flex-1 border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-[var(--paint)]"
            />
            <button
              type="button"
              disabled={presetFull}
              title={presetFull ? `Max ${PRESET_MAX} presets` : undefined}
              onClick={() => {
                onSavePreset(surface, presetName);
                setPresetName('');
              }}
              className="border border-[var(--sand)] px-2 py-1 text-sm disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </section>
      ) : null}
      {surface === 'greens' ? <GreensMoistureList state={state} /> : null}
      {surface === 'greens' ? (
        <section className="border border-[var(--sand)] p-3">
          <div className="text-sm text-[var(--sand)]">Hand-water greens</div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {allGreenIds(state.holes).map((id) => {
              const on = (state.handWaterTargets ?? []).includes(id);
              return (
                <label key={id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const current = state.handWaterTargets ?? [];
                      onSetHandWaterTargets(on ? current.filter((item) => item !== id) : [...current, id]);
                    }}
                  />
                  {id}
                </label>
              );
            })}
          </div>
        </section>
      ) : null}
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
              {task.materialsCost ? <p className="text-sm text-[var(--sand)]">Materials {task.materialsCost}</p> : null}
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
                  const assigned = assignWorker(state, task);
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
