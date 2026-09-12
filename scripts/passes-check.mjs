import { createInitialState, canPlanTask, reducer } from '../src/engine/gameState.js';
import { machineAllows, getMachine } from '../src/data/equipment.js';
import { GREENSMASTER_ID, GROUNDSMASTER_ID } from '../src/data/constants.js';
import { gradeLetter, gradeCapScore } from '../src/engine/grades.js';
import {
  hoursToPassFraction,
  applyDailyPassCap,
  machineAllowsArea,
  passClassOf,
  staffCanRunMachine,
  wearTimeMult,
  weeklyTargetQuality,
} from '../src/engine/passes.js';
import { driftQuality } from '../src/engine/qualityDrift.js';
import { migrateWorkerTier } from '../src/engine/staffTiers.js';
import {
  MAX_PASSES_PER_AREA_PER_DAY,
  PASS_CLASS_PUSH_REEL,
  PASS_CLASS_RIDE_ON_ROTARY,
  STAFF_TIER_SENIOR,
  STAFF_TIER_UNSKILLED,
  WEAR_TIME_MULT_LIGHT,
  WEAR_TIME_MULT_NONE,
} from '../src/data/config.js';

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

console.log('passes-check phase 1 ok');
