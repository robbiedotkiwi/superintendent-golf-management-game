import {
  CREW_TAB_DEFAULT,
  CREW_TAB_HIRE,
  CREW_TAB_LABELS,
  CREW_TAB_ROSTER,
  CREW_TABS,
  DAYS_PER_WEEK,
  PLAYER_ID,
  PLAYER_WAGE,
  TRAINING_COST,
  TRAINING_DAYS,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_MINUTES,
} from '../data/constants.js';
import { dayOfWeek } from '../engine/staff.js';
import { formatMoney } from '../engine/format.js';
import SectionTabs from './SectionTabs.jsx';

export default function Crew({
  state,
  tab = CREW_TAB_DEFAULT,
  onTab,
  onBack,
  onHire,
  onTrain,
  onVolunteerDay,
  onEarlyStart,
}) {
  const paid = state.workers.filter((worker) => !worker.isVolunteer);

  return (
    <div className="h-full overflow-y-auto bg-[var(--soil)] px-6 py-5 text-[var(--paint)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-condensed text-5xl font-bold">Crew</h1>
        <button type="button" onClick={onBack} className="border border-[var(--sand)] px-4 py-2">
          Back to the course
        </button>
      </div>
      <SectionTabs tabs={CREW_TABS} labels={CREW_TAB_LABELS} value={tab} onChange={onTab} />

      {tab === CREW_TAB_ROSTER ? (
        <>
      <label className="mb-6 flex items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(state.earlyStart)}
          onChange={(event) => onEarlyStart(event.target.checked)}
        />
        Early start (before 6am) — extra time, neighbour complaints {state.neighbourComplaintsThisSeason ?? 0}
      </label>

      <h2 className="font-condensed text-3xl">On the books</h2>
      <div className="mt-3 space-y-4">
        {paid.map((worker) => (
          <section key={worker.id} className="border-2 border-[var(--sand)] p-4">
            <h3 className="text-2xl font-semibold">{worker.name}</h3>
            <p>
              Speed {worker.speedSkill} · Quality {worker.qualitySkill} · Morale {Math.round(worker.morale)} · Wage {formatMoney(worker.wage)}/day
              {worker.isMechanic ? ' · Mechanic' : ''}
              {worker.sprayCertified ? ' · Spray ticket' : ''}
            </p>
            <p className="text-sm text-[var(--sand)]">
              {worker.trainingUntilDay && state.day < worker.trainingUntilDay
                ? `Away on training until day ${worker.trainingUntilDay}`
                : `${worker.minutesToday} min today`}
            </p>
            {worker.id !== PLAYER_ID ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onTrain(worker.id, 'speedSkill')} className="border border-[var(--sand)] px-3 py-1">
                  Train speed ({formatMoney(TRAINING_COST)}, {TRAINING_DAYS} days)
                </button>
                <button type="button" onClick={() => onTrain(worker.id, 'qualitySkill')} className="border border-[var(--sand)] px-3 py-1">
                  Train quality ({formatMoney(TRAINING_COST)}, {TRAINING_DAYS} days)
                </button>
              </div>
            ) : null}
            {!worker.sprayCertified ? (
              <button type="button" onClick={() => onTrain(worker.id, 'spray')} className="mt-2 border border-[var(--sand)] px-3 py-1">
                Spray ticket ({formatMoney(TRAINING_COST)}, {TRAINING_DAYS} days)
              </button>
            ) : null}
          </section>
        ))}
      </div>

      <h2 className="mt-10 font-condensed text-3xl">Volunteer</h2>
      <p className="mt-2">
        Comes on day {state.volunteerWeekday ?? VOLUNTEER_DEFAULT_WEEKDAY} of each {DAYS_PER_WEEK}-day week with {VOLUNTEER_MINUTES} min. Fairways and rough only. Wage {formatMoney(PLAYER_WAGE)}.
      </p>
      <p className="text-sm text-[var(--sand)]">Today is weekday {dayOfWeek(state.day)}.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: DAYS_PER_WEEK }, (_, index) => index + 1).map((weekday) => (
          <button
            key={weekday}
            type="button"
            disabled={state.volunteerDayChangedThisSeason && weekday !== state.volunteerWeekday}
            onClick={() => onVolunteerDay(weekday)}
            className="border border-[var(--sand)] px-3 py-1 disabled:opacity-40"
          >
            Day {weekday}
          </button>
        ))}
      </div>
        </>
      ) : null}

      {tab === CREW_TAB_HIRE ? (
        <>
      <h2 className="mt-10 font-condensed text-3xl">Hire</h2>
      <p className="text-sm text-[var(--sand)]">List refreshes each season.</p>
      <div className="mt-3 space-y-3">
        {state.candidates.map((candidate) => (
          <section key={candidate.id} className="border border-[var(--sand)] p-4">
            <h3 className="text-xl font-semibold">{candidate.name}</h3>
            <p>
              Speed {candidate.speedSkill} · Quality {candidate.qualitySkill} · {formatMoney(candidate.wage)}/day
              {candidate.isMechanic ? ' · Mechanic' : ''}
            </p>
            <button
              type="button"
              onClick={() => onHire(candidate.id)}
              className="mt-2 bg-[var(--machine-orange)] px-3 py-2 font-semibold"
            >
              Hire
            </button>
          </section>
        ))}
      </div>
        </>
      ) : null}
    </div>
  );
}
