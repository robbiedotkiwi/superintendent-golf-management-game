import { readFileSync } from 'node:fs';
import { createInitialState, canPlanTask, reducer } from '../src/engine/gameState.js';
import { machineAllows, getMachine } from '../src/data/equipment.js';
import { GREENSMASTER_ID, GROUNDSMASTER_ID } from '../src/data/constants.js';
import { gradeLetter, gradeCapScore } from '../src/engine/grades.js';
import {
  hoursToPassFraction,
  applyDailyPassCap,
  machineAllowsArea,
  passClassOf,
  passHoursFor,
  staffCanRunMachine,
  wearTimeMult,
  weeklyTargetQuality,
} from '../src/engine/passes.js';
import { applyDurationModifier, minutesToHours, roundDurationHours } from '../src/engine/duration.js';
import { driftQuality } from '../src/engine/qualityDrift.js';
import { migrateWorkerTier } from '../src/engine/staffTiers.js';
import {
  DAYS_PER_SEASON,
  MAX_PASSES_PER_AREA_PER_DAY,
  PASS_CLASS_PUSH_REEL,
  PASS_CLASS_RIDE_ON_ROTARY,
  PROJECT_EXPAND_3,
  STAFF_TIER_SENIOR,
  STAFF_TIER_UNSKILLED,
  WEAR_TIME_MULT_HEAVY,
  WEAR_TIME_MULT_LIGHT,
  WEAR_TIME_MULT_NONE,
} from '../src/data/config.js';
import { monthlyBudgetFor, golferNumbers, gmRequiredGrade } from '../src/engine/economy.js';
import { draftFromJobId, emptySlotDraft, mowTaskIdFor, resolvePlannerJobId } from '../src/engine/slots.js';
import { autoMachineFor, blockConflicts, surplusWastedHours } from '../src/engine/dayPlanner.js';
import { getTask } from '../src/data/tasks.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = createInitialState();
assert(state.areaQuality?.greens != null, 'areaQuality missing');
assert(state.weekPasses?.greens === 0, 'weekPasses missing');
assert(state.workers[0].tier === STAFF_TIER_SENIOR, 'player should be senior');
assert(state.workers.find((w) => w.isVolunteer)?.tier === STAFF_TIER_UNSKILLED, 'volunteer unskilled');
assert(gradeLetter(97) === 'A+', 'A+ band');
assert(gradeLetter(55) === 'F', 'starting greens display F');
assert(gradeLetter(state.areaQuality.greens) === 'F', 'start greens letter');

const reel = getMachine(GREENSMASTER_ID);
const rotary = getMachine(GROUNDSMASTER_ID);
assert(passClassOf(reel) === PASS_CLASS_PUSH_REEL, 'greensmaster is push reel');
assert(passClassOf(rotary) === PASS_CLASS_RIDE_ON_ROTARY, 'groundsmaster is ride-on rotary');
assert(machineAllowsArea(reel, 'greens'), 'reel allows greens');
assert(!machineAllowsArea(rotary, 'greens'), 'rotary cannot greens');
assert(!machineAllows(rotary, 'greens', { id: 'cutGreens', mowing: true, surface: 'greens' }), 'catalog rotary blocked on greens');
assert(machineAllowsArea(rotary, 'fairways'), 'rotary allows fairways');
assert(machineAllowsArea(rotary, 'tees'), 'rotary allows tees via pass hours');

const volunteer = state.workers.find((w) => w.isVolunteer);
assert(!staffCanRunMachine(volunteer, reel), 'unskilled cannot run reel');
assert(staffCanRunMachine(volunteer, rotary), 'unskilled can run rotary');
assert(staffCanRunMachine(state.workers[0], reel), 'senior can run reel');

assert(hoursToPassFraction(2, 8) === 0.25, '2 of 8 hours is 0.25 pass');
const capped = applyDailyPassCap(1.4, 0, 8);
assert(capped.pass === MAX_PASSES_PER_AREA_PER_DAY, 'daily cap 1');
assert(Math.abs(capped.wastedHours - 3.2) < 1e-9, 'surplus hours wasted');

assert(wearTimeMult(10) === WEAR_TIME_MULT_NONE, 'wear 0-25 none');
assert(wearTimeMult(30) === WEAR_TIME_MULT_LIGHT, 'wear 25-50 +10%');
assert(wearTimeMult(60) === WEAR_TIME_MULT_HEAVY, 'wear 50-75 +25%');
assert(roundDurationHours(4.4) === 4, 'floor 4.4 to 4.0');
assert(applyDurationModifier(8, 0.9) === 7.5, 'senior 8 hr → 7.5');
assert(applyDurationModifier(4, 1.25) === 5, '4 hr +25% wear → 5.0');
assert(applyDurationModifier(4, 1.1) === 4, '4 hr +10% wear rounds down to 4.0');
assert(applyDurationModifier(2, 0.9) === 2, '2 hr senior stays 2');
const seniorHours = passHoursFor(state, GREENSMASTER_ID, 'greens', state.workers[0]);
assert(seniorHours === 7.5, `senior clean push reel greens is 7.5, got ${seniorHours}`);
assert(DAYS_PER_SEASON === 28, 'season is 28 days');
assert(weeklyTargetQuality(1, 80) === 80, 'weekly result capped by machine');
assert(weeklyTargetQuality(0.5, 100) === 50, 'half passes = 50');
assert(gradeCapScore('A+') === 100, 'A+ cap is 100');

