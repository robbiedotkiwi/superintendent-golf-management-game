import { readFileSync } from 'node:fs';
import { createInitialState, canPlanTask, reducer } from '../src/engine/gameState.js';
import { machineAllows, getMachine } from '../src/data/equipment.js';
import { GREENSMASTER_ID, GROUNDSMASTER_ID, GREENS_ROLLER_ID, SPRAYER_ID, CORER_ID } from '../src/data/constants.js';
import { gradeLetter, gradeCapScore, clampQuality } from '../src/engine/grades.js';
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
import { driftQuality, applyDailyQualityDrift } from '../src/engine/qualityDrift.js';
import { migrateWorkerTier } from '../src/engine/staffTiers.js';
import {
  BUNKER_DECAY_PER_DAY,
  BUNKER_RAKE_QUALITY,
  DAYS_PER_SEASON,
  FORECAST_UNRELIABLE_FROM_DAY,
  MAX_PASSES_PER_AREA_PER_DAY,
  ROLLER_PURCHASE_COST,
  SPRAYER_PURCHASE_COST,
  CORER_PURCHASE_COST,
  CORER_HIRE_PER_USE_COST,
  PASS_CLASS_PUSH_REEL,
  PASSES_REQUIRED_PER_WEEK,
  STARTING_CASH,
  VOLUNTEER_WEEKLY_HOURS,
  PASS_CLASS_RIDE_ON_ROTARY,
  PROJECT_EXPAND_3,
  STAFF_TIER_JUNIOR,
  STAFF_TIER_SENIOR,
  STAFF_TIER_UNSKILLED,
  WEAR_TIME_MULT_HEAVY,
  WEAR_TIME_MULT_LIGHT,
  WEAR_TIME_MULT_NONE,
  PLANNER_PALETTE,
} from '../src/data/config.js';
import { monthlyBudgetFor, golferNumbers, gmRequiredGrade, gmTargetLetter, tryReleaseSeason1Capex } from '../src/engine/economy.js';
import { draftFromJobId, emptySlotDraft, mowTaskIdFor, resolvePlannerJobId } from '../src/engine/slots.js';
import { autoMachineFor, blockConflicts, clampBlockResize, paletteHoursFor, paletteMachineStatus, surplusWastedHours } from '../src/engine/dayPlanner.js';
import { weekPassStrip } from '../src/engine/weekPasses.js';
import { getDayTasks, workersForPlanDay } from '../src/engine/week.js';
import { applySupportDay } from '../src/engine/support.js';
import { volunteerHoursFor, volunteerOnDuty } from '../src/engine/staffMorale.js';
import { migrateMoisture } from '../src/engine/moisture.js';
import { allowingMachines } from '../src/engine/equipment.js';
import { getTask, taskUsesMachine } from '../src/data/tasks.js';
import { forecastDaysAhead, forecastIsUnreliable } from '../src/engine/weather.js';

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
assert(seniorHours === 5.5, `senior clean push reel greens is 5.5, got ${seniorHours}`);
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
assert(next.planTemplates.some((item) => item.name === 'winter week' && Array.isArray(item.tasks)), 'named day template saved');
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
assert(gmRequiredGrade(state) === 67, 'season 1 GM target is D+');

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
assert(forecastSrc.includes('forecastIsUnreliable'), 'strip uses days-ahead reliability');
assert(!forecastSrc.includes('dayOfWeek'), 'strip no longer uses weekday for reliability');

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

const junior = { ...state.workers[0], id: 'junior', name: 'Junior', tier: STAFF_TIER_JUNIOR };
assert(paletteHoursFor(state, 'cutGreens', state.workers[0]) === 5.5, 'palette senior clean greens is 5.5');
assert(paletteHoursFor(state, 'cutGreens', junior) === 6, 'palette junior clean greens is 6.0');
const worn = { ...state, machineWear: { ...(state.machineWear ?? {}), [GREENSMASTER_ID]: 60 } };
assert(paletteHoursFor(worn, 'cutGreens', junior) === 7.5, 'palette junior 60% wear greens is 7.5');
assert(plannerSrc.includes('data-palette-hours'), 'palette shows computed hours');

