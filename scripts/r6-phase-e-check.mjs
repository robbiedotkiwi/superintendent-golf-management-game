/**
 * Round 6 Phase E: volunteer arrives on weekday 3.
 * Run: node scripts/r6-phase-e-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STARTING_WEATHER,
  VOLUNTEER_DAY,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_ID,
  VOLUNTEER_LEGACY_WEEKDAY,
  VOLUNTEER_MINUTES,
  VOLUNTEER_OFF_REASON,
} from '../src/data/constants.js';
import { getTask } from '../src/data/tasks.js';
import { assignWorker, workerAllows } from '../src/engine/assignment.js';
import { isVolunteerOnDuty, workerAbsenceReason } from '../src/engine/availability.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';
import { dayOfWeek } from '../src/engine/staff.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

assert.equal(VOLUNTEER_DAY, 3);
assert.equal(VOLUNTEER_DEFAULT_WEEKDAY, VOLUNTEER_DAY);
assert.equal(VOLUNTEER_LEGACY_WEEKDAY, 6);

const start = createInitialState();
assert.equal(start.volunteerWeekday, VOLUNTEER_DAY);
const volunteer = start.workers.find((worker) => worker.id === VOLUNTEER_ID);
assert.ok(volunteer);
assert.deepEqual(volunteer.allowedSurfaces, ['fairways', 'rough']);
assert.equal(workerAllows(volunteer, 'greens'), false);
assert.equal(workerAllows(volunteer, 'tees'), false);
assert.equal(workerAllows(volunteer, 'bunkers'), false);
assert.equal(workerAllows(volunteer, 'fairways'), true);
assert.equal(workerAllows(volunteer, 'rough'), true);

function endKeep(state) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: STARTING_WEATHER,
    workers: applyWeatherToWorkers(next.workers, STARTING_WEATHER),
  };
}

let day = start;
while (dayOfWeek(day.day) !== VOLUNTEER_DAY) {
  assert.equal(isVolunteerOnDuty(day), false);
  const off = day.workers.find((worker) => worker.id === VOLUNTEER_ID);
  assert.equal(off.minutesToday, 0);
  assert.equal(workerAbsenceReason(day, off), VOLUNTEER_OFF_REASON);
  day = endKeep(day);
}
assert.equal(dayOfWeek(day.day), 3);
assert.equal(isVolunteerOnDuty(day), true);
const onDuty = day.workers.find((worker) => worker.id === VOLUNTEER_ID);
assert.equal(onDuty.minutesToday, VOLUNTEER_MINUTES);
assert.equal(workerAbsenceReason(day, onDuty), null);
assert.equal(assignWorker(day, getTask('cutGreens'))?.id !== VOLUNTEER_ID, true);
assert.ok(assignWorker(day, getTask('cutFairways')));

const legacy = migrateSave({
  day: 4,
  volunteerWeekday: VOLUNTEER_LEGACY_WEEKDAY,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(legacy.volunteerWeekday, VOLUNTEER_DAY);

const kept = migrateSave({
  day: 4,
  volunteerWeekday: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.equal(kept.volunteerWeekday, 4);

const crewSrc = readFileSync(new URL('../src/components/Crew.jsx', import.meta.url), 'utf8');
assert.match(crewSrc, /VOLUNTEER_OFF_REASON|not in today|weekday/);

console.log('GATE E1 PASS volunteer arrives on weekday 3');
console.log('GATE E2 PASS volunteer still cannot take greens, tees or bunkers');
console.log('GATE E3 PASS off days use VOLUNTEER_OFF_REASON');
console.log('round 6 phase E checks passed');
