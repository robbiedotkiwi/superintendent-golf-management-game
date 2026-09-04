import { formatMoney } from '../engine/format.js';

export default function YearReview({ review, onContinue }) {
  if (!review) return null;
  const points = review.conditions ?? [];
  const max = 100;
  const width = 420;
  const height = 120;
  const path = points
    .map((item, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      const y = height - (item.condition / max) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--soil)]/90 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-auto border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">Year {review.year} in review</h2>
        <h3 className="mt-6 text-lg font-semibold">Condition</h3>
        {points.length ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-28 w-full" role="img" aria-label="Condition over the year">
            <rect width={width} height={height} fill="var(--sand)" opacity="0.15" />
            <path d={path} fill="none" stroke="var(--machine-orange)" strokeWidth="3" />
          </svg>
        ) : (
          <p>No days recorded.</p>
        )}
        <p className="mt-2 text-sm text-[var(--sand)]">{points.length} days on the books.</p>

        <h3 className="mt-6 text-lg font-semibold">Tournaments</h3>
        {(review.tournaments ?? []).length === 0 ? (
          <p>None hosted.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {review.tournaments.map((item) => (
              <li key={`${item.day}-${item.band}`}>
                Day {item.day}: {item.band} · {Math.round(item.score)} · paid {formatMoney(item.pay)}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 text-lg font-semibold">Money spent</h3>
        <p>Maintenance {formatMoney(review.maintenanceSpent)} · Capital {formatMoney(review.capitalSpent)}</p>

        <h3 className="mt-6 text-lg font-semibold">Staff retained</h3>
        {(review.staffRetained ?? []).length === 0 ? (
          <p>Just you.</p>
        ) : (
          <p>{review.staffRetained.map((item) => item.name).join(', ')}</p>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold"
        >
          Next year
        </button>
      </section>
    </div>
  );
}
