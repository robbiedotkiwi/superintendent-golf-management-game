# Fixes — Round 6

Phases A to E, in order, each with a gate.

---

# Phase A — Stack the sidebar buttons

The four buttons currently sit as a tight group. Give each one its own block, stacked vertically with clear separation, and a one-line description underneath the label so a new player knows what is behind each door.

| Button | Description |
|---|---|
| Turf | Surfaces, mowing, irrigation |
| Office | Mail, money, tournaments |
| Crew | Roster, hiring, training |
| Shed | Fleet, service, buying |

Each block is a full-width target with the label in the heading weight and the description small underneath. Keep visible separation between them — they are four destinations, not a segmented control. Badges and dots stay where they are.

The sidebar must still fit at `SIDEBAR_FIT_HEIGHT` without scrolling. If the descriptions push it over, tighten the weather line rather than dropping them.

**Gate**

1. The four buttons are stacked vertically with visible separation.
2. Each shows its description under the label.
3. Badges and dots still render correctly on each block.
4. The sidebar fits at 720px with no scrolling, checked on a day 40 save.

---

# Phase B — Turf: scheduling, mowers, and merging Other

Three problems in one section.

## Mowing has no way to plan a cut

The Mowing tab sets height, pattern and angle but there is no way to actually put the cut in the day. Add a **Plan this cut** action to every surface row on the Mowing tab, showing the resulting minutes, disabled with the usual reason when it will not fit.

Add the same action to every row on the **Summary** tab, so the overview is also the fastest way to plan a day.

## Match last mowing

Add a **Match last mowing** quick-set to the Summary tab. It sets every surface's height, pattern and angle back to whatever was used at that surface's most recent cut.

This is a settings action, not a planning action — it does not add tasks. Store `heightAtLastCut`, `patternAtLastCut` and `angleAtLastCut` per surface when a cut resolves. Surfaces never cut fall back to their defaults and are skipped.

The existing height-change penalty still applies where a height actually moves.

## Choosing the mower

Every surface shows which machine will do the work. **Auto-picks the best available permitted machine** — highest ceiling first, then lowest time multiplier — and can be overridden from a dropdown listing every permitted machine with its ceiling, time multiplier and remaining minutes. Machines that cannot cut that surface are not listed.

An override is a **persistent per-surface preference**. If the chosen machine is unavailable that day, fall back to auto and say so rather than blocking the task.

Show the chosen machine on the Mowing tab, on the Summary row, and in the plan list.

## Merge Bunkers and Pond

Bunkers and Pond do not each need a tab. Merge them into a single **Other** tab holding both, one under the other.

Turf tabs become: **Summary · Mowing · Irrigation · Other · Presets**.

**Gate**

1. A cut can be planned from both the Mowing tab and the Summary tab, without touching the map.
2. Match last mowing restores each surface's last-used height, pattern and angle, and does not plan anything.
3. A surface never yet cut is left alone by Match last mowing.
4. Every surface shows its assigned machine, auto-picked sensibly.
5. The override dropdown lists only permitted machines and persists across days.
6. An unavailable override falls back to auto with the reason stated.
7. Turf has five tabs, with Bunkers and Pond both inside Other.

---

# Phase C — The starting fleet, properly

Round 4 specified two tired machines and shipped a single push rotary instead, recorded in `DECISIONS.md` as:

> Faster starters would break the Phase 1 `planned minutes === mowingMinutes` equality.

**Fix the test, not the fleet.** That equality assumed no machine multiplier. Update it to account for the machine time multiplier and condition penalty, then ship the intended fleet.

## Starting machines

| Machine | Surfaces | Ceiling | Time mult | Condition |
|---|---|---|---|---|
| Toro Greensmaster 1000 (walk-behind reel) | Greens, tees | 68 | 1.0x | 28 |
| Toro Reelmaster 3100 (ride-on fairway) | Fairways, rough | 62 | 0.75x | 24 |

Both are old, both are worn out, and both are recognisably real machines. The push rotary is no longer owned at start — it stays in the shop as a cheap backup for when something breaks.

## Rebalance

The condition penalty from Round 4 means these run roughly 36% slower than the same machines in good order. Retune `BASE_MINUTES` so the full default day lands at **roughly 140% of a single 480-minute day**, and print the resulting total in the gate output.

**Gate**

1. A new game starts with exactly those two machines at those conditions.
2. The Phase 1 duration test is updated to account for machine multipliers and passes.
3. Fairways and rough can be cut on day 1 in a credible time.
4. The default full-day total is printed and sits near 140% of 480.
5. The push rotary is purchasable but not owned at start.

---

# Phase D — Shed presentation

## Branding

Every machine in the game carries a manufacturer and a model name. No machine is described only by its function.

- **Toro** — greens reels, fairway units, premium ride-ons
- **Ventrac** — rough and utility mowers
- **Nexmow** — autonomous mowers
- **Salsco** — rollers
- **Foley** — the bedknife grinder

Display as manufacturer plus model, with the type as supporting text. "Toro Greensmaster 1000 — walk-behind reel", not "Walk-behind reel (Toro)".

## Status below the title

Status currently sits inside the machine name. Move it out. The title is the machine; a **status line underneath** carries the state:

- `Used · 340 hours`
- `New`
- `Leased · $840 per season`
- `Arriving day 34`
- `In for grinding · back day 12`
- `Broken · needs repair`

One status line, always in the same place, never in the title.

## Pending deliveries

Add a **Deliveries** section to the Shed, listing everything ordered and not yet arrived: machine, source (new, ex-demo or used), the day it arrives, days remaining, and what was paid. Empty state says nothing is on order.

The `pendingDeliveries` array already exists on the save from Round 4 — this surfaces it.

**Gate**

1. Every machine shows manufacturer and model, with type as supporting text.
2. No status text appears inside any machine title.
3. Each machine shows exactly one status line beneath its title.
4. The Shed has a Deliveries section listing pending orders with arrival days.
5. Ordering a machine adds it to Deliveries immediately, and it leaves on arrival.

---

# Phase E — Volunteer day

The volunteer currently arrives on day 6 of the week. Move to **day 3**.

```js
VOLUNTEER_DAY = 3
```

Existing saves keep whatever day they were on unless it is day 6, in which case migrate to 3.

**Gate**

1. The volunteer arrives on day 3 of each week.
2. They still cannot be assigned greens, tees or bunkers.
3. They still show as unavailable with a reason on their off days.

---

## Out of scope

No changes to the moisture model, height-of-cut model, machine claiming, acquisition system, or the day rhythm. If a fix appears to need one changed, note it in `DECISIONS.md` and leave it alone.
