import { POND_LOW_FRACTION } from '../data/constants.js';

export default function PondLevelBar({ volume, capacity }) {
  const pct = Math.max(0, Math.min(100, capacity ? (volume / capacity) * 100 : 0));
  const low = POND_LOW_FRACTION * 100;
  return (
    <div
      className="relative mt-2 h-6 w-full border border-[var(--sand)] bg-[var(--paint)]/10"
      data-pond-level
      role="img"
      aria-label={`Pond ${Math.round(volume)} of ${capacity} cubic metres`}
    >
      <div className="h-full bg-[var(--pond-water)]" style={{ width: `${pct}%` }} />
      <div
        className="absolute top-0 h-full w-0.5 bg-[var(--machine-orange)]"
        style={{ left: `${low}%` }}
        data-pond-low-mark
        title="Low threshold"
      />
    </div>
  );
}
