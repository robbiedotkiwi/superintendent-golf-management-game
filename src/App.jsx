import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import CourseMap from './components/CourseMap.jsx';
import DaySummary from './components/DaySummary.jsx';
import TaskPanel from './components/TaskPanel.jsx';
import Crew from './components/Crew.jsx';
import GameOver from './components/GameOver.jsx';
import IrrigationPanel from './components/IrrigationPanel.jsx';
import Office from './components/Office.jsx';
import SeasonStart from './components/SeasonStart.jsx';
import Tutorial from './components/Tutorial.jsx';
import YearReview from './components/YearReview.jsx';
import Shed from './components/Shed.jsx';
import TimeBar from './components/TimeBar.jsx';
import Hud from './components/Hud.jsx';
import WeatherStrip from './components/WeatherStrip.jsx';
import {
  HOLE_COUNT,
  WEATHER_FINE,
  machineOrange,
  paint,
  pondStressed,
  pondWater,
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
import { unreadCount } from './engine/mail.js';
import { playBirds, playMower } from './engine/sound.js';
import { getTask } from './data/tasks.js';
import { clearSave, hasSave, loadGame, saveGame } from './engine/save.js';

function paletteStyle() {
  return {
    '--turf': turf,
    '--turf-stressed': turfStressed,
    '--soil': soil,
    '--sand': sand,
    '--paint': paint,
    '--machine-orange': machineOrange,
    '--pond-water': pondWater,
    '--pond-stressed': pondStressed,
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
          onOpenCrew={() => setView('crew')}
          onOpenOffice={() => setView('office')}
          onCloseShed={() => setView('course')}
          onBuy={(machineId) => dispatch({ type: 'BUY_MACHINE', machineId })}
          onBuyFoley={() => dispatch({ type: 'BUY_FOLEY' })}
          onSendGrind={(machineId) => dispatch({ type: 'SEND_GRIND', machineId })}
          onGrindInHouse={(machineId) => dispatch({ type: 'GRIND_IN_HOUSE', machineId })}
          onRepair={(machineId) => dispatch({ type: 'REPAIR_MACHINE', machineId })}
          onMove={(taskId, direction) => dispatch({ type: 'MOVE_TASK', taskId, direction })}
          onHire={(candidateId) => dispatch({ type: 'HIRE_WORKER', candidateId })}
          onTrain={(workerId, axis) => dispatch({ type: 'TRAIN_WORKER', workerId, axis })}
          onVolunteerDay={(weekday) => dispatch({ type: 'SET_VOLUNTEER_WEEKDAY', weekday })}
          onEarlyStart={(value) => dispatch({ type: 'SET_EARLY_START', value })}
          onSetWorker={(taskId, workerId) => dispatch({ type: 'SET_TASK_WORKER', taskId, workerId })}
          onSetIrrigation={(surface, policy) => dispatch({ type: 'SET_IRRIGATION', surface, policy })}
          onBuyAerator={() => dispatch({ type: 'BUY_AERATOR' })}
          onLease={(machineId) => dispatch({ type: 'LEASE_MACHINE', machineId })}
          onStopLease={(machineId) => dispatch({ type: 'STOP_LEASE', machineId })}
          onSnap={() => dispatch({ type: 'SNAP_TOURNAMENT' })}
          onLoan={(amount) => dispatch({ type: 'TAKE_LOAN', amount })}
          onReadMail={(id) => dispatch({ type: 'READ_MAIL', id })}
          onSetTournaments={(count) => dispatch({ type: 'SET_TOURNAMENTS', count })}
          onDeclineTournament={() => dispatch({ type: 'DECLINE_TOURNAMENT_REQUEST' })}
          onStartProject={(projectId) => dispatch({ type: 'START_PROJECT', projectId })}
          onBuyPicker={() => dispatch({ type: 'BUY_AUTO_PICKER' })}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
          onDismissTutorial={() => dispatch({ type: 'DISMISS_TUTORIAL' })}
          onDismissYearReview={() => dispatch({ type: 'DISMISS_YEAR_REVIEW' })}
          onNewGame={handleNewGame}
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
  onOpenCrew,
  onOpenOffice,
  onCloseShed,
  onBuy,
  onBuyFoley,
  onSendGrind,
  onGrindInHouse,
  onRepair,
  onMove,
  onHire,
  onTrain,
  onVolunteerDay,
  onEarlyStart,
  onSetWorker,
  onSetIrrigation,
  onBuyAerator,
  onLease,
  onStopLease,
  onSnap,
  onLoan,
  onReadMail,
  onSetTournaments,
  onDeclineTournament,
  onStartProject,
  onBuyPicker,
  onToggleSound,
  onDismissTutorial,
  onDismissYearReview,
  onNewGame,
}) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onSelect(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect]);

  useEffect(() => {
    if (state.weather === WEATHER_FINE) playBirds(state.soundEnabled);
  }, [state.day, state.weather, state.soundEnabled]);

  useEffect(() => {
    if (!summary?.done?.some((item) => getTask(item.taskId)?.mowing)) return;
    playMower(state.soundEnabled);
  }, [summary, state.soundEnabled]);

  const showMower = Boolean(summary?.done?.some((item) => getTask(item.taskId)?.mowing));

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
        onLease={onLease}
        onStopLease={onStopLease}
      />
    );
  }

  if (view === 'crew') {
    return (
      <Crew
        state={state}
        onBack={onCloseShed}
        onHire={onHire}
        onTrain={onTrain}
        onVolunteerDay={onVolunteerDay}
        onEarlyStart={onEarlyStart}
      />
    );
  }

  if (view === 'office') {
    return (
      <Office
        state={state}
        onBack={onCloseShed}
        onSnap={onSnap}
        onLoan={onLoan}
        onRead={onReadMail}
        onPlanMeeting={() => onPlan('gmMeeting')}
        onRemoveMeeting={() => onRemove('gmMeeting')}
        onDeclineTournament={onDeclineTournament}
        onStartProject={onStartProject}
        onBuyPicker={onBuyPicker}
      />
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[var(--soil)] text-[var(--paint)]">
      {state.dismissed ? <GameOver onNewGame={onNewGame} /> : null}
      {!state.dismissed && state.pendingYearReview && !summary ? (
        <YearReview review={state.lastYearReview} onContinue={onDismissYearReview} />
      ) : null}
      {!state.dismissed &&
      state.pendingTournamentSetup &&
      !state.pendingYearReview &&
      !summary ? (
        <SeasonStart state={state} onConfirm={onSetTournaments} />
      ) : null}
      {!state.dismissed &&
      !state.tutorialDone &&
      !state.pendingTournamentSetup &&
      !state.pendingYearReview &&
      !summary ? (
        <Tutorial onDismiss={onDismissTutorial} />
      ) : null}
      <TimeBar
        remaining={minutesRemaining}
        used={minutesUsed}
        capacity={minutesCapacity}
        plannedTasks={state.plannedTasks}
        onRemove={onRemove}
        onEndDay={onEndDay}
        onMove={onMove}
        onOpenShed={onOpenShed}
        onOpenCrew={onOpenCrew}
        onOpenOffice={onOpenOffice}
        onOpenPond={() => onSelect('pond')}
        unread={unreadCount(state)}
        soundOn={state.soundEnabled}
        onToggleSound={onToggleSound}
      />
      <WeatherStrip state={state} onPlan={onPlan} onRemove={onRemove} />
      <Hud state={state} condition={condition} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CourseMap
          surfaces={state.surfaces}
          pond={state.pond}
          hasAerator={state.hasAerator}
          holes={state.holes}
          hasDrivingRange={state.hasDrivingRange}
          showMower={showMower}
          selected={selected}
          onSelect={onSelect}
          onOpenShed={onOpenShed}
        />
        {selected === 'pond' ? (
          <IrrigationPanel
            state={state}
            onSetPolicy={onSetIrrigation}
            onBuyAerator={onBuyAerator}
            onClose={() => onSelect(null)}
          />
        ) : selected ? (
          <TaskPanel
            surface={selected}
            state={state}
            onPlan={onPlan}
            onRemove={onRemove}
            onSetWorker={onSetWorker}
            onClose={() => onSelect(null)}
          />
        ) : null}
      </div>
      <DaySummary summary={summary} onContinue={onDismissSummary} />
    </div>
  );
}
