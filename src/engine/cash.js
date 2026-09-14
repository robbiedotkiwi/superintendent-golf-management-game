import { formatMoney } from './format.js';

export function cashOnHand(state) {
  const n = Number(state?.cash);
  return Number.isFinite(n) ? n : 0;
}

export function needsCash(state, amount) {
  const cash = cashOnHand(state);
  if (cash < amount) {
    return { ok: false, reason: `Needs ${formatMoney(amount)}, only ${formatMoney(cash)}.` };
  }
  return { ok: true };
}

export function spendCash(state, amount) {
  return { ...state, cash: cashOnHand(state) - amount };
}

export function creditCash(state, amount) {
  return { ...state, cash: cashOnHand(state) + amount };
}

export function capexOnHand(state) {
  const n = Number(state?.capex);
  return Number.isFinite(n) ? n : 0;
}

export function capitalOnHand(state) {
  return cashOnHand(state) + capexOnHand(state);
}

export function needsCapital(state, amount) {
  if (capitalOnHand(state) < amount) {
    return {
      ok: false,
      reason: `Needs ${formatMoney(amount)} capital (capex ${formatMoney(capexOnHand(state))}, cash ${formatMoney(cashOnHand(state))}).`,
    };
  }
  return { ok: true };
}

export function spendCapital(state, amount) {
  const capex = capexOnHand(state);
  const fromCapex = Math.min(capex, amount);
  return { ...state, capex: capex - fromCapex, cash: cashOnHand(state) - (amount - fromCapex) };
}

export function creditCapex(state, amount) {
  return { ...state, capex: capexOnHand(state) + amount };
}
