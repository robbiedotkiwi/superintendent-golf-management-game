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
export const BUNKER_DULL = '#B9A888';
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
export const HOLE_KIND_BY_TYPE = {
  greens: 'green',
  tees: 'tee',
  fairways: 'fairway',
  rough: 'rough',
  bunkers: 'bunker',
};
export const TYPE_BY_HOLE_KIND = {
  green: 'greens',
  tee: 'tees',
  fairway: 'fairways',
  rough: 'rough',
  bunker: 'bunkers',
};
export const SURFACE_SINGULAR = {
  greens: 'green',
  tees: 'tee',
  fairways: 'fairway',
  rough: 'rough',
  bunkers: 'bunker',
};
export const TRACKED_SURFACES_NINE = HOLE_COUNT * SURFACE_KEYS.length;
export const DRYING_FACTOR_DEFAULT = 1;
export const COMPLAINT_HOLE_CUT_BODY = (singular, holeId, days) =>
  `The ${singular} on ${holeId} hasn't been cut in ${days} days.`;
export const COMPLAINT_HOLE_RAKE_BODY = (singular, holeId, days) =>
  `The ${singular} on ${holeId} hasn't been raked in ${days} days.`;
export const COMPLAINT_HOLE_QUALITY_BODY = (singular, holeId) =>
  `The ${singular} on ${holeId} is slow and bumpy. Something needs to happen.`;
export const COMPLAINT_HOLE_CUT_SUBJECT = (label, holeId) => `${label} on ${holeId} left too long`;
export const COMPLAINT_HOLE_QUALITY_SUBJECT = (label, holeId) => `${label} on ${holeId} is slow`;

export const HAND_WATER_MINUTES_PER_GREEN = 15;
export const HAND_WATER_MINUTES = HAND_WATER_MINUTES_PER_GREEN * HOLE_COUNT;
export const MOISTURE_CHECK_MINUTES = { greens: 40, tees: 25, fairways: 45 };
export const SPRAY_MINUTES = 90;
export const FERTILISER_MINUTES = 75;
export const POND_DOSE_MINUTES = 20;
export const POND_RESCUE_MINUTES = 90;
export const POND_RESCUE_HEALTH = 28;
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
  checkMoistureGreens: MOISTURE_CHECK_MINUTES.greens,
  checkMoistureTees: MOISTURE_CHECK_MINUTES.tees,
  checkMoistureFairways: MOISTURE_CHECK_MINUTES.fairways,
  sprayGreens: SPRAY_MINUTES,
  sprayTees: SPRAY_MINUTES,
  sprayFairways: SPRAY_MINUTES,
  fertiliseGreens: FERTILISER_MINUTES,
  fertiliseTees: FERTILISER_MINUTES,
  fertiliseFairways: FERTILISER_MINUTES,
  pondRescue: POND_RESCUE_MINUTES,
  gmMeeting: GM_MEETING_MINUTES,
  doubleCutGreens: DOUBLE_CUT_MINUTES,
  extraRoll: EXTRA_ROLL_MINUTES,
  edgeBunkers: EDGE_BUNKERS_MINUTES,
  pickBalls: BALL_PICK_MINUTES,
};

export const JOB_SETUP_MINUTES = {
  green: 35,
  tee: 25,
  fairway: 45,
  rough: 45,
  bunker: 20,
};
export const JOB_SETUP_MINUTES_BY_TYPE = {
  greens: JOB_SETUP_MINUTES.green,
  tees: JOB_SETUP_MINUTES.tee,
  fairways: JOB_SETUP_MINUTES.fairway,
  rough: JOB_SETUP_MINUTES.rough,
  bunkers: JOB_SETUP_MINUTES.bunker,
};
export const NINE_GREENS_TARGET_MINUTES = 384;
export const NINE_GREENS_DAY_FRACTION = 0.8;
export const WEEKLY_WORK_DAYS = 6;
export const WEEKLY_MINUTES = DAY_LENGTH_MINUTES * WEEKLY_WORK_DAYS;
export const WEEKLY_CADENCE_FRACTION = 0.75;
export const WEEKLY_CADENCE_TARGET_MINUTES = WEEKLY_MINUTES * WEEKLY_CADENCE_FRACTION;
export const WEEKLY_CUTS_GREENS = 2;
export const WEEKLY_CUTS_TEES = 2;
export const WEEKLY_CUTS_FAIRWAYS = 2;
export const ROUGH_CUTS_PER_FORTNIGHT = 1;
export const WEEKLY_CUTS_ROUGH = 0.5;
export const WEEKLY_CUPS_JOBS = 1;
export const WEEKLY_BUNKER_JOBS = 1;
export const WEEKLY_ROLL_JOBS = 1;
export const WEEKLY_ADMIN_JOBS = 1;
export const NINE_TEES_TARGET_MINUTES = 90;
export const NINE_FAIRWAYS_TARGET_MINUTES = 91;
export const NINE_ROUGH_TARGET_MINUTES = 1450;
export const NZ_PRICE_MULT = 2.5;
export function nzPrice(amount, step) {
  return Math.round((amount * NZ_PRICE_MULT) / step) * step;
}
export const SAVED_ROUTE_CAP = 8;
export const FRONT_NINE_COUNT = 9;
export const HOLE_SELECTOR_COUNT = HOLE_COUNT;
export const SELECT_ALL_LABEL = 'All';
export const SELECT_FRONT_NINE_LABEL = 'Front nine';
export const SELECT_CLEAR_LABEL = 'Clear';
export const SAVE_ROUTE_LABEL = 'Save route';
export const REPEAT_LAST_LABEL = 'Repeat last';
export const ROUTE_NAME_MAX = 24;

