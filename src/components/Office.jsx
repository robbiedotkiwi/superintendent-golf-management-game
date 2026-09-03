import {
  AUTO_PICKER_COST,
  EVENT_ACCEPT_STANDING,
  EVENT_DECLINE_STANDING,
  EVENT_MAIL_KIND,
  EVENT_RESPONSE_ACCEPT,
  EVENT_RESPONSE_DECLINE,
  GM_MEETING_MINUTES,
  GM_MEETING_SKIP_STANDING,
  GM_TOURNAMENT_DECLINE_STANDING,
  LOAN_INTEREST,
  LOAN_LIMIT_MULTIPLIER,
  OFFICE_TAB_INBOX,
  OFFICE_TAB_LABELS,
  OFFICE_TAB_MONEY,
  OFFICE_TAB_PROJECTS,
  OFFICE_TABS,
} from '../data/constants.js';
import { canTakeLoan, maxLoan } from '../engine/budget.js';
import { unreadCount } from '../engine/mail.js';
import { formatMoney } from '../engine/format.js';
import { invitationById } from '../engine/events.js';
import { canPlanTask } from '../engine/gameState.js';
import { daysUntilNextTournament, nextTournament } from '../engine/tournament.js';
import SeasonStart from './SeasonStart.jsx';
import SectionTabs from './SectionTabs.jsx';
import {
  absorbNote,
  alreadyBuilt,
  canBuyAutoPicker,
  canStartProject,
  constructionMinutes,
  PROJECTS,
  projectSpec,
} from '../engine/projects.js';

