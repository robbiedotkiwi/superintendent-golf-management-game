/**
 * Passes-model tuning. Every number the sim uses for passes, grades,
 * wear steps, staff morale, support tasks, and capex lives here.
 * Retune by editing this file only — game logic must import these names.
 */

export const MINUTES_PER_HOUR = 60;
export const SLOT_MINUTES = 30;
export const STANDARD_WORK_DAYS = 5;
export const MAX_WORK_DAYS = 7;

export const PASS_AREAS = ['greens', 'tees', 'fairways', 'rough'];

export const PASSES_REQUIRED_PER_WEEK = {
  greens: 5,
  tees: 2,
  fairways: 2,
  rough: 1,
};

export const MAX_PASSES_PER_AREA_PER_DAY = 1;

export const PASS_CLASS_PUSH_REEL = 'pushReel';
export const PASS_CLASS_PUSH_ROTARY = 'pushRotary';
export const PASS_CLASS_RIDE_ON_REEL = 'rideOnReel';
export const PASS_CLASS_RIDE_ON_ROTARY = 'rideOnRotary';
export const PASS_CLASS_AUTONOMOUS = 'autonomous';
export const PASS_CLASS_ROLLER = 'roller';

export const PASS_HOURS = {
  [PASS_CLASS_PUSH_REEL]: { greens: 8, tees: 4 },
  [PASS_CLASS_PUSH_ROTARY]: { tees: 6, fairways: 40, rough: 30 },
  [PASS_CLASS_RIDE_ON_REEL]: { greens: 4, tees: 2, fairways: 8 },
  [PASS_CLASS_RIDE_ON_ROTARY]: { tees: 3, fairways: 16, rough: 12 },
  [PASS_CLASS_AUTONOMOUS]: { fairways: 16, rough: 12 },
};

export const GRADE_CAP_LETTER = {
  [PASS_CLASS_PUSH_REEL]: { greens: 'A', tees: 'A-' },
  [PASS_CLASS_PUSH_ROTARY]: { tees: 'C', fairways: 'D', rough: 'C' },
  [PASS_CLASS_RIDE_ON_REEL]: { greens: 'A+', tees: 'A+', fairways: 'B+' },
  [PASS_CLASS_RIDE_ON_ROTARY]: { tees: 'B', fairways: 'B', rough: 'A-' },
  [PASS_CLASS_AUTONOMOUS]: { fairways: 'C', rough: 'C' },
};

export const AUTONOMOUS_AREAS = ['fairways', 'rough'];
export const ROTARY_CLASSES = [PASS_CLASS_PUSH_ROTARY, PASS_CLASS_RIDE_ON_ROTARY];
export const REEL_CLASSES = [PASS_CLASS_PUSH_REEL, PASS_CLASS_RIDE_ON_REEL];

export const WEAR_STEP_NONE_MAX = 25;
export const WEAR_STEP_LIGHT_MAX = 50;
export const WEAR_STEP_HEAVY_MAX = 75;
export const WEAR_TIME_MULT_NONE = 1;
export const WEAR_TIME_MULT_LIGHT = 1.1;
export const WEAR_TIME_MULT_HEAVY = 1.25;
export const WEAR_TIME_MULT_CRITICAL = 1.5;

export const GRADE_BANDS = [
  { letter: 'A+', min: 97 },
  { letter: 'A', min: 93 },
  { letter: 'A-', min: 90 },
  { letter: 'B+', min: 87 },
  { letter: 'B', min: 83 },
  { letter: 'B-', min: 80 },
  { letter: 'C+', min: 77 },
  { letter: 'C', min: 73 },
  { letter: 'C-', min: 70 },
  { letter: 'D+', min: 67 },
  { letter: 'D', min: 63 },
  { letter: 'D-', min: 60 },
  { letter: 'F', min: 0 },
];

export const QUALITY_MIN = 0;
export const QUALITY_MAX = 100;
export const QUALITY_DRIFT_RATE_PER_DAY = 0.12;
export const QUALITY_PENALTY_WET_CUT = 4;
export const QUALITY_PENALTY_SCALP = 8;
export const QUALITY_PENALTY_MISS_WEEK = 12;
export const WET_PASS_TIME_MULT = 1.25;
export const ROLL_GRADE_CONTRIBUTION = 0.35;
export const CUP_CHANGES_REQUIRED_PER_WEEK = 2;
export const CUP_MISS_QUALITY_PENALTY = 4;

