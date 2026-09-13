import {
  CAPEX_STATUS_GRANTED,
  CAPEX_STATUS_MISSED,
  CAPEX_STATUS_PENDING,
  CAPEX_STATUS_RELEASED,
  CORING_SEASONS,
  SEASON_1_CAPEX_WEEK,
} from '../data/config.js';
import { formatMoney } from '../engine/format.js';
import { golferNumbers, gmRequiredGrade, meanPassQuality, monthlyBudgetFor, monthsUntilNextCapex } from '../engine/economy.js';
import { weekOfSeason } from '../engine/calendar.js';
import { coringWindowOk, sprayWindowOk } from '../engine/support.js';
import { daysUntilNextTournament, nextTournament } from '../engine/tournament.js';
import { gradeLetter } from '../engine/grades.js';

function capexLabel(status) {
  if (status === CAPEX_STATUS_RELEASED) return 'Season 1 released';
  if (status === CAPEX_STATUS_GRANTED) return 'Season grant posted';
  if (status === CAPEX_STATUS_MISSED) return 'Season 1 missed';
  if (status === CAPEX_STATUS_PENDING) return `Week ${SEASON_1_CAPEX_WEEK} GM checkpoint`;
  return status ?? 'pending';
}

export default function SeasonBar({ state }) {
  const budget = monthlyBudgetFor(state);
  const golfers = golferNumbers(state);
  const required = gmRequiredGrade(state);
  const grade = meanPassQuality(state);
  const months = monthsUntilNextCapex(state);
  const tournament = nextTournament(state);
  const untilTournament = daysUntilNextTournament(state);
  const spray = sprayWindowOk(state);
  const coring = coringWindowOk(state);
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border border-[var(--sand)]/40 p-2 text-xs" data-season-bar>
      <div>
        <div className="text-[var(--sand)]">Capex</div>
        <div className="font-semibold">{formatMoney(state.capex ?? 0)}</div>
        <div className="text-[var(--sand)]">{capexLabel(state.capexStatus)}</div>
      </div>
      <div>
        <div className="text-[var(--sand)]">Next capex</div>
        <div className="font-semibold">{months} month{months === 1 ? '' : 's'}</div>
        <div className="text-[var(--sand)]">Season week {weekOfSeason(state.day)}</div>
      </div>
      <div>
        <div className="text-[var(--sand)]">Monthly budget</div>
        <div className="font-semibold">{formatMoney(budget)}</div>
        <div className="text-[var(--sand)]">{golfers} golfers</div>
      </div>
      <div>
        <div className="text-[var(--sand)]">GM target</div>
        <div className="font-semibold">{gradeLetter(required)} ({Math.round(required)})</div>
        <div className="text-[var(--sand)]">Now {gradeLetter(grade)}</div>
      </div>
      <div>
        <div className="text-[var(--sand)]">Tournament</div>
        <div className="font-semibold">
          {tournament ? `Day ${tournament.day}` : 'None booked'}
        </div>
        <div className="text-[var(--sand)]">{untilTournament != null ? `${untilTournament} days` : '—'}</div>
      </div>
      <div>
        <div className="text-[var(--sand)]">Windows</div>
        <div className="font-semibold">{spray.ok ? 'Spray open' : 'Spray shut'}</div>
        <div className="text-[var(--sand)]">
          Coring {coring.ok ? 'open' : `closed (${CORING_SEASONS.join(', ')})`}
        </div>
      </div>
    </div>
  );
}
