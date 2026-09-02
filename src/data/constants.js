export const turf = '#3E5C3A';
export const turfStressed = '#8A8748';
export const soil = '#4A3B2E';
export const sand = '#D8C9A8';
export const paint = '#E8E4DA';
export const machineOrange = '#D9541E';

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

export const TASK_MINUTES = {
  cutGreens: 120,
  rollGreens: 75,
  changeCups: 30,
  cutTees: 70,
  cutFairways: 150,
  cutRough: 180,
  rakeBunkers: 50,
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