export default function Office({
  state,
  tab = OFFICE_TAB_INBOX,
  onTab,
  onBack,
  onSnap,
  onLoan,
  onRead,
  onPlanMeeting,
  onRemoveMeeting,
  onPlanBalls,
  onRemoveBalls,
  onDeclineTournament,
  onAcceptEvent,
  onDeclineEvent,
  onSetTournaments,
  onStartProject,
  onBuyPicker,
}) {
  const unread = unreadCount(state);
  const cap = maxLoan(state.lastSeasonRevenue);
  const loanCheck = canTakeLoan(state, cap);
  const meeting = state.plannedTasks.find((item) => item.taskId === 'gmMeeting');
  const meetingCheck = canPlanTask(state, 'gmMeeting');
  const balls = state.plannedTasks.find((item) => item.taskId === 'pickBalls');
  const ballsCheck = canPlanTask(state, 'pickBalls');
  const until = daysUntilNextTournament(state);
  const upcoming = nextTournament(state);
  const labels = {
    ...OFFICE_TAB_LABELS,
    [OFFICE_TAB_INBOX]: unread ? `Inbox (${unread})` : OFFICE_TAB_LABELS[OFFICE_TAB_INBOX],
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--soil)] px-6 py-5 text-[var(--paint)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-condensed text-5xl font-bold">Office</h1>
        <button type="button" onClick={onBack} className="border border-[var(--sand)] px-4 py-2">
          Back to the course
        </button>
      </div>
      <SectionTabs tabs={OFFICE_TABS} labels={labels} value={tab} onChange={onTab} />

      <p>
        Maintenance {formatMoney(state.maintenanceBudget)} · Capital {formatMoney(state.capitalBudget)} · Cash {formatMoney(state.cash)}
      </p>
      <p className="mt-1 text-[var(--sand)]">
        {state.holes}-hole course · Satisfaction {Math.round(state.satisfaction)} · GM standing {Math.round(state.gmStanding)}
      </p>
      <p className="mt-1 text-sm text-[var(--sand)]">
        {upcoming == null
          ? 'No tournament booked'
          : until === 0
            ? 'Tournament today'
            : `Tournament in ${until} day${until === 1 ? '' : 's'} (day ${upcoming.day})`}
      </p>

      {tab === OFFICE_TAB_MONEY ? (
        <>
          <h2 className="mt-8 font-condensed text-3xl">Raise cash</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={Boolean(state.snappedToday)}
              onClick={onSnap}
              className="bg-[var(--machine-orange)] px-4 py-2 font-semibold disabled:opacity-40"
            >
              {state.snappedToday ? 'Snap tournament already called' : 'Call a snap tournament'}
            </button>
            <button
              type="button"
              disabled={!loanCheck.ok}
              title={loanCheck.reason}
              onClick={() => onLoan(cap)}
              className="border border-[var(--sand)] px-4 py-2 disabled:opacity-40"
            >
              Loan {formatMoney(cap)} at {LOAN_INTEREST * 100}% (max {LOAN_LIMIT_MULTIPLIER}× last season)
            </button>
          </div>
          {state.loan ? (
            <p className="mt-2 text-sm">
              Loan on the books. Repay {formatMoney(state.loan.repay)} from {state.loan.dueSeason} year {state.loan.dueYear} maintenance.
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--sand)]">Last season revenue {formatMoney(state.lastSeasonRevenue ?? 0)}.</p>
          )}
          {state.lastSnap ? (
            <p className="mt-2 text-sm">
              Last snap: {state.lastSnap.band} · score {Math.round(state.lastSnap.score)} · paid {formatMoney(state.lastSnap.pay)}
            </p>
          ) : null}
        </>
      ) : null}

      {tab === OFFICE_TAB_PROJECTS ? (
        <>
          <h2 className="mt-8 font-condensed text-3xl">Projects</h2>
          <p className="mt-2 text-sm text-[var(--sand)]">{absorbNote(state.season)}</p>
          {(state.projects ?? []).map((item) => {
            const spec = projectSpec(item.id);
            return (
              <p key={item.id} className="mt-2">
                {spec?.name ?? item.id} underway · finishes day {item.dueDay} · site work{' '}
                {constructionMinutes({ ...state, projects: [item] })} min today
              </p>
            );
          })}
          <div className="mt-3 space-y-3">
            {Object.values(PROJECTS).map((spec) => {
              const check = canStartProject(state, spec.id);
              if (check.hidden) return null;
              if (alreadyBuilt(state, spec.id) || (state.projects ?? []).some((item) => item.id === spec.id)) {
                return alreadyBuilt(state, spec.id) ? (
                  <p key={spec.id} className="text-sm text-[var(--sand)]">
                    {spec.name} is done.
                  </p>
                ) : null;
              }
              return (
                <button
                  key={spec.id}
                  type="button"
                  disabled={!check.ok}
                  title={check.reason}
                  onClick={() => onStartProject(spec.id)}
                  className="block border border-[var(--sand)] px-4 py-2 text-left disabled:opacity-40"
                >
                  <div className="font-semibold">
                    {spec.name} · {formatMoney(spec.cost)} capital · {spec.days} days
                  </div>
                  <div className="text-sm text-[var(--sand)]">
                    Completes day {state.day + spec.days}. {absorbNote(state.season)}
                  </div>
                  {!check.ok ? <div className="text-sm">{check.reason}</div> : null}
                </button>
              );
            })}
          </div>
          {state.hasDrivingRange && !state.hasAutoPicker ? (
            <button
              type="button"
              disabled={!canBuyAutoPicker(state).ok}
              title={canBuyAutoPicker(state).reason}
              onClick={onBuyPicker}
              className="mt-3 border border-[var(--sand)] px-4 py-2 disabled:opacity-40"
            >
              Autonomous picker · {formatMoney(AUTO_PICKER_COST)} capital
            </button>
          ) : null}
          {state.hasAutoPicker ? <p className="mt-2 text-sm">Autonomous picker on the range.</p> : null}
          {state.hasDrivingRange ? (
            balls ? (
              <button type="button" onClick={onRemoveBalls} className="mt-3 border border-[var(--sand)] px-3 py-2">
                Ball pick planned · {balls.minutes} min
              </button>
            ) : (
              <button
                type="button"
                disabled={!ballsCheck.ok}
                title={ballsCheck.ok ? undefined : ballsCheck.reason}
                onClick={onPlanBalls}
                className="mt-3 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
              >
                {ballsCheck.ok ? 'Pick range balls' : ballsCheck.reason}
              </button>
            )
          ) : null}
        </>
      ) : null}

      {tab === OFFICE_TAB_INBOX ? (
        <>
          <h2 className="mt-8 font-condensed text-3xl">GM meeting</h2>
          <p className="mt-2 text-sm text-[var(--sand)]">
            Every week, {GM_MEETING_MINUTES} min of your time. Skip and standing drops {GM_MEETING_SKIP_STANDING}.
          </p>
          {meeting ? (
            <button type="button" onClick={onRemoveMeeting} className="mt-3 border border-[var(--sand)] px-3 py-2">
              Meeting planned · {meeting.minutes} min
            </button>
          ) : (
            <button
              type="button"
              disabled={!meetingCheck.ok}
              title={meetingCheck.reason}
              onClick={onPlanMeeting}
              className="mt-3 border border-[var(--sand)] px-3 py-2 disabled:opacity-40"
            >
              {meetingCheck.ok ? `Sit down with the GM · ${GM_MEETING_MINUTES} min` : meetingCheck.reason}
            </button>
          )}

          <h2 className="mt-8 font-condensed text-3xl">Inbox {unread ? `(${unread} unread)` : ''}</h2>
          <div className="mt-3 space-y-3">
            {(state.inbox ?? []).length === 0 ? <p>Empty. Enjoy it.</p> : null}
            {[...(state.inbox ?? [])].reverse().map((item) => (
              <section key={item.id} className="border border-[var(--sand)] p-4">
                <h3 className="text-xl font-semibold">
                  {item.subject}
                  {!item.read ? ' · unread' : ''}
                </h3>
                <p className="text-sm text-[var(--sand)]">
                  {item.from} · day {item.day}
                </p>
                <p className="mt-2">{item.body}</p>
                {item.deadlineDay ? <p className="mt-1 text-sm text-[var(--sand)]">Deadline: day {item.deadlineDay}</p> : null}
                {item.kind === 'tournamentRequest' && state.pendingTournamentSetup ? (
                  <SeasonStart state={state} onConfirm={onSetTournaments} />
                ) : null}
                {item.kind === 'tournamentRequest' && state.gmTournamentRequestPending ? (
                  <button
                    type="button"
                    onClick={onDeclineTournament}
                    className="mt-3 mr-2 border border-[var(--sand)] px-3 py-1"
                  >
                    Decline (−{GM_TOURNAMENT_DECLINE_STANDING} standing)
                  </button>
                ) : null}
                {item.kind === EVENT_MAIL_KIND ? (
                  <EventInviteActions
                    state={state}
                    item={item}
                    onAccept={onAcceptEvent}
                    onDecline={onDeclineEvent}
                  />
                ) : null}
                {item.read ? null : (
                  <button type="button" onClick={() => onRead(item.id)} className="mt-3 border border-[var(--sand)] px-3 py-1">
                    Mark read
                  </button>
                )}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function EventInviteActions({ state, item, onAccept, onDecline }) {
  const invite = invitationById(state, item.inviteId);
  if (!invite) return null;
  if (invite.response === EVENT_RESPONSE_ACCEPT) {
    return <p className="mt-3 text-sm">Accepted. Standing +{EVENT_ACCEPT_STANDING}.</p>;
  }
  if (invite.response === EVENT_RESPONSE_DECLINE) {
    return <p className="mt-3 text-sm">Declined. Standing −{EVENT_DECLINE_STANDING}.</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onAccept(invite.id)}
        className="bg-[var(--machine-orange)] px-3 py-1 font-semibold"
      >
        Accept (+{EVENT_ACCEPT_STANDING} standing)
      </button>
      <button
        type="button"
        onClick={() => onDecline(invite.id)}
        className="border border-[var(--sand)] px-3 py-1"
      >
        Decline (−{EVENT_DECLINE_STANDING} standing)
      </button>
    </div>
  );
}
