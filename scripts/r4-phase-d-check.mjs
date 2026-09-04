/**
 * Round 4 Phase D: every monetary display goes through formatMoney().
 * Run: node scripts/r4-phase-d-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatMoney } from '../src/engine/format.js';

assert.equal(formatMoney(8000), '$8,000');
assert.equal(formatMoney(1234.4), '$1,234');
assert.equal(formatMoney(0), '$0');

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const formatFile = fileURLToPath(new URL('../src/engine/format.js', import.meta.url));
const thisFile = fileURLToPath(import.meta.url);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const path = join(dir, name);
    if (path === thisFile) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.(js|jsx)$/.test(name)) files.push(path);
  }
  return files;
}

const banned = [
  /toLocaleString/,
  /Math\.round\((?:state\.)?(?:cash|capitalBudget|maintenanceBudget|leftover)\b/,
  /Math\.round\((?:maintenance|capital)\)/,
  /Capped at \$\{(?!formatMoney)/,
  /\{(?:machine\.cost|spec\.cost|worker\.wage|candidate\.wage|task\.materialsCost|summary\.wages|summary\.mainsCost|summary\.neighbourFine|summary\.tournament\.pay|item\.pay|state\.loan\.repay|state\.lastSnap\.pay)\}/,
  /\{(?:AERATOR_COST|FOLEY_GRINDER_COST|GRIND_AWAY_COST|TRAINING_COST|AUTO_PICKER_COST|GREENS_SENSORS_COST|TURFRAD_COST|GREENS_ROLLER_COST)\}/,
  /\$\{(?:AERATOR_COST|FOLEY_GRINDER_COST|GRIND_AWAY_COST|TRAINING_COST|AUTO_PICKER_COST|GREENS_SENSORS_COST|TURFRAD_COST|machine\.cost|spec\.cost|task\.materialsCost)\}/,
];

const hits = [];
for (const file of walk(join(repoRoot, 'src'))) {
  if (file === formatFile) continue;
  const text = readFileSync(file, 'utf8');
  const rel = file.replace(`${repoRoot}/`, '');
  for (const pattern of banned) {
    if (pattern.test(text)) hits.push(`${rel}  ${pattern}`);
  }
}

console.log('GREP_HITS', hits.length ? hits.join('\n') : 'none');
assert.deepEqual(hits, [], hits.join('\n'));

const hud = readFileSync(new URL('../src/components/Hud.jsx', import.meta.url), 'utf8');
const shed = readFileSync(new URL('../src/components/Shed.jsx', import.meta.url), 'utf8');
const office = readFileSync(new URL('../src/components/Office.jsx', import.meta.url), 'utf8');
assert.match(hud, /formatMoney\(state\.cash\)/);
assert.match(shed, /formatMoney\(state\.cash\)/);
assert.match(office, /formatMoney\(state\.cash\)/);

console.log('GATE D1 PASS formatMoney is the only toLocaleString money helper');
console.log('GATE D2 PASS grep for raw money rendering is clean');
console.log('GATE D3 PASS HUD, Shed and Office cash go through formatMoney');
console.log('round 4 phase D checks passed');
