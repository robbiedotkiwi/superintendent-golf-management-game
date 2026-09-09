#!/usr/bin/env node
/**
 * Round 9 Phase F: pond expansion project.
 * Run: node scripts/r9-phase-f-check.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  GROUNDWATER_M3,
  POND_CAPACITY,
  POND_EXPANDED_CAPACITY,
  POND_EXPANDED_GROUNDWATER_M3,
  POND_EXPANDED_HEALTH_DECAY_MULT,
  POND_EXPANSION_COST,
  POND_EXPANSION_DAILY_MINUTES,
  POND_EXPANSION_DAYS,
  POND_HEALTH_START,
  POND_HEALTH_SUMMER_DROP,
  POND_START_VOLUME,
  PROJECT_POND_EXPANSION,
  SEASON_GROWTH,
} from '../src/data/constants.js';
import { createInitialState, reducer } from '../src/engine/gameState.js';
import {
  groundwaterM3,
  pondCapacity,
  pondHealthDecayMult,
  resolveIrrigation,
} from '../src/engine/irrigation.js';
import { canStartProject, constructionMinutes, PROJECTS } from '../src/engine/projects.js';

const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(office, /Object\.values\(PROJECTS\)/);
assert.equal(PROJECTS[PROJECT_POND_EXPANSION].cost, POND_EXPANSION_COST);
assert.equal(PROJECTS[PROJECT_POND_EXPANSION].days, POND_EXPANSION_DAYS);
assert.equal(POND_EXPANSION_COST, 95000);
assert.equal(POND_EXPANSION_DAYS, 45);
assert.equal(POND_EXPANDED_CAPACITY, 14000);
assert.equal(POND_EXPANDED_HEALTH_DECAY_MULT, 0.5);
assert.equal(POND_EXPANDED_GROUNDWATER_M3, 35);

const start = createInitialState();
assert.equal(start.hasPondExpansion, false);
assert.equal(pondCapacity(start), POND_CAPACITY);
assert.equal(groundwaterM3(start), GROUNDWATER_M3);
assert.equal(canStartProject(start, PROJECT_POND_EXPANSION).ok, start.cash >= POND_EXPANSION_COST);

const funded = { ...start, cash: POND_EXPANSION_COST + 1000 };
const summer = reducer({ ...funded, season: 'summer' }, { type: 'START_PROJECT', projectId: PROJECT_POND_EXPANSION });
assert.equal(summer.cash, funded.cash - POND_EXPANSION_COST);
assert.equal(summer.projects[0].id, PROJECT_POND_EXPANSION);
assert.equal(summer.projects[0].dueDay, funded.day + POND_EXPANSION_DAYS);
const winter = reducer({ ...funded, season: 'winter' }, { type: 'START_PROJECT', projectId: PROJECT_POND_EXPANSION });
assert.ok(constructionMinutes(summer) > constructionMinutes(winter));
assert.equal(constructionMinutes(summer), Math.round(POND_EXPANSION_DAILY_MINUTES * SEASON_GROWTH.summer));
assert.equal(constructionMinutes(winter), Math.round(POND_EXPANSION_DAILY_MINUTES * SEASON_GROWTH.winter));

let done = { ...summer, day: summer.projects[0].dueDay - 1 };
done = reducer(done, { type: 'END_DAY' });
assert.equal(done.hasPondExpansion, true);
assert.equal(done.projects.length, 0);
assert.equal(pondCapacity(done), POND_EXPANDED_CAPACITY);
assert.equal(groundwaterM3(done), POND_EXPANDED_GROUNDWATER_M3);
assert.equal(pondHealthDecayMult(done), 0.5);

const overdue = {
  ...done,
  season: 'summer',
  lastPondDoseDay: 1,
  day: 20,
  hasAerator: false,
  pond: { volume: POND_START_VOLUME, health: POND_HEALTH_START },
};
const dropped = resolveIrrigation(overdue);
assert.equal(dropped.pond.health, POND_HEALTH_START - POND_HEALTH_SUMMER_DROP * 0.5);
const unexpanded = resolveIrrigation({ ...overdue, hasPondExpansion: false });
assert.equal(unexpanded.pond.health, POND_HEALTH_START - POND_HEALTH_SUMMER_DROP);
assert.ok(dropped.pond.volume - overdue.pond.volume > unexpanded.pond.volume - overdue.pond.volume);

console.log('r9-phase-f-check: ok');
