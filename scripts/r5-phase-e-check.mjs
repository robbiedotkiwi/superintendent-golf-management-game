/**
 * Round 5 Phase E: new-player grace period.
 * Run: node scripts/r5-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAYS_PER_SEASON,
  GRACE_FINE_DAYS,
  GRACE_NO_BREAKDOWN_DAYS,
  GRACE_NO_DISEASE_SEASON,
  GRACE_NO_STORM_DAYS,
  STARTING_DISEASE_PRESSURE,
  WEATHER_FINE,
  WEATHER_HEAVY_RAIN,
  WEATHER_STORM,
} from '../src/data/constants.js';
import { inDiseaseGrace, seasonNumberFromDay } from '../src/engine/calendar.js';
import { pressureGain, resolveDisease } from '../src/engine/disease.js';
import { rollBreakdowns } from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { createRng } from '../src/engine/rng.js';
import { applyWeatherGrace, makeWeatherQueue, rollTrueDay } from '../src/engine/weather.js';

assert.equal(GRACE_FINE_DAYS, 5);
assert.equal(GRACE_NO_STORM_DAYS, 10);
assert.equal(GRACE_NO_BREAKDOWN_DAYS, 10);
assert.equal(GRACE_NO_DISEASE_SEASON, 1);
assert.equal(seasonNumberFromDay(1), 1);
assert.equal(seasonNumberFromDay(30), 1);
assert.equal(seasonNumberFromDay(31), 2);
assert.equal(inDiseaseGrace(DAYS_PER_SEASON), true);
assert.equal(inDiseaseGrace(DAYS_PER_SEASON + 1), false);

assert.equal(applyWeatherGrace(WEATHER_STORM, 1), WEATHER_FINE);
assert.equal(applyWeatherGrace(WEATHER_HEAVY_RAIN, 5), WEATHER_FINE);
assert.equal(applyWeatherGrace(WEATHER_STORM, 10), 'overcast');
assert.equal(applyWeatherGrace(WEATHER_STORM, 11), WEATHER_STORM);

for (let seed = 1; seed <= 400; seed += 1) {
  const rng = createRng(seed);
  for (let day = 1; day <= GRACE_FINE_DAYS; day += 1) {
    assert.equal(rollTrueDay('summer', rng, day).type, WEATHER_FINE);
  }
  for (let day = GRACE_FINE_DAYS + 1; day <= GRACE_NO_STORM_DAYS; day += 1) {
    const type = rollTrueDay('summer', rng, day).type;
    assert.notEqual(type, WEATHER_STORM, `seed ${seed} day ${day}`);
    assert.notEqual(type, WEATHER_HEAVY_RAIN, `seed ${seed} day ${day}`);
  }
}

let sawStorm = false;
for (let seed = 1; seed <= 4000 && !sawStorm; seed += 1) {
  const type = rollTrueDay('summer', createRng(seed), 11).type;
  if (type === WEATHER_STORM || type === WEATHER_HEAVY_RAIN) sawStorm = true;
}
assert.ok(sawStorm, 'day 11 can roll storm or heavy rain');

const start = createInitialState();
assert.equal(start.weather, WEATHER_FINE);
assert.equal(pressureGain(start, 'greens'), 0);
for (const [index, item] of start.forecastStrip.entries()) {
  const day = start.day + 1 + index;
  if (day <= GRACE_FINE_DAYS) assert.equal(item.type, WEATHER_FINE, `forecast slot ${index} day ${day}`);
  if (day <= GRACE_NO_STORM_DAYS) {
    assert.notEqual(item.type, WEATHER_STORM);
    assert.notEqual(item.type, WEATHER_HEAVY_RAIN);
  }
}

let walked = start;
while (walked.day <= GRACE_NO_STORM_DAYS) {
  if (walked.day <= GRACE_FINE_DAYS) assert.equal(walked.weather, WEATHER_FINE, `day ${walked.day} fine`);
  assert.notEqual(walked.weather, WEATHER_STORM, `day ${walked.day} storm`);
  assert.notEqual(walked.weather, WEATHER_HEAVY_RAIN, `day ${walked.day} heavy`);
  for (const [index, item] of (walked.forecastStrip ?? []).entries()) {
    const day = walked.day + 1 + index;
    if (day <= GRACE_FINE_DAYS) assert.equal(item.type, WEATHER_FINE);
    if (day <= GRACE_NO_STORM_DAYS) {
      assert.notEqual(item.type, WEATHER_STORM, `day ${walked.day} forecast ${day}`);
      assert.notEqual(item.type, WEATHER_HEAVY_RAIN, `day ${walked.day} forecast ${day}`);
    }
  }
  const disease = resolveDisease(walked).disease;
  for (const surface of Object.keys(disease)) {
    assert.equal(disease[surface].pressure, STARTING_DISEASE_PRESSURE);
    assert.equal(disease[surface].outbreak, false);
  }
  walked = reducer(walked, { type: 'END_DAY' });
}
assert.equal(walked.day, GRACE_NO_STORM_DAYS + 1);

while (walked.day <= DAYS_PER_SEASON) {
  const disease = resolveDisease(walked).disease;
  assert.equal(disease.greens.pressure, STARTING_DISEASE_PRESSURE);
  walked = reducer(walked, { type: 'END_DAY' });
}
assert.equal(walked.day, DAYS_PER_SEASON + 1);
assert.equal(walked.season, 'summer');
const afterFirstSeason = resolveDisease(walked).disease;
assert.ok(afterFirstSeason.greens.pressure > STARTING_DISEASE_PRESSURE, 'season 2 begins accruing');

const always = { next: () => 0 };
const day10 = rollBreakdowns(
  { day: GRACE_NO_BREAKDOWN_DAYS, machineBroken: {}, machineWear: { pushRotary: 100 } },
  ['pushRotary'],
  always,
);
assert.deepEqual(day10.breakdowns, []);
const day11 = rollBreakdowns(
  { day: GRACE_NO_BREAKDOWN_DAYS + 1, machineBroken: {}, machineWear: { pushRotary: 100 } },
  ['pushRotary'],
  always,
);
assert.deepEqual(day11.breakdowns, ['pushRotary']);

const queue = makeWeatherQueue(1, createRng(7));
for (const [index, item] of queue.entries()) {
  const day = 2 + index;
  if (day <= GRACE_FINE_DAYS) assert.equal(item.type, WEATHER_FINE);
  if (day <= GRACE_NO_STORM_DAYS) {
    assert.notEqual(item.type, WEATHER_STORM);
    assert.notEqual(item.type, WEATHER_HEAVY_RAIN);
  }
}

console.log('GATE E1 PASS days 1-5 are always Fine');
console.log('GATE E2 PASS no storm or heavy rain before day 11');
console.log('GATE E3 PASS no breakdown before day 11');
console.log('GATE E4 PASS disease stays at zero in season 1 and accrues in season 2');
console.log('GATE E5 PASS forecast never shows weather grace will prevent');
console.log('GATE E6 PASS day 11 can storm and machines can break');
console.log('round 5 phase E checks passed');
