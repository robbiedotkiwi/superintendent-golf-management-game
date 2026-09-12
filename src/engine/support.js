import {
  BUNKER_COUNT_DEFAULT,
  BUNKER_MINUTES_EACH,
  CORING_CEILING_DROP,
  CORING_GM_STANDING_HIT,
  CORING_MINUTES,
  CORING_QUALITY_DROP,
  CORING_RECOVERY_DAYS,
  CORING_SATISFACTION_HIT,
  CORING_SEASONS,
  CORING_SKIP_SEASONS_FOR_CEILING_HIT,
  CUP_CHANGE_MINUTES,
  CUP_CHANGES_REQUIRED_PER_WEEK,
  CUP_MISS_QUALITY_PENALTY,
  DRY_SPELL_DAYS,
  GENERAL_DUTIES_MINUTES,
  GENERAL_DUTIES_SKIP_WEEKS_FOR_COMMENT,
  GM_MEETING_MINUTES,
  MOISTURE_METER_MINUTES,
  ROLL_GREENS_MINUTES,
  SPRAY_FAIRWAYS_MINUTES,
  SPRAY_GREENS_TEES_MINUTES,
  SPRAY_RAIN_CLEAR_HOURS,
  SPRAY_WIND_MAX,
  TASK_CORE_GREENS,
  TASK_GENERAL_DUTIES,
  TASK_WEED_EAT,
  WEED_EATING_MINUTES,
  WET_WEATHER,
} from '../data/config.js';
import { layoutHasBunker, holeCount } from './holes.js';
import { forecastEntryForDay } from './week.js';
import { clampQuality } from './grades.js';
import { emptyAreaQuality } from './passes.js';

export function bunkerCount(state) {
  const n = holeCount(state);
  let count = 0;
  for (let id = 1; id <= n; id += 1) {
    if (layoutHasBunker(id, n)) count += 1;
  }
  return count || BUNKER_COUNT_DEFAULT;
}

export function supportMinutes(taskId, state) {
  if (taskId === 'rakeBunkers') return bunkerCount(state) * BUNKER_MINUTES_EACH;
  if (taskId === 'changeCups') return CUP_CHANGE_MINUTES;
  if (taskId === 'checkMoistureGreens' || taskId === 'checkMoistureTees' || taskId === 'checkMoistureFairways') {
    return MOISTURE_METER_MINUTES;
  }
  if (taskId === 'rollGreens' || taskId === 'extraRoll') return ROLL_GREENS_MINUTES;
  if (taskId === TASK_WEED_EAT) return WEED_EATING_MINUTES;
  if (taskId === TASK_GENERAL_DUTIES) return GENERAL_DUTIES_MINUTES;
  if (taskId === 'gmMeeting') return GM_MEETING_MINUTES;
  if (taskId === 'sprayGreens' || taskId === 'sprayTees') return SPRAY_GREENS_TEES_MINUTES;
  if (taskId === 'sprayFairways') return SPRAY_FAIRWAYS_MINUTES;
  if (taskId === TASK_CORE_GREENS) return CORING_MINUTES;
  return null;
}

export function isDrySpell(state, day = state.day) {
  for (let offset = 0; offset < DRY_SPELL_DAYS; offset += 1) {
    const entry = forecastEntryForDay(state, day - offset);
    if (WET_WEATHER.includes(entry?.type)) return false;
  }
  return true;
}

export function sprayWindowOk(state, day = state.day) {
  const today = forecastEntryForDay(state, day);
  if (WET_WEATHER.includes(today?.type)) return { ok: false, reason: 'Need a dry spray window.' };
  if ((today?.windSpeed ?? 0) > SPRAY_WIND_MAX) return { ok: false, reason: 'Wind is too high to spray.' };
  if (SPRAY_RAIN_CLEAR_HOURS > 0) {
    const next = forecastEntryForDay(state, day + 1);
    if (WET_WEATHER.includes(next?.type)) return { ok: false, reason: 'Rain is due too soon after spraying.' };
  }
  return { ok: true };
}

export function coringWindowOk(state) {
  if (!CORING_SEASONS.includes(state.season)) {
    return { ok: false, reason: 'Coring is a spring and autumn job.' };
  }
  return { ok: true };
}

export function applySupportDay(state, planned) {
  let weekCupChanges = state.weekCupChanges ?? 0;
  let weekGeneralDutiesMinutes = state.weekGeneralDutiesMinutes ?? 0;
  let areaQuality = emptyAreaQuality(state.areaQuality);
  let satisfaction = state.satisfaction;
  let gmStanding = state.gmStanding;
  let coringUntilDay = state.coringUntilDay ?? 0;
  let coredThisSeason = Boolean(state.coredThisSeason);
  const events = [];
  for (const item of planned ?? []) {
    if (item.taskId === 'changeCups') weekCupChanges += 1;
    if (item.taskId === TASK_GENERAL_DUTIES) weekGeneralDutiesMinutes += item.minutes ?? 0;
    if (item.taskId === TASK_CORE_GREENS) {
      areaQuality.greens = clampQuality(areaQuality.greens - CORING_QUALITY_DROP);
      satisfaction = (satisfaction ?? 0) - CORING_SATISFACTION_HIT;
      gmStanding = (gmStanding ?? 0) - CORING_GM_STANDING_HIT;
      coringUntilDay = state.day + CORING_RECOVERY_DAYS;
      coredThisSeason = true;
      events.push({ kind: 'coring' });
    }
  }
  if (coringUntilDay > state.day) {
    const recovery = Math.max(0, (coringUntilDay - state.day) / CORING_RECOVERY_DAYS);
    areaQuality.greens = Math.min(areaQuality.greens, 100 - CORING_QUALITY_DROP * recovery * 0.25);
  }
  return {
    weekCupChanges,
    weekGeneralDutiesMinutes,
    areaQuality,
    satisfaction,
    gmStanding,
    coringUntilDay,
    coredThisSeason,
    events,
  };
}

export function applySupportWeekEnd(state) {
  let areaQuality = emptyAreaQuality(state.areaQuality);
  const events = [];
  if ((state.weekCupChanges ?? 0) < CUP_CHANGES_REQUIRED_PER_WEEK) {
    areaQuality.greens = clampQuality(areaQuality.greens - CUP_MISS_QUALITY_PENALTY);
    events.push({ kind: 'cupMiss' });
  }
  let generalDutiesSkipWeeks = state.generalDutiesSkipWeeks ?? 0;
  if ((state.weekGeneralDutiesMinutes ?? 0) <= 0) generalDutiesSkipWeeks += 1;
  else generalDutiesSkipWeeks = 0;
  const dutiesComment = generalDutiesSkipWeeks >= GENERAL_DUTIES_SKIP_WEEKS_FOR_COMMENT;
  return { areaQuality, generalDutiesSkipWeeks, dutiesComment, events };
}

export function applyCoringSeasonTick(state) {
  if (!CORING_SEASONS.includes(state.season)) {
    return { coringSkipStreak: state.coringSkipStreak ?? 0, greensCeilingPenalty: state.greensCeilingPenalty ?? 0, coredThisSeason: false };
  }
  let streak = state.coringSkipStreak ?? 0;
  if (state.coredThisSeason) streak = 0;
  else streak += 1;
  let penalty = state.greensCeilingPenalty ?? 0;
  if (streak >= CORING_SKIP_SEASONS_FOR_CEILING_HIT) penalty += CORING_CEILING_DROP;
  return { coringSkipStreak: streak, greensCeilingPenalty: penalty, coredThisSeason: false };
}
