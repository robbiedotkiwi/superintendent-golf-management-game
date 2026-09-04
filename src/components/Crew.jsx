import {
  CREW_TAB_DEFAULT,
  CREW_TAB_HIRE,
  CREW_TAB_LABELS,
  CREW_TAB_ROSTER,
  CREW_TABS,
  DAYS_PER_WEEK,
  FIRING_MORALE_HIT,
  FIRING_SEVERANCE_DAYS,
  PLAYER_ID,
  PLAYER_WAGE,
  TRAINING_COST,
  TRAINING_DAYS,
  VOLUNTEER_DEFAULT_WEEKDAY,
  VOLUNTEER_MINUTES,
} from '../data/constants.js';
import { useState } from 'react';
import { canFireWorker, dayOfWeek, severanceCost } from '../engine/staff.js';
import { workerAbsenceReason } from '../engine/availability.js';
import { formatMoney } from '../engine/format.js';
import SectionTabs from './SectionTabs.jsx';

export default function Crew({
  state,
  tab = CREW_TAB_DEFAULT,
  onTab,
  onBack,
  onHire,
  onTrain,
  onFire,
  onDismissVolunteer,
  onVolunteerDay,
  onEarlyStart,
}) {
  const paid = state.workers.filter((worker) => !worker.isVolunteer);
  const [confirmFireId, setConfirmFireId] = useState(null);
  const [confirmVolunteerGone, setConfirmVolunteerGone] = useState(false);

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
        {paid.map((worker) => {
          const reason = workerAbsenceReason(state, worker);
          return (
          <section key={worker.id} className="border-2 border-[var(--sand)] p-4">
            <h3 className={`text-2xl font-semibold ${reason ? 'line-through' : ''}`}>{worker.name}</h3>
            {reason ? <p className="text-sm text-[var(--sand)]">{reason}</p> : null}
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
            {worker.id !== PLAYER_ID ? (
              confirmFireId === worker.id ? (
                <div className="mt-3 border border-[var(--sand)] p-3 text-sm">
                  <p>
                    Fire {worker.name}? Severance {formatMoney(severanceCost(worker))} ({FIRING_SEVERANCE_DAYS} days'
                    wages). Remaining crew lose {FIRING_MORALE_HIT} morale.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="bg-[var(--machine-orange)] px-3 py-1 font-semibold"
                      onClick={() => {
                        onFire(worker.id);
                        setConfirmFireId(null);
                      }}
                    >
                      Confirm fire
                    </button>
                    <button type="button" className="border border-[var(--sand)] px-3 py-1" onClick={() => setConfirmFireId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canFireWorker(state, worker.id).ok}
                  onClick={() => setConfirmFireId(worker.id)}
                  className="mt-2 border border-[var(--sand)] px-3 py-1"
                >
                  Fire
                </button>
              )
            ) : null}
          </section>
          );
        })}
      </div>

      <h2 className="mt-10 font-condensed text-3xl">Volunteer</h2>
      {state.volunteerDismissed || !state.workers.some((worker) => worker.isVolunteer) ? (
        <p className="mt-2 text-[var(--sand)]">Asked not to come back.</p>
      ) : (
      <>
      {(() => {
        const volunteer = state.workers.find((worker) => worker.isVolunteer);
        const reason = volunteer ? workerAbsenceReason(state, volunteer) : null;
        return (
          <>
            <p className={`mt-2 ${reason ? 'line-through' : ''}`}>{volunteer?.name ?? 'Volunteer'}</p>
            {reason ? <p className="text-sm text-[var(--sand)]">{reason}</p> : null}
          </>
        );
      })()}
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
            className={`border border-[var(--sand)] px-3 py-1 disabled:opacity-40 ${
              weekday === (state.volunteerWeekday ?? VOLUNTEER_DEFAULT_WEEKDAY)
                ? 'bg-[var(--machine-orange)]'
                : ''
            }`}
          >
            Day {weekday}
          </button>
        ))}
      </div>
      {confirmVolunteerGone ? (
        <div className="mt-3 border border-[var(--sand)] p-3 text-sm">
          <p>Ask the volunteer not to come back? No cost. They will not return.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="bg-[var(--machine-orange)] px-3 py-1 font-semibold"
              onClick={() => {
                onDismissVolunteer();
                setConfirmVolunteerGone(false);
              }}
            >
              Confirm
            </button>
            <button type="button" className="border border-[var(--sand)] px-3 py-1" onClick={() => setConfirmVolunteerGone(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="mt-3 border border-[var(--sand)] px-3 py-1" onClick={() => setConfirmVolunteerGone(true)}>
          Don&apos;t come back
        </button>
      )}
      </>
      )}
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
