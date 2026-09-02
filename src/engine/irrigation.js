import {
  AERATOR_COST,
  GROUNDWATER_M3,
  IRRIGATION_M3,
  IRRIGATION_POLICIES,
  MAINS_COST_PER_M3,
  POND_CAPACITY,
  POND_HEALTH_LOW_DROP,
  POND_HEALTH_MAX,
  POND_HEALTH_SUMMER_DROP,
  POND_LOW_FRACTION,
  RAIN_POND_M3,
  SEASON_WATER,
  STORM_POND_M3,
  SUMMER_UNDERWATER_DECAY,
  WEATHER_HEAVY_RAIN,
  WEATHER_RAIN,
  WEATHER_STORM,
} from '../data/constants.js';

export const IRRIGATED_SURFACES = ['greens', 'tees', 'fairways'];

export function irrigationDemand(state) {
  const seasonMult = SEASON_WATER[state.season];
  const demand = {};
  let total = 0;
  for (const surface of IRRIGATED_SURFACES) {
    const policy = state.irrigation[surface];
    let amount = 0;
    if (policy === 'light' || policy === 'full') {
      amount = IRRIGATION_M3[surface][policy] * seasonMult;
    }
    if (surface === 'greens' && state.plannedTasks.some((item) => item.taskId === 'handWater')) {
      amount = 0;
    }
    demand[surface] = amount;
    total += amount;
  }
  return { demand, total };
}

export function rainFill(weather) {
  if (weather === WEATHER_RAIN) return RAIN_POND_M3;
  if (weather === WEATHER_HEAVY_RAIN || weather === WEATHER_STORM) return STORM_POND_M3;
  return 0;
}

export function resolveIrrigation(state) {
  const { demand, total } = irrigationDemand(state);
  let volume = state.pond.volume;
  let fromPond = Math.min(volume, total);
  volume -= fromPond;
  const shortfall = total - fromPond;
  const mainsCost = shortfall * MAINS_COST_PER_M3;
  volume = Math.min(POND_CAPACITY, volume + GROUNDWATER_M3 + rainFill(state.weather));

  let health = state.pond.health;
  const low = volume / POND_CAPACITY < POND_LOW_FRACTION;
  if (!state.hasAerator) {
    if (state.season === 'summer') health -= POND_HEALTH_SUMMER_DROP;
    if (low) health -= POND_HEALTH_LOW_DROP;
  }
  health = Math.max(0, Math.min(POND_HEALTH_MAX, health));

  const watered = {};
  for (const surface of IRRIGATED_SURFACES) {
    const hand = surface === 'greens' && state.plannedTasks.some((item) => item.taskId === 'handWater');
    watered[surface] = demand[surface] > 0 || hand;
  }

  return {
    pond: { volume, health },
    mainsCost,
    shortfall,
    demand,
    watered,
  };
}

export function summerUnderwaterDecay(state, watered) {
  if (state.season !== 'summer') return {};
  const extra = {};
  for (const surface of IRRIGATED_SURFACES) {
    if (!watered[surface]) extra[surface] = SUMMER_UNDERWATER_DECAY[surface];
  }
  return extra;
}

export function canBuyAerator(state) {
  if (state.hasAerator) return { ok: false, reason: 'Already in the pond.' };
  if (state.cash < AERATOR_COST) return { ok: false, reason: `Needs ${AERATOR_COST}, only ${state.cash} in the tin.` };
  return { ok: true };
}

export function pondPercent(volume) {
  return (volume / POND_CAPACITY) * 100;
}

export function isIrrigationPolicy(policy) {
  return IRRIGATION_POLICIES.includes(policy);
}
