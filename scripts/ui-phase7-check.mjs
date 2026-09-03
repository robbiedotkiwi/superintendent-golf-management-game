/**
 * UI Phase 7: location group, sound icon, End day pinned in the sidebar.
 * Run: node scripts/ui-phase7-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
assert.match(src, /aria-label="Locations"/);
assert.match(src, /onOpenOffice/);
assert.match(src, /onOpenCrew/);
assert.match(src, /onOpenShed/);
assert.match(src, /End day/);
assert.match(src, /rounded-full bg-\[var\(--machine-orange\)\]/);
assert.doesNotMatch(src, /Sound \{soundOn \? 'on' : 'off'\}/);
assert.match(src, /Turn sound off/);
assert.match(src, /h-10 w-10/);
assert.match(src, /shrink-0 border-t/);

console.log('ui phase7 checks passed');
