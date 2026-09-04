import { TOURNAMENT_PREP_DAYS, TOURNAMENT_SEASON_MAX, TOURNAMENT_WINTER_MAX } from '../data/constants.js';
import {
  comingSeason,
  comingSeasonStartDay,
  maxTournamentsForSeason,
  scheduleTournamentDays,
} from '../engine/tournament.js';

export default function SeasonStart({ state, onConfirm }) {
  const season = state.tournamentSetupSeason ?? comingSeason(state.day);
  const winter = season === 'winter';
  const max = maxTournamentsForSeason(season);
  const options = Array.from({ length: max + 1 }, (_, count) => count);
  const start = state.tournamentSetupStartDay ?? comingSeasonStartDay(state.day);
  const preview = (count) => scheduleTournamentDays(start, count, season);
  return (
    <section className="mt-4 border border-[var(--sand)] p-4">
      <h2 className="font-condensed text-4xl font-bold">{season} tournaments</h2>
      <p className="mt-2 text-[var(--sand)]">
        Dates land in {season} so you can plan the {TOURNAMENT_PREP_DAYS} days before.
        {state.tournamentSetupDeadline ? ` Deadline: day ${state.tournamentSetupDeadline}.` : ''}
        {winter
          ? ` Winter is optional and risky — rain on the day caps the result at Acceptable. At most ${TOURNAMENT_WINTER_MAX}.`
          : ` Up to ${TOURNAMENT_SEASON_MAX}.`}
      </p>
      <div className="mt-6 space-y-3">
        {options.map((count) => {
          const days = preview(count);
          return (
            <button
              key={count}
              type="button"
              onClick={() => onConfirm(count)}
              className="block w-full border border-[var(--sand)] px-4 py-3 text-left hover:bg-[var(--machine-orange)]"
            >
              <div className="font-condensed text-2xl font-bold">
                {count === 0 ? 'None' : `${count} tournament${count === 1 ? '' : 's'}`}
                {winter && count > 0 ? ' · risky' : ''}
              </div>
              <p className="text-sm text-[var(--sand)]">
                {days.length === 0 ? 'Skip this season.' : `Dates: ${days.map((day) => `day ${day}`).join(', ')}`}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
