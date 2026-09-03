import {
  CAPITAL_BASE,
  GM_STANDING_MAX,
  GM_STANDING_MULT_MAX,
  GM_STANDING_MULT_MIN,
  INSOLVENT_DISMISS_STREAK,
  LEASE_RATE,
  LOAN_INTEREST,
  LOAN_LIMIT_MULTIPLIER,
  MAINTENANCE_BASE,
  SATISFACTION_MAX,
  BUDGET_SATISFACTION_OFFSET,
  SEASON_ORDER,
} from '../data/constants.js';
import { getMachine } from '../data/equipment.js';

export function gmStandingMultiplier(standing) {
  return GM_STANDING_MULT_MIN + (standing / GM_STANDING_MAX) * (GM_STANDING_MULT_MAX - GM_STANDING_MULT_MIN);
}

export function satisfactionFactor(satisfaction) {
  return BUDGET_SATISFACTION_OFFSET + satisfaction / SATISFACTION_MAX;
}

export function maintenanceGrant(satisfaction, standing) {
  return MAINTENANCE_BASE * satisfactionFactor(satisfaction) * gmStandingMultiplier(standing);
}

export function capitalGrant(satisfaction, standing) {
  return CAPITAL_BASE * satisfactionFactor(satisfaction) * gmStandingMultiplier(standing);
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
  if (amount <= 0 || amount > cap) return { ok: false, reason: `Capped at ${cap}.` };
  return { ok: true, cap };
}

export function takeLoan(state, amount) {
  const check = canTakeLoan(state, amount);
  if (!check.ok) return state;
  const due = nextSeasonStamp(state.season, state.year);
  return {
    ...state,
    cash: state.cash + amount,
    loan: { amount, repay: loanRepayment(amount), dueSeason: due.season, dueYear: due.year },
  };
}

export function canLeaseMachine(state, machineId) {
  const machine = getMachine(machineId);
  if (!machine || machine.ownedAtStart) return { ok: false, reason: 'Already in the shed.' };
  if (state.ownedMachines.includes(machineId)) return { ok: false, reason: 'Already owned.' };
  return { ok: true };
}

export function leaseMachine(state, machineId) {
  const check = canLeaseMachine(state, machineId);
  if (!check.ok) return state;
  return {
    ...state,
    ownedMachines: [...state.ownedMachines, machineId],
    leasedMachines: [...(state.leasedMachines ?? []), machineId],
    machineWear: { ...state.machineWear, [machineId]: 0 },
  };
}

export function stopLease(state, machineId) {
  if (!(state.leasedMachines ?? []).includes(machineId)) return state;
  return repossess(state, machineId);
}

function repossess(state, machineId) {
  const { [machineId]: _wear, ...machineWear } = state.machineWear;
  const { [machineId]: _broken, ...machineBroken } = state.machineBroken;
  const { [machineId]: _away, ...machineAwayUntil } = state.machineAwayUntil;
  return {
    ...state,
    ownedMachines: state.ownedMachines.filter((id) => id !== machineId),
    leasedMachines: (state.leasedMachines ?? []).filter((id) => id !== machineId),
    machineWear,
    machineBroken,
    machineAwayUntil,
  };
}

export function chargeLeases(state) {
  let next = { ...state, leasedMachines: [...(state.leasedMachines ?? [])] };
  const mail = [];
  for (const machineId of [...next.leasedMachines]) {
    const cost = leaseCost(machineId);
    if (next.maintenanceBudget >= cost) {
      next = { ...next, maintenanceBudget: next.maintenanceBudget - cost };
    } else {
      next = repossess(next, machineId);
      mail.push({
        from: 'gm',
        kind: 'repossess',
        subject: 'Lease returned',
        body: `The ${getMachine(machineId)?.name ?? machineId} went back. Maintenance could not cover the lease.`,
      });
    }
  }
  return { state: next, mail };
}

export function closeSeason(state, { yearChanged }) {
  const charged = chargeLeases(state);
  let next = charged.state;
  const leftover = next.maintenanceBudget;
  next = {
    ...next,
    cash: next.cash + leftover,
    maintenanceBudget: 0,
    capitalBudget: 0,
    lastSeasonRevenue: next.seasonRevenue ?? 0,
    seasonRevenue: 0,
  };

  next = {
    ...next,
    maintenanceBudget: maintenanceGrant(next.satisfaction, next.gmStanding),
  };
  if (yearChanged) {
    next = {
      ...next,
      capitalBudget: capitalGrant(next.satisfaction, next.gmStanding),
    };
  }

  if (next.loan && next.season === next.loan.dueSeason && next.year === next.loan.dueYear) {
    next = {
      ...next,
      maintenanceBudget: next.maintenanceBudget - next.loan.repay,
      loan: null,
    };
  }

  let insolventStreak = next.insolventStreak ?? 0;
  let dismissed = Boolean(next.dismissed);
  const insolvent = next.cash < 0;
  if (insolvent) {
    insolventStreak += 1;
    if (insolventStreak >= INSOLVENT_DISMISS_STREAK) dismissed = true;
  } else {
    insolventStreak = 0;
  }

  return {
    state: { ...next, insolventStreak, dismissed },
    leftover,
    insolvent,
    mail: charged.mail,
  };
}
