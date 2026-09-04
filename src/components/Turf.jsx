import {
  AERATOR_COST,
  CHECK_MOISTURE_BY_SURFACE,
  CHECK_MOISTURE_LABEL,
  CUT_TASK_BY_SURFACE,
  DISEASE_OUTBREAK_THRESHOLD,
  FERTILISE_BY_SURFACE,
  FERTILISER_BRAND,
  FERTILISER_DAYS,
  FERTILISER_MATERIALS_COST,
  GREENS_SENSORS_COST,
  HOC_RANGE,
  HOC_STEP,
  HOC_STRESS_DAMAGE,
  HOC_STRESS_THRESHOLD,
  HOC_SURFACES,
  INPUTS_SURFACES,
  IRRIGATION_POLICIES,
  MACHINE_OVERRIDE_AUTO,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_KEYS,
  PATTERN_LABELS,
  PLAN_THIS_CUT_LABEL,
  POND_CAPACITY,
  POND_DOSE_COST,
  POND_DOSE_MINUTES,
  POND_DOSING_LABEL,
  POND_RESCUE_COST,
  POND_RESCUE_HEALTH,
  POND_RESCUE_LABEL,
  POND_RESCUE_MINUTES,
  POND_RESCUE_TASK,
  ROLL_GREENS_LABEL,
  ROLL_GREENS_TASK,
  SPRAY_BY_SURFACE,
  SPRAY_MATERIALS_COST,
  SPRAY_SUPPRESS_DAYS,
  SUITABILITY_LABELS,
  SUITABILITY_PENALTY_COPY,
  TASK_MINUTES,
  TURF_TAB_DEFAULT,
  TURF_TAB_INPUTS,
  TURF_TAB_IRRIGATION,
  TURF_TAB_LABELS,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TABS,
  TURFRAD_COST,
  WEATHER_STORM,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { certifiedPresent, durationForTask } from '../engine/assignment.js';
import { findPlannedJob } from '../engine/jobs.js';
import {
  approachingOutbreak,
  holeDiseasePressure,
  holeSprayUntil,
  holeTreatmentUntil,
} from '../engine/disease.js';
import {
  machineAssignment,
  machineMinutesRemaining,
  machineSuitability,
  machineTimeMult,
  overrideCandidates,
} from '../engine/equipment.js';
import { machineTitle } from '../engine/machineDisplay.js';
import { canPlanTask } from '../engine/gameState.js';
import PlanConfirmButton from './PlanConfirmButton.jsx';
import { formatMoney } from '../engine/format.js';
import { canBuyAerator, irrigationDemand, IRRIGATED_SURFACES, pondPercent } from '../engine/irrigation.js';
import { canBuyGreensSensors, canBuyTurfRad } from '../engine/moisture.js';
import { daysSinceLastWorked, isNeglected } from '../engine/neglect.js';
import { courseSettings, holeCount, holeKind, meanQuality, presentHoles } from '../engine/holes.js';
import { hasHoc, hasPattern, inHocStressBand } from '../engine/mowing.js';
import { mowingStatus } from '../engine/mowingStatus.js';
import { GreensMoistureList, MoistureLine } from './MoistureReadout.jsx';
import SectionTabs from './SectionTabs.jsx';
import HoleSelector from './HoleSelector.jsx';

const POLICY_LABELS = {
  off: 'Off',
  light: 'Light',
  full: 'Full',
};

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMm(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? `${value} mm` : `${value.toFixed(1)} mm`;
}

function TwoColumn({ left, right }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-4">
      <div>{left}</div>
      <div className="pointer-events-none text-sm">{right}</div>
    </div>
  );
}

function jobHolesFromSelection(state) {
  return state.selectedHoles?.length ? state.selectedHoles : undefined;
}

function formatExpiry(until, day) {
  if (!until || until <= day) return 'Not treated';
  return `Expires day ${until} · ${until - day}d left`;
}

