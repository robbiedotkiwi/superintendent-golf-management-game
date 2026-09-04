import { FORECAST_FUEL_LOOKBACK_DAYS, POND_DOSE_COST, POND_DOSE_WEEK_DAYS, POND_DOSING_LABEL } from '../data/constants.js';
import { getMachine } from '../data/equipment.js';
import { leaseCost, seasonGrant } from './budget.js';
import { daysUntilSeasonEnd, seasonEndDay } from './calendar.js';
import { cashOnHand } from './cash.js';
import { wageBill } from './staff.js';
import { daysSincePondDose } from './irrigation.js';

function paidWorkers(state) {
  return (state.workers ?? []).filter((worker) => !worker.isVolunteer && (worker.wage ?? 0) > 0);
}

export function wageForecastLines(state) {
  const days = daysUntilSeasonEnd(state.day);
  return paidWorkers(state).map((worker) => ({
    id: worker.id,
    label: worker.name,
    days,
    daily: worker.wage,
    amount: worker.wage * days,
  }));
}

export function leaseForecastLines(state) {
  return (state.leasedMachines ?? []).map((id) => ({
    id,
    label: getMachine(id)?.name ?? id,
    amount: leaseCost(id),
  }));
}

export function pondDoseDueDays(state) {
  const end = seasonEndDay(state.day);
  const days = [];
  let nextDue =
    daysSincePondDose(state) >= POND_DOSE_WEEK_DAYS
      ? state.day
      : (Number(state.lastPondDoseDay) || 0) + POND_DOSE_WEEK_DAYS;
  for (let day = nextDue; day <= end; day += POND_DOSE_WEEK_DAYS) {
    days.push(day);
  }
  return days;
}

export function pondDosingForecast(state) {
  const days = pondDoseDueDays(state);
  if (!days.length) return null;
  return {
    label: POND_DOSING_LABEL,
    days: days.length,
    daily: POND_DOSE_COST,
    amount: POND_DOSE_COST * days.length,
  };
}

export function deliveryForecastLines(state) {
  const end = seasonEndDay(state.day);
  return (state.pendingDeliveries ?? [])
    .filter((item) => item.arrivesDay <= end)
    .map((item) => ({
      id: item.id,
      label: getMachine(item.machineId)?.name ?? item.machineId,
      arrivesDay: item.arrivesDay,
      prepaid: item.price ?? 0,
      amount: 0,
    }));
}

export function loanForecast(state) {
  if (!state.loan) return null;
  return {
    amount: state.loan.repay,
    dueSeason: state.loan.dueSeason,
    dueYear: state.loan.dueYear,
  };
}

export function projectedFuelSpend(state) {
  const remaining = daysUntilSeasonEnd(state.day);
  const start = state.day - FORECAST_FUEL_LOOKBACK_DAYS;
  const spent = (state.fuelSpendLog ?? [])
    .filter((entry) => entry.day >= start && entry.day < state.day)
    .reduce((total, entry) => total + (entry.spend ?? 0), 0);
  if (remaining <= 0) return 0;
  return Math.round((spent / FORECAST_FUEL_LOOKBACK_DAYS) * remaining);
}

export function expectedGrant(state) {
  return seasonGrant(state.satisfaction, state.gmStanding);
}

function firstNegativeDay(state, fuel) {
  const end = seasonEndDay(state.day);
  const remaining = daysUntilSeasonEnd(state.day);
  const dailyWage = wageBill(state.workers);
  const dailyFuel = remaining > 0 ? fuel / remaining : 0;
  const leases = leaseForecastLines(state).reduce((total, line) => total + line.amount, 0);
  const grant = expectedGrant(state);
  const loan = loanForecast(state)?.amount ?? 0;
  const doseDays = new Set(pondDoseDueDays(state));
  let cash = cashOnHand(state);
  for (let day = state.day; day <= end; day += 1) {
    cash -= dailyWage + dailyFuel;
    if (doseDays.has(day)) cash -= POND_DOSE_COST;
    if (day === end) {
      cash -= leases;
      cash += grant;
      cash -= loan;
    }
    if (cash < 0) return day;
  }
  return null;
}

export function seasonCashForecast(state) {
  const cashNow = cashOnHand(state);
  const wages = wageForecastLines(state);
  const leases = leaseForecastLines(state);
  const dosing = pondDosingForecast(state);
  const deliveries = deliveryForecastLines(state);
  const loan = loanForecast(state);
  const fuel = projectedFuelSpend(state);
  const grant = expectedGrant(state);
  const committed =
    wages.reduce((total, line) => total + line.amount, 0) +
    leases.reduce((total, line) => total + line.amount, 0) +
    (dosing?.amount ?? 0) +
    deliveries.reduce((total, line) => total + line.amount, 0) +
    (loan?.amount ?? 0);
  const closing = cashNow - committed - fuel + grant;
  return {
    cashNow,
    remainingDays: daysUntilSeasonEnd(state.day),
    wages,
    leases,
    dosing,
    deliveries,
    loan,
    fuel,
    grant,
    closing,
    insolventDay: firstNegativeDay(state, fuel),
  };
}
