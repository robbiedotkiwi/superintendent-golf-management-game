import { WEAR_MAX } from '../data/constants.js';
import { PASS_AREAS, WEAR_STEP_MARKS } from '../data/config.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { getMachine } from '../data/equipment.js';
import { ownedMachineList } from '../engine/equipment.js';
import {
  basePassHours,
  machineGradeCapLetter,
  machineAllowsArea,
  passClassOf,
  wearTimeDeltaHours,
  wearTimeMult,
} from '../engine/passes.js';

const MAX = WEAR_MAX;

export default function MachinePassPanel({ state }) {
  const machines = ownedMachineList(state).filter((machine) => passClassOf(machine));
  if (!machines.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2" data-machine-panel>
      {machines.map((machine) => {
        const wear = state.machineWear?.[machine.id] ?? 0;
        const pct = Math.min(MAX, Math.max(0, wear));
        return (
          <section key={machine.id} className="border border-[var(--sand)]/40 p-2 text-xs" data-machine-card={machine.id}>
            <h3 className="font-semibold">{machine.model ?? machine.name}</h3>
            <div className="mt-1 space-y-0.5 text-[var(--sand)]">
              {PASS_AREAS.map((area) => {
                if (!machineAllowsArea(machine, area)) return null;
                const base = basePassHours(passClassOf(machine), area);
                const delta = wearTimeDeltaHours(base, wear);
                const current = base + delta;
                const cap = machineGradeCapLetter(machine, area);
                return (
                  <div key={area} data-pass-time={`${machine.id}-${area}`}>
                    {SURFACE_LABELS[area]} {base} hr
                    {delta > 0.01 ? ` → ${current.toFixed(1)} hr` : ''}
                    {cap ? ` · cap ${cap}` : ''}
                  </div>
                );
              })}
            </div>
            <div className="relative mt-2 h-2 bg-[var(--paint)]/20" data-wear-bar={machine.id}>
              <div className="h-full bg-[var(--machine-orange)]" style={{ width: `${pct}%` }} />
              {WEAR_STEP_MARKS.map((mark) => (
                <span
                  key={mark}
                  className="absolute top-0 h-2 w-px bg-[var(--paint)]"
                  style={{ left: `${mark}%` }}
                  title={`${mark}% · ×${wearTimeMult(mark === 0 ? 0 : mark - 0.01)}`}
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-[var(--sand)]">Wear {Math.round(pct)}% · next step at {WEAR_STEP_MARKS.find((m) => m > pct) ?? MAX}%</p>
          </section>
        );
      })}
    </div>
  );
}
