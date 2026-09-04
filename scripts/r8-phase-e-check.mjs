#!/usr/bin/env node
/**
 * Round 8 Phase E: GM walk-in and progressive unlocks.
 * Run: node scripts/r8-phase-e-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  FUEL_LOW_FRACTION,
  FUEL_TANK_CAPACITY,
  GM_UNLOCK_CREW_DAY,
  GM_UNLOCK_OFFICE_DAY,
  SATISFACTION_MOVE_POINTS,
  SATISFACTION_START,
  SECTION_CREW,
  SECTION_OFFICE,
  VOLUNTEER_DAY,
} from '../src/data/constants.js';
import {
  GM_MESSAGE_IDS,
  GM_MESSAGES,
  GM_MSG_DAY1,
  GM_MSG_DAY3,
  GM_MSG_DAY7,
  GM_TRIGGER_BREAKDOWN,
  GM_TRIGGER_CASH,
  GM_TRIGGER_FUEL,
  GM_TRIGGER_OVERDUE,
  GM_TRIGGER_RAIN,
  GM_TRIGGER_SAT,
  tickGm,
} from '../src/engine/gm.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { WEATHER_RAIN } from '../src/data/constants.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(GM_UNLOCK_CREW_DAY, 3);
assert.equal(GM_UNLOCK_CREW_DAY, VOLUNTEER_DAY);
assert.equal(GM_UNLOCK_OFFICE_DAY, 7);
assert.equal(FUEL_LOW_FRACTION, 0.25);
assert.equal(SATISFACTION_MOVE_POINTS, 10);

const start = createInitialState();
assert.equal(start.tutorialDone, true);
assert.deepEqual(start.sectionUnlocks, { crew: false, office: false });
assert.deepEqual(start.gmQueue, [GM_MSG_DAY1]);
assert.equal(reducer(start, { type: 'SET_SECTION', section: SECTION_CREW }).section, start.section);
assert.equal(reducer(start, { type: 'SET_SECTION', section: SECTION_CREW }).lockHint, SECTION_CREW);
assert.equal(reducer(start, { type: 'SET_SECTION', section: SECTION_OFFICE }).lockHint, SECTION_OFFICE);

let day = start;
while (day.day < GM_UNLOCK_CREW_DAY) day = reducer(day, { type: 'END_DAY' });
assert.equal(day.day, 3);
assert.equal(day.sectionUnlocks.crew, true);
assert.equal(day.sectionUnlocks.office, false);
assert.ok(day.gmSeen[GM_MSG_DAY3]);

while (day.day < GM_UNLOCK_OFFICE_DAY) day = reducer(day, { type: 'END_DAY' });
assert.equal(day.day, 7);
assert.equal(day.sectionUnlocks.office, true);
assert.ok(day.gmSeen[GM_MSG_DAY7]);

const clean = { ...start, gmQueue: [], gmSeen: {}, sectionUnlocks: { crew: true, office: true } };
const rain = tickGm({ ...clean, weather: WEATHER_RAIN });
assert.ok(rain.gmSeen[GM_TRIGGER_RAIN]);
assert.ok(tickGm(rain, {}).gmQueue.filter((id) => id === GM_TRIGGER_RAIN).length <= 1);

const fuel = tickGm({ ...clean, fuelLitres: FUEL_TANK_CAPACITY * FUEL_LOW_FRACTION - 1 });
assert.ok(fuel.gmSeen[GM_TRIGGER_FUEL]);
const fuelAgain = tickGm({ ...fuel, fuelLitres: 10 });
assert.equal(fuelAgain.gmQueue.filter((id) => id === GM_TRIGGER_FUEL).length, fuel.gmQueue.filter((id) => id === GM_TRIGGER_FUEL).length);

const overdue = tickGm({
  ...clean,
  day: 10,
  holes: start.holes.map((hole) => ({ ...hole, green: { ...hole.green, lastMownDay: 1 } })),
});
assert.ok(overdue.gmSeen[GM_TRIGGER_OVERDUE]);

const broke = tickGm(clean, { breakdowns: ['greensmaster'] });
assert.ok(broke.gmSeen[GM_TRIGGER_BREAKDOWN]);

const hired = reducer(start, { type: 'HIRE_WORKER', candidateId: start.candidates[0].id });
const wage = hired.workers.find((item) => item.id.startsWith('hire-')).wage;
const cash = tickGm({ ...hired, gmQueue: [], gmSeen: {}, cash: wage * 3, sectionUnlocks: { crew: true, office: true } });
assert.ok(cash.gmSeen[GM_TRIGGER_CASH]);

const sat = tickGm({ ...clean, satisfaction: SATISFACTION_START + SATISFACTION_MOVE_POINTS });
assert.ok(sat.gmSeen[GM_TRIGGER_SAT]);

for (const id of GM_MESSAGE_IDS) {
  assert.doesNotMatch(GM_MESSAGES[id].body, /click|button|tab the/i);
}

const old = migrateSave({
  day: 12,
  cash: 60000,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(old.tutorialDone, true);
assert.deepEqual(old.sectionUnlocks, { crew: true, office: true });
assert.deepEqual(old.gmQueue, []);
assert.equal(old.gmSeen[GM_MSG_DAY1], true);

const sidebar = read('src/components/Sidebar.jsx');
assert.match(sidebar, /LockIcon/);
assert.match(sidebar, /isSectionLocked/);
assert.match(sidebar, /GM_LOCK_HINT/);
const app = read('src/App.jsx');
assert.match(app, /<GmTalk/);
assert.match(app, /DISMISS_GM/);

console.log('r8-phase-e-check: ok');
