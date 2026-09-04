import {
  clampIrrigationMm,
  irrigationDemand,
  irrigationMmRange,
  irrigationMmToM3,
  migrateIrrigationValue,
  projectedPondVolume,
} from '../engine/irrigation.js';
import { holeCount } from '../engine/holes.js';

function formatIrrigationMm(value) {
  if (!Number.isFinite(value)) return '0 mm';
  return Number.isInteger(value) ? `${value} mm` : `${value.toFixed(1)} mm`;
}

export default function IrrigationMmSlider({ state, surface, onSetIrrigation }) {
  const range = irrigationMmRange(surface);
  const mm = migrateIrrigationValue(surface, state.irrigation?.[surface]);
  const holes = holeCount(state);
  const draw = irrigationMmToM3(surface, mm, holes);
  const demand = irrigationDemand(state);
  const projected = projectedPondVolume(state);
  const mains = demand.total > (state.pond?.volume ?? 0);

  return (
    <label className="mt-2 block">
      <span className="text-sm text-[var(--sand)]">Water tonight</span>
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
