# Fixes — Round 7

Phases A to F, in order, each with a gate.

Phase A is a data model change that every later phase depends on. Do not reorder.

---

# Phase A — Quality per hole, per surface

Surfaces are currently five grouped scores. Replace with **per-hole, per-surface** tracking, so hole 3's green and hole 7's green are separate things with separate histories.

## Model

```js
holes: [
  {
    id: 1,
    green:   { quality, lastMownDay, heightAtLastCut, patternAtLastCut, angleAtLastCut,
               patternWear, diseasePressure, moisture, dryingFactor, override: null },
    tee:     { ...same },
    fairway: { ...same },
    rough:   { ...same },
    bunker:  { quality, lastRakedDay } | null
  },
  ...
]
```

Up to 45 tracked surfaces on a nine-hole course. Moisture already tracked per green moves into this structure rather than living separately.

## Settings

Height, pattern, angle and auto-rotate stay **course-wide per surface type by default**, held in `surfaceDefaults`. Any individual hole surface may carry an `override` which takes precedence. The Mowing tab edits the defaults; a per-hole override is set from that hole's detail.

Most players will never touch an override. It exists so a problem green can be run higher without raising all nine.

## Course condition

```js
condition = weighted mean over surface types of (mean quality across holes for that type)
```

Keep the existing `CONDITION_WEIGHTS`. A single neglected green should move the number a little, not a lot.

## Map

Each hole's surfaces colour from that hole's own quality. Neglected individual holes must be visibly identifiable on the map — this is the main payoff of the change.

## Neglect

`lastMownDay` is per hole surface. Neglect thresholds apply per hole. Complaints name the hole: "The green on 4 hasn't been cut in five days."

**Gate**

1. Every hole tracks its own quality, last-worked day and settings state for each surface it has.
2. Cutting some holes and not others produces visibly different colours on the map.
3. Course condition is a weighted mean and moves sensibly when one hole is neglected.
4. Course-wide settings apply to all holes; a per-hole override takes precedence where set.
5. Complaints name specific holes.
6. Old saves migrate — a grouped score becomes that score on every hole of that type.

---

# Phase B — Partial jobs

A job is now **a set of holes**, not the whole course.

## Selecting

Select holes on the map, then choose the task. Selection is multi-hole: click to toggle, drag across to add, with **All**, **Front nine** and **Clear** shortcuts.

The map is the selection surface. Turf tabs plan whole-course jobs as they do now, which is the same thing with every hole selected.

## Setup overhead

Partial jobs are less efficient, because you still hitch up, load, and drive out.

```js
JOB_SETUP_MINUTES = { green: 35, tee: 25, fairway: 45, rough: 45, bunker: 20 }
jobMinutes = SETUP + (perHoleMinutes × holesSelected × multipliers)
```

Setup is **not** multiplied by machine, height or pattern — it is fixed. Doing three greens three days running costs three setups; doing all nine once costs one. That is the trade.

## Saved routes and repeat

- **Saved routes** — name and save a selection ("Front nine greens", "Wet corner"). Apply from the map or from Turf. Cap at 8.
- **Repeat last** — one action that re-plans yesterday's jobs exactly: same tasks, same hole selections, same machines. Skips anything that no longer fits and says so.

**Gate**

1. Holes can be selected individually on the map and a task applied to just those.
2. All, Front nine and Clear shortcuts work.
3. Job time is setup plus per-hole cost, and doing nine holes in one job is cheaper than three jobs of three.
4. Setup cost does not scale with machine or height.
5. A route can be saved, named, and reapplied.
6. Repeat last re-plans yesterday's jobs and reports anything dropped.

---

# Phase C — Any machine, any job

Remove the hard permission gate. **Any mower can be sent to any surface.** Using the wrong one wrecks the turf.

## Suitability

Every machine has a suitability for every surface: **ideal**, **acceptable** or **damaging**.

| Suitability | Effect |
|---|---|
| Ideal | No penalty |
| Acceptable | Ceiling −12 |
| Damaging | Ceiling −30, and an immediate −18 quality to every hole worked |

Planning a damaging job requires confirmation naming what it will do. It is never silently allowed and never blocked.

| Machine | Green | Tee | Fairway | Rough |
|---|---|---|---|---|
| Walk-behind reel | Ideal | Ideal | Acceptable | Damaging |
| Ride-on greens triplex | Ideal | Ideal | Acceptable | Damaging |
| Ride-on fairway unit | Damaging | Damaging | Ideal | Acceptable |
| Rough / utility mower | Damaging | Damaging | Acceptable | Ideal |
| Push rotary | Damaging | Acceptable | Acceptable | Acceptable |

A fairway mower on a green is the headline case: it will cut, and it will scalp the surface.

## Machine speed spread

Ride-ons must be dramatically faster than walking, because that is what you are buying.

```js
MACHINE_TIME_MULT = {
  pushRotary: 1.2,
  walkBehindReel: 1.0,
  ridingGreensTriplex: 0.45,
  ridingFairwayUnit: 0.35,
  roughUtility: 0.40
}
```

Nine greens with a walk-behind is most of a day. Nine greens with a triplex is a morning.

**Gate**

