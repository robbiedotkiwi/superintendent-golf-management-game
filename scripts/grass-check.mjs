#!/usr/bin/env node
/**
 * Grass species, starting couch/kikuyu, and conversion projects.
 * Run: node scripts/grass-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  GRASS_CONVERSION_COST,
  GRASS_CONVERSION_DAYS,
  GRASS_CONVERSION_QUALITY_HIT,
  HOC_SURFACES,
  PROJECT_GRASS_CONVERSION,
  STARTING_QUALITY_GREENS,
} from '../src/data/constants.js';
import { GRASS_TYPES, STARTING_GRASS } from '../src/data/grass.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  grassGrowthFactor,
  grassIdFor,
  hocRangeFor,
  speciesAllowedOn,
} from '../src/engine/grass.js';
import { holeGrassLengthMm } from '../src/engine/mowingStatus.js';
import { canStartGrassConversion, grassConversionOptions, tickProjects } from '../src/engine/projects.js';
import { holeSurface, meanQuality } from '../src/engine/holes.js';

const start = createInitialState();
assert.deepEqual(start.grass, STARTING_GRASS);
assert.equal(grassIdFor(start, 'greens'), 'couch');
assert.equal(grassIdFor(start, 'tees'), 'kikuyu');
assert.equal(grassIdFor(start, 'fairways'), 'kikuyu');
assert.equal(grassIdFor(start, 'rough'), 'kikuyu');
assert.equal(GRASS_TYPES.length, 7);

for (const surface of HOC_SURFACES) {
  const range = hocRangeFor(start, surface);
  assert.equal(start.surfaceDefaults[surface].hoc, range.default);
  assert.ok(range.default >= range.min);
  assert.ok(range.default <= range.max);
}

assert.equal(speciesAllowedOn('creeping_bent', 'greens'), true);
assert.equal(speciesAllowedOn('creeping_bent', 'fairways'), false);
assert.equal(speciesAllowedOn('kikuyu', 'greens'), false);
assert.equal(speciesAllowedOn('kikuyu', 'rough'), true);
assert.equal(speciesAllowedOn('fescue', 'rough'), true);
assert.equal(speciesAllowedOn('fescue', 'greens'), false);

const greensOptions = grassConversionOptions(start, 'greens').map((item) => item.id);
assert.ok(greensOptions.includes('creeping_bent'));
assert.ok(greensOptions.includes('browntop_bent'));
assert.equal(greensOptions.includes('couch'), false);
assert.equal(greensOptions.includes('kikuyu'), false);

assert.equal(canStartGrassConversion(start, 'greens', 'couch').ok, false);
assert.equal(canStartGrassConversion(start, 'greens', 'kikuyu').ok, false);
assert.equal(canStartGrassConversion(start, 'greens', 'creeping_bent').ok, true);

const winter = { ...start, season: 'winter' };
assert.equal(grassGrowthFactor(winter, 'greens'), 0);
assert.equal(grassGrowthFactor(winter, 'rough'), 0);
assert.equal(grassGrowthFactor({ ...start, season: 'spring' }, 'greens'), 1);

const greenHoc = hocRangeFor(start, 'greens').default;
const grown = {
  ...winter,
  day: 5,
  holes: start.holes.map((hole) => ({
    ...hole,
    green: { ...hole.green, lastMownDay: 1, heightAtLastCut: greenHoc },
  })),
};
assert.equal(holeGrassLengthMm(grown, 'greens', holeSurface(grown, 1, 'greens')), greenHoc);

const funded = { ...start, cash: GRASS_CONVERSION_COST.greens + 1000 };
const converting = reducer(funded, {
  type: 'START_GRASS_CONVERSION',
  surface: 'greens',
  speciesId: 'creeping_bent',
});
assert.equal(converting.cash, funded.cash - GRASS_CONVERSION_COST.greens);
assert.equal(converting.projects[0].id, PROJECT_GRASS_CONVERSION);
assert.equal(converting.projects[0].surface, 'greens');
assert.equal(converting.projects[0].speciesId, 'creeping_bent');
assert.equal(converting.projects[0].dueDay, funded.day + GRASS_CONVERSION_DAYS.greens);
assert.equal(converting.grass.greens, 'couch');
assert.equal(canStartGrassConversion(converting, 'greens', 'poa_annua').ok, false);

const finished = tickProjects({ ...converting, day: converting.projects[0].dueDay });
assert.equal(finished.state.grass.greens, 'creeping_bent');
assert.equal(finished.state.grass.tees, 'kikuyu');
assert.equal(finished.state.projects.length, 0);
assert.ok(finished.state.surfaceDefaults.greens.hoc <= hocRangeFor(finished.state, 'greens').max);
assert.ok(finished.state.surfaceDefaults.greens.hoc >= hocRangeFor(finished.state, 'greens').min);
assert.equal(meanQuality(finished.state, 'greens'), STARTING_QUALITY_GREENS - GRASS_CONVERSION_QUALITY_HIT);

let ended = { ...converting, day: converting.projects[0].dueDay - 1 };
ended = reducer(ended, { type: 'END_DAY' });
assert.equal(ended.grass.greens, 'creeping_bent');
assert.equal(ended.projects.length, 0);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /Object\.values\(PROJECTS\)/);
assert.match(office, /START_GRASS_CONVERSION|onStartGrassConversion/);
const turf = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turf, /typicalCuts|cuts\/week/);

console.log('grass-check: ok');
