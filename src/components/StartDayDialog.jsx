import {
  FUEL_TANK_CAPACITY,
  IRRIGATION_POLICIES,
  START_DAY_LABEL,
} from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { skippedOverdueSurfaces, unusedTimeCopy } from '../engine/badges.js';
import { plannedDayFuel } from '../engine/fuel.js';
import { IRRIGATED_SURFACES } from '../engine/irrigation.js';
import ForecastStrip from './ForecastStrip.jsx';
import PlanList from './PlanList.jsx';

const POLICY_LABELS = {
  off: 'Off',
  light: 'Light',
  full: 'Full',
};

export default function StartDayDialog({
  state,
  minutesRemaining,
  onRemove,
  onReorder,
  onSetIrrigation,
  onConfirm,
  onBack,
}) {
  const overdue = skippedOverdueSurfaces(state);
  const unused = unusedTimeCopy(minutesRemaining);
  const fuel = plannedDayFuel(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--soil)]/85 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">{START_DAY_LABEL}</h2>
        <p className="mt-3 text-lg">{unused}</p>
        <p className="mt-2">
          Tank {Math.round(fuel.tank)} / {FUEL_TANK_CAPACITY} L
        </p>
        {fuel.shortfall > 0 && fuel.affected ? (
          <p className="mt-2 text-lg">
            Short {fuel.shortfall.toFixed(1)} L. {fuel.affected.name} will run the tank dry.
          </p>
        ) : null}

        <h3 className="mt-6 font-condensed text-2xl">The plan</h3>
        <PlanList state={state} onReorder={onReorder} onRemove={onRemove} />

        <h3 className="mt-6 font-condensed text-2xl">Overdue and skipped</h3>
        {overdue.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--sand)]">Every overdue surface has a job today.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5">
            {overdue.map((surface) => (
              <li key={surface}>{SURFACE_LABELS[surface]} past the neglect threshold, no job today.</li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 font-condensed text-2xl">Tonight's irrigation</h3>
        <p className="mt-1 text-sm text-[var(--sand)]">Rain tomorrow wastes tonight's water.</p>
        <div className="mt-2 space-y-2">
          {IRRIGATED_SURFACES.map((surface) => (
            <div key={surface} className="border border-[var(--sand)] p-2">
              <div className="font-semibold">{SURFACE_LABELS[surface]}</div>
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
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-condensed text-2xl">Forecast</h3>
        <ForecastStrip state={state} />

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold"
          >
            {START_DAY_LABEL}
          </button>
          <button type="button" onClick={onBack} className="border border-[var(--sand)] px-5 py-3">
            Back
          </button>
        </div>
      </section>
    </div>
  );
}