function PlanJob({ state, taskId, onPlan, onRemove, label, extra, className }) {
  const holes = jobHolesFromSelection(state);
  const planned = findPlannedJob(state, taskId, holes);
  const minutes = planned?.minutes ?? durationForTask(state, taskId, undefined, undefined, holes);
  if (planned) {
    return (
      <button type="button" onClick={() => onRemove(taskId, planned.planId)} className={className ?? 'mt-3 border border-[var(--sand)] px-3 py-2'}>
        {label} planned · {planned.minutes} min
      </button>
    );
  }
  return (
    <PlanConfirmButton
      state={state}
      taskId={taskId}
      holes={holes}
      onPlan={onPlan}
      className={className ?? 'mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40'}
    >
      {label} · {minutes} min{extra ? ` · ${extra}` : ''}
    </PlanConfirmButton>
  );
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
  onSetMachineOverride,
  onSetPondDosing,
  onToggleHole,
  onSelectHoles,
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
              onToggleHole={onToggleHole}
              onSelectHoles={onSelectHoles}
            />
          ))}
        </div>
      ) : null}

      {tab === TURF_TAB_IRRIGATION ? (
        <div className="space-y-3">
          <HoleSelector state={state} onToggleHole={onToggleHole} onSelectHoles={onSelectHoles} />
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
              <PlanJob
                state={state}
                taskId={CHECK_MOISTURE_BY_SURFACE[surface]}
                onPlan={onPlan}
                onRemove={onRemove}
                label={CHECK_MOISTURE_LABEL}
              />
            </section>
          ))}
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">Moisture per green</h3>
            <GreensMoistureList state={state} />
          </section>
          <section className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">Hand-water targeting</h3>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {Array.from({ length: holeCount(state) }, (_, index) => index + 1).map((id) => {
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
                <p className="mt-2 text-sm text-[var(--sand)]">Continuous greens readings. {formatMoney(GREENS_SENSORS_COST)} from cash.</p>
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
                <p className="mt-2 text-sm text-[var(--sand)]">Readings when you mow. {formatMoney(TURFRAD_COST)} from cash.</p>
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

      {tab === TURF_TAB_INPUTS ? (
        <>
          <HoleSelector state={state} onToggleHole={onToggleHole} onSelectHoles={onSelectHoles} />
          <div className="mt-4">
            <InputsTab state={state} onPlan={onPlan} onRemove={onRemove} />
          </div>
        </>
      ) : null}

      {tab === TURF_TAB_OTHER ? (
        <div className="space-y-4">
          {state.weather === WEATHER_STORM ? (
            debris ? (
              <button type="button" onClick={() => onRemove('clearDebris')} className="border border-[var(--sand)] px-3 py-2">
                Debris planned · {debris.minutes} min
              </button>
            ) : (
              <button
                type="button"
                disabled={!debrisCheck.ok}
                onClick={() => onPlan('clearDebris')}
                className="bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
                title={debrisCheck.ok ? undefined : debrisCheck.reason}
              >
                Clear debris · {TASK_MINUTES.clearDebris} min
              </button>
            )
          ) : null}
          <BunkerTab state={state} onPlan={onPlan} onRemove={onRemove} />
          <PondPanel
            state={state}
            percent={percent}
            aerator={aerator}
            onBuyAerator={onBuyAerator}
            onPlan={onPlan}
            onRemove={onRemove}
            onSetPondDosing={onSetPondDosing}
          />
        </div>
      ) : null}
    </div>
  );
}

