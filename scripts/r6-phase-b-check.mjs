/**
 * Round 6 Phase B: plan cuts from Turf, match last mowing, machine override, Other tab.
 * Run: node scripts/r6-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CUT_TASK_BY_SURFACE,
  HOC_SURFACES,
  MACHINE_OVERRIDE_AUTO,
  MACHINE_OVERRIDE_FALLBACK,
  PATTERN_RINGS,
  PLAN_THIS_CUT_LABEL,
  SECTION_TURF,
  TURF_TAB_BUNKERS,
  TURF_TAB_IRRIGATION,
  TURF_TAB_INPUTS,
  TURF_TAB_LEGACY_BUNKERS,
  TURF_TAB_LEGACY_POND,
  TURF_TAB_MOWING,
  TURF_TAB_OTHER,
  TURF_TAB_POND,
  TURF_TABS,
} from '../src/data/constants.js';
import { getMachine } from '../src/data/equipment.js';
import { getTask } from '../src/data/tasks.js';
import { machineTitle } from '../src/engine/machineDisplay.js';
import {
  machineAssignment,
  overrideCandidates,
  pickMachine,
  pickMachineForTask,
} from '../src/engine/equipment.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { holeCount, meanQuality, courseSettings, holeSurface, legacySurfaces, setTypeQuality } from '../src/engine/holes.js';


assert.deepEqual(TURF_TABS, [
  TURF_TAB_MOWING,
  TURF_TAB_IRRIGATION,
  TURF_TAB_INPUTS,
  TURF_TAB_OTHER,
]);
assert.equal(TURF_TABS.length, 4);
assert.equal(TURF_TAB_BUNKERS, TURF_TAB_OTHER);
assert.equal(TURF_TAB_POND, TURF_TAB_OTHER);
assert.equal(PLAN_THIS_CUT_LABEL, 'Plan this cut');
assert.equal(MACHINE_OVERRIDE_AUTO, 'auto');
assert.equal(MACHINE_OVERRIDE_FALLBACK('Walk-behind reel'), 'Walk-behind reel unavailable — auto');

const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert.match(turfSrc, /PLAN_THIS_CUT_LABEL/);
assert.match(turfSrc, /TURF_TAB_MOWING/);
assert.doesNotMatch(turfSrc, /MATCH_LAST_MOWING/);
assert.match(turfSrc, /MachinePicker/);
assert.match(turfSrc, /overrideCandidates/);
assert.match(turfSrc, /TURF_TAB_OTHER/);
assert.match(turfSrc, /TURF_TAB_INPUTS/);
assert.match(turfSrc, /BunkerTab/);
assert.match(turfSrc, /PondPanel/);
assert.doesNotMatch(turfSrc, /tab === TURF_TAB_BUNKERS \?/);

const planSrc = readFileSync(new URL('../src/components/PlanList.jsx', import.meta.url), 'utf8');
assert.match(planSrc, /machineTitle/);

const start = createInitialState();
assert.equal(start.tabs[SECTION_TURF], TURF_TAB_MOWING);
assert.deepEqual(start.machineOverride, {
  greens: null,
  tees: null,
  fairways: null,
  rough: null,
});
for (const surface of HOC_SURFACES) {
  assert.equal(holeSurface(start, 1, surface).heightAtLastCut, null);
  assert.equal(holeSurface(start, 1, surface).patternAtLastCut, null);
  assert.equal(holeSurface(start, 1, surface).angleAtLastCut, null);
}

const planned = reducer(start, { type: 'PLAN_TASK', taskId: CUT_TASK_BY_SURFACE.greens });
assert.equal(planned.plannedTasks.length, 1);
assert.equal(planned.plannedTasks[0].taskId, 'cutGreens');
assert.equal(holeSurface(planned, 1, 'greens').heightAtLastCut, null, 'last-cut fields are not written at plan time');

let changed = reducer(start, { type: 'SET_HOC', surface: 'greens', hoc: 2.8 });
changed = reducer(changed, { type: 'SET_PATTERN', surface: 'greens', pattern: PATTERN_RINGS });
changed = reducer(changed, { type: 'SET_ANGLE', surface: 'greens', angle: 45 });
changed = reducer(changed, { type: 'PLAN_TASK', taskId: 'cutGreens', holes: [1] });
assert.equal(holeSurface(changed, 1, 'greens').heightAtLastCut, null);
let resolved = reducer(changed, { type: 'END_DAY' });
assert.equal(holeSurface(resolved, 1, 'greens').heightAtLastCut, 2.8);
assert.equal(holeSurface(resolved, 1, 'greens').patternAtLastCut, PATTERN_RINGS);
assert.equal(holeSurface(resolved, 1, 'greens').angleAtLastCut, 45);
assert.equal(resolved.plannedTasks.length, 0);

resolved = reducer(resolved, { type: 'SET_HOC', surface: 'greens', hoc: 4.0 });
resolved = reducer(resolved, { type: 'SET_PATTERN', surface: 'greens', pattern: 'stripes' });
resolved = reducer(resolved, { type: 'SET_ANGLE', surface: 'greens', angle: 0 });
resolved = reducer(resolved, { type: 'PLAN_TASK', taskId: 'rakeBunkers' });
assert.equal(holeSurface(resolved, 1, 'greens').heightAtLastCut, 2.8, 'last-cut fields persist after settings change');
assert.equal(courseSettings(resolved, 'greens').hoc, 4.0);

const autoGreens = pickMachine(start, getTask('cutGreens'));
assert.ok(autoGreens);
assert.equal(machineAssignment(start, 'greens').machine?.id, autoGreens.id);

let both = { ...createInitialState(), cash: 250000 };
both = reducer(both, { type: 'BUY_MACHINE', machineId: 'fairwayUnit' });
both = reducer(both, { type: 'BUY_MACHINE', machineId: 'ventrac' });
assert.ok(both.ownedMachines.includes('fairwayUnit'));
assert.ok(both.ownedMachines.includes('ventrac'));
assert.equal(pickMachine(both, getTask('cutRough'))?.id, 'ventrac', 'highest ceiling wins over a faster lower-ceiling unit');

const greensOnly = overrideCandidates(both, 'greens').map((machine) => machine.id);
assert.ok(greensOnly.includes(start.ownedMachines[0]));
assert.equal(greensOnly.includes('ventrac'), true);
assert.equal(greensOnly.includes('fairwayUnit'), true);

let over = reducer(both, { type: 'SET_MACHINE_OVERRIDE', surface: 'rough', machineId: 'fairwayUnit' });
assert.equal(over.machineOverride.rough, 'fairwayUnit');
assert.equal(pickMachine(over, getTask('cutRough'))?.id, 'fairwayUnit');
over = reducer(over, { type: 'END_DAY' });
assert.equal(over.machineOverride.rough, 'fairwayUnit', 'override persists across days');

let fallback = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: 'walkBehindReel' });
fallback = reducer(fallback, { type: 'SET_MACHINE_OVERRIDE', surface: 'greens', machineId: 'walkBehindReel' });
assert.equal(pickMachineForTask(fallback, getTask('cutGreens'), fallback.workers[0])?.id, 'walkBehindReel');
fallback = {
  ...fallback,
  machineBroken: { ...fallback.machineBroken, walkBehindReel: true },
};
const assignment = machineAssignment(fallback, 'greens');
assert.equal(assignment.machine?.id, start.ownedMachines[0]);
assert.equal(assignment.fallbackReason, MACHINE_OVERRIDE_FALLBACK(machineTitle(getMachine('walkBehindReel'))));
assert.notEqual(pickMachine(fallback, getTask('cutGreens'))?.id, 'walkBehindReel');

const migrated = migrateSave({
  day: 12,
  tabs: { [SECTION_TURF]: TURF_TAB_LEGACY_BUNKERS },
  surfaces: {
    greens: { quality: 40, lastMownDay: 1 },
    tees: { quality: 40, lastMownDay: 1 },
    fairways: { quality: 40, lastMownDay: 1 },
    rough: { quality: 40, lastMownDay: 1 },
    bunkers: { quality: 40, lastRakedDay: 1 },
  },
});
assert.equal(migrated.tabs[SECTION_TURF], TURF_TAB_OTHER);
assert.equal(holeSurface(migrated, 1, 'greens').heightAtLastCut, null);
assert.equal(migrated.machineOverride.greens, null);
const pondSave = migrateSave({
  day: 12,
  tabs: { [SECTION_TURF]: TURF_TAB_LEGACY_POND },
  holes: migrated.holes,
  surfaceDefaults: migrated.surfaceDefaults,
});
assert.equal(pondSave.tabs[SECTION_TURF], TURF_TAB_OTHER);

console.log('GATE B1 PASS Plan this cut exists on Mowing; PLAN_TASK works without the map');
console.log('GATE B2 PASS last-cut fields are written at resolve, not at plan time');
console.log('GATE B3 PASS last-cut fields persist when HOC settings change');
console.log('GATE B4 PASS auto-pick ranks highest ceiling then lowest time multiplier');
console.log('GATE B5 PASS override lists every mower, including damaging units, and persists across days');
console.log('GATE B6 PASS unavailable override falls back to auto with MACHINE_OVERRIDE_FALLBACK');
console.log('GATE B7 PASS Turf has four tabs; Bunkers and Pond live on Other');
console.log('round 6 phase B checks passed');
