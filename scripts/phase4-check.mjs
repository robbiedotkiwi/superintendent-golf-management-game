/**
 * Headless checks for Phase 4 staff gates.
 * Run: node scripts/phase4-check.mjs
 */
import assert from 'node:assert/strict';
import {
  DAY_LENGTH_MINUTES,
  EARLY_START_FINE,
  EARLY_START_FINE_COUNT,
  EARLY_START_MINUTES,
  MORALE_SLOW_BELOW,
  PLAYER_ID,
  STARTING_CASH,
  STARTING_WEATHER,
  TRAINING_COST,
  TRAINING_DAYS,
  TRAINING_SKILL_GAIN,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_ID,
  VOLUNTEER_MINUTES,
} from '../src/data/constants.js';
import { getTask } from '../src/data/tasks.js';
import { assignWorker, durationForTask, workerAllows } from '../src/engine/assignment.js';
import { canRepair } from '../src/engine/equipment.js';
import {
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from '../src/engine/gameState.js';
import { dayOfWeek } from '../src/engine/staff.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';

function end(state) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: STARTING_WEATHER,
    workers: applyWeatherToWorkers(next.workers, STARTING_WEATHER),
  };
}

const start = createInitialState();
assert.equal(combinedMinutesRemaining(start), DAY_LENGTH_MINUTES);
const volunteer = start.workers.find((worker) => worker.id === VOLUNTEER_ID);
assert.ok(volunteer);
assert.equal(volunteer.wage, 0);
assert.equal(workerAllows(volunteer, 'greens'), false);
assert.equal(workerAllows(volunteer, 'fairways'), true);

const candidate = start.candidates.find((item) => item.speedSkill < 5 && !item.isMechanic) ?? start.candidates[0];
let hired = reducer(start, { type: 'HIRE_WORKER', candidateId: candidate.id });
assert.ok(hired.workers.length > start.workers.length);
assert.equal(combinedMinutesRemaining(hired), DAY_LENGTH_MINUTES + DAY_LENGTH_MINUTES);
const hiredMaint = hired.maintenanceBudget;
const afterWages = end(hired);
assert.equal(afterWages.maintenanceBudget, hiredMaint - candidate.wage);
assert.equal(afterWages.cash, STARTING_CASH);

const fast = { ...createInitialState() };
fast.workers = [
  ...fast.workers,
  {
    id: 'fast',
    name: 'Fast',
    speedSkill: 5,
    qualitySkill: 2,
    morale: 100,
    wage: 50,
    sprayCertified: false,
    isMechanic: false,
    isVolunteer: false,
    allowedSurfaces: 'all',
    availableFromDay: 1,
    minutesToday: DAY_LENGTH_MINUTES,
    minutesUsed: 0,
    daysWorkedRunning: 0,
  },
];
const player = fast.workers.find((worker) => worker.id === PLAYER_ID);
const speedy = fast.workers.find((worker) => worker.id === 'fast');
const slowTime = durationForTask(fast, 'cutFairways', 'standard', player);
const fastTime = durationForTask(fast, 'cutFairways', 'standard', speedy);
assert.ok(fastTime < slowTime);

const greensTask = getTask('cutGreens');
assert.equal(assignWorker(fast, greensTask, 'standard')?.id, PLAYER_ID);

let day = createInitialState();
while (dayOfWeek(day.day) !== VOLUNTEER_DEFAULT_WEEKDAY) {
  day = end(day);
}
const vol = day.workers.find((worker) => worker.id === VOLUNTEER_ID);
assert.equal(vol.minutesToday, VOLUNTEER_MINUTES);
assert.equal(assignWorker(day, getTask('cutGreens'), 'standard')?.id, PLAYER_ID);
assert.ok(assignWorker(day, getTask('cutFairways'), 'standard'));

let trained = reducer(hired, { type: 'TRAIN_WORKER', workerId: hired.workers.at(-1).id, axis: 'speedSkill' });
assert.equal(trained.cash, STARTING_CASH - TRAINING_COST);
const trainee = trained.workers.at(-1);
const skillBefore = candidate.speedSkill;
assert.equal(trainee.minutesToday, 0);
assert.equal(trainee.trainingUntilDay, trained.day + TRAINING_DAYS);
for (let i = 0; i < TRAINING_DAYS; i += 1) trained = end(trained);
const returned = trained.workers.find((worker) => worker.id === trainee.id);
assert.equal(returned.speedSkill, Math.min(5, skillBefore + TRAINING_SKILL_GAIN));
assert.ok(returned.minutesToday > 0);

let mechanicState = createInitialState();
const mechanicCand = mechanicState.candidates.find((item) => item.isMechanic);
mechanicState = reducer(mechanicState, { type: 'HIRE_WORKER', candidateId: mechanicCand.id });
mechanicState.machineBroken = { walkBehindReel: true };
mechanicState.ownedMachines = [...mechanicState.ownedMachines, 'walkBehindReel'];
assert.equal(canRepair(mechanicState, 'walkBehindReel').minutes, 0);
mechanicState = reducer(mechanicState, { type: 'REPAIR_MACHINE', machineId: 'walkBehindReel' });
assert.equal(mechanicState.workers.find((worker) => worker.id === PLAYER_ID).minutesUsed, 0);

let moraleState = {
  ...createInitialState(),
  workers: createInitialState().workers.map((worker) =>
    worker.id === PLAYER_ID ? { ...worker, minutesUsed: DAY_LENGTH_MINUTES, minutesToday: DAY_LENGTH_MINUTES } : worker,
  ),
};
for (let i = 0; i < 7; i += 1) {
  moraleState = {
    ...moraleState,
    plannedTasks: [],
    workers: moraleState.workers.map((worker) =>
      worker.id === PLAYER_ID ? { ...worker, minutesUsed: DAY_LENGTH_MINUTES, minutesToday: DAY_LENGTH_MINUTES } : worker,
    ),
  };
  moraleState = end(moraleState);
  moraleState = {
    ...moraleState,
    workers: moraleState.workers.map((worker) =>
      worker.id === PLAYER_ID ? { ...worker, minutesUsed: DAY_LENGTH_MINUTES, minutesToday: DAY_LENGTH_MINUTES } : worker,
    ),
  };
}
const tired = moraleState.workers.find((worker) => worker.id === PLAYER_ID);
assert.ok(tired.morale < MORALE_SLOW_BELOW);

let early = { ...createInitialState(), earlyStart: true };
const earlyMaint = early.maintenanceBudget;
for (let i = 0; i < EARLY_START_FINE_COUNT; i += 1) early = reducer(early, { type: 'END_DAY' });
assert.equal(early.maintenanceBudget, earlyMaint - EARLY_START_FINE);
assert.equal(early.cash, STARTING_CASH);
assert.equal(early.earlyStart, true);

console.log('phase4 checks passed');
