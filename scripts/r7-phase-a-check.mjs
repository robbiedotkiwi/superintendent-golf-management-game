/**
 * Round 7 Phase A: per-hole, per-surface quality.
 * Run: node scripts/r7-phase-a-check.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  CONDITION_WEIGHTS,
  HOLE_COUNT,
  SAVE_VERSION,
  STARTING_QUALITY_FAIRWAYS,
  STARTING_QUALITY_GREENS,
  SURFACE_SINGULAR,
  TRACKED_SURFACES_NINE,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  courseCondition,
  holeCount,
  holeSurface,
  isHoleModel,
  meanQuality,
  surfaceSettings,
} from '../src/engine/holes.js';
import { migrateSave } from '../src/engine/save.js';
import { COMPLAINT_HOLE_CUT_BODY } from '../src/data/constants.js';
import { neglectMail } from '../src/engine/neglect.js';

assert.equal(SAVE_VERSION, 2);
assert.equal(TRACKED_SURFACES_NINE, 45);

const start = createInitialState();
assert.ok(isHoleModel(start.holes));
assert.equal(holeCount(start), HOLE_COUNT);
assert.equal(start.holes.length, HOLE_COUNT);
assert.equal(typeof start.holes, 'object');
assert.notEqual(start.holes, HOLE_COUNT);

for (const hole of start.holes) {
  assert.equal(typeof hole.green.quality, 'number');
  assert.equal(typeof hole.tee.quality, 'number');
  assert.equal(typeof hole.fairway.quality, 'number');
  assert.equal(typeof hole.rough.quality, 'number');
  assert.ok(hole.bunker == null || typeof hole.bunker.quality === 'number');
  assert.ok('lastMownDay' in hole.green);
  assert.ok('override' in hole.green);
  assert.ok('moisture' in hole.green);
  assert.ok('dryingFactor' in hole.green);
}

assert.equal(meanQuality(start, 'greens'), STARTING_QUALITY_GREENS);
assert.ok(start.surfaceDefaults.greens.hoc);

let cutSome = {
  ...start,
  holes: start.holes.map((hole) =>
    hole.id <= 3
      ? { ...hole, green: { ...hole.green, quality: 20, lastMownDay: start.day } }
      : { ...hole, green: { ...hole.green, quality: 80 } },
  ),
};
assert.ok(holeSurface(cutSome, 1, 'greens').quality !== holeSurface(cutSome, 7, 'greens').quality);
const cond = courseCondition(cutSome);
const expected =
  ((20 + 20 + 20 + 80 + 80 + 80 + 80 + 80 + 80) / 9) * CONDITION_WEIGHTS.greens +
  meanQuality(cutSome, 'tees') * CONDITION_WEIGHTS.tees +
  meanQuality(cutSome, 'fairways') * CONDITION_WEIGHTS.fairways +
  meanQuality(cutSome, 'rough') * CONDITION_WEIGHTS.rough +
  meanQuality(cutSome, 'bunkers') * CONDITION_WEIGHTS.bunkers;
assert.ok(Math.abs(cond - expected) < 0.001);
const allLow = {
  ...cutSome,
  holes: cutSome.holes.map((hole) => ({ ...hole, green: { ...hole.green, quality: 20 } })),
};
assert.ok(courseCondition(cutSome) > courseCondition(allLow));

const overridden = reducer(start, {
  type: 'SET_HOLE_OVERRIDE',
  holeId: 4,
  surface: 'greens',
  override: { hoc: 4.5, pattern: start.surfaceDefaults.greens.pattern, angle: 90, autoRotate: false },
});
assert.equal(surfaceSettings(overridden, 4, 'greens').hoc, 4.5);
assert.equal(surfaceSettings(overridden, 5, 'greens').hoc, start.surfaceDefaults.greens.hoc);

const neglected = {
  ...start,
  day: 4,
  holes: start.holes.map((hole) => ({
    ...hole,
    green: {
      ...hole.green,
      lastMownDay: hole.id === 4 ? 1 : 4,
    },
  })),
};
const mail = neglectMail(neglected);
assert.ok(mail.some((item) => item.body.includes(COMPLAINT_HOLE_CUT_BODY(SURFACE_SINGULAR.greens, 4, 7)) || item.body.includes('on 4')));
assert.ok(mail.some((item) => /4/.test(item.body)));

const oldSave = migrateSave({
  day: 4,
  holes: HOLE_COUNT,
  surfaces: {
    greens: { quality: 61 },
    tees: { quality: 52 },
    fairways: { quality: 48 },
    rough: { quality: 41 },
    bunkers: { quality: 33 },
  },
});
assert.ok(oldSave);
assert.ok(isHoleModel(oldSave.holes));
assert.equal(oldSave.saveVersion, SAVE_VERSION);
for (const hole of oldSave.holes) {
  assert.equal(hole.green.quality, 61);
  assert.equal(hole.tee.quality, 52);
  assert.equal(hole.fairway.quality, 48);
  assert.equal(hole.rough.quality, 41);
  if (hole.bunker) assert.equal(hole.bunker.quality, 33);
}
console.log('MIGRATED_SAVE holes=' + oldSave.holes.length + ' greensQuality=' + oldSave.holes.map((h) => h.green.quality).join(','));

const refused = migrateSave({ day: 'nope' });
assert.equal(refused, null);

let grep = '';
try {
  grep = execFileSync(
    'rg',
    ['-n', 'state\\.surfaces|surfaces\\.greens|surfaces\\.tees|surfaces\\.fairways|surfaces\\.rough|surfaces\\.bunkers', 'src'],
    { encoding: 'utf8', cwd: new URL('..', import.meta.url) },
  );
} catch (error) {
  grep = error.stdout ?? '';
}
const leftover = grep
  .trim()
  .split('\n')
  .filter((line) => line && !line.includes('src/engine/save.js') && !line.includes('src/engine/holes.js'));
assert.equal(leftover.join('\n'), '', leftover.join('\n'));

console.log('GREP old grouped access: clean (only save/holes migration readers remain)');
console.log('GATE A1 PASS every hole tracks its own quality, last-worked day and settings');
console.log('GATE A2 PASS cutting some holes leaves different per-hole qualities for the map');
console.log('GATE A3 PASS course condition is a weighted mean of per-type means');
console.log('GATE A4 PASS course-wide defaults apply; per-hole override wins');
console.log('GATE A5 PASS complaints name specific holes');
console.log('GATE A6 PASS old grouped save fans each score to every hole of that type');
console.log('round 7 phase A checks passed');
