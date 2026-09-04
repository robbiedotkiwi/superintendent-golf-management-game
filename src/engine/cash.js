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
