import { COLD_TEMP_C, FROST_SHORT_MINUTES } from './constants.js';

export const WEATHER_LABELS = {
  fine: 'Fine',
  overcast: 'Overcast',
  rain: 'Rain',
  storm: 'Storm',
  frost: 'Frost',
};

export function weatherCopy(type) {
  switch (type) {
    case 'fine':
      return 'Good day to get around the course.';
    case 'overcast':
      return 'Soft light. Mowing as normal.';
    case 'rain':
      return 'Mowing stays in the shed. Rolls, cups and rakes are still on.';
    case 'storm':
      return 'Clear debris before anything else. Mowing is off. Bunkers will wash.';
    case 'frost':
      return `Late start. The day is ${FROST_SHORT_MINUTES} minutes short.`;
    default:
      return '';
  }
}

export const COLD_WEATHER_TIP_TITLE = 'Cold morning';

export function coldWeatherCopy(tempMin) {
  const low = Number.isFinite(Number(tempMin)) ? Math.round(tempMin) : COLD_TEMP_C;
  return `Overnight low ${low}°. Frost days start late and run ${FROST_SHORT_MINUTES} minutes short of a full shift. Turf drinks less in the cold, so you can ease off irrigation.`;
}
