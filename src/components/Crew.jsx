import {
  CREW_TAB_DEFAULT,
  CREW_TAB_HIRE,
  CREW_TAB_LABELS,
  CREW_TAB_ROSTER,
  CREW_TABS,
  CASUAL_MAX_DAYS_PER_WEEK,
  CASUAL_WAGE_MULT,
  DAYS_PER_WEEK,
  FIRING_MORALE_HIT,
  FIRING_SEVERANCE_DAYS,
  PLAYER_ID,
  TRAINING_COST,
  TRAINING_DAYS,
  VOLUNTEER_DEFAULT_WEEKDAY,
} from '../data/constants.js';
import {
  STANDARD_WORK_DAYS,
  STAFF_TIER_LABELS,
  VOLUNTEER_REWARD_SATISFACTION,
  VOLUNTEER_SURFACES,
  VOLUNTEER_WEEKLY_HOURS,
} from '../data/config.js';
import { useState } from 'react';
import { canFireWorker, dayOfWeek, severanceCost } from '../engine/staff.js';
import { workerAbsenceReason } from '../engine/availability.js';
import { formatMoney } from '../engine/format.js';
import { canBookCasual, casualDaysBooked, weekDays, weekdayLabel } from '../engine/week.js';
import { daysScheduledThisWeek, volunteerHoursFor } from '../engine/staffMorale.js';
import SectionTabs from './SectionTabs.jsx';

function MoraleBar({ morale }) {
  const value = Math.min(100, Math.max(0, Number(morale) || 0));
  return (
    <div className="mt-1 h-2 w-full border border-[var(--sand)]" data-morale-bar>
      <div className="h-full bg-[var(--machine-orange)]" style={{ width: `${value}%` }} />
    </div>
  );
}

function StaffBadges({ worker }) {
  const flags = [];
  if (worker.sprayCertified) flags.push('Spray ticket');
  if (worker.isMechanic) flags.push('Mechanic');
  return (
    <p className="text-sm text-[var(--sand)]">
      {STAFF_TIER_LABELS[worker.tier] ?? worker.tier ?? 'Unskilled'} · Rating {Math.round(worker.rating ?? 0)}
      {flags.length ? ` · ${flags.join(' · ')}` : ''}
    </p>
  );
}

