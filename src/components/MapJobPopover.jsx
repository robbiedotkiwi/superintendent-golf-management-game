import { SURFACE_LABELS } from '../data/tasks.js';
import TaskPanel from './TaskPanel.jsx';

export default function MapJobPopover({
  surface,
  state,
  holes,
  onPlan,
  onRemove,
  onSetWorker,
  onClose,
}) {
  if (!surface || !SURFACE_LABELS[surface]) return null;
  return (
    <div className="absolute left-3 top-3 z-20 w-80 max-h-[min(72vh,520px)] overflow-y-auto border-2 border-[var(--sand)] bg-[var(--soil)] p-3 text-[var(--paint)] shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-condensed text-2xl font-bold">{SURFACE_LABELS[surface]}</h2>
        <button type="button" onClick={onClose} className="border border-[var(--sand)] px-2 py-1 text-sm">
          Close
        </button>
      </div>
      <p className="mb-3 text-sm text-[var(--sand)]">
        {holes?.length ? `Jobs on ${holes.length} selected hole${holes.length === 1 ? '' : 's'}.` : 'Jobs at the current Turf settings.'}
      </p>
      <TaskPanel
        surface={surface}
        state={state}
        holes={holes}
        onPlan={onPlan}
        onRemove={onRemove}
        onSetWorker={onSetWorker}
      />
    </div>
  );
}
