/**
 * Round 3 Phase C: Office, Crew and Shed have sub-tabs.
 * Run: node scripts/r3-phase-c-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CREW_TAB_DEFAULT,
  CREW_TAB_HIRE,
  CREW_TAB_ROSTER,
  CREW_TABS,
  OFFICE_TAB_DEFAULT,
  OFFICE_TAB_INBOX,
  OFFICE_TAB_MONEY,
  OFFICE_TAB_PROJECTS,
  OFFICE_TABS,
  SHED_TAB_BUY,
  SHED_TAB_DEFAULT,
  SHED_TAB_YARD,
  SHED_TABS,
} from '../src/data/constants.js';

assert.deepEqual(OFFICE_TABS, [OFFICE_TAB_INBOX, OFFICE_TAB_MONEY, OFFICE_TAB_PROJECTS]);
assert.equal(OFFICE_TAB_DEFAULT, OFFICE_TAB_INBOX);
assert.deepEqual(CREW_TABS, [CREW_TAB_ROSTER, CREW_TAB_HIRE]);
assert.equal(CREW_TAB_DEFAULT, CREW_TAB_ROSTER);
assert.deepEqual(SHED_TABS, [SHED_TAB_YARD, SHED_TAB_BUY]);
assert.equal(SHED_TAB_DEFAULT, SHED_TAB_YARD);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
const crew = readFileSync(new URL('../src/components/Crew.jsx', import.meta.url), 'utf8');
const shed = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(office, /<SectionTabs/);
assert.match(office, /tab === OFFICE_TAB_INBOX/);
assert.match(office, /tab === OFFICE_TAB_MONEY/);
assert.match(office, /tab === OFFICE_TAB_PROJECTS/);
assert.match(crew, /tab === CREW_TAB_ROSTER/);
assert.match(crew, /tab === CREW_TAB_HIRE/);
assert.match(shed, /tab === SHED_TAB_YARD/);
assert.match(shed, /tab === SHED_TAB_BUY/);
assert.match(app, /state\.tabs/);
assert.match(app, /<Sidebar/);

console.log('round 3 phase C checks passed');
