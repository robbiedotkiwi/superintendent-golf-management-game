/**
 * UI Phase 6: task panel lives in the sidebar, palette match, machine copy is honest.
 * Run: node scripts/ui-phase6-check.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTask, taskUsesMachine } from '../src/data/tasks.ts';

assert.equal(taskUsesMachine(getTask('cutGreens')), true);
assert.equal(taskUsesMachine(getTask('rollGreens')), true);
assert.equal(taskUsesMachine(getTask('changeCups')), false);
assert.equal(taskUsesMachine(getTask('handWater')), false);
assert.equal(taskUsesMachine(getTask('rakeBunkers')), false);

const panel = readFileSync(new URL('../src/components/TaskPanel.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(panel, /absolute inset-y-0 right-0/);
assert.doesNotMatch(panel, /fixed inset-y-0/);
assert.match(panel, /taskUsesMachine\(task\)/);
assert.match(panel, /text-3xl font-bold leading-none">\{minutes\}/);

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const mapBlock = app.slice(app.indexOf('relative min-h-0 min-w-0 flex-1'));
assert.match(mapBlock, /<MapJobPopover/);
assert.doesNotMatch(mapBlock, /<IrrigationPanel/);

const sidebar = readFileSync(new URL('../src/components/Sidebar.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(sidebar, /<TaskPanel/);
assert.doesNotMatch(sidebar, /<IrrigationPanel/);

const popover = readFileSync(new URL('../src/components/MapJobPopover.tsx', import.meta.url), 'utf8');
assert.match(popover, /<TaskPanel/);

console.log('ui phase6 checks passed');
