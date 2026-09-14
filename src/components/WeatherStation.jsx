import { WEATHER_STATION_COST } from '../data/constants.js';
import { WEATHER_LABELS } from '../data/events.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { formatMoney } from '../engine/format.js';
import { IRRIGATED_SURFACES } from '../engine/irrigation.js';
import { surfaceEtMm } from '../engine/moisture.js';
import { canBuyWeatherStation, formatTempRange, stationAtmosphere } from '../engine/weather.js';
import { planningDayOf, weekdayLabel } from '../engine/week.js';

function formatMm(value) {
  if (!Number.isFinite(value)) return '0 mm';
  return `${value.toFixed(1)} mm`;
}

export default function WeatherStation({ state, onBuyWeatherStation }) {
  const check = canBuyWeatherStation(state);
  if (state.hasWeatherStation) {
    return <WeatherStationReadout state={state} />;
  }
  return (
    <section className="border border-[var(--sand)] p-3">
      <h3 className="text-lg font-semibold">Weather station</h3>
      <p className="mt-2 text-sm text-[var(--sand)]">
        ET, dew point, humidity and VPD so you can match irrigation to demand.{' '}
        {formatMoney(WEATHER_STATION_COST)} from cash.
      </p>
      <button
        type="button"
        disabled={!check.ok}
        onClick={onBuyWeatherStation}
        className="mt-2 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
        title={check.ok ? undefined : check.reason}
      >
        Buy weather station · {formatMoney(WEATHER_STATION_COST)}
      </button>
    </section>
  );
}

export function WeatherStationReadout({ state }) {
  if (!state.hasWeatherStation) return null;
  const night = weekdayLabel(planningDayOf(state));
  const atmosphere = stationAtmosphere(state);
  const weather = WEATHER_LABELS[state.weather] ?? state.weather;
  const temps = formatTempRange(state.tempMin, state.tempMax);
  const wind =
    Number.isFinite(Number(state.windSpeed)) && state.windDir
      ? `${state.windSpeed} ${state.windDir}`
      : null;

  return (
    <section className="border border-[var(--sand)] p-3" data-weather-station="readout">
      <h3 className="text-lg font-semibold">Weather station · {night}</h3>
      <p className="mt-2 text-sm text-[var(--sand)]">
        {weather}
        {temps ? ` · ${temps}` : ''}
        {wind ? ` · wind ${wind}` : ''}
      </p>
      <p className="mt-2" data-weather-station-rh>
        RH {atmosphere.rh}% · dew point {atmosphere.dewPoint.toFixed(1)}° · afternoon VPD{' '}
        {atmosphere.vpd.toFixed(2)} kPa
      </p>
      <p className="mt-2 text-sm" data-weather-station-et>
        ET{' '}
        {IRRIGATED_SURFACES.map((surface, index) => (
          <span key={surface}>
            {index > 0 ? ' · ' : ''}
            {SURFACE_LABELS[surface]} {formatMm(surfaceEtMm(state, surface))}
          </span>
        ))}
      </p>
      <p className="mt-2 text-sm text-[var(--sand)]">
        Set each surface near its ET to replace what the turf drinks. Rain already in the forecast
        wets the ground.
      </p>
    </section>
  );
}
