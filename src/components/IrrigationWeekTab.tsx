import {
  AERATOR_COST,
  GREENS_SENSORS_COST,
  TURFRAD_COST,
} from '../data/constants.ts';
import { SURFACE_LABELS } from '../data/tasks.ts';
import { canEditPlanDay, planDayChrome, weekDays, weekdayLabel } from '../engine/week.ts';
import { irrigationCells } from '../engine/weekGrid.ts';
import {
  IRRIGATED_SURFACES,
  canBuyAerator,
  clampIrrigationMm,
  irrigationDemand,
  irrigationMmRange,
  pondCapacity,
  pondDoseBriefing,
  pondPercent,
} from '../engine/irrigation.ts';
import { canBuyGreensSensors, canBuyTurfRad } from '../engine/moisture.ts';
import { formatMoney } from '../engine/format.ts';
import ForecastStrip from './ForecastStrip.tsx';
import { MoistureLine } from './MoistureReadout.tsx';
import PondLevelBar from './PondLevelBar.tsx';
import WeatherStation from './WeatherStation.tsx';

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

function KitBuy({ owned, ownedCopy, cost, check, onBuy, title, emptyCopy, buyLabel }) {
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {owned ? (
        <p className="mt-2">{ownedCopy}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--sand)]">
            {emptyCopy} {formatMoney(cost)} from cash.
          </p>
          <button
            type="button"
            disabled={!check.ok}
            onClick={onBuy}
            className="mt-2 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
            title={check.ok ? undefined : check.reason}
          >
            {buyLabel} · {formatMoney(cost)}
          </button>
        </>
      )}
    </section>
  );
}

function PondKit({ state, onBuyAerator, onBuyGreensSensors, onBuyTurfRad, onBuyWeatherStation }) {
  const capacity = pondCapacity(state);
  const percent = pondPercent(state.pond.volume, capacity);
  const demand = irrigationDemand(state);
  const aerator = canBuyAerator(state);
  const sensors = canBuyGreensSensors(state);
  const turfrad = canBuyTurfRad(state);
  const briefing = pondDoseBriefing(state);

  return (
    <div className="grid gap-3 lg:grid-cols-2" data-pond-kit>
      <section className="border border-[var(--sand)] p-3 space-y-3">
        <h3 className="text-lg font-semibold">Pond</h3>
        <div>
          <div className="text-sm text-[var(--sand)]">Volume</div>
          <div className="font-condensed text-4xl font-bold leading-none">{Math.round(state.pond.volume)}</div>
          <p className="mt-1 text-sm text-[var(--sand)]">
            {Math.round(percent)}% of {capacity} m³ · health {Math.round(state.pond.health)}
          </p>
          <PondLevelBar volume={state.pond.volume} capacity={capacity} />
        </div>
        <p className="text-sm text-[var(--sand)]">
          Nightly draw {demand.total.toFixed(1)} m³. Dose and rescue are timed jobs on the week plan.
        </p>
        {briefing ? <p className="text-sm text-[var(--machine-orange)]">{briefing}</p> : null}
        <p>Aerator {state.hasAerator ? 'running' : 'not installed'}.</p>
        {state.hasAerator ? (
          <p>In the pond. Holds health up.</p>
        ) : (
          <>
            <p className="text-sm text-[var(--sand)]">Keeps pond health from falling. {formatMoney(AERATOR_COST)} from cash.</p>
            <button
              type="button"
              disabled={!aerator.ok}
              onClick={onBuyAerator}
              className="border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
              title={aerator.ok ? undefined : aerator.reason}
            >
              Buy aerator · {formatMoney(AERATOR_COST)}
            </button>
          </>
        )}
      </section>
      <div className="space-y-3">
        <WeatherStation state={state} onBuyWeatherStation={onBuyWeatherStation} />
        <KitBuy
          title="Greens sensors"
          owned={state.hasGreensSensors}
          ownedCopy="Live greens moisture. Never stale."
          emptyCopy="Continuous greens readings."
          cost={GREENS_SENSORS_COST}
          check={sensors}
          onBuy={onBuyGreensSensors}
          buyLabel="Buy sensors"
        />
        <KitBuy
          title="TurfRad"
          owned={state.hasTurfRad}
          ownedCopy="Mowers report moisture on anything cut today."
          emptyCopy="Readings when you mow."
          cost={TURFRAD_COST}
          check={turfrad}
          onBuy={onBuyTurfRad}
          buyLabel="Buy TurfRad"
        />
      </div>
    </div>
  );
}

export default function IrrigationWeekTab({
  state,
  onSetIrrigation,
  onSelectDay,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onBuyWeatherStation,
}) {
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
                <p className="mt-1 text-xs text-[var(--sand)]">
                  Moisture <MoistureLine state={state} surface={surface} />
                </p>
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
      <PondKit
        state={state}
        onBuyAerator={onBuyAerator}
        onBuyGreensSensors={onBuyGreensSensors}
        onBuyTurfRad={onBuyTurfRad}
        onBuyWeatherStation={onBuyWeatherStation}
      />
    </div>
  );
}
