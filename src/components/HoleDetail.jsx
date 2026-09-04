import {
  HOC_RANGE,
  HOC_STEP,
  HOC_SURFACES,
  PATTERN_ANGLE_MAX,
  PATTERN_ANGLE_MIN,
  PATTERN_KEYS,
  PATTERN_LABELS,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { daysSinceHoleWorked } from '../engine/holes.js';
import { holeSurface, surfaceSettings } from '../engine/holes.js';
import { clampAngle, clampHoc, hasPattern } from '../engine/mowing.js';

export default function HoleDetail({ state, holeId, onSetOverride, onClose }) {
  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 w-80 max-h-[70%] overflow-y-auto border-2 border-[var(--sand)] bg-[var(--soil)] p-3">
      <div className="flex items-center justify-between">
        <h2 className="font-condensed text-3xl font-bold">Hole {holeId}</h2>
        <button type="button" onClick={onClose} className="border border-[var(--sand)] px-2 py-1">
          Close
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--sand)]">Course defaults apply unless you override a surface.</p>
      {HOC_SURFACES.map((surface) => {
        const record = holeSurface(state, holeId, surface);
        if (!record) return null;
        const settings = surfaceSettings(state, holeId, surface);
        const overridden = Boolean(record.override);
        return (
          <section key={surface} className="mt-3 border border-[var(--sand)] p-2">
            <h3 className="font-semibold">{SURFACE_LABELS[surface]}</h3>
            <p className="text-sm text-[var(--sand)]">
              Quality {Math.round(record.quality)} · {daysSinceHoleWorked(state, holeId, surface)}d since worked
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overridden}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSetOverride(holeId, surface, { ...settings });
                  } else {
                    onSetOverride(holeId, surface, null);
                  }
                }}
              />
              Override this hole
            </label>
            {overridden ? (
              <>
                <label className="mt-2 block text-sm">
                  Height {settings.hoc} mm
                  <input
                    type="range"
                    min={HOC_RANGE[surface].min}
                    max={HOC_RANGE[surface].max}
                    step={HOC_STEP[surface]}
                    value={settings.hoc}
                    onChange={(event) =>
                      onSetOverride(holeId, surface, {
                        ...settings,
                        hoc: clampHoc(surface, Number(event.target.value)),
                      })
                    }
                    className="mt-1 w-full"
                  />
                </label>
                {hasPattern(surface) ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {PATTERN_KEYS.map((pattern) => (
                        <button
                          key={pattern}
                          type="button"
                          onClick={() => onSetOverride(holeId, surface, { ...settings, pattern })}
                          className={`border px-2 py-1 text-sm ${
                            settings.pattern === pattern ? 'bg-[var(--machine-orange)]' : 'border-[var(--sand)]'
                          }`}
                        >
                          {PATTERN_LABELS[pattern]}
                        </button>
                      ))}
                    </div>
                    <label className="mt-2 block text-sm">
                      Angle {settings.angle}°
                      <input
                        type="range"
                        min={PATTERN_ANGLE_MIN}
                        max={PATTERN_ANGLE_MAX}
                        value={settings.angle}
                        onChange={(event) =>
                          onSetOverride(holeId, surface, {
                            ...settings,
                            angle: clampAngle(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  </>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-sm text-[var(--sand)]">
                Using {settings.hoc} mm
                {settings.pattern ? ` · ${PATTERN_LABELS[settings.pattern]}` : ''}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