const hired = migrateWorkerTier({ speedSkill: 5, qualitySkill: 5, name: 'Test' });
assert(hired.tier === STAFF_TIER_SENIOR, 'high skill maps to senior');

const planned = canPlanTask(state, 'cutGreens', state.workers[0].id);
assert(planned.ok, `cut greens should plan: ${planned.reason ?? ''}`);

let next = reducer(state, {
  type: 'PLAN_TASK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  machineId: GREENSMASTER_ID,
  minutes: 120,
  confirmDamaging: true,
});
assert(next.plannedTasks[0]?.minutes === 120, 'slot minutes stick');
next = reducer(next, { type: 'SAVE_TEMPLATE', name: 'winter week' });
assert(next.planTemplates.some((item) => item.name === 'winter week'), 'named template saved');
const copied = reducer(next, { type: 'COPY_YESTERDAY', day: state.day + 1 });
assert(copied.weekPlan.days[state.day + 1]?.tasks?.length >= 0, 'copy yesterday runs');

next = reducer(state, {
  type: 'PLAN_TASK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  machineId: GREENSMASTER_ID,
  confirmDamaging: true,
});
assert(next.plannedTasks.some((t) => t.taskId === 'cutGreens'), 'greens cut booked');
next = reducer(next, { type: 'END_DAY' });
assert(next.day === state.day + 1, 'day advanced');
assert(next.weekPasses.greens > 0.9, `full greens pass should count, got ${next.weekPasses.greens}`);
assert(next.areaQuality.greens !== state.areaQuality.greens, 'quality should drift after a pass');
assert(driftQuality(50, 100, 0.12) === 56, 'linear drift both ways');

const leave = reducer(
  { ...state, leaveRequests: [{ id: 1, workerId: 'hire-x', name: 'Test', days: 5, approveMorale: 8, declineMorale: -12 }], nextLeaveId: 2, workers: [...state.workers, { id: 'hire-x', name: 'Test', morale: 50, isVolunteer: false, tier: STAFF_TIER_UNSKILLED }] },
  { type: 'APPROVE_LEAVE', requestId: 1 },
);
assert(leave.leaveRequests[0].resolved === 'approved', 'leave approved');
assert(leave.workers.find((w) => w.id === 'hire-x').morale === 58, 'approve morale');
assert(leave.workers.find((w) => w.id === 'hire-x').leaveUntilDay === state.day + 5, 'leave until');

assert(state.capex === 0, 'season 1 capex starts locked');
assert(state.capexStatus === 'pending', 'season 1 capex pending');
assert(monthlyBudgetFor(state) > 0, 'monthly budget');
assert(golferNumbers(state) > 0, 'golfers');
assert(gmRequiredGrade(state) > 70, 'gm required rises with holes');

let site = reducer(
  { ...state, capex: 200000 },
  { type: 'START_PROJECT', projectId: PROJECT_EXPAND_3, workerId: state.workers[0].id },
);
assert(site.projects.some((item) => item.id === PROJECT_EXPAND_3), '3-hole expansion starts');
assert(site.projects[0].workerId === state.workers[0].id, 'expansion occupies a person');
site = reducer(site, { type: 'PAUSE_PROJECT', projectId: PROJECT_EXPAND_3 });
assert(site.projects[0].paused, 'expansion can pause');
site = reducer(site, { type: 'RESUME_PROJECT', projectId: PROJECT_EXPAND_3 });
assert(!site.projects[0].paused, 'expansion can resume');

const forecastSrc = readFileSync(new URL('../src/components/ForecastStrip.jsx', import.meta.url), 'utf8');
assert(forecastSrc.includes("from '../engine/weather.js'"), 'ForecastStrip imports weather helpers');
assert(forecastSrc.includes('formatTempRange'), 'ForecastStrip uses formatTempRange');
assert(forecastSrc.includes('forecastOpacity'), 'ForecastStrip uses forecastOpacity');

