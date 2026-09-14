import {
  CAPEX_STATUS_GRANTED,
  CAPEX_STATUS_MISSED,
  CAPEX_STATUS_PENDING,
  CAPEX_STATUS_RELEASED,
  DAYS_PER_MONTH,
  GM_TARGET_PLATEAU_LETTER,
  GM_TARGET_RATCHET_STEPS_PER_SEASON,
  GM_TARGET_START_LETTER,
  GRADE_BANDS,
  MONTHLY_BUDGET_BASE,
  MONTHLY_BUDGET_PER_QUALITY,
  MONTHLY_GOLFERS_BASE,
  MONTHLY_GOLFERS_PER_HOLE,
  MONTHLY_GOLFERS_PER_QUALITY,
  PASS_AREAS,
  SEASON_1_CAPEX_WEEK,
  SEASON_1_YEAR,
  SEASON_CAPEX_BASE,
} from '../data/config.js';
import { DAYS_PER_WEEK } from '../data/constants.js';
import { daysUntilSeasonEnd, seasonNumberFromDay, weekOfSeason } from './calendar.js';
import { creditCapex, creditCash } from './cash.js';
import { gradeFloor } from './grades.js';
import { holeCount } from './holes.js';

export function meanPassQuality(state) {
  const values = PASS_AREAS.map((area) => Number(state.areaQuality?.[area]) || 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function golferNumbers(state) {
  return Math.round(
    MONTHLY_GOLFERS_BASE +
      MONTHLY_GOLFERS_PER_QUALITY * meanPassQuality(state) +
      MONTHLY_GOLFERS_PER_HOLE * holeCount(state),
  );
}

export function monthlyBudgetFor(state) {
  return Math.round(MONTHLY_BUDGET_BASE + MONTHLY_BUDGET_PER_QUALITY * meanPassQuality(state));
}

export function gmTargetLetter(state) {
  const start = GRADE_BANDS.findIndex((band) => band.letter === GM_TARGET_START_LETTER);
  const plateau = GRADE_BANDS.findIndex((band) => band.letter === GM_TARGET_PLATEAU_LETTER);
  const startIndex = start < 0 ? GRADE_BANDS.length - 1 : start;
  const plateauIndex = plateau < 0 ? 0 : plateau;
  const season = Math.max(1, seasonNumberFromDay(state.day));
  const steps = (season - 1) * GM_TARGET_RATCHET_STEPS_PER_SEASON;
  const index = Math.max(plateauIndex, startIndex - steps);
  return GRADE_BANDS[index]?.letter ?? GM_TARGET_START_LETTER;
}

export function gmRequiredGrade(state) {
  return gradeFloor(gmTargetLetter(state));
}

export function isSeason1(state) {
  return seasonNumberFromDay(state.day) === 1 && (state.year ?? SEASON_1_YEAR) === SEASON_1_YEAR;
}

export function isMonthlyPayoutDay(day) {
  return Number(day) > 1 && (Number(day) - 1) % DAYS_PER_MONTH === 0;
}

export function applyMonthlyBudget(state) {
  if (!isMonthlyPayoutDay(state.day)) return state;
  const amount = monthlyBudgetFor(state);
  return {
    ...creditCash(state, amount),
    lastMonthlyBudget: amount,
    lastMonthlyPayoutDay: state.day,
  };
}

export function tryReleaseSeason1Capex(state, hadGmMeeting) {
  if (!isSeason1(state)) return state;
  const status = state.capexStatus ?? CAPEX_STATUS_PENDING;
  if (status === CAPEX_STATUS_RELEASED || status === CAPEX_STATUS_MISSED) return state;
  if (weekOfSeason(state.day) < SEASON_1_CAPEX_WEEK) return state;
  if (!hadGmMeeting) return state;
  if (meanPassQuality(state) >= gmRequiredGrade(state)) {
    return {
      ...creditCapex(state, SEASON_CAPEX_BASE),
      capexStatus: CAPEX_STATUS_RELEASED,
      capexReleasedDay: state.day,
    };
  }
  return state;
}

export function applySeasonCapexGrant(state) {
  if (isSeason1(state)) return state;
  const key = `${state.year}:${state.season}`;
  if (state.capexGrantedKey === key) return state;
  return {
    ...creditCapex(state, SEASON_CAPEX_BASE),
    capexStatus: CAPEX_STATUS_GRANTED,
    capexGrantedKey: key,
  };
}

export function missSeason1CapexIfPending(state) {
  return state;
}

export function monthsUntilNextCapex(state) {
  if (isSeason1(state) && (state.capexStatus ?? CAPEX_STATUS_PENDING) === CAPEX_STATUS_PENDING) {
    const week = weekOfSeason(state.day);
    if (week >= SEASON_1_CAPEX_WEEK) return 0;
    const days = (SEASON_1_CAPEX_WEEK - week) * DAYS_PER_WEEK;
    return Math.max(0, Math.ceil(days / DAYS_PER_MONTH));
  }
  return Math.max(0, Math.ceil(daysUntilSeasonEnd(state.day) / DAYS_PER_MONTH));
}
