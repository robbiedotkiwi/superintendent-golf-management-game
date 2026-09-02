import { FROST_SHORT_MINUTES } from './constants.js';

export const WEATHER_LABELS = {
  fine: 'Fine',
  overcast: 'Overcast',
  rain: 'Rain',
  heavyRain: 'Heavy rain',
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
    case 'heavyRain':
      return 'Mowing off. Bunkers will wash.';
    case 'storm':
      return 'Clear debris before anything else. Mowing is off.';
    case 'frost':
      return `Late start. The day is ${FROST_SHORT_MINUTES} minutes short.`;
    default:
      return '';
  }
}
