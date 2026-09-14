import { SURFACE_LABELS } from '../data/tasks.js';
import { canEditPlanDay, planDayChrome, weekDays, weekdayLabel } from '../engine/week.js';
import { irrigationCells } from '../engine/weekGrid.js';
import { IRRIGATED_SURFACES, clampIrrigationMm, irrigationMmRange } from '../engine/irrigation.js';
import ForecastStrip from './ForecastStrip.jsx';

function IrrigationDayCell({ cell, surface, onSetIrrigation, locked }) {
  const range = irrigationMmRange(surface);
  if (!range) return null;
  return (
    <label className="block text-center text-[11px]">
      <span className="sr-only">
        {SURFACE_LABELS[surface]} {weekdayLabel(cell.day)}
      </span>
      <div className="font-condensed text-lg font-bold leading-none">{cell.mm} mm</div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={cell.mm}
        disabled={locked}
        onChange={(event) => onSetIrrigation(surface, clampIrrigationMm(surface, Number(event.target.value)), cell.day)}
        className="mt-1 w-full"
        aria-label={`${SURFACE_LABELS[surface]} irrigation millimetres ${weekdayLabel(cell.day)}`}
        data-irrigation-input={`${surface}-${cell.day}`}
      />
    </label>
  );
}

function dayColumnClass(state, day) {
  const chrome = planDayChrome(state, day);
  const past = day < state.day;
  const today = chrome.isToday ? 'bg-[var(--machine-orange)]/20' : '';
  const planning = chrome.isPlanningAhead ? 'outline outline-1 outline-dashed outline-[var(--machine-orange)]' : '';
  return `min-w-[7.5rem] border border-[var(--sand)] p-2 ${today} ${planning} ${past ? 'opacity-40' : ''}`;
}

export default function IrrigationWeekTab({ state, onSetIrrigation, onSelectDay }) {
  const days = weekDays(state.day);
  return (
    <div className="space-y-3" data-irrigation-tab>
      <ForecastStrip state={state} onSelectDay={onSelectDay} />
      <p className="text-sm text-[var(--sand)]">
        Nightly millimetres. No person and no time cost. Columns line up with the forecast.
      </p>
      <table className="w-full min-w-[64rem] border-collapse text-left text-sm" data-irrigation-table>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[14rem] border border-[var(--sand)] bg-[var(--soil)] p-2">Irrigation</th>
            {days.map((day) => {
              const chrome = planDayChrome(state, day);
              return (
                <th key={day} className={dayColumnClass(state, day)}>
                  <div className="font-semibold">{weekdayLabel(day)}</div>
                  {chrome.isToday ? (
                    <div className="text-[10px] font-semibold text-[var(--machine-orange)]">Today</div>
                  ) : null}
                  {chrome.isPlanningAhead ? (
                    <div className="text-[10px] font-semibold text-[var(--machine-orange)]">Planning</div>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {IRRIGATED_SURFACES.map((surface) => (
            <tr key={`irrigate-${surface}`} data-grid-row={`irrigate-${surface}`}>
              <th className="sticky left-0 z-10 border border-[var(--sand)] bg-[var(--soil)] p-2 align-top">
                <div className="font-semibold">Irrigate {SURFACE_LABELS[surface]}</div>
                <p className="mt-1 text-xs text-[var(--sand)]">Nightly millimetres. Not a timed job.</p>
              </th>
              {irrigationCells(state, surface).map((cell) => {
                const edit = canEditPlanDay(state, cell.day);
                return (
                  <td key={cell.day} className="border border-[var(--sand)] p-2 align-top">
                    <IrrigationDayCell
                      cell={cell}
                      surface={surface}
                      onSetIrrigation={onSetIrrigation}
                      locked={!edit.ok}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
