import { FORECAST_FUEL_LOOKBACK_DAYS } from '../data/constants.js';
import { formatMoney } from '../engine/format.js';
import { seasonCashForecast } from '../engine/forecast.js';

function Line({ label, amount, note }) {
  return (
    <p className="flex justify-between gap-4 text-sm">
      <span>
        {label}
        {note ? <span className="text-[var(--sand)]"> · {note}</span> : null}
      </span>
      <span>{formatMoney(amount)}</span>
    </p>
  );
}

export default function CashForecast({ state }) {
  const forecast = seasonCashForecast(state);
  return (
    <section className="mt-8">
      <h2 className="font-condensed text-3xl">Forecast</h2>
      {forecast.insolventDay != null ? (
        <h3 className="mt-2 text-xl font-semibold text-[var(--machine-orange)]">
          Goes negative on day {forecast.insolventDay}
        </h3>
      ) : null}

      <h3 className="mt-4 text-lg font-semibold">Cash now</h3>
      <p className="mt-1">{formatMoney(forecast.cashNow)}</p>

      <h3 className="mt-4 text-lg font-semibold">Committed outgoings to season end</h3>
      <div className="mt-2 space-y-1">
        {forecast.wages.length ? (
          forecast.wages.map((line) => (
            <Line
              key={line.id}
              label={line.label}
              note={`${line.days} day${line.days === 1 ? '' : 's'} × ${formatMoney(line.daily)}`}
              amount={line.amount}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--sand)]">No paid wages.</p>
        )}
        {forecast.leases.length ? (
          forecast.leases.map((line) => <Line key={line.id} label={`Lease · ${line.label}`} amount={line.amount} />)
        ) : (
          <p className="text-sm text-[var(--sand)]">No leases.</p>
        )}
        {forecast.dosing ? (
          <Line
            label={forecast.dosing.label}
            note={`${forecast.dosing.days} treatment${forecast.dosing.days === 1 ? '' : 's'} to season end`}
            amount={forecast.dosing.amount}
          />
        ) : (
          <p className="text-sm text-[var(--sand)]">No pond dose due this season.</p>
        )}
        {forecast.deliveries.length ? (
          forecast.deliveries.map((line) => (
            <Line
              key={line.id}
              label={line.label}
              note={`arrives day ${line.arrivesDay} · prepaid`}
              amount={line.amount}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--sand)]">No scheduled deliveries.</p>
        )}
        {forecast.loan ? (
          <Line
            label="Loan repayment"
            note={`${forecast.loan.dueSeason} ${forecast.loan.dueYear}`}
            amount={forecast.loan.amount}
          />
        ) : (
          <p className="text-sm text-[var(--sand)]">No loan due.</p>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold">Projected fuel spend</h3>
      <p className="mt-1">
        {formatMoney(forecast.fuel)}
        <span className="ml-2 text-sm text-[var(--sand)]">
          last {FORECAST_FUEL_LOOKBACK_DAYS} days, extrapolated
        </span>
      </p>

      <h3 className="mt-4 text-lg font-semibold">Expected grant</h3>
      <p className="mt-1">
        {formatMoney(forecast.grant)}
        <span className="ml-2 text-sm text-[var(--sand)]">estimate · moves with satisfaction</span>
      </p>

      <h3 className="mt-4 text-lg font-semibold">Projected closing balance</h3>
      <p className="mt-1 font-semibold">{formatMoney(forecast.closing)}</p>
    </section>
  );
}