1. Every machine can be assigned to every surface.
2. Suitability is shown before planning, with its penalty stated.
3. A damaging job requires explicit confirmation.
4. A fairway mower on greens applies both the ceiling penalty and the immediate quality hit.
5. A triplex cuts nine greens in roughly 45% of the walk-behind time.

---

# Phase D — Rebalance the day

Times are far too low. Set them so a lone greenkeeper on the starting fleet is genuinely stretched.

## Reference target

With the **starting Toro Greensmaster 1000 at condition 28**, at default height and pattern:

> **Nine greens ≈ 384 minutes — about 80% of the day.**

Derive `PER_HOLE_MINUTES` from that, given `JOB_SETUP_MINUTES.green` of 35 and the condition penalty.

## Weekly cadence target

One worker on the starting fleet, working six days (2880 minutes), should be able to sustain:

- Greens, tees and fairways cut **twice a week**
- Rough cut **once a fortnight**
- Plus cups, bunkers, rolling and admin

That should consume roughly 75% of the week, leaving real but limited slack. Tune `PER_HOLE_MINUTES` for tees, fairways and rough to land there, and print the weekly total in the gate output.

## Prices

New Zealand pricing. **Multiply every machine price, wage, training cost, materials cost, lease rate and repair cost by 2.5.** Round to sensible figures rather than leaving odd numbers.

**Gate**

1. Nine greens on the starting fleet costs about 384 minutes.
2. The target weekly cadence fits in about 75% of a six-day week, printed in the gate output.
3. Rough genuinely cannot be cut weekly by one person on the starting fleet.
4. All prices, wages and costs are 2.5x their previous values and read as sensible round numbers.

---

# Phase E — One cash account

Three money pots is two too many. Collapse `cash`, `maintenanceBudget` and `capitalBudget` into a single **cash** balance. Everything is paid from it — wages, materials, machines, leases, repairs, fines, water.

## The season grant

At each season end the GM grants money based on satisfaction and standing.

```js
SEASON_GRANT_BASE = 30000
grant = SEASON_GRANT_BASE * (0.5 + satisfaction / 100) * gmStandingMultiplier
```

**Order matters.** At season end: compute the grant, add it to cash, *then* run the solvency check. Being in the red mid-season is survivable if the grant covers it — that is the shape of a real turf budget.

The two-consecutive-insolvent-season-ends dismissal rule stays, now evaluated after the grant lands.

## The grant forecast

Seven days before each season end, a GM email states what is coming and what could change it.

```js
GRANT_FORECAST_LEAD_DAYS = 7
GRANT_BONUS_THRESHOLD = 5      // satisfaction points either way
GRANT_BONUS_AMOUNT = 4000
GRANT_PENALTY_AMOUNT = 4000
```

Wording along these lines: *"On current satisfaction of 62 you'll receive $33,600 at season end. Get it to 67 and I'll add $4,000. Let it slip to 57 and I'll take $4,000 off."*

This gives the last week of every season a clear target, and makes satisfaction something the player actively chases rather than watches.

**Gate**

1. Only one money value exists in state and in the UI.
2. Every cost is charged to it.
3. The season grant is added before the solvency check, and a mid-season deficit covered by the grant does not count as insolvent.
4. The forecast email arrives seven days before season end with the correct projected figure.
5. Beating the threshold pays the bonus; slipping below applies the penalty.

---

# Phase F — Restore what went missing, and add the products

## Regressions

**Moisture checking has no UI.** The task exists in the model from Round 2 but cannot be planned. Restore it to the Turf → Irrigation tab and to map selection.

**Rollers are gone.** The roll task and the Salsco roller are missing. Restore both — roll on the Mowing tab, the roller in the shop and in Fleet.

Check whether either is missing from the model or only from the UI before rebuilding anything.

## Inputs tab

Add **Inputs** to the Turf tabs, holding the two products that were specified but never surfaced.

- **Plant Fitness fertiliser** — per surface, raises the ceiling by 5 for 21 days. Shows which holes are currently treated and when each expires.
- **Disease spraying** — per surface, suppresses pressure for 14 days. Shows current pressure per hole and flags anything approaching outbreak. Still requires a spray-certified worker.

Both are planned as jobs against selected holes, like any other task.

Turf tabs become: **Summary · Mowing · Irrigation · Inputs · Other · Presets**.

## Healthy Ponds

Pond maintenance, on the Other tab, working two ways:

- **Regular dosing** — a set-and-forget schedule that holds pond health steady. Costs money per dose and a small amount of time.
- **Rescue treatment** — a one-off for when health has already dropped. Costs more, takes more time, and recovers health substantially.

Dosing prevents the problem; rescue fixes it after the fact and costs more overall. The aerator still works alongside both.

**Gate**

1. A moisture check can be planned again, on selected holes.
2. Rolling can be planned and the Salsco roller is purchasable and appears in Fleet.
3. Turf has an Inputs tab with fertiliser and spraying, both planned against selected holes.
4. Treated holes show their treatment and expiry.
5. Healthy Ponds offers both dosing and rescue, with dosing cheaper over time.

---

## Out of scope

No changes to the day rhythm, the acquisition system, staff skills, or tournaments. If a fix appears to need one changed, note it in `DECISIONS.md` and leave it alone.
