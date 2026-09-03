export const turf = '#3E5C3A';
export const turfStressed = '#8A8748';
export const soil = '#4A3B2E';
export const sand = '#D8C9A8';
export const paint = '#E8E4DA';
export const machineOrange = '#D9541E';
export const pondWater = '#2F6A72';
export const pondStressed = '#6B6A3A';
export const SURFACE_LIGHTEN_GREENS = 0.28;
export const SURFACE_LIGHTEN_TEES = 0.14;
export const SURFACE_DARKEN_ROUGH = 0.4;
export const SURFACE_STRESS_MIX = 0.82;
export const BUNKER_STRESS_MIX = 0.4;
export const GREEN_OUTLINE_MIX = 0.45;

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
export const SPRAY_MINUTES = 90;
export const FERTILISER_MINUTES = 75;
export const GM_MEETING_MINUTES = 60;
export const DOUBLE_CUT_MINUTES = 160;
export const EXTRA_ROLL_MINUTES = 90;
export const EDGE_BUNKERS_MINUTES = 80;
export const BALL_PICK_MINUTES = 45;
export const AUTO_PICK_MINUTES = 10;

export const TASK_MINUTES = {
  rollGreens: 75,
  changeCups: 30,
  rakeBunkers: 50,
  clearDebris: 90,
  handWater: HAND_WATER_MINUTES,
  sprayGreens: SPRAY_MINUTES,
  sprayTees: SPRAY_MINUTES,
  sprayFairways: SPRAY_MINUTES,
  fertiliseGreens: FERTILISER_MINUTES,
  fertiliseTees: FERTILISER_MINUTES,
  fertiliseFairways: FERTILISER_MINUTES,
  gmMeeting: GM_MEETING_MINUTES,
  doubleCutGreens: DOUBLE_CUT_MINUTES,
  extraRoll: EXTRA_ROLL_MINUTES,
  edgeBunkers: EDGE_BUNKERS_MINUTES,
  pickBalls: BALL_PICK_MINUTES,
};

export const BASE_MINUTES = {
  greens: 104,
  tees: 64,
  fairways: 136,
  rough: 152,
};

export const DEFAULT_DAY_OVERLOAD_MINUTES = 670;
export const DEFAULT_DAY_OVERLOAD_RATIO = 1.4;

export const BASE_GAIN = 6;
export const HOC_GAIN_BASE = 0.8;
export const HOC_GAIN_PER_FACTOR = 0.5;

export const HOC_RANGE = {
  greens: { min: 2.5, max: 5.0, default: 3.5 },
  tees: { min: 6, max: 12, default: 9 },
  fairways: { min: 10, max: 18, default: 14 },
  rough: { min: 35, max: 60, default: 45 },
};

export const HOC_SURFACES = ['greens', 'tees', 'fairways', 'rough'];
export const HOC_TIME_MULT_BASE = 0.85;
export const HOC_TIME_MULT_PER_FACTOR = 0.5;
export const HOC_CEILING_BONUS_PER_FACTOR = 12;
export const HOC_WATER_MULT_BASE = 1;
export const HOC_WATER_MULT_PER_FACTOR = 0.4;
export const HOC_FERT_INTERVAL_PER_FACTOR = 8;
export const HOC_STRESS_THRESHOLD = 0.6;
export const HOC_STRESS_DAMAGE = 4;
export const HOC_CHANGE_PENALTY = 6;
export const HOC_STEP = {
  greens: 0.1,
  tees: 1,
  fairways: 1,
  rough: 1,
};

export function HOC_TIME_MULT(factor) {
  return HOC_TIME_MULT_BASE + factor * HOC_TIME_MULT_PER_FACTOR;
}

export function HOC_CEILING_BONUS(factor) {
  return factor * HOC_CEILING_BONUS_PER_FACTOR;
}

export function HOC_WATER_MULT(factor) {
  return HOC_WATER_MULT_BASE + factor * HOC_WATER_MULT_PER_FACTOR;
}

export function HOC_FERT_INTERVAL(factor) {
  return FERTILISER_DAYS - factor * HOC_FERT_INTERVAL_PER_FACTOR;
}

export function HOC_GAIN_MULT(factor) {
  return HOC_GAIN_BASE + factor * HOC_GAIN_PER_FACTOR;
}

