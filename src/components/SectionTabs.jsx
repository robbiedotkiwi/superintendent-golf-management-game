export default function SectionTabs({ tabs, labels, value, onChange }) {
  return (
    <nav aria-label="Section tabs" className="mb-6 flex overflow-hidden border border-[var(--sand)]">
      {tabs.map((id, index) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`flex-1 px-3 py-2 text-sm ${index > 0 ? 'border-l border-[var(--sand)]' : ''} ${
            value === id ? 'bg-[var(--machine-orange)]' : ''
          }`}
        >
          {labels[id]}
        </button>
      ))}
    </nav>
  );
}
