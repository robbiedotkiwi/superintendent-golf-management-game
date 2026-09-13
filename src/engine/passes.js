import {
  AUTONOMOUS_AREAS,
  GRADE_CAP_LETTER,
  GROW_IN_QUALITY_OFFSET,
  GROW_IN_PASSES_REQUIRED_MULT,
  MAX_PASSES_PER_AREA_PER_DAY,
  PASS_AREAS,
  PASS_CLASS_AUTONOMOUS,
  PASS_CLASS_BY_CATALOG,
  PASS_CLASS_ROLLER,
  PASS_HOURS,
  PASSES_REQUIRED_PER_WEEK,
  ROLL_GRADE_CONTRIBUTION,
  ROLL_PASS_HOURS,
  STARTING_AREA_QUALITY,
  OWN_MOWER_PASS_CLASS,
  WEAR_STEP_HEAVY_MAX,
  WEAR_STEP_LIGHT_MAX,
  WEAR_STEP_NONE_MAX,
  WEAR_TIME_MULT_CRITICAL,
  WEAR_TIME_MULT_HEAVY,
  WEAR_TIME_MULT_LIGHT,
  WEAR_TIME_MULT_NONE,
  WEEKLY_TARGET_QUALITY_SCALE,
  WET_PASS_TIME_MULT,
  WET_WEATHER,
} from '../data/config.js';
import { getMachine, machineClass } from '../data/equipment.js';
import { getTask } from '../data/tasks.js';
import { WEAR_MAX } from '../data/constants.js';
import { applyDurationModifier, hoursToMinutes, minutesToHours, roundDurationHours } from './duration.js';
import { clampQuality, gradeCapScore, gradeLetter } from './grades.js';
import { staffCanRunClass, staffPassTimeMult } from './staffTiers.js';
import { mapHoleSurfaces } from './holes.js';

export function emptyAreaMap(value = 0) {
  return Object.fromEntries(PASS_AREAS.map((area) => [area, value]));
}

export function emptyAreaListMap() {
  return Object.fromEntries(PASS_AREAS.map((area) => [area, []]));
}

export function emptyAreaQuality(source) {
  return {
    greens: source?.greens ?? STARTING_AREA_QUALITY.greens,
    tees: source?.tees ?? STARTING_AREA_QUALITY.tees,
    fairways: source?.fairways ?? STARTING_AREA_QUALITY.fairways,
    rough: source?.rough ?? STARTING_AREA_QUALITY.rough,
    bunkers: source?.bunkers ?? STARTING_AREA_QUALITY.bunkers,
  };
}

export function emptyWeekPassState() {
  return {
    weekPasses: emptyAreaMap(0),
    weekWastedHours: emptyAreaMap(0),
    weekPassDays: emptyAreaListMap(),
    weekRollPasses: emptyAreaMap(0),
    weekCupChanges: 0,
    weekGeneralDutiesMinutes: 0,
  };
}

export function passClassOf(machine) {
  if (!machine) return null;
  if (typeof machine === 'string') return passClassOf(getMachine(machine));
  if (machine.passClass) return machine.passClass;
  const catalog = machineClass(machine);
  return PASS_CLASS_BY_CATALOG[catalog] ?? null;
}

export function passHoursTable(passClass) {
  return PASS_HOURS[passClass] ?? null;
}

export function basePassHours(passClass, area) {
  if (passClass === PASS_CLASS_ROLLER && area === 'greens') return ROLL_PASS_HOURS;
  const hours = passHoursTable(passClass)?.[area];
  return hours == null ? null : hours;
}

export function machineAllowsArea(machine, area) {
  if (!machine || !area) return false;
  const cls = passClassOf(machine);
  if (cls === PASS_CLASS_ROLLER) return area === 'greens';
  if (cls === PASS_CLASS_AUTONOMOUS) return AUTONOMOUS_AREAS.includes(area);
  return basePassHours(cls, area) != null;
}

export function wearTimeMult(wear) {
  const n = Math.max(0, Math.min(WEAR_MAX, Number(wear) || 0));
  if (n < WEAR_STEP_NONE_MAX) return WEAR_TIME_MULT_NONE;
  if (n < WEAR_STEP_LIGHT_MAX) return WEAR_TIME_MULT_LIGHT;
  if (n < WEAR_STEP_HEAVY_MAX) return WEAR_TIME_MULT_HEAVY;
  return WEAR_TIME_MULT_CRITICAL;
}

export function wearTimeDeltaHours(baseHours, wear) {
  if (baseHours == null) return 0;
  const base = roundDurationHours(baseHours);
  return applyDurationModifier(base, wearTimeMult(wear)) - base;
}