export const PATTERN_STRIPES = 'stripes';
export const PATTERN_RINGS = 'rings';
export const PATTERN_CHECKERBOARD = 'checkerboard';
export const PATTERN_DIAMOND = 'diamond';
export const PATTERN_KEYS = [PATTERN_STRIPES, PATTERN_RINGS, PATTERN_CHECKERBOARD, PATTERN_DIAMOND];
export const PATTERN_DEFAULT = PATTERN_STRIPES;
export const PATTERNED_SURFACES = ['greens', 'tees', 'fairways'];
export const PATTERN_TIME_MULT = {
  [PATTERN_STRIPES]: 1.0,
  [PATTERN_RINGS]: 1.25,
  [PATTERN_CHECKERBOARD]: 1.35,
  [PATTERN_DIAMOND]: 1.5,
};
export const PATTERN_PRESENTATION = {
  [PATTERN_STRIPES]: 4,
  [PATTERN_RINGS]: 7,
  [PATTERN_CHECKERBOARD]: 8,
  [PATTERN_DIAMOND]: 10,
};
export const PATTERN_LABELS = {
  [PATTERN_STRIPES]: 'Stripes',
  [PATTERN_RINGS]: 'Rings',
  [PATTERN_CHECKERBOARD]: 'Checkerboard',
  [PATTERN_DIAMOND]: 'Diamond',
};
export const PATTERN_UNAVAILABLE_TIME_MULT = 1;
export const PATTERN_ANGLE_MIN = 0;
export const PATTERN_ANGLE_MAX = 180;
export const PATTERN_ANGLE_DEFAULT = 0;
export const PATTERN_AUTO_ROTATE_DEFAULT = false;
export const PATTERN_AUTO_ROTATE_STEP = 45;
export const PATTERN_ANGLE_RESET_DELTA = 30;
export const PATTERN_WEAR_INCREMENT = 6;
export const PATTERN_WEAR_DECAY = 3;
export const PATTERN_WEAR_THRESHOLD = 40;
export const PATTERN_WEAR_DAMAGE = 3;
export const PATTERN_WEAR_DEFAULT = 0;

export const VIEW_ZOOM_DEFAULT = 1;
export const VIEW_PAN_X_DEFAULT = 0;
export const VIEW_PAN_Y_DEFAULT = 0;
export const MOISTURE_HIDDEN = null;
export const MOISTURE_SURFACES = ['greens', 'tees', 'fairways'];

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
export const POND_CX = 215;
export const POND_CY = 255;
export const POND_RX = 58;
export const POND_RY = 34;
export const AERATOR_RX = 8;
export const AERATOR_RY = 8;
export const AERATOR_ARM = 18;
export const POND_LABEL_OFFSET = 18;
export const MAP_VIEW_PADDING = 36;
export const BOUNDARY_EXPAND = 28;
export const BOUNDARY_DARKEN = 0.35;
export const FLAG_POLE = 34;
export const FLAG_WIDTH = 16;
export const FLAG_HEIGHT = 12;
export const TEE_MARKER_OFFSET = 32;
export const TEE_MARKER_RADIUS = 20;
export const TEE_MARKER_FONT = 22;

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
export const SPRAY_MATERIALS_COST = 600;
export const SPRAY_SUPPRESS_DAYS = 14;
export const FERTILISER_MATERIALS_COST = 450;
export const FERTILISER_CEILING_BONUS = 5;
export const FERTILISER_DAYS = 21;
export const FERTILISER_BRAND = 'Plant Fitness';
export const DISEASE_PRESSURE_MAX = 100;
export const DISEASE_PRESSURE_MIN = 0;
export const DISEASE_PRESSURE_BASE = 6;
export const DISEASE_OUTBREAK_THRESHOLD = 60;
export const DISEASE_OUTBREAK_DROP = 25;
export const DISEASE_OUTBREAK_DAILY = 5;
export const DISEASE_WET_MULT = 1.8;
export const DISEASE_UNDERWATER_MULT = 1.5;
export const DISEASE_SUSCEPTIBILITY = {
  greens: 1.0,
  tees: 0.35,
  fairways: 0.35,
  rough: 0,
};
export const DISEASE_SEASON = {
  spring: 0.8,
  summer: 1.4,
  autumn: 0.6,
  winter: 0.2,
};
export const STARTING_DISEASE_PRESSURE = 0;

