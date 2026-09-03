import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import CourseMap from './components/CourseMap.jsx';
import DaySummary from './components/DaySummary.jsx';
import Crew from './components/Crew.jsx';
import GameOver from './components/GameOver.jsx';
import Office from './components/Office.jsx';
import PlayoutBar from './components/PlayoutBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Tutorial from './components/Tutorial.jsx';
import YearReview from './components/YearReview.jsx';
import Shed from './components/Shed.jsx';
import {
  HOLE_COUNT,
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SECTION_SHED,
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
import {
  PLAYOUT_DONE,
  PLAYOUT_PLAYING,
  PLAYOUT_SKIPPED,
  buildPlayout,
  currentPlayoutEvent,
  playoutSurfaces,
  shouldSkipPlayout,
  skipPlayout,
  tickPlayout,
} from './engine/playout.js';
import { playBirds, playMower, prefersReducedMotion } from './engine/sound.js';
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
  const [playout, setPlayout] = useState(null);
  const seenLog = useRef(state.log.length);

  useEffect(() => {
    if (screen !== 'game') return;
    saveGame(state);
    setSavePresent(true);
  }, [state, screen]);

  useEffect(() => {
    if (state.log.length <= seenLog.current) return;
    const latest = state.log[state.log.length - 1];
    seenLog.current = state.log.length;
    if (shouldSkipPlayout(state.skipPlayout, prefersReducedMotion())) {
      setPlayout(null);
      setSummary(latest);
      return;
    }
    setSummary(null);
    setPlayout(buildPlayout(latest));
  }, [state.log, state.skipPlayout]);

  useEffect(() => {
    if (!playout || playout.status !== PLAYOUT_PLAYING) return undefined;
    let frame = 0;
    let last = performance.now();
    function loop(now) {
      const dt = now - last;
      last = now;
      setPlayout((current) => {
        if (!current || current.status !== PLAYOUT_PLAYING) return current;
        return tickPlayout(current, dt, state.playoutSpeed);
      });
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playout?.status, state.playoutSpeed]);

  useEffect(() => {
    if (playout?.status === PLAYOUT_DONE || playout?.status === PLAYOUT_SKIPPED) {
      const latest = state.log[state.log.length - 1] ?? null;
      setSummary(latest);
      setPlayout(null);
    }
  }, [playout, state.log]);

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
    setPlayout(null);
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
    setPlayout(null);
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
          playout={playout}
          minutesRemaining={minutesRemaining}
          minutesUsed={minutesUsed}
          minutesCapacity={minutesCapacity}
          condition={condition}
          onSelect={setSelected}
          onPlan={(taskId) => dispatch({ type: 'PLAN_TASK', taskId })}
          onRemove={(taskId) => dispatch({ type: 'REMOVE_TASK', taskId })}
          onEndDay={() => dispatch({ type: 'END_DAY' })}
          onDismissSummary={() => setSummary(null)}
          onSkipPlayout={() => setPlayout((current) => skipPlayout(current))}
          onSetPlayoutSpeed={(speed) => dispatch({ type: 'SET_PLAYOUT_SPEED', speed })}
          onSetSkipPref={(value) => dispatch({ type: 'SET_SKIP_PLAYOUT', value })}
          onOpenShed={() => dispatch({ type: 'SET_SECTION', section: SECTION_SHED })}
          onOpenCrew={() => dispatch({ type: 'SET_SECTION', section: SECTION_CREW })}
          onOpenOffice={() => dispatch({ type: 'SET_SECTION', section: SECTION_OFFICE })}
          onCloseShed={() => dispatch({ type: 'SET_SECTION', section: SECTION_MAP })}
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
          onSetHoc={(surface, hoc) => dispatch({ type: 'SET_HOC', surface, hoc })}
          onSetPattern={(surface, pattern) => dispatch({ type: 'SET_PATTERN', surface, pattern })}
          onSetAngle={(surface, angle) => dispatch({ type: 'SET_ANGLE', surface, angle })}
          onSetAutoRotate={(surface, value) => dispatch({ type: 'SET_AUTO_ROTATE', surface, value })}
          onSetIrrigation={(surface, policy) => dispatch({ type: 'SET_IRRIGATION', surface, policy })}
          onSetView={(view) => dispatch({ type: 'SET_VIEW', view })}
          onBuyAerator={() => dispatch({ type: 'BUY_AERATOR' })}
          onBuyGreensSensors={() => dispatch({ type: 'BUY_GREENS_SENSORS' })}
          onBuyTurfRad={() => dispatch({ type: 'BUY_TURFRAD' })}
          onToggleMoistureOverlay={() => dispatch({ type: 'TOGGLE_MOISTURE_OVERLAY' })}
          onSetHandWaterTargets={(targets) => dispatch({ type: 'SET_HAND_WATER_TARGETS', targets })}
          onSavePreset={(surface, name) => dispatch({ type: 'SAVE_PRESET', surface, name })}
          onApplyPreset={(id) => dispatch({ type: 'APPLY_PRESET', id })}
          onDeletePreset={(id) => dispatch({ type: 'DELETE_PRESET', id })}
          onTab={(section, tab) => dispatch({ type: 'SET_TAB', section, tab })}
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
  playout,
  onTab,
  minutesRemaining,
  minutesUsed,
  minutesCapacity,
  condition,
  onSelect,
  onPlan,
  onRemove,
  onEndDay,
  onDismissSummary,
  onSkipPlayout,
  onSetPlayoutSpeed,
  onSetSkipPref,
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
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetIrrigation,
  onSetView,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onToggleMoistureOverlay,
  onSetHandWaterTargets,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
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
      if (event.key !== 'Escape') return;
      if (view !== SECTION_MAP) {
        onCloseShed();
        return;
      }
      onSelect(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect, onCloseShed, view]);

  useEffect(() => {
    if (state.weather === WEATHER_FINE) playBirds(state.soundEnabled);
  }, [state.day, state.weather, state.soundEnabled]);

  useEffect(() => {
    const event = currentPlayoutEvent(playout);
    if (event?.mowing) playMower(state.soundEnabled);
  }, [playout?.cursor, playout?.status, state.soundEnabled]);

  const event = currentPlayoutEvent(playout);
  const latestSummary = state.log[state.log.length - 1];
  const mapSurfaces =
    playout?.status === PLAYOUT_PLAYING && latestSummary?.before
      ? playoutSurfaces(latestSummary, playout)
      : state.surfaces;
  const showMower = Boolean(event?.mowing);
  const watching = playout?.status === PLAYOUT_PLAYING;
  const view = state.section ?? SECTION_MAP;
  const tabs = state.tabs ?? {};

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[var(--soil)] text-[var(--paint)]">
      {state.dismissed && !watching ? <GameOver onNewGame={onNewGame} /> : null}
      {!state.dismissed && state.pendingYearReview && !summary && !watching ? (
        <YearReview review={state.lastYearReview} onContinue={onDismissYearReview} />
      ) : null}
      {!state.dismissed &&
      !state.tutorialDone &&
      !state.pendingYearReview &&
      !summary &&
      !watching ? (
        <Tutorial onDismiss={onDismissTutorial} />
      ) : null}
      <Sidebar
        state={state}
        selected={selected}
        condition={condition}
        minutesRemaining={minutesRemaining}
        minutesUsed={minutesUsed}
        minutesCapacity={minutesCapacity}
        unread={unreadCount(state)}
        onSelect={onSelect}
        onPlan={onPlan}
        onRemove={onRemove}
        onEndDay={
          watching
            ? () => {}
            : () => {
                onCloseShed();
                onEndDay();
              }
        }
        playoutActive={watching}
        skipPlayout={state.skipPlayout}
        onSetSkipPref={onSetSkipPref}
        section={view}
        onMove={onMove}
        onOpenShed={onOpenShed}
        onOpenCrew={onOpenCrew}
        onOpenOffice={onOpenOffice}
        onSetWorker={onSetWorker}
        onSetHoc={onSetHoc}
        onSetPattern={onSetPattern}
        onSetAngle={onSetAngle}
        onSetAutoRotate={onSetAutoRotate}
        onSetIrrigation={onSetIrrigation}
        onSetView={onSetView}
        onBuyAerator={onBuyAerator}
        onBuyGreensSensors={onBuyGreensSensors}
        onBuyTurfRad={onBuyTurfRad}
        onToggleMoistureOverlay={onToggleMoistureOverlay}
        onSetHandWaterTargets={onSetHandWaterTargets}
        onSavePreset={onSavePreset}
        onApplyPreset={onApplyPreset}
        onDeletePreset={onDeletePreset}
        onToggleSound={onToggleSound}
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {view === SECTION_SHED ? (
          <Shed
            state={state}
            tab={tabs[SECTION_SHED]}
            onTab={(tab) => onTab(SECTION_SHED, tab)}
            onBack={onCloseShed}
            onBuy={onBuy}
            onBuyFoley={onBuyFoley}
            onSendGrind={onSendGrind}
            onGrindInHouse={onGrindInHouse}
            onRepair={onRepair}
            onLease={onLease}
            onStopLease={onStopLease}
          />
        ) : view === SECTION_CREW ? (
          <Crew
            state={state}
            tab={tabs[SECTION_CREW]}
            onTab={(tab) => onTab(SECTION_CREW, tab)}
            onBack={onCloseShed}
            onHire={onHire}
            onTrain={onTrain}
            onVolunteerDay={onVolunteerDay}
            onEarlyStart={onEarlyStart}
          />
        ) : view === SECTION_OFFICE ? (
          <Office
            state={state}
            tab={tabs[SECTION_OFFICE]}
            onTab={(tab) => onTab(SECTION_OFFICE, tab)}
            onBack={onCloseShed}
            onSnap={onSnap}
            onLoan={onLoan}
            onRead={onReadMail}
            onPlanMeeting={() => onPlan('gmMeeting')}
            onRemoveMeeting={() => onRemove('gmMeeting')}
            onDeclineTournament={onDeclineTournament}
            onSetTournaments={onSetTournaments}
            onStartProject={onStartProject}
            onBuyPicker={onBuyPicker}
          />
        ) : (
          <>
            <CourseMap
              surfaces={mapSurfaces}
              pond={state.pond}
              hasAerator={state.hasAerator}
              holes={state.holes}
              hasDrivingRange={state.hasDrivingRange}
              showMower={showMower}
              selected={selected}
              highlight={event?.surface ?? selected}
              onSelect={onSelect}
              onOpenShed={onOpenShed}
              day={watching ? playout.day : state.day}
              view={state.view}
              onView={onSetView}
              moistureState={state}
            />
            <PlayoutBar
              playout={watching ? playout : null}
              speed={state.playoutSpeed}
              skipPref={state.skipPlayout}
              onSpeed={onSetPlayoutSpeed}
              onSkip={onSkipPlayout}
              onSkipPref={onSetSkipPref}
            />
          </>
        )}
      </div>
      <DaySummary summary={summary} onContinue={onDismissSummary} />
    </div>
  );
}