const strip = weekPassStrip(state);
assert(strip.length === 4, 'week strip has four course areas');
assert(strip.every((row) => row.banked === 0 && row.owed === row.required), 'owed starts at required');
let nav = reducer(state, { type: 'SET_PLANNING_DAY', day: 2 });
assert(nav.planningDay === 2, 'day navigation moves to Tuesday');
nav = reducer(nav, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  startMinute: 60,
  minutes: 120,
});
assert(getDayTasks(nav, 2).some((item) => item.startMinute === 60), 'place on navigated day');
nav = reducer(nav, { type: 'SAVE_TEMPLATE', name: 'greens day' });
const greensTpl = nav.planTemplates.find((item) => item.name === 'greens day');
assert(Array.isArray(greensTpl?.tasks) && greensTpl.tasks.length === 1, 'day template stores current day tasks');
nav = reducer(nav, { type: 'SET_PLANNING_DAY', day: 3 });
nav = reducer(nav, { type: 'APPLY_TEMPLATE', templateId: greensTpl.id });
assert(getDayTasks(nav, 3).some((item) => item.taskId === 'cutGreens' && item.startMinute === 60), 'apply template to current day');
assert(getDayTasks(nav, 4).length === 0, 'day template does not fill the rest of the week');

const legacy = reducer(state, { type: 'SET_PLANNING_DAY', day: 2 });
const withLegacy = {
  ...legacy,
  planTemplates: [{ id: 99, name: 'old week', days: { 2: [{ taskId: 'cutTees', workerId: state.workers[0].id, startMinute: 30, minutes: 60 }] } }],
};
const appliedLegacy = reducer(withLegacy, { type: 'APPLY_TEMPLATE', templateId: 99 });
assert(getDayTasks(appliedLegacy, 2).some((item) => item.taskId === 'cutTees'), 'old week-shaped templates still apply to this weekday');

let yesterday = reducer(state, {
  type: 'PLACE_BLOCK',
  taskId: 'cutGreens',
  workerId: state.workers[0].id,
  startMinute: 90,
  minutes: 60,
});
yesterday = reducer(yesterday, { type: 'COPY_YESTERDAY', day: 2 });
assert(getDayTasks(yesterday, 2).some((item) => item.taskId === 'cutGreens' && item.startMinute === 90), 'copy yesterday keeps start time');

assert(plannerSrc.includes('data-week-strip'), 'week pass strip is on the canvas');
assert(plannerSrc.includes('data-day-prev'), 'previous day control is present');
assert(plannerSrc.includes('data-day-next'), 'next day control is present');
assert(!plannerSrc.includes('Copy last week'), 'copy last week is gone');

assert(workersForPlanDay(state, state.day).every((worker) => !worker.isCasual), 'unbooked casuals stay off the planner');
const casual = state.casualPool[0];
const bookedCasual = reducer(state, { type: 'BOOK_CASUAL', casualId: casual.id, day: state.day });
assert(
  workersForPlanDay(bookedCasual, state.day).some((worker) => worker.id === casual.id),
  'rostered casual appears as a planner row that day',
);
assert(
  !workersForPlanDay(bookedCasual, state.day + 1).some((worker) => worker.id === casual.id),
  'casual is absent on days they are not booked',
);

const crewSrc = readFileSync(new URL('../src/components/Crew.jsx', import.meta.url), 'utf8');
const sidebarSrc = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert(crewSrc.includes('data-casual-hire'), 'casuals live in the hiring area');
assert(crewSrc.indexOf('data-casual-hire') < crewSrc.indexOf('>Casuals<'), 'casuals heading is in the hire tab');
assert(!sidebarSrc.includes('onBookCasual'), 'casuals are off the crew sidebar');

const bunkered = applyDailyQualityDrift(state, [], state.weekPasses);
assert(
  bunkered.areaQuality.bunkers === clampQuality(state.areaQuality.bunkers - BUNKER_DECAY_PER_DAY),
  'bunkers decay each day',
);
const raked = applySupportDay({ ...state, areaQuality: bunkered.areaQuality }, [{ taskId: 'rakeBunkers' }]);
assert(raked.areaQuality.bunkers === BUNKER_RAKE_QUALITY, 'rake resets bunkers to 100');

