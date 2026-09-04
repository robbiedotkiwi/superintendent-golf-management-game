import {
  CONDITION_MAX,
  CONDITION_SLOW_THRESHOLD,
  DELIVERIES_EMPTY_COPY,
  DELIVERIES_HEADING,
  FOLEY_GRINDER_COST,
  FOLEY_GRIND_MINUTES,
  FOLEY_MODEL,
  FOLEY_TYPE,
  FUEL_BULK_MIN_LITRES,
  FUEL_BULK_PRICE_PER_L,
  FUEL_PRICE_PER_L,
  FUEL_TANK_CAPACITY,
  GRIND_AWAY_COST,
  GRIND_AWAY_DAYS,
  LEASE_RATE,
  MACHINE_BRAND_FOLEY,
  MACHINE_STATUS_NEW,
  MACHINE_STATUS_USED,
  REPAIR_MINUTES,
  SALESMAN_RELATIONSHIP_MAX,
  SHED_TAB_BUY,
  SHED_TAB_DEFAULT,
  SHED_TAB_LABELS,
  SHED_TAB_YARD,
  SHED_TABS,
  WEAR_MAX,
  WEAR_THRESHOLD,
} from '../data/constants.js';
import { MACHINES, getMachine } from '../data/equipment.js';
import { canLeaseMachine, leaseCost } from '../engine/budget.js';
import { formatMoney } from '../engine/format.js';
import {
  deliveryDaysRemaining,
  deliverySourceLabel,
  machineStatusLine,
  machineTitle,
  machineTypeLine,
} from '../engine/machineDisplay.js';
import {
  canBuyFoley,
  canBuyMachine,
  canGrindInHouse,
  canRepair,
  canSendGrind,
  claimedMinutesByMachine,
  conditionOf,
  machineDailyMinutesOf,
} from '../engine/equipment.js';
import { canBuyUsed, canSellMachine, salePrice } from '../engine/market.js';
import { canBuyFuel, fuelCost, tankRoom } from '../engine/fuel.js';
import { useState } from 'react';
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
  onBuyUsed,
  onSell,
  onBuyFuel,
}) {
  const shop = MACHINES.filter((machine) => !machine.ownedAtStart);
  const foleyBuy = canBuyFoley(state);
  const [fuelLitres, setFuelLitres] = useState(String(FUEL_BULK_MIN_LITRES));
  const wanted = Number(fuelLitres);
  const fuelCheck = canBuyFuel(state, wanted);
  const room = tankRoom(state);
  const fillCheck = canBuyFuel(state, room);

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
        Cash {formatMoney(state.cash)}
      </p>

      {tab === SHED_TAB_YARD ? (
        <>
          <h2 className="font-condensed text-3xl">Fuel</h2>
          <p className="mt-2">
            Tank {Math.round(state.fuelLitres ?? 0)} / {FUEL_TANK_CAPACITY} L
          </p>
          <p className="mt-1 text-sm text-[var(--sand)]">
            {`$${FUEL_PRICE_PER_L.toFixed(2)}`} / L · bulk {`$${FUEL_BULK_PRICE_PER_L.toFixed(2)}`} / L from {FUEL_BULK_MIN_LITRES} L
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="1"
              max={room}
              value={fuelLitres}
              onChange={(event) => setFuelLitres(event.target.value)}
              className="w-24 border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-[var(--paint)]"
            />
            <button
              type="button"
              disabled={!fuelCheck.ok}
              title={fuelCheck.ok ? undefined : fuelCheck.reason}
              onClick={() => onBuyFuel(wanted)}
              className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
            >
              Buy {Number.isFinite(wanted) ? wanted : 0} L · {fuelCheck.ok ? formatMoney(fuelCheck.cost) : formatMoney(fuelCost(wanted || 0))}
            </button>
            <button
              type="button"
              disabled={!fillCheck.ok}
              title={fillCheck.ok ? undefined : fillCheck.reason}
              onClick={() => onBuyFuel(room)}
              className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
            >
              Fill tank · {room} L
            </button>
          </div>
          <h2 className="mt-10 font-condensed text-3xl">{DELIVERIES_HEADING}</h2>
          <div className="mt-3 space-y-3">
            {(state.pendingDeliveries ?? []).length === 0 ? (
              <p className="text-[var(--sand)]">{DELIVERIES_EMPTY_COPY}</p>
            ) : (
              (state.pendingDeliveries ?? []).map((item) => {
                const entry = getMachine(item.machineId);
                return (
                  <section key={item.id} className="border border-[var(--sand)] p-4">
                    <h3 className="text-xl font-semibold">{machineTitle(entry) || item.machineId}</h3>
                    {machineTypeLine(entry) ? (
                      <p className="text-sm text-[var(--sand)]">{machineTypeLine(entry)}</p>
                    ) : null}
                    <p className="mt-1 text-sm">{deliverySourceLabel(item.source)}</p>
                    <p className="mt-1 text-sm text-[var(--sand)]">
                      Arrives day {item.arrivesDay} · {deliveryDaysRemaining(state, item)} days remaining · paid{' '}
                      {formatMoney(item.price ?? 0)}
                    </p>
                  </section>
                );
              })
            )}
          </div>
          <h2 className="mt-10 font-condensed text-3xl">In the shed</h2>
          <div className="mt-3 space-y-4">
            {state.ownedMachines.map((id) => {
              const machine = MACHINES.find((item) => item.id === id);
              const wear = state.machineWear[id] ?? 0;
              const condition = conditionOf(state, id);
              const claimed = claimedMinutesByMachine(state)[id] ?? 0;
              const daily = machineDailyMinutesOf(state, id);
              const broken = Boolean(state.machineBroken[id]);
              const grindAway = canSendGrind(state, id);
              const grindHere = canGrindInHouse(state, id);
              const repair = canRepair(state, id);
              const sell = canSellMachine(state, id);
              return (
                <section key={id} className="border-2 border-[var(--sand)] bg-[var(--soil)] p-4">
                  <h3 className="text-2xl font-semibold">{machineTitle(machine)}</h3>
                  {machineTypeLine(machine) ? (
                    <p className="text-sm text-[var(--sand)]">{machineTypeLine(machine)}</p>
                  ) : null}
                  <p className="mt-1 text-sm">{machineStatusLine(state, id)}</p>
                  <p className="mt-2">
                    Condition {condition} / {CONDITION_MAX}
                    {condition < CONDITION_SLOW_THRESHOLD ? ' — slower cuts.' : ''}
                  </p>
                  <p className="mt-1 text-sm text-[var(--sand)]">
                    Today {claimed} / {daily} min
                  </p>
                  {machine.reel ? (
                    <p className="mt-1">
                      Wear {wear} / {WEAR_MAX}
                      {wear > WEAR_THRESHOLD ? ' — dull. Gains are down.' : ''}
                    </p>
                  ) : (
                    <p className="mt-1 text-[var(--sand)]">No reel to grind.</p>
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
                        Send away ({formatMoney(GRIND_AWAY_COST)}, {GRIND_AWAY_DAYS} days)
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
                    <button
                      type="button"
                      disabled={!sell.ok}
                      title={sell.ok ? undefined : sell.reason}
                      onClick={() => onSell(id)}
                      className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
                    >
                      Sell {formatMoney(salePrice(state, id))}
                    </button>
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
          <p className="mt-2">
            Salesman relationship {state.salesmanRelationship}/{SALESMAN_RELATIONSHIP_MAX}
          </p>
          <h3 className="mt-6 text-2xl font-semibold">Used listings</h3>
          <div className="mt-3 space-y-3">
            {(state.usedListings ?? []).length === 0 ? (
              <p className="text-[var(--sand)]">No used machines this season.</p>
            ) : null}
            {(state.usedListings ?? []).map((listing) => {
              const entry = getMachine(listing.machineId);
              const check = canBuyUsed(state, listing.id);
              return (
                <section key={listing.id} className="border border-[var(--sand)] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-semibold">{machineTitle(entry) || listing.machineId}</h3>
                    <p>{formatMoney(listing.price)}</p>
                  </div>
                  {machineTypeLine(entry) ? (
                    <p className="text-sm text-[var(--sand)]">{machineTypeLine(entry)}</p>
                  ) : null}
                  <p className="mt-1 text-sm">{MACHINE_STATUS_USED(listing.hours ?? 0)}</p>
                  <p className="mt-1 text-sm text-[var(--sand)]">
                    Condition {listing.condition} / {CONDITION_MAX}
                  </p>
                  <button
                    type="button"
                    disabled={!check.ok}
                    title={check.ok ? undefined : check.reason}
                    onClick={() => onBuyUsed(listing.id)}
                    className="mt-3 bg-[var(--machine-orange)] px-3 py-2 font-semibold disabled:opacity-40"
                  >
                    {check.ok ? 'Buy used' : check.reason}
                  </button>
                </section>
              );
            })}
          </div>
          {(state.activeSales ?? []).length > 0 ? (
            <>
              <h3 className="mt-6 text-2xl font-semibold">Active sales</h3>
              <div className="mt-3 space-y-3">
                {state.activeSales.map((item) => (
                  <section key={item.id} className="border border-[var(--sand)] p-4">
                    <h3 className="text-xl font-semibold">
                      {machineTitle(getMachine(item.machineId)) || item.machineId}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--sand)]">
                      Proceeds {formatMoney(item.price)} on day {item.dueDay}
                    </p>
                  </section>
                ))}
              </div>
            </>
          ) : null}
          <h3 className="mt-6 text-2xl font-semibold">New stock</h3>
          <div className="mt-3 space-y-3">
            {shop.map((machine) => {
              const owned = state.ownedMachines.includes(machine.id);
              const check = canBuyMachine(state, machine.id);
              return (
                <section key={machine.id} className="border border-[var(--sand)] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-semibold">{machineTitle(machine)}</h3>
                    <p>{owned ? 'Owned' : formatMoney(machine.cost)}</p>
                  </div>
                  {machineTypeLine(machine) ? (
                    <p className="text-sm text-[var(--sand)]">{machineTypeLine(machine)}</p>
                  ) : null}
                  <p className="mt-1 text-sm">{owned ? machineStatusLine(state, machine.id) : MACHINE_STATUS_NEW}</p>
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
                        Lease · {formatMoney(leaseCost(machine.id))} / season ({LEASE_RATE * 100}%)
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
            <section className="border border-[var(--sand)] p-4">
              <h3 className="text-xl font-semibold">
                {MACHINE_BRAND_FOLEY} {FOLEY_MODEL}
              </h3>
              <p className="text-sm text-[var(--sand)]">{FOLEY_TYPE}</p>
              <p className="mt-1 text-sm">{state.hasFoleyGrinder ? 'Installed' : MACHINE_STATUS_NEW}</p>
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
                  {foleyBuy.ok ? `Buy · ${formatMoney(FOLEY_GRINDER_COST)}` : foleyBuy.reason}
                </button>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