export const STAFF_TIER_UNSKILLED = 'unskilled';
export const STAFF_TIER_JUNIOR = 'junior';
export const STAFF_TIER_SENIOR = 'senior';

export const STAFF_TIER_LABELS = {
  [STAFF_TIER_UNSKILLED]: 'Unskilled',
  [STAFF_TIER_JUNIOR]: 'Skilled junior',
  [STAFF_TIER_SENIOR]: 'Skilled senior',
};

export const SENIOR_PASS_TIME_MULT = 0.9;
export const JUNIOR_PASS_TIME_MULT = 1;
export const UNSKILLED_PASS_TIME_MULT = 1;

export const STAFF_RATING_UNSKILLED = 30;
export const STAFF_RATING_JUNIOR = 55;
export const STAFF_RATING_SENIOR = 80;

export const PLAYER_TIER = STAFF_TIER_SENIOR;
export const VOLUNTEER_TIER = STAFF_TIER_UNSKILLED;
export const VOLUNTEER_WEEKLY_HOURS = 4;
export const VOLUNTEER_REWARD_DAYS = 2;
export const VOLUNTEER_REWARD_SATISFACTION = 70;
export const VOLUNTEER_SURFACES = ['fairways', 'rough', 'bunkers'];

export const SICK_CHANCE_AT_MORALE_0 = 0.35;
export const SICK_CHANCE_AT_MORALE_100 = 0.02;
export const RESIGN_MORALE_THRESHOLD = 25;
export const RESIGN_STREAK_DAYS = 14;
export const LEAVE_APPROVE_MORALE = 8;
export const LEAVE_DECLINE_MORALE = -12;
export const DAYS_OVER_FIVE_MORALE_HIT = -6;
export const DAYS_OVER_SIX_MORALE_HIT = -12;
export const LEAVE_DEFAULT_DAYS = 5;

export const BUNKER_MINUTES_EACH = 30;
export const CUP_CHANGE_MINUTES = 120;
export const MOISTURE_METER_MINUTES = 120;
export const ROLL_GREENS_MINUTES = 180;
export const WEED_EATING_MINUTES = 240;
export const GM_MEETING_MINUTES = 60;
export const GENERAL_DUTIES_MINUTES = 300;
export const GENERAL_DUTIES_SKIP_WEEKS_FOR_COMMENT = 3;
export const SPRAY_GREENS_TEES_MINUTES = 240;
export const SPRAY_FAIRWAYS_MINUTES = 480;
export const SPRAY_WIND_MAX = 18;
export const SPRAY_RAIN_CLEAR_HOURS = 6;
export const CORING_MINUTES = 960;
export const CORING_QUALITY_DROP = 18;
export const CORING_RECOVERY_DAYS = 18;
export const CORING_SKIP_SEASONS_FOR_CEILING_HIT = 2;
export const CORING_CEILING_DROP = 8;
export const CORING_SEASONS = ['spring', 'autumn'];

export const MONTHLY_BUDGET_BASE = 12000;
export const MONTHLY_BUDGET_PER_QUALITY = 80;
export const SEASON_CAPEX_BASE = 25000;
export const SEASON_1_CAPEX_WEEK = 6;
export const EXPAND_3_HOLE_COST = 45000;
export const EXPAND_3_HOLE_DAYS = 42;
export const EXPAND_9_HOLE_COST = 120000;
export const EXPAND_9_HOLE_DAYS = 84;
export const GROW_IN_QUALITY_OFFSET = -15;
export const GROW_IN_DAYS = 84;
export const GM_REQUIRED_GRADE_BASE = 70;
export const GM_REQUIRED_GRADE_PER_HOLE = 0.35;
export const PROJECT_OCCUPIES_PERSON = true;

export const FORECAST_UNRELIABLE_FROM_DAY = 5;
export const FORECAST_UNRELIABLE_ACCURACY = 0.45;
export const WET_WEATHER = ['rain', 'storm'];

export const STARTING_AREA_QUALITY = {
  greens: 55,
  tees: 50,
  fairways: 50,
  rough: 45,
  bunkers: 40,
};

