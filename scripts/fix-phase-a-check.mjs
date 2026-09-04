/**
 * Fixes Round 2 Phase A gates.
 * Run: node scripts/fix-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE_GAIN,
  DAY_LENGTH_MINUTES,
  DEFAULT_DAY_OVERLOAD_MINUTES,
  HOC_RANGE,
  HOC_STRESS_DAMAGE,
  PATTERN_BLOCK,
  PATTERN_DIAMOND,
  PATTERN_STRIPES,
  PATTERN_TIME_MULT,
  PATTERN_WEAR_THRESHOLD,
  STARTING_WEATHER,
  TASK_MINUTES,
} from '../src/data/constants.js';
import { durationForTask } from '../src/engine/assignment.js';
import { surfaceCeiling } from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { hocFactor, inHocStressBand, mowingMinutes } from '../src/engine/mowing.js';
import { migrateSave } from '../src/engine/save.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const thisFile = fileURLToPath(import.meta.url);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'FIXES_ROUND_2.md') continue;
    const path = join(dir, name);
    if (path === thisFile) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.(js|jsx|mjs|md|css)$/.test(name)) files.push(path);
  }
  return files;
}

const leftover = [];
const banned = /Quick|Standard|Thorough|QUALITY_LEVELS|LEVEL_KEYS|usesQualityLevel|LEVEL_STANDARD|LEVEL_QUICK|LEVEL_THOROUGH|LEVEL_LABELS/;
for (const file of walk(repoRoot)) {
  const text = readFileSync(file, 'utf8');
  if (banned.test(text)) leftover.push(file.replace(repoRoot + '/', ''));
}
assert.deepEqual(leftover, [], leftover.join('\n'));

function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  const weather = extras.weather ?? STARTING_WEATHER;
  return {
    ...next,
    weather,
    season: extras.season ?? next.season,
    workers: applyWeatherToWorkers(next.workers, weather),
  };
}

const start = createInitialState();
assert.equal(courseSettings(start, 'greens').hoc, HOC_RANGE.greens.default);
assert.equal(courseSettings(start, 'tees').hoc, HOC_RANGE.tees.default);
assert.equal(courseSettings(start, 'fairways').hoc, HOC_RANGE.fairways.default);
assert.equal(courseSettings(start, 'rough').hoc, HOC_RANGE.rough.default);
assert.equal(courseSettings(start, 'greens').pattern, PATTERN_STRIPES);
assert.equal(courseSettings(start, 'fairways').pattern, PATTERN_BLOCK);
assert.equal(courseSettings(start, 'rough').pattern, PATTERN_BLOCK);

let lowered = reducer(start, { type: 'SET_HOC', surface: 'greens', hoc: HOC_RANGE.greens.min });
assert.equal(courseSettings(lowered, 'greens').hoc, HOC_RANGE.greens.min);
const roundTrip = migrateSave(JSON.parse(JSON.stringify(lowered)));
assert.equal(courseSettings(roundTrip, 'greens').hoc, HOC_RANGE.greens.min);
assert.equal(courseSettings(roundTrip, 'greens').pattern, PATTERN_STRIPES);
assert.equal(roundTrip.view.zoom, 1);

const old = migrateSave({
  day: 4,
  cash: 1111,
  surfaces: {
    greens: { quality: 41 },
    tees: { quality: 40 },
    fairways: { quality: 40 },
    rough: { quality: 40 },
    bunkers: { quality: 40 },
  },
});
assert.equal(courseSettings(old, 'greens').hoc, HOC_RANGE.greens.default);
assert.equal(courseSettings(old, 'greens').pattern, PATTERN_STRIPES);
assert.equal(old.view.panX, 0);
assert.equal(typeof holeSurface(old, 1, 'greens').moisture, 'number');

const defaultTime = mowingMinutes(start, 'cutGreens');
const defaultCeiling = surfaceCeiling(start, 'greens');
assert.ok(mowingMinutes(lowered, 'cutGreens') > defaultTime);
assert.ok(surfaceCeiling(lowered, 'greens') > defaultCeiling);

assert.equal(inHocStressBand('greens', HOC_RANGE.greens.default), false);
assert.equal(inHocStressBand('greens', HOC_RANGE.greens.min), true);
assert.ok(hocFactor('greens', HOC_RANGE.greens.min) > hocFactor('greens', HOC_RANGE.greens.default));

const off = { greens: 'off', tees: 'off', fairways: 'off' };
let high = { ...createInitialState(), season: 'summer', irrigation: off, weather: STARTING_WEATHER };
let low = reducer(
  { ...createInitialState(), season: 'summer', irrigation: off, weather: STARTING_WEATHER },
  { type: 'SET_HOC', surface: 'greens', hoc: HOC_RANGE.greens.min },
);
high = endKeep(high, { season: 'summer' });
low = endKeep(low, { season: 'summer' });
assert.equal(meanQuality(high, 'greens') - meanQuality(low, 'greens'), HOC_STRESS_DAMAGE);

const panel = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(panel, /inHocStressBand/);
assert.match(panel, /HOC_STRESS_DAMAGE/);
assert.doesNotMatch(panel, /LEVEL_KEYS|LEVEL_LABELS|usesQualityLevel/);

const diamond = reducer(start, { type: 'SET_PATTERN', surface: 'greens', pattern: PATTERN_DIAMOND });
const diamondTime = mowingMinutes(diamond, 'cutGreens');
assert.ok(Math.abs(diamondTime / defaultTime - PATTERN_TIME_MULT[PATTERN_DIAMOND]) < 0.05);

function cutGreensDays(seed, days) {
  let state = seed;
  for (let i = 0; i < days; i += 1) {
    state = reducer(state, { type: 'PLAN_TASK', taskId: 'cutGreens' });
    state = endKeep(state, { season: 'spring' });
  }
  return state;
}

const irrigated = {
  ...createInitialState(),
  irrigation: { greens: 'full', tees: 'full', fairways: 'full' },
  weather: STARTING_WEATHER,
};
const grain = cutGreensDays(irrigated, 8);
assert.ok(holeSurface(grain, 1, 'greens').patternWear > PATTERN_WEAR_THRESHOLD);

const rotated = cutGreensDays(
  reducer(irrigated, { type: 'SET_AUTO_ROTATE', surface: 'greens', value: true }),
  8,
);
assert.equal(holeSurface(rotated, 1, 'greens').patternWear, 0);
assert.ok(meanQuality(rotated, 'greens') > meanQuality(grain, 'greens'));

const player = start.workers[0];
const dayTotal = ['cutGreens', 'rollGreens', 'changeCups', 'cutTees', 'cutFairways', 'cutRough', 'rakeBunkers'].reduce(
  (sum, taskId) => sum + durationForTask(start, taskId, player),
  0,
);
assert.equal(dayTotal, DEFAULT_DAY_OVERLOAD_MINUTES);
assert.equal(BASE_GAIN, 6);

console.log('fix phase A checks passed');