export function LeaveRequests({ state, onApprove, onDecline }) {
  const pending = (state.leaveRequests ?? []).filter((item) => !item.resolved);
  if (!pending.length || !onApprove) return null;
  return (
    <div className="space-y-2 p-3" data-leave-requests>
      {pending.map((request) => (
        <section key={request.id} className="border border-[var(--machine-orange)] bg-[var(--soil)] p-3 text-sm">
          <p>
            {request.name} asked for {request.days} days of leave. Approve ({request.approveMorale >= 0 ? '+' : ''}
            {request.approveMorale} morale) or decline ({request.declineMorale} morale).
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="bg-[var(--machine-orange)] px-3 py-1 font-semibold"
              onClick={() => onApprove(request.id)}
            >
              Approve
            </button>
            <button type="button" className="border border-[var(--sand)] px-3 py-1" onClick={() => onDecline(request.id)}>
              Decline
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Crew({
  state,
  tab = CREW_TAB_DEFAULT,
  onTab,
  onBack,
  onHire,
  onTrain,
  onFire,
  onApproveLeave,
  onDeclineLeave,
  onDismissVolunteer,
  onVolunteerDay,
  onEarlyStart,
  onBookCasual,
  onUnbookCasual,
}) {
  const paid = state.workers.filter((worker) => !worker.isVolunteer && !worker.isCasual);
  const [confirmFireId, setConfirmFireId] = useState(null);
  const [confirmVolunteerGone, setConfirmVolunteerGone] = useState(false);
  const volunteerHours = volunteerHoursFor(state);
  const volunteerReward = (state.satisfaction ?? 0) >= VOLUNTEER_REWARD_SATISFACTION;

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
      <LeaveRequests state={state} onApprove={onApproveLeave} onDecline={onDeclineLeave} />
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
          const scheduled = daysScheduledThisWeek(state, worker.id);
          const overStandard = scheduled > STANDARD_WORK_DAYS;
          return (
          <section key={worker.id} className="border-2 border-[var(--sand)] p-4">
            <h3 className={`text-2xl font-semibold ${reason ? 'line-through' : ''}`}>{worker.name}</h3>
            {reason ? <p className="text-sm text-[var(--sand)]">{reason}</p> : null}
            <StaffBadges worker={worker} />
            <p>
              Morale {Math.round(worker.morale)} · Wage {formatMoney(worker.wage)}/day
            </p>
            <MoraleBar morale={worker.morale} />
            <p className={`mt-2 text-sm ${overStandard ? 'text-red-400' : 'text-[var(--sand)]'}`} data-days-scheduled>
              {scheduled} day{scheduled === 1 ? '' : 's'} scheduled this week
              {overStandard ? ` — past ${STANDARD_WORK_DAYS} hits morale` : ''}
            </p>
            <p className="text-sm text-[var(--sand)]">
              {worker.trainingUntilDay && state.day < worker.trainingUntilDay
                ? `Away on training until day ${worker.trainingUntilDay}`
                : worker.leaveUntilDay && state.day < worker.leaveUntilDay
                  ? `On leave until day ${worker.leaveUntilDay}`
                  : worker.sickUntilDay && state.day < worker.sickUntilDay
                    ? `Off sick until day ${worker.sickUntilDay}`
                    : `${worker.minutesToday} min today`}
            </p>
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
            <p className="mt-2">
              {volunteerHours} hours {volunteerReward ? 'on two days' : 'one day'} each week on{' '}
              {VOLUNTEER_SURFACES.join(', ')}. Assign to general duties and bunkers.
              {volunteerReward
                ? ' Club satisfaction unlocked a second volunteer day.'
                : ` ${VOLUNTEER_WEEKLY_HOURS} hours weekly until satisfaction hits ${VOLUNTEER_REWARD_SATISFACTION}.`}
            </p>
          </>
        );
      })()}
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

      <h2 className="mt-10 font-condensed text-3xl">Casuals</h2>
      <p className="mt-2 text-sm text-[var(--sand)]">
        Book up to {CASUAL_MAX_DAYS_PER_WEEK} days this week at {CASUAL_WAGE_MULT}× a regular wage. They only cost the days they work.
      </p>
      <div className="mt-3 space-y-4">
        {(state.casualPool ?? []).map((casual) => {
          const booked = casualDaysBooked(state, casual.id);
          return (
            <section key={casual.id} className="border-2 border-[var(--sand)] p-4">
              <h3 className="text-2xl font-semibold">{casual.name}</h3>
              <StaffBadges worker={casual} />
              <p>
                {formatMoney(casual.wage)}/day
                {casual.ownMower ? ' · brings own mower' : ''}
              </p>
              {casual.ownMower ? (
                <p className="text-sm text-[var(--sand)]">Fairways, rough and surrounds only. Does not take one of your machines.</p>
              ) : null}
              <p className="text-sm text-[var(--sand)]">
                {booked.length ? `Booked ${booked.map((day) => weekdayLabel(day)).join(', ')}` : 'Not booked this week'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekDays(state.day).map((day) => {
                  const on = booked.includes(day);
                  const check = on ? { ok: true } : canBookCasual(state, casual.id, day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!on && !check.ok}
                      title={check.ok ? undefined : check.reason}
                      onClick={() => (on ? onUnbookCasual(casual.id, day) : onBookCasual(casual.id, day))}
                      className={`border px-3 py-1 disabled:opacity-40 ${
                        on ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]' : 'border-[var(--sand)]'
                      }`}
                    >
                      {weekdayLabel(day)}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
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
            <StaffBadges worker={candidate} />
            <p>
              {formatMoney(candidate.wage)}/day
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
