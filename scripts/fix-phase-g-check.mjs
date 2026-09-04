/**
 * Fixes Round 2 Phase G gates.
 * Run: node scripts/fix-phase-g-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAYS_PER_SEASON,
  STARTING_DAY,
  TOURNAMENT_SETUP_LEAD_DAYS,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import { comingSeason, isTournamentPromptDay, tournamentPromptDay } from '../src/engine/tournament.js';

const start = createInitialState();
assert.equal(start.day, STARTING_DAY);
assert.equal(start.pendingTournamentSetup, false);
assert.equal(start.tournaments.length, 0);
assert.ok(!start.inbox.some((item) => item.kind === 'tournamentRequest'));

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(app, /SeasonStart/);
assert.doesNotMatch(app, /pendingTournamentSetup/);

assert.equal(TOURNAMENT_SETUP_LEAD_DAYS, 7);
assert.equal(tournamentPromptDay(STARTING_DAY), DAYS_PER_SEASON - TOURNAMENT_SETUP_LEAD_DAYS);
assert.equal(tournamentPromptDay(STARTING_DAY), 23);
assert.equal(isTournamentPromptDay(23), true);
assert.equal(comingSeason(23), 'summer');

let rolling = {
  ...start,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
for (let i = 0; i < 21; i += 1) {
  rolling = reducer(rolling, { type: 'END_DAY' });
  assert.equal(rolling.pendingTournamentSetup, false, `day ${rolling.day} should not prompt yet`);
}
assert.equal(rolling.day, 22);
rolling = reducer(rolling, { type: 'END_DAY' });
assert.equal(rolling.day, 23);
assert.equal(rolling.pendingTournamentSetup, true);
assert.equal(rolling.tournamentSetupSeason, 'summer');
const request = rolling.inbox.find((item) => item.kind === 'tournamentRequest');
assert.ok(request);
assert.equal(request.from, 'gm');
assert.equal(request.deadlineDay, DAYS_PER_SEASON);

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /SeasonStart/);
assert.match(office, /deadlineDay/);
const seasonStart = readFileSync(new URL('../src/components/SeasonStart.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(seasonStart, /fixed inset-0/);
assert.doesNotMatch(seasonStart, /z-40/);

let ignored = rolling;
while (ignored.day < DAYS_PER_SEASON + 1) {
  ignored = reducer(ignored, { type: 'END_DAY' });
}
assert.equal(ignored.day, 31);
assert.equal(ignored.pendingTournamentSetup, false);
assert.equal(ignored.tournaments.length, 0);
assert.ok(ignored.inbox.some((item) => item.kind === 'tournamentMissed'));

console.log('fix phase G checks passed');
