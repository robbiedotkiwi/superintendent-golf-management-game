/**
 * Round 6 Phase A: stacked sidebar buttons with descriptions.
 * Run: node scripts/r6-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SECTION_CREW_DESCRIPTION,
  SECTION_OFFICE_DESCRIPTION,
  SECTION_SHED_DESCRIPTION,
  SECTION_TURF_DESCRIPTION,
  SIDEBAR_FIT_HEIGHT,
  SIDEBAR_NAV_GAP,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { sectionBadge } from '../src/engine/badges.js';

assert.equal(SIDEBAR_FIT_HEIGHT, 720);
assert.equal(SIDEBAR_NAV_GAP, 8);
assert.equal(SECTION_TURF_DESCRIPTION, 'Surfaces, mowing, irrigation');
assert.equal(SECTION_OFFICE_DESCRIPTION, 'Mail, money, tournaments');
assert.equal(SECTION_CREW_DESCRIPTION, 'Roster, hiring, training');
assert.equal(SECTION_SHED_DESCRIPTION, 'Fleet, service, buying');

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /flex flex-col/);
assert.match(sidebar, /SIDEBAR_NAV_GAP/);
assert.doesNotMatch(sidebar, /grid-cols-2/);
assert.match(sidebar, /SECTION_TURF_DESCRIPTION/);
assert.match(sidebar, /SECTION_OFFICE_DESCRIPTION/);
assert.match(sidebar, /SECTION_CREW_DESCRIPTION/);
assert.match(sidebar, /SECTION_SHED_DESCRIPTION/);
assert.match(sidebar, /badge=\{turf\.count\}/);
assert.match(sidebar, /dot=\{turf\.dot\}/);
assert.match(sidebar, /badge=\{office\.count\}/);
assert.match(sidebar, /dot=\{office\.dot\}/);
assert.match(sidebar, /badge=\{crew\.count\}/);
assert.match(sidebar, /dot=\{crew\.dot\}/);
assert.match(sidebar, /badge=\{shed\.count\}/);
assert.match(sidebar, /dot=\{shed\.dot\}/);
assert.match(sidebar, /overflow-hidden/);
assert.doesNotMatch(sidebar, /overflow-y-auto/);
assert.match(sidebar, /w-full/);

const start = createInitialState();
let day40 = start;
for (let i = 0; i < 39; i += 1) day40 = reducer(day40, { type: 'END_DAY' });
assert.equal(day40.day, 40);
const migrated = migrateSave({
  day: 40,
  surfaces: {
    greens: { quality: 40, lastMownDay: 1 },
    tees: { quality: 40, lastMownDay: 1 },
    fairways: { quality: 40, lastMownDay: 1 },
    rough: { quality: 40, lastMownDay: 1 },
    bunkers: { quality: 40, lastRakedDay: 1 },
  },
});
assert.equal(migrated.day, 40);
assert.equal(typeof sectionBadge(day40, 'turf').count, 'number');
assert.equal(typeof sectionBadge(day40, 'office').count, 'number');
assert.equal(typeof sectionBadge(migrated, 'turf').count, 'number');

console.log('GATE A1 PASS four buttons stacked with SIDEBAR_NAV_GAP, not a 2x2 group');
console.log('GATE A2 PASS each block uses its named description constant');
console.log('GATE A3 PASS badge and dot props remain on all four blocks');
console.log('GATE A4 PASS overflow-hidden, no sidebar scroll; day-40 save still badges');
console.log('round 6 phase A checks passed');
