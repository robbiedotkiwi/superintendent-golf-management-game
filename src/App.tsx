import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import CourseMap from './components/CourseMap.tsx';
import DaySummary from './components/DaySummary.tsx';
import Crew, { LeaveRequests } from './components/Crew.tsx';
import GameOver from './components/GameOver.tsx';
import Office from './components/Office.tsx';
import PlayoutBar from './components/PlayoutBar.tsx';
import StartDayDialog from './components/StartDayDialog.tsx';
import Sidebar from './components/Sidebar.tsx';
import Tutorial from './components/Tutorial.tsx';
import GmTalk from './components/GmTalk.tsx';
import Turf from './components/Turf.tsx';
import YearReview from './components/YearReview.tsx';
import WeekReview from './components/WeekReview.tsx';
import Shed from './components/Shed.tsx';
import {
  HOLE_COUNT,
  SECTION_CREW,
  SECTION_MAP,
  SECTION_OFFICE,
  SECTION_SHED,
  SECTION_TURF,
  TURF_TAB_IRRIGATION,
  WEATHER_FINE,
  machineOrange,
  paint,
  pondStressed,
  pondWater,
  sand,
  soil,
  turf,
  turfStressed,
} from './data/constants.ts';
import {
  combinedMinutesCapacity,
  combinedMinutesRemaining,
  combinedMinutesUsed,
  createInitialState,
  reducer,
} from './engine/gameState.ts';
import { courseCondition } from './engine/simulation.ts';
import { holeCount } from './engine/holes.ts';
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
} from './engine/playout.ts';
import { playBirds, playMower, prefersReducedMotion } from './engine/sound.ts';
import { clearSave, hasSave, loadGame, saveGame } from './engine/save.ts';
import { currentGmMessage } from './engine/gm.ts';
import { simViewState } from './engine/week.ts';
import { isColdWeather } from './engine/weather.ts';
import { COLD_WEATHER_TIP_TITLE, coldWeatherCopy } from './data/events.ts';

function paletteStyle(): CSSProperties {
  return {
    '--turf': turf,
    '--turf-stressed': turfStressed,
    '--soil': soil,
    '--sand': sand,
    '--paint': paint,
    '--machine-orange': machineOrange,
    '--pond-water': pondWater,
    '--pond-stressed': pondStressed,
  } as CSSProperties;
}

