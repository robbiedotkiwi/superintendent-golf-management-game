#!/usr/bin/env node
/**
 * Round 9 Phase E: pond dosing job and level bar.
 * Run: node scripts/r9-phase-e-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  POND_CAPACITY,
  POND_DOSE_COST,
  POND_DOSE_DUE_COPY,
  POND_DOSE_MINUTES,
  POND_DOSE_TASK,
  POND_DOSE_WEEK_DAYS,
  POND_HEALTH_START,
  POND_HEALTH_SUMMER_DROP,
  POND_LOW_FRACTION,
  POND_START_VOLUME,
  STARTING_DAY,
  TASK_MINUTES,
} from '../src/data/constants.js';
import { getTask } from '../src/data/tasks.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  isPondDoseCurrent,
  isPondDoseDue,
  pondCapacity,
  pondDoseBriefing,
  resolveIrrigation,
} from '../src/engine/irrigation.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(POND_DOSE_TASK, 'pondDose');
assert.equal(TASK_MINUTES.pondDose, POND_DOSE_MINUTES);
assert.equal(getTask(POND_DOSE_TASK).kind, 'pondDose');
assert.equal(getTask(POND_DOSE_TASK).materialsCost, POND_DOSE_COST);
assert.equal(POND_DOSE_WEEK_DAYS, 7);

const start = createInitialState();
assert.equal(start.lastPondDoseDay, STARTING_DAY);
assert.equal(isPondDoseCurrent(start), true);
assert.equal(isPondDoseDue(start), false);
assert.equal(pondDoseBriefing(start), null);
assert.equal(pondCapacity(start), POND_CAPACITY);

const due = { ...start, day: STARTING_DAY + POND_DOSE_WEEK_DAYS, lastPondDoseDay: STARTING_DAY };
assert.equal(isPondDoseDue(due), true);
assert.equal(pondDoseBriefing(due), POND_DOSE_DUE_COPY);

const summerDue = {
  ...due,
  season: 'summer',
  pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
  hasAerator: false,
};
assert.equal(resolveIrrigation(summerDue).pond.health, POND_HEALTH_START - POND_HEALTH_SUMMER_DROP);
const summerCurrent = { ...summerDue, lastPondDoseDay: summerDue.day };
assert.equal(resolveIrrigation(summerCurrent).pond.health, POND_HEALTH_START);

let planned = reducer(start, { type: 'PLAN_TASK', taskId: POND_DOSE_TASK });
assert.equal(planned.plannedTasks[0].taskId, POND_DOSE_TASK);
const idle = reducer(start, { type: 'END_DAY' });
const dosed = reducer(planned, { type: 'END_DAY' });
assert.equal(dosed.lastPondDoseDay, start.day);
assert.equal(dosed.cash, idle.cash - POND_DOSE_COST);
assert.equal(
  dosed.workers.find((worker) => worker.id === 'player').minutesToday,
  idle.workers.find((worker) => worker.id === 'player').minutesToday,
);

assert.equal(reducer(start, { type: 'SET_POND_DOSING', on: true }), start);

const oldOn = migrateSave({
  day: 20,
  pondDosing: true,
  surfaces: {
    greens: { quality: 40 },
    tees: { quality: 40 },
    fairways: { quality: 40 },
    rough: { quality: 40 },
    bunkers: { quality: 40 },
  },
});
assert.equal(oldOn.lastPondDoseDay, 20);
assert.equal(oldOn.pondDosing, undefined);
assert.equal(isPondDoseCurrent(oldOn), true);

const turfSrc = read('src/components/Turf.jsx');
assert.match(turfSrc, /POND_DOSE_TASK/);
assert.match(turfSrc, /PondLevelBar/);
assert.doesNotMatch(turfSrc, /SET_POND_DOSING|pondDosing|Dosing on/);

const bar = read('src/components/PondLevelBar.jsx');
assert.match(bar, /POND_LOW_FRACTION/);
assert.match(bar, /data-pond-low-mark/);
assert.equal(POND_LOW_FRACTION, 0.35);

const staffSrc = read('src/engine/staff.js');
assert.doesNotMatch(staffSrc, /pondDoseMinutes/);

const dialog = read('src/components/StartDayDialog.jsx');
assert.match(dialog, /pondDoseBriefing/);
assert.match(dialog, /data-morning-briefing/);

console.log('r9-phase-e-check: ok');
