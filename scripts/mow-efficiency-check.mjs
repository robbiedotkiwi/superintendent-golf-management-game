/**
 * Mowing efficiency: speed 1–5 is 50–70%, condition ±10%, autonomous 90% base.
 * Run: node scripts/mow-efficiency-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AUTONOMOUS_ID,
  AUTONOMOUS_MOW_EFFICIENCY,
  CONDITION_MAX,
  CONDITION_MIN,
  GREENSMASTER_ID,
  GREENSMASTER_START_CONDITION,
  GREENSMASTER_TIME_MULT,
  REELMASTER_ID,
  MOW_CONDITION_EFFICIENCY_AT_0,
  MOW_CONDITION_EFFICIENCY_AT_100,
  MOW_SPEED_EFFICIENCY_AT_1,
  MOW_SPEED_EFFICIENCY_AT_5,
  PLAYER_SPEED_SKILL,
  SPEED_SKILL_BASE,
  SPEED_SKILL_STEP,
} from '../src/data/constants.js';
import { mowingOperatorTimeMultiplier, mowingSpeedEfficiency } from '../src/engine/assignment.js';
import {
  conditionTimeMultiplier,
  durationOnMachine,
  machineMultiplierFor,
  mowConditionEfficiency,
  mowConditionTimeMultiplier,
} from '../src/engine/equipment.js';
import { createInitialState } from '../src/engine/gameState.js';
import { setupMinutesFor, variableJobMinutes } from '../src/engine/jobs.js';
import { workerTimeMultiplier } from '../src/engine/skills.js';

assert.equal(MOW_SPEED_EFFICIENCY_AT_1, 0.5);
assert.equal(MOW_SPEED_EFFICIENCY_AT_5, 0.7);
assert.equal(mowingSpeedEfficiency(1), 0.5);
assert.equal(mowingSpeedEfficiency(2), 0.55);
assert.equal(mowingSpeedEfficiency(3), 0.6);
assert.equal(mowingSpeedEfficiency(4), 0.65);
assert.equal(mowingSpeedEfficiency(5), 0.7);
assert.equal(mowingSpeedEfficiency(PLAYER_SPEED_SKILL), 0.6);

assert.equal(MOW_CONDITION_EFFICIENCY_AT_0, 0.9);
assert.equal(MOW_CONDITION_EFFICIENCY_AT_100, 1.1);
assert.equal(mowConditionEfficiency(CONDITION_MIN), 0.9);
assert.equal(mowConditionEfficiency(50), 1);
assert.equal(mowConditionEfficiency(CONDITION_MAX), 1.1);
assert.equal(mowConditionTimeMultiplier(50), 1);
assert.equal(AUTONOMOUS_MOW_EFFICIENCY, 0.9);
assert.equal(mowingOperatorTimeMultiplier(null, { autonomous: true }), 1 / AUTONOMOUS_MOW_EFFICIENCY);

const start = createInitialState();
const player = start.workers[0];
const slow = { ...player, id: 'slow', speedSkill: 1, morale: 100 };
const fast = { ...player, id: 'fast', speedSkill: 5, morale: 100 };

function expectedMow(state, taskId, worker, holes) {
  const surface = taskId === 'cutFairways' ? 'fairways' : 'greens';
  const holeCount = holes?.length ?? 9;
  const machineId = surface === 'fairways' ? REELMASTER_ID : GREENSMASTER_ID;
  return Math.round(
    setupMinutesFor(surface, holeCount) +
      variableJobMinutes(state, taskId, holes) *
        machineMultiplierFor(state, machineId, surface) *
        mowingOperatorTimeMultiplier(worker),
  );
}

assert.equal(durationOnMachine(start, 'cutGreens'), expectedMow(start, 'cutGreens'));
assert.equal(durationOnMachine(start, 'cutGreens', player), expectedMow(start, 'cutGreens', player));
assert.equal(durationOnMachine(start, 'cutGreens', player), durationOnMachine(start, 'cutGreens'));
assert.equal(
  machineMultiplierFor(start, GREENSMASTER_ID),
  GREENSMASTER_TIME_MULT * mowConditionTimeMultiplier(GREENSMASTER_START_CONDITION),
);

const mint = {
  ...start,
  machineCondition: { ...start.machineCondition, [GREENSMASTER_ID]: CONDITION_MAX },
};
const wrecked = {
  ...start,
  machineCondition: { ...start.machineCondition, [GREENSMASTER_ID]: CONDITION_MIN },
};
assert.ok(durationOnMachine(wrecked, 'cutGreens', player) > durationOnMachine(mint, 'cutGreens', player));
assert.ok(durationOnMachine(start, 'cutGreens', slow) > durationOnMachine(start, 'cutGreens', player));
assert.ok(durationOnMachine(start, 'cutGreens', fast) < durationOnMachine(start, 'cutGreens', player));

const rollSetup = setupMinutesFor('greens', 9);
const rollVar = variableJobMinutes(start, 'rollGreens');
assert.equal(
  durationOnMachine(start, 'rollGreens', slow),
  Math.round(rollSetup + rollVar * workerTimeMultiplier(slow)),
);
assert.equal(
  durationOnMachine(start, 'rollGreens', fast),
  Math.round(rollSetup + rollVar * workerTimeMultiplier(fast)),
);
const cupsSetup = setupMinutesFor('greens', 9);
const cupsVar = variableJobMinutes(start, 'changeCups');
assert.equal(
  durationOnMachine(start, 'changeCups', fast),
  Math.round(cupsSetup + cupsVar * workerTimeMultiplier(fast)),
);
assert.notEqual(
  durationOnMachine(start, 'changeCups', fast),
  Math.round(cupsSetup + cupsVar * mowingOperatorTimeMultiplier(fast)),
);
assert.equal(workerTimeMultiplier(player), SPEED_SKILL_BASE - PLAYER_SPEED_SKILL * SPEED_SKILL_STEP);
assert.ok(conditionTimeMultiplier(CONDITION_MIN) > mowConditionTimeMultiplier(CONDITION_MIN));

const autoWithPlayer = durationOnMachine(start, 'cutFairways', player, AUTONOMOUS_ID);
const autoSolo = durationOnMachine(start, 'cutFairways', null, AUTONOMOUS_ID);
assert.equal(autoWithPlayer, autoSolo);
assert.equal(
  autoSolo,
  Math.round(
    setupMinutesFor('fairways', 9) +
      variableJobMinutes(start, 'cutFairways') *
        machineMultiplierFor(start, AUTONOMOUS_ID, 'fairways') *
        mowingOperatorTimeMultiplier(null, { autonomous: true }),
  ),
);
assert.ok(mowingOperatorTimeMultiplier(null, { autonomous: true }) < mowingOperatorTimeMultiplier(player));

const oneMin = durationOnMachine(start, 'cutGreens', player, undefined, [1]);
const nineMin = durationOnMachine(start, 'cutGreens', player);
console.log(`ONE_GREEN=${oneMin} NINE_GREENS=${nineMin}`);
console.log(
  `SPEED1=${durationOnMachine(start, 'cutGreens', slow)} SPEED3=${nineMin} SPEED5=${durationOnMachine(start, 'cutGreens', fast)}`,
);
console.log(
  `COND0=${durationOnMachine(wrecked, 'cutGreens', player)} COND28=${nineMin} COND100=${durationOnMachine(mint, 'cutGreens', player)}`,
);

const crewSrc = readFileSync(new URL('../src/components/Crew.jsx', import.meta.url), 'utf8');
assert.match(crewSrc, /mowSpeedLabel/);
const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.match(shedSrc, /mowConditionEfficiency/);

console.log('GATE M1 PASS speed 1/5 mow at 50%/70% and player speed 3 at 60%');
console.log('GATE M2 PASS mower condition 0/100 is −10%/+10% and 50% is even');
console.log('GATE M3 PASS autonomous operator time is 1/0.9');
console.log('GATE M4 PASS roll/cups keep the old speed formula');
console.log('GATE M5 PASS omitted-worker mow duration matches the player');
console.log('mow efficiency checks passed');
