import { GREEN_SHAPE_CIRCLE } from './constants.js';
import { expandHole, polygonCentroid } from '../engine/holeShape.js';
import { HOLE_POLYS } from './newCourse08Sept.js';

// New Course 08 SEPT from Figma "Golf Management Sim" (page 2:98, Frame 3).
// Coordinates are shifted so the sampled vectors sit near the origin.
// tee + green form the hole centerline (mower path only). Named Figma layers supply the polygons.

const DRYING_FACTORS = [1.12, 0.86, 1.3, 0.8, 1.24, 0.93, 1.0, 1.18, 1.06];

const HOLE_RECIPES = HOLE_POLYS.map((poly, index) => {
  const id = index + 1;
  const tee = polygonCentroid(poly.tees);
  const green = polygonCentroid(poly.green);
  return {
    id,
    dryingFactor: DRYING_FACTORS[index],
    tee,
    green,
    bend: null,
    greenShape: GREEN_SHAPE_CIRCLE,
    greenSize: 0,
    bunkers: [],
    schematic: {
      rough: poly.rough,
      tee: poly.tees,
      fairway: poly.fairway,
      bunkers: poly.bunkers,
      green: poly.green,
    },
  };
});

export const HOLE_SHAPES = HOLE_RECIPES.map(expandHole);

// Placeholder parked south of the holes. Pond/shed art lands later.
export const SHED = {
  x: 400,
  y: 2360,
  width: 200,
  height: 72,
  roof: 48,
  doorWidth: 36,
  doorHeight: 40,
};