export default function App() {
  const [screen, setScreen] = useState('entry');
  const [savePresent, setSavePresent] = useState(() => hasSave());
  const [state, dispatch] = useReducer(reducer, null, () => loadGame() ?? createInitialState());
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [playout, setPlayout] = useState(null);
  const seenLog = useRef(state.log?.length ?? 0);

  useEffect(() => {
    if (screen !== 'game') return;
    if (saveGame(state)) setSavePresent(true);
  }, [state, screen]);

  useEffect(() => {
    const log = state.log ?? [];
    if (log.length <= seenLog.current) return;
    const latest = log[log.length - 1];
    seenLog.current = log.length;
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
      const log = state.log ?? [];
      const latest = log[log.length - 1] ?? null;
      setSummary(latest);
      setPlayout(null);
    }
  }, [playout, state.log]);

  const today = useMemo(() => simViewState(state), [state]);
  const minutesRemaining = useMemo(() => combinedMinutesRemaining(today), [today]);
  const minutesUsed = useMemo(() => combinedMinutesUsed(today), [today]);
  const minutesCapacity = useMemo(() => combinedMinutesCapacity(today), [today]);
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
          today={today}
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
              workerId: options?.workerId,
              day: options?.day,
              minutes: options?.minutes,
            })
          }
          onRemove={(taskId, planId, day) => dispatch({ type: 'REMOVE_TASK', taskId, planId, day })}
          onPlaceBlock={(payload) => dispatch({ type: 'PLACE_BLOCK', ...payload })}
          onMoveBlock={(payload) => dispatch({ type: 'MOVE_BLOCK', ...payload })}
          onResizeBlock={(payload) => dispatch({ type: 'RESIZE_BLOCK', ...payload })}
          onSetBlockMachine={(payload) => dispatch({ type: 'SET_BLOCK_MACHINE', ...payload })}
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
          onBuyUpgrade={(machineId, upgradeId) => dispatch({ type: 'BUY_UPGRADE', machineId, upgradeId })}
          onBuyFoley={() => dispatch({ type: 'BUY_FOLEY' })}
          onSendGrind={(machineId) => dispatch({ type: 'SEND_GRIND', machineId })}
          onGrindInHouse={(machineId) => dispatch({ type: 'GRIND_IN_HOUSE', machineId })}
          onRepair={(machineId) => dispatch({ type: 'REPAIR_MACHINE', machineId })}
          onReorder={(order) => dispatch({ type: 'REORDER_TASKS', order })}
          onHire={(candidateId) => dispatch({ type: 'HIRE_WORKER', candidateId })}
          onTrain={(workerId, axis) => dispatch({ type: 'TRAIN_WORKER', workerId, axis })}
          onFire={(workerId) => dispatch({ type: 'FIRE_WORKER', workerId })}
          onApproveLeave={(requestId) => dispatch({ type: 'APPROVE_LEAVE', requestId })}
          onDeclineLeave={(requestId) => dispatch({ type: 'DECLINE_LEAVE', requestId })}
          onDismissVolunteer={() => dispatch({ type: 'DISMISS_VOLUNTEER' })}
          onVolunteerDay={(weekday) => dispatch({ type: 'SET_VOLUNTEER_WEEKDAY', weekday })}
          onEarlyStart={(value) => dispatch({ type: 'SET_EARLY_START', value })}
          onSelectDay={(day) => dispatch({ type: 'SET_PLANNING_DAY', day })}
          onBookCasual={(casualId, day) => dispatch({ type: 'BOOK_CASUAL', casualId, day })}
          onUnbookCasual={(casualId, day) => dispatch({ type: 'UNBOOK_CASUAL', casualId, day })}
          onCopyYesterday={(day) => dispatch({ type: 'COPY_YESTERDAY', day })}
          onSaveTemplate={(name) => dispatch({ type: 'SAVE_TEMPLATE', name })}
          onApplyTemplate={(templateId) => dispatch({ type: 'APPLY_TEMPLATE', templateId })}
          onSetHoc={(surface, hoc) => dispatch({ type: 'SET_HOC', surface, hoc })}
          onSetPattern={(surface, pattern) => dispatch({ type: 'SET_PATTERN', surface, pattern })}
          onSetAngle={(surface, angle) => dispatch({ type: 'SET_ANGLE', surface, angle })}
          onSetAutoRotate={(surface, value) => dispatch({ type: 'SET_AUTO_ROTATE', surface, value })}
          onSetIrrigation={(surface, mm, day) => dispatch({ type: 'SET_IRRIGATION', surface, mm, day })}
          onSetView={(view) => dispatch({ type: 'SET_VIEW', view })}
          onBuyAerator={() => dispatch({ type: 'BUY_AERATOR' })}
          onBuyGreensSensors={() => dispatch({ type: 'BUY_GREENS_SENSORS' })}
          onBuyTurfRad={() => dispatch({ type: 'BUY_TURFRAD' })}
          onBuyWeatherStation={() => dispatch({ type: 'BUY_WEATHER_STATION' })}
          onToggleMoistureOverlay={() => dispatch({ type: 'TOGGLE_MOISTURE_OVERLAY' })}
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
          onStartProject={(projectId, workerId) => dispatch({ type: 'START_PROJECT', projectId, workerId })}
          onPauseProject={(projectId) => dispatch({ type: 'PAUSE_PROJECT', projectId })}
          onResumeProject={(projectId) => dispatch({ type: 'RESUME_PROJECT', projectId })}
          onStartGrassConversion={(surface, speciesId) =>
            dispatch({ type: 'START_GRASS_CONVERSION', surface, speciesId })
          }
          onBuyPicker={() => dispatch({ type: 'BUY_AUTO_PICKER' })}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
          onDismissTutorial={() => dispatch({ type: 'DISMISS_TUTORIAL' })}
          onDismissColdWeatherTip={() => dispatch({ type: 'DISMISS_COLD_WEATHER_TIP' })}
          onDismissGm={() => dispatch({ type: 'DISMISS_GM' })}
          onDismissLockHint={() => dispatch({ type: 'DISMISS_LOCK_HINT' })}
          onDismissYearReview={() => dispatch({ type: 'DISMISS_YEAR_REVIEW' })}
          onDismissWeekReview={() => dispatch({ type: 'DISMISS_WEEK_REVIEW' })}
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
  today = state,
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
  onPlaceBlock,
  onMoveBlock,
  onResizeBlock,
  onSetBlockMachine,
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
  onBuyUpgrade,
  onBuyFoley,
  onSendGrind,
  onGrindInHouse,
  onRepair,
  onReorder,
  onHire,
  onTrain,
  onFire,
  onApproveLeave,
  onDeclineLeave,
  onDismissVolunteer,
  onVolunteerDay,
  onEarlyStart,
  onSelectDay,
  onBookCasual,
  onUnbookCasual,
  onCopyYesterday,
  onSaveTemplate,
  onApplyTemplate,
  onSetHoc,
  onSetPattern,
  onSetAngle,
  onSetAutoRotate,
  onSetIrrigation,
  onSetView,
  onBuyAerator,
  onBuyGreensSensors,
  onBuyTurfRad,
  onBuyWeatherStation,
  onToggleMoistureOverlay,
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
  onPauseProject,
  onResumeProject,
  onStartGrassConversion,
  onBuyPicker,
  onToggleSound,
  onDismissTutorial,
  onDismissColdWeatherTip,
  onDismissGm,
  onDismissLockHint,
  onDismissYearReview,
  onDismissWeekReview,
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
  const dayLog = state.log ?? [];
  const latestSummary = dayLog[dayLog.length - 1];
  const mapHoles =
    playout?.status === PLAYOUT_PLAYING && latestSummary?.before
      ? playoutHoles(latestSummary, playout)
      : state.holes;
  const showMower = Boolean(event?.mowing);
  const watching = playout?.status === PLAYOUT_PLAYING;

  function handleSelect(id) {
    if (id === 'pond') {
      onTab(SECTION_TURF, TURF_TAB_IRRIGATION);
      onOpenTurf();
      onSelect(null);
      return;
    }
    onSelect(id);
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[var(--soil)] text-[var(--paint)]">
      {state.dismissed && !watching ? <GameOver onNewGame={onNewGame} /> : null}
      {!state.dismissed && state.pendingWeekReview && !summary && !watching ? (
        <WeekReview review={state.lastWeekReview} onContinue={onDismissWeekReview} />
      ) : null}
      {!state.dismissed && state.pendingYearReview && !state.pendingWeekReview && !summary && !watching ? (
        <YearReview review={state.lastYearReview} onContinue={onDismissYearReview} />
      ) : null}
      {(() => {
        const gm = currentGmMessage(state);
        if (!state.dismissed && gm && !state.pendingYearReview && !state.pendingWeekReview && !summary && !watching) {
          return <GmTalk message={gm} onDismiss={onDismissGm} />;
        }
        if (!state.dismissed && !state.tutorialDone && !state.pendingYearReview && !state.pendingWeekReview && !summary && !watching) {
          return <Tutorial onDismiss={onDismissTutorial} />;
        }
        if (
          !state.dismissed &&
          !state.coldWeatherTipDone &&
          isColdWeather(state) &&
          !state.pendingYearReview &&
          !state.pendingWeekReview &&
          !summary &&
          !watching
        ) {
          return (
            <Tutorial title={COLD_WEATHER_TIP_TITLE} onDismiss={onDismissColdWeatherTip}>
              <p className="mt-4 text-lg">{coldWeatherCopy(state.tempMin)}</p>
            </Tutorial>
          );
        }
        return null;
      })()}
      <Sidebar
        state={state}
        condition={condition}
        minutesRemaining={minutesRemaining}
        minutesUsed={minutesUsed}
        minutesCapacity={minutesCapacity}
        plannedTasks={today.plannedTasks}
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
        onDismissLockHint={onDismissLockHint}
        onSelectDay={onSelectDay}
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <LeaveRequests state={state} onApprove={onApproveLeave} onDecline={onDeclineLeave} />
        {view === SECTION_SHED ? (
          <Shed
            state={state}
            tab={tabs[SECTION_SHED]}
            onTab={(tab) => onTab(SECTION_SHED, tab)}
            onBack={onCloseShed}
            onBuy={onBuy}
            onBuyUpgrade={onBuyUpgrade}
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
          onApproveLeave={onApproveLeave}
          onDeclineLeave={onDeclineLeave}
          onDismissVolunteer={onDismissVolunteer}
          onVolunteerDay={onVolunteerDay}
            onEarlyStart={onEarlyStart}
            onBookCasual={onBookCasual}
            onUnbookCasual={onUnbookCasual}
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
            onPauseProject={onPauseProject}
            onResumeProject={onResumeProject}
            onStartGrassConversion={onStartGrassConversion}
            onBuyPicker={onBuyPicker}
          />
        ) : view === SECTION_TURF ? (
          <Turf
            state={state}
            tab={tabs[SECTION_TURF]}
            onTab={(tab) => onTab(SECTION_TURF, tab)}
            onBack={onCloseShed}
            onPlaceBlock={onPlaceBlock}
            onMoveBlock={onMoveBlock}
            onResizeBlock={onResizeBlock}
            onSetBlockMachine={onSetBlockMachine}
            onRemove={onRemove}
            onSelectDay={onSelectDay}
            onSetHoc={onSetHoc}
            onSetPattern={onSetPattern}
            onSetAngle={onSetAngle}
            onSetAutoRotate={onSetAutoRotate}
            onSetIrrigation={onSetIrrigation}
            onCopyYesterday={onCopyYesterday}
            onSaveTemplate={onSaveTemplate}
            onApplyTemplate={onApplyTemplate}
            onBuyAerator={onBuyAerator}
            onBuyGreensSensors={onBuyGreensSensors}
            onBuyTurfRad={onBuyTurfRad}
            onBuyWeatherStation={onBuyWeatherStation}
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
              hasPondExpansion={state.hasPondExpansion}
              showMower={showMower}
              selected={selected}
              highlight={event?.surface ?? selected}
              onSelect={handleSelect}
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
      {startDayOpen && !watching ? (
        <StartDayDialog
          state={today}
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