export const GRADE_TREND_DELTA = 0.4;
export const WEEKLY_TARGET_QUALITY_SCALE = 100;
export const WORK_DAY_MINUTES = 480;
export const BUNKER_COUNT_DEFAULT = 6;
export const BUNKER_RAKE_QUALITY_GAIN = 2;
export const AUTONOMOUS_NIGHT_MINUTES = 720;
export const AUTONOMOUS_UNSTICK_CHANCE = 0.08;
export const AUTONOMOUS_UNSTICK_MINUTES = 30;
export const OWN_MOWER_PASS_CLASS = PASS_CLASS_PUSH_ROTARY;
export const LEAVE_REQUEST_CHANCE_PER_WEEK = 0.12;
export const SICK_DAYS_MIN = 1;
export const SICK_DAYS_MAX = 2;
export const TEMPLATE_NAME_MAX = 40;
export const TEMPLATE_CAP = 12;
export const GROW_IN_PASSES_REQUIRED_MULT = 1.5;
export const CORING_SATISFACTION_HIT = 8;
export const CORING_GM_STANDING_HIT = 6;
export const GENERAL_DUTIES_MINUTES_MIN = 240;
export const GENERAL_DUTIES_MINUTES_MAX = 360;
export const SPRAY_PREVENTION_DAYS = 21;
export const DRY_SPELL_DAYS = 4;
export const DAYS_PER_MONTH = 28;
export const VOLUNTEER_REWARD_HOURS_PER_DAY = 4;
export const SCALP_HOC_STRESS_BAND = true;
export const WEAR_STEP_MARKS = [WEAR_STEP_NONE_MAX, WEAR_STEP_LIGHT_MAX, WEAR_STEP_HEAVY_MAX, 100];
export const ROLL_PASS_HOURS = 3;
export const TASK_GENERAL_DUTIES = 'generalDuties';
export const TASK_WEED_EAT = 'weedEat';
export const TASK_CORE_GREENS = 'coreGreens';
export const TASK_UNSTICK = 'unstickMower';
export const PROJECT_EXPAND_3 = 'expand3';
export const PROJECT_EXPAND_9 = 'expand9';
export const CAPEX_STATUS_PENDING = 'pending';
export const CAPEX_STATUS_RELEASED = 'released';
export const CAPEX_STATUS_MISSED = 'missed';
export const CAPEX_STATUS_GRANTED = 'granted';
export const SEASON_1_YEAR = 1;
export const COPY_FLAG_AWAY = 'away';
export const COPY_FLAG_SHED = 'shed';
export const COPY_FLAG_TIER = 'tier';
export const MEDIUM_GRADE_LETTER = 'C';
export const STARTING_CAPEX = 0;
export const STARTING_MONTHLY_BUDGET = MONTHLY_BUDGET_BASE;

import {
  MACHINE_CLASS_AUTONOMOUS,
  MACHINE_CLASS_PUSH_ROTARY,
  MACHINE_CLASS_RIDING_FAIRWAY_UNIT,
  MACHINE_CLASS_RIDING_GREENS_TRIPLEX,
  MACHINE_CLASS_ROLLER,
  MACHINE_CLASS_ROUGH_UTILITY,
  MACHINE_CLASS_WALK_BEHIND_REEL,
} from './constants.js';

export const PASS_CLASS_BY_CATALOG = {
  [MACHINE_CLASS_WALK_BEHIND_REEL]: PASS_CLASS_PUSH_REEL,
  [MACHINE_CLASS_PUSH_ROTARY]: PASS_CLASS_PUSH_ROTARY,
  [MACHINE_CLASS_RIDING_GREENS_TRIPLEX]: PASS_CLASS_RIDE_ON_REEL,
  [MACHINE_CLASS_RIDING_FAIRWAY_UNIT]: PASS_CLASS_RIDE_ON_REEL,
  [MACHINE_CLASS_ROUGH_UTILITY]: PASS_CLASS_RIDE_ON_ROTARY,
  [MACHINE_CLASS_AUTONOMOUS]: PASS_CLASS_AUTONOMOUS,
  [MACHINE_CLASS_ROLLER]: PASS_CLASS_ROLLER,
};
