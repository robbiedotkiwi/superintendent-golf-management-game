import assert from 'node:assert/strict';
import { createInitialState } from '../src/engine/gameState.js';
import { clearSave, hasSave, loadGame, migrateSave, saveGame } from '../src/engine/save.js';

const throws = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
};

globalThis.localStorage = throws;
assert.equal(loadGame(), null);
assert.equal(hasSave(), false);
assert.equal(saveGame(createInitialState()), false);
assert.doesNotThrow(() => clearSave());

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
};

const state = createInitialState();
assert.equal(saveGame(state), true);
assert.equal(hasSave(), true);
const loaded = loadGame();
assert.equal(loaded.day, 1);
assert.ok(Array.isArray(loaded.log));
assert.ok(Array.isArray(loaded.workers));
clearSave();
assert.equal(hasSave(), false);

const migrated = migrateSave({
  day: 4,
  cash: 12000,
  holes: state.holes,
  surfaceDefaults: state.surfaceDefaults,
});
assert.ok(migrated);
assert.deepEqual(migrated.log, []);
assert.deepEqual(migrated.workers, []);

console.log('save-safety-check: ok');
