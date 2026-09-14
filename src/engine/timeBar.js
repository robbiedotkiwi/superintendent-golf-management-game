export function timeFillPercent(minutes, capacity) {
  if (capacity <= 0) return 0;
  return Math.min(100, (minutes / capacity) * 100);
}

export function timeBarOverflow(used, capacity) {
  return Math.max(0, Math.round((used ?? 0) - (capacity ?? 0)));
}

export function timeBarRemaining(used, capacity) {
  return Math.max(0, Math.round((capacity ?? 0) - (used ?? 0)));
}

export function timeBarLabel(used, capacity) {
  const cap = Math.max(0, Math.round(capacity ?? 0));
  const over = timeBarOverflow(used, cap);
  if (over > 0) return `${cap}/${cap} · ${over} over`;
  return `${timeBarRemaining(used, cap)}/${cap}`;
}
