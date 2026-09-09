import { SAVE_VERSION } from '../data/constants.js';

export function hiredIds(state) {
  return (state.workers ?? []).filter((worker) => !worker.isVolunteer).map((worker) => worker.id);
}

export function emptyYearRecord(year, staffIds = []) {
  return {
    year,
    conditions: [],
    tournaments: [],
    maintenanceSpent: 0,
    capitalSpent: 0,
    staffAtStart: [...staffIds],
  };
}

export function logTournament(state, result) {
  if (!result) return state.yearRecord ?? emptyYearRecord(state.year ?? 1, hiredIds(state));
  const yearRecord = state.yearRecord ?? emptyYearRecord(state.year ?? 1, hiredIds(state));
  return {
    ...yearRecord,
    tournaments: [
      ...yearRecord.tournaments,
      { day: state.day, band: result.band, pay: result.pay, score: result.score },
    ],
  };
}

export function bumpCapitalSpent(state, amount) {
  if (!amount) return state;
  const yearRecord = state.yearRecord ?? emptyYearRecord(state.year ?? 1, hiredIds(state));
  return {
    ...state,
    yearRecord: { ...yearRecord, capitalSpent: (yearRecord.capitalSpent ?? 0) + amount },
  };
}

export function recordYearDay(state, { condition, maintenanceSpent, tournament }) {
  const yearRecord = state.yearRecord ?? emptyYearRecord(state.year ?? 1, hiredIds(state));
  const tournaments = tournament
    ? [...yearRecord.tournaments, { day: state.day, band: tournament.band, pay: tournament.pay, score: tournament.score }]
    : yearRecord.tournaments;
  return {
    ...yearRecord,
    conditions: [...yearRecord.conditions, { day: state.day, condition }],
    tournaments,
    maintenanceSpent: (yearRecord.maintenanceSpent ?? 0) + (maintenanceSpent ?? 0),
  };
}

export function buildYearReview(state) {
  const record = state.yearRecord ?? emptyYearRecord(state.year, hiredIds(state));
  const staffNow = (state.workers ?? [])
    .filter((worker) => !worker.isVolunteer)
    .map((worker) => ({ id: worker.id, name: worker.name }));
  const retained = staffNow.filter((worker) => record.staffAtStart.includes(worker.id));
  return {
    year: record.year,
    conditions: record.conditions,
    tournaments: record.tournaments,
    maintenanceSpent: record.maintenanceSpent,
    capitalSpent: record.capitalSpent,
    staffRetained: retained,
    staffNow,
    saveVersion: state.saveVersion ?? SAVE_VERSION,
  };
}