export function passHoursFor(state, machineId, area, worker, options = {}) {
  const machine = machineId ? getMachine(machineId) : null;
  const cls = machine ? passClassOf(machine) : options.passClass ?? null;
  const base = basePassHours(cls, area);
  if (base == null) return null;
  const wear = machineId ? (state?.machineWear?.[machineId] ?? 0) : 0;
  const wet = options.skipWet ? 1 : WET_WEATHER.includes(state?.weather) ? WET_PASS_TIME_MULT : 1;
  const staff =
    cls === PASS_CLASS_AUTONOMOUS || options.ignoreStaff ? 1 : staffPassTimeMult(worker);
  let hours = roundDurationHours(base);
  hours = applyDurationModifier(hours, wearTimeMult(wear));
  hours = applyDurationModifier(hours, staff);
  hours = applyDurationModifier(hours, wet);
  return hours > 0 ? hours : null;
}

export function passMinutesFor(state, machineId, area, worker, options = {}) {
  const hours = passHoursFor(state, machineId, area, worker, options);
  if (hours == null) return null;
  return hoursToMinutes(hours);
}

export function combinePassJobs(jobs) {
  let raw = 0;
  let totalHours = 0;
  for (const job of jobs ?? []) {
    const passHours = Number(job.passHours) || 0;
    const hours = Number(job.hours) || 0;
    if (!(passHours > 0) || hours <= 0) continue;
    raw += hours / passHours;
    totalHours += hours;
  }
  const effective = raw > 0 ? totalHours / raw : 0;
  return applyDailyPassCap(raw, 0, effective);
}

export function passJobsFromPlanned(state, planned, workers = []) {
  const grouped = Object.fromEntries(PASS_AREAS.map((area) => [area, []]));
  const rolls = Object.fromEntries(PASS_AREAS.map((area) => [area, []]));
  for (const job of planned ?? []) {
    const task = getTask(job.taskId) ?? {
      id: job.taskId,
      surface: job.surface,
      mowing: job.taskId === 'autonomousMower' || job.mowing,
    };
    const surface = task.surface ?? job.surface;
    if (task.id === 'rollGreens' || task.id === 'extraRoll') {
      const worker = (workers ?? []).find((item) => item.id === job.workerId);
      const passHours = passHoursFor(state, job.machineId, 'greens', worker, { skipWet: true, passClass: job.machineId ? undefined : PASS_CLASS_ROLLER });
      const hours = passHours ?? ROLL_PASS_HOURS;
      rolls.greens.push({ hours: minutesToHours(job.minutes), passHours: hours });
      continue;
    }
    if (!task.mowing && job.taskId !== 'autonomousMower') continue;
    if (!PASS_AREAS.includes(surface)) continue;
    const worker = (workers ?? []).find((item) => item.id === job.workerId);
    const autonomous = job.taskId === 'autonomousMower' || job.ignoreStaff;
    const options = { ignoreStaff: autonomous };
    if ((job.ownMower && !job.machineId) || (!job.machineId && worker?.ownMower)) {
      options.passClass = OWN_MOWER_PASS_CLASS;
    }
    const passHours = passHoursFor(state, job.machineId, surface, worker, options);
    if (!(passHours > 0)) continue;
    grouped[surface].push({ hours: minutesToHours(job.minutes), passHours });
  }
  return { grouped, rolls };
}

export function resolveDayPasses(state, planned, workers = []) {
  const { grouped, rolls } = passJobsFromPlanned(state, planned, workers);
  const passes = emptyAreaMap(0);
  const wastedHours = emptyAreaMap(0);
  const rollPasses = emptyAreaMap(0);
  const cappedAreas = [];
  for (const area of PASS_AREAS) {
    const result = combinePassJobs(grouped[area]);
    passes[area] = result.pass;
    wastedHours[area] = result.wastedHours;
    rollPasses[area] = combinePassJobs(rolls[area]).pass * ROLL_GRADE_CONTRIBUTION;
    if (result.pass >= MAX_PASSES_PER_AREA_PER_DAY && result.pass > 0) cappedAreas.push(area);
  }
  return { passes, wastedHours, rollPasses, cappedAreas };
}

export function applyWeekPasses(state, dayResult, day = state.day) {
  const weekPasses = { ...(state.weekPasses ?? emptyAreaMap(0)) };
  const weekWastedHours = { ...(state.weekWastedHours ?? emptyAreaMap(0)) };
  const weekPassDays = { ...(state.weekPassDays ?? emptyAreaListMap()) };
  const weekRollPasses = { ...(state.weekRollPasses ?? emptyAreaMap(0)) };
  for (const area of PASS_AREAS) {
    weekPasses[area] = (weekPasses[area] ?? 0) + (dayResult.passes[area] ?? 0);
    weekWastedHours[area] = (weekWastedHours[area] ?? 0) + (dayResult.wastedHours[area] ?? 0);
    weekRollPasses[area] = (weekRollPasses[area] ?? 0) + (dayResult.rollPasses?.[area] ?? 0);
    const days = [...(weekPassDays[area] ?? [])];
    if (dayResult.cappedAreas.includes(area) && !days.includes(day)) days.push(day);
    weekPassDays[area] = days;
  }
  return { weekPasses, weekWastedHours, weekPassDays, weekRollPasses };
}