let gapResize = reducer(state, {
  type: 'PLACE_BLOCK',
  taskId: 'generalDuties',
  workerId: state.workers[0].id,
  startMinute: 0,
  minutes: 60,
});
gapResize = reducer(gapResize, {
  type: 'PLACE_BLOCK',
  taskId: 'weedEat',
  workerId: state.workers[0].id,
  startMinute: 180,
  minutes: 60,
});
const firstBlock = gapResize.plannedTasks[0];
gapResize = reducer(gapResize, {
  type: 'RESIZE_BLOCK',
  planId: firstBlock.planId,
  startMinute: 0,
  minutes: 480,
});
const resized = gapResize.plannedTasks.find((item) => item.planId === firstBlock.planId);
assert(resized.startMinute === 0 && resized.minutes === 180, 'resize extends up to the next occupied block');
const dayLen = workersForPlanDay(state, state.day)[0].minutesToday;
let toDayEnd = reducer(state, {
  type: 'PLACE_BLOCK',
  taskId: 'generalDuties',
  workerId: state.workers[0].id,
  startMinute: 0,
  minutes: 60,
});
toDayEnd = reducer(toDayEnd, {
  type: 'RESIZE_BLOCK',
  planId: toDayEnd.plannedTasks[0].planId,
  startMinute: 0,
  minutes: 9999,
});
assert(toDayEnd.plannedTasks[0].minutes === dayLen, 'resize extends up to remaining day length');
const shrunk = clampBlockResize(toDayEnd, toDayEnd.plannedTasks[0], toDayEnd.day, 0, 30);
assert(shrunk.minutes === 30, 'resize can shrink');

assert(forecastDaysAhead(5, 7) === 2, 'days-ahead is calendar distance');
assert(!forecastIsUnreliable(5, 5), 'day 5 of a week is reliable when it is today');
assert(!forecastIsUnreliable(5, 6), 'day 6 is 1 ahead of day 5');
assert(!forecastIsUnreliable(5, 7), 'day 7 is 2 ahead of day 5');
assert(!forecastIsUnreliable(6, 6), 'day 6 of a week is reliable when it is today');
assert(!forecastIsUnreliable(6, 7), 'day 7 is 1 ahead of day 6');
assert(!forecastIsUnreliable(7, 7), 'day 7 of a week is reliable when it is today');
assert(
  forecastIsUnreliable(1, 1 + FORECAST_UNRELIABLE_FROM_DAY),
  'unreliable from the configured days-ahead threshold',
);
assert(
  !forecastIsUnreliable(1, 1 + FORECAST_UNRELIABLE_FROM_DAY - 1),
  'the day before the threshold stays reliable',
);

assert(!taskUsesMachine(getTask('changeCups')), 'cup changes need no machine');
assert(!taskUsesMachine(getTask('checkMoistureGreens')), 'moisture meter needs no machine');
assert(!taskUsesMachine(getTask('weedEat')), 'weed eating needs no machine');
assert(allowingMachines(state, getTask('changeCups')).length === 0, 'cups do not bind a mower');
assert(taskUsesMachine(getTask('sprayGreens')), 'spray requires a machine class');
assert(taskUsesMachine(getTask('coreGreens')), 'coring requires a machine class');
assert(taskUsesMachine(getTask('rollGreens')), 'rolling requires a machine class');
assert(getTask('coreGreens').machine.hireable, 'corer is hireable per use');
assert(paletteMachineStatus(state, getTask('sprayGreens')).ok === false, 'spray palette blocked without sprayer');
assert(paletteMachineStatus(state, getTask('rollGreens')).ok === false, 'roll palette blocked without roller');
assert(paletteMachineStatus(state, getTask('coreGreens')).ok === true, 'coring palette open via hire');
assert(machineAllows(getMachine(SPRAYER_ID), 'greens', getTask('sprayGreens')), 'sprayer allows spray greens');
assert(!machineAllows(reel, 'greens', getTask('sprayGreens')), 'mower cannot spray');
assert(machineAllows(getMachine(GREENS_ROLLER_ID), 'greens', getTask('rollGreens')), 'roller allows rolling');
assert(machineAllows(getMachine(CORER_ID), 'greens', getTask('coreGreens')), 'corer allows coring');
assert(getMachine(GREENS_ROLLER_ID).cost === ROLLER_PURCHASE_COST, 'roller priced from config');
assert(getMachine(SPRAYER_ID).cost === SPRAYER_PURCHASE_COST, 'sprayer priced from config');
assert(getMachine(CORER_ID).cost === CORER_PURCHASE_COST, 'corer priced from config');
assert(CORER_HIRE_PER_USE_COST > 0, 'corer hire cost is in config');

const plannerUi = readFileSync(new URL('../src/components/DayPlanner.jsx', import.meta.url), 'utf8');
assert(plannerUi.includes('taskUsesMachine(task)'), 'planner hides selector from the task property');
assert(plannerUi.includes('paletteMachineStatus'), 'planner reads machine requirement for palette gating');
assert(!plannerUi.includes("taskId === 'sprayGreens'"), 'no per-task machine special cases in the planner');

