/**
 * Round 4 Phase B: machines have a daily minute pool; planning claims it.
 * Run: node scripts/r4-phase-b-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GREENSMASTER_ID,
  MACHINE_DAILY_MINUTES,
  PLAYER_ID,
  REELMASTER_ID,
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
import { getTask } from '../src/data/tasks.js';

assert.equal(MACHINE_DAILY_MINUTES, 480);
assert.equal(NO_MACHINE_REASON, 'No machine available. Check the shed.');
assert.equal(MACHINE_BOOKED_REASON, 'That mower is booked for the day.');

const start = createInitialState();
assert.equal(start.machineDailyMinutes[STARTING_MACHINE_ID], MACHINE_DAILY_MINUTES);
assert.equal(machineMinutesRemaining(start, STARTING_MACHINE_ID), MACHINE_DAILY_MINUTES);

const greens = reducer(start, { type: 'PLAN_TASK', taskId: 'cutGreens' });
assert.equal(greens.plannedTasks[0].machineId, GREENSMASTER_ID);
assert.equal(greens.plannedTasks[0].minutes, durationForTask(start, 'cutGreens'));
assert.equal(claimedMinutesByMachine(greens)[GREENSMASTER_ID], greens.plannedTasks[0].minutes);
assert.equal(
  machineMinutesRemaining(greens, GREENSMASTER_ID),
  MACHINE_DAILY_MINUTES - greens.plannedTasks[0].minutes,
);

const candidate = start.candidates.find((item) => item.speedSkill <= 3);
assert.ok(candidate);
let packed = reducer(createInitialState(), { type: 'HIRE_WORKER', candidateId: candidate.id });
packed = reducer(packed, { type: 'PLAN_TASK', taskId: 'cutGreens', workerId: PLAYER_ID });
packed = reducer(packed, { type: 'PLAN_TASK', taskId: 'cutTees', workerId: PLAYER_ID });
packed = reducer(packed, { type: 'PLAN_TASK', taskId: 'cutFairways' });
assert.equal(packed.plannedTasks.find((item) => item.taskId === 'cutFairways').machineId, REELMASTER_ID);
const packedClaim = claimedMinutesByMachine(packed)[GREENSMASTER_ID];
assert.equal(
  packedClaim,
  packed.plannedTasks.filter((item) => item.machineId === GREENSMASTER_ID).reduce((sum, item) => sum + item.minutes, 0),
);

const soloBlocked = canPlanTask(packed, 'cutRough');
assert.equal(soloBlocked.ok, false);
assert.match(soloBlocked.reason, /Needs .* min/);

const PARTIAL_ROUGH = [1];
let crew = reducer(createInitialState(), { type: 'HIRE_WORKER', candidateId: candidate.id });
const hire = crew.workers.find((item) => item.id !== PLAYER_ID && !item.isVolunteer);
assert.ok(hire);
crew = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const fairwayMinutes = crew.plannedTasks.find((item) => item.taskId === 'cutFairways').minutes;
crew = {
  ...crew,
  machineDailyMinutes: { ...crew.machineDailyMinutes, [REELMASTER_ID]: fairwayMinutes },
};
const booked = canPlanTask(crew, 'cutRough', hire.id, { holes: PARTIAL_ROUGH });
assert.equal(booked.ok, false);
assert.equal(booked.reason, MACHINE_BOOKED_REASON);
const bookedAssign = canPlanTask(crew, 'cutRough', undefined, { holes: PARTIAL_ROUGH });
assert.equal(bookedAssign.ok, false);
assert.equal(bookedAssign.reason, MACHINE_BOOKED_REASON);
const refused = reducer(crew, { type: 'PLAN_TASK', taskId: 'cutRough', workerId: hire.id, holes: PARTIAL_ROUGH });
assert.equal(refused.plannedTasks.length, crew.plannedTasks.length);

let two = reducer({ ...createInitialState(), capitalBudget: 250000 }, { type: 'BUY_MACHINE', machineId: 'ventrac' });
assert.ok(two.ownedMachines.includes('ventrac'));
two = reducer(two, { type: 'HIRE_WORKER', candidateId: candidate.id });
const hireTwo = two.workers.find((item) => item.id !== PLAYER_ID && !item.isVolunteer);
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutGreens', workerId: PLAYER_ID });
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutTees', workerId: PLAYER_ID });
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutFairways' });
const extra = canPlanTask(two, 'cutRough', hireTwo.id, { holes: PARTIAL_ROUGH });
assert.equal(extra.ok, true);
assert.equal(extra.machineId, 'ventrac');
two = reducer(two, { type: 'PLAN_TASK', taskId: 'cutRough', workerId: hireTwo.id, holes: PARTIAL_ROUGH });
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
assert.equal(durationForTask(start, 'cutGreens', start.workers[0]), durationForTask(start, 'cutGreens'));

console.log('GATE B1 PASS MACHINE_DAILY_MINUTES is 480');
console.log('GATE B2 PASS planning stores machineId and claims minutes');
console.log('GATE B3 PASS one worker still fails on worker minutes (phase 1 reason)');
console.log('GATE B4 PASS a second worker cannot over-claim the same mower');
console.log('GATE B5 PASS PLAN_TASK, canPlanTask, assignWorker and durationForTask share the claim check');
console.log('GATE B6 PASS a second machine can take the leftover cut');
console.log('GATE B7 PASS shed shows claimed / daily minutes');
console.log('round 4 phase B checks passed');
