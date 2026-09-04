/**
 * Fixes Round 2 Phase H gates.
 * Run: node scripts/fix-phase-h-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GREENS_SENSORS_COST,
  HAND_WATER_MINUTES_PER_GREEN,
  MOISTURE_BAND,
  MOISTURE_CHECK_MINUTES,
  MOISTURE_DATA_FRESH_DAYS,
  MOISTURE_HIDDEN,
  MOISTURE_START,
  PLAYER_SPEED_SKILL,
  SPEED_SKILL_BASE,
  SPEED_SKILL_STEP,
  STARTING_WEATHER,
  TURFRAD_COST,
  WET_DISEASE_MULT,
  WET_GAIN_MULT,
} from '../src/data/constants.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { irrigationDemand } from '../src/engine/irrigation.js';
import { migrateSave } from '../src/engine/save.js';
import {
  dryingFactorForGreen,
  greensStatuses,
  handWaterMinutes,
  isAboveBand,
  moistureStatus,
} from '../src/engine/moisture.js';
import { pressureGain } from '../src/engine/disease.js';

const start = createInitialState();
assert.equal(moistureStatus(start, 'greens').kind, 'hidden');
assert.equal(moistureStatus(start, 'tees').kind, 'hidden');
assert.equal(moistureStatus(start, 'fairways').kind, 'hidden');
assert.equal(moistureStatus(start, 'greens').value, MOISTURE_HIDDEN);
assert.ok(greensStatuses(start).every((item) => item.kind === 'hidden'));

assert.equal(MOISTURE_CHECK_MINUTES.greens, 40);
assert.equal(canPlanTask(start, 'checkMoistureGreens').ok, true);
let checked = reducer(start, { type: 'PLAN_TASK', taskId: 'checkMoistureGreens' });
checked = reducer(checked, { type: 'END_DAY' });
const greens = greensStatuses(checked);
assert.equal(greens.length, 9);
assert.ok(greens.every((item) => item.kind === 'fresh' && item.value != null));
checked = reducer(checked, { type: 'END_DAY' });
assert.equal(MOISTURE_DATA_FRESH_DAYS, 2);
assert.ok(greensStatuses(checked).every((item) => item.kind === 'stale'));

const sensors = reducer({ ...createInitialState(), cash: 250000 }, { type: 'BUY_GREENS_SENSORS' });
assert.equal(sensors.hasGreensSensors, true);
assert.equal(sensors.cash, 250000 - GREENS_SENSORS_COST);
assert.equal(moistureStatus(sensors, 'greens').kind, 'fresh');
assert.equal(moistureStatus(sensors, 'tees').kind, 'hidden');
assert.equal(moistureStatus(sensors, 'fairways').kind, 'hidden');

let rad = reducer({ ...createInitialState(), cash: 250000 }, { type: 'BUY_TURFRAD' });
assert.equal(rad.hasTurfRad, true);
assert.equal(rad.cash, 250000 - TURFRAD_COST);
rad = reducer(rad, { type: 'PLAN_TASK', taskId: 'cutFairways' });
rad = reducer(rad, { type: 'END_DAY' });
assert.equal(moistureStatus(rad, 'fairways').kind, 'fresh');
assert.equal(moistureStatus(rad, 'tees').kind, 'hidden');
for (let i = 0; i < 3; i += 1) {
  rad = {
    ...reducer(rad, { type: 'END_DAY' }),
    weather: STARTING_WEATHER,
  };
}
assert.equal(moistureStatus(rad, 'fairways').kind, 'stale');

let live = reducer({ ...createInitialState(), cash: 250000 }, { type: 'BUY_GREENS_SENSORS' });
live = reducer(live, { type: 'SET_IRRIGATION', surface: 'greens', mm: 4 });
for (let i = 0; i < 4; i += 1) {
  live = reducer(live, { type: 'END_DAY' });
}
const values = live.moisture.greens;
assert.ok(Math.max(...values) - Math.min(...values) > 1, `greens did not diverge: ${values}`);
assert.notEqual(dryingFactorForGreen(0), dryingFactorForGreen(2));

const wetState = {
  ...createInitialState(),
  day: 31,
  season: 'summer',
  year: 1,
  moisture: {
    greens: Array.from({ length: 9 }, () => MOISTURE_BAND.greens.max + 8),
    tees: MOISTURE_BAND.tees.max + 8,
    fairways: MOISTURE_BAND.fairways.max + 8,
  },
};
assert.equal(isAboveBand(wetState.moisture, 'greens'), true);
const dryState = { ...createInitialState(), day: 31, season: 'summer', year: 1 };
assert.ok(pressureGain(wetState, 'greens') > pressureGain(dryState, 'greens'));
assert.equal(pressureGain(wetState, 'greens') / pressureGain(dryState, 'greens'), WET_DISEASE_MULT);
assert.equal(WET_GAIN_MULT, 0.85);
const pondWet = irrigationDemand({
  ...wetState,
  season: 'summer',
  irrigation: { greens: 4, tees: 4, fairways: 3 },
});
assert.ok(pondWet.total > 0);

let three = reducer(createInitialState(), { type: 'SET_HAND_WATER_TARGETS', targets: [1, 4, 9] });
assert.equal(handWaterMinutes(three), HAND_WATER_MINUTES_PER_GREEN * 3);
three = reducer(three, { type: 'PLAN_TASK', taskId: 'handWater' });
const playerTimeMult = SPEED_SKILL_BASE - PLAYER_SPEED_SKILL * SPEED_SKILL_STEP;
assert.equal(three.plannedTasks[0].minutes, Math.round(HAND_WATER_MINUTES_PER_GREEN * 3 * playerTimeMult));
assert.deepEqual(three.plannedTasks[0].greens, [1, 4, 9]);

const irrigationSrc = readFileSync(new URL('../src/engine/irrigation.js', import.meta.url), 'utf8');
assert.doesNotMatch(irrigationSrc, /summerUnderwaterDecay/);
assert.doesNotMatch(irrigationSrc, /watered/);
const simSrc = readFileSync(new URL('../src/engine/simulation.js', import.meta.url), 'utf8');
assert.match(simSrc, /droughtDecay/);
assert.match(simSrc, /tickMoisture/);
assert.doesNotMatch(simSrc, /summerUnderwaterDecay/);

const old = migrateSave({
  day: 4,
  cash: 12,
  surfaces: { greens: { quality: 40 }, tees: { quality: 40 }, fairways: { quality: 40 }, rough: { quality: 40 }, bunkers: { quality: 40 } },
});
assert.equal(old.moisture.greens.length, 9);
assert.equal(old.moisture.tees, MOISTURE_START.tees);
assert.equal(moistureStatus(old, 'greens').kind, 'hidden');
assert.equal(old.hasGreensSensors, false);
assert.equal(old.hasTurfRad, false);

const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turf, /MoistureLine/);
const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /onToggleMoistureOverlay/);
const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /moisture-hatch/);
assert.match(map, /MoistureOverlayShape/);

console.log('fix phase H checks passed');
