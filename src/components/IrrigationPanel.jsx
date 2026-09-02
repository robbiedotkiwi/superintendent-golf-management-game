import { AERATOR_COST, IRRIGATION_POLICIES, POND_CAPACITY } from '../data/constants.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { canBuyAerator, IRRIGATED_SURFACES, pondPercent } from '../engine/irrigation.js';

const POLICY_LABELS = {
  off: 'Off',
  light: 'Light',
  full: 'Full',
};

export default function IrrigationPanel({ state, onSetPolicy, onBuyAerator, onClose }) {
  const open = true;
  const percent = pondPercent(state.pond.volume);
  const aerator = canBuyAerator(state);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l-4 border-[var(--soil)] bg-[var(--sand)] text-[var(--soil)] transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--soil)] px-5 py-4">
        <div>
          <h2 className="font-condensed text-4xl font-bold">Pond</h2>
          <p className="text-sm">Nightly irrigation. Rough is never watered.</p>
        </div>
        <button type="button" onClick={onClose} className="px-2 py-1 text-lg">
          Close
        </button>
      </div>
      <div className="px-5 py-4">
        <div className="text-sm">Volume</div>
        <div className="font-condensed text-6xl font-bold leading-none">{Math.round(state.pond.volume)}</div>
        <p className="mt-1 text-sm">
          {Math.round(percent)}% of {POND_CAPACITY} m³ · health {Math.round(state.pond.health)}
        </p>
      </div>
      <div className="flex-1 space-y-5 overflow-auto px-5 pb-6">
        {IRRIGATED_SURFACES.map((surface) => (
          <section key={surface} className="border border-[var(--soil)] p-3">
            <h3 className="text-lg font-semibold">{SURFACE_LABELS[surface]}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {IRRIGATION_POLICIES.map((policy) => (
                <button
                  key={policy}
                  type="button"
                  onClick={() => onSetPolicy(surface, policy)}
                  className={`border border-[var(--soil)] px-2 py-2 ${
                    state.irrigation[surface] === policy ? 'bg-[var(--soil)] text-[var(--paint)]' : ''
                  }`}
                >
                  {POLICY_LABELS[policy]}
                </button>
              ))}
            </div>
          </section>
        ))}
        <section className="border border-[var(--soil)] p-3">
          <h3 className="text-lg font-semibold">Aerator</h3>
          {state.hasAerator ? (
            <p className="mt-2">In the pond. Holds health up.</p>
          ) : (
            <>
              <p className="mt-2 text-sm">Keeps pond health from falling. {AERATOR_COST} from the tin.</p>
              <button
                type="button"
                disabled={!aerator.ok}
                onClick={onBuyAerator}
                className="mt-2 border border-[var(--soil)] px-3 py-2 disabled:opacity-40"
                title={aerator.ok ? undefined : aerator.reason}
              >
                Buy aerator · {AERATOR_COST}
              </button>
              {!aerator.ok ? <p className="mt-1 text-xs">{aerator.reason}</p> : null}
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
