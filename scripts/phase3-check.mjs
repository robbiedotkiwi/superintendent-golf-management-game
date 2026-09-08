/**
 * Headless checks for Phase 3 equipment gates.
 * Run: node scripts/phase3-check.mjs
 */
import assert from 'node:assert/strict';
import {
  FOLEY_GRIND_MINUTES,
  GREENSMASTER_ID,
  GRIND_AWAY_DAYS,
  REPAIR_MINUTES,
  STARTING_WEATHER,
  AUTONOMOUS_ID,
  PREMIUM_REEL_ID,
  VENTRAC_ID,
  WALK_BEHIND_COST,
  WALK_BEHIND_ID,
  WALK_BEHIND_TIME_MULT,
  WEAR_PER_USE,
  WEAR_THRESHOLD,
  JOB_SETUP_MINUTES,
} from '../src/data/constants.js';
import { getTask } from '../src/data/tasks.js';
import { durationForTask } from '../src/engine/assignment.js';
import {
  canBuyMachine,
  ineligibleMachines,
  isMachineAvailable,
  machineMultiplierFor,
  pickMachine,
  surfaceCeiling,
  wearMultiplier,
} from '../src/engine/equipment.js';
import {
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { mowingMinutes } from '../src/engine/mowing.js';
import { variableJobMinutes } from '../src/engine/jobs.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


function plan(state, taskId) {
  return reducer(state, { type: 'PLAN_TASK', taskId });
}

function end(state) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: STARTING_WEATHER,
    workers: applyWeatherToWorkers(next.workers, STARTING_WEATHER),
  };
}

const start = createInitialState();
const baseTime = durationForTask(start, 'cutGreens');
assert.equal(
  baseTime,
  Math.round(JOB_SETUP_MINUTES.green + variableJobMinutes(start, 'cutGreens') * machineMultiplierFor(start, GREENSMASTER_ID)),
);
assert.equal(pickMachine(start, getTask('cutGreens'))?.id, GREENSMASTER_ID);

let bought = reducer(start, { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
assert.equal(bought.cash, start.cash - WALK_BEHIND_COST);
assert.equal(
  durationForTask(bought, 'cutGreens'),
  Math.round(JOB_SETUP_MINUTES.green + variableJobMinutes(bought, 'cutGreens') * WALK_BEHIND_TIME_MULT),
);
assert.ok(durationForTask(bought, 'cutGreens') < baseTime);

const withVentrac = reducer({ ...createInitialState(), cash: 250000 }, { type: 'BUY_MACHINE', machineId: VENTRAC_ID });
assert.ok(withVentrac.ownedMachines.includes(VENTRAC_ID));
const blocked = ineligibleMachines(withVentrac, getTask('cutGreens'));
assert.ok(blocked.some((item) => item.machine.id === VENTRAC_ID));
assert.match(blocked[0].reason, /damage/i);
assert.equal(pickMachine(withVentrac, getTask('cutGreens'))?.id, GREENSMASTER_ID);

const startCeiling = surfaceCeiling(createInitialState(), 'greens');
assert.ok(startCeiling > 0);
let capped = reducer(createInitialState(), { type: 'SET_AUTO_ROTATE', surface: 'greens', value: true });
for (let i = 0; i < 10; i += 1) {
  capped = plan(capped, 'cutGreens');
  capped = end(capped);
}
assert.equal(meanQuality(capped, 'greens'), surfaceCeiling(capped, 'greens'));

let worn = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
worn = plan(worn, 'cutGreens');
worn = end(worn);
assert.equal(worn.machineWear[WALK_BEHIND_ID], WEAR_PER_USE);

assert.equal(wearMultiplier({ machineWear: { [WALK_BEHIND_ID]: 0 } }, WALK_BEHIND_ID), 1);
assert.ok(wearMultiplier({ machineWear: { [WALK_BEHIND_ID]: WEAR_THRESHOLD + 1 } }, WALK_BEHIND_ID) < 1);

let dull = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
const sharpStart = meanQuality(dull, 'greens');
dull.machineWear = { ...dull.machineWear, [WALK_BEHIND_ID]: 0 };
let sharp = plan({ ...dull }, 'cutGreens');
sharp = end(sharp);
const sharpGain = meanQuality(sharp, 'greens') - sharpStart;

dull.machineWear = { ...dull.machineWear, [WALK_BEHIND_ID]: WEAR_THRESHOLD + 1 };
let blunt = plan({ ...dull }, 'cutGreens');
blunt = end(blunt);
const bluntGain = meanQuality(blunt, 'greens') - sharpStart;
assert.ok(bluntGain < sharpGain);

let away = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
away = reducer(away, { type: 'SEND_GRIND', machineId: WALK_BEHIND_ID });
assert.equal(away.machineAwayUntil[WALK_BEHIND_ID], away.day + GRIND_AWAY_DAYS);
assert.equal(isMachineAvailable(away, WALK_BEHIND_ID), false);
away = end(away);
assert.equal(isMachineAvailable(away, WALK_BEHIND_ID), false);
away = end(away);
assert.equal(isMachineAvailable(away, WALK_BEHIND_ID), true);

let foley = { ...createInitialState(), cash: 250000 };
foley = reducer(foley, { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
foley = reducer(foley, { type: 'BUY_FOLEY' });
foley.machineWear = { ...foley.machineWear, [WALK_BEHIND_ID]: 80 };
foley = reducer(foley, { type: 'GRIND_IN_HOUSE', machineId: WALK_BEHIND_ID });
assert.equal(foley.machineWear[WALK_BEHIND_ID], 0);
assert.equal(foley.workers[0].minutesUsed, FOLEY_GRIND_MINUTES);

let broken = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: WALK_BEHIND_ID });
broken.machineBroken = { ...broken.machineBroken, [WALK_BEHIND_ID]: true };
assert.equal(isMachineAvailable(broken, WALK_BEHIND_ID), false);
broken = reducer(broken, { type: 'REPAIR_MACHINE', machineId: WALK_BEHIND_ID });
assert.equal(broken.machineBroken[WALK_BEHIND_ID], false);
assert.equal(broken.workers[0].minutesUsed, REPAIR_MINUTES);

let auto = { ...createInitialState(), cash: 250000, weather: STARTING_WEATHER };
auto = reducer(auto, { type: 'BUY_MACHINE', machineId: AUTONOMOUS_ID });
assert.ok(auto.ownedMachines.includes(AUTONOMOUS_ID));
auto.autoWeek = { weekStart: auto.day, hits: [{ day: auto.day, minutes: 450 }] };
auto = plan(auto, 'cutGreens');
auto = plan(auto, 'cutTees');
const last = auto.plannedTasks[auto.plannedTasks.length - 1];
const resolved = reducer(auto, { type: 'END_DAY' });
assert.ok(resolved.log.at(-1).interruptions > 0);
assert.ok(resolved.log.at(-1).dropped.some((item) => item.taskId === last.taskId));

const richCheck = canBuyMachine(createInitialState(), PREMIUM_REEL_ID);
assert.equal(richCheck.ok, false);
assert.match(richCheck.reason, /Needs/);

assert.ok(combinedMinutesRemaining(createInitialState()) > 0);

console.log('phase3 checks passed');
