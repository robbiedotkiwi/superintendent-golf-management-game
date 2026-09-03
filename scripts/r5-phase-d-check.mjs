/**
 * Round 5 Phase D: unavailable workers and drag-to-reorder.
 * Run: node scripts/r5-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MORALE_HOME_REASON,
  MORALE_NOSHOW_BELOW,
  OVERRUN_DROP_COPY,
  PLAYER_ID,
  SICK_REASON,
  TRAINING_BACK_DAY_REASON,
  TRAINING_DAYS,
  VOLUNTEER_ID,
  VOLUNTEER_OFF_REASON,
} from '../src/data/constants.js';
import { assignWorker } from '../src/engine/assignment.js';
import { workerAbsenceReason } from '../src/engine/availability.js';
import { getTask } from '../src/data/tasks.js';
import {
  canPlanTask,
  combinedMinutesCapacity,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { resolveDay } from '../src/engine/simulation.js';

assert.equal(VOLUNTEER_OFF_REASON, 'Volunteer — not in today');
assert.equal(TRAINING_BACK_DAY_REASON('Sam', 34), 'Sam — training, back day 34');
assert.equal(OVERRUN_DROP_COPY, 'Top runs first. The last task is the one dropped if the day overruns.');

const start = createInitialState();
const volunteer = start.workers.find((worker) => worker.id === VOLUNTEER_ID);
assert.equal(workerAbsenceReason(start, volunteer), VOLUNTEER_OFF_REASON);
assert.equal(assignWorker(start, getTask('cutFairways'))?.id, PLAYER_ID);
assert.equal(canPlanTask(start, 'cutFairways', VOLUNTEER_ID).ok, false);

const plannedFairways = reducer(start, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const afterVolunteer = reducer(plannedFairways, {
  type: 'SET_TASK_WORKER',
  taskId: 'cutFairways',
  workerId: VOLUNTEER_ID,
});
assert.equal(afterVolunteer.plannedTasks[0].workerId, PLAYER_ID);
assert.equal(canPlanTask(start, 'cutFairways', VOLUNTEER_ID).ok, false);
assert.equal(reducer(start, { type: 'PLAN_TASK', taskId: 'cutFairways', workerId: VOLUNTEER_ID }).plannedTasks.length, 0);

const candidate = start.candidates[0];
let hired = reducer(start, { type: 'HIRE_WORKER', candidateId: candidate.id });
const hireId = hired.workers.at(-1).id;
let trained = reducer(hired, { type: 'TRAIN_WORKER', workerId: hireId, axis: 'speedSkill' });
const trainee = trained.workers.find((worker) => worker.id === hireId);
assert.equal(
  workerAbsenceReason(trained, trainee),
  TRAINING_BACK_DAY_REASON(trainee.name, trained.day + TRAINING_DAYS),
);
assert.equal(canPlanTask(trained, 'cutTees', hireId).ok, false);
assert.equal(assignWorker(trained, getTask('cutTees'))?.id, PLAYER_ID);

const sickWorker = {
  ...start.workers[0],
  minutesToday: 0,
  sickUntilDay: 4,
};
assert.equal(workerAbsenceReason(start, sickWorker), SICK_REASON(sickWorker.name));

const homeWorker = {
  ...start.workers[0],
  minutesToday: 0,
  morale: MORALE_NOSHOW_BELOW - 1,
};
assert.equal(workerAbsenceReason(start, homeWorker), MORALE_HOME_REASON(homeWorker.name));

let ordered = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens' });
ordered = reducer(ordered, { type: 'PLAN_TASK', taskId: 'changeCups' });
ordered = reducer(ordered, { type: 'PLAN_TASK', taskId: 'rakeBunkers' });
const ids = ordered.plannedTasks.map((item) => item.taskId);
assert.deepEqual(ids, ['cutGreens', 'changeCups', 'rakeBunkers']);
const reversed = reducer(ordered, { type: 'REORDER_TASKS', order: [...ids].reverse() });
assert.deepEqual(
  reversed.plannedTasks.map((item) => item.taskId),
  ['rakeBunkers', 'changeCups', 'cutGreens'],
);
const kept = reducer(reversed, { type: 'SET_IRRIGATION', surface: 'greens', policy: 'off' });
assert.deepEqual(
  kept.plannedTasks.map((item) => item.taskId),
  ['rakeBunkers', 'changeCups', 'cutGreens'],
);

const lastId = reversed.plannedTasks.at(-1).taskId;
const used = reversed.plannedTasks.reduce((sum, item) => sum + item.minutes, 0);
const capacity = combinedMinutesCapacity(reversed);
const extra = capacity - used + 1;
const { summary } = resolveDay({
  ...reversed,
  ownedMachines: [...reversed.ownedMachines, 'autonomousMower'],
  autoWeek: { weekStart: reversed.day, hits: [{ day: reversed.day, minutes: extra }] },
});
assert.ok(summary.dropped.some((item) => item.taskId === lastId), `dropped should include last task ${lastId}`);
assert.equal(summary.dropped.at(-1).taskId, lastId);

const panel = readFileSync(new URL('../src/components/TaskPanel.jsx', import.meta.url), 'utf8');
assert.match(panel, /line-through/);
assert.match(panel, /workerAbsenceReason/);
assert.match(panel, /disabled=\{!selectable\}/);
assert.doesNotMatch(panel, /[↑↓]/);

const plan = readFileSync(new URL('../src/components/PlanList.jsx', import.meta.url), 'utf8');
assert.match(plan, /OVERRUN_DROP_COPY/);
assert.match(plan, /draggable/);
assert.match(plan, /REORDER_TASKS|onReorder/);
assert.match(plan, /\{index \+ 1\}/);
assert.doesNotMatch(plan, /[↑↓]/);

const dialog = readFileSync(new URL('../src/components/StartDayDialog.jsx', import.meta.url), 'utf8');
assert.match(dialog, /<PlanList/);
assert.match(dialog, /onReorder/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /REORDER_TASKS/);
assert.match(app, /<PlanList/);
assert.doesNotMatch(app, /[↑↓]/);

const sidebar = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(sidebar, /[↑↓]/);
assert.doesNotMatch(sidebar, /<PlanList/);

const sim = readFileSync(new URL('../src/engine/simulation.js', import.meta.url), 'utf8');
assert.match(sim, /planned\.pop\(\)/);

console.log('GATE D1 PASS unavailable workers have a stated reason and cannot be selected');
console.log('GATE D2 PASS no assign route accepts an unavailable worker');
console.log('GATE D3 PASS REORDER_TASKS persists run order');
console.log('GATE D4 PASS overrun copy and numbered drag list are in the UI');
console.log('GATE D5 PASS overrun drops the last task in the list');
console.log('round 5 phase D checks passed');
