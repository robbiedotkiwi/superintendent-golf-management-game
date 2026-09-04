/**
 * Headless checks for Phase 8 tournament gates.
 * Run: node scripts/phase8-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAYS_PER_SEASON,
  GM_STANDING_START,
  GM_TOURNAMENT_DECLINE_STANDING,
  STARTING_CASH,
  STARTING_WEATHER,
  TOURNAMENT_ACCEPTABLE_MIN,
  TOURNAMENT_ACCEPTABLE_PAY,
  TOURNAMENT_ACCEPTABLE_SAT,
  TOURNAMENT_EXCELLENT_MIN,
  TOURNAMENT_EXCELLENT_PAY,
  TOURNAMENT_EXCELLENT_SAT,
  TOURNAMENT_GOOD_MIN,
  TOURNAMENT_GOOD_PAY,
  TOURNAMENT_GOOD_SAT,
  TOURNAMENT_POOR_PAY,
  TOURNAMENT_POOR_SAT,
  TOURNAMENT_PREP_DAYS,
  TOURNAMENT_PREP_ROLL_BONUS,
  TOURNAMENT_SEASON_MAX,
  TOURNAMENT_WEIGHTS,
  TOURNAMENT_WINTER_MAX,
  WEATHER_FINE,
  WEATHER_RAIN,
  WEATHER_WEIGHTS,
} from '../src/data/constants.js';
import { canPlanTask, createInitialState, reducer } from '../src/engine/gameState.js';
import { courseCondition } from '../src/engine/simulation.js';
import {
  applyScheduledTournament,
  applySnapTournament,
  bandFromScore,
  daysUntilNextTournament,
  inPrepWindow,
  maxTournamentsForSeason,
  nextTournament,
  scheduleTournamentDays,
  comingSeasonStartDay,
  tournamentResult,
  tournamentScore,
} from '../src/engine/tournament.js';
import { applyWeatherToWorkers } from '../src/engine/weather.js';
import { setQualities, setTypeQuality } from '../src/engine/holes.js';


function surfaces(values) {
  return {
    greens: { quality: values.greens },
    tees: { quality: values.tees },
    fairways: { quality: values.fairways },
    rough: { quality: values.rough ?? 50 },
    bunkers: { quality: values.bunkers },
  };
}

function endKeep(state, extras = {}) {
  const next = reducer(state, { type: 'END_DAY' });
  return {
    ...next,
    weather: extras.weather ?? STARTING_WEATHER,
    season: extras.season ?? next.season,
    workers: applyWeatherToWorkers(next.workers, extras.weather ?? STARTING_WEATHER),
  };
}

function withSetup(state, season = 'summer', startDay = comingSeasonStartDay(state.day)) {
  return {
    ...state,
    pendingTournamentSetup: true,
    gmTournamentRequestPending: true,
    tournamentSetupSeason: season,
    tournamentSetupStartDay: startDay,
    tournamentSetupDeadline: startDay - 1,
  };
}

const seasonStart = readFileSync(new URL('../src/components/SeasonStart.jsx', import.meta.url), 'utf8');
assert.match(seasonStart, /scheduleTournamentDays/);
assert.match(seasonStart, /risky/);
assert.match(seasonStart, /TOURNAMENT_SEASON_MAX/);
assert.match(seasonStart, /TOURNAMENT_WINTER_MAX/);
assert.equal(maxTournamentsForSeason('spring'), TOURNAMENT_SEASON_MAX);
assert.equal(maxTournamentsForSeason('winter'), TOURNAMENT_WINTER_MAX);

assert.equal(createInitialState().pendingTournamentSetup, false);
assert.equal(createInitialState().tournaments.length, 0);

let booked = reducer(withSetup(createInitialState()), { type: 'SET_TOURNAMENTS', count: 2 });
assert.equal(booked.pendingTournamentSetup, false);
assert.equal(booked.tournaments.length, 2);
assert.deepEqual(
  booked.tournaments.map((item) => item.day),
  scheduleTournamentDays(comingSeasonStartDay(1), 2, 'summer'),
);
assert.equal(booked.gmStanding, GM_STANDING_START);
assert.equal(daysUntilNextTournament(booked), booked.tournaments[0].day - booked.day);
assert.equal(nextTournament(booked).day, booked.tournaments[0].day);

const none = reducer(withSetup(createInitialState()), { type: 'SET_TOURNAMENTS', count: 0 });
assert.equal(none.tournaments.length, 0);
assert.equal(none.gmStanding, GM_STANDING_START);
assert.equal(daysUntilNextTournament(none), null);

const weighted = surfaces({ greens: 100, tees: 0, fairways: 0, bunkers: 0, rough: 0 });
assert.equal(tournamentScore(weighted), 100 * TOURNAMENT_WEIGHTS.greens);
assert.notEqual(tournamentScore(weighted), courseCondition(weighted));

assert.equal(bandFromScore(TOURNAMENT_EXCELLENT_MIN), 'excellent');
assert.equal(bandFromScore(TOURNAMENT_GOOD_MIN), 'good');
assert.equal(bandFromScore(TOURNAMENT_ACCEPTABLE_MIN), 'acceptable');
assert.equal(bandFromScore(TOURNAMENT_ACCEPTABLE_MIN - 1), 'poor');

const excellent = surfaces({ greens: 100, tees: 100, fairways: 100, bunkers: 50 });
const excellentResult = tournamentResult(excellent, WEATHER_FINE);
assert.equal(excellentResult.band, 'excellent');
assert.equal(excellentResult.pay, TOURNAMENT_EXCELLENT_PAY);
assert.equal(excellentResult.satisfaction, TOURNAMENT_EXCELLENT_SAT);

const good = tournamentResult(surfaces({ greens: 80, tees: 80, fairways: 80, bunkers: 80 }), WEATHER_FINE);
assert.equal(good.band, 'good');
assert.equal(good.pay, TOURNAMENT_GOOD_PAY);
assert.equal(good.satisfaction, TOURNAMENT_GOOD_SAT);

const acceptable = tournamentResult(surfaces({ greens: 60, tees: 60, fairways: 60, bunkers: 60 }), WEATHER_FINE);
assert.equal(acceptable.band, 'acceptable');
assert.equal(acceptable.pay, TOURNAMENT_ACCEPTABLE_PAY);
assert.equal(acceptable.satisfaction, TOURNAMENT_ACCEPTABLE_SAT);

const poor = tournamentResult(surfaces({ greens: 40, tees: 40, fairways: 40, bunkers: 40 }), WEATHER_FINE);
assert.equal(poor.band, 'poor');
assert.equal(poor.pay, TOURNAMENT_POOR_PAY);
assert.equal(poor.satisfaction, TOURNAMENT_POOR_SAT);

const rained = tournamentResult(excellent, WEATHER_RAIN);
assert.equal(rained.band, 'acceptable');
assert.equal(rained.pay, TOURNAMENT_ACCEPTABLE_PAY);
assert.equal(rained.satisfaction, TOURNAMENT_ACCEPTABLE_SAT);
assert.equal(rained.rained, true);

const paid = applyScheduledTournament({
  ...setQualities(createInitialState(), {
    greens: 100,
    tees: 100,
    fairways: 100,
    rough: 50,
    bunkers: 50,
  }),
  day: 10,
  weather: WEATHER_FINE,
  cash: 0,
  satisfaction: 50,
  tournaments: [{ day: 10, done: false }],
  tournamentPrepScore: 0,
});
assert.equal(paid.state.cash, TOURNAMENT_EXCELLENT_PAY);
assert.equal(paid.state.satisfaction, 50 + TOURNAMENT_EXCELLENT_SAT);
assert.equal(paid.state.tournaments[0].done, true);

const tday = booked.tournaments[0].day;
assert.equal(inPrepWindow(booked), false);
assert.equal(canPlanTask(booked, 'doubleCutGreens').ok, false);
assert.equal(canPlanTask(booked, 'extraRoll').ok, false);
assert.equal(canPlanTask(booked, 'edgeBunkers').ok, false);

const tooEarly = { ...booked, day: tday - TOURNAMENT_PREP_DAYS - 1, season: 'summer' };
assert.equal(inPrepWindow(tooEarly), false);
assert.equal(canPlanTask(tooEarly, 'extraRoll').ok, false);

const onDay = { ...booked, day: tday, weather: WEATHER_FINE, season: 'summer' };
assert.equal(inPrepWindow(onDay), false);
assert.equal(canPlanTask(onDay, 'extraRoll').ok, false);

const prepDay = {
  ...booked,
  day: tday - 1,
  season: 'summer',
  weather: WEATHER_FINE,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
};
assert.equal(inPrepWindow(prepDay), true);
assert.equal(canPlanTask(prepDay, 'extraRoll').ok, true);
assert.equal(canPlanTask(prepDay, 'doubleCutGreens').ok, true);
assert.equal(canPlanTask(prepDay, 'edgeBunkers').ok, true);

let prepped = reducer(prepDay, { type: 'PLAN_TASK', taskId: 'extraRoll' });
prepped = reducer(prepped, { type: 'END_DAY' });
assert.equal(prepped.tournamentPrepScore, TOURNAMENT_PREP_ROLL_BONUS);
assert.equal(prepped.day, tday);

prepped = {
  ...prepped,
  season: 'summer',
  weather: WEATHER_FINE,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  holes: setTypeQuality(
    setTypeQuality(
      setTypeQuality(setTypeQuality(prepped, 'greens', 80), 'tees', 80),
      'fairways',
      80,
    ),
    'bunkers',
    80,
  ).holes,
};
const afterPrep = reducer(prepped, { type: 'END_DAY' });
const withBonus = tournamentResult(afterPrep, WEATHER_FINE, TOURNAMENT_PREP_ROLL_BONUS);
const withoutBonus = tournamentResult(afterPrep, WEATHER_FINE, 0);
assert.ok(afterPrep.lastTournament);
assert.equal(afterPrep.lastTournament.score, withBonus.score);
assert.ok(withBonus.score > withoutBonus.score);
assert.equal(afterPrep.tournamentPrepScore, 0);

let winter = withSetup(createInitialState(), 'winter', 91);
winter = reducer(winter, { type: 'SET_TOURNAMENTS', count: 3 });
assert.equal(winter.tournaments.length, TOURNAMENT_WINTER_MAX);
assert.equal(winter.tournaments[0].risky, true);
const winterRainShare =
  WEATHER_WEIGHTS.winter.rain + WEATHER_WEIGHTS.winter.heavyRain + WEATHER_WEIGHTS.winter.storm;
assert.ok(WEATHER_WEIGHTS.winter.fine < WEATHER_WEIGHTS.spring.fine);
assert.equal(tournamentResult(excellent, WEATHER_RAIN).band, 'acceptable');
assert.ok(winterRainShare > 0);

const highState = setQualities(createInitialState(), {
  greens: 90,
  tees: 90,
  fairways: 90,
  rough: 50,
  bunkers: 90,
});
const snap = applySnapTournament({
  ...highState,
  tournamentPrepScore: 40,
  weather: WEATHER_FINE,
  cash: STARTING_CASH,
});
assert.equal(snap.lastSnap.score, tournamentScore(highState));
assert.notEqual(snap.lastSnap.score, tournamentScore(highState) + 40);
assert.equal(canPlanTask({ ...createInitialState(), tournamentPrepScore: 40 }, 'extraRoll').ok, false);

const start = createInitialState();
assert.equal(start.pendingTournamentSetup, false);
assert.ok(!start.inbox.some((item) => item.kind === 'tournamentRequest'));
const pendingStart = withSetup(start);
const declined = reducer(pendingStart, { type: 'DECLINE_TOURNAMENT_REQUEST' });
assert.equal(declined.gmStanding, GM_STANDING_START - GM_TOURNAMENT_DECLINE_STANDING);
assert.equal(declined.gmTournamentRequestPending, false);
assert.equal(declined.pendingTournamentSetup, false);
const again = reducer(declined, { type: 'DECLINE_TOURNAMENT_REQUEST' });
assert.equal(again.gmStanding, declined.gmStanding);

let nextSeason = {
  ...createInitialState(),
  day: DAYS_PER_SEASON,
  irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  pendingTournamentSetup: true,
  gmTournamentRequestPending: true,
  tournamentSetupSeason: 'summer',
  tournamentSetupDeadline: DAYS_PER_SEASON,
  tournamentSetupStartDay: DAYS_PER_SEASON + 1,
};
nextSeason = reducer(nextSeason, { type: 'END_DAY' });
assert.equal(nextSeason.pendingTournamentSetup, false);
assert.equal(nextSeason.tournaments.length, 0);
assert.ok(nextSeason.inbox.some((item) => item.kind === 'tournamentMissed'));

const kept = reducer(
  {
    ...withSetup(createInitialState()),
    day: DAYS_PER_SEASON,
    irrigation: { greens: 'off', tees: 'off', fairways: 'off' },
  },
  { type: 'SET_TOURNAMENTS', count: 2 },
);
const afterSeason = reducer(kept, { type: 'END_DAY' });
assert.equal(afterSeason.season, 'summer');
assert.equal(afterSeason.tournaments.length, 2);

const weather = readFileSync(new URL('../src/components/WeatherStrip.jsx', import.meta.url), 'utf8');
assert.match(weather, /daysUntilNextTournament/);
assert.match(weather, /Tournament in/);

console.log('phase8 checks passed');
