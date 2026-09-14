import {
  clampIrrigationMm,
  irrigationDemand,
  irrigationMmRange,
  irrigationMmToM3,
  migrateIrrigationValue,
  projectedPondVolume,
} from '../engine/irrigation.js';
import { holeCount } from '../engine/holes.js';
import { surfaceEtMm } from '../engine/moisture.js';
import { planningDayOf, weekdayLabel } from '../engine/week.js';

function formatIrrigationMm(value) {
  if (!Number.isFinite(value)) return '0 mm';
  return Number.isInteger(value) ? `${value} mm` : `${value.toFixed(1)} mm`;
}

export default function IrrigationMmSlider({ state, surface, onSetIrrigation }) {
  const range = irrigationMmRange(surface);
  if (!range) return null;
  const mm = migrateIrrigationValue(surface, state.irrigation?.[surface]);
  const holes = holeCount(state);
  const draw = irrigationMmToM3(surface, mm, holes);
  const demand = irrigationDemand(state);
  const projected = projectedPondVolume(state);
  const mains = demand.total > (state.pond?.volume ?? 0);
  const night = weekdayLabel(planningDayOf(state));
  const etMm = state.hasWeatherStation ? surfaceEtMm(state, surface) : null;
  const etDelta = etMm == null ? null : mm - etMm;
  let etCopy = null;
  if (etMm != null) {
    if (Math.abs(etDelta) < 0.35) etCopy = 'near replacement';
    else if (etDelta > 0) etCopy = 'more than replacement';
    else etCopy = 'short of replacement';
  }

  return (
    <label className="mt-2 block">
      <span className="text-sm text-[var(--sand)]">Water {night} night</span>
      <div className="font-condensed text-3xl font-bold leading-none">{formatIrrigationMm(mm)}</div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={mm}
        onChange={(event) => onSetIrrigation(surface, clampIrrigationMm(surface, Number(event.target.value)))}
        className="mt-2 w-full"
        aria-label={`${surface} irrigation millimetres`}
      />
      {etMm != null ? (
        <p className="mt-2 text-sm" data-irrigation-et={surface}>
          Station ET {formatIrrigationMm(etMm)} · you set {formatIrrigationMm(mm)}
          {etCopy ? ` · ${etCopy}` : ''}
        </p>
      ) : null}
      <p className="mt-2 text-sm" data-irrigation-m3={surface}>
        Draw {draw.toFixed(1)} m³ tonight
      </p>
      <p className="text-sm" data-projected-pond={surface}>
        Pond after draw {Math.round(projected)} m³
        {mains ? ' · mains for the rest' : ''}
      </p>
    </label>
  );
}
