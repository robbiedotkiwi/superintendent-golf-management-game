import { FUEL_TANK_CAPACITY, START_DAY_LABEL } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { skippedOverdueSurfaces, unusedTimeCopy } from '../engine/badges.js';
import { plannedDayFuel } from '../engine/fuel.js';
import { IRRIGATED_SURFACES, pondDoseBriefing } from '../engine/irrigation.js';
import ForecastStrip from './ForecastStrip.jsx';
import IrrigationMmSlider from './IrrigationMmSlider.jsx';
import PlanList from './PlanList.jsx';

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
  const pondBriefing = pondDoseBriefing(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--soil)]/85 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">{START_DAY_LABEL}</h2>
        {pondBriefing ? (
          <p className="mt-3 text-lg text-[var(--machine-orange)]" data-morning-briefing="pond-dose">
            {pondBriefing}
          </p>
        ) : null}
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
              <IrrigationMmSlider state={state} surface={surface} onSetIrrigation={onSetIrrigation} />
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
