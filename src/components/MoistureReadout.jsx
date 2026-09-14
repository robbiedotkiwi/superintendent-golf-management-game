import { MOISTURE_HIDDEN } from '../data/constants.js';
import { greensStatuses, moistureStatus, outOfBand } from '../engine/moisture.js';

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

export function GreensMoistureList({ state }) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {greensStatuses(state).map((item) => (
        <li key={item.hole} className="flex justify-between gap-2">
          <span>Green {item.hole}</span>
          <span className={item.kind === 'stale' || (item.kind !== 'hidden' && outOfBand(item.value, 'greens')) ? 'text-[var(--sand)]' : undefined}>
            {formatReading(item)}
            {item.kind !== 'hidden' && outOfBand(item.value, 'greens') ? ' · out' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
