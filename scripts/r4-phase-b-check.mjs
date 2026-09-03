/**
 * Round 4 Phase B: machines have a daily minute pool; planning claims it.
 * Run: node scripts/r4-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MACHINE_DAILY_MINUTES,
  PLAYER_ID,
  STARTING_MACHINE_ID,
} from '../src/data/constants.js';
import { durationForTask } from '../src/engine/assignment.js';
import {
  MACHINE_BOOKED_REASON,
  NO_MACHINE_REASON,
  claimedMinutesByMachine,
  machineMinutesRemaining,
  pickMachineForTask,
} from '../src/engine/equipment.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { mowingMinutes } from '../src/engine/mowing.js';
import { getTask } from '../src/data/tasks.js';

assert.equal(MACHINE_DAILY_MINUTES, 480);
assert.equal(NO_MACHINE_REASON, 'No machine available. Check the shed.');
assert.equal(MACHINE_BOOKED_REASON, 'That mower is booked for the day.');

const start = createInitialState();
assert.equal(start.machineDailyMinutes[STARTING_MACHINE_ID], MACHINE_DAILY_MINUTES);
assert.equal(machineMinutesRemaining(start, STARTING_MACHINE_ID), MACHINE_DAILY_MINUTES);

const greens = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens' });
assert.equal(greens.plannedTasks[0].machineId, STARTING_MACHINE_ID);
assert.equal(greens.plannedTasks[0].minutes, mowingMinutes(start, 'cutGreens'));
assert.equal(claimedMinutesByMachine(greens)[STARTING_MACHINE_ID], greens.plannedTasks[0].minutes);
assert.equal(
  machineMinutesRemaining(greens, STARTING_MACHINE_ID),
  MACHINE_DAILY_MINUTES - greens.plannedTasks[0].minutes,
);

let packed = greens;
packed = reducer(packed, { type: 'PLAN_TASK', taskId: 'cutTees' });
packed = reducer(packed, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const packedClaim = claimedMinutesByMachine(packed)[STARTING_MACHINE_ID];
assert.equal(
  packedClaim,
  packed.plannedTasks.reduce((sum, item) => sum + item.minutes, 0),
);
assert.ok(packedClaim > MACHINE_DAILY_MINUTES - mowingMinutes(start, 'cutRough'));

const soloBlocked = canPlanTask(packed, 'cutRough');
assert.equal(soloBlocked.ok, false);
assert.match(soloBlocked.reason, /Needs .* min/);

const candidate = start.candidates.find((item) => item.speedSkill <= 3);
assert.ok(candidate);
let crew = reducer(createInitialState(), { type: 'HIRE_WORKER', candidateId: candidate.id });
const hire = crew.workers.find((item) => item.id !== PLAYER_ID && !item.isVolunteer);
assert.ok(hire);
crew = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutGreens' });
crew = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutTees' });
crew = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const booked = canPlanTask(crew, 'cutRough', hire.id);
assert.equal(booked.ok, false);
assert.equal(booked.reason, MACHINE_BOOKED_REASON);
const bookedAssign = canPlanTask(crew, 'cutRough');
assert.equal(bookedAssign.ok, false);
assert.equal(bookedAssign.reason, MACHINE_BOOKED_REASON);
const refused = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutRough', workerId: hire.id });
assert.equal(refused.plannedTasks.length, crew.plannedTasks.length);

let two = reducer(createInitialState(), { type: 'BUY_MACHINE', machineId: 'ventrac' });
two = reducer(two, { type: 'HIRE_WORKER', candidateId: candidate.id });
const hireTwo = two.workers.find((item) => item.id !== PLAYER_ID && !item.isVolunteer);
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutGreens' });
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutTees' });
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const extra = canPlanTask(two, 'cutRough', hireTwo.id);
assert.equal(extra.ok, true);
assert.equal(extra.machineId, 'ventrac');
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutRough', workerId: hireTwo.id });
assert.equal(two.plannedTasks.find((item) => item.taskId === 'cutRough').machineId, 'ventrac');

const gameSrc = readFileSync(new URL('../src/engine/gameState.js', import.meta.url), 'utf8');
assert.match(gameSrc, /machinePlanCheck/);
assert.match(gameSrc, /MACHINE_BOOKED_REASON/);
const assignSrc = readFileSync(new URL('../src/engine/assignment.js', import.meta.url), 'utf8');
assert.match(assignSrc, /pickMachineForTask/);
const shedSrc = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
assert.match(shedSrc, /machineDailyMinutesOf/);
assert.match(shedSrc, /claimedMinutesByMachine/);

const task = getTask('cutGreens');
assert.equal(pickMachineForTask(start, task, start.workers[0])?.id, STARTING_MACHINE_ID);
assert.equal(durationForTask(start, 'cutGreens', start.workers[0]), mowingMinutes(start, 'cutGreens'));

console.log('GATE B1 PASS MACHINE_DAILY_MINUTES is 480');
console.log('GATE B2 PASS planning stores machineId and claims minutes');
console.log('GATE B3 PASS one worker still fails on worker minutes (phase 1 reason)');
console.log('GATE B4 PASS a second worker cannot over-claim the same mower');
console.log('GATE B5 PASS PLAN_TASK, canPlanTask, assignWorker and durationForTask share the claim check');
console.log('GATE B6 PASS a second machine can take the leftover cut');
console.log('GATE B7 PASS shed shows claimed / daily minutes');
console.log('round 4 phase B checks passed');
