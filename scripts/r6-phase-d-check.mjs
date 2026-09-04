/**
 * Round 6 Phase D: manufacturer + model titles, one status line, Deliveries.
 * Run: node scripts/r6-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DELIVERIES_EMPTY_COPY,
  DELIVERIES_HEADING,
  DELIVERY_SOURCE_USED,
  GREENSMASTER_ID,
  HOURS_STARTER_GREENSMASTER,
  HOURS_STARTER_REELMASTER,
  MACHINE_BRAND_FOLEY,
  MACHINE_BRAND_NEXMOW,
  MACHINE_BRAND_SALSCO,
  MACHINE_BRAND_TORO,
  MACHINE_BRAND_VENTRAC,
  MACHINE_STATUS_BROKEN,
  MACHINE_STATUS_GRINDING,
  MACHINE_STATUS_NEW,
  MACHINE_STATUS_USED,
  REELMASTER_ID,
  USED_DELIVERY_DAYS,
} from '../src/data/constants.js';
import { MACHINES, getMachine } from '../src/data/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  deliveryDaysRemaining,
  machineStatusLine,
  machineTitle,
  machineTypeLine,
} from '../src/engine/machineDisplay.js';
import { migrateSave } from '../src/engine/save.js';

assert.equal(MACHINE_BRAND_TORO, 'Toro');
assert.equal(MACHINE_BRAND_VENTRAC, 'Ventrac');
assert.equal(MACHINE_BRAND_NEXMOW, 'Nexmow');
assert.equal(MACHINE_BRAND_SALSCO, 'Salsco');
assert.equal(MACHINE_BRAND_FOLEY, 'Foley');
assert.equal(DELIVERIES_HEADING, 'Deliveries');
assert.equal(DELIVERIES_EMPTY_COPY, 'Nothing is on order.');

for (const machine of MACHINES) {
  assert.ok(machine.manufacturer, `${machine.id} has a manufacturer`);
  assert.ok(machine.model, `${machine.id} has a model`);
  assert.ok(machine.type, `${machine.id} has a type`);
  const title = machineTitle(machine);
  assert.match(title, new RegExp(machine.manufacturer));
  assert.match(title, new RegExp(machine.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(title, /Used|New|Leased|Arriving|Broken|grinding/i);
  assert.equal(machineTypeLine(machine), machine.type);
}

assert.equal(machineTitle(getMachine(GREENSMASTER_ID)), 'Toro Greensmaster 1000');
assert.equal(machineTypeLine(getMachine(GREENSMASTER_ID)), 'walk-behind reel');

const start = createInitialState();
assert.equal(start.machineHours[GREENSMASTER_ID], HOURS_STARTER_GREENSMASTER);
assert.equal(start.machineHours[REELMASTER_ID], HOURS_STARTER_REELMASTER);
assert.equal(machineStatusLine(start, GREENSMASTER_ID), MACHINE_STATUS_USED(HOURS_STARTER_GREENSMASTER));
assert.equal(start.pendingDeliveries.length, 0);

const broken = { ...start, machineBroken: { [GREENSMASTER_ID]: true } };
assert.equal(machineStatusLine(broken, GREENSMASTER_ID), MACHINE_STATUS_BROKEN);
const grinding = { ...start, machineAwayUntil: { [GREENSMASTER_ID]: 12 } };
assert.equal(machineStatusLine(grinding, GREENSMASTER_ID), MACHINE_STATUS_GRINDING(12));

const listing = [...start.usedListings].sort((a, b) => a.price - b.price)[0];
assert.ok(listing);
assert.ok(Number.isInteger(listing.hours));
let ordered = reducer(start, { type: 'BUY_USED', listingId: listing.id });
assert.equal(ordered.pendingDeliveries.length, 1);
assert.equal(ordered.pendingDeliveries[0].source, DELIVERY_SOURCE_USED);
assert.equal(ordered.pendingDeliveries[0].arrivesDay, start.day + USED_DELIVERY_DAYS);
assert.equal(deliveryDaysRemaining(ordered, ordered.pendingDeliveries[0]), USED_DELIVERY_DAYS);
assert.equal(ordered.ownedMachines.includes(listing.machineId), false);

let arrived = ordered;
for (let i = 0; i < USED_DELIVERY_DAYS; i += 1) arrived = reducer(arrived, { type: 'END_DAY' });
assert.equal(arrived.pendingDeliveries.length, 0);
assert.ok(arrived.ownedMachines.includes(listing.machineId));
assert.equal(arrived.machineHours[listing.machineId], listing.hours);

const boughtNew = reducer(start, { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
assert.equal(machineStatusLine(boughtNew, 'walkBehindReel'), MACHINE_STATUS_NEW);

const migrated = migrateSave({
  day: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
  ownedMachines: [GREENSMASTER_ID],
});
assert.ok(Number.isInteger(migrated.machineHours[GREENSMASTER_ID]));

const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.match(shedSrc, /machineTitle/);
assert.match(shedSrc, /machineTypeLine/);
assert.match(shedSrc, /machineStatusLine/);
assert.match(shedSrc, /DELIVERIES_HEADING/);
assert.match(shedSrc, /DELIVERIES_EMPTY_COPY/);
assert.match(shedSrc, /pendingDeliveries/);
assert.doesNotMatch(shedSrc, /machine\.brand \? ` · \$\{machine\.brand\}`/);
assert.doesNotMatch(shedSrc, /Used \{entry/);

console.log('GATE D1 PASS every catalogue machine has manufacturer, model and type');
console.log('GATE D2 PASS titles are manufacturer + model with no status words');
console.log('GATE D3 PASS each owned machine has exactly one status line helper');
console.log('GATE D4 PASS Shed Yard lists Deliveries with arrival days and empty copy');
console.log('GATE D5 PASS a used order appears in Deliveries and leaves on arrival');
console.log('round 6 phase D checks passed');
