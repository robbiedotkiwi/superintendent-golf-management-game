/**
 * UI Phase 6: task panel overlays the map, matches palette, machine copy is honest.
 * Run: node scripts/ui-phase6-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTask, taskUsesMachine } from '../src/data/tasks.js';

assert.equal(taskUsesMachine(getTask('cutGreens')), true);
assert.equal(taskUsesMachine(getTask('rollGreens')), true);
assert.equal(taskUsesMachine(getTask('changeCups')), false);
assert.equal(taskUsesMachine(getTask('handWater')), false);
assert.equal(taskUsesMachine(getTask('rakeBunkers')), false);

const panel = readFileSync(new URL('../src/components/TaskPanel.jsx', import.meta.url), 'utf8');
assert.match(panel, /absolute inset-y-0 right-0/);
assert.doesNotMatch(panel, /fixed inset-y-0/);
assert.match(panel, /bg-\[var\(--soil\)\]/);
assert.match(panel, /text-\[var\(--paint\)\]/);
assert.match(panel, /border-\[var\(--sand\)\]/);
assert.match(panel, /taskUsesMachine\(task\)/);
assert.match(panel, /text-3xl font-bold leading-none">\{minutes\}/);

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const mapBlock = app.slice(app.indexOf('relative min-h-0 flex-1'));
assert.match(mapBlock, /<TaskPanel/);
assert.match(mapBlock, /<IrrigationPanel/);
assert.match(app, /selected \? \(/);

console.log('ui phase6 checks passed');
