export const turf = '#3E5C3A';
export const turfStressed = '#8A8748';
export const soil = '#4A3B2E';
export const sand = '#D8C9A8';
export const paint = '#E8E4DA';
export const machineOrange = '#D9541E';
export const pondWater = '#2F6A72';
export const pondStressed = '#6B6A3A';

export const DAY_LENGTH_MINUTES = 480;
export const STARTING_DAY = 1;
export const STARTING_YEAR = 1;
export const STARTING_SEASON = 'spring';
export const STARTING_CASH = 8000;
export const HOLE_COUNT = 9;

export const STARTING_QUALITY_GREENS = 55;
export const STARTING_QUALITY_TEES = 50;
export const STARTING_QUALITY_FAIRWAYS = 50;
export const STARTING_QUALITY_ROUGH = 45;
export const STARTING_QUALITY_BUNKERS = 40;

export const PLAYER_ID = 'player';
export const PLAYER_NAME = 'You';
export const PLAYER_SPEED_SKILL = 3;
export const PLAYER_QUALITY_SKILL = 3;
export const PLAYER_MORALE = 100;
export const PLAYER_WAGE = 0;
export const STARTING_MINUTES_USED = 0;
export const STARTING_DAYS_WORKED_RUNNING = 0;

export const SAVE_KEY = 'greenkeeper.save.v1';

export const SURFACE_KEYS = ['greens', 'tees', 'fairways', 'rough', 'bunkers'];

export const HAND_WATER_MINUTES = 60;

export const TASK_MINUTES = {
  cutGreens: 120,
  rollGreens: 75,
  changeCups: 30,
  cutTees: 70,
  cutFairways: 150,
  cutRough: 180,
  rakeBunkers: 50,
  clearDebris: 90,
  handWater: HAND_WATER_MINUTES,
};

export const LEVEL_QUICK_TIME_MULT = 0.7;
export const LEVEL_STANDARD_TIME_MULT = 1.0;
export const LEVEL_THOROUGH_TIME_MULT = 1.4;
export const LEVEL_QUICK_GAIN = 3;
export const LEVEL_STANDARD_GAIN = 6;
export const LEVEL_THOROUGH_GAIN = 10;

export const QUALITY_LEVELS = {
  quick: { timeMultiplier: LEVEL_QUICK_TIME_MULT, qualityGain: LEVEL_QUICK_GAIN },
  standard: { timeMultiplier: LEVEL_STANDARD_TIME_MULT, qualityGain: LEVEL_STANDARD_GAIN },
  thorough: { timeMultiplier: LEVEL_THOROUGH_TIME_MULT, qualityGain: LEVEL_THOROUGH_GAIN },
};

export const LEVEL_KEYS = ['quick', 'standard', 'thorough'];

export const DECAY_BASE = 8;
export const DECAY_ACCELERATION = 1.5;
export const DECAY_ACCELERATION_BELOW = 50;
export const GAIN_DIMINISH = 0.6;
export const GAIN_DIMINISH_ABOVE = 70;
export const QUALITY_MIN = 0;
export const QUALITY_MAX = 100;
export const EQUIPMENT_CEILING = 70;

export const CONDITION_WEIGHTS = {
  greens: 0.40,
  tees: 0.15,
  fairways: 0.20,
  rough: 0.10,
  bunkers: 0.15,
};

export const BUNKER_HOLE_COUNT = 3;
export const FAIRWAY_HALF_WIDTH = 22;
export const ROUGH_HALF_WIDTH = 50;
export const GREEN_RX = 24;
export const GREEN_RY = 16;
export const TEE_RX = 11;
export const TEE_RY = 8;
export const BUNKER_RX = 16;
export const BUNKER_RY = 10;
export const BUNKER_OFFSET = 32;
export const HOLE_PATH_SAMPLES = 16;
export const POND_CX = 520;
export const POND_CY = 430;
export const POND_RX = 58;
export const POND_RY = 34;
export const AERATOR_RX = 8;
export const AERATOR_RY = 8;
export const AERATOR_ARM = 18;
export const POND_LABEL_OFFSET = 18;

export const DAYS_PER_SEASON = 30;
export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASON_ORDER.length;
export const SEASON_GROWTH = {
  spring: 1.2,
  summer: 1.4,
  autumn: 1.0,
  winter: 0.5,
};

export const WEATHER_FINE = 'fine';
export const WEATHER_OVERCAST = 'overcast';
export const WEATHER_RAIN = 'rain';
export const WEATHER_HEAVY_RAIN = 'heavyRain';
export const WEATHER_STORM = 'storm';
export const WEATHER_FROST = 'frost';

export const STARTING_WEATHER = WEATHER_FINE;
export const STARTING_RNG_SEED = 1;
export const FORECAST_ACCURACY = 0.7;
export const FROST_SHORT_MINUTES = 120;
export const HEAVY_RAIN_BUNKER_LOSS = 10;
export const MOWING_WEATHER = [WEATHER_RAIN, WEATHER_HEAVY_RAIN, WEATHER_STORM];

export const WEATHER_WEIGHTS = {
  spring: { fine: 35, overcast: 25, rain: 20, heavyRain: 8, storm: 7, frost: 5 },
  summer: { fine: 40, overcast: 20, rain: 15, heavyRain: 12, storm: 13, frost: 0 },
  autumn: { fine: 25, overcast: 25, rain: 25, heavyRain: 10, storm: 10, frost: 5 },
  winter: { fine: 15, overcast: 25, rain: 15, heavyRain: 5, storm: 5, frost: 35 },
};

