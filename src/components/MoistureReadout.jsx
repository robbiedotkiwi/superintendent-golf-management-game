import { MOISTURE_HIDDEN } from '../data/constants.js';
import { moistureStatus, outOfBand } from '../engine/moisture.js';

function formatReading(status) {
  if (status.kind === 'hidden' || status.value === MOISTURE_HIDDEN) return 'unknown';
  const n = Math.round(status.value);
  if (status.kind === 'stale') return `${n}% stale`;
  return `${n}%`;
}

export function MoistureLine({ state, surface }) {
  const status = moistureStatus(state, surface);
  const flagged = status.kind !== 'hidden' && outOfBand(status.value, surface);
  return (
    <span className={status.kind === 'stale' || flagged ? 'text-[var(--sand)]' : undefined}>
      {formatReading(status)}
      {flagged ? ' · out of band' : ''}
    </span>
  );
}
