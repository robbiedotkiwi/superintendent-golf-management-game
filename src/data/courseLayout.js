import {
  BUNKER_LANDING_T,
  BUNKER_GREENSIDE_T,
  BUNKER_SHAPE_BEAN,
  BUNKER_SHAPE_SEMI,
  GREEN_SHAPE_BEAN,
  GREEN_SHAPE_CIRCLE,
  GREEN_SHAPE_KIDNEY_LEFT,
  GREEN_SHAPE_KIDNEY_RIGHT,
  GREEN_SHAPE_LONG,
  GREEN_SHAPE_OVAL,
  GREEN_SHAPE_PEAR,
  GREEN_SHAPE_TEARDROP,
  GREEN_SHAPE_WIDE,
} from './constants.js';
import { expandHole } from '../engine/holeShape.js';

// tee + optional bend + green form the hole centerline; bunkers are { t, side, size, shape }.

const HOLE_RECIPES = [
  {
    id: 1,
    dryingFactor: 1.12,
    tee: [520, 770],
    green: [545, 530],
    bend: null,
    greenShape: GREEN_SHAPE_CIRCLE,
    greenSize: 62,
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, size: 28, shape: BUNKER_SHAPE_SEMI },
      { t: BUNKER_GREENSIDE_T, side: -1, size: 24, shape: BUNKER_SHAPE_BEAN },
    ],
  },
  {
    id: 2,
    dryingFactor: 0.86,
    tee: [670, 500],
    bend: [800, 420],
    green: [760, 270],
    greenShape: GREEN_SHAPE_OVAL,
    greenSize: 70,
    bunkers: [
      { t: BUNKER_LANDING_T, side: -1, size: 32, shape: BUNKER_SHAPE_SEMI },
      { t: 0.7, side: 1, size: 26, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_GREENSIDE_T, side: 1, size: 24, shape: BUNKER_SHAPE_SEMI },
    ],
  },
  {
    id: 3,
    dryingFactor: 1.3,
    tee: [900, 260],
    green: [1120, 280],
    bend: null,
    greenShape: GREEN_SHAPE_KIDNEY_LEFT,
    greenSize: 66,
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, size: 30, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_GREENSIDE_T, side: -1, size: 26, shape: BUNKER_SHAPE_SEMI },
    ],
  },
  {
    id: 4,
    dryingFactor: 0.8,
    tee: [1140, 420],
    bend: [1060, 560],
    green: [1145, 700],
    greenShape: GREEN_SHAPE_KIDNEY_RIGHT,
    greenSize: 74,
    bunkers: [
      { t: 0.35, side: 1, size: 34, shape: BUNKER_SHAPE_SEMI },
      { t: 0.58, side: -1, size: 28, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_GREENSIDE_T, side: 1, size: 24, shape: BUNKER_SHAPE_SEMI },
      { t: 0.92, side: -1, size: 26, shape: BUNKER_SHAPE_BEAN },
    ],
  },
  {
    id: 5,
    dryingFactor: 1.24,
    tee: [1010, 780],
    green: [990, 1000],
    bend: null,
    greenShape: GREEN_SHAPE_PEAR,
    greenSize: 68,
    bunkers: [
      { t: BUNKER_LANDING_T, side: -1, size: 30, shape: BUNKER_SHAPE_SEMI },
      { t: BUNKER_GREENSIDE_T, side: 1, size: 36, shape: BUNKER_SHAPE_BEAN },
      { t: 0.72, side: 1, size: 24, shape: BUNKER_SHAPE_SEMI },
    ],
  },
  {
    id: 6,
    dryingFactor: 0.93,
    tee: [860, 1040],
    green: [860, 1180],
    bend: null,
    greenShape: GREEN_SHAPE_WIDE,
    greenSize: 58,
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, size: 26, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_GREENSIDE_T, side: -1, size: 24, shape: BUNKER_SHAPE_SEMI },
    ],
  },
  {
    id: 7,
    dryingFactor: 1.0,
    tee: [720, 1180],
    green: [560, 1180],
    bend: null,
    greenShape: GREEN_SHAPE_BEAN,
    greenSize: 64,
    bunkers: [
      { t: BUNKER_LANDING_T, side: -1, size: 28, shape: BUNKER_SHAPE_SEMI },
      { t: 0.65, side: 1, size: 26, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_GREENSIDE_T, side: 1, size: 24, shape: BUNKER_SHAPE_SEMI },
    ],
  },
  {
    id: 8,
    dryingFactor: 1.18,
    tee: [420, 1180],
    green: [280, 1180],
    bend: null,
    greenShape: GREEN_SHAPE_LONG,
    greenSize: 78,
    bunkers: [
      { t: 0.32, side: 1, size: 32, shape: BUNKER_SHAPE_BEAN },
      { t: BUNKER_LANDING_T, side: -1, size: 28, shape: BUNKER_SHAPE_SEMI },
      { t: BUNKER_GREENSIDE_T, side: -1, size: 30, shape: BUNKER_SHAPE_BEAN },
    ],
  },
  {
    id: 9,
    dryingFactor: 1.06,
    tee: [280, 1060],
    bend: [700, 1060],
    green: [660, 880],
    greenShape: GREEN_SHAPE_TEARDROP,
    greenSize: 72,
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, size: 28, shape: BUNKER_SHAPE_SEMI },
      { t: BUNKER_GREENSIDE_T, side: -1, size: 26, shape: BUNKER_SHAPE_BEAN },
    ],
  },
];

export const HOLE_SHAPES = HOLE_RECIPES.map(expandHole);

export const SHED = {
  x: 430,
  y: 900,
  width: 120,
  height: 56,
  roof: 28,
  doorWidth: 22,
  doorHeight: 28,
};
