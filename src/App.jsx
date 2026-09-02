import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  HOLE_COUNT,
  machineOrange,
  paint,
  sand,
  soil,
  turf,
  turfStressed,
} from './data/constants.js';
import {
  combinedMinutesRemaining,
  createInitialState,
  reducer,
} from './engine/gameState.js';
import { clearSave, hasSave, loadGame, saveGame } from './engine/save.js';

function paletteStyle() {
  return {
    '--turf': turf,
    '--turf-stressed': turfStressed,
    '--soil': soil,
    '--sand': sand,
    '--paint': paint,
    '--machine-orange': machineOrange,
  };
}

export default function App() {
  const [screen, setScreen] = useState('entry');
  const [savePresent, setSavePresent] = useState(() => hasSave());
  const [state, dispatch] = useReducer(reducer, null, () => loadGame() ?? createInitialState());

  useEffect(() => {
    if (screen !== 'game') return;
    saveGame(state);
    setSavePresent(true);
  }, [state, screen]);

  const minutesRemaining = useMemo(() => combinedMinutesRemaining(state), [state]);

  function handleNewGame() {
    clearSave();
    dispatch({ type: 'NEW_GAME' });
    setSavePresent(false);
    setScreen('game');
  }

  function handleContinue() {
    const saved = loadGame();
    if (!saved) return;
    dispatch({ type: 'LOAD_GAME', state: saved });
    setScreen('game');
  }

  return (
    <div
      style={paletteStyle()}
      className="min-h-screen bg-[var(--soil)] text-[var(--paint)]"
    >
      {screen === 'entry' ? (
        <EntryScreen savePresent={savePresent} onNewGame={handleNewGame} onContinue={handleContinue} />
      ) : (
        <GameScreen state={state} minutesRemaining={minutesRemaining} />
      )}
    </div>
  );
}

function EntryScreen({ savePresent, onNewGame, onContinue }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="font-condensed text-6xl font-bold tracking-tight">Greenkeeper</h1>
      <p className="mt-3 text-lg text-[var(--sand)]">{HOLE_COUNT} holes. Not enough hours.</p>
      <div className="mt-10 flex flex-col gap-3">
        <button
          type="button"
          onClick={onNewGame}
          className="bg-[var(--machine-orange)] px-5 py-3 text-left text-lg font-semibold text-[var(--paint)]"
        >
          New game
        </button>
        {savePresent ? (
          <button
            type="button"
            onClick={onContinue}
            className="border border-[var(--sand)] bg-transparent px-5 py-3 text-left text-lg text-[var(--paint)]"
          >
            Continue
          </button>
        ) : null}
      </div>
    </main>
  );
}

function GameScreen({ state, minutesRemaining }) {
  return (
    <main className="px-6 py-8">
      <dl className="grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <Stat label="Day" value={state.day} />
        <Stat label="Season" value={state.season} />
        <Stat label="Cash" value={state.cash} />
        <Stat label="Minutes left" value={minutesRemaining} />
      </dl>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[var(--sand)]">{label}</dt>
      <dd className="font-condensed text-5xl font-bold leading-none">{value}</dd>
    </div>
  );
}
