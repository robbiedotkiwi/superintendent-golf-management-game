import {
  FOLEY_GRINDER_COST,
  FOLEY_GRIND_MINUTES,
  GRIND_AWAY_COST,
  GRIND_AWAY_DAYS,
  LEASE_RATE,
  REPAIR_MINUTES,
  SHED_TAB_BUY,
  SHED_TAB_DEFAULT,
  SHED_TAB_LABELS,
  SHED_TAB_YARD,
  SHED_TABS,
  WEAR_MAX,
  WEAR_THRESHOLD,
} from '../data/constants.js';
import { MACHINES } from '../data/equipment.js';
import { canLeaseMachine, leaseCost } from '../engine/budget.js';
import {
  canBuyFoley,
  canBuyMachine,
  canGrindInHouse,
  canRepair,
  canSendGrind,
  isMachineAvailable,
} from '../engine/equipment.js';
import SectionTabs from './SectionTabs.jsx';

const SURFACE_ORDER = ['greens', 'tees', 'fairways', 'rough'];

function capability(machine, surface) {
  const allow = machine.surfaces[surface];
  if (allow === true) return 'yes';
  if (allow === 'roll') return 'roll only';
  return 'no — would damage the turf';
}

export default function Shed({
  state,
  tab = SHED_TAB_DEFAULT,
  onTab,
  onBack,
  onBuy,
  onBuyFoley,
  onSendGrind,
  onGrindInHouse,
  onRepair,
  onLease,
  onStopLease,
}) {
  const shop = MACHINES.filter((machine) => !machine.ownedAtStart);
  const foleyBuy = canBuyFoley(state);

  return (
    <div className="h-full overflow-y-auto bg-[var(--soil)] px-6 py-5 text-[var(--paint)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-condensed text-5xl font-bold">Shed</h1>
        <button type="button" onClick={onBack} className="border border-[var(--sand)] px-4 py-2">
          Back to the course
        </button>
      </div>
      <SectionTabs tabs={SHED_TABS} labels={SHED_TAB_LABELS} value={tab} onChange={onTab} />
      <p className="mb-6 text-[var(--sand)]">
        Cash {Math.round(state.cash)} · Capital {Math.round(state.capitalBudget)} · Maintenance {Math.round(state.maintenanceBudget)}
      </p>

      {tab === SHED_TAB_YARD ? (
        <>
      <h2 className="font-condensed text-3xl">In the shed</h2>
      <div className="mt-3 space-y-4">
        {state.ownedMachines.map((id) => {
          const machine = MACHINES.find((item) => item.id === id);
          const wear = state.machineWear[id] ?? 0;
          const broken = Boolean(state.machineBroken[id]);
          const awayUntil = state.machineAwayUntil[id];
          const away = awayUntil && state.day < awayUntil;
          const grindAway = canSendGrind(state, id);
          const grindHere = canGrindInHouse(state, id);
          const repair = canRepair(state, id);
          return (
            <section key={id} className="border-2 border-[var(--sand)] bg-[var(--soil)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-2xl font-semibold">
                  {machine.name}
                  {machine.brand ? ` · ${machine.brand}` : ''}
                </h3>
                <p className="text-[var(--sand)]">
                  {broken ? 'Broken' : away ? `Away until day ${awayUntil}` : isMachineAvailable(state, id) ? 'Ready' : 'Off'}
                </p>
              </div>
              {machine.reel ? (
                <p className="mt-2">
                  Wear {wear} / {WEAR_MAX}
                  {wear > WEAR_THRESHOLD ? ' — dull. Gains are down.' : ''}
                </p>
              ) : (
                <p className="mt-2 text-[var(--sand)]">No reel to grind.</p>
              )}
              <p className="mt-2 text-sm text-[var(--sand)]">
                {SURFACE_ORDER.map((surface) => `${surface}: ${capability(machine, surface)}`).join(' · ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {machine.reel ? (
                  <button
                    type="button"
                    disabled={!grindAway.ok}
                    title={grindAway.reason}
                    onClick={() => onSendGrind(id)}
                    className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                  >
                    Send away ({GRIND_AWAY_COST}, {GRIND_AWAY_DAYS} days)
                  </button>
                ) : null}
                {machine.reel && state.hasFoleyGrinder ? (
                  <button
                    type="button"
                    disabled={!grindHere.ok}
                    title={grindHere.reason}
                    onClick={() => onGrindInHouse(id)}
                    className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                  >
                    Grind in-house ({FOLEY_GRIND_MINUTES} min)
                  </button>
                ) : null}
                {(state.leasedMachines ?? []).includes(id) ? (
                  <button
                    type="button"
                    onClick={() => onStopLease(id)}
                    className="border border-[var(--sand)] px-3 py-2"
                  >
                    Return lease
                  </button>
                ) : null}
                {broken ? (
                  <button
                    type="button"
                    disabled={!repair.ok}
                    title={repair.reason}
                    onClick={() => onRepair(id)}
                    className="bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
                  >
                    Repair ({REPAIR_MINUTES} min)
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
        </>
      ) : null}

      {tab === SHED_TAB_BUY ? (
        <>
      <h2 className="mt-10 font-condensed text-3xl">Buy</h2>
      <div className="mt-3 space-y-3">
        {shop.map((machine) => {
          const owned = state.ownedMachines.includes(machine.id);
          const check = canBuyMachine(state, machine.id);
          return (
            <section key={machine.id} className="border border-[var(--sand)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-semibold">
                  {machine.name}
                  {machine.brand ? ` · ${machine.brand}` : ''}
                </h3>
                <p>{owned ? 'Owned' : machine.cost}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--sand)]">
                {SURFACE_ORDER.map((surface) => `${surface}: ${capability(machine, surface)}`).join(' · ')}
              </p>
              {owned ? null : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!check.ok}
                    title={check.reason}
                    onClick={() => onBuy(machine.id)}
                    className="bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
                  >
                    {check.ok ? 'Buy' : check.reason}
                  </button>
                  <button
                    type="button"
                    disabled={!canLeaseMachine(state, machine.id).ok}
                    title={canLeaseMachine(state, machine.id).reason}
                    onClick={() => onLease(machine.id)}
                    className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                  >
                    Lease · {leaseCost(machine.id)} / season ({LEASE_RATE * 100}%)
                  </button>
                </div>
              )}
            </section>
          );
        })}
        <section className="border border-[var(--sand)] p-4">
          <h3 className="text-xl font-semibold">Foley bedknife grinder</h3>
          <p className="mt-1 text-sm text-[var(--sand)]">Grind reels in-house. {FOLEY_GRIND_MINUTES} minutes, no downtime.</p>
          {state.hasFoleyGrinder ? (
            <p className="mt-2">Installed.</p>
          ) : (
            <button
              type="button"
              disabled={!foleyBuy.ok}
              title={foleyBuy.reason}
              onClick={onBuyFoley}
              className="mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
            >
              {foleyBuy.ok ? `Buy · ${FOLEY_GRINDER_COST}` : foleyBuy.reason}
            </button>
          )}
        </section>
      </div>
        </>
      ) : null}
    </div>
  );
}
