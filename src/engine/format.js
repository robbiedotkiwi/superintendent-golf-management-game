export function formatMoney(value) {
  return `$${Math.round(Number(value)).toLocaleString('en-US')}`;
}
