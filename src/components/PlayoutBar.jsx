import { PLAYOUT_SPEEDS } from '../data/constants.js';
import { currentPlayoutEvent } from '../engine/playout.js';

export default function PlayoutBar({ playout, speed, skipPref, onSpeed, onSkip, onSkipPref }) {
  const event = currentPlayoutEvent(playout);
  if (!playout) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--sand)] bg-[var(--soil)]/95 px-3 py-2 text-[var(--paint)]">
      <p className="min-w-0 flex-1 font-condensed text-xl font-bold leading-tight">
        Day {playout.day}
        {event ? ` · ${event.name}` : ''}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
        {PLAYOUT_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            onClick={() => onSpeed(value)}
            className={`border px-2 py-1 text-sm ${
              speed === value
                ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]'
                : 'border-[var(--sand)]'
            }`}
          >
            {value}x
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(skipPref)}
          onChange={(event) => onSkipPref(event.target.checked)}
        />
        Always skip
      </label>
      <button
        type="button"
        onClick={onSkip}
        className="bg-[var(--machine-orange)] px-3 py-1 text-sm font-semibold text-[var(--paint)]"
      >
        Skip
      </button>
    </div>
  );
}
