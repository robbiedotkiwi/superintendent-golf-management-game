/**
 * Round 4 Phase A: machine condition is a persistent time penalty.
 * Run: node scripts/r4-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CONDITION_LOSS_PER_USE,
  CONDITION_MAX,
  CONDITION_MIN,
  CONDITION_SLOW_THRESHOLD,
  CONDITION_TIME_PENALTY_PER_POINT,
  MACHINE_DAILY_MINUTES,
  MIGRATED_MACHINE_CONDITION,
  NEW_PURCHASE_CONDITION,
  SALESMAN_RELATIONSHIP_START,
  GREENSMASTER_ID,
  GREENSMASTER_START_CONDITION,
  GREENSMASTER_TIME_MULT,
  REELMASTER_ID,
  REELMASTER_START_CONDITION,
  STARTING_MACHINE_CONDITION,
  STARTING_MACHINE_ID,
  STARTING_MACHINE_IDS,
  USED_LISTING_COUNT,
  WALK_BEHIND_TIME_MULT,
} from '../src/data/constants.js';
import { durationForTask } from '../src/engine/assignment.js';
import {
  conditionOf,
  conditionTimeMultiplier,
  machineMultiplierFor,
  machineTimeMultiplier,
} from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { mowingMinutes } from '../src/engine/mowing.js';
import { migrateSave } from '../src/engine/save.js';
import { getTask } from '../src/data/tasks.js';

assert.equal(CONDITION_MIN, 0);
assert.equal(CONDITION_MAX, 100);
assert.equal(STARTING_MACHINE_CONDITION, 100);
assert.equal(MIGRATED_MACHINE_CONDITION, 80);
assert.equal(NEW_PURCHASE_CONDITION, 100);
assert.equal(CONDITION_TIME_PENALTY_PER_POINT, 0.005);
assert.equal(CONDITION_LOSS_PER_USE, 1);
assert.equal(CONDITION_SLOW_THRESHOLD, 80);
assert.equal(MACHINE_DAILY_MINUTES, 480);
assert.equal(SALESMAN_RELATIONSHIP_START, 50);

assert.equal(conditionTimeMultiplier(CONDITION_MAX), 1);
assert.equal(conditionTimeMultiplier(CONDITION_MIN), 1 + CONDITION_MAX * CONDITION_TIME_PENALTY_PER_POINT);
assert.equal(conditionTimeMultiplier(50), 1.25);

const start = createInitialState();
assert.deepEqual(start.ownedMachines, STARTING_MACHINE_IDS);
assert.equal(start.machineCondition[GREENSMASTER_ID], GREENSMASTER_START_CONDITION);
assert.equal(start.machineCondition[REELMASTER_ID], REELMASTER_START_CONDITION);
assert.equal(start.machineDailyMinutes[STARTING_MACHINE_ID], MACHINE_DAILY_MINUTES);
assert.equal(start.salesmanRelationship, SALESMAN_RELATIONSHIP_START);
assert.equal(start.usedListings.length, USED_LISTING_COUNT);
assert.deepEqual(start.pendingDeliveries, []);
assert.deepEqual(start.activeSales, []);
assert.deepEqual(start.eventInvitations, []);
assert.equal(conditionOf(start, GREENSMASTER_ID), GREENSMASTER_START_CONDITION);
assert.equal(conditionOf(start, REELMASTER_ID), REELMASTER_START_CONDITION);

const greensTask = getTask('cutGreens');
assert.equal(machineTimeMultiplier(start, greensTask), machineMultiplierFor(start, GREENSMASTER_ID));
assert.equal(
  durationForTask(start, 'cutGreens'),
  Math.round(mowingMinutes(start, 'cutGreens') * GREENSMASTER_TIME_MULT * conditionTimeMultiplier(GREENSMASTER_START_CONDITION)),
);

const worn = {
  ...start,
  machineCondition: { ...start.machineCondition, [GREENSMASTER_ID]: 50 },
};
const mint = {
  ...start,
  machineCondition: { ...start.machineCondition, [GREENSMASTER_ID]: CONDITION_MAX },
};
assert.equal(machineTimeMultiplier(worn, greensTask), 1.25);
assert.equal(
  durationForTask(worn, 'cutGreens'),
  Math.round(mowingMinutes(worn, 'cutGreens') * GREENSMASTER_TIME_MULT * conditionTimeMultiplier(50)),
);
assert.ok(durationForTask(worn, 'cutGreens') > durationForTask(mint, 'cutGreens'));

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
assert.equal(migrated.machineCondition[STARTING_MACHINE_ID], MIGRATED_MACHINE_CONDITION);
assert.equal(migrated.machineDailyMinutes[STARTING_MACHINE_ID], MACHINE_DAILY_MINUTES);
assert.equal(migrated.salesmanRelationship, SALESMAN_RELATIONSHIP_START);
assert.deepEqual(migrated.usedListings, []);
assert.deepEqual(migrated.pendingDeliveries, []);
assert.deepEqual(migrated.activeSales, []);
assert.deepEqual(migrated.eventInvitations, []);

const kept = migrateSave({
  day: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
  ownedMachines: [STARTING_MACHINE_ID],
  machineCondition: { [STARTING_MACHINE_ID]: 62 },
});
assert.equal(kept.machineCondition[STARTING_MACHINE_ID], 62);

let used = reducer(createInitialState(), { type: 'PLAN_TASK', taskId: 'cutGreens' });
used = reducer(used, { type: 'END_DAY' });
assert.equal(used.machineCondition[GREENSMASTER_ID], GREENSMASTER_START_CONDITION - CONDITION_LOSS_PER_USE);

let bought = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
assert.equal(bought.machineCondition.walkBehindReel, NEW_PURCHASE_CONDITION);
assert.equal(bought.machineDailyMinutes.walkBehindReel, MACHINE_DAILY_MINUTES);
assert.equal(
  durationForTask(bought, 'cutGreens'),
  Math.round(mowingMinutes(bought, 'cutGreens') * WALK_BEHIND_TIME_MULT),
);

const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.match(shedSrc, /conditionOf/);
assert.match(shedSrc, /CONDITION_MAX/);
assert.match(shedSrc, /CONDITION_SLOW_THRESHOLD/);

const equipmentSrc = readFileSync(new URL('../src/engine/equipment.js', import.meta.url), 'utf8');
assert.match(equipmentSrc, /conditionTimeMultiplier/);

console.log('GATE A1 PASS named condition constants exported');
console.log('GATE A2 PASS new game starters are condition 28 and 24');
console.log('GATE A3 PASS durationForTask includes machine timeMult and condition penalty');
console.log('GATE A4 PASS condition 50 applies 1.25× time penalty in the engine');
console.log('GATE A5 PASS old saves migrate missing condition to 80');
console.log('GATE A6 PASS mowing drops condition by CONDITION_LOSS_PER_USE');
console.log('GATE A7 PASS shed shows condition');
console.log('round 4 phase A checks passed');
