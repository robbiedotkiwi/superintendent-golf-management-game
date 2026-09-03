import {
  SECTION_CREW,
  SECTION_OFFICE,
  SECTION_SHED,
  SECTION_TURF,
  SIDEBAR_WIDTH,
} from '../data/constants.js';
import { WEATHER_LABELS } from '../data/events.js';
import { qualityColor } from '../engine/color.js';
import { sectionBadge } from '../engine/badges.js';
import { fitCourse } from '../engine/view.js';
import TimeBar from './TimeBar.jsx';

function NavButton({ label, active, badge, dot, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex-1 px-2 py-2 text-sm ${active ? 'bg-[var(--machine-orange)]' : ''}`}
    >
      {label}
      {badge ? (
        <span className="absolute right-1 top-1 min-w-5 rounded-full bg-[var(--machine-orange)] px-1 text-center text-xs font-bold leading-5 text-[var(--paint)]">
          {badge}
        </span>
      ) : null}
      {dot ? (
        <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[var(--machine-orange)]" aria-hidden="true" />
      ) : null}
    </button>
  );
}

export default function Sidebar({
  state,
  condition,
  minutesRemaining,
  minutesUsed,
  minutesCapacity,
  onRemove,
  onEndDay,
  playoutActive = false,
  section,
  onOpenTurf,
  onOpenShed,
  onOpenCrew,
  onOpenOffice,
  onSetView,
  onToggleMoistureOverlay,
  onToggleSound,
}) {
  const turf = sectionBadge(state, 'turf');
  const office = sectionBadge(state, 'office');
  const crew = sectionBadge(state, 'crew');
  const shed = sectionBadge(state, 'shed');
  const tomorrow = WEATHER_LABELS[state.forecast] ?? state.forecast;

  return (
    <aside
      className="flex h-full shrink-0 flex-col overflow-hidden bg-[var(--soil)] text-[var(--paint)]"
      style={{ width: SIDEBAR_WIDTH, maxHeight: '100%' }}
    >
      <div className="flex-1 px-3 py-3">
        <header>
          <div className="font-condensed text-4xl font-bold leading-none">Day {state.day}</div>
          <p className="mt-1 text-lg">
            {state.season} · {state.year}
          </p>
          <p className="mt-2 text-sm">
            Today {WEATHER_LABELS[state.weather]} · Tomorrow {tomorrow}
          </p>
        </header>

        <div className="mt-4">
          <div className="text-sm text-[var(--sand)]">Condition</div>
          <div className="font-condensed text-6xl font-bold leading-none" style={{ color: qualityColor(condition) }}>
            {condition}
          </div>
        </div>

        <nav aria-label="Sections" className="mt-4 grid grid-cols-2 overflow-hidden border border-[var(--sand)]">
          <NavButton label="Turf" active={section === SECTION_TURF} badge={turf.count} dot={turf.dot} onClick={onOpenTurf} />
          <NavButton
            label="Office"
            active={section === SECTION_OFFICE}
            badge={office.count}
            dot={office.dot}
            onClick={onOpenOffice}
          />
          <NavButton
            label="Crew"
            active={section === SECTION_CREW}
            badge={crew.count}
            dot={crew.dot}
            onClick={onOpenCrew}
          />
          <NavButton label="Shed" active={section === SECTION_SHED} badge={shed.count} dot={shed.dot} onClick={onOpenShed} />
        </nav>
      </div>

      <div className="shrink-0 border-t border-[var(--sand)] p-3">
        <TimeBar
          remaining={minutesRemaining}
          used={minutesUsed}
          capacity={minutesCapacity}
          plannedTasks={state.plannedTasks}
          onRemove={onRemove}
        />
        <button
          type="button"
          onClick={onEndDay}
          disabled={playoutActive}
          className="mt-2 w-full bg-[var(--machine-orange)] px-4 py-3 text-lg font-semibold text-[var(--paint)] disabled:opacity-40"
        >
          End day
        </button>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetView(fitCourse())}
            title="Fit"
            aria-label="Fit course"
            className="flex h-10 w-10 items-center justify-center border border-[var(--sand)] text-xs"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={onToggleMoistureOverlay}
            title="Moisture"
            aria-label="Toggle moisture overlay"
            aria-pressed={Boolean(state.moistureOverlay)}
            className={`flex h-10 w-10 items-center justify-center border text-xs ${
              state.moistureOverlay ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]' : 'border-[var(--sand)]'
            }`}
          >
            Moist
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
                <path d="M16.5 12c0 .9-.2 1.8-.5 2.6l1.5 1.5c.7-1.3 1-2.7 1-4.1 0-4.3-3-7.9-7-8.8v2.1c2.9.9 5 3.5 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
