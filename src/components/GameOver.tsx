export default function GameOver({ onNewGame }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--soil)]/90 p-6">
      <section className="max-w-lg border-4 border-[var(--sand)] bg-[var(--soil)] p-8 text-[var(--paint)]">
        <h1 className="font-condensed text-5xl font-bold">Dismissed</h1>
        <p className="mt-4 text-lg">
          Two insolvent season ends in a row. The committee has had enough. Hand in the keys.
        </p>
        <button
          type="button"
          onClick={onNewGame}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold"
        >
          New game
        </button>
      </section>
    </div>
  );
}
