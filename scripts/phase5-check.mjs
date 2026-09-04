/**
 * Headless checks for Phase 5 irrigation and pond gates.
 * Run: node scripts/phase5-check.mjs
 */
import assert from 'node:assert/strict';
import {
  AERATOR_COST,
  DAYS_PER_SEASON,
  GROUNDWATER_M3,
  HAND_WATER_MINUTES,
  MAINS_COST_PER_M3,
  PLAYER_SPEED_SKILL,
  POND_CAPACITY,
  POND_HEALTH_LOW_DROP,
  POND_HEALTH_START,
  POND_LOW_FRACTION,
  POND_START_VOLUME,
  RAIN_POND_M3,
  SPEED_SKILL_BASE,
  SPEED_SKILL_STEP,
  STARTING_IRRIGATION,
  STARTING_QUALITY_GREENS,
  STARTING_WEATHER,
  SUMMER_UNDERWATER_DECAY,
  WEATHER_RAIN,
} from '../src/data/constants.js';
import { TASKS } from '../src/data/tasks.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { irrigationDemand, pondPercent, resolveIrrigation } from '../src/engine/irrigation.js';
import { clampQuality, decayAmount } from '../src/engine/simulation.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  const summary = next.log[next.log.length - 1];
  return {
    state: {
      ...next,
      weather: extras.weather ?? STARTING_WEATHER,
      season: extras.season ?? state.season,
      workers: applyWeatherToWorkers(next.workers, extras.weather ?? STARTING_WEATHER),
    },
    summary,
  };
}

const start = createInitialState();
assert.equal(start.pond.volume, POND_START_VOLUME);
assert.equal(start.pond.health, POND_HEALTH_START);
assert.deepEqual(start.irrigation, STARTING_IRRIGATION);
assert.equal(start.hasAerator, false);
assert.ok(TASKS.some((task) => task.id === 'handWater'));

let policy = reducer(start, { type: 'SET_IRRIGATION', surface: 'greens', policy: 'off' });
policy = reducer(policy, { type: 'SET_IRRIGATION', surface: 'fairways', policy: 'full' });
const afterPolicy = endKeep(policy, { season: 'spring' }).state;
assert.equal(afterPolicy.irrigation.greens, 'off');
assert.equal(afterPolicy.irrigation.fairways, 'full');
assert.equal(afterPolicy.irrigation.tees, STARTING_IRRIGATION.tees);

function volumeAfter(season, irrigation) {
  const state = {
    ...createInitialState(),
    season,
    weather: STARTING_WEATHER,
    irrigation,
    plannedTasks: [],
  };
  return resolveIrrigation(state).pond.volume;
}

const allFull = { greens: 'full', tees: 'full', fairways: 'full' };
const summerVol = volumeAfter('summer', allFull);
const winterVol = volumeAfter('winter', allFull);
assert.ok(summerVol < POND_START_VOLUME, 'pond drops overnight');
assert.ok(summerVol < winterVol, 'summer draw is heavier than winter');
const summerDemand = irrigationDemand({
  ...createInitialState(),
  season: 'summer',
  weather: STARTING_WEATHER,
  irrigation: allFull,
  plannedTasks: [],
}).total;
assert.equal(summerVol, POND_START_VOLUME - summerDemand + GROUNDWATER_M3);

const rainy = resolveIrrigation({
  ...createInitialState(),
  weather: WEATHER_RAIN,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  plannedTasks: [],
});
assert.equal(rainy.pond.volume, POND_START_VOLUME + GROUNDWATER_M3 + RAIN_POND_M3);

const dry = {
  ...createInitialState(),
  day: DAYS_PER_SEASON + 1,
  pond: { volume: 0, health: POND_HEALTH_START },
  irrigation: allFull,
  season: 'summer',
  weather: STARTING_WEATHER,
  plannedTasks: [],
};
const short = resolveIrrigation(dry);
assert.ok(short.shortfall > 0);
assert.equal(short.mainsCost, short.shortfall * MAINS_COST_PER_M3);
const dryEnded = reducer(dry, { type: 'END_DAY' });
const drySummary = dryEnded.log.at(-1);
assert.equal(drySummary.mainsCost, short.mainsCost);
assert.equal(drySummary.mainsM3, short.shortfall);
assert.equal(dryEnded.cash, dry.cash - short.mainsCost);

let offSummer = {
  ...createInitialState(),
  season: 'summer',
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
const greensStart = meanQuality(offSummer, 'greens');
assert.equal(greensStart, STARTING_QUALITY_GREENS);
for (let i = 0; i < 5; i += 1) {
  offSummer = endKeep(offSummer, { season: 'summer' }).state;
}
assert.ok(
  greensStart - meanQuality(offSummer, 'greens') >= SUMMER_UNDERWATER_DECAY.greens * 5,
  'summer off irrigation hammers greens within five days',
);

let watered = {
  ...createInitialState(),
  season: 'summer',
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
const hand = reducer(watered, { type: 'PLAN_TASK', taskId: 'handWater' });
const handTask = hand.plannedTasks.find((item) => item.taskId === 'handWater');
assert.ok(handTask);
const playerTimeMult = SPEED_SKILL_BASE - PLAYER_SPEED_SKILL * SPEED_SKILL_STEP;
assert.equal(handTask.minutes, Math.round(HAND_WATER_MINUTES * playerTimeMult));
const demand = irrigationDemand(hand);
assert.equal(demand.demand.greens, 0);
const afterHand = endKeep(hand, { season: 'summer' });
const expectedHandGreens = clampQuality(greensStart - decayAmount(greensStart, 'summer'));
assert.ok(Math.abs(meanQuality(afterHand.state, 'greens') - expectedHandGreens) < 1e-9);
const afterDryGreens = meanQuality(
  endKeep(
    {
      ...createInitialState(),
      season: 'summer',
      weather: STARTING_WEATHER,
      irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
    },
    { season: 'summer' },
  ).state,
  'greens',
);
assert.ok(afterDryGreens < expectedHandGreens);

const lowPond = {
  ...createInitialState(),
  season: 'winter',
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  pond: { volume: POND_CAPACITY * POND_LOW_FRACTION * 0.5, health: POND_HEALTH_START },
};
const lowAfter = resolveIrrigation(lowPond);
assert.equal(lowAfter.pond.health, POND_HEALTH_START - POND_HEALTH_LOW_DROP);

const bought = reducer(createInitialState(), { type: 'BUY_AERATOR' });
assert.equal(bought.hasAerator, true);
assert.equal(bought.cash, createInitialState().cash - AERATOR_COST);
const held = resolveIrrigation({
  ...bought,
  season: 'summer',
  weather: STARTING_WEATHER,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  pond: { volume: POND_CAPACITY * POND_LOW_FRACTION * 0.5, health: POND_HEALTH_START },
});
assert.equal(held.pond.health, POND_HEALTH_START);
assert.ok(pondPercent(POND_START_VOLUME) > 0);

console.log('phase5 checks passed');
