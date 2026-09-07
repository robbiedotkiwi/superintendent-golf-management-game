import { GREEN_SHAPE_CIRCLE } from './constants.js';
import { expandHole } from '../engine/holeShape.js';

// Simple Course frame from Figma "Golf Management Sim" (node 2:93).
// Coordinates are frame-local: origin at the top-left of the 2911×800 artboard.

const HOLE_WIDTH = 917;
const HOLE_HEIGHT = 160;
const HOLE_GAP = 40;
const HOLE_ORIGIN = 40;
const HOLE_COLS = 3;

const TEE_RECT = { x: 20, y: 20, w: 60, h: 120 };
const FAIRWAY_RECT = { x: 120, y: 30, w: 500, h: 100 };
const GREEN_RECT = { x: 660, y: 20, w: 120, h: 120 };
const NUMBER_RECT = { x: 820, y: 22, w: 77, h: 116 };

// Fairway vector path in the 500×100 fairway box (Figma node Fairway).
const FAIRWAY_LOCAL = [
  [0, 0],
  [250, 12.5],
  [500, 0],
  [500, 100],
  [250, 87.5],
  [0, 100],
];

const DRYING_FACTORS = [1.12, 0.86, 1.3, 0.8, 1.24, 0.93, 1.0, 1.18, 1.06];

function holeOrigin(id) {
  const col = (id - 1) % HOLE_COLS;
  const row = Math.floor((id - 1) / HOLE_COLS);
  return [HOLE_ORIGIN + col * (HOLE_WIDTH + HOLE_GAP), HOLE_ORIGIN + row * (HOLE_HEIGHT + HOLE_GAP)];
}

// tee + green form the hole centerline. Schematic polygons come from named Figma layers.

const HOLE_RECIPES = DRYING_FACTORS.map((dryingFactor, index) => {
  const id = index + 1;
  const [hx, hy] = holeOrigin(id);
  const tee = [hx + TEE_RECT.x + TEE_RECT.w / 2, hy + TEE_RECT.y + TEE_RECT.h / 2];
  const green = [hx + GREEN_RECT.x + GREEN_RECT.w / 2, hy + GREEN_RECT.y + GREEN_RECT.h / 2];
  return {
    id,
    dryingFactor,
    tee,
    green,
    bend: null,
    greenShape: GREEN_SHAPE_CIRCLE,
    greenSize: GREEN_RECT.w,
    bunkers: [],
    schematic: {
      rough: { x: hx, y: hy, w: HOLE_WIDTH, h: HOLE_HEIGHT },
      tee: { x: hx + TEE_RECT.x, y: hy + TEE_RECT.y, w: TEE_RECT.w, h: TEE_RECT.h },
      fairway: FAIRWAY_LOCAL.map(([x, y]) => [x + hx + FAIRWAY_RECT.x, y + hy + FAIRWAY_RECT.y]),
      green: { cx: green[0], cy: green[1], r: GREEN_RECT.w / 2 },
      marker: {
        cx: hx + NUMBER_RECT.x + NUMBER_RECT.w / 2,
        cy: hy + NUMBER_RECT.y + NUMBER_RECT.h / 2,
      },
    },
  };
});

export const HOLE_SHAPES = HOLE_RECIPES.map(expandHole);

// Figma Shed vector: house pentagon 200×120 at (997, 640); eaves at y ≈ 48.
export const SHED = {
  x: 997,
  y: 688,
  width: 200,
  height: 72,
  roof: 48,
  doorWidth: 36,
  doorHeight: 40,
};
