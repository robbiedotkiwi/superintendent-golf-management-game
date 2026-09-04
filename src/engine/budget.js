import {
  GRANT_BONUS_AMOUNT,
  GRANT_BONUS_THRESHOLD,
  GRANT_PENALTY_AMOUNT,
  GM_STANDING_MAX,
  GM_STANDING_MULT_MAX,
  GM_STANDING_MULT_MIN,
  INSOLVENT_DISMISS_STREAK,
  LEASE_RATE,
  LOAN_INTEREST,
  LOAN_LIMIT_MULTIPLIER,
  SATISFACTION_MAX,
  BUDGET_SATISFACTION_OFFSET,
  SEASON_GRANT_BASE,
  SEASON_ORDER,
} from '../data/constants.js';
import { getMachine } from '../data/equipment.js';
import { cashOnHand, creditCash, spendCash } from './cash.js';
import { dropOwnedMachine, stampOwnedMachine } from './equipment.js';
import { formatMoney } from './format.js';

export function gmStandingMultiplier(standing) {
  return GM_STANDING_MULT_MIN + (standing / GM_STANDING_MAX) * (GM_STANDING_MULT_MAX - GM_STANDING_MULT_MIN);
}

export function satisfactionFactor(satisfaction) {
  return BUDGET_SATISFACTION_OFFSET + satisfaction / SATISFACTION_MAX;
}

export function seasonGrant(satisfaction, standing) {
  return Math.round(SEASON_GRANT_BASE * satisfactionFactor(satisfaction) * gmStandingMultiplier(standing));
}

export function grantAdjustment(forecastSatisfaction, currentSatisfaction) {
  if (forecastSatisfaction == null || !Number.isFinite(Number(forecastSatisfaction))) return 0;
  if (currentSatisfaction >= forecastSatisfaction + GRANT_BONUS_THRESHOLD) return GRANT_BONUS_AMOUNT;
  if (currentSatisfaction <= forecastSatisfaction - GRANT_BONUS_THRESHOLD) return -GRANT_PENALTY_AMOUNT;
  return 0;
}

export function nextSeasonStamp(season, year) {
  const index = SEASON_ORDER.indexOf(season);
  if (index >= SEASON_ORDER.length - 1) {
    return { season: SEASON_ORDER[0], year: year + 1 };
  }
  return { season: SEASON_ORDER[index + 1], year };
}

export function leaseCost(machineId) {
  const machine = getMachine(machineId);
  return (machine?.cost ?? 0) * LEASE_RATE;
}

export function maxLoan(lastSeasonRevenue) {
  return (lastSeasonRevenue ?? 0) * LOAN_LIMIT_MULTIPLIER;
}

export function loanRepayment(amount) {
  return amount * (1 + LOAN_INTEREST);
}

export function canTakeLoan(state, amount) {
  if (state.loan) return { ok: false, reason: 'Already carrying a loan.' };
  const cap = maxLoan(state.lastSeasonRevenue);
  if (cap <= 0) return { ok: false, reason: 'No last-season revenue to borrow against.' };
  if (amount <= 0 || amount > cap) return { ok: false, reason: `Capped at ${formatMoney(cap)}.` };
  return { ok: true, cap };
}

export function takeLoan(state, amount) {
  const check = canTakeLoan(state, amount);
  if (!check.ok) return state;
  const due = nextSeasonStamp(state.season, state.year);
  return {
    ...state,
    cash: cashOnHand(state) + amount,
    loan: { amount, repay: loanRepayment(amount), dueSeason: due.season, dueYear: due.year },
  };
}

export function canLeaseMachine(state, machineId) {
  const machine = getMachine(machineId);
  if (!machine || machine.ownedAtStart) return { ok: false, reason: 'Already in the shed.' };
  if (state.ownedMachines.includes(machineId)) return { ok: false, reason: 'Already owned.' };
  if ((state.pendingDeliveries ?? []).some((item) => item.machineId === machineId)) {
    return { ok: false, reason: 'Already on a truck.' };
  }
  return { ok: true };
}

export function leaseMachine(state, machineId) {
  const check = canLeaseMachine(state, machineId);
  if (!check.ok) return state;
  return {
    ...state,
    ...stampOwnedMachine(state, machineId),
    leasedMachines: [...(state.leasedMachines ?? []), machineId],
  };
}

export function stopLease(state, machineId) {
  if (!(state.leasedMachines ?? []).includes(machineId)) return state;
  return repossess(state, machineId);
}

function repossess(state, machineId) {
  const dropped = dropOwnedMachine(state, machineId);
  return {
    ...dropped,
    leasedMachines: (dropped.leasedMachines ?? []).filter((id) => id !== machineId),
  };
}

export function chargeLeases(state) {
  let next = { ...state, leasedMachines: [...(state.leasedMachines ?? [])] };
  const mail = [];
  for (const machineId of [...next.leasedMachines]) {
    const cost = leaseCost(machineId);
    if (cashOnHand(next) >= cost) {
      next = spendCash(next, cost);
    } else {
      next = repossess(next, machineId);
      mail.push({
        from: 'gm',
        kind: 'repossess',
        subject: 'Lease returned',
        body: `The ${getMachine(machineId)?.name ?? machineId} went back. Cash could not cover the lease.`,
      });
    }
  }
  return { state: next, mail };
}

export function closeSeason(state) {
  const charged = chargeLeases(state);
  let next = charged.state;
  const forecastSat = next.grantForecast?.satisfaction;
  const grant = seasonGrant(next.satisfaction, next.gmStanding);
  const adjustment = grantAdjustment(forecastSat, next.satisfaction);
  const posted = grant + adjustment;
  next = creditCash(
    {
      ...next,
      lastSeasonRevenue: next.seasonRevenue ?? 0,
      seasonRevenue: 0,
      grantForecast: null,
    },
    posted,
  );

  if (next.loan && next.season === next.loan.dueSeason && next.year === next.loan.dueYear) {
    next = { ...spendCash(next, next.loan.repay), loan: null };
  }

  let insolventStreak = next.insolventStreak ?? 0;
  let dismissed = Boolean(next.dismissed);
  const insolvent = cashOnHand(next) < 0;
  if (insolvent) {
    insolventStreak += 1;
    if (insolventStreak >= INSOLVENT_DISMISS_STREAK) dismissed = true;
  } else {
    insolventStreak = 0;
  }

  return {
    state: { ...next, insolventStreak, dismissed },
    grant: posted,
    adjustment,
    insolvent,
    mail: charged.mail,
  };
}

export { cashOnHand, spendCash, creditCash };
