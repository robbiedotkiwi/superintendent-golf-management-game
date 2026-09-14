import {
  HOC_STEP,
  HOC_STRESS_DAMAGE,
  HOC_STRESS_THRESHOLD,
  HOC_SURFACES,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_KEYS,
  PATTERN_LABELS,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { BASELINE_MOW_FREQUENCY_PER_WEEK } from '../data/grass.js';
import { courseSettings } from '../engine/holes.js';
import { hasHoc, hasPattern, inHocStressBand } from '../engine/mowing.js';
import { grassSpeciesFor, hocRangeFor, isGrassDormant } from '../engine/grass.js';

function stressThresholdHeight(surface, state) {
  const range = hocRangeFor(state, surface);
  if (!range) return null;
  return range.max - HOC_STRESS_THRESHOLD * (range.max - range.min);
}

function stressBandWidth(surface, state) {
  const range = hocRangeFor(state, surface);
  const threshold = stressThresholdHeight(surface, state);
  if (!range || threshold == null) return 0;
  return ((threshold - range.min) / (range.max - range.min)) * 100;
}

function CutPatternSurface({ surface, state, onSetHoc, onSetPattern, onSetAngle, onSetAutoRotate }) {
  const record = courseSettings(state, surface) ?? {};
  const range = hocRangeFor(state, surface);
  const species = grassSpeciesFor(state, surface);
  const showHoc = hasHoc(surface);
  const showPattern = hasPattern(surface);
  const stress = showHoc && inHocStressBand(surface, record.hoc, state);
  const threshold = stressThresholdHeight(surface, state);
  const typicalCuts = BASELINE_MOW_FREQUENCY_PER_WEEK[surface];

  return (
    <section className="border border-[var(--sand)] p-3" data-cut-pattern-surface={surface}>
      <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
      {species ? (
        <p className="mt-1 text-sm text-[var(--sand)]">
          {species.name}
          {typicalCuts != null ? ` · typical ${typicalCuts} cuts/week` : ''}
          {isGrassDormant(state, surface) ? ' · dormant' : ''}
        </p>
      ) : null}
      {showHoc && range ? (
        <label className="mt-2 block">
          <span className="text-sm text-[var(--sand)]">Height of cut</span>
          <div className="font-condensed text-3xl font-bold leading-none">{record.hoc} mm</div>
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-[var(--sand)]/30">
              <div className="h-full bg-[var(--machine-orange)]/50" style={{ width: `${stressBandWidth(surface, state)}%` }} />
            </div>
            <input
              type="range"
              min={range.min}
              max={range.max}
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
    </section>
  );
}

export default function CutPatternsTab({ state, onSetHoc, onSetPattern, onSetAngle, onSetAutoRotate }) {
  return (
    <div className="space-y-4" data-cut-patterns>
      {HOC_SURFACES.map((surface) => (
        <CutPatternSurface
          key={surface}
          surface={surface}
          state={state}
          onSetHoc={onSetHoc}
          onSetPattern={onSetPattern}
          onSetAngle={onSetAngle}
          onSetAutoRotate={onSetAutoRotate}
        />
      ))}
    </div>
  );
}
