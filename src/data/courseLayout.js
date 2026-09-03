import { BUNKER_GREENSIDE_T, BUNKER_LANDING_T, BUNKER_RX } from './constants.js';
import { expandHole } from '../engine/holeShape.js';

const HOLE_RECIPES = [
  {
    id: 1,
    dogleg: true,
    centerline: [
      [520, 770],
      [540, 600],
      [760, 500],
    ],
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, radius: BUNKER_RX },
      { t: BUNKER_GREENSIDE_T, side: -1, radius: 13 },
    ],
  },
  {
    id: 2,
    dogleg: true,
    centerline: [
      [830, 460],
      [1000, 390],
      [1050, 220],
    ],
    bunkers: [
      { t: BUNKER_LANDING_T, side: -1, radius: BUNKER_RX },
      { t: BUNKER_GREENSIDE_T, side: 1, radius: 12 },
    ],
  },
  {
    id: 3,
    dogleg: false,
    centerline: [
      [980, 140],
      [760, 60],
      [560, 55],
    ],
    bunkers: [],
  },
  {
    id: 4,
    dogleg: false,
    centerline: [
      [520, 70],
      [330, 150],
      [220, 270],
    ],
    bunkers: [],
  },
  {
    id: 5,
    dogleg: true,
    centerline: [
      [250, 330],
      [190, 510],
      [290, 660],
    ],
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, radius: 15 },
      { t: BUNKER_GREENSIDE_T, side: -1, radius: BUNKER_RX },
    ],
  },
  {
    id: 6,
    dogleg: false,
    centerline: [
      [340, 710],
      [360, 790],
      [400, 840],
    ],
    bunkers: [],
  },
  {
    id: 7,
    dogleg: false,
    centerline: [
      [530, 880],
      [600, 878],
      [670, 875],
    ],
    bunkers: [{ t: BUNKER_GREENSIDE_T, side: 1, radius: 14 }],
  },
  {
    id: 8,
    dogleg: true,
    centerline: [
      [750, 870],
      [940, 800],
      [1100, 850],
    ],
    bunkers: [
      { t: BUNKER_LANDING_T, side: 1, radius: BUNKER_RX },
      { t: BUNKER_GREENSIDE_T, side: -1, radius: 13 },
    ],
  },
  {
    id: 9,
    dogleg: false,
    centerline: [
      [1060, 960],
      [800, 990],
      [580, 970],
    ],
    bunkers: [],
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
