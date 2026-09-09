export default function GmTalk({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--soil)]/85 p-4">
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">{message.from}</h2>
        <p className="mt-4 text-lg">{message.body}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 bg-[var(--machine-orange)] px-5 py-3 text-lg font-semibold"
        >
          Understood
        </button>
      </section>
    </div>
  );
}
