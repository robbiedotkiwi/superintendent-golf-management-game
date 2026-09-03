import { useState } from 'react';
import {
  AERATOR_COST,
  CUT_TASK_BY_SURFACE,
  GREENS_SENSORS_COST,
  HOC_RANGE,
  HOC_STEP,
  HOC_STRESS_DAMAGE,
  HOC_STRESS_THRESHOLD,
  HOC_SURFACES,
  IRRIGATION_POLICIES,
  MACHINE_OVERRIDE_AUTO,
  MATCH_LAST_MOWING_LABEL,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_KEYS,
  PATTERN_LABELS,
  PLAN_THIS_CUT_LABEL,
  POND_CAPACITY,
  PRESET_MAX,
  PRESET_NAME_MAX,
  SHIPPED_PRESETS,
  SURFACE_KEYS,
  TASK_MINUTES,
  TURF_TAB_BUNKERS,
  TURF_TAB_DEFAULT,
  TURF_TAB_IRRIGATION,
  TURF_TAB_LABELS,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TAB_POND,
  TURF_TAB_PRESETS,
  TURF_TAB_SUMMARY,
  TURF_TABS,
  TURFRAD_COST,
  WEATHER_STORM,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { durationForTask } from '../engine/assignment.js';
import {
  machineAssignment,
  machineMinutesRemaining,
  overrideCandidates,
} from '../engine/equipment.js';
import { machineTitle } from '../engine/machineDisplay.js';
import { canPlanTask } from '../engine/gameState.js';
import { formatMoney } from '../engine/format.js';
import { canBuyAerator, irrigationDemand, IRRIGATED_SURFACES, pondPercent } from '../engine/irrigation.js';
import { canBuyGreensSensors, canBuyTurfRad } from '../engine/moisture.js';
import { daysSinceLastWorked, isNeglected } from '../engine/neglect.js';
import { hasHoc, hasPattern, inHocStressBand } from '../engine/mowing.js';
import { presetsForSurface } from '../engine/presets.js';
import ForecastStrip from './ForecastStrip.jsx';
import { GreensMoistureList, MoistureLine } from './MoistureReadout.jsx';
import SectionTabs from './SectionTabs.jsx';
import { DiseaseReadout } from './WeatherStrip.jsx';

const POLICY_LABELS = {
  off: 'Off',
  light: 'Light',
  full: 'Full',
};

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function stressThresholdHeight(surface) {
  const range = HOC_RANGE[surface];
  if (!range) return null;
  return range.max - HOC_STRESS_THRESHOLD * (range.max - range.min);
}

function stressBandWidth(surface) {
  const range = HOC_RANGE[surface];
  const threshold = stressThresholdHeight(surface);
  if (!range || threshold == null) return 0;
  return ((threshold - range.min) / (range.max - range.min)) * 100;
}

export default function Turf({
  state,
  tab = TURF_TAB_DEFAULT,
  onTab,
  onBack,
  onPlan,
  onRemove,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetIrrigation,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onSetHandWaterTargets,
  onSavePreset,
  onApplyPreset,
  onApplyShippedPreset,
  onDeletePreset,
  onMatchLastMowing,
  onSetMachineOverride,
}) {
  const debris = state.plannedTasks.find((item) => item.taskId === 'clearDebris');
  const debrisCheck = canPlanTask(state, 'clearDebris');
  const demand = irrigationDemand(state);
  const percent = pondPercent(state.pond.volume);
  const aerator = canBuyAerator(state);
  const sensors = canBuyGreensSensors(state);
  const turfrad = canBuyTurfRad(state);

  return (
    <div className="h-full overflow-y-auto bg-[var(--soil)] px-6 py-5 text-[var(--paint)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-condensed text-5xl font-bold">Turf</h1>
        <button type="button" onClick={onBack} className="border border-[var(--sand)] px-4 py-2">
          Back to the course
        </button>
      </div>
      <SectionTabs tabs={TURF_TABS} labels={TURF_TAB_LABELS} value={tab} onChange={onTab} />

      {tab === TURF_TAB_SUMMARY ? (
        <>
          <ForecastStrip state={state} />
          <div className="mt-4">
            <DiseaseReadout state={state} />
          </div>
          {state.weather === WEATHER_STORM ? (
            debris ? (
              <button type="button" onClick={() => onRemove('clearDebris')} className="mt-4 border border-[var(--sand)] px-3 py-2">
                Debris planned · {debris.minutes} min
              </button>
            ) : (
              <button
                type="button"
                disabled={!debrisCheck.ok}
                onClick={() => onPlan('clearDebris')}
                className="mt-4 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
                title={debrisCheck.ok ? undefined : debrisCheck.reason}
              >
                Clear debris · {TASK_MINUTES.clearDebris} min
              </button>
            )
          ) : null}
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={onMatchLastMowing}
              className="border border-[var(--sand)] px-3 py-2 font-semibold"
            >
              {MATCH_LAST_MOWING_LABEL}
            </button>
            {SURFACE_KEYS.map((surface) => {
              const record = state.surfaces[surface];
              const days = daysSinceLastWorked(state, surface);
              const neglected = isNeglected(state, surface);
              const disease = state.disease?.[surface];
              const cuttable = Boolean(CUT_TASK_BY_SURFACE[surface]);
              return (
                <section key={surface} className={`border p-3 ${neglected ? 'border-[var(--machine-orange)]' : 'border-[var(--sand)]'}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h2>
                    <span className="text-sm text-[var(--sand)]">
                      {formatQuality(record.quality)}
                      {neglected ? ' · overdue' : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--sand)]">
                    {days}d since {surface === 'bunkers' ? 'raked' : 'worked'}
                    {record.hoc != null ? ` · ${record.hoc} mm` : ''}
                    {record.pattern ? ` · ${PATTERN_LABELS[record.pattern] ?? record.pattern}` : ''}
                  </p>
                  {['greens', 'tees', 'fairways'].includes(surface) ? (
                    <p className="mt-1 text-sm">
                      Moisture <MoistureLine state={state} surface={surface} />
                    </p>
                  ) : null}
                  {disease ? (
                    <p className="mt-1 text-sm">
                      Disease {Math.round(disease.pressure)}
                      {disease.outbreak ? ' · outbreak' : ''}
                    </p>
                  ) : null}
                  {cuttable ? (
                    <>
                      <MachinePicker state={state} surface={surface} onSetMachineOverride={onSetMachineOverride} />
                      <PlanThisCut state={state} surface={surface} onPlan={onPlan} onRemove={onRemove} />
                    </>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      ) : null}

      {tab === TURF_TAB_MOWING ? (
        <div className="space-y-4">
          {HOC_SURFACES.map((surface) => (
            <MowingSurface
              key={surface}
              surface={surface}
              state={state}
              onSetHoc={onSetHoc}
              onSetPattern={onSetPattern}
              onSetAngle={onSetAngle}
              onSetAutoRotate={onSetAutoRotate}
              onPlan={onPlan}
              onRemove={onRemove}
              onSetMachineOverride={onSetMachineOverride}
            />
          ))}
        </div>
      ) : null}

      {tab === TURF_TAB_IRRIGATION ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--sand)]">
            Nightly draw {Math.round(demand.total)} m³. Rough is never watered.
          </p>
          {IRRIGATED_SURFACES.map((surface) => (
            <section key={surface} className="border border-[var(--sand)] p-3">
              <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
              <p className="text-sm text-[var(--sand)]">
                Estimate {Math.round(demand.demand[surface] ?? 0)} m³ · moisture <MoistureLine state={state} surface={surface} />
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {IRRIGATION_POLICIES.map((policy) => (
                  <button
                    key={policy}
                    type="button"
                    onClick={() => onSetIrrigation(surface, policy)}
                    className={`border border-[var(--sand)] px-2 py-2 ${
                      state.irrigation[surface] === policy ? 'bg-[var(--machine-orange)]' : ''
                    }`}
                  >
                    {POLICY_LABELS[policy]}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">Moisture per green</h3>
            <GreensMoistureList state={state} />
          </section>
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">Hand-water targeting</h3>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {Array.from({ length: state.holes ?? 9 }, (_, index) => index + 1).map((id) => {
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
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">Greens sensors</h3>
            {state.hasGreensSensors ? (
              <p className="mt-2">Live greens moisture. Never stale.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--sand)]">Continuous greens readings. {formatMoney(GREENS_SENSORS_COST)} from capital.</p>
                <button
                  type="button"
                  disabled={!sensors.ok}
                  onClick={onBuyGreensSensors}
                  className="mt-2 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                  title={sensors.ok ? undefined : sensors.reason}
                >
                  Buy sensors · {formatMoney(GREENS_SENSORS_COST)}
                </button>
              </>
            )}
          </section>
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">TurfRad</h3>
            {state.hasTurfRad ? (
              <p className="mt-2">Mowers report moisture on anything cut today.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-[var(--sand)]">Readings when you mow. {formatMoney(TURFRAD_COST)} from capital.</p>
                <button
                  type="button"
                  disabled={!turfrad.ok}
                  onClick={onBuyTurfRad}
                  className="mt-2 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                  title={turfrad.ok ? undefined : turfrad.reason}
                >
                  Buy TurfRad · {formatMoney(TURFRAD_COST)}
                </button>
              </>
            )}
          </section>
        </div>
      ) : null}

      {tab === TURF_TAB_OTHER || tab === TURF_TAB_BUNKERS || tab === TURF_TAB_POND ? (
        <div className="space-y-4">
          <BunkerTab state={state} onPlan={onPlan} onRemove={onRemove} />
          <PondPanel state={state} percent={percent} aerator={aerator} onBuyAerator={onBuyAerator} />
        </div>
      ) : null}

      {tab === TURF_TAB_PRESETS ? (
        <PresetsTab
          state={state}
          onSavePreset={onSavePreset}
          onApplyPreset={onApplyPreset}
          onApplyShippedPreset={onApplyShippedPreset}
          onDeletePreset={onDeletePreset}
        />
      ) : null}
    </div>
  );
}

function PlanThisCut({ state, surface, onPlan, onRemove }) {
  const taskId = CUT_TASK_BY_SURFACE[surface];
  if (!taskId) return null;
  const planned = state.plannedTasks.find((item) => item.taskId === taskId);
  const check = canPlanTask(state, taskId);
  const minutes = planned?.minutes ?? durationForTask(state, taskId);
  if (planned) {
    return (
      <button type="button" onClick={() => onRemove(taskId)} className="mt-3 border border-[var(--sand)] px-3 py-2">
        {PLAN_THIS_CUT_LABEL} planned · {planned.minutes} min
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={!check.ok}
      onClick={() => onPlan(taskId)}
      className="mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
      title={check.ok ? undefined : check.reason}
    >
      {PLAN_THIS_CUT_LABEL} · {minutes} min
    </button>
  );
}

function MachinePicker({ state, surface, onSetMachineOverride }) {
  const assignment = machineAssignment(state, surface);
  const options = overrideCandidates(state, surface);
  const overrideId = state.machineOverride?.[surface] ?? MACHINE_OVERRIDE_AUTO;
  return (
    <div className="mt-2">
      <p className="text-sm">
        {assignment.machine ? machineTitle(assignment.machine) : 'No machine available'}
      </p>
      {assignment.fallbackReason ? (
        <p className="text-sm text-[var(--machine-orange)]">{assignment.fallbackReason}</p>
      ) : null}
      <label className="mt-1 block text-sm text-[var(--sand)]">
        Machine
        <select
          value={overrideId || MACHINE_OVERRIDE_AUTO}
          onChange={(event) => {
            const value = event.target.value;
            onSetMachineOverride(surface, value === MACHINE_OVERRIDE_AUTO ? null : value);
          }}
          className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-[var(--paint)]"
        >
          <option value={MACHINE_OVERRIDE_AUTO}>Auto</option>
          {options.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machineTitle(machine)} · {machine.ceiling?.[surface] ?? '—'} · {machine.timeMult}× ·{' '}
              {machineMinutesRemaining(state, machine.id)} min
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PondPanel({ state, percent, aerator, onBuyAerator }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm text-[var(--sand)]">Volume</div>
        <div className="font-condensed text-4xl font-bold leading-none">{Math.round(state.pond.volume)}</div>
        <p className="mt-1 text-sm text-[var(--sand)]">
          {Math.round(percent)}% of {POND_CAPACITY} m³ · health {Math.round(state.pond.health)}
        </p>
      </div>
      <p>Aerator {state.hasAerator ? 'running' : 'not installed'}.</p>
      <p className="text-sm text-[var(--sand)]">Recent mains spend {formatMoney(state.lastMainsCost ?? 0)}.</p>
      {state.hasAerator ? (
        <p>In the pond. Holds health up.</p>
      ) : (
        <>
          <p className="text-sm text-[var(--sand)]">Keeps pond health from falling. {formatMoney(AERATOR_COST)} from capital.</p>
          <button
            type="button"
            disabled={!aerator.ok}
            onClick={onBuyAerator}
            className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
            title={aerator.ok ? undefined : aerator.reason}
          >
            Buy aerator · {formatMoney(AERATOR_COST)}
          </button>
        </>
      )}
    </div>
  );
}

function MowingSurface({
  surface,
  state,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onPlan,
  onRemove,
  onSetMachineOverride,
}) {
  const record = state.surfaces[surface];
  const showHoc = hasHoc(surface);
  const showPattern = hasPattern(surface);
  const stress = showHoc && inHocStressBand(surface, record.hoc);
  const threshold = stressThresholdHeight(surface);
  const cutId = CUT_TASK_BY_SURFACE[surface];
  const minutes = cutId ? durationForTask(state, cutId) : null;
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
      {showHoc ? (
        <label className="mt-2 block">
          <span className="text-sm text-[var(--sand)]">Height of cut</span>
          <div className="font-condensed text-3xl font-bold leading-none">{record.hoc} mm</div>
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-[var(--sand)]/30">
              <div className="h-full bg-[var(--machine-orange)]/50" style={{ width: `${stressBandWidth(surface)}%` }} />
            </div>
            <input
              type="range"
              min={HOC_RANGE[surface].min}
              max={HOC_RANGE[surface].max}
              step={HOC_STEP[surface]}
              value={record.hoc}
              onChange={(event) => onSetHoc(surface, Number(event.target.value))}
              className="relative w-full"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--sand)]">Stress band below {threshold} mm</p>
          {stress ? (
            <p className="mt-1 text-sm text-[var(--machine-orange)]">
              Low cut — {HOC_STRESS_DAMAGE} quality/day in summer or when dry
            </p>
          ) : null}
        </label>
      ) : null}
      {showPattern ? (
        <>
          <div className="mt-3 text-sm text-[var(--sand)]">Pattern</div>
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
          <p className="mt-2 text-sm text-[var(--sand)]">Pattern wear {Math.round(record.patternWear ?? 0)}</p>
        </>
      ) : null}
      {minutes != null ? (
        <p className="mt-2 font-condensed text-2xl font-bold leading-none">
          {minutes}
          <span className="ml-2 text-sm font-semibold text-[var(--sand)]">min at these settings</span>
        </p>
      ) : null}
      <MachinePicker state={state} surface={surface} onSetMachineOverride={onSetMachineOverride} />
      <PlanThisCut state={state} surface={surface} onPlan={onPlan} onRemove={onRemove} />
    </section>
  );
}

function BunkerTab({ state, onPlan, onRemove }) {
  const record = state.surfaces.bunkers;
  const days = daysSinceLastWorked(state, 'bunkers');
  const planned = state.plannedTasks.find((item) => item.taskId === 'rakeBunkers');
  const check = canPlanTask(state, 'rakeBunkers');
  const minutes = durationForTask(state, 'rakeBunkers');
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">Bunkers</h3>
      <p className="mt-2">
        Quality {formatQuality(record.quality)} · {days}d since raked
        {isNeglected(state, 'bunkers') ? ' · overdue' : ''}
      </p>
      {planned ? (
        <button type="button" onClick={() => onRemove('rakeBunkers')} className="mt-3 border border-[var(--sand)] px-3 py-2">
          Rake planned · {planned.minutes} min
        </button>
      ) : (
        <button
          type="button"
          disabled={!check.ok}
          onClick={() => onPlan('rakeBunkers')}
          className="mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
          title={check.ok ? undefined : check.reason}
        >
          Schedule rake · {minutes} min
        </button>
      )}
    </section>
  );
}

function PresetsTab({ state, onSavePreset, onApplyPreset, onApplyShippedPreset, onDeletePreset }) {
  const [presetName, setPresetName] = useState('');
  const [saveSurface, setSaveSurface] = useState('greens');
  const presetFull = (state.customPresets ?? []).length >= PRESET_MAX;
  return (
    <div className="space-y-4">
      <section className="border border-[var(--sand)] p-3">
        <h3 className="text-lg font-semibold">Shipped</h3>
        <div className="mt-2 space-y-2">
          {SHIPPED_PRESETS.map((preset) => (
            <div key={preset.id} className="flex items-center justify-between gap-2">
              <span>{preset.name}</span>
              <button
                type="button"
                onClick={() => onApplyShippedPreset(preset.id)}
                className="border border-[var(--sand)] px-2 py-1 text-sm"
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="border border-[var(--sand)] p-3">
        <h3 className="text-lg font-semibold">Saved</h3>
        {HOC_SURFACES.map((surface) => {
          const presets = presetsForSurface(state, surface);
          return (
            <div key={surface} className="mt-3">
              <div className="text-sm text-[var(--sand)]">{SURFACE_LABELS[surface]}</div>
              {presets.length === 0 ? <p className="text-sm text-[var(--sand)]">None saved.</p> : null}
              <ul className="mt-1 space-y-2">
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
            </div>
          );
        })}
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={saveSurface}
            onChange={(event) => setSaveSurface(event.target.value)}
            className="border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-[var(--paint)]"
          >
            {HOC_SURFACES.map((surface) => (
              <option key={surface} value={surface}>
                {SURFACE_LABELS[surface]}
              </option>
            ))}
          </select>
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
              onSavePreset(saveSurface, presetName);
              setPresetName('');
            }}
            className="border border-[var(--sand)] px-2 py-1 text-sm disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
