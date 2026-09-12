import { PASS_AREAS, PASSES_REQUIRED_PER_WEEK } from '../data/config.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { gradeLetter, gradeTrend } from '../engine/grades.js';
import { bestMachineCap } from '../engine/passes.js';
import { projectedWeeklyGrade } from '../engine/weekPasses.js';

function TrendArrow({ trend }) {
  if (trend === 'up') return <span aria-label="up">↑</span>;
  if (trend === 'down') return <span aria-label="down">↓</span>;
  return <span aria-label="flat">→</span>;
}

function PassPips({ achieved, required, dailyCapped, wastedHours }) {
  const pips = [];
  for (let i = 0; i < required; i += 1) {
    const filled = achieved >= i + 1;
    const partial = !filled && achieved > i;
    pips.push(
      <span
        key={i}
        data-pip={i}
        data-filled={filled || undefined}
        data-partial={partial || undefined}
        data-capped={dailyCapped && filled ? true : undefined}
        className={`inline-block h-2.5 w-2.5 rounded-full border ${
          filled
            ? dailyCapped
              ? 'border-[var(--sand)] bg-[var(--sand)] line-through opacity-50'
              : 'border-[var(--machine-orange)] bg-[var(--machine-orange)]'
            : partial
              ? 'border-[var(--machine-orange)] bg-[var(--machine-orange)]/40'
              : 'border-[var(--sand)]/50 bg-transparent'
        }`}
      />,
    );
  }
  return (
    <span className="ml-1 inline-flex items-center gap-0.5" data-pass-pips>
      {pips}
      {wastedHours > 0.05 ? (
        <span className="ml-1 text-[10px] text-red-400" data-wasted-hours>
          {wastedHours.toFixed(1)}h wasted
        </span>
      ) : null}
    </span>
  );
}

export default function GradeStrip({ state }) {
  const projected = projectedWeeklyGrade(state);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-grade-strip>
      {PASS_AREAS.map((area) => {
        const quality = state.areaQuality?.[area];
        const letter = gradeLetter(quality);
        const prev = state.areaQualityPrev?.[area] ?? quality;
        const trend = gradeTrend(prev, quality);
        const cap = bestMachineCap(state, area);
        const week = projected[area];
        const required = PASSES_REQUIRED_PER_WEEK[area];
        return (
          <div key={area} className="border border-[var(--sand)]/40 p-2" data-area-grade={area}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-[var(--sand)]">{SURFACE_LABELS[area] ?? area}</span>
              <span className="font-condensed text-2xl font-bold leading-none" data-letter={area}>
                {letter} <TrendArrow trend={trend} />
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--sand)]">
              {week?.achieved?.toFixed?.(2) ?? week?.achieved}/{required} passes
              <PassPips
                achieved={week?.achieved ?? 0}
                required={required}
                dailyCapped={week?.dailyCapped}
                wastedHours={week?.wastedHours ?? 0}
              />
            </div>
            {week?.cappedByMachine || cap ? (
              <p className="mt-1 text-[10px] text-[var(--machine-orange)]" data-machine-cap={area}>
                {week?.cappedByMachine
                  ? `Capped by ${cap?.machine?.model ?? 'machine'} (${cap?.letter})`
                  : `Machine cap ${cap?.letter ?? '—'}`}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