assert(typeof state.moisture.greens === 'number', 'moisture greens is one area value');
assert(typeof state.moisture.tees === 'number', 'moisture tees is one area value');
assert(typeof state.moisture.fairways === 'number', 'moisture fairways is one area value');
assert(state.handWaterTargets == null, 'per-hole hand water targets removed');
const migratedMoist = migrateMoisture({
  moisture: { greens: [40, 50, 60], tees: 45, fairways: 42 },
  moistureReadDay: { greens: [1, 2, 3], tees: 1, fairways: 1 },
});
assert(migratedMoist.moisture.greens === 50, 'old per-hole greens moisture averages');
assert(!Array.isArray(migratedMoist.moisture.greens), 'migrated greens moisture is a number');
const moistureEngine = readFileSync(new URL('../src/engine/moisture.js', import.meta.url), 'utf8');
assert(!moistureEngine.includes('greensStatuses'), 'per-hole moisture statuses removed');
const moistureUi = readFileSync(new URL('../src/components/MoistureReadout.jsx', import.meta.url), 'utf8');
assert(!moistureUi.includes('GreensMoistureList'), 'per-hole moisture list UI removed');
const irrigationUi = readFileSync(new URL('../src/components/IrrigationWeekTab.jsx', import.meta.url), 'utf8');
assert(irrigationUi.includes('MoistureLine'), 'irrigation tab shows area moisture');
assert(irrigationUi.includes('data-pond-kit'), 'irrigation tab hosts pond and kit buys');
assert(irrigationUi.includes('onBuyWeatherStation'), 'weather station buy is on irrigation');

const paletteIds = PLANNER_PALETTE.map((item) => item.taskId);
for (const taskId of [
  'clearDebris',
  'handWater',
  'checkMoistureTees',
  'checkMoistureFairways',
  'fertiliseGreens',
  'pondDose',
  'pondRescue',
  'doubleCutGreens',
]) {
  assert(paletteIds.includes(taskId), `${taskId} belongs on the week-plan palette`);
}
const turfSrc = readFileSync(new URL('../src/components/Turf.jsx', import.meta.url), 'utf8');
assert(!turfSrc.includes('TURF_SHOW_LEGACY_TABS'), 'legacy turf tabs removed');
assert(!turfSrc.includes('MapJobPopover'), 'turf does not host the old map job popover');
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert(!appSrc.includes('MapJobPopover'), 'map job popover removed');
assert(!appSrc.includes('WeatherStrip'), 'unused weather strip stays gone');

assert(PASSES_REQUIRED_PER_WEEK.greens === 4, 'A greens needs 4 passes');
assert(PASSES_REQUIRED_PER_WEEK.tees === 2, 'A tees needs 2 passes');
assert(PASSES_REQUIRED_PER_WEEK.fairways === 1, 'A fairways needs 1 pass');
assert(PASSES_REQUIRED_PER_WEEK.rough === 1, 'A rough needs 1 pass');
assert(volunteerHoursFor(state) === VOLUNTEER_WEEKLY_HOURS, 'volunteer is 8 hours weekly');
assert(volunteerOnDuty({ ...state, satisfaction: 100 }, state.day) === volunteerOnDuty(state, state.day), 'no second volunteer day');
assert(!crewSrc.includes('second volunteer day'), 'two-day volunteer upgrade copy removed');
assert(gmTargetLetter(state) === 'D+', 'season 1 GM target letter is D+');
assert(gmTargetLetter({ ...state, day: 1 + DAYS_PER_SEASON }) === 'C-', 'season 2 ratchets one grade step');
assert(gmTargetLetter({ ...state, day: 1 + 6 * DAYS_PER_SEASON }) === 'B+', 'GM target plateaus at B+');
assert(gmTargetLetter({ ...state, day: 1 + 12 * DAYS_PER_SEASON }) === 'B+', 'GM target stays at B+ past the plateau');
const missed = tryReleaseSeason1Capex(
  {
    ...state,
    day: 15,
    areaQuality: { greens: 0, tees: 0, fairways: 0, rough: 0 },
    capexStatus: 'pending',
  },
  true,
);
assert(missed.capexStatus !== 'missed', 'season 1 has no funding penalty');
assert(STARTING_CASH >= 2500, 'starting cash covers a breakdown or a bad week');

console.log('passes-check phase 7 ok');