function PlanThisCut({ state, surface, onPlan, onRemove }) {
  const taskId = CUT_TASK_BY_SURFACE[surface];
  if (!taskId) return null;
  const holes = jobHolesFromSelection(state);
  const planned = findPlannedJob(state, taskId, holes);
  const minutes = planned?.minutes ?? durationForTask(state, taskId, undefined, undefined, holes);
  if (planned) {
    return (
      <button type="button" onClick={() => onRemove(taskId, planned.planId)} className="mt-3 border border-[var(--sand)] px-3 py-2">
        {PLAN_THIS_CUT_LABEL} planned · {planned.minutes} min
      </button>
    );
  }
  return (
    <PlanConfirmButton
      state={state}
      taskId={taskId}
      holes={holes}
      onPlan={onPlan}
      className="mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
    >
      {PLAN_THIS_CUT_LABEL} · {minutes} min
    </PlanConfirmButton>
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
          {options.map((machine) => {
            const suit = machineSuitability(machine, surface);
            const suitLabel = suit ? `${SUITABILITY_LABELS[suit]} · ${SUITABILITY_PENALTY_COPY(suit)}` : '';
            return (
              <option key={machine.id} value={machine.id}>
                {machineTitle(machine)}
                {suitLabel ? ` · ${suitLabel}` : ''} · {machine.ceiling?.[surface] ?? '—'} · {machineTimeMult(machine)}× ·{' '}
                {machineMinutesRemaining(state, machine.id)} min
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}

function PondPanel({ state, percent, aerator, onBuyAerator, onPlan, onRemove, onSetPondDosing }) {
  return (
    <section className="border border-[var(--sand)] p-3 space-y-3">
      <h3 className="text-lg font-semibold">Pond</h3>
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
          <p className="text-sm text-[var(--sand)]">Keeps pond health from falling. {formatMoney(AERATOR_COST)} from cash.</p>
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
      <section className="border border-[var(--sand)] p-3 space-y-2">
        <h4 className="font-semibold">{POND_DOSING_LABEL}</h4>
        <p className="text-sm text-[var(--sand)]">
          Set-and-forget. {formatMoney(POND_DOSE_COST)} and {POND_DOSE_MINUTES} min each night. Holds health steady.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(state.pondDosing)}
            onChange={(event) => onSetPondDosing(event.target.checked)}
          />
          Dosing on
        </label>
      </section>
      <section className="border border-[var(--sand)] p-3 space-y-2">
        <h4 className="font-semibold">{POND_RESCUE_LABEL}</h4>
        <p className="text-sm text-[var(--sand)]">
          One-off. {formatMoney(POND_RESCUE_COST)} · {POND_RESCUE_MINUTES} min · recovers {POND_RESCUE_HEALTH} health.
        </p>
        <PlanJob
          state={state}
          taskId={POND_RESCUE_TASK}
          onPlan={onPlan}
          onRemove={onRemove}
          label={POND_RESCUE_LABEL}
        />
      </section>
    </section>
  );
}

function MowingStatus({ state, surface }) {
  const status = mowingStatus(state, surface);
  return (
    <div data-mowing-status={surface}>
      <p>Height {formatMm(status.heightMm)}</p>
      <p>Grass {formatMm(status.grassMm)}</p>
      <p className={status.overdue ? 'text-[var(--machine-orange)]' : ''}>
        {status.daysSinceCut}d since cut
        {status.overdue ? ' · overdue' : ''}
      </p>
      <p>
        Quality {formatQuality(status.quality)} · ceiling {formatQuality(status.ceiling)}
      </p>
      {hasPattern(surface) ? (
        <p>
          Pattern wear {Math.round(status.wear)}
          {status.wearClimbing ? ' · climbing' : ''}
        </p>
      ) : null}
      {status.lagging.length ? <p>Holes {status.lagging.join(', ')} lagging</p> : null}
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
  onToggleHole,
  onSelectHoles,
}) {
  const record = courseSettings(state, surface) ?? {};
  const showHoc = hasHoc(surface);
  const showPattern = hasPattern(surface);
  const stress = showHoc && inHocStressBand(surface, record.hoc);
  const threshold = stressThresholdHeight(surface);
  const cutId = CUT_TASK_BY_SURFACE[surface];
  const minutes = cutId ? durationForTask(state, cutId) : null;
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
      <TwoColumn
        left={
          <>
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
              </>
            ) : null}
            {minutes != null ? (
              <p className="mt-2 font-condensed text-2xl font-bold leading-none">
                {minutes}
                <span className="ml-2 text-sm font-semibold text-[var(--sand)]">min at these settings</span>
              </p>
            ) : null}
            <MachinePicker state={state} surface={surface} onSetMachineOverride={onSetMachineOverride} />
            <HoleSelector state={state} onToggleHole={onToggleHole} onSelectHoles={onSelectHoles} />
            <PlanThisCut state={state} surface={surface} onPlan={onPlan} onRemove={onRemove} />
            {surface === 'greens' ? (
              <PlanJob
                state={state}
                taskId={ROLL_GREENS_TASK}
                onPlan={onPlan}
                onRemove={onRemove}
                label={ROLL_GREENS_LABEL}
              />
            ) : null}
          </>
        }
        right={<MowingStatus state={state} surface={surface} />}
      />
    </section>
  );
}

function InputsTab({ state, onPlan, onRemove }) {
  return (
    <div className="space-y-4">
      {INPUTS_SURFACES.map((surface) => (
        <InputsSurface key={surface} state={state} surface={surface} onPlan={onPlan} onRemove={onRemove} />
      ))}
    </div>
  );
}

function InputsSurface({ state, surface, onPlan, onRemove }) {
  const certified = certifiedPresent(state, surface);
  const fertId = FERTILISE_BY_SURFACE[surface];
  const sprayId = SPRAY_BY_SURFACE[surface];
  const holes = presentHoles(state, surface);
  const kind = holeKind(surface);
  return (
    <section className="border border-[var(--sand)] p-3 space-y-3">
      <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
      <p className="text-sm text-[var(--sand)]">
        {FERTILISER_BRAND} raises the ceiling for {FERTILISER_DAYS} days. Spray suppresses disease for {SPRAY_SUPPRESS_DAYS} days.
      </p>
      {!certified ? (
        <p className="text-sm text-[var(--machine-orange)]">Needs a spray-certified worker.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <PlanJob
          state={state}
          taskId={fertId}
          onPlan={onPlan}
          onRemove={onRemove}
          label={FERTILISER_BRAND}
          extra={formatMoney(FERTILISER_MATERIALS_COST)}
        />
        <PlanJob
          state={state}
          taskId={sprayId}
          onPlan={onPlan}
          onRemove={onRemove}
          label="Spray fungicide"
          extra={formatMoney(SPRAY_MATERIALS_COST)}
        />
      </div>
      <ul className="space-y-1 text-sm">
        {holes.map((hole) => {
          const record = hole[kind];
          const fertUntil = holeTreatmentUntil(record, state.fertiliserUntil?.[surface]);
          const sprayUntil = holeSprayUntil(record, state.sprayedUntil?.[surface]);
          const pressure = holeDiseasePressure(state, record, surface);
          const approaching = approachingOutbreak(pressure);
          const outbreak = pressure >= DISEASE_OUTBREAK_THRESHOLD || Boolean(state.disease?.[surface]?.outbreak && sprayUntil <= state.day);
          return (
            <li key={hole.id} className="border border-[var(--sand)] px-2 py-1">
              <span className="font-semibold">Hole {hole.id}</span>
              {' · '}
              Fert {formatExpiry(fertUntil, state.day)}
              {' · '}
              Spray {formatExpiry(sprayUntil, state.day)}
              {' · '}
              Pressure {Math.round(pressure)}
              {outbreak ? ' · outbreak' : approaching ? ' · approaching outbreak' : ''}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BunkerTab({ state, onPlan, onRemove }) {
  const days = daysSinceLastWorked(state, 'bunkers');
  const planned = findPlannedJob(state, 'rakeBunkers');
  const check = canPlanTask(state, 'rakeBunkers');
  const minutes = planned?.minutes ?? durationForTask(state, 'rakeBunkers');
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">Bunkers</h3>
      <p className="mt-2">
        Quality {formatQuality(meanQuality(state, 'bunkers'))} · {days}d since raked
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