assert(mowTaskIdFor('cutTees') == null, 'task ids are not area keys');
assert(resolvePlannerJobId({ jobId: 'cutTees', surface: 'cutTees' }) === 'cutTees', 'stale surface still resolves job');
assert(getTask(resolvePlannerJobId({ jobId: 'cutTees', surface: 'cutTees' }))?.surface === 'tees', 'resolved cutTees surface is tees');
const switched = draftFromJobId('cutTees', { ...emptySlotDraft(), machineId: GREENSMASTER_ID });
assert(switched.jobId === 'cutTees', 'area change keeps task id');
assert(switched.surface === 'tees', 'area change stores area key not task id');
assert(switched.machineId === '', 'area change clears leftover machine');

let afterGreens = reducer(state, {
  type: 'PLAN_TASK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  machineId: GREENSMASTER_ID,
  minutes: 60,
  confirmDamaging: true,
});
const teesDraft = draftFromJobId('cutTees', { ...emptySlotDraft(), machineId: GREENSMASTER_ID });
const teesCheck = canPlanTask(afterGreens, resolvePlannerJobId(teesDraft), state.workers[0].id, {
  minutes: 60,
  confirmDamaging: true,
});
assert(teesCheck.ok, `can still plan tees after changing area: ${teesCheck.reason ?? ''}`);
afterGreens = reducer(afterGreens, {
  type: 'PLAN_TASK',
  taskId: resolvePlannerJobId(teesDraft),
  workerId: state.workers[0].id,
  minutes: 60,
  confirmDamaging: true,
});
assert(afterGreens.plannedTasks.some((item) => item.taskId === 'cutTees'), 'tees slot added after area change');

let canvas = reducer(state, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  startMinute: 0,
});
assert(canvas.plannedTasks.some((item) => item.taskId === 'cutGreens' && item.startMinute === 0), 'palette drop places a block');
const placed = canvas.plannedTasks[0];
canvas = reducer(canvas, { type: 'MOVE_BLOCK', planId: placed.planId, workerId: placed.workerId, startMinute: 60 });
assert(canvas.plannedTasks[0].startMinute === 60, 'block moves to 1.0 hr');
canvas = reducer(canvas, { type: 'RESIZE_BLOCK', planId: placed.planId, startMinute: 60, minutes: 90 });
assert(canvas.plannedTasks[0].minutes === 90, 'block resizes to 1.5 hr');

const plannerSrc = readFileSync(new URL('../src/components/DayPlanner.jsx', import.meta.url), 'utf8');
assert(plannerSrc.includes('data-day-planner'), 'day canvas is the planner');
assert(plannerSrc.includes('data-task-palette'), 'task palette is present');

const helper = { ...state.workers[0], id: 'helper', name: 'Helper' };
const twoCrew = { ...state, workers: [...state.workers, helper] };
const autoGreens = autoMachineFor(twoCrew, getTask('cutGreens'), twoCrew.workers[0]);
let machines = reducer(twoCrew, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: twoCrew.workers[0].id,
  startMinute: 0,
});
assert(machines.plannedTasks[0].machineId === autoGreens?.id, 'place auto-selects best permitted machine');
machines = reducer(machines, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: 'helper',
  startMinute: 0,
});
assert(blockConflicts(machines, machines.plannedTasks[1]).includes('machine'), 'overlapping machine highlights');

machines = reducer(machines, {
  type: 'SET_BLOCK_MACHINE',
  planId: machines.plannedTasks[1].planId,
  machineId: GROUNDSMASTER_ID,
});
assert(machines.plannedTasks[1].machineId === GROUNDSMASTER_ID, 'block machine override sticks');

const unskilled = { ...state.workers[0], id: 'unskilled', name: 'Unskilled', tier: STAFF_TIER_UNSKILLED };
const mixed = { ...state, workers: [...state.workers, unskilled] };
let tiered = reducer(mixed, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: mixed.workers[0].id,
  startMinute: 0,
});
tiered = reducer(tiered, {
  type: 'MOVE_BLOCK',
  planId: tiered.plannedTasks[0].planId,
  workerId: 'unskilled',
  startMinute: 0,
});
assert(blockConflicts(tiered, tiered.plannedTasks[0]).includes('tier'), 'tier mismatch highlights');

const overrun = reducer(state, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  startMinute: 420,
  minutes: 90,
});
assert(blockConflicts(overrun, overrun.plannedTasks[0]).includes('overrun'), 'over day length highlights');

let surplus = reducer(twoCrew, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: twoCrew.workers[0].id,
  startMinute: 0,
  minutes: 450,
});
surplus = reducer(surplus, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: twoCrew.workers[0].id,
  startMinute: 450,
  minutes: 30,
});
assert(blockConflicts(surplus, surplus.plannedTasks[1]).includes('surplus'), 'second pass today highlights');
assert(surplusWastedHours(surplus, surplus.plannedTasks[1]) === 0.5, 'surplus shows 0.5 hr wasted');

assert(plannerSrc.includes('data-block-machine'), 'machine name is on the block face');
assert(plannerSrc.includes('Machine override'), 'block has a machine override');

console.log('passes-check phase 7 ok');
