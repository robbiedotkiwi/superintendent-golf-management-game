/**
 * Round 3 Phase F: persist section, tab, speed, skip and presets across reload.
 * Run: node scripts/r3-phase-f-check.mjs
 */
import assert from 'node:assert/strict';
import {
  CREW_TAB_HIRE,
  OFFICE_TAB_MONEY,
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SHED_TAB_DEFAULT,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { defaultSectionTabs, normalizeSection, normalizeTabs } from '../src/engine/section.js';

const start = createInitialState();
assert.equal(start.section, SECTION_MAP);
assert.deepEqual(start.tabs, defaultSectionTabs());
assert.equal(start.playoutSpeed, 1);
assert.equal(start.skipPlayout, false);

const old = migrateSave({
  day: 9,
  surfaces: {
    greens: { quality: 55 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(old.section, SECTION_MAP);
assert.deepEqual(old.tabs, defaultSectionTabs());
assert.equal(old.playoutSpeed, 1);
assert.equal(old.skipPlayout, false);

let state = { ...start, sectionUnlocks: { crew: true, office: true } };
state = reducer(state, { type: 'SET_SECTION', section: SECTION_OFFICE });
state = reducer(state, { type: 'SET_TAB', section: SECTION_OFFICE, tab: OFFICE_TAB_MONEY });
state = reducer(state, { type: 'SET_TAB', section: SECTION_CREW, tab: CREW_TAB_HIRE });
state = reducer(state, { type: 'SET_PLAYOUT_SPEED', speed: 4 });
state = reducer(state, { type: 'SET_SKIP_PLAYOUT', value: true });

const roundTrip = migrateSave(JSON.parse(JSON.stringify({
  ...state,
  customPresets: [{ id: 1, name: 'Open', surface: 'greens', hoc: 2.8 }],
  nextPresetId: 2,
})));
assert.equal(roundTrip.section, SECTION_OFFICE);
assert.equal(roundTrip.tabs[SECTION_OFFICE], OFFICE_TAB_MONEY);
assert.equal(roundTrip.tabs[SECTION_CREW], CREW_TAB_HIRE);
assert.equal(roundTrip.tabs.shed, SHED_TAB_DEFAULT);
assert.equal(roundTrip.playoutSpeed, 4);
assert.equal(roundTrip.skipPlayout, true);
assert.equal(roundTrip.customPresets, undefined);
assert.equal(roundTrip.nextPresetId, undefined);

assert.equal(normalizeSection('nope'), SECTION_MAP);
assert.equal(normalizeTabs({ office: 'nope' }).office, defaultSectionTabs().office);

const afterDay = reducer(state, { type: 'END_DAY' });
assert.equal(afterDay.section, SECTION_OFFICE);
assert.equal(afterDay.playoutSpeed, 4);

console.log('round 3 phase F checks passed');
