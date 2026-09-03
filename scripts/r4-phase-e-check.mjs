/**
 * Round 4 Phase E: salesman relationship, used listings, deliveries and sales.
 * Run: node scripts/r4-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SALE_DAYS,
  SALE_PRICE_FRACTION,
  SALESMAN_BUY_RELATIONSHIP,
  SALESMAN_RELATIONSHIP_MAX,
  SALESMAN_RELATIONSHIP_MIN,
  SALESMAN_RELATIONSHIP_START,
  SALESMAN_SELL_RELATIONSHIP,
  SHED_TABS,
  STARTING_MACHINE_ID,
  USED_CONDITION_MAX,
  USED_CONDITION_MIN,
  USED_DELIVERY_DAYS,
  USED_LISTING_COUNT,
  USED_PRICE_FRACTION,
  USED_RELATIONSHIP_DISCOUNT_PER_POINT,
} from '../src/data/constants.js';
import { conditionOf } from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { buyUsed, canBuyUsed, canSellMachine, salePrice, sellMachine } from '../src/engine/market.js';
import { migrateSave } from '../src/engine/save.js';

assert.equal(SALESMAN_RELATIONSHIP_MIN, 0);
assert.equal(SALESMAN_RELATIONSHIP_MAX, 100);
assert.equal(SALESMAN_RELATIONSHIP_START, 50);
assert.equal(SALESMAN_BUY_RELATIONSHIP, 6);
assert.equal(SALESMAN_SELL_RELATIONSHIP, 3);
assert.equal(USED_LISTING_COUNT, 3);
assert.equal(USED_CONDITION_MIN, 45);
assert.equal(USED_CONDITION_MAX, 88);
assert.equal(USED_PRICE_FRACTION, 0.55);
assert.equal(USED_RELATIONSHIP_DISCOUNT_PER_POINT, 0.003);
assert.equal(USED_DELIVERY_DAYS, 3);
assert.equal(SALE_DAYS, 4);
assert.equal(SALE_PRICE_FRACTION, 0.4);
assert.deepEqual(SHED_TABS, ['yard', 'buy']);

const start = createInitialState();
assert.equal(start.salesmanRelationship, SALESMAN_RELATIONSHIP_START);
assert.equal(start.usedListings.length, USED_LISTING_COUNT);
assert.deepEqual(start.pendingDeliveries, []);
assert.deepEqual(start.activeSales, []);
assert.equal(canSellMachine(start, STARTING_MACHINE_ID).ok, false);
assert.match(canSellMachine(start, STARTING_MACHINE_ID).reason, /Keep at least one/);

const listing = [...start.usedListings].sort((a, b) => a.price - b.price)[0];
assert.ok(listing);
assert.ok(listing.condition >= USED_CONDITION_MIN);
assert.ok(listing.condition <= USED_CONDITION_MAX);
assert.equal(canBuyUsed(start, listing.id).ok, true);

const bought = reducer(start, { type: 'BUY_USED', listingId: listing.id });
assert.equal(bought.capitalBudget, start.capitalBudget - listing.price);
assert.equal(bought.salesmanRelationship, SALESMAN_RELATIONSHIP_START + SALESMAN_BUY_RELATIONSHIP);
assert.equal(bought.usedListings.length, USED_LISTING_COUNT - 1);
assert.equal(bought.pendingDeliveries.length, 1);
assert.equal(bought.pendingDeliveries[0].machineId, listing.machineId);
assert.equal(bought.pendingDeliveries[0].arrivesDay, start.day + USED_DELIVERY_DAYS);
assert.equal(bought.ownedMachines.includes(listing.machineId), false);
assert.equal(canBuyUsed(bought, listing.id).ok, false);

const engineBuy = buyUsed(start, listing.id);
assert.equal(engineBuy.capitalBudget, bought.capitalBudget);
assert.equal(engineBuy.pendingDeliveries[0].machineId, listing.machineId);

let delivered = bought;
for (let i = 0; i < USED_DELIVERY_DAYS; i += 1) {
  delivered = reducer(delivered, { type: 'END_DAY' });
}
assert.equal(delivered.day, start.day + USED_DELIVERY_DAYS);
assert.equal(delivered.pendingDeliveries.length, 0);
assert.ok(delivered.ownedMachines.includes(listing.machineId));
assert.equal(conditionOf(delivered, listing.machineId), listing.condition);
assert.ok(delivered.ownedMachines.includes(STARTING_MACHINE_ID));
assert.equal(canSellMachine(delivered, STARTING_MACHINE_ID).ok, false);
assert.equal(canSellMachine(delivered, listing.machineId).ok, true);

const proceeds = salePrice(delivered, listing.machineId);
const sold = reducer(delivered, { type: 'SELL_MACHINE', machineId: listing.machineId });
assert.equal(sold.ownedMachines.includes(listing.machineId), false);
assert.ok(sold.ownedMachines.includes(STARTING_MACHINE_ID));
assert.equal(sold.salesmanRelationship, delivered.salesmanRelationship + SALESMAN_SELL_RELATIONSHIP);
assert.equal(sold.activeSales.length, 1);
assert.equal(sold.activeSales[0].price, proceeds);
assert.equal(sold.activeSales[0].dueDay, delivered.day + SALE_DAYS);
assert.equal(sold.capitalBudget, delivered.capitalBudget);

const engineSell = sellMachine(delivered, listing.machineId);
assert.equal(engineSell.activeSales[0].price, sold.activeSales[0].price);

let paid = sold;
for (let i = 0; i < SALE_DAYS; i += 1) {
  paid = reducer(paid, { type: 'END_DAY' });
}
assert.equal(paid.day, sold.day + SALE_DAYS);
assert.equal(paid.activeSales.length, 0);
assert.equal(paid.capitalBudget, sold.capitalBudget + proceeds);

const broke = canBuyUsed({ ...start, capitalBudget: 0 }, listing.id);
assert.equal(broke.ok, false);
assert.match(broke.reason, /Needs/);

const last = canSellMachine({ ...delivered, ownedMachines: [listing.machineId] }, listing.machineId);
assert.equal(last.ok, false);

const migrated = migrateSave({
  day: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
  ownedMachines: [STARTING_MACHINE_ID],
});
assert.equal(migrated.salesmanRelationship, SALESMAN_RELATIONSHIP_START);
assert.deepEqual(migrated.usedListings, []);
assert.deepEqual(migrated.pendingDeliveries, []);
assert.deepEqual(migrated.activeSales, []);

const marketSrc = readFileSync(new URL('../src/engine/market.js', import.meta.url), 'utf8');
const gameSrc = readFileSync(new URL('../src/engine/gameState.js', import.meta.url), 'utf8');
const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(marketSrc, /export function canBuyUsed/);
assert.match(marketSrc, /export function buyUsed/);
assert.match(marketSrc, /export function canSellMachine/);
assert.match(marketSrc, /export function sellMachine/);
assert.match(gameSrc, /case 'BUY_USED'/);
assert.match(gameSrc, /case 'SELL_MACHINE'/);
assert.match(appSrc, /BUY_USED/);
assert.match(appSrc, /SELL_MACHINE/);
assert.match(shedSrc, /salesmanRelationship/);
assert.match(shedSrc, /usedListings/);
assert.match(shedSrc, /pendingDeliveries/);
assert.match(shedSrc, /activeSales/);
assert.match(shedSrc, /onBuyUsed/);
assert.match(shedSrc, /onSell/);
assert.match(shedSrc, /SHED_TAB_BUY/);
assert.doesNotMatch(shedSrc, /SHED_TAB_USED/);

console.log('GATE E1 PASS new game has 3 used listings and relationship 50');
console.log('GATE E2 PASS buyUsed spends capital, queues delivery, bumps relationship');
console.log(`GATE E3 PASS after ${USED_DELIVERY_DAYS} mornings the used machine is owned at listing condition`);
console.log('GATE E4 PASS cannot sell the last machine; selling a second unit pays capital on dueDay');
console.log('GATE E5 PASS canBuyUsed / buyUsed / canSellMachine / sellMachine live in the engine');
console.log('GATE E6 PASS Shed Buy tab shows relationship, listings, pending deliveries and sales');
console.log('round 4 phase E checks passed');