export const DEFAULT_DAY_OVERLOAD_MINUTES = 2260;
export const DEFAULT_DAY_OVERLOAD_RATIO = DEFAULT_DAY_OVERLOAD_MINUTES / DAY_LENGTH_MINUTES;

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
export const PATTERN_BLOCK = 'block';
export const PATTERN_KEYS = [PATTERN_STRIPES, PATTERN_RINGS, PATTERN_CHECKERBOARD, PATTERN_DIAMOND, PATTERN_BLOCK];
export const PATTERN_DEFAULT = PATTERN_STRIPES;
export const PATTERNED_SURFACES = ['greens', 'tees', 'fairways', 'rough'];
export const PATTERN_SURFACE_DEFAULT = {
  greens: PATTERN_STRIPES,
  tees: PATTERN_STRIPES,
  fairways: PATTERN_BLOCK,
  rough: PATTERN_BLOCK,
};
export const PATTERN_TIME_MULT = {
  [PATTERN_STRIPES]: 1.0,
  [PATTERN_RINGS]: 1.25,
  [PATTERN_CHECKERBOARD]: 1.35,
  [PATTERN_DIAMOND]: 1.5,
  [PATTERN_BLOCK]: 1.0,
};
export const PATTERN_PRESENTATION = {
  [PATTERN_STRIPES]: 4,
  [PATTERN_RINGS]: 7,
  [PATTERN_CHECKERBOARD]: 8,
  [PATTERN_DIAMOND]: 10,
  [PATTERN_BLOCK]: 0,
};
export const PATTERN_LABELS = {
  [PATTERN_STRIPES]: 'Stripes',
  [PATTERN_RINGS]: 'Rings',
  [PATTERN_CHECKERBOARD]: 'Checkerboard',
  [PATTERN_DIAMOND]: 'Diamond',
  [PATTERN_BLOCK]: 'Block',
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
export const VIEW_ZOOM_MIN = 0.5;
export const VIEW_ZOOM_MAX = 4;
export const VIEW_ZOOM_STEP = 1.15;
export const VIEW_ZOOM_WHEEL_FACTOR = 1.12;
export const VIEW_PAN_X_DEFAULT = 0;
export const VIEW_PAN_Y_DEFAULT = 0;
export const VIEW_PAN_KEEP = 80;
export const VIEW_PAN_STEP = 48;
export const VIEW_DRAG_THRESHOLD = 5;
export const MOISTURE_HIDDEN = null;
export const MOISTURE_SURFACES = ['greens', 'tees', 'fairways'];
export const MOISTURE_BAND = {
  greens: { min: 18, max: 26 },
  tees: { min: 20, max: 30 },
  fairways: { min: 20, max: 32 },
};
export const WET_DISEASE_MULT = 1.5;
export const WET_GAIN_MULT = 0.85;
export const MOISTURE_DATA_FRESH_DAYS = 2;
export const GREENS_SENSORS_COST = nzPrice(12000, 1000);
export const TURFRAD_COST = nzPrice(20000, 1000);
export const GREEN_DRYING_FACTOR_MIN = 0.8;
export const GREEN_DRYING_FACTOR_MAX = 1.3;
export const MOISTURE_MIN = 0;
export const MOISTURE_MAX = 100;
export const MOISTURE_START = {
  greens: 22,
  tees: 25,
  fairways: 26,
};
export const MOISTURE_IRRIGATION_ADD = {
  off: 0,
  light: 5,
  full: 8,
};
export const MOISTURE_ET_BASE = {
  greens: 4,
  tees: 3.5,
  fairways: 3.5,
};
export const MOISTURE_ET_SEASON = {
  spring: 1.0,
  summer: 1.6,
  autumn: 0.7,
  winter: 0.35,
};
export const MOISTURE_ET_WEATHER = {
  fine: 1.3,
  overcast: 0.75,
  rain: 0.2,
  heavyRain: 0,
  storm: 0,
  frost: 0.4,
};
export const MOISTURE_RAIN_ADD = {
  fine: 0,
  overcast: 0,
  rain: 4,
  heavyRain: 8,
  storm: 10,
  frost: 0,
};
export const MOISTURE_WIND_ET_PER = 0.012;
export const MOISTURE_HAND_WATER_ADD = 10;
export const MOISTURE_OVERLAY_OPACITY = 0.55;
export const MOISTURE_HATCH_SIZE = 8;
export const MOISTURE_HATCH_WIDTH = 1.5;
export const MOISTURE_BAND_MARK_WIDTH = 3;
export const MOISTURE_STALE_OPACITY = 0.35;
export const MOISTURE_OVERLAY_DRY_MIX = 0.35;
export const MOISTURE_OVERLAY_OK_MIX_LOW = 0.28;
export const MOISTURE_OVERLAY_OK_MIX_HIGH = 0.55;
export const MOISTURE_OVERLAY_WET_MIX = 0.45;

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
export const TEE_SIZE = { w: 34, h: 20 };
export const FAIRWAY_WIDTH = 58;
export const FAIRWAY_HALF_WIDTH = FAIRWAY_WIDTH / 2;
export const FAIRWAY_TEE_EXTRA = 0;
export const FAIRWAY_GREEN_EXTRA = 0;
export const FAIRWAY_LANDING_T = 0.35;
export const FAIRWAY_APPROACH_T = 0.8;
export const FAIRWAY_START_T = 0.14;
export const FAIRWAY_END_T = 0.78;
export const GREEN_SIZE_RANGE = [58, 82];
export const GREEN_SIZE_MIN = GREEN_SIZE_RANGE[0];
export const GREEN_SIZE_MAX = GREEN_SIZE_RANGE[1];
export const BUNKER_SIZE_RANGE = [24, 42];
export const BUNKER_SIZE_MIN = BUNKER_SIZE_RANGE[0];
export const BUNKER_SIZE_MAX = BUNKER_SIZE_RANGE[1];
export const BUNKERS_PER_HOLE = [2, 4];
export const BUNKERS_PER_HOLE_MIN = BUNKERS_PER_HOLE[0];
export const BUNKERS_PER_HOLE_MAX = BUNKERS_PER_HOLE[1];
export const CENTRELINE_WIDTH = 2;
export const HOLE_NUMBER_RADIUS = 20;
export const SHED_CLEARANCE = 40;
export const PERIMETER_HALF_WIDTH = 54;
export const FLAG_FAR_FACTOR = 0.4;
export const PROPERTY_MIN_X = 0;
export const PROPERTY_MIN_Y = 0;
export const PROPERTY_MAX_X = 1280;
export const PROPERTY_MAX_Y = 1260;
export const GREEN_SHAPE_CIRCLE = 'circle';
export const GREEN_SHAPE_OVAL = 'oval';
export const GREEN_SHAPE_KIDNEY_LEFT = 'kidneyLeft';
export const GREEN_SHAPE_KIDNEY_RIGHT = 'kidneyRight';
export const GREEN_SHAPE_PEAR = 'pear';
export const GREEN_SHAPE_WIDE = 'wide';
export const GREEN_SHAPE_BEAN = 'bean';
export const GREEN_SHAPE_LONG = 'long';
export const GREEN_SHAPE_TEARDROP = 'teardrop';
export const GREEN_SHAPES = [
  GREEN_SHAPE_CIRCLE,
  GREEN_SHAPE_OVAL,
  GREEN_SHAPE_KIDNEY_LEFT,
  GREEN_SHAPE_KIDNEY_RIGHT,
  GREEN_SHAPE_PEAR,
  GREEN_SHAPE_WIDE,
  GREEN_SHAPE_BEAN,
  GREEN_SHAPE_LONG,
  GREEN_SHAPE_TEARDROP,
];
export const BUNKER_SHAPE_SEMI = 'semi';
export const BUNKER_SHAPE_BEAN = 'bean';
export const ROUGH_HALF_WIDTH = PERIMETER_HALF_WIDTH;
export const ROUGH_BEYOND_FAIRWAY = PERIMETER_HALF_WIDTH - FAIRWAY_HALF_WIDTH;
export const ROUGH_WIDTH_VARIATION = 0;
export const ROUGH_END_EXTRA = 0;
export const ROUGH_GAP_MIN = 0;
export const GREEN_RX = GREEN_SIZE_MIN / 2;
export const GREEN_RY = 22;
export const TEE_RX = TEE_SIZE.w / 2;
export const TEE_RY = TEE_SIZE.h / 2;
export const BUNKER_RX = 16;
export const BUNKER_RY = 10;
export const BUNKER_OFFSET = 32;
export const BUNKER_BLOB_VERTICES = 10;
export const BUNKER_BLOB_JIGGLE = 0.22;
export const BUNKER_LANDING_T = 0.4;
export const BUNKER_GREENSIDE_T = 0.88;
export const HOLE_PATH_SAMPLES = 16;
export const RIBBON_CAP_SAMPLES = 10;
export const DOGLEG_MIN_HOLES = 3;
export const DOGLEG_MIN_TURN = 35;
export const HOLE_WALK_MAX = 160;
export const SHED_PROXIMITY_MAX = 200;
export const PATTERN_STRIPE_SPACING = 12;
export const PATTERN_STRIPE_WIDTH = 6;
export const PATTERN_RING_SPACING = 18;
export const PATTERN_CHECK_SIZE = 14;
export const PATTERN_OVERLAY_MIX = 0.28;
export const PATTERN_OPACITY_FRESH = 1;
export const PATTERN_OPACITY_OVERDUE = 0;
export const POND_CX = 90;
export const POND_CY = 380;
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
export const TEE_MARKER_OFFSET = 0;
export const TEE_MARKER_RADIUS = HOLE_NUMBER_RADIUS;
export const TEE_MARKER_FONT = 22;

export const DAYS_PER_SEASON = 30;
export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASON_ORDER.length;
export const GRACE_FINE_DAYS = 5;
export const GRACE_NO_STORM_DAYS = 10;
export const GRACE_NO_BREAKDOWN_DAYS = 10;
export const GRACE_NO_DISEASE_SEASON = 1;
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
export const FORECAST_DAYS = 7;
export const FORECAST_ACCURACY = [0.9, 0.8, 0.65, 0.5, 0.4, 0.3, 0.25];
export const FORECAST_OPACITY_MIN = 0.32;
export const WIND_SPEED_MIN = 4;
export const WIND_SPEED_MAX = 28;
export const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const STARTING_WIND_SPEED = 8;
export const STARTING_WIND_DIR = 'SW';
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
export const GRIND_AWAY_COST = nzPrice(400, 100);
export const GRIND_AWAY_DAYS = 2;
export const FOLEY_GRINDER_COST = nzPrice(15000, 1000);
export const FOLEY_GRIND_MINUTES = 90;
export const REPAIR_MINUTES = 120;
export const BREAKDOWN_BASE = 0.005;
export const BREAKDOWN_PER_WEAR = 0.0005;
export const AUTO_INTERRUPT_MIN_COUNT = 1;
export const AUTO_INTERRUPT_MAX_COUNT = 3;
export const AUTO_INTERRUPT_MIN_MINUTES = 10;
export const AUTO_INTERRUPT_MAX_MINUTES = 40;
export const ROLLER_GAIN_BONUS = 4;

export const SUITABILITY_IDEAL = 'ideal';
export const SUITABILITY_ACCEPTABLE = 'acceptable';
export const SUITABILITY_DAMAGING = 'damaging';
export const SUITABILITY_ACCEPTABLE_CEILING_PENALTY = 12;
export const SUITABILITY_DAMAGING_CEILING_PENALTY = 30;
export const SUITABILITY_DAMAGING_QUALITY_HIT = 18;
export const SUITABILITY_RANK = {
  [SUITABILITY_IDEAL]: 0,
  [SUITABILITY_ACCEPTABLE]: 1,
  [SUITABILITY_DAMAGING]: 2,
};
export const SUITABILITY_LABELS = {
  [SUITABILITY_IDEAL]: 'Ideal',
  [SUITABILITY_ACCEPTABLE]: 'Acceptable',
  [SUITABILITY_DAMAGING]: 'Damaging',
};
export const MACHINE_CLASS_PUSH_ROTARY = 'pushRotary';
export const MACHINE_CLASS_WALK_BEHIND_REEL = 'walkBehindReel';
export const MACHINE_CLASS_RIDING_GREENS_TRIPLEX = 'ridingGreensTriplex';
export const MACHINE_CLASS_RIDING_FAIRWAY_UNIT = 'ridingFairwayUnit';
export const MACHINE_CLASS_ROUGH_UTILITY = 'roughUtility';
export const MACHINE_TIME_MULT_PUSH_ROTARY = 1.2;
export const MACHINE_TIME_MULT_WALK_BEHIND_REEL = 1;
export const MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX = 0.45;
export const MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT = 0.35;
export const MACHINE_TIME_MULT_ROUGH_UTILITY = 0.4;
export const MACHINE_TIME_MULT = {
  [MACHINE_CLASS_PUSH_ROTARY]: MACHINE_TIME_MULT_PUSH_ROTARY,
  [MACHINE_CLASS_WALK_BEHIND_REEL]: MACHINE_TIME_MULT_WALK_BEHIND_REEL,
  [MACHINE_CLASS_RIDING_GREENS_TRIPLEX]: MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX,
  [MACHINE_CLASS_RIDING_FAIRWAY_UNIT]: MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT,
  [MACHINE_CLASS_ROUGH_UTILITY]: MACHINE_TIME_MULT_ROUGH_UTILITY,
};
export const MACHINE_SUITABILITY = {
  [MACHINE_CLASS_WALK_BEHIND_REEL]: {
    greens: SUITABILITY_IDEAL,
    tees: SUITABILITY_IDEAL,
    fairways: SUITABILITY_ACCEPTABLE,
    rough: SUITABILITY_DAMAGING,
  },
  [MACHINE_CLASS_RIDING_GREENS_TRIPLEX]: {
    greens: SUITABILITY_IDEAL,
    tees: SUITABILITY_IDEAL,
    fairways: SUITABILITY_ACCEPTABLE,
    rough: SUITABILITY_DAMAGING,
  },
  [MACHINE_CLASS_RIDING_FAIRWAY_UNIT]: {
    greens: SUITABILITY_DAMAGING,
    tees: SUITABILITY_DAMAGING,
    fairways: SUITABILITY_IDEAL,
    rough: SUITABILITY_ACCEPTABLE,
  },
  [MACHINE_CLASS_ROUGH_UTILITY]: {
    greens: SUITABILITY_DAMAGING,
    tees: SUITABILITY_DAMAGING,
    fairways: SUITABILITY_ACCEPTABLE,
    rough: SUITABILITY_IDEAL,
  },
  [MACHINE_CLASS_PUSH_ROTARY]: {
    greens: SUITABILITY_DAMAGING,
    tees: SUITABILITY_ACCEPTABLE,
    fairways: SUITABILITY_ACCEPTABLE,
    rough: SUITABILITY_ACCEPTABLE,
  },
};
export function SUITABILITY_PENALTY_COPY(suitability) {
  if (suitability === SUITABILITY_ACCEPTABLE) {
    return `Ceiling −${SUITABILITY_ACCEPTABLE_CEILING_PENALTY}`;
  }
  if (suitability === SUITABILITY_DAMAGING) {
    return `Ceiling −${SUITABILITY_DAMAGING_CEILING_PENALTY} and −${SUITABILITY_DAMAGING_QUALITY_HIT} quality on every hole worked`;
  }
  return 'No penalty';
}
export function DAMAGING_JOB_REASON(machineName, surfaceLabel) {
  return `${machineName} will scalp the ${surfaceLabel}: ceiling −${SUITABILITY_DAMAGING_CEILING_PENALTY} and an immediate −${SUITABILITY_DAMAGING_QUALITY_HIT} quality on every hole worked.`;
}
export const CONFIRM_DAMAGING_LABEL = 'Confirm damaging job';

export const PUSH_ROTARY_ID = 'pushRotary';
export const PUSH_ROTARY_COST = nzPrice(1200, 1000);
export const PUSH_ROTARY_CEILING = 65;
export const PUSH_ROTARY_TIME_MULT = MACHINE_TIME_MULT_PUSH_ROTARY;
export const GREENSMASTER_ID = 'greensmaster1000';
export const GREENSMASTER_COST = 0;
export const GREENSMASTER_CEILING = 68;
export const GREENSMASTER_TIME_MULT = MACHINE_TIME_MULT_WALK_BEHIND_REEL;
export const GREENSMASTER_START_CONDITION = 28;
export const REELMASTER_ID = 'reelmaster3100';
export const REELMASTER_COST = 0;
export const REELMASTER_CEILING = 62;
export const REELMASTER_TIME_MULT = MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT;
export const REELMASTER_START_CONDITION = 24;
export const WALK_BEHIND_COST = nzPrice(4500, 1000);
export const WALK_BEHIND_CEILING = 80;
export const WALK_BEHIND_TIME_MULT = MACHINE_TIME_MULT_WALK_BEHIND_REEL;
export const RIDE_ON_REEL_COST = nzPrice(22000, 1000);
export const RIDE_ON_REEL_CEILING = 92;
export const RIDE_ON_REEL_TIME_MULT = MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX;
export const PREMIUM_REEL_COST = nzPrice(48000, 1000);
export const PREMIUM_REEL_CEILING = 97;
export const PREMIUM_REEL_TIME_MULT = MACHINE_TIME_MULT_RIDING_GREENS_TRIPLEX;
export const FAIRWAY_UNIT_COST = nzPrice(30000, 1000);
export const FAIRWAY_UNIT_CEILING = 88;
export const FAIRWAY_UNIT_TIME_MULT = MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT;
export const VENTRAC_COST = nzPrice(18000, 1000);
export const VENTRAC_FAIRWAY_CEILING = 85;
export const VENTRAC_ROUGH_CEILING = 90;
export const VENTRAC_TIME_MULT = MACHINE_TIME_MULT_ROUGH_UTILITY;
export const GREENS_ROLLER_COST = nzPrice(9000, 1000);
export const GREENS_ROLLER_TIME_MULT = 0.7;
export const AUTONOMOUS_COST = nzPrice(35000, 1000);
export const AUTONOMOUS_CEILING = 85;
export const STARTING_MACHINE_ID = GREENSMASTER_ID;
export const STARTING_MACHINE_IDS = [GREENSMASTER_ID, REELMASTER_ID];
export const STARTING_MACHINE_CONDITIONS = {
  [GREENSMASTER_ID]: GREENSMASTER_START_CONDITION,
  [REELMASTER_ID]: REELMASTER_START_CONDITION,
};

export const MACHINE_BRAND_TORO = 'Toro';
export const MACHINE_BRAND_VENTRAC = 'Ventrac';
export const MACHINE_BRAND_NEXMOW = 'Nexmow';
export const MACHINE_BRAND_SALSCO = 'Salsco';
export const MACHINE_BRAND_FOLEY = 'Foley';
export const MODEL_PUSH_ROTARY = '21-inch rotary';
export const TYPE_PUSH_ROTARY = 'walk-behind rotary';
export const MODEL_GREENSMASTER = 'Greensmaster 1000';
export const TYPE_WALK_BEHIND_REEL = 'walk-behind reel';
export const MODEL_REELMASTER = 'Reelmaster 3100';
export const TYPE_RIDE_ON_FAIRWAY = 'ride-on fairway';
export const MODEL_WALK_BEHIND = 'Greensmaster 1600';
export const MODEL_RIDE_ON = 'Reelmaster 5410';
export const TYPE_RIDE_ON_REEL = 'ride-on reel';
export const MODEL_PREMIUM_REEL = 'Reelmaster 5610';
export const TYPE_PREMIUM_RIDE_ON = 'premium ride-on reel';
export const MODEL_FAIRWAY_UNIT = 'Reelmaster 5510';
export const MODEL_VENTRAC = '4500Z';
export const TYPE_ROUGH_UTILITY = 'rough and utility mower';
export const MODEL_GREENS_ROLLER = '0750';
export const TYPE_GREENS_ROLLER = 'greens roller';
export const MODEL_AUTONOMOUS = 'NX1';
export const TYPE_AUTONOMOUS = 'autonomous mower';
export const MACHINE_CLASS_BY_TYPE = {
  [TYPE_PUSH_ROTARY]: MACHINE_CLASS_PUSH_ROTARY,
  [TYPE_WALK_BEHIND_REEL]: MACHINE_CLASS_WALK_BEHIND_REEL,
  [TYPE_RIDE_ON_REEL]: MACHINE_CLASS_RIDING_GREENS_TRIPLEX,
  [TYPE_PREMIUM_RIDE_ON]: MACHINE_CLASS_RIDING_GREENS_TRIPLEX,
  [TYPE_RIDE_ON_FAIRWAY]: MACHINE_CLASS_RIDING_FAIRWAY_UNIT,
  [TYPE_ROUGH_UTILITY]: MACHINE_CLASS_ROUGH_UTILITY,
};
export const FOLEY_MODEL = 'Bedknife grinder';
export const FOLEY_TYPE = 'bedknife grinder';
export const HOURS_NEW = 0;
export const HOURS_USED_MIN = 180;
export const HOURS_USED_MAX = 620;
export const HOURS_MIGRATED = 400;
export const HOURS_STARTER_GREENSMASTER = 340;
export const HOURS_STARTER_REELMASTER = 480;
export const STARTING_MACHINE_HOURS = {
  [GREENSMASTER_ID]: HOURS_STARTER_GREENSMASTER,
  [REELMASTER_ID]: HOURS_STARTER_REELMASTER,
};
export const MACHINE_STATUS_NEW = 'New';
export const MACHINE_STATUS_BROKEN = 'Broken · needs repair';
export const MACHINE_STATUS_USED = (hours) => `Used · ${hours} hours`;
export const MACHINE_STATUS_LEASED = (amountLabel) => `Leased · ${amountLabel} per season`;
export const MACHINE_STATUS_ARRIVING = (day) => `Arriving day ${day}`;
export const MACHINE_STATUS_GRINDING = (day) => `In for grinding · back day ${day}`;
export const DELIVERIES_HEADING = 'Deliveries';
export const DELIVERIES_EMPTY_COPY = 'Nothing is on order.';
export const DELIVERY_SOURCE_NEW = 'new';
export const DELIVERY_SOURCE_EX_DEMO = 'ex-demo';
export const DELIVERY_SOURCE_USED = 'used';
export const DELIVERY_SOURCE_LABELS = {
  [DELIVERY_SOURCE_NEW]: 'New',
  [DELIVERY_SOURCE_EX_DEMO]: 'Ex-demo',
  [DELIVERY_SOURCE_USED]: 'Used',
};

export const CONDITION_MIN = 0;
export const CONDITION_MAX = 100;
export const STARTING_MACHINE_CONDITION = 100;
export const MIGRATED_MACHINE_CONDITION = 80;
export const NEW_PURCHASE_CONDITION = 100;
export const CONDITION_TIME_PENALTY_PER_POINT = 0.005;
export function conditionTimeMultFrom(condition) {
  return 1 + (CONDITION_MAX - condition) * CONDITION_TIME_PENALTY_PER_POINT;
}
export function defaultHeightPatternMult(surface) {
  const range = HOC_RANGE[surface];
  const factor = (range.max - range.default) / (range.max - range.min);
  return HOC_TIME_MULT(factor) * PATTERN_TIME_MULT[PATTERN_SURFACE_DEFAULT[surface]];
}
export function perHoleMinutesFromNineTarget(target, setup, surface, machineTimeMult, condition) {
  return (
    (target - setup) /
    (HOLE_COUNT * defaultHeightPatternMult(surface) * machineTimeMult * conditionTimeMultFrom(condition))
  );
}
export const PER_HOLE_MINUTES = {
  greens: perHoleMinutesFromNineTarget(
    NINE_GREENS_TARGET_MINUTES,
    JOB_SETUP_MINUTES.green,
    'greens',
    MACHINE_TIME_MULT_WALK_BEHIND_REEL,
    GREENSMASTER_START_CONDITION,
  ),
  tees: perHoleMinutesFromNineTarget(
    NINE_TEES_TARGET_MINUTES,
    JOB_SETUP_MINUTES.tee,
    'tees',
    MACHINE_TIME_MULT_WALK_BEHIND_REEL,
    GREENSMASTER_START_CONDITION,
  ),
  fairways: perHoleMinutesFromNineTarget(
    NINE_FAIRWAYS_TARGET_MINUTES,
    JOB_SETUP_MINUTES.fairway,
    'fairways',
    MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT,
    REELMASTER_START_CONDITION,
  ),
  rough: perHoleMinutesFromNineTarget(
    NINE_ROUGH_TARGET_MINUTES,
    JOB_SETUP_MINUTES.rough,
    'rough',
    MACHINE_TIME_MULT_RIDING_FAIRWAY_UNIT,
    REELMASTER_START_CONDITION,
  ),
};
export const BASE_MINUTES = {
  greens: PER_HOLE_MINUTES.greens * HOLE_COUNT,
  tees: PER_HOLE_MINUTES.tees * HOLE_COUNT,
  fairways: PER_HOLE_MINUTES.fairways * HOLE_COUNT,
  rough: PER_HOLE_MINUTES.rough * HOLE_COUNT,
};
export const CONDITION_LOSS_PER_USE = 1;
export const CONDITION_SLOW_THRESHOLD = 80;
export const MACHINE_DAILY_MINUTES = DAY_LENGTH_MINUTES;
export const SALESMAN_RELATIONSHIP_MIN = 0;
export const SALESMAN_RELATIONSHIP_MAX = 100;
export const SALESMAN_RELATIONSHIP_START = 50;
export const SALESMAN_BUY_RELATIONSHIP = 6;
export const SALESMAN_SELL_RELATIONSHIP = 3;
export const USED_LISTING_COUNT = 3;
export const USED_CONDITION_MIN = 45;
export const USED_CONDITION_MAX = 88;
export const USED_PRICE_FRACTION = 0.55;
export const USED_RELATIONSHIP_DISCOUNT_PER_POINT = 0.003;
export const USED_DELIVERY_DAYS = 3;
export const SALE_DAYS = 4;
export const SALE_PRICE_FRACTION = 0.4;
export const EVENT_KIND_MEMBER_DAY = 'memberDay';
export const EVENT_MAIL_KIND = 'eventInvite';
export const EVENT_RESPONSE_ACCEPT = 'accept';
export const EVENT_RESPONSE_DECLINE = 'decline';
export const EVENT_INVITE_DAY_OF_SEASON = 10;
export const EVENT_RESPOND_DAYS = 5;
export const EVENT_ACCEPT_STANDING = 4;
export const EVENT_DECLINE_STANDING = 3;

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
export const FIRING_SEVERANCE_DAYS = 14;
export const FIRING_MORALE_HIT = 15;
export const MORALE_SLOW_MULT = 1.2;
export const VOLUNTEER_MINUTES = 240;
export const VOLUNTEER_DAY = 3;
export const VOLUNTEER_LEGACY_WEEKDAY = 6;
export const VOLUNTEER_DEFAULT_WEEKDAY = VOLUNTEER_DAY;
export const VOLUNTEER_ID = 'volunteer';
export const VOLUNTEER_NAME = 'Volunteer';
export const VOLUNTEER_SPEED_SKILL = 2;
export const VOLUNTEER_QUALITY_SKILL = 2;
export const TRAINING_DAYS = 5;
export const TRAINING_COST = nzPrice(1200, 100);
export const TRAINING_SKILL_GAIN = 0.5;
export const EARLY_START_MINUTES = 60;
export const EARLY_START_WARNING_COUNT = 3;
export const EARLY_START_FINE_COUNT = 6;
export const EARLY_START_FINE = nzPrice(2000, 1000);
export const MECHANIC_WAGE = nzPrice(90, 5);
export const WAGE_BASE = nzPrice(45, 5);
export const WAGE_PER_SKILL = nzPrice(12, 5);
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
export const POND_DOSE_COST = nzPrice(40, 10);
export const POND_RESCUE_COST = nzPrice(400, 50);
export const POND_DOSE_WEEK_DAYS = DAYS_PER_WEEK;
export const POND_DOSE_WEEKLY_COST = POND_DOSE_COST * POND_DOSE_WEEK_DAYS;
export const HEALTHY_PONDS_BRAND = 'Healthy Ponds';
export const POND_DOSING_LABEL = 'Healthy Ponds dosing';
export const POND_RESCUE_LABEL = 'Pond rescue treatment';
export const POND_RESCUE_TASK = 'pondRescue';
export const CHECK_MOISTURE_LABEL = 'Check moisture';
export const ROLL_GREENS_LABEL = 'Roll';
export const ROLL_GREENS_TASK = 'rollGreens';
export const CHECK_MOISTURE_BY_SURFACE = {
  greens: 'checkMoistureGreens',
  tees: 'checkMoistureTees',
  fairways: 'checkMoistureFairways',
};
export const FERTILISE_BY_SURFACE = {
  greens: 'fertiliseGreens',
  tees: 'fertiliseTees',
  fairways: 'fertiliseFairways',
};
export const SPRAY_BY_SURFACE = {
  greens: 'sprayGreens',
  tees: 'sprayTees',
  fairways: 'sprayFairways',
};
export const INPUTS_SURFACES = ['greens', 'tees', 'fairways'];
export const GROUNDWATER_M3 = 20;
export const RAIN_POND_M3 = 150;
export const STORM_POND_M3 = 400;
export const MAINS_COST_PER_M3 = 2.5;
export const AERATOR_COST = nzPrice(6000, 1000);
export const SUMMER_UNDERWATER_DECAY = {
  greens: 10,
  tees: 4,
  fairways: 3,
};
export const DROUGHT_DECAY = SUMMER_UNDERWATER_DECAY;
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
export const SPRAY_MATERIALS_COST = nzPrice(600, 100);
export const SPRAY_SUPPRESS_DAYS = 14;
export const FERTILISER_MATERIALS_COST = nzPrice(450, 100);
export const FERTILISER_CEILING_BONUS = 5;
export const FERTILISER_DAYS = 21;
export const FERTILISER_BRAND = 'Plant Fitness';
export const DISEASE_PRESSURE_MAX = 100;
export const DISEASE_PRESSURE_MIN = 0;
export const DISEASE_PRESSURE_BASE = 6;
export const DISEASE_OUTBREAK_WARN = 45;
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
export const STARTING_OPENING_CASH = STARTING_CASH + STARTING_MAINTENANCE_BUDGET + STARTING_CAPITAL_BUDGET;
export const SEASON_GRANT_BASE = 30000;
export const GRANT_FORECAST_LEAD_DAYS = 7;
export const FORECAST_FUEL_LOOKBACK_DAYS = 7;
export const GRANT_BONUS_THRESHOLD = 5;
export const GRANT_BONUS_AMOUNT = 4000;
export const GRANT_PENALTY_AMOUNT = 4000;
export const GRANT_FORECAST_KIND = 'grantForecast';
export const GRANT_FORECAST_SUBJECT = 'Season grant coming';
export const LEASE_RATE = 0.1 * NZ_PRICE_MULT;
export const LOAN_LIMIT_MULTIPLIER = 2;
export const LOAN_INTEREST = 0.1;
export const INSOLVENT_DISMISS_STREAK = 2;
export const BUNKER_NEGLECT_DAYS = 7;
export const COMPLAINT_GREENS_QUALITY = 45;
export const COMPLAINT_ROUGH_DAYS = 7;
export const NEGLECT_THRESHOLD = {
  greens: 2,
  tees: 4,
  fairways: 4,
  rough: 10,
  bunkers: 3,
};
export const NEGLECT_GM_MULTIPLIER = 2;
export const NEGLECT_SATISFACTION_PENALTY = 2;
export const NEGLECT_GOLFER_AFTER = 1;
export const SIDEBAR_WIDTH = 380;
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
export const TOURNAMENT_SETUP_LEAD_DAYS = 7;
export const TOURNAMENT_SEASON_MAX = 3;
export const TOURNAMENT_WINTER_MAX = 1;
export const TOURNAMENT_PREP_DOUBLE_CUT_BONUS = 5;
export const TOURNAMENT_PREP_ROLL_BONUS = 4;
export const TOURNAMENT_PREP_EDGE_BONUS = 3;
export const GM_TOURNAMENT_DECLINE_STANDING = 8;

export const EXPANDED_HOLE_COUNT = 18;
export const TASK_TIME_MULT_18 = 2;
export const EXPAND_18_COST = nzPrice(180000, 1000);
export const EXPAND_18_DAYS = 60;
export const EXPAND_18_SATISFACTION_MIN = 70;
export const EXPAND_18_DAILY_MINUTES = 90;
export const DRIVING_RANGE_COST = nzPrice(60000, 1000);
export const DRIVING_RANGE_DAYS = 20;
export const DRIVING_RANGE_DAILY_MINUTES = 40;
export const AUTO_PICKER_COST = nzPrice(25000, 1000);
export const EXTRA_BUNKERS_COST = nzPrice(18000, 1000);
export const EXTRA_BUNKERS_DAYS = 10;
export const EXTRA_BUNKERS_DAILY_MINUTES = 30;
export const EXTRA_BUNKER_TIME_MULT = 1.3;
export const EXTRA_BUNKER_CEILING_BONUS = 8;
export const NEW_TEES_COST = nzPrice(22000, 1000);
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
export const BACK_NINE_OFFSET_X = 1320;
export const RANGE_X = 40;
export const RANGE_Y = 1080;
export const RANGE_WIDTH = 100;
export const RANGE_HEIGHT = 48;
export const SAVE_VERSION = 3;
export const SOUND_DEFAULT_ON = false;
export const SOUND_MOWER_FREQ = 90;
export const SOUND_BIRD_FREQ = 1800;
export const SOUND_BIRD_FREQ_B = 2200;
export const SOUND_TICK_MS = 220;
export const MOWER_ANIM_MS = 1800;
export const PLAYOUT_SPEEDS = [1, 2, 4];
export const PLAYOUT_SPEED_DEFAULT = 1;
export const PLAYOUT_SKIP_DEFAULT = false;
export const PLAYOUT_MS_PER_MINUTE = 12;
export const PLAYOUT_MIN_EVENT_MS = 480;
export const PLAYOUT_EMPTY_MS = 600;
export const PLAYOUT_END_HOLD_MS = 240;
export const SECTION_MAP = 'course';
export const SECTION_TURF = 'turf';
export const SECTION_OFFICE = 'office';
export const SECTION_CREW = 'crew';
export const SECTION_SHED = 'shed';
export const SECTIONS = [SECTION_MAP, SECTION_TURF, SECTION_OFFICE, SECTION_CREW, SECTION_SHED];
export const TURF_TAB_SUMMARY = 'summary';
export const TURF_TAB_MOWING = 'mowing';
export const TURF_TAB_IRRIGATION = 'irrigation';
export const TURF_TAB_INPUTS = 'inputs';
export const TURF_TAB_OTHER = 'other';
export const TURF_TAB_LEGACY_BUNKERS = 'bunkers';
export const TURF_TAB_LEGACY_POND = 'pond';
export const TURF_TAB_BUNKERS = TURF_TAB_OTHER;
export const TURF_TAB_POND = TURF_TAB_OTHER;
export const TURF_TAB_PRESETS = 'presets';
export const TURF_TABS = [
  TURF_TAB_SUMMARY,
  TURF_TAB_MOWING,
  TURF_TAB_IRRIGATION,
  TURF_TAB_INPUTS,
  TURF_TAB_OTHER,
  TURF_TAB_PRESETS,
];
export const TURF_TAB_DEFAULT = TURF_TAB_SUMMARY;
export const TURF_TAB_LABELS = {
  [TURF_TAB_SUMMARY]: 'Summary',
  [TURF_TAB_MOWING]: 'Mowing',
  [TURF_TAB_IRRIGATION]: 'Irrigation',
  [TURF_TAB_INPUTS]: 'Inputs',
  [TURF_TAB_OTHER]: 'Other',
  [TURF_TAB_BUNKERS]: 'Other',
  [TURF_TAB_POND]: 'Other',
  [TURF_TAB_PRESETS]: 'Presets',
};
export const PLAN_THIS_CUT_LABEL = 'Plan this cut';
export const MATCH_LAST_MOWING_LABEL = 'Match last mowing';
export const MACHINE_OVERRIDE_AUTO = 'auto';
export const MACHINE_OVERRIDE_FALLBACK = (name) => `${name} unavailable — auto`;
export const CUT_TASK_GREENS = 'cutGreens';
export const CUT_TASK_TEES = 'cutTees';
export const CUT_TASK_FAIRWAYS = 'cutFairways';
export const CUT_TASK_ROUGH = 'cutRough';
export const CUT_TASK_BY_SURFACE = {
  greens: CUT_TASK_GREENS,
  tees: CUT_TASK_TEES,
  fairways: CUT_TASK_FAIRWAYS,
  rough: CUT_TASK_ROUGH,
};
export const GM_MEETING_LEAD_DAYS = 2;
export const MORALE_BADGE_BELOW = MORALE_SLOW_BELOW;
export const START_DAY_LABEL = 'Start day';
export const DAY_FULLY_COMMITTED_COPY = 'The day is fully committed.';

/** Round 5 Phase D — unavailable workers and plan order. */
export const VOLUNTEER_OFF_REASON = 'Volunteer — not in today';
export const TRAINING_BACK_DAY_REASON = (name, backDay) => `${name} — training, back day ${backDay}`;
export const MORALE_HOME_REASON = (name) => `${name} — staying home (morale)`;
export const SICK_REASON = (name) => `${name} — off sick`;
export const WORKER_ABSENT_REASON = 'Not in today';
export const OVERRUN_DROP_COPY =
  'Top runs first. The last task is the one dropped if the day overruns.';
export const SIDEBAR_FIT_HEIGHT = 720;
export const SIDEBAR_NAV_GAP = 8;
export const SECTION_TURF_DESCRIPTION = 'Surfaces, mowing, irrigation';
export const SECTION_OFFICE_DESCRIPTION = 'Mail, money, tournaments';
export const SECTION_CREW_DESCRIPTION = 'Roster, hiring, training';
export const SECTION_SHED_DESCRIPTION = 'Fleet, service, buying';
export const SHIPPED_PRESET_DAILY = 'daily';
export const SHIPPED_PRESET_TOURNAMENT = 'tournament';
export const SHIPPED_PRESET_RECOVERY = 'recovery';
export const SHIPPED_PRESETS = [
  {
    id: SHIPPED_PRESET_DAILY,
    name: 'Daily',
    surfaces: {
      greens: { hoc: 3.5, pattern: PATTERN_STRIPES, angle: 0, autoRotate: false },
      tees: { hoc: 9, pattern: PATTERN_STRIPES, angle: 0, autoRotate: false },
      fairways: { hoc: 14, pattern: PATTERN_BLOCK, angle: 0, autoRotate: false },
      rough: { hoc: 45, pattern: PATTERN_BLOCK, angle: 0, autoRotate: false },
    },
  },
  {
    id: SHIPPED_PRESET_TOURNAMENT,
    name: 'Tournament',
    surfaces: {
      greens: { hoc: 2.8, pattern: PATTERN_STRIPES, angle: 45, autoRotate: false },
      tees: { hoc: 7, pattern: PATTERN_STRIPES, angle: 45, autoRotate: false },
      fairways: { hoc: 11, pattern: PATTERN_STRIPES, angle: 45, autoRotate: false },
      rough: { hoc: 40, pattern: PATTERN_STRIPES, angle: 0, autoRotate: false },
    },
  },
  {
    id: SHIPPED_PRESET_RECOVERY,
    name: 'Recovery',
    surfaces: {
      greens: { hoc: 4.5, pattern: PATTERN_BLOCK, angle: 0, autoRotate: true },
      tees: { hoc: 11, pattern: PATTERN_BLOCK, angle: 0, autoRotate: true },
      fairways: { hoc: 16, pattern: PATTERN_BLOCK, angle: 0, autoRotate: true },
      rough: { hoc: 55, pattern: PATTERN_BLOCK, angle: 0, autoRotate: true },
    },
  },
];
export const OFFICE_TAB_INBOX = 'inbox';
export const OFFICE_TAB_MONEY = 'money';
export const OFFICE_TAB_PROJECTS = 'projects';
export const OFFICE_TABS = [OFFICE_TAB_INBOX, OFFICE_TAB_MONEY, OFFICE_TAB_PROJECTS];
export const OFFICE_TAB_DEFAULT = OFFICE_TAB_INBOX;
export const OFFICE_TAB_LABELS = {
  [OFFICE_TAB_INBOX]: 'Inbox',
  [OFFICE_TAB_MONEY]: 'Money',
  [OFFICE_TAB_PROJECTS]: 'Projects',
};
export const CREW_TAB_ROSTER = 'roster';
export const CREW_TAB_HIRE = 'hire';
export const CREW_TABS = [CREW_TAB_ROSTER, CREW_TAB_HIRE];
export const CREW_TAB_DEFAULT = CREW_TAB_ROSTER;
export const CREW_TAB_LABELS = {
  [CREW_TAB_ROSTER]: 'Roster',
  [CREW_TAB_HIRE]: 'Hire',
};
export const SHED_TAB_YARD = 'yard';
export const SHED_TAB_BUY = 'buy';
export const SHED_TABS = [SHED_TAB_YARD, SHED_TAB_BUY];
export const SHED_TAB_DEFAULT = SHED_TAB_YARD;
export const SHED_TAB_LABELS = {
  [SHED_TAB_YARD]: 'Yard',
  [SHED_TAB_BUY]: 'Buy',
};
export const PRESET_MAX = 8;
export const PRESET_NAME_MAX = 24;
