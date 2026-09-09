import {
  HOLE_SELECTOR_COUNT,
  SELECT_ALL_LABEL,
  SELECT_CLEAR_LABEL,
  SELECT_FRONT_NINE_LABEL,
} from '../data/constants.js';
import { defaultJobHoles, frontNineIds, holeCount } from '../engine/holes.js';

export function selectAllHoles(state) {
  return defaultJobHoles(state, 'greens');
}

export function selectFrontNine(state) {
  return frontNineIds(state);
}

export default function HoleSelector({ state, onToggleHole, onSelectHoles }) {
  const count = holeCount(state) || HOLE_SELECTOR_COUNT;
  const selected = new Set(state.selectedHoles ?? []);

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: count }, (_, index) => index + 1).map((id) => {
          const on = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleHole(id)}
              className={`min-w-8 border px-2 py-1 text-sm font-semibold ${
                on
                  ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)] text-[var(--paint)]'
                  : 'border-[var(--sand)] bg-[var(--soil)] text-[var(--paint)]'
              }`}
            >
              {id}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={() => onSelectHoles(selectAllHoles(state))}>
          {SELECT_ALL_LABEL}
        </button>
        <button
          type="button"
          className="border border-[var(--sand)] px-2 py-1 text-sm"
          onClick={() => onSelectHoles(selectFrontNine(state))}
        >
          {SELECT_FRONT_NINE_LABEL}
        </button>
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={() => onSelectHoles([])}>
          {SELECT_CLEAR_LABEL}
        </button>
      </div>
    </div>
  );
}
