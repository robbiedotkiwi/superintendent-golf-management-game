import {
  GM_MEETING_MINUTES,
  MOISTURE_SURFACES,
  SIDEBAR_WIDTH,
  SURFACE_KEYS,
  TASK_MINUTES,
  WEATHER_STORM,
} from '../data/constants.js';
import { WEATHER_LABELS, weatherCopy } from '../data/events.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { durationForTask } from '../engine/assignment.js';
import { qualityColor } from '../engine/color.js';
import { formatMoney } from '../engine/format.js';
import { canPlanTask } from '../engine/gameState.js';
import { meetingDue } from '../engine/mail.js';
import { daysSinceLastWorked, isNeglected } from '../engine/neglect.js';
import { daysUntilNextTournament, nextTournament } from '../engine/tournament.js';
import { fitCourse } from '../engine/view.js';
import ForecastStrip from './ForecastStrip.jsx';
import IrrigationPanel from './IrrigationPanel.jsx';
import { MoistureLine } from './MoistureReadout.jsx';
import TaskPanel from './TaskPanel.jsx';
import TimeBar from './TimeBar.jsx';
import { DiseaseReadout } from './WeatherStrip.jsx';

function formatQuality(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function Sidebar({
  state,
  selected,
  condition,
  minutesRemaining,
  minutesUsed,
  minutesCapacity,
  unread,
  onSelect,
  onPlan,
  onRemove,
  onEndDay,
  onMove,
  onOpenShed,
  onOpenCrew,
  onOpenOffice,
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
  onToggleSound,
}) {
  const debris = state.plannedTasks.find((item) => item.taskId === 'clearDebris');
  const debrisCheck = canPlanTask(state, 'clearDebris');
  const meeting = state.plannedTasks.find((item) => item.taskId === 'gmMeeting');
  const meetingCheck = canPlanTask(state, 'gmMeeting');
  const balls = state.plannedTasks.find((item) => item.taskId === 'pickBalls');
  const ballsCheck = canPlanTask(state, 'pickBalls');
  const ballMinutes = durationForTask(state, 'pickBalls');
  const until = daysUntilNextTournament(state);
  const upcoming = nextTournament(state);

  return (
    <aside
      className="flex h-full shrink-0 flex-col bg-[var(--soil)] text-[var(--paint)]"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <header>
          <div className="font-condensed text-4xl font-bold leading-none">Day {state.day}</div>
          <p className="mt-1 text-lg">
            {state.season} · {state.year}
          </p>
          <p className="mt-2 text-sm text-[var(--sand)]">
            Today: <span className="text-[var(--paint)]">{WEATHER_LABELS[state.weather]}</span>
            {' — '}
            {weatherCopy(state.weather)}
          </p>
        </header>

        <ForecastStrip state={state} />

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm text-[var(--sand)]">Condition</div>
            <div className="font-condensed text-6xl font-bold leading-none" style={{ color: qualityColor(condition) }}>
              {condition}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--sand)]">Satisfaction</div>
            <div className="font-condensed text-2xl font-bold leading-none">{Math.round(state.satisfaction)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-[var(--sand)]">Cash</div>
          <div className="font-condensed text-2xl font-bold leading-none">{formatMoney(state.cash)}</div>
          <div className="mt-2 text-xs uppercase tracking-widest text-[var(--sand)]">Budgets</div>
          <div className="mt-1 flex gap-4">
            <div>
              <div className="text-sm text-[var(--sand)]">Maintenance</div>
              <div className="text-lg font-semibold">{formatMoney(state.maintenanceBudget)}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--sand)]">Capital</div>
              <div className="text-lg font-semibold">{formatMoney(state.capitalBudget)}</div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--sand)]">
          {upcoming == null
            ? 'No tournament booked'
            : until === 0
              ? 'Tournament today'
              : `Tournament in ${until} day${until === 1 ? '' : 's'} (day ${upcoming.day})`}
        </p>
        <div className="mt-1">
          <DiseaseReadout state={state} />
        </div>

        {meetingDue(state.day) ? (
          meeting ? (
            <button type="button" onClick={() => onRemove('gmMeeting')} className="mt-2 border border-[var(--sand)] px-3 py-1">
              GM meeting planned · {meeting.minutes} min
            </button>
          ) : (
            <button
              type="button"
              disabled={!meetingCheck.ok}
              onClick={() => onPlan('gmMeeting')}
              className="mt-2 bg-[var(--machine-orange)] px-3 py-1 font-semibold disabled:opacity-40"
              title={meetingCheck.ok ? undefined : meetingCheck.reason}
            >
              GM meeting · {GM_MEETING_MINUTES} min
            </button>
          )
        ) : null}
        {state.hasDrivingRange ? (
          balls ? (
            <button type="button" onClick={() => onRemove('pickBalls')} className="mt-2 border border-[var(--sand)] px-3 py-1">
              Ball pick planned · {balls.minutes} min
            </button>
          ) : (
            <button
              type="button"
              disabled={!ballsCheck.ok}
              onClick={() => onPlan('pickBalls')}
              className="mt-2 bg-[var(--machine-orange)] px-3 py-1 font-semibold disabled:opacity-40"
              title={ballsCheck.ok ? undefined : ballsCheck.reason}
            >
              Pick balls · {ballMinutes} min
            </button>
          )
        ) : null}
        {state.weather === WEATHER_STORM ? (
          debris ? (
            <button type="button" onClick={() => onRemove('clearDebris')} className="mt-2 border border-[var(--sand)] px-3 py-1">
              Debris planned · {debris.minutes} min
            </button>
          ) : (
            <button
              type="button"
              disabled={!debrisCheck.ok}
              onClick={() => onPlan('clearDebris')}
              className="mt-2 bg-[var(--machine-orange)] px-3 py-1 font-semibold disabled:opacity-40"
              title={debrisCheck.ok ? undefined : debrisCheck.reason}
            >
              Clear debris · {TASK_MINUTES.clearDebris} min
            </button>
          )
        ) : null}

        <h2 className="mt-5 text-sm uppercase tracking-widest text-[var(--sand)]">Surfaces</h2>
        <div className="mt-2 space-y-1">
          {SURFACE_KEYS.map((surface) => {
            const days = daysSinceLastWorked(state, surface);
            const neglected = isNeglected(state, surface);
            const open = selected === surface;
            return (
              <div
                key={surface}
                className={`border ${
                  open ? 'border-[var(--paint)]' : neglected ? 'border-[var(--machine-orange)]' : 'border-[var(--sand)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(open ? null : surface)}
                  className="flex w-full items-baseline justify-between gap-2 px-2 py-2 text-left"
                >
                  <span className="font-semibold">{SURFACE_LABELS[surface]}</span>
                  <span className="text-sm text-[var(--sand)]">
                    {formatQuality(state.surfaces[surface].quality)}
                    {' · '}
                    {days}d
                    {neglected ? ' · overdue' : ''}
                    {MOISTURE_SURFACES.includes(surface) ? (
                      <>
                        {' · '}
                        <MoistureLine state={state} surface={surface} />
                      </>
                    ) : null}
                  </span>
                </button>
                {open ? (
                  <div className="px-2 pb-2">
                    <TaskPanel
                      surface={surface}
                      state={state}
                      onPlan={onPlan}
                      onRemove={onRemove}
                      onSetWorker={onSetWorker}
                      onSetHoc={onSetHoc}
                      onSetPattern={onSetPattern}
                      onSetAngle={onSetAngle}
                      onSetAutoRotate={onSetAutoRotate}
                      onSetHandWaterTargets={onSetHandWaterTargets}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <h2 className="mt-5 text-sm uppercase tracking-widest text-[var(--sand)]">Locations</h2>
        <nav aria-label="Locations" className="mt-2 flex overflow-hidden border border-[var(--sand)]">
          <button
            type="button"
            onClick={() => onSelect(selected === 'pond' ? null : 'pond')}
            className={`flex-1 px-2 py-2 text-sm ${selected === 'pond' ? 'bg-[var(--machine-orange)]' : ''}`}
          >
            Pond
          </button>
          <button type="button" onClick={onOpenOffice} className="relative flex-1 border-l border-[var(--sand)] px-2 py-2 text-sm">
            Office
            {unread ? (
              <span className="absolute right-1 top-1 min-w-5 rounded-full bg-[var(--machine-orange)] px-1 text-center text-xs font-bold leading-5 text-[var(--paint)]">
                {unread}
              </span>
            ) : null}
          </button>
          <button type="button" onClick={onOpenCrew} className="flex-1 border-l border-[var(--sand)] px-2 py-2 text-sm">
            Crew
          </button>
          <button type="button" onClick={onOpenShed} className="flex-1 border-l border-[var(--sand)] px-2 py-2 text-sm">
            Shed
          </button>
        </nav>
        {selected === 'pond' ? (
          <IrrigationPanel
            state={state}
            onSetPolicy={onSetIrrigation}
            onBuyAerator={onBuyAerator}
            onBuyGreensSensors={onBuyGreensSensors}
            onBuyTurfRad={onBuyTurfRad}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--sand)] p-3">
        <TimeBar
          remaining={minutesRemaining}
          used={minutesUsed}
          capacity={minutesCapacity}
          plannedTasks={state.plannedTasks}
          onRemove={onRemove}
        />
        {state.plannedTasks.length > 1 ? (
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-[var(--sand)]">
            {state.plannedTasks.map((planned) => (
              <span key={planned.taskId} className="flex gap-1">
                <button type="button" onClick={() => onMove(planned.taskId, -1)} aria-label="Move earlier">
                  ↑
                </button>
                <button type="button" onClick={() => onMove(planned.taskId, 1)} aria-label="Move later">
                  ↓
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetView(fitCourse())}
            className="border border-[var(--sand)] px-3 py-2 text-sm"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={onToggleMoistureOverlay}
            aria-pressed={Boolean(state.moistureOverlay)}
            className={`border px-3 py-2 text-sm ${
              state.moistureOverlay ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]' : 'border-[var(--sand)]'
            }`}
          >
            Moisture
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            title={state.soundEnabled ? 'Sound on' : 'Sound off'}
            aria-label={state.soundEnabled ? 'Turn sound off' : 'Turn sound on'}
            aria-pressed={state.soundEnabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--sand)] text-[var(--sand)] hover:text-[var(--paint)]"
          >
            {state.soundEnabled ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.8-1-3.3-2.5-4v8c1.5-.7 2.5-2.2 2.5-4zM14 3.2v2.1c2.9.9 5 3.5 5 6.7s-2.1 5.8-5 6.7v2.1c4-.9 7-4.5 7-8.8S18 4.1 14 3.2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d="M16.5 12c0-1.8-1-3.3-2.5-4v2.2l2.4 2.4c.1-.2.1-.4.1-.6zm2.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5c.7-1.3 1-2.7 1-4.1 0-4.3-3-7.9-7-8.8v2.1c2.9.9 5 3.5 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onEndDay}
            className="flex-1 bg-[var(--machine-orange)] px-4 py-3 text-lg font-semibold text-[var(--paint)]"
          >
            End day
          </button>
        </div>
      </div>
    </aside>
  );
}
