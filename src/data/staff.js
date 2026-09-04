import {
  CANDIDATE_COUNT,
  MECHANIC_WAGE,
  QUALITY_SKILL_BASE,
  SKILL_MAX,
  SKILL_MIN,
  WAGE_BASE,
  WAGE_PER_SKILL,
} from './constants.js';

const FIRST = ['Priya', 'Marcus', 'Elena', 'Jonah', 'Asha', 'Declan', 'Mei', 'Omar', 'Brigid', 'Luis'];
const LAST = ['Hale', 'Voss', 'Keene', 'Okada', 'Brennan', 'Shah', 'Quinn', 'Adeyemi', 'Frost', 'Perez'];

export function dailyWage(speedSkill, qualitySkill, isMechanic) {
  if (isMechanic) return MECHANIC_WAGE;
  return WAGE_BASE + Math.round(((speedSkill + qualitySkill) / 2) * WAGE_PER_SKILL);
}

function clampSkill(value) {
  return Math.min(SKILL_MAX, Math.max(SKILL_MIN, value));
}

function pickName(rng, used) {
  let name = `${FIRST[Math.floor(rng.next() * FIRST.length)]} ${LAST[Math.floor(rng.next() * LAST.length)]}`;
  let guard = 0;
  while (used.has(name) && guard < 20) {
    name = `${FIRST[Math.floor(rng.next() * FIRST.length)]} ${LAST[Math.floor(rng.next() * LAST.length)]}`;
    guard += 1;
  }
  used.add(name);
  return name;
}

function specialist(rng, used, type) {
  let speedSkill;
  let qualitySkill;
  let isMechanic = false;
  if (type === 'fast') {
    speedSkill = 5;
    qualitySkill = clampSkill(1 + Math.floor(rng.next() * 2));
  } else if (type === 'careful') {
    speedSkill = clampSkill(1 + Math.floor(rng.next() * 2));
    qualitySkill = 5;
  } else {
    isMechanic = true;
    speedSkill = 3;
    qualitySkill = 3;
  }
  return {
    id: `cand-${Math.floor(rng.next() * 1e9)}`,
    name: pickName(rng, used),
    speedSkill,
    qualitySkill,
    wage: dailyWage(speedSkill, qualitySkill, isMechanic),
    sprayCertified: false,
    isMechanic,
    isVolunteer: false,
    allowedSurfaces: 'all',
  };
}

export function generateCandidates(rng) {
  const used = new Set();
  const types = ['fast', 'careful', 'mechanic'];
  return types.slice(0, CANDIDATE_COUNT).map((type) => specialist(rng, used, type));
}

export { QUALITY_SKILL_BASE };
