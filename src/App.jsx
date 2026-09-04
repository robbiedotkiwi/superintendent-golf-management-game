import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import CourseMap from './components/CourseMap.jsx';
import DaySummary from './components/DaySummary.jsx';
import Crew from './components/Crew.jsx';
import GameOver from './components/GameOver.jsx';
import Office from './components/Office.jsx';
import PlayoutBar from './components/PlayoutBar.jsx';
import MapJobPopover from './components/MapJobPopover.jsx';
import StartDayDialog from './components/StartDayDialog.jsx';
import Sidebar from './components/Sidebar.jsx';
import PlanList from './components/PlanList.jsx';
import Tutorial from './components/Tutorial.jsx';
import Turf from './components/Turf.jsx';
import YearReview from './components/YearReview.jsx';
import Shed from './components/Shed.jsx';
import {
  HOLE_COUNT,
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SECTION_SHED,
  SECTION_TURF,
  SURFACE_KEYS,
  TURF_TAB_POND,
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
import { holeCount } from './engine/holes.js';
import HoleDetail from './components/HoleDetail.jsx';
import MapSelectionBar from './components/MapSelectionBar.jsx';
import {
  PLAYOUT_DONE,
  PLAYOUT_PLAYING,
  PLAYOUT_SKIPPED,
  buildPlayout,
  currentPlayoutEvent,
  playoutHoles,
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
  const condition = useMemo(() => Math.round(courseCondition(state)), [state]);

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
          onPlan={(taskId, holes, options) =>
            dispatch({
              type: 'PLAN_TASK',
              taskId,
              holes,
              confirmDamaging: options?.confirmDamaging,
              machineId: options?.machineId,
            })
          }
          onRemove={(taskId, planId) => dispatch({ type: 'REMOVE_TASK', taskId, planId })}
          onSelectHoles={(holes) => dispatch({ type: 'SET_SELECTED_HOLES', holes })}
          onToggleHole={(holeId) => dispatch({ type: 'TOGGLE_HOLE', holeId })}
          onAddHole={(holeId) => dispatch({ type: 'ADD_HOLE', holeId })}
          onSaveRoute={(name) => dispatch({ type: 'SAVE_ROUTE', name })}
          onApplyRoute={(id) => dispatch({ type: 'APPLY_ROUTE', id })}
          onRepeatLast={() => dispatch({ type: 'REPEAT_LAST' })}
          onEndDay={() => dispatch({ type: 'END_DAY' })}
          onDismissSummary={() => setSummary(null)}
          onSkipPlayout={() => setPlayout((current) => skipPlayout(current))}
          onSetPlayoutSpeed={(speed) => dispatch({ type: 'SET_PLAYOUT_SPEED', speed })}
          onSetSkipPref={(value) => dispatch({ type: 'SET_SKIP_PLAYOUT', value })}
          onOpenShed={() => dispatch({ type: 'SET_SECTION', section: SECTION_SHED })}
          onOpenCrew={() => dispatch({ type: 'SET_SECTION', section: SECTION_CREW })}
          onOpenOffice={() => dispatch({ type: 'SET_SECTION', section: SECTION_OFFICE })}
          onOpenTurf={() => dispatch({ type: 'SET_SECTION', section: SECTION_TURF })}
          onCloseShed={() => dispatch({ type: 'SET_SECTION', section: SECTION_MAP })}
          onBuy={(machineId) => dispatch({ type: 'BUY_MACHINE', machineId })}
          onBuyFoley={() => dispatch({ type: 'BUY_FOLEY' })}
          onSendGrind={(machineId) => dispatch({ type: 'SEND_GRIND', machineId })}
          onGrindInHouse={(machineId) => dispatch({ type: 'GRIND_IN_HOUSE', machineId })}
          onRepair={(machineId) => dispatch({ type: 'REPAIR_MACHINE', machineId })}
          onMove={(taskId, direction) => dispatch({ type: 'MOVE_TASK', taskId, direction })}
          onReorder={(order) => dispatch({ type: 'REORDER_TASKS', order })}
          onHire={(candidateId) => dispatch({ type: 'HIRE_WORKER', candidateId })}
          onTrain={(workerId, axis) => dispatch({ type: 'TRAIN_WORKER', workerId, axis })}
          onFire={(workerId) => dispatch({ type: 'FIRE_WORKER', workerId })}
          onDismissVolunteer={() => dispatch({ type: 'DISMISS_VOLUNTEER' })}
          onVolunteerDay={(weekday) => dispatch({ type: 'SET_VOLUNTEER_WEEKDAY', weekday })}
          onEarlyStart={(value) => dispatch({ type: 'SET_EARLY_START', value })}
          onSetWorker={(taskId, workerId) => dispatch({ type: 'SET_TASK_WORKER', taskId, workerId })}
          onSetHoc={(surface, hoc) => dispatch({ type: 'SET_HOC', surface, hoc })}
          onSetPattern={(surface, pattern) => dispatch({ type: 'SET_PATTERN', surface, pattern })}
          onSetAngle={(surface, angle) => dispatch({ type: 'SET_ANGLE', surface, angle })}
          onSetAutoRotate={(surface, value) => dispatch({ type: 'SET_AUTO_ROTATE', surface, value })}
          onSetIrrigation={(surface, policy) => dispatch({ type: 'SET_IRRIGATION', surface, policy })}
          onSetPondDosing={(on) => dispatch({ type: 'SET_POND_DOSING', on })}
          onSetView={(view) => dispatch({ type: 'SET_VIEW', view })}
          onBuyAerator={() => dispatch({ type: 'BUY_AERATOR' })}
          onBuyGreensSensors={() => dispatch({ type: 'BUY_GREENS_SENSORS' })}
          onBuyTurfRad={() => dispatch({ type: 'BUY_TURFRAD' })}
          onToggleMoistureOverlay={() => dispatch({ type: 'TOGGLE_MOISTURE_OVERLAY' })}
          onSetHandWaterTargets={(targets) => dispatch({ type: 'SET_HAND_WATER_TARGETS', targets })}
          onSavePreset={(surface, name) => dispatch({ type: 'SAVE_PRESET', surface, name })}
          onApplyPreset={(id) => dispatch({ type: 'APPLY_PRESET', id })}
          onApplyShippedPreset={(id) => dispatch({ type: 'APPLY_SHIPPED_PRESET', id })}
          onDeletePreset={(id) => dispatch({ type: 'DELETE_PRESET', id })}
          onMatchLastMowing={() => dispatch({ type: 'MATCH_LAST_MOWING' })}
          onSetMachineOverride={(surface, machineId) =>
            dispatch({ type: 'SET_MACHINE_OVERRIDE', surface, machineId })
          }
          onSetHoleOverride={(holeId, surface, override) =>
            dispatch({ type: 'SET_HOLE_OVERRIDE', holeId, surface, override })
          }
          onTab={(section, tab) => dispatch({ type: 'SET_TAB', section, tab })}
          onLease={(machineId) => dispatch({ type: 'LEASE_MACHINE', machineId })}
          onStopLease={(machineId) => dispatch({ type: 'STOP_LEASE', machineId })}
          onBuyUsed={(listingId) => dispatch({ type: 'BUY_USED', listingId })}
          onSell={(machineId) => dispatch({ type: 'SELL_MACHINE', machineId })}
          onSnap={() => dispatch({ type: 'SNAP_TOURNAMENT' })}
          onLoan={(amount) => dispatch({ type: 'TAKE_LOAN', amount })}
          onReadMail={(id) => dispatch({ type: 'READ_MAIL', id })}
          onSetTournaments={(count) => dispatch({ type: 'SET_TOURNAMENTS', count })}
          onDeclineTournament={() => dispatch({ type: 'DECLINE_TOURNAMENT_REQUEST' })}
          onAcceptEvent={(inviteId) => dispatch({ type: 'ACCEPT_EVENT', inviteId })}
          onDeclineEvent={(inviteId) => dispatch({ type: 'DECLINE_EVENT', inviteId })}
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
  onSelectHoles,
  onToggleHole,
  onAddHole,
  onSaveRoute,
  onApplyRoute,
  onRepeatLast,
  onEndDay,
  onDismissSummary,
  onSkipPlayout,
  onSetPlayoutSpeed,
  onSetSkipPref,
  onOpenShed,
  onOpenCrew,
  onOpenOffice,
  onOpenTurf,
  onCloseShed,
  onBuy,
  onBuyFoley,
  onSendGrind,
  onGrindInHouse,
  onRepair,
  onMove,
  onReorder,
  onHire,
  onTrain,
  onFire,
  onDismissVolunteer,
  onVolunteerDay,
  onEarlyStart,
  onSetWorker,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetIrrigation,
  onSetPondDosing,
  onSetView,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onToggleMoistureOverlay,
  onSetHandWaterTargets,
  onSavePreset,
  onApplyPreset,
  onApplyShippedPreset,
  onDeletePreset,
  onMatchLastMowing,
  onSetMachineOverride,
  onSetHoleOverride,
  onLease,
  onStopLease,
  onBuyUsed,
  onSell,
  onSnap,
  onLoan,
  onReadMail,
  onSetTournaments,
  onDeclineTournament,
  onAcceptEvent,
  onDeclineEvent,
  onStartProject,
  onBuyPicker,
  onToggleSound,
  onDismissTutorial,
  onDismissYearReview,
  onNewGame,
}) {
  const view = state.section ?? SECTION_MAP;
  const tabs = state.tabs ?? {};
  const [startDayOpen, setStartDayOpen] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Escape') return;
      if (startDayOpen) {
        setStartDayOpen(false);
        return;
      }
      if (view !== SECTION_MAP) {
        onCloseShed();
        return;
      }
      onSelect(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect, onCloseShed, view, startDayOpen]);

  useEffect(() => {
    if (state.weather === WEATHER_FINE) playBirds(state.soundEnabled);
  }, [state.day, state.weather, state.soundEnabled]);

  useEffect(() => {
    const event = currentPlayoutEvent(playout);
    if (event?.mowing) playMower(state.soundEnabled);
  }, [playout?.cursor, playout?.status, state.soundEnabled]);

  const event = currentPlayoutEvent(playout);
  const latestSummary = state.log[state.log.length - 1];
  const mapHoles =
    playout?.status === PLAYOUT_PLAYING && latestSummary?.before
      ? playoutHoles(latestSummary, playout)
      : state.holes;
  const showMower = Boolean(event?.mowing);
  const watching = playout?.status === PLAYOUT_PLAYING;

  function handleSelect(id) {
    if (id === 'pond') {
      onTab(SECTION_TURF, TURF_TAB_POND);
      onOpenTurf();
      onSelect(null);
      return;
    }
    onSelect(id);
  }

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
        condition={condition}
        minutesRemaining={minutesRemaining}
        minutesUsed={minutesUsed}
        minutesCapacity={minutesCapacity}
        onRemove={onRemove}
        onEndDay={watching ? () => {} : () => setStartDayOpen(true)}
        playoutActive={watching || startDayOpen}
        section={view}
        onOpenTurf={onOpenTurf}
        onOpenShed={onOpenShed}
        onOpenCrew={onOpenCrew}
        onOpenOffice={onOpenOffice}
        onSetView={onSetView}
        onToggleMoistureOverlay={onToggleMoistureOverlay}
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
            onBuyUsed={onBuyUsed}
            onSell={onSell}
          />
        ) : view === SECTION_CREW ? (
          <Crew
            state={state}
            tab={tabs[SECTION_CREW]}
            onTab={(tab) => onTab(SECTION_CREW, tab)}
            onBack={onCloseShed}
          onHire={onHire}
          onTrain={onTrain}
          onFire={onFire}
          onDismissVolunteer={onDismissVolunteer}
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
            onPlanBalls={() => onPlan('pickBalls')}
            onRemoveBalls={() => onRemove('pickBalls')}
            onDeclineTournament={onDeclineTournament}
            onAcceptEvent={onAcceptEvent}
            onDeclineEvent={onDeclineEvent}
            onSetTournaments={onSetTournaments}
            onStartProject={onStartProject}
            onBuyPicker={onBuyPicker}
          />
        ) : view === SECTION_TURF ? (
          <Turf
            state={state}
            tab={tabs[SECTION_TURF]}
            onTab={(tab) => onTab(SECTION_TURF, tab)}
            onBack={onCloseShed}
            onPlan={onPlan}
            onRemove={onRemove}
            onSetHoc={onSetHoc}
            onSetPattern={onSetPattern}
            onSetAngle={onSetAngle}
            onSetAutoRotate={onSetAutoRotate}
            onSetIrrigation={onSetIrrigation}
            onSetPondDosing={onSetPondDosing}
            onBuyAerator={onBuyAerator}
            onBuyGreensSensors={onBuyGreensSensors}
            onBuyTurfRad={onBuyTurfRad}
            onSetHandWaterTargets={onSetHandWaterTargets}
            onSavePreset={onSavePreset}
            onApplyPreset={onApplyPreset}
            onApplyShippedPreset={onApplyShippedPreset}
            onDeletePreset={onDeletePreset}
            onMatchLastMowing={onMatchLastMowing}
            onSetMachineOverride={onSetMachineOverride}
            onToggleHole={onToggleHole}
            onSelectHoles={onSelectHoles}
          />
        ) : (
          <>
            <CourseMap
              holesData={mapHoles}
              surfaceDefaults={state.surfaceDefaults}
              pond={state.pond}
              hasAerator={state.hasAerator}
              holes={holeCount(state)}
              hasDrivingRange={state.hasDrivingRange}
              showMower={showMower}
              selected={selected}
              highlight={event?.surface ?? selected}
              selectedHoles={state.selectedHoles}
              onToggleHole={onToggleHole}
              onAddHole={onAddHole}
              onSelect={handleSelect}
              onOpenShed={onOpenShed}
              day={watching ? playout.day : state.day}
              view={state.view}
              onView={onSetView}
              moistureState={state}
            />
            {!watching ? (
              <MapSelectionBar
                state={state}
                onSelectHoles={onSelectHoles}
                onToggleHole={onToggleHole}
                onSaveRoute={onSaveRoute}
                onApplyRoute={onApplyRoute}
                onRepeatLast={onRepeatLast}
                onPlan={onPlan}
                onRemove={onRemove}
              />
            ) : null}
            {SURFACE_KEYS.includes(selected) && !watching ? (
              <MapJobPopover
                surface={selected}
                state={state}
                holes={state.selectedHoles}
                onPlan={onPlan}
                onRemove={onRemove}
                onSetWorker={onSetWorker}
                onClose={() => onSelect(null)}
              />
            ) : null}
            {selected?.holeId && !watching ? (
              <HoleDetail
                state={state}
                holeId={selected.holeId}
                onSetOverride={onSetHoleOverride}
                onClose={() => onSelect(null)}
              />
            ) : null}
            <PlayoutBar
              playout={watching ? playout : null}
              speed={state.playoutSpeed}
              skipPref={state.skipPlayout}
              onSpeed={onSetPlayoutSpeed}
              onSkip={onSkipPlayout}
              onSkipPref={onSetSkipPref}
            />
            {!watching ? (
              <div className="pointer-events-auto absolute bottom-3 left-3 z-20 w-80 max-h-[40%] overflow-y-auto border-2 border-[var(--sand)] bg-[var(--soil)] p-3">
                <PlanList
                  compact
                  state={state}
                  onReorder={onReorder}
                  onRemove={onRemove}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
      {startDayOpen && !watching ? (
        <StartDayDialog
          state={state}
          minutesRemaining={minutesRemaining}
          onRemove={onRemove}
          onReorder={onReorder}
          onSetIrrigation={onSetIrrigation}
          onConfirm={() => {
            onCloseShed();
            onEndDay();
            setStartDayOpen(false);
          }}
          onBack={() => setStartDayOpen(false)}
        />
      ) : null}
      <DaySummary summary={summary} onContinue={onDismissSummary} />
    </div>
  );
}
