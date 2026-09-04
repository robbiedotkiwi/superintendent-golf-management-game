import {
  CHECK_MOISTURE_BY_SURFACE,
  CHECK_MOISTURE_LABEL,
  REPEAT_LAST_LABEL,
  SAVE_ROUTE_LABEL,
  SAVED_ROUTE_CAP,
  SELECT_ALL_LABEL,
  SELECT_CLEAR_LABEL,
  SELECT_FRONT_NINE_LABEL,
} from '../data/constants.js';
import { useState } from 'react';
import { describeJob, findPlannedJob, formatHoleSet } from '../engine/jobs.js';
import { defaultJobHoles, frontNineIds } from '../engine/holes.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import PlanConfirmButton from './PlanConfirmButton.jsx';
import { durationForTask } from '../engine/assignment.js';

export default function MapSelectionBar({
  state,
  onSelectAll,
  onSelectFrontNine,
  onClear,
  onSaveRoute,
  onApplyRoute,
  onRepeatLast,
  onPlan,
  onRemove,
}) {
  const [routeName, setRouteName] = useState('');
  const selected = state.selectedHoles ?? [];
  const routes = state.savedRoutes ?? [];
  const dropped = state.lastRepeatDropped ?? [];

  return (
    <div className="absolute right-3 top-3 z-20 w-72 border-2 border-[var(--sand)] bg-[var(--soil)] p-3 text-[var(--paint)] shadow-lg">
      <p className="mb-2 text-sm text-[var(--sand)]">
        {selected.length
          ? `${selected.length} hole${selected.length === 1 ? '' : 's'} · ${formatHoleSet(selected)}`
          : 'No holes selected — jobs use the whole course.'}
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={onSelectAll}>
          {SELECT_ALL_LABEL}
        </button>
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={onSelectFrontNine}>
          {SELECT_FRONT_NINE_LABEL}
        </button>
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={onClear}>
          {SELECT_CLEAR_LABEL}
        </button>
      </div>
      <div className="mb-2 flex gap-1">
        <input
          type="text"
          value={routeName}
          onChange={(event) => setRouteName(event.target.value)}
          placeholder="Route name"
          className="min-w-0 flex-1 border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-sm text-[var(--paint)]"
        />
        <button
          type="button"
          className="border border-[var(--sand)] px-2 py-1 text-sm disabled:opacity-40"
          disabled={!selected.length || !routeName.trim() || routes.length >= SAVED_ROUTE_CAP}
          onClick={() => {
            onSaveRoute(routeName);
            setRouteName('');
          }}
        >
          {SAVE_ROUTE_LABEL}
        </button>
        <button type="button" className="border border-[var(--sand)] px-2 py-1 text-sm" onClick={onRepeatLast}>
          {REPEAT_LAST_LABEL}
        </button>
      </div>
      {routes.length ? (
        <label className="mb-2 block text-sm text-[var(--sand)]">
          Routes
          <select
            className="mt-1 w-full border border-[var(--sand)] bg-[var(--soil)] px-2 py-1 text-[var(--paint)]"
            defaultValue=""
            onChange={(event) => {
              const id = Number(event.target.value);
              if (id) onApplyRoute(id);
              event.target.value = '';
            }}
          >
            <option value="">Apply a route</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} · {formatHoleSet(route.holes)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {dropped.length ? (
        <div className="text-sm text-[var(--sand)]">
          <p>Repeat last skipped:</p>
          <ul className="list-disc pl-4">
            {dropped.map((item, index) => (
              <li key={`${item.taskId}-${index}`}>
                {describeJob(item.taskId, item.holes)} — {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-2 space-y-1">
        <p className="text-sm text-[var(--sand)]">{CHECK_MOISTURE_LABEL}</p>
        {Object.entries(CHECK_MOISTURE_BY_SURFACE).map(([surface, taskId]) => {
          const holes = selected.length ? selected : undefined;
          const planned = findPlannedJob(state, taskId, holes);
          const minutes = planned?.minutes ?? durationForTask(state, taskId, undefined, undefined, holes);
          if (planned) {
            return (
              <button
                key={taskId}
                type="button"
                className="w-full border border-[var(--sand)] px-2 py-1 text-left text-sm"
                onClick={() => onRemove(taskId, planned.planId)}
              >
                {SURFACE_LABELS[surface]} planned · {planned.minutes} min
              </button>
            );
          }
          return (
            <PlanConfirmButton
              key={taskId}
              state={state}
              taskId={taskId}
              holes={holes}
              onPlan={onPlan}
              className="w-full border border-[var(--sand)] px-2 py-1 text-left text-sm disabled:opacity-40"
            >
              {SURFACE_LABELS[surface]} · {minutes} min
            </PlanConfirmButton>
          );
        })}
      </div>
    </div>
  );
}

export function selectAllHoles(state) {
  return defaultJobHoles(state, 'greens');
}

export function selectFrontNine(state) {
  return frontNineIds(state);
}
