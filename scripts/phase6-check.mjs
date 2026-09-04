/**
 * Headless checks for Phase 6 spray, fertiliser and disease gates.
 * Run: node scripts/phase6-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAYS_PER_SEASON,
  DISEASE_OUTBREAK_DAILY,
  DISEASE_OUTBREAK_DROP,
  DISEASE_OUTBREAK_THRESHOLD,
  FERTILISER_CEILING_BONUS,
  FERTILISER_MATERIALS_COST,
  PLAYER_ID,
  SPRAY_MATERIALS_COST,
  SPRAY_SUPPRESS_DAYS,
  STARTING_DISEASE_PRESSURE,
  STARTING_MAINTENANCE_BUDGET,
  STARTING_QUALITY_GREENS,
  STARTING_WEATHER,
  TRAINING_DAYS,
  WEATHER_RAIN,
} from '../src/data/constants.js';
import { TASKS } from '../src/data/tasks.js';
import { surfaceCeiling } from '../src/engine/equipment.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { decayAmount, clampQuality } from '../src/engine/simulation.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: extras.weather ?? STARTING_WEATHER,
    season: extras.season ?? state.season,
    workers: applyWeatherToWorkers(next.workers, extras.weather ?? STARTING_WEATHER),
  };
}

function certify(state) {
  let next = reducer(state, { type: 'TRAIN_WORKER', workerId: PLAYER_ID, axis: 'spray' });
  for (let i = 0; i < TRAINING_DAYS; i += 1) {
    next = endKeep(next);
  }
  return next;
}

const afterGrace = { day: DAYS_PER_SEASON + 1, season: 'summer' };

const start = createInitialState();
assert.equal(start.workers.find((worker) => worker.id === PLAYER_ID).sprayCertified, false);
assert.equal(canPlanTask(start, 'sprayGreens').ok, false);
assert.match(canPlanTask(start, 'sprayGreens').reason, /spray-certified/);
assert.equal(canPlanTask(start, 'fertiliseGreens').ok, false);
assert.ok(TASKS.some((task) => task.id === 'sprayGreens' && task.requiresSpray));
assert.ok(TASKS.some((task) => task.id === 'fertiliseGreens' && task.requiresSpray));

const certified = certify(createInitialState());
const you = certified.workers.find((worker) => worker.id === PLAYER_ID);
assert.equal(you.sprayCertified, true);
assert.equal(canPlanTask(certified, 'sprayGreens').ok, true);
assert.equal(canPlanTask(certified, 'fertiliseGreens').ok, true);

assert.equal(start.disease.greens.pressure, STARTING_DISEASE_PRESSURE);
assert.equal(start.disease.tees.pressure, STARTING_DISEASE_PRESSURE);
assert.equal(start.disease.fairways.pressure, STARTING_DISEASE_PRESSURE);
assert.equal(start.disease.rough.pressure, STARTING_DISEASE_PRESSURE);

let wet = {
  ...createInitialState(),
  ...afterGrace,
  weather: WEATHER_RAIN,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
for (let i = 0; i < 5; i += 1) {
  wet = endKeep(wet, { season: 'summer', weather: WEATHER_RAIN });
}
assert.ok(wet.disease.greens.pressure > wet.disease.tees.pressure);
assert.ok(wet.disease.greens.pressure > wet.disease.fairways.pressure);
assert.equal(wet.disease.rough.pressure, STARTING_DISEASE_PRESSURE);
assert.equal(wet.disease.rough.outbreak, false);
assert.ok(wet.disease.greens.pressure >= DISEASE_OUTBREAK_THRESHOLD);

const outbreakStart = {
  ...createInitialState(),
  ...afterGrace,
  season: 'winter',
  weather: STARTING_WEATHER,
  disease: {
    ...createInitialState().disease,
    greens: { pressure: DISEASE_OUTBREAK_THRESHOLD, outbreak: false },
  },
};
const afterOutbreak = endKeep(outbreakStart, { season: 'winter' });
assert.equal(afterOutbreak.disease.greens.outbreak, true);
assert.ok(STARTING_QUALITY_GREENS - meanQuality(afterOutbreak, 'greens') >= DISEASE_OUTBREAK_DROP);
const outbreakSummary = afterOutbreak.log.at(-1);
assert.ok(outbreakSummary.outbreaks.some((item) => item.surface === 'greens' && item.drop === DISEASE_OUTBREAK_DROP));

const ongoingStart = {
  ...outbreakStart,
  disease: {
    ...createInitialState().disease,
    greens: { pressure: DISEASE_OUTBREAK_THRESHOLD, outbreak: true },
  },
};
const afterOngoing = endKeep(ongoingStart, { season: 'winter' });
const expectedOngoing = clampQuality(
  STARTING_QUALITY_GREENS - decayAmount(STARTING_QUALITY_GREENS, 'winter') - DISEASE_OUTBREAK_DAILY,
);
assert.equal(meanQuality(afterOngoing, 'greens'), expectedOngoing);

let sprayed = certify(createInitialState());
sprayed = {
  ...sprayed,
  ...afterGrace,
  disease: {
    ...sprayed.disease,
    greens: { pressure: DISEASE_OUTBREAK_THRESHOLD, outbreak: true },
  },
};
sprayed = reducer(sprayed, { type: 'PLAN_TASK', taskId: 'sprayGreens' });
const maintBeforeSpray = sprayed.maintenanceBudget;
const afterSpray = endKeep(sprayed);
assert.equal(afterSpray.disease.greens.outbreak, false);
assert.equal(afterSpray.disease.greens.pressure, STARTING_DISEASE_PRESSURE);
assert.equal(afterSpray.maintenanceBudget, maintBeforeSpray - SPRAY_MATERIALS_COST);
assert.equal(afterSpray.log.at(-1).materialsSpent, SPRAY_MATERIALS_COST);

let suppressed = {
  ...afterSpray,
  season: 'summer',
  weather: WEATHER_RAIN,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
for (let i = 0; i < SPRAY_SUPPRESS_DAYS - 1; i += 1) {
  suppressed = endKeep(suppressed, { season: 'summer', weather: WEATHER_RAIN });
  assert.equal(suppressed.disease.greens.pressure, STARTING_DISEASE_PRESSURE);
}
suppressed = endKeep(suppressed, { season: 'summer', weather: WEATHER_RAIN });
assert.ok(suppressed.disease.greens.pressure > STARTING_DISEASE_PRESSURE);

let fed = certify(createInitialState());
const greensCeiling = surfaceCeiling(fed, 'greens');
fed = reducer(fed, { type: 'PLAN_TASK', taskId: 'fertiliseGreens' });
const maintBeforeFert = fed.maintenanceBudget;
fed = endKeep(fed);
assert.equal(surfaceCeiling(fed, 'greens'), greensCeiling + FERTILISER_CEILING_BONUS);
assert.equal(fed.maintenanceBudget, maintBeforeFert - FERTILISER_MATERIALS_COST);
while (fed.day < fed.fertiliserUntil.greens) {
  fed = endKeep(fed);
}
assert.equal(surfaceCeiling(fed, 'greens'), greensCeiling);

console.log('phase6 checks passed');
