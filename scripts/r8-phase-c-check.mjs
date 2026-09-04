#!/usr/bin/env node
/**
 * Round 8 Phase C: firing from Crew roster.
 * Run: node scripts/r8-phase-c-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  FIRING_MORALE_HIT,
  FIRING_SEVERANCE_DAYS,
  PLAYER_ID,
  VOLUNTEER_ID,
} from '../src/data/constants.js';
import { canFireWorker, severanceCost } from '../src/engine/staff.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { migrateSave } from '../src/engine/save.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

assert.equal(FIRING_SEVERANCE_DAYS, 14);
assert.equal(FIRING_MORALE_HIT, 15);

const crew = read('src/components/Crew.jsx');
assert.match(crew, /Confirm fire/);
assert.match(crew, /FIRING_SEVERANCE_DAYS/);
assert.match(crew, /FIRING_MORALE_HIT/);
assert.match(crew, /Don&apos;t come back/);
assert.match(crew, /severanceCost/);

const start = createInitialState();
assert.deepEqual(start.firingHistory, []);
assert.equal(start.volunteerDismissed, false);
assert.equal(canFireWorker(start, PLAYER_ID).ok, false);
assert.equal(canFireWorker(start, VOLUNTEER_ID).ok, false);
assert.equal(reducer(start, { type: 'FIRE_WORKER', workerId: PLAYER_ID }).workers.length, start.workers.length);

let hired = reducer(start, { type: 'HIRE_WORKER', candidateId: start.candidates[0].id });
const worker = hired.workers.find((item) => item.id.startsWith('hire-'));
assert.ok(worker);
const severance = severanceCost(worker);
assert.equal(severance, worker.wage * FIRING_SEVERANCE_DAYS);

hired = reducer(hired, { type: 'PLAN_TASK', taskId: 'cutGreens' });
if (hired.plannedTasks[0].workerId !== worker.id) {
  hired = reducer(hired, { type: 'SET_TASK_WORKER', taskId: 'cutGreens', workerId: worker.id });
}
assert.equal(hired.plannedTasks[0].workerId, worker.id);
const cashBefore = hired.cash;
const playerMorale = hired.workers.find((item) => item.id === PLAYER_ID).morale;
const volunteerMorale = hired.workers.find((item) => item.id === VOLUNTEER_ID).morale;

const fired = reducer(hired, { type: 'FIRE_WORKER', workerId: worker.id });
assert.equal(fired.workers.some((item) => item.id === worker.id), false);
assert.equal(fired.cash, cashBefore - severance);
assert.equal(fired.workers.find((item) => item.id === PLAYER_ID).morale, playerMorale - FIRING_MORALE_HIT);
assert.equal(fired.workers.find((item) => item.id === VOLUNTEER_ID).morale, volunteerMorale - FIRING_MORALE_HIT);
assert.equal(fired.plannedTasks.length, 1);
assert.equal(fired.plannedTasks[0].needsReassignment, true);
assert.equal(fired.plannedTasks[0].workerId, null);
assert.equal(fired.firingHistory.length, 1);
assert.equal(fired.firingHistory[0].kind, 'fired');

const gone = reducer(start, { type: 'DISMISS_VOLUNTEER' });
assert.equal(gone.workers.some((item) => item.isVolunteer), false);
assert.equal(gone.volunteerDismissed, true);
assert.equal(gone.cash, start.cash);
assert.equal(gone.firingHistory[0].kind, 'volunteerGone');
assert.equal(gone.workers.find((item) => item.id === PLAYER_ID).morale, start.workers[0].morale);

const old = migrateSave({
  day: 4,
  surfaces: {
    greens: { quality: 50 },
    tees: { quality: 50 },
    fairways: { quality: 50 },
    rough: { quality: 45 },
    bunkers: { quality: 40 },
  },
});
assert.deepEqual(old.firingHistory, []);
assert.equal(old.volunteerDismissed, false);

console.log('r8-phase-c-check: ok');
