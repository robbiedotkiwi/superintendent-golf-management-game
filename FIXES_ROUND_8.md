# Fixes — Round 8

Phases A to E, in order, each with a gate.

---

# Phase A — A proper hole selector

Selecting holes by clicking fairway shapes on the map is fiddly and imprecise. Replace it with an explicit selector.

## On the map

A row of numbered hole chips — **1 to 9** — sitting above or beside the map. Click a chip to toggle that hole. Selected chips are clearly marked. Alongside them: **All**, **Front nine** and **Clear**.

Clicking the map still works as a shortcut, but the chips are the primary control and must be usable without touching the map at all.

## In Turf

The same selector appears in the Turf section, on the Mowing, Irrigation and Inputs tabs. Planning a job from Turf uses whatever is selected there, so a partial job can be planned entirely from the Turf screen without going back to the map.

Selection is **one shared state** between the map and Turf. Selecting holes 1–3 on the map and switching to Turf shows 1–3 still selected.

Saved routes and Repeat last from Round 7 apply to this selector.

**Gate**

1. Numbered chips 1–9 appear on the map and in Turf.
2. Toggling a chip selects and deselects that hole, with clear visual state.
3. All, Front nine and Clear work from both places.
4. Selection is shared — changing it in one place changes it in the other.
5. A partial job can be planned start to finish from Turf without using the map.

---

# Phase B — Cash in the sidebar, and a forecast

## Cash in the sidebar

Add the cash balance to the sidebar, under the condition number. It is the second thing a player needs at a glance and currently requires opening Office.

Keep it to one line. If the sidebar no longer fits at `SIDEBAR_FIT_HEIGHT`, tighten the weather line rather than dropping anything.

## Cash forecast

A **Forecast** view in Office → Money, projecting to the end of the current season.

It shows, in order:

1. **Cash now.**
2. **Committed outgoings to season end** — wages for every remaining day per worker, lease payments, pond dosing, scheduled deliveries, loan repayments. Itemised, not a single total.
3. **Projected fuel spend** — based on the last 7 days of burn, extrapolated to season end.
4. **Expected grant** — the season grant at current satisfaction and standing, clearly marked as an estimate that moves with satisfaction.
5. **Projected closing balance** — after everything above.

If the balance goes negative at any point before season end, **say which day** and mark it plainly. That is the number a player needs to see coming, not discover.

The forecast is a projection of known commitments. It does not guess at machine purchases, tournament winnings, or anything the player has not committed to.

**Gate**

1. Cash appears in the sidebar and the sidebar still fits at 720px.
2. Office → Money has a Forecast showing all five sections, itemised.
3. Wages project correctly for the days remaining in the season.
4. Fuel projection reflects recent burn rather than a fixed figure.
5. A save heading for insolvency names the day it happens.
6. Raising satisfaction visibly changes the expected grant.

---

# Phase C — Firing

There is currently no way to let someone go. Add it to Crew → Roster.

```js
FIRING_SEVERANCE_DAYS = 14        // paid at their daily wage
FIRING_MORALE_HIT = 15            // to every remaining worker
```

Firing costs a severance payment of fourteen days' wages, immediately, from cash. Every remaining crew member loses 15 morale — people notice.

The action requires confirmation naming both costs. Anyone fired leaves immediately and their planned tasks are unassigned, with the affected tasks flagged rather than silently dropped.

The volunteer cannot be fired. They can be asked not to come back, which costs nothing but removes the free labour permanently.

**Gate**

1. A crew member can be fired from the Roster.
2. Confirmation names the severance amount and the morale cost before proceeding.
3. Severance leaves cash immediately.
4. Every remaining worker loses 15 morale.
5. Tasks assigned to the fired worker are flagged as needing reassignment, not deleted.
6. The volunteer cannot be fired, but can be let go permanently at no cost.

---

# Phase D — Fuel

Running a fleet costs fuel, and the more you mow the more you burn. This is the running cost that scales with effort.

## The tank

One tank for everything.

```js
FUEL_TANK_CAPACITY = 400          // litres
FUEL_START = 250
FUEL_PRICE_PER_L = 2.90
FUEL_BULK_PRICE_PER_L = 2.35
FUEL_BULK_MIN_LITRES = 200
```

Buying 200 litres or more gets the bulk rate. Buying is done from the Shed, charged to cash, and the tank cannot be overfilled.

## Burn

Fuel is consumed per machine-hour of actual use.

```js
FUEL_BURN_L_PER_HOUR = {
  pushRotary: 1.2,
  walkBehindReel: 1.5,
  ridingGreensTriplex: 4.5,
  ridingFairwayUnit: 7.0,
  roughUtility: 6.0,
  roller: 2.0
}
```

Ride-ons are fast but thirsty. Buying a triplex saves hours and costs fuel — a real trade rather than a pure upgrade.

## Running out

**Warned at planning.** If the planned day needs more fuel than the tank holds, the Start day dialog states the shortfall in litres and which job will be affected.

**Jobs stop partway.** If the tank empties mid-job, that job completes only the holes it got to. Those holes get their full benefit; the rest are untouched and reported in the day summary. Nothing is wasted, but the day is cut short.

The tank level shows in the Shed and in the Start day dialog.

**Gate**

1. The tank holds up to 400 litres and cannot be overfilled.
2. Buying 200 litres or more charges the bulk rate.
3. Every mowing and rolling job burns fuel at its machine's rate for its actual run time.
4. A planned day exceeding tank capacity is warned about, with the shortfall in litres.
5. A job that runs the tank dry completes the holes it reached and reports the rest.
6. Fuel spend appears in the cash forecast from Phase B.

---

# Phase E — The GM, and progressive unlock

A new player currently gets a one-card tutorial and four full sections. Replace that with the GM walking them in.

## Locked at start

**Crew and Office are locked.** Turf and Shed are open from day 1.

Locked sections appear in the sidebar **greyed out with a lock icon** — visible, so the player knows there is more, but not enterable. Clicking one says what will unlock it, without spoiling the detail.

## The schedule

Some messages are scheduled, some are triggered by events. Each arrives as the GM talking to the player, not as an instruction panel.

**Scheduled**

| Day | Message | Unlocks |
|---|---|---|
| 1 | GM introduces himself and the job — the course, the members, the hours you have | — |
| 2 | How the day works: pick holes, plan jobs, watch the time bar | — |
| 3 | The volunteer is coming in today | **Crew** |
| 7 | First GM meeting, and what the office is for | **Office** |

**Triggered**

| Trigger | Message |
|---|---|
| First rain day | Why you cannot mow, and what to do instead |
| Fuel below 25% | How the tank works and where to buy |
| First surface goes overdue | What neglect costs you |
| First machine breakdown | Repairs, and what condition means |
| Cash below one week of wages | The forecast, and how the season grant works |
| First time satisfaction moves 10 points | What satisfaction drives |

Each fires **once**, ever. A triggered message that has already fired never repeats.

## Tone

The GM is a plausible boss — practical, slightly impatient, not a tutorial voice. He explains what he needs, not what buttons to press. Keep each message to a few sentences.

**Gate**

1. A new game shows Crew and Office greyed with a lock icon.
2. Clicking a locked section explains what unlocks it.
3. Day 3 unlocks Crew alongside the volunteer message; day 7 unlocks Office.
4. Every triggered message fires on its condition and never fires twice.
5. Messages read as a person talking, not as instructions.
6. An existing save skips the tutorial entirely and has everything unlocked.

---

## Out of scope

No changes to the per-hole model, machine suitability, the day rhythm, or the acquisition system. If a fix appears to need one changed, note it in `DECISIONS.md` and leave it alone.
