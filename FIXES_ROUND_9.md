# Fixes — Round 9

All Turf page work, plus one Office project. Phases A to F, in order, each with a gate.

---

# Phase A — Remove Summary and Presets

Delete both tabs and their content.

Turf tabs become: Mowing · Irrigation · Inputs · Other.

Everything Summary carried is either moving into the two-column layouts below or going away:

Per-surface status moves into the right-hand column of each tab.
Match last mowing is removed. Delete the action and its state.
The 7-day forecast strip is not lost — it already lives in the Start day dialog, and today plus tomorrow stay in the sidebar. Do not rebuild it in Turf.

Presets go entirely — the shipped Daily / Tournament / Recovery packs and any saved custom presets. Remove the state, the cap, and the actions.

**Gate**

1. Turf has exactly four tabs.
2. No Summary or Presets code, state or actions remain — a grep comes back clean.
3. The 7-day forecast still appears in the Start day dialog.
4. Old saves carrying preset data load without error, dropping it silently.

---

# Phase B — Mowing: two columns

Each surface section splits into two columns.

Left — the controls, as they are now: height slider, pattern, angle, auto-rotate, machine selection, hole selector, and Plan this cut with its minutes.

Right — the status of that area:

Current height, and how long the grass actually is now given days of growth since the cut
Days since last mown, flagged when overdue
Current quality and the ceiling it can reach
Pattern wear, when it is climbing
Which holes are lagging, when some holes were cut and others were not

The right column is read-only. It answers "does this need doing?" while the left answers "how do I do it?".

**Gate**

1. Every surface section on Mowing has two columns.
2. The right column shows current height, grass length, days since cut, quality, ceiling and wear.
3. Overdue surfaces are flagged in the right column.
4. Where holes differ, the right column says which are lagging.
5. The right column changes nothing when clicked.

---

# Phase C — Irrigation in millimetres

Replace the policy with a slider.

Off / Light / Full is gone. Each irrigated surface gets a slider set in millimetres of water.

```js
IRRIGATION_MM_RANGE = {
  green:   { min: 0, max: 10, default: 4, step: 0.5 },
  tee:     { min: 0, max: 10, default: 4, step: 0.5 },
  fairway: { min: 0, max: 8,  default: 3, step: 0.5 }
}
```

Rough is not irrigated.

Converting to volume: millimetres become cubic metres through the irrigated area.

```js
IRRIGATED_AREA_M2_PER_HOLE = { green: 500, tee: 250, fairway: 3000 }
m3 = mm * areaM2 * holesIrrigated / 1000
```

So 4 mm across nine greens draws 18 m³. Fairways are the expensive surface, as they should be.

Converting to moisture:

```js
MOISTURE_PER_MM = { green: 1.4, tee: 1.1, fairway: 0.9 }
```

Sandy greens respond faster per millimetre than deeper fairway soil. The existing overnight ET, rain and mains-shortfall logic is unchanged — only the input changes.

Two columns:

Left — the mm slider, with the resulting nightly draw in m³ shown live, and the pond level it will leave behind.

Right — moisture for that surface: current readings, the target band, staleness, and the Check moisture action with its hole selector.

**Gate**

1. No Off / Light / Full remains anywhere.
2. Each irrigated surface has a mm slider with the ranges above.
3. Changing mm updates the m³ draw and the projected pond level immediately.
4. Moisture responds to millimetres at the stated rates.
5. The right column shows readings, band, staleness and a Check moisture action.
6. Old saves migrate their policy to a sensible mm value — Off to 0, Light to half the default, Full to the default.

---

# Phase D — Inputs: two columns

Same treatment.

Left — fertiliser and spraying: the product, the hole selector, the cost, the minutes, and the action.

Right — the status of that area:

Current disease pressure, flagged when approaching outbreak
Fertiliser treatment and when it expires
Spray cover and when it expires
Moisture, since wet turf drives disease
Which holes are treated and which are not

**Gate**

1. Both sections on Inputs have two columns.
2. The right column shows pressure, treatment expiries, moisture and per-hole coverage.
3. Approaching-outbreak surfaces are flagged.
4. Partial treatments show which holes are covered.

---

# Phase E — Other: pond dosing and the level bar

Dosing becomes a scheduled job.

Healthy Ponds dosing currently takes 20 minutes off the day silently, which means the player cannot see where the time went. Make it a real job.

Pond dose is a task you add to the day, like mowing. It costs POND_DOSE_MINUTES and appears as its own segment in the time bar.
It is due weekly from the last dose, not on a fixed calendar.
When 7 days have passed, the morning briefing says it is due and warns that health will start dropping.
Health holds while dosing stays current. Past 7 days, health resumes declining as if undosed.

Remove the automatic nightly deduction entirely. Nothing should take time off the day without appearing in the bar.

The rescue treatment stays as it is — a one-off for when health has already dropped.

Pond level bar: a visual of current m³ against capacity, with the low threshold marked.

**Gate**

1. Pond dosing is planned as a job and shows in the time bar.
2. Nothing deducts time from the day outside the plan.
3. Dosing is due seven days after the last dose, not on a calendar day.
4. The morning briefing flags an overdue dose and states the consequence.
5. Health holds while current and resumes dropping when overdue.
6. The pond shows a level bar with the low threshold marked.

---

# Phase F — Pond expansion

A new capital project in Office → Projects.

```js
POND_EXPANSION_COST = 95000
POND_EXPANSION_DAYS = 45
POND_EXPANDED_CAPACITY = 14000        // from 8000
POND_EXPANDED_HEALTH_DECAY_MULT = 0.5
POND_EXPANDED_GROUNDWATER_M3 = 35     // from 20
```

Expanding buys three things: more storage, a pond that fouls half as fast because it holds more water, and a faster natural refill.

It is the answer to summers spent buying mains water. Like other projects it takes real days, and it is best done in winter.

The level bar and every m³ figure must reflect the new capacity once complete.

**Gate**

1. Pond expansion appears in Office → Projects with its cost and duration.
2. Committing deducts cash and shows a completion date.
3. On completion, capacity rises to 14,000 and the level bar rescales.
4. Health declines at half the previous rate.
5. Groundwater refill rises to 35 m³ per day.
6. A project started in summer costs more of the working day than one started in winter, as with other projects.

---

## Out of scope

No changes to the mowing model, machine suitability, the day rhythm, staff, or the acquisition system. If a fix appears to need one changed, note it in `DECISIONS.md` and leave it alone.
