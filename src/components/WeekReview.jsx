import { SURFACE_LABELS } from '../data/tasks.js';
import { formatMoney } from '../engine/format.js';

function formatDelta(before, after) {
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  return `${formatValue(before)} → ${formatValue(after)} (${sign}${formatValue(delta)})`;
}

function formatValue(value) {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function WeekReview({ review, onContinue }) {
  if (!review) return null;
  const jobs = review.jobs ?? { planned: 0, completed: 0, dropped: 0 };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--soil)]/80 p-4" data-week-review>
      <section className="max-h-[90vh] w-full max-w-xl overflow-auto border-4 border-[var(--soil)] bg-[var(--sand)] p-6 text-[var(--soil)]">
        <h2 className="font-condensed text-4xl font-bold">Week in review</h2>
        <p className="mt-1 text-lg">What the plan did versus what actually ran.</p>

        <h3 className="mt-6 text-lg font-semibold">Turf quality</h3>
        <ul className="mt-2 space-y-1">
          {(review.quality ?? []).map((item) => (
            <li key={item.surface}>
              {item.label}: {formatDelta(item.before, item.after)}
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-lg font-semibold">Golfers and GM</h3>
        <p>Golfer satisfaction {formatDelta(review.satisfaction?.before, review.satisfaction?.after)}</p>
        <p>GM sentiment {formatDelta(review.gmStanding?.before, review.gmStanding?.after)}</p>

        <h3 className="mt-6 text-lg font-semibold">Jobs</h3>
        <p data-review-planned={jobs.planned} data-review-completed={jobs.completed} data-review-dropped={jobs.dropped}>
          {jobs.planned} planned · {jobs.completed} completed · {jobs.dropped} dropped
        </p>

        <h3 className="mt-6 text-lg font-semibold">Money</h3>
        <p>Spent {formatMoney(review.moneySpent ?? 0)}</p>
        <p>Casuals {formatMoney(review.casualSpend ?? 0)}</p>
        <p>Cash {formatMoney(review.cash?.before ?? 0)} → {formatMoney(review.cash?.after ?? 0)}</p>

        <h3 className="mt-6 text-lg font-semibold">Days since last done</h3>
        <ul className="mt-2 space-y-1">
          {Object.entries(review.daysSince ?? {}).map(([surface, days]) => (
            <li key={surface}>
              {SURFACE_LABELS[surface] ?? surface} — {days} days
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold text-[var(--paint)]"
        >
          Next week
        </button>
      </section>
    </div>
  );
}
