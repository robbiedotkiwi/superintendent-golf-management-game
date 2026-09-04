import {
  CONDITION_MAX,
  SALE_DAYS,
  SALE_PRICE_FRACTION,
  SALESMAN_BUY_RELATIONSHIP,
  SALESMAN_RELATIONSHIP_MAX,
  SALESMAN_RELATIONSHIP_MIN,
  SALESMAN_SELL_RELATIONSHIP,
  USED_CONDITION_MAX,
  USED_CONDITION_MIN,
  USED_DELIVERY_DAYS,
  USED_LISTING_COUNT,
  USED_PRICE_FRACTION,
  USED_RELATIONSHIP_DISCOUNT_PER_POINT,
  DELIVERY_SOURCE_USED,
  HOURS_USED_MAX,
  HOURS_USED_MIN,
} from '../data/constants.js';
import { getMachine, MACHINES } from '../data/equipment.js';
import { bumpCapitalSpent } from './history.js';
import { clampCondition, conditionOf, dropOwnedMachine, ensureAutoWeek, recomputePlannedMinutes, stampOwnedMachine } from './equipment.js';
import { cashOnHand, needsCash, spendCash } from './cash.js';
import { createRng } from './rng.js';

export function clampRelationship(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return SALESMAN_RELATIONSHIP_MIN;
  return Math.min(SALESMAN_RELATIONSHIP_MAX, Math.max(SALESMAN_RELATIONSHIP_MIN, n));
}

export function usedPrice(state, machine, condition) {
  const rel = clampRelationship(state.salesmanRelationship);
  const discount = rel * USED_RELATIONSHIP_DISCOUNT_PER_POINT;
  const conditionFactor = clampCondition(condition) / CONDITION_MAX;
  return Math.max(0, Math.round((machine?.cost ?? 0) * USED_PRICE_FRACTION * conditionFactor * (1 - discount)));
}

export function salePrice(state, machineId) {
  const machine = getMachine(machineId);
  const condition = conditionOf(state, machineId);
  return Math.max(0, Math.round((machine?.cost ?? 0) * SALE_PRICE_FRACTION * (condition / CONDITION_MAX)));
}

function blockedIds(state) {
  return new Set([
    ...(state.ownedMachines ?? []),
    ...(state.pendingDeliveries ?? []).map((item) => item.machineId),
    ...(state.activeSales ?? []).map((item) => item.machineId),
  ]);
}

export function eligibleUsedMachines(state) {
  const blocked = blockedIds(state);
  return MACHINES.filter(
    (machine) => !machine.ownedAtStart && machine.cost > 0 && !blocked.has(machine.id),
  );
}

export function rollUsedListings(state, rng) {
  const pool = [...eligibleUsedMachines(state)];
  const listings = [];
  const count = Math.min(USED_LISTING_COUNT, pool.length);
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(rng.next() * pool.length);
    const [machine] = pool.splice(index, 1);
    if (!machine) break;
    const span = USED_CONDITION_MAX - USED_CONDITION_MIN;
    const condition = USED_CONDITION_MIN + Math.floor(rng.next() * (span + 1));
    const hourSpan = HOURS_USED_MAX - HOURS_USED_MIN;
    const hours = HOURS_USED_MIN + Math.floor(rng.next() * (hourSpan + 1));
    listings.push({
      id: `used-${machine.id}`,
      machineId: machine.id,
      condition,
      hours,
      price: usedPrice(state, machine, condition),
    });
  }
  return listings;
}

export function canBuyUsed(state, listingId) {
  const listing = (state.usedListings ?? []).find((item) => item.id === listingId);
  if (!listing) return { ok: false, reason: 'That listing is gone.' };
  if (state.ownedMachines.includes(listing.machineId)) return { ok: false, reason: 'Already owned.' };
  if ((state.pendingDeliveries ?? []).some((item) => item.machineId === listing.machineId)) {
    return { ok: false, reason: 'Already on a truck.' };
  }
  const usedCash = needsCash(state, listing.price);
  if (!usedCash.ok) return usedCash;
  return { ok: true, listing };
}

export function buyUsed(state, listingId) {
  const check = canBuyUsed(state, listingId);
  if (!check.ok) return state;
  const listing = check.listing;
  const next = {
    ...spendCash(state, listing.price),
    usedListings: (state.usedListings ?? []).filter((item) => item.id !== listingId),
    pendingDeliveries: [
      ...(state.pendingDeliveries ?? []),
      {
        id: listing.id,
        machineId: listing.machineId,
        condition: listing.condition,
        hours: listing.hours,
        source: DELIVERY_SOURCE_USED,
        price: listing.price,
        arrivesDay: state.day + USED_DELIVERY_DAYS,
      },
    ],
    salesmanRelationship: clampRelationship((state.salesmanRelationship ?? 0) + SALESMAN_BUY_RELATIONSHIP),
  };
  return bumpCapitalSpent(next, listing.price);
}

export function canSellMachine(state, machineId) {
  if (!state.ownedMachines.includes(machineId)) return { ok: false, reason: 'Not in the shed.' };
  if ((state.leasedMachines ?? []).includes(machineId)) return { ok: false, reason: 'Return the lease first.' };
  if (state.ownedMachines.length <= 1) return { ok: false, reason: 'Keep at least one machine.' };
  if ((getMachine(machineId)?.cost ?? 0) <= 0) return { ok: false, reason: 'No buyer for that unit.' };
  return { ok: true };
}

export function sellMachine(state, machineId) {
  const check = canSellMachine(state, machineId);
  if (!check.ok) return state;
  const price = salePrice(state, machineId);
  const condition = conditionOf(state, machineId);
  let next = dropOwnedMachine(state, machineId);
  next = {
    ...next,
    salesmanRelationship: clampRelationship((next.salesmanRelationship ?? 0) + SALESMAN_SELL_RELATIONSHIP),
    activeSales: [
      ...(next.activeSales ?? []),
      {
        id: `sale-${machineId}-${state.day}`,
        machineId,
        condition,
        price,
        dueDay: state.day + SALE_DAYS,
      },
    ],
  };
  return recomputePlannedMinutes(next);
}

export function tickMarket(state) {
  let next = { ...state };
  const pendingDeliveries = [];
  let arrived = false;
  for (const item of state.pendingDeliveries ?? []) {
    if (next.day >= item.arrivesDay) {
      arrived = true;
      if (!next.ownedMachines.includes(item.machineId)) {
        next = { ...next, ...stampOwnedMachine(next, item.machineId, item.condition, item.hours) };
        if (getMachine(item.machineId)?.autonomous) {
          const rng = createRng(next.rngSeed);
          const scheduled = ensureAutoWeek(next, rng, true);
          next = { ...scheduled.state, rngSeed: rng.seed };
        }
      }
    } else {
      pendingDeliveries.push(item);
    }
  }
  next = { ...next, pendingDeliveries };
  const activeSales = [];
  let cash = cashOnHand(next);
  for (const item of next.activeSales ?? []) {
    if (next.day >= item.dueDay) {
      cash += item.price;
    } else {
      activeSales.push(item);
    }
  }
  return {
    ...next,
    activeSales,
    cash,
    lastDeliveryDay: arrived ? next.day : (next.lastDeliveryDay ?? null),
  };
}
