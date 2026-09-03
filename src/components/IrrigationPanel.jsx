import { AERATOR_COST, IRRIGATION_POLICIES, POND_CAPACITY } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { canBuyAerator, IRRIGATED_SURFACES, pondPercent } from '../engine/irrigation.js';

const POLICY_LABELS = {
  off: 'Off',
  light: 'Light',
  full: 'Full',
};

export default function IrrigationPanel({ state, onSetPolicy, onBuyAerator, onClose }) {
  const percent = pondPercent(state.pond.volume);
  const aerator = canBuyAerator(state);

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-72 max-w-[min(18rem,100%)] flex-col border-l-4 border-[var(--sand)] bg-[var(--soil)] text-[var(--paint)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--sand)] px-4 py-3">
        <div>
          <h2 className="font-condensed text-4xl font-bold">Pond</h2>
          <p className="text-sm text-[var(--sand)]">Nightly irrigation. Rough is never watered.</p>
        </div>
        <button type="button" onClick={onClose} className="px-2 py-1 text-lg">
          Close
        </button>
      </div>
      <div className="px-4 py-3">
        <div className="text-sm text-[var(--sand)]">Volume</div>
        <div className="font-condensed text-6xl font-bold leading-none">{Math.round(state.pond.volume)}</div>
        <p className="mt-1 text-sm text-[var(--sand)]">
          {Math.round(percent)}% of {POND_CAPACITY} m³ · health {Math.round(state.pond.health)}
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-auto px-4 pb-5">
        {IRRIGATED_SURFACES.map((surface) => (
          <section key={surface} className="border border-[var(--sand)] p-3">
            <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {IRRIGATION_POLICIES.map((policy) => (
                <button
                  key={policy}
                  type="button"
                  onClick={() => onSetPolicy(surface, policy)}
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
          <h3 className="text-lg font-semibold">Aerator</h3>
          {state.hasAerator ? (
            <p className="mt-2">In the pond. Holds health up.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--sand)]">Keeps pond health from falling. {AERATOR_COST} from capital.</p>
              <button
                type="button"
                disabled={!aerator.ok}
                onClick={onBuyAerator}
                className="mt-2 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                title={aerator.ok ? undefined : aerator.reason}
              >
                Buy aerator · {AERATOR_COST}
              </button>
              {!aerator.ok ? <p className="mt-1 text-xs text-[var(--sand)]">{aerator.reason}</p> : null}
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
