#!/usr/bin/env node
/**
 * Round 9 Phase D: Inputs two-column status.
 * Run: node scripts/r9-phase-d-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DISEASE_OUTBREAK_WARN, FERTILISER_DAYS, INPUTS_SURFACES, SPRAY_SUPPRESS_DAYS } from '../src/data/constants.js';
import { createInitialState } from '../src/engine/gameState.js';
import { holeSurface, mapHoleSurfaces } from '../src/engine/holes.js';
import { inputsStatus } from '../src/engine/inputsStatus.js';
import { approachingOutbreak } from '../src/engine/disease.js';

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /function InputsSurface/);
assert.match(turfSrc, /function InputsStatus/);
assert.match(turfSrc, /data-inputs-status/);
assert.match(turfSrc, /approaching outbreak/);
assert.equal((turfSrc.match(/data-inputs-surface/g) || []).length, 1);

const start = createInitialState();
for (const surface of INPUTS_SURFACES) {
  const status = inputsStatus(start, surface);
  assert.equal(status.approaching, false);
  assert.equal(status.fertCovered.length, 0);
  assert.equal(status.sprayCovered.length, 0);
  assert.equal(status.fertOpen.length, 9);
  assert.equal(status.partialFert, false);
}

const warned = {
  ...start,
  holes: mapHoleSurfaces(start.holes, 'greens', (record) => ({
    ...record,
    diseasePressure: DISEASE_OUTBREAK_WARN,
  })),
};
assert.equal(approachingOutbreak(DISEASE_OUTBREAK_WARN), true);
assert.equal(inputsStatus(warned, 'greens').approaching, true);
assert.match(JSON.stringify(inputsStatus(warned, 'greens')), /approaching/);

let partial = {
  ...start,
  day: 10,
  holes: mapHoleSurfaces(start.holes, 'greens', (record, hole) =>
    hole.id <= 3
      ? { ...record, fertiliserUntil: 10 + FERTILISER_DAYS, sprayedUntil: 10 + SPRAY_SUPPRESS_DAYS }
      : record,
  ),
};
const split = inputsStatus(partial, 'greens');
assert.deepEqual(split.fertCovered, [1, 2, 3]);
assert.deepEqual(split.fertOpen, [4, 5, 6, 7, 8, 9]);
assert.equal(split.partialFert, true);
assert.deepEqual(split.sprayCovered, [1, 2, 3]);
assert.equal(split.partialSpray, true);
assert.equal(holeSurface(partial, 1, 'greens').fertiliserUntil, 10 + FERTILISER_DAYS);

console.log('r9-phase-d-check: ok');