export const SATISFACTION_START = 50;
export const SATISFACTION_MIN = 0;
export const SATISFACTION_MAX = 100;
export const BUDGET_SATISFACTION_OFFSET = 0.5;
export const SATISFACTION_LAG = 0.2;
export const SATISFACTION_POND_WEIGHT = 0.15;
export const SATISFACTION_COMPLAINT_PENALTY = 4;
export const GM_STANDING_START = 50;
export const GM_STANDING_MIN = 0;
export const GM_STANDING_MAX = 100;
export const GM_STANDING_MULT_MIN = 0.6;
export const GM_STANDING_MULT_MAX = 1.4;
export const GM_MEETING_SKIP_STANDING = 10;
export const MAINTENANCE_BASE = 12000;
export const CAPITAL_BASE = 40000;
export const STARTING_MAINTENANCE_BUDGET = 12000;
export const STARTING_CAPITAL_BUDGET = 40000;
export const LEASE_RATE = 0.1;
export const LOAN_LIMIT_MULTIPLIER = 2;
export const LOAN_INTEREST = 0.1;
export const INSOLVENT_DISMISS_STREAK = 2;
export const BUNKER_NEGLECT_DAYS = 7;
export const COMPLAINT_GREENS_QUALITY = 45;
export const COMPLAINT_ROUGH_DAYS = 7;
export const TOURNAMENT_WEIGHTS = {
  greens: 0.55,
  tees: 0.15,
  fairways: 0.2,
  bunkers: 0.1,
};
export const TOURNAMENT_EXCELLENT_MIN = 85;
export const TOURNAMENT_GOOD_MIN = 70;
export const TOURNAMENT_ACCEPTABLE_MIN = 55;
export const TOURNAMENT_EXCELLENT_PAY = 18000;
export const TOURNAMENT_GOOD_PAY = 12000;
export const TOURNAMENT_ACCEPTABLE_PAY = 7000;
export const TOURNAMENT_POOR_PAY = 3000;
export const TOURNAMENT_EXCELLENT_SAT = 12;
export const TOURNAMENT_GOOD_SAT = 6;
export const TOURNAMENT_ACCEPTABLE_SAT = 0;
export const TOURNAMENT_POOR_SAT = -15;
export const TOURNAMENT_PREP_DAYS = 3;
export const TOURNAMENT_SEASON_MAX = 3;
export const TOURNAMENT_WINTER_MAX = 1;
export const TOURNAMENT_PREP_DOUBLE_CUT_BONUS = 5;
export const TOURNAMENT_PREP_ROLL_BONUS = 4;
export const TOURNAMENT_PREP_EDGE_BONUS = 3;
export const GM_TOURNAMENT_DECLINE_STANDING = 8;

export const EXPANDED_HOLE_COUNT = 18;
export const TASK_TIME_MULT_18 = 2;
export const EXPAND_18_COST = 180000;
export const EXPAND_18_DAYS = 60;
export const EXPAND_18_SATISFACTION_MIN = 70;
export const EXPAND_18_DAILY_MINUTES = 90;
export const DRIVING_RANGE_COST = 60000;
export const DRIVING_RANGE_DAYS = 20;
export const DRIVING_RANGE_DAILY_MINUTES = 40;
export const AUTO_PICKER_COST = 25000;
export const EXTRA_BUNKERS_COST = 18000;
export const EXTRA_BUNKERS_DAYS = 10;
export const EXTRA_BUNKERS_DAILY_MINUTES = 30;
export const EXTRA_BUNKER_TIME_MULT = 1.3;
export const EXTRA_BUNKER_CEILING_BONUS = 8;
export const NEW_TEES_COST = 22000;
export const NEW_TEES_DAYS = 14;
export const NEW_TEES_DAILY_MINUTES = 30;
export const NEW_TEES_TIME_MULT = 1.25;
export const NEW_TEES_CEILING_BONUS = 8;
export const PROJECT_EXPAND_18 = 'expand18';
export const PROJECT_DRIVING_RANGE = 'drivingRange';
export const PROJECT_EXTRA_BUNKERS = 'extraBunkers';
export const PROJECT_NEW_TEES = 'newTees';
export const PROJECT_DAILY_MINUTES = {
  [PROJECT_EXPAND_18]: EXPAND_18_DAILY_MINUTES,
  [PROJECT_DRIVING_RANGE]: DRIVING_RANGE_DAILY_MINUTES,
  [PROJECT_EXTRA_BUNKERS]: EXTRA_BUNKERS_DAILY_MINUTES,
  [PROJECT_NEW_TEES]: NEW_TEES_DAILY_MINUTES,
};
export const BACK_NINE_OFFSET_X = 980;
export const RANGE_X = 500;
export const RANGE_Y = 625;
export const RANGE_WIDTH = 100;
export const RANGE_HEIGHT = 48;
export const SAVE_VERSION = 1;
export const SOUND_DEFAULT_ON = false;
export const SOUND_MOWER_FREQ = 90;
export const SOUND_BIRD_FREQ = 1800;
export const SOUND_BIRD_FREQ_B = 2200;
export const SOUND_TICK_MS = 220;
export const MOWER_ANIM_MS = 1800;
