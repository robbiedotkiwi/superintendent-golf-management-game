import { qualityColor } from '../engine/color.js';
import { formatMoney } from '../engine/format.js';
import { pondCapacity, pondPercent } from '../engine/irrigation.js';
import { constructionMinutes } from '../engine/projects.js';

const SIZE_CLASS = {
  condition: 'text-6xl',
  primary: 'text-4xl',
  secondary: 'text-2xl',
  tertiary: 'text-lg',
};

function Stat({ label, value, hint, size = 'secondary', valueStyle }) {
  return (
    <div>
      <dt className="text-sm text-[var(--sand)]">{label}</dt>
      <dd className={`font-condensed font-bold leading-none ${SIZE_CLASS[size]}`} style={valueStyle}>
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs text-[var(--sand)]">{hint}</p> : null}
    </div>
  );
}

export default function Hud({ state, condition }) {
  const capacity = pondCapacity(state);
  return (
    <div className="flex shrink-0 flex-wrap items-end gap-x-10 gap-y-3 px-4 py-2">
      <div className="flex items-end gap-6">
        <Stat label="Day" value={state.day} size="primary" />
        <Stat label="Season" value={`${state.season} · ${state.year}`} size="primary" />
        <Stat
          label="Condition"
          value={condition}
          size="condition"
          valueStyle={{ color: qualityColor(condition) }}
        />
      </div>
      <div className="flex items-end gap-6">
        <Stat label="Cash" value={formatMoney(state.cash)} size="secondary" />
        <Stat label="Satisfaction" value={Math.round(state.satisfaction)} size="secondary" />
      </div>
      <Stat
        label="Pond"
        value={`${Math.round(state.pond.volume)} m³`}
        hint={`${Math.round(pondPercent(state.pond.volume, capacity))}% of ${capacity} · health ${Math.round(state.pond.health)}`}
        size="tertiary"
      />
      {state.projects?.length ? (
        <Stat
          label="Site work"
          value={`${constructionMinutes(state)} min`}
          hint={state.projects.map((item) => `finishes day ${item.dueDay}`).join(' · ')}
          size="tertiary"
        />
      ) : null}
    </div>
  );
}