export const DAYS_PER_WEEK = 7;
export const WEAR_PER_USE = 8;
export const WEAR_THRESHOLD = 60;
export const WEAR_GAIN_PENALTY = 0.3;
export const WEAR_MAX = 100;
export const GRIND_AWAY_COST = 400;
export const GRIND_AWAY_DAYS = 2;
export const FOLEY_GRINDER_COST = 15000;
export const FOLEY_GRIND_MINUTES = 90;
export const REPAIR_MINUTES = 120;
export const BREAKDOWN_BASE = 0.005;
export const BREAKDOWN_PER_WEAR = 0.0005;
export const AUTO_INTERRUPT_MIN_COUNT = 1;
export const AUTO_INTERRUPT_MAX_COUNT = 3;
export const AUTO_INTERRUPT_MIN_MINUTES = 10;
export const AUTO_INTERRUPT_MAX_MINUTES = 40;
export const ROLLER_GAIN_BONUS = 4;

export const PUSH_ROTARY_CEILING = 65;
export const PUSH_ROTARY_TIME_MULT = 1;
export const WALK_BEHIND_COST = 4500;
export const WALK_BEHIND_CEILING = 80;
export const WALK_BEHIND_TIME_MULT = 0.85;
export const RIDE_ON_REEL_COST = 22000;
export const RIDE_ON_REEL_CEILING = 92;
export const RIDE_ON_REEL_TIME_MULT = 0.5;
export const PREMIUM_REEL_COST = 48000;
export const PREMIUM_REEL_CEILING = 97;
export const PREMIUM_REEL_TIME_MULT = 0.4;
export const FAIRWAY_UNIT_COST = 30000;
export const FAIRWAY_UNIT_CEILING = 88;
export const FAIRWAY_UNIT_TIME_MULT = 0.35;
export const VENTRAC_COST = 18000;
export const VENTRAC_FAIRWAY_CEILING = 85;
export const VENTRAC_ROUGH_CEILING = 90;
export const VENTRAC_TIME_MULT = 0.45;
export const GREENS_ROLLER_COST = 9000;
export const GREENS_ROLLER_TIME_MULT = 0.7;
export const AUTONOMOUS_COST = 35000;
export const AUTONOMOUS_CEILING = 85;
export const STARTING_MACHINE_ID = 'pushRotary';

export const SPEED_SKILL_BASE = 1.3;
export const SPEED_SKILL_STEP = 0.1;
export const QUALITY_SKILL_BASE = 0.7;
export const QUALITY_SKILL_STEP = 0.1;
export const QUALITY_RANDOM_AT_1 = 0.2;
export const QUALITY_RANDOM_AT_5 = 0.05;
export const SKILL_MIN = 1;
export const SKILL_MAX = 5;
export const MORALE_SAFE_MINUTES = 420;
export const MORALE_STREAK_LIMIT = 6;
export const MORALE_SLOW_BELOW = 40;
export const MORALE_NOSHOW_BELOW = 20;
export const MORALE_NOSHOW_CHANCE = 0.5;
export const MORALE_OVERWORK_DROP = 12;
export const MORALE_STREAK_DROP = 8;
export const MORALE_RECOVER = 18;
export const MORALE_MAX = 100;
export const MORALE_SLOW_MULT = 1.2;
export const VOLUNTEER_MINUTES = 240;
export const VOLUNTEER_DEFAULT_WEEKDAY = 6;
export const VOLUNTEER_ID = 'volunteer';
export const VOLUNTEER_NAME = 'Volunteer';
export const VOLUNTEER_SPEED_SKILL = 2;
export const VOLUNTEER_QUALITY_SKILL = 2;
export const TRAINING_DAYS = 5;
export const TRAINING_COST = 1200;
export const TRAINING_SKILL_GAIN = 0.5;
export const EARLY_START_MINUTES = 60;
export const EARLY_START_WARNING_COUNT = 3;
export const EARLY_START_FINE_COUNT = 6;
export const EARLY_START_FINE = 2000;
export const MECHANIC_WAGE = 90;
export const WAGE_BASE = 45;
export const WAGE_PER_SKILL = 12;
export const CANDIDATE_COUNT = 3;
export const WEAR_MECHANIC_FACTOR = 0.5;

export const POND_CAPACITY = 8000;
export const POND_START_VOLUME = 6000;
export const POND_HEALTH_START = 70;
export const POND_HEALTH_MAX = 100;
export const POND_HEALTH_STRESSED = 40;
export const POND_LOW_FRACTION = 0.35;
export const POND_HEALTH_SUMMER_DROP = 5;
export const POND_HEALTH_LOW_DROP = 6;
export const GROUNDWATER_M3 = 20;
export const RAIN_POND_M3 = 150;
export const STORM_POND_M3 = 400;
export const MAINS_COST_PER_M3 = 2.5;
export const AERATOR_COST = 6000;
export const SUMMER_UNDERWATER_DECAY = {
  greens: 10,
  tees: 4,
  fairways: 3,
};
export const IRRIGATION_M3 = {
  greens: { light: 12, full: 25 },
  tees: { light: 7, full: 15 },
  fairways: { light: 60, full: 120 },
};
export const SEASON_WATER = {
  spring: 1.0,
  summer: 1.6,
  autumn: 0.7,
  winter: 0.2,
};
export const STARTING_IRRIGATION = {
  greens: 'full',
  tees: 'light',
  fairways: 'off',
};
export const IRRIGATION_POLICIES = ['off', 'light', 'full'];
