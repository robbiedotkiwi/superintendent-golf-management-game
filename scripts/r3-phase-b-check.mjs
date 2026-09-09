/**
 * Round 3 Phase B: location sections replace the map pane; sidebar stays mounted.
 * Run: node scripts/r3-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SECTION_SHED,
  SECTION_TURF,
  SECTIONS,
} from '../src/data/constants.js';

assert.equal(SECTION_MAP, 'course');
assert.equal(SECTION_TURF, 'turf');
assert.equal(SECTION_OFFICE, 'office');
assert.equal(SECTION_CREW, 'crew');
assert.equal(SECTION_SHED, 'shed');
assert.deepEqual(SECTIONS, [SECTION_MAP, SECTION_TURF, SECTION_OFFICE, SECTION_CREW, SECTION_SHED]);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<Sidebar/);
assert.doesNotMatch(app, /if \(view === SECTION_SHED\) \{\s*return \(/);
assert.doesNotMatch(app, /if \(view === 'shed'\) \{\s*return \(/);
assert.match(app, /relative min-h-0 min-w-0 flex-1/);
const pane = app.slice(app.indexOf('relative min-h-0 min-w-0 flex-1'));
assert.match(pane, /<Shed/);
assert.match(pane, /<Crew/);
assert.match(pane, /<Office/);
assert.match(pane, /<Turf/);
assert.match(pane, /<CourseMap/);
assert.match(pane, /<MapJobPopover/);
assert.doesNotMatch(pane, /<IrrigationPanel/);

const afterSidebar = app.slice(app.indexOf('<Sidebar'));
assert.ok(afterSidebar.indexOf('<Sidebar') < afterSidebar.indexOf('<Shed'), 'sidebar mounts before section pane');

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
const crew = readFileSync(new URL('../src/components/Crew.jsx', import.meta.url), 'utf8');
const shed = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(office, /h-full overflow-y-auto/);
assert.match(crew, /h-full overflow-y-auto/);
assert.match(shed, /h-full overflow-y-auto/);
assert.doesNotMatch(office, /min-h-screen/);
assert.doesNotMatch(crew, /min-h-screen/);
assert.doesNotMatch(shed, /min-h-screen/);
assert.match(sidebar, /section === SECTION_OFFICE/);
assert.match(sidebar, /section === SECTION_CREW/);
assert.match(sidebar, /section === SECTION_SHED/);
assert.match(app, /onCloseShed\(\);\s*onEndDay\(\);/);

console.log('round 3 phase B checks passed');
