import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import CourseMap from './components/CourseMap.jsx';
import DaySummary from './components/DaySummary.jsx';
import TaskPanel from './components/TaskPanel.jsx';
import Shed from './components/Shed.jsx';
import TimeBar from './components/TimeBar.jsx';
import WeatherStrip from './components/WeatherStrip.jsx';
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
  combinedMinutesCapacity,
  combinedMinutesRemaining,
  combinedMinutesUsed,
  createInitialState,
  reducer,
} from './engine/gameState.js';
import { courseCondition } from './engine/simulation.js';
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
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [view, setView] = useState('course');
  const seenLog = useRef(state.log.length);

  useEffect(() => {
    if (screen !== 'game') return;
    saveGame(state);
    setSavePresent(true);
  }, [state, screen]);

  useEffect(() => {
    if (state.log.length > seenLog.current) {
      setSummary(state.log[state.log.length - 1]);
      seenLog.current = state.log.length;
    }
  }, [state.log]);

  const minutesRemaining = useMemo(() => combinedMinutesRemaining(state), [state]);
  const minutesUsed = useMemo(() => combinedMinutesUsed(state), [state]);
  const minutesCapacity = useMemo(() => combinedMinutesCapacity(state), [state]);
  const condition = useMemo(() => Math.round(courseCondition(state.surfaces)), [state.surfaces]);

  function handleNewGame() {
    clearSave();
    dispatch({ type: 'NEW_GAME' });
    setSavePresent(false);
    setSelected(null);
    setSummary(null);
    setView('course');
    seenLog.current = 0;
    setScreen('game');
  }

  function handleContinue() {
    const saved = loadGame();
    if (!saved) return;
    seenLog.current = saved.log?.length ?? 0;
    dispatch({ type: 'LOAD_GAME', state: saved });
    setSelected(null);
    setSummary(null);
    setView('course');
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
        <GameScreen
          state={state}
          selected={selected}
          summary={summary}
          view={view}
          minutesRemaining={minutesRemaining}
          minutesUsed={minutesUsed}
          minutesCapacity={minutesCapacity}
          condition={condition}
          onSelect={setSelected}
          onPlan={(taskId, level) => dispatch({ type: 'PLAN_TASK', taskId, level })}
          onRemove={(taskId) => dispatch({ type: 'REMOVE_TASK', taskId })}
          onEndDay={() => dispatch({ type: 'END_DAY' })}
          onDismissSummary={() => setSummary(null)}
          onOpenShed={() => setView('shed')}
          onCloseShed={() => setView('course')}
          onBuy={(machineId) => dispatch({ type: 'BUY_MACHINE', machineId })}
          onBuyFoley={() => dispatch({ type: 'BUY_FOLEY' })}
          onSendGrind={(machineId) => dispatch({ type: 'SEND_GRIND', machineId })}
          onGrindInHouse={(machineId) => dispatch({ type: 'GRIND_IN_HOUSE', machineId })}
          onRepair={(machineId) => dispatch({ type: 'REPAIR_MACHINE', machineId })}
          onMove={(taskId, direction) => dispatch({ type: 'MOVE_TASK', taskId, direction })}
        />
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

function GameScreen({
  state,
  selected,
  summary,
  view,
  minutesRemaining,
  minutesUsed,
  minutesCapacity,
  condition,
  onSelect,
  onPlan,
  onRemove,
  onEndDay,
  onDismissSummary,
  onOpenShed,
  onCloseShed,
  onBuy,
  onBuyFoley,
  onSendGrind,
  onGrindInHouse,
  onRepair,
  onMove,
}) {
  if (view === 'shed') {
    return (
      <Shed
        state={state}
        onBack={onCloseShed}
        onBuy={onBuy}
        onBuyFoley={onBuyFoley}
        onSendGrind={onSendGrind}
        onGrindInHouse={onGrindInHouse}
        onRepair={onRepair}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TimeBar
        remaining={minutesRemaining}
        used={minutesUsed}
        capacity={minutesCapacity}
        plannedTasks={state.plannedTasks}
        onRemove={onRemove}
        onEndDay={onEndDay}
        onMove={onMove}
        onOpenShed={onOpenShed}
      />
      <WeatherStrip state={state} onPlan={onPlan} onRemove={onRemove} />
      <div className="flex flex-wrap items-end gap-8 px-4 py-3">
        <Stat label="Day" value={state.day} />
        <Stat label="Season" value={`${state.season} · ${state.year}`} />
        <Stat label="Cash" value={state.cash} />
        <Stat label="Condition" value={condition} />
      </div>
      <div className="min-h-0 flex-1 px-3 pb-3">
        <CourseMap surfaces={state.surfaces} selected={selected} onSelect={onSelect} onOpenShed={onOpenShed} />
      </div>
      <TaskPanel
        surface={selected}
        state={state}
        onPlan={onPlan}
        onRemove={onRemove}
        onClose={() => onSelect(null)}
      />
      <DaySummary summary={summary} onContinue={onDismissSummary} />
    </div>
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