export function areaGradeCap(state, area) {
  let cap = bestMachineCap(state, area)?.score ?? 100;
  if (area === 'greens') cap -= state.greensCeilingPenalty ?? 0;
  return Math.max(0, cap);
}

export function hoursToPassFraction(hoursBooked, passHours) {
  if (!(passHours > 0)) return 0;
  return (Number(hoursBooked) || 0) / passHours;
}

export function applyDailyPassCap(rawPass, wastedHours, passHours) {
  const capped = Math.min(MAX_PASSES_PER_AREA_PER_DAY, Math.max(0, rawPass));
  const surplusPasses = Math.max(0, rawPass - MAX_PASSES_PER_AREA_PER_DAY);
  const wasted = (Number(wastedHours) || 0) + surplusPasses * (passHours || 0);
  return { pass: capped, wastedHours: wasted };
}

export function machineGradeCapLetter(machine, area) {
  const cls = passClassOf(machine);
  return GRADE_CAP_LETTER[cls]?.[area] ?? null;
}

export function machineGradeCapScore(machine, area) {
  const letter = machineGradeCapLetter(machine, area);
  if (!letter) return null;
  return gradeCapScore(letter);
}

export function bestMachineCap(state, area) {
  let best = null;
  for (const id of state.ownedMachines ?? []) {
    const machine = getMachine(id);
    if (!machineAllowsArea(machine, area)) continue;
    const score = machineGradeCapScore(machine, area);
    if (score == null) continue;
    if (best == null || score > best.score) best = { machine, score, letter: machineGradeCapLetter(machine, area) };
  }
  return best;
}

export function growInActive(state, area) {
  return growInOffset(state, area) !== 0;
}

export function passesRequired(state, area) {
  const base = PASSES_REQUIRED_PER_WEEK[area] ?? 1;
  if (growInActive(state, area)) return base * GROW_IN_PASSES_REQUIRED_MULT;
  return base;
}

export function weeklyPassRatio(passes, area, required) {
  const need = required ?? PASSES_REQUIRED_PER_WEEK[area] ?? 1;
  if (!(need > 0)) return 0;
  return (Number(passes) || 0) / need;
}

export function weeklyTargetQuality(passes, capScore) {
  const ratio = Math.max(0, passes);
  const uncapped = Math.min(WEEKLY_TARGET_QUALITY_SCALE, ratio * WEEKLY_TARGET_QUALITY_SCALE);
  if (capScore == null) return uncapped;
  return Math.min(uncapped, capScore);
}

export function growInOffset(state, area) {
  const until = state?.growInUntil?.[area];
  if (until == null) return 0;
  if ((state?.day ?? 0) > until) return 0;
  return GROW_IN_QUALITY_OFFSET;
}

export function applyAreaQualityToHoles(holes, areaQuality) {
  const q = emptyAreaQuality(areaQuality);
  let next = holes;
  for (const area of [...PASS_AREAS, 'bunkers']) {
    next = mapHoleSurfaces(next, area, (record) =>
      record ? { ...record, quality: clampQuality(q[area] ?? record.quality) } : record,
    );
  }
  return next;
}

export function syncHolesFromAreaQuality(state) {
  return {
    ...state,
    holes: applyAreaQualityToHoles(state.holes, state.areaQuality),
  };
}

export function projectedWeeklyGrade(state) {
  const cap = (area) => bestMachineCap(state, area)?.score ?? 100;
  return Object.fromEntries(
    PASS_AREAS.map((area) => {
      const required = PASSES_REQUIRED_PER_WEEK[area];
      const achieved = state.weekPasses?.[area] ?? 0;
      const target = weeklyTargetQuality(weeklyPassRatio(achieved, area), cap(area));
      return [
        area,
        {
          achieved,
          required,
          wastedHours: state.weekWastedHours?.[area] ?? 0,
          dailyCapped: Boolean(state.weekPassDays?.[area]?.includes(state.day)),
          target,
          letter: gradeLetter(target),
          cappedByMachine: weeklyPassRatio(achieved, area) * 100 > cap(area) + 0.01,
        },
      ];
    }),
  );
}

export function rollPassContribution(hoursBooked, passHours) {
  return hoursToPassFraction(hoursBooked, passHours) * ROLL_GRADE_CONTRIBUTION;
}

export function staffCanRunMachine(worker, machine) {
  return staffCanRunClass(worker, passClassOf(machine));
}
