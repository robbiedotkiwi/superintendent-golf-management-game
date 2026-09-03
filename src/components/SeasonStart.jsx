import { TOURNAMENT_PREP_DAYS, TOURNAMENT_SEASON_MAX, TOURNAMENT_WINTER_MAX } from '../data/constants.js';
import { maxTournamentsForSeason, scheduleTournamentDays, seasonStartDay } from '../engine/tournament.js';

export default function SeasonStart({ state, onConfirm }) {
  const winter = state.season === 'winter';
  const max = maxTournamentsForSeason(state.season);
  const options = Array.from({ length: max + 1 }, (_, count) => count);
  const start = seasonStartDay(state.day);
  const preview = (count) => scheduleTournamentDays(start, count, state.season);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--soil)]/85 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-auto border-4 border-[var(--sand)] bg-[var(--soil)] p-6 text-[var(--paint)]">
        <h2 className="font-condensed text-4xl font-bold">
          {state.season} tournaments
        </h2>
        <p className="mt-2 text-[var(--sand)]">
          Dates land in this season so you can plan the {TOURNAMENT_PREP_DAYS} days before.
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
                  {days.length === 0
                    ? 'Skip this season.'
                    : `Dates: ${days.map((day) => `day ${day}`).join(', ')}`}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
