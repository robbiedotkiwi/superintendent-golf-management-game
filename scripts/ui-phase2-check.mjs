/**
 * UI Phase 2: surface fills stay in the palette and remain distinguishable.
 * Run: node scripts/ui-phase2-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paint, sand, soil, turf, turfStressed } from '../src/data/constants.js';
import {
  healthyFill,
  inPaletteRange,
  luminance,
  surfaceFill,
} from '../src/engine/color.js';

const PALETTE = [turf, turfStressed, paint, soil, sand];
const TURF_SURFACES = ['greens', 'tees', 'fairways', 'rough'];

for (const surface of TURF_SURFACES) {
  for (const quality of [0, 10, 50, 100]) {
    const hex = surfaceFill(surface, quality);
    assert.notEqual(hex.toLowerCase(), '#000000', `${surface} @${quality} is not black`);
    assert.ok(inPaletteRange(hex, PALETTE), `${surface} @${quality} ${hex} in palette`);
    assert.ok(luminance(hex) > 20, `${surface} @${quality} not near-black`);
  }
  assert.notEqual(surfaceFill(surface, 10), surfaceFill(surface, 100));
}

assert.equal(surfaceFill('bunkers', 100).toLowerCase(), sand.toLowerCase());
assert.ok(inPaletteRange(surfaceFill('bunkers', 0), PALETTE));
assert.ok(inPaletteRange(surfaceFill('bunkers', 50), PALETTE));
assert.notEqual(surfaceFill('bunkers', 10), surfaceFill('bunkers', 100));

const healthy = {
  greens: luminance(healthyFill('greens')),
  tees: luminance(healthyFill('tees')),
  fairways: luminance(healthyFill('fairways')),
  rough: luminance(healthyFill('rough')),
};
assert.ok(healthy.greens > healthy.tees, 'greens lighter than tees');
assert.ok(healthy.tees > healthy.fairways, 'tees lighter than fairways');
assert.ok(healthy.fairways > healthy.rough, 'fairways lighter than rough');

const map = readFileSync(new URL('../src/components/CourseMap.jsx', import.meta.url), 'utf8');
assert.match(map, /<rect/);
assert.match(map, /surfaceFill\('bunkers'/);
assert.match(map, /greenOutline/);

console.log('ui phase2 checks passed');
