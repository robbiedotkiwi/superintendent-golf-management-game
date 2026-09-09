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
assert.equal(start.tournaments.length, 1);
assert.ok(!start.inbox.some((item) => item.kind === 'tournamentRequest'));

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(app, /SeasonStart/);
assert.doesNotMatch(app, /pendingTournamentSetup/);

const promptDay = DAYS_PER_SEASON - TOURNAMENT_SETUP_LEAD_DAYS;
assert.equal(TOURNAMENT_SETUP_LEAD_DAYS, 7);
assert.equal(tournamentPromptDay(STARTING_DAY), promptDay);
assert.equal(tournamentPromptDay(STARTING_DAY), 77);
assert.equal(isTournamentPromptDay(promptDay), true);
assert.equal(comingSeason(promptDay), 'summer');

let rolling = {
  ...start,
  day: promptDay - 2,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
rolling = reducer(rolling, { type: 'END_DAY' });
assert.equal(rolling.day, promptDay - 1);
assert.equal(rolling.pendingTournamentSetup, false);
rolling = reducer(rolling, { type: 'END_DAY' });
assert.equal(rolling.day, promptDay);
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
assert.equal(ignored.day, DAYS_PER_SEASON + 1);
assert.equal(ignored.pendingTournamentSetup, false);
assert.ok(ignored.tournaments.some((item) => item.season === 'summer' && !item.done));
assert.ok(ignored.inbox.some((item) => item.kind === 'tournamentMissed'));

console.log('fix phase G checks passed');
