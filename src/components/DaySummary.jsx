import { SURFACE_LABELS } from '../data/tasks.js';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCondition(value) {
  return Math.round(value);
}

export default function DaySummary({ summary, onContinue }) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--soil)]/80 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-auto border-4 border-[var(--soil)] bg-[var(--sand)] p-6 text-[var(--soil)]">
        <h2 className="font-condensed text-4xl font-bold">Day {summary.day} done</h2>
        <p className="mt-1 text-lg">
          Course condition {formatCondition(summary.conditionBefore)} → {formatCondition(summary.conditionAfter)}
        </p>

        <h3 className="mt-6 text-lg font-semibold">Done</h3>
        {summary.done.length === 0 ? (
          <p>Nothing went out. The course sat.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {summary.done.map((item) => (
              <li key={`${item.taskId}-${item.surface ?? 'none'}`}>
                {item.before == null
                  ? `${item.name} · ${item.minutes} min`
                  : `${item.name}: ${SURFACE_LABELS[item.surface]} ${formatQuality(item.before)} → ${formatQuality(item.after)}`}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 text-lg font-semibold">Skipped</h3>
        {summary.skipped.length === 0 ? (
          <p>Every surface got a visit.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {summary.skipped.map((item) => (
              <li key={item.surface}>
                {SURFACE_LABELS[item.surface]} {formatQuality(item.before)} → {formatQuality(item.after)}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 text-lg font-semibold">Dropped</h3>
        {summary.dropped?.length ? (
          <ul className="mt-2 space-y-1">
            {summary.dropped.map((item) => (
              <li key={`${item.taskId}-dropped`}>
                {item.taskId} ran out of time after interruptions ({item.minutes} min)
              </li>
            ))}
          </ul>
        ) : (
          <p>Nothing dropped.</p>
        )}
        {summary.wages ? <p className="mt-3">Wages {summary.wages}</p> : null}
        {summary.gmWarning ? <p className="mt-2">GM warning: neighbours are complaining about the early start.</p> : null}
        {summary.neighbourFine ? <p className="mt-2">Fine {summary.neighbourFine} for the early starts.</p> : null}
        {summary.breakdowns?.length ? (
          <p className="mt-2">Broke down: {summary.breakdowns.join(', ')}</p>
        ) : null}
        {summary.mainsCost ? (
          <p className="mt-2">
            Mains water {summary.mainsM3} m³ · {summary.mainsCost}
          </p>
        ) : null}
        {summary.pond ? (
          <p className="mt-2">
            Pond {Math.round(summary.pond.volume)} m³ · health {Math.round(summary.pond.health)}
          </p>
        ) : null}
        {summary.materialsSpent ? <p className="mt-2">Materials {summary.materialsSpent} from maintenance</p> : null}
        {summary.outbreaks?.length ? (
          <p className="mt-2">
            Outbreak: {summary.outbreaks.map((item) => `${SURFACE_LABELS[item.surface]} −${item.drop}`).join(', ')}
          </p>
        ) : null}
        {summary.diseaseOngoing?.length ? (
          <p className="mt-2">
            Disease still eating: {summary.diseaseOngoing.map((item) => SURFACE_LABELS[item.surface]).join(', ')}
          </p>
        ) : null}
        {summary.seasonClose ? (
          <p className="mt-2">
            Season closed. Maintenance leftover {Math.round(summary.seasonClose.leftover)} rolled to cash.
            {summary.seasonClose.insolvent ? ' In the red.' : ''}
            {summary.seasonClose.dismissed ? ' Dismissed.' : ''}
          </p>
        ) : null}
        {summary.tournament ? (
          <p className="mt-2">
            Tournament {summary.tournament.band}
            {summary.tournament.rained ? ' (rained off the top bands)' : ''} · score{' '}
            {Math.round(summary.tournament.score)} · paid {summary.tournament.pay} · sat{' '}
            {summary.tournament.satisfaction}
          </p>
        ) : null}
        {summary.projectsCompleted?.length ? (
          <p className="mt-2">Finished: {summary.projectsCompleted.join(', ')}</p>
        ) : null}

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold text-[var(--paint)]"
        >
          Next day
        </button>
      </section>
    </div>
  );
}
