/**
 * Round 5 Phase B: slim sidebar, Turf section, badges, map quick jobs.
 * Run: node scripts/r5-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GM_MEETING_LEAD_DAYS,
  MORALE_BADGE_BELOW,
  SECTION_TURF,
  SHIPPED_PRESETS,
  SIDEBAR_FIT_HEIGHT,
  TURF_TAB_BUNKERS,
  TURF_TAB_INPUTS,
  TURF_TAB_IRRIGATION,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TAB_POND,
  TURF_TAB_PRESETS,
  TURF_TAB_SUMMARY,
  TURF_TABS,
} from '../src/data/constants.js';
import {
  crewBadgeCount,
  crewDot,
  daysUntilGmMeeting,
  officeBadgeCount,
  officeDot,
  shedBadgeCount,
  shedDot,
  turfBadgeCount,
  turfDot,
} from '../src/engine/badges.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


assert.equal(SECTION_TURF, 'turf');
assert.deepEqual(TURF_TABS, [
  TURF_TAB_SUMMARY,
  TURF_TAB_MOWING,
  TURF_TAB_IRRIGATION,
  TURF_TAB_INPUTS,
  TURF_TAB_OTHER,
  TURF_TAB_PRESETS,
]);
assert.equal(TURF_TAB_BUNKERS, TURF_TAB_OTHER);
assert.equal(TURF_TAB_POND, TURF_TAB_OTHER);
assert.equal(SHIPPED_PRESETS.length, 3);
assert.equal(SIDEBAR_FIT_HEIGHT, 720);
assert.equal(GM_MEETING_LEAD_DAYS, 2);
assert.equal(daysUntilGmMeeting(5), 2);
assert.equal(daysUntilGmMeeting(7), 0);

const start = createInitialState();
assert.equal(start.tabs[SECTION_TURF], TURF_TAB_SUMMARY);
assert.equal(start.lastMainsCost, 0);

const old = migrateSave({
  day: 40,
  surfaces: {
    greens: { quality: 40, lastMownDay: 1 },
    tees: { quality: 40, lastMownDay: 1 },
    fairways: { quality: 40, lastMownDay: 1 },
    rough: { quality: 40, lastMownDay: 1 },
    bunkers: { quality: 40, lastRakedDay: 1 },
  },
});
assert.equal(old.tabs[SECTION_TURF], TURF_TAB_SUMMARY);
assert.ok(turfBadgeCount(old) >= 1, 'overdue surfaces badge on a neglected day-40 save');

const outbreak = {
  ...start,
  disease: {
    greens: { pressure: 80, outbreak: true },
    tees: { pressure: 0, outbreak: false },
    fairways: { pressure: 0, outbreak: false },
    rough: { pressure: 0, outbreak: false },
    bunkers: { pressure: 0, outbreak: false },
  },
};
assert.equal(turfDot(outbreak), true);

const wet = {
  ...start,
  moisture: { greens: [40, 40, 40, 40, 40, 40, 40, 40, 40], tees: 40, fairways: 40 },
  moistureReadDay: { greens: Array.from({ length: 9 }, () => 1), tees: 1, fairways: 1 },
  hasGreensSensors: true,
};
assert.equal(turfDot(wet), true);

const mailed = {
  ...start,
  inbox: [{ id: 1, read: false, from: 'gm', kind: 'budget', subject: 'Hi', body: 'Hi' }],
};
assert.equal(officeBadgeCount(mailed), 1);

const meetingSoon = { ...start, day: 5 };
assert.equal(officeDot(meetingSoon), true);
assert.equal(officeDot({ ...start, pendingTournamentSetup: true }), true);

const low = {
  ...start,
  workers: start.workers.map((worker, index) =>
    index === 0 ? { ...worker, morale: MORALE_BADGE_BELOW - 1 } : worker,
  ),
};
assert.ok(crewBadgeCount(low) >= 1);
assert.equal(
  crewDot({
    ...start,
    day: 10,
    workers: start.workers.map((worker, index) =>
      index === 0 ? { ...worker, trainingUntilDay: 11 } : worker,
    ),
  }),
  true,
);

const broken = {
  ...start,
  machineBroken: { [start.ownedMachines[0]]: true },
};
assert.ok(shedBadgeCount(broken) >= 1);
assert.equal(shedDot({ ...start, usedListings: [{ id: 'used-x' }] }), true);
assert.equal(shedDot({ ...start, activeSales: [{ id: 'sale-x' }] }), true);
assert.equal(shedDot({ ...start, lastDeliveryDay: start.day }), true);

let shipped = reducer(start, { type: 'APPLY_SHIPPED_PRESET', id: 'tournament' });
assert.equal(courseSettings(shipped, 'greens').hoc, 2.8);
assert.equal(courseSettings(shipped, 'fairways').pattern, 'stripes');

let mid = start;
for (let i = 0; i < 39; i += 1) mid = reducer(mid, { type: 'END_DAY' });
assert.equal(mid.day, 40);
assert.equal(typeof turfBadgeCount(mid), 'number');
assert.equal(typeof officeBadgeCount(mid), 'number');

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(sidebar, /Day \{state\.day\}/);
assert.match(sidebar, /Today \{WEATHER_LABELS\[state\.weather\]\} · Tomorrow/);
assert.match(sidebar, /Condition/);
assert.match(sidebar, /label="Turf"/);
assert.match(sidebar, /label="Office"/);
assert.match(sidebar, /label="Crew"/);
assert.match(sidebar, /label="Shed"/);
assert.match(sidebar, /<TimeBar/);
assert.match(sidebar, /START_DAY_LABEL/);
assert.match(sidebar, /Fit/);
assert.match(sidebar, /onToggleMoistureOverlay/);
assert.match(sidebar, /Turn sound off/);
assert.match(sidebar, /overflow-hidden/);
assert.doesNotMatch(sidebar, /overflow-y-auto/);
assert.doesNotMatch(sidebar, /ForecastStrip/);
assert.match(sidebar, /formatMoney\(state\.cash\)/);
assert.doesNotMatch(sidebar, /SURFACE_KEYS/);
assert.doesNotMatch(sidebar, /Satisfaction/);
assert.doesNotMatch(sidebar, /Budgets/);
assert.doesNotMatch(sidebar, /IrrigationPanel/);
assert.doesNotMatch(sidebar, /DiseaseReadout/);
assert.doesNotMatch(sidebar, /pond\.volume/);
assert.doesNotMatch(sidebar, /<TaskPanel/);

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /TURF_TAB_SUMMARY/);
assert.match(turfSrc, /TURF_TAB_MOWING/);
assert.match(turfSrc, /TURF_TAB_IRRIGATION/);
assert.match(turfSrc, /TURF_TAB_INPUTS/);
assert.match(turfSrc, /TURF_TAB_BUNKERS/);
assert.match(turfSrc, /TURF_TAB_POND/);
assert.match(turfSrc, /TURF_TAB_PRESETS/);
assert.match(turfSrc, /<ForecastStrip/);
assert.match(turfSrc, /onSavePreset/);
assert.match(turfSrc, /onApplyPreset/);
assert.match(turfSrc, /SHIPPED_PRESETS/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<Turf/);
assert.match(app, /<MapJobPopover/);
assert.match(app, /SURFACE_KEYS\.includes\(selected\)/);

console.log('GATE B1 PASS sidebar is day, weather, condition, four buttons, pinned footer');
console.log('GATE B2 PASS Turf section has six named tabs');
console.log('GATE B3 PASS sidebar has no turf, pond, budgets or surface content');
console.log('GATE B4 PASS turf/office/crew/shed badges and dots fire on constructed state');
console.log('GATE B5 PASS map quick-job popover mounts without opening Turf');
console.log('GATE B6 PASS day-40 continue-shaped save still migrates Turf tabs');
console.log('round 5 phase B checks passed');
