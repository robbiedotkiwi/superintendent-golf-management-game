import {
  FORECAST_DAYS,
  WEATHER_FINE,
  WEATHER_FROST,
  WEATHER_HEAVY_RAIN,
  WEATHER_OVERCAST,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';
import { WEATHER_LABELS } from '../data/events.js';
import { forecastOpacity } from '../engine/weather.js';

function WeatherIcon({ type }) {
  const common = { viewBox: '0 0 24 24', className: 'h-5 w-5', fill: 'currentColor', 'aria-hidden': true };
  if (type === WEATHER_FINE) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
      </svg>
    );
  }
  if (type === WEATHER_OVERCAST) {
    return (
      <svg {...common}>
        <path d="M7 16h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 16z" />
      </svg>
    );
  }
  if (type === WEATHER_RAIN || type === WEATHER_HEAVY_RAIN) {
    return (
      <svg {...common}>
        <path d="M7 14h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 14z" />
        <path d="M9 16v3M12 16v4M15 16v3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (type === WEATHER_STORM) {
    return (
      <svg {...common}>
        <path d="M7 13h11a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A4.5 4.5 0 0 0 7 13z" />
        <path d="M13 12 9 20h4l-2 4 7-10h-4l2-4z" />
      </svg>
    );
  }
  if (type === WEATHER_FROST) {
    return (
      <svg {...common}>
        <path d="M12 3v18M5 7l14 10M19 7 5 17M4 12h16" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

export default function ForecastStrip({ state }) {
  const days = state.forecastStrip ?? [];
  if (days.length !== FORECAST_DAYS) return <div id="forecast-strip" aria-label="7-day forecast" className="mt-3" />;
  return (
    <div id="forecast-strip" aria-label="7-day forecast" className="mt-3 flex gap-1">
      {days.map((day, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-1 flex-col items-center text-center text-[10px] leading-tight text-[var(--paint)]"
          style={{ opacity: forecastOpacity(index) }}
          title={WEATHER_LABELS[day.type]}
        >
          <WeatherIcon type={day.type} />
          <div className="mt-1 truncate">{WEATHER_LABELS[day.type]}</div>
          <div className="text-[var(--sand)]">
            {day.windSpeed} {day.windDir}
          </div>
        </div>
      ))}
    </div>
  );
}
