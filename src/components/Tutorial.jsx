import { DAY_LENGTH_MINUTES } from '../data/constants.js';

export default function Tutorial({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--soil)]/85 p-4">
      <section className="max-w-lg border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">Day 1</h2>
        <p className="mt-4 text-lg">
          You have {DAY_LENGTH_MINUTES} minutes. Click a surface, put a job on the bar, start the day.
          What you skip will be worse tomorrow.
        </p>
        <p className="mt-3 text-[var(--sand)]">Tab around the map. Enter selects. Escape closes a panel.</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold"
        >
          Got it
        </button>
      </section>
    </div>
  );
}
