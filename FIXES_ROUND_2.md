# Fixes — Round 2

Phases A to G, in order, each with a gate. Phase A is a mechanics change and everything else depends on it, so do not reorder.

Where a number is given, use it. It is a starting value, not a final one, but do not substitute your own.

---

# Phase A — Replace quality levels with pattern and height of cut

**This removes Quick / Standard / Thorough entirely.** Mowing tasks are now configured by **height of cut** and **mowing pattern**, and those two settings determine both the time cost and the quality outcome. Rolling, raking, cup changing, hand watering, spraying and fertilising keep a single fixed time cost with no level choice.

## Height of cut

Per surface, a continuous height with a sensible range. Store the raw height in millimetres and derive a normalised `hocFactor` from 0 (highest cut in range) to 1 (lowest cut in range).

```js
HOC_RANGE = {
  greens:   { min: 2.5, max: 5.0,  default: 3.5 },
  tees:     { min: 6,   max: 12,   default: 9 },
  fairways: { min: 10,  max: 18,   default: 14 },
  rough:    { min: 35,  max: 60,   default: 45 }
}
```

Lower cut buys a better surface and costs on three fronts:

```js
HOC_TIME_MULT      = (f) => 0.85 + f * 0.5    // lowest cut takes ~1.35x
HOC_CEILING_BONUS  = (f) => f * 12            // lowest cut raises the ceiling by 12
HOC_WATER_MULT     = (f) => 1 + f * 0.4       // lowest cut drinks 40% more
HOC_FERT_INTERVAL  = (f) => 21 - f * 8        // lowest cut needs feeding every 13 days
```

**Stress risk.** When `hocFactor > HOC_STRESS_THRESHOLD` (0.6) and the day is summer or the surface is under-watered, the surface takes `HOC_STRESS_DAMAGE` (4) quality per day. Scalping a green in January is a real way to lose it. Show a warning on the slider when the current setting is in the stress band for the current season.

Height is a **persistent per-surface setting**, not a per-task choice. Set it once in the sidebar and it applies every time that surface is mown, until changed. Changing height mid-season carries a `HOC_CHANGE_PENALTY` (6 quality) on the next cut — turf does not like sudden changes.

## Pattern

Available on greens, tees and fairways. Rough is cut one way and has no pattern.

| Pattern | Time mult | Presentation |
|---|---|---|
| Stripes | 1.0x | 4 |
| Rings | 1.25x | 7 |
| Checkerboard | 1.35x | 8 |
| Diamond | 1.5x | 10 |

Pattern does four things:

1. **Time.** The multiplier above, stacking with the height multiplier.
2. **Satisfaction.** Presentation value feeds a `presentationScore` that raises golfer satisfaction alongside course condition.
3. **Tournament score.** Presentation adds directly to the tournament result, so a diamond weave on tournament week is worth the hours.
4. **Turf health.** Mowing the same pattern at the same angle repeatedly builds `patternWear` (+6 per repeat, decaying 3/day otherwise). Above `PATTERN_WEAR_THRESHOLD` (40) the surface loses 3 quality per day from grain.

**Angle** is a 0–180 slider per surface. Changing the angle by 30 degrees or more resets `patternWear` to 0. An **auto-rotate** toggle advances the angle 45 degrees each cut and prevents wear entirely — the set-and-forget option for players who do not want to think about it.

## Final time formula

```js
taskMinutes = round(BASE_MINUTES[surface] * HOC_TIME_MULT(hocFactor) * PATTERN_TIME_MULT[pattern])
```

## Quality gain

With levels gone, gain is now driven by the settings:

```js
gain = BASE_GAIN * (0.8 + hocFactor * 0.5) * workerQualityFactor
ceiling = equipmentCeiling + HOC_CEILING_BONUS(hocFactor) + fertiliserBonus
```

`BASE_GAIN` is 6. Keep the asymmetric decay rules from the original plan unchanged.

## Rebalance

The Phase 1 overload has to be re-established against the new numbers. At default heights and stripes on nine holes with one worker, the full task list must still come to roughly 140% of a 480-minute day. Adjust `BASE_MINUTES` to hit that, and update the balance targets in `BUILD_PLAN.md` to match.

**Gate**

1. Quick / Standard / Thorough no longer appear anywhere in the UI or the codebase.
2. Each surface has a persistent height setting that survives save and reload.
3. Dropping greens height from 3.5 to 2.5 visibly increases the task time and raises the achievable ceiling.
4. Running greens at 2.5 through a summer without full irrigation causes visible daily stress damage, with a warning shown before it happens.
5. Switching pattern from stripes to diamond increases the task time by roughly half.
6. Mowing the same pattern and angle for eight days straight triggers grain damage; enabling auto-rotate prevents it.
7. At default settings the full nine-hole task list is around 670 minutes against a 480-minute day.

---

# Phase B — Days since, and complaints

Track `lastMownDay` per surface (and `lastRakedDay` for bunkers). Days since is derived, never stored.

```js
NEGLECT_THRESHOLD = { greens: 2, tees: 4, fairways: 4, rough: 10, bunkers: 3 }
```

Past the threshold, complaints begin: golfer emails first, then a GM email at double the threshold, then a satisfaction penalty of 2 per day beyond that. Rough is deliberately forgiving — ten days is fine, three weeks is not.

**Gate**

1. Every surface tracks days since last worked and it survives reload.
2. Passing a threshold generates a golfer email naming that surface.
3. Doubling a threshold generates a GM email and starts the satisfaction drain.
4. Rough can be left ten days with no complaint; greens cannot be left three.

---

# Phase C — Sidebar console

Move from a top HUD to a left sidebar. The current top row is a loose string of numbers with dead space to its right, and it has no room for the mowing controls Phase A introduces.

**Layout**

- Fixed sidebar on the left, 380px, full height, `soil` background, scrolls internally if needed.
- The map fills all remaining width and height.
- Nothing overlays the map any more. The task panel becomes a sidebar section, not a sliding overlay.

**Sidebar order, top to bottom**

1. **Day header** — day number, season, year. Today's weather in one line.
2. **7-day forecast strip** (Phase F).
3. **Course** — condition as the largest number in the sidebar, turf-coloured. Satisfaction beside it.
4. **Money** — cash, then maintenance and capital budgets grouped under a Budgets label.
5. **Surfaces** — one row per surface: name, quality, days since worked. Rows past their neglect threshold are marked. Clicking a row selects that surface, same as clicking the map.
6. **Selected surface** — expands in place when a surface is selected. Height slider, pattern picker, angle slider, auto-rotate toggle, then the task buttons with their computed minutes.
7. **Locations** — Pond, Office, Crew, Shed as one group.
8. **Pinned to the bottom** — the time bar full sidebar width, then Start day beneath it.

**Time bar.** It currently sits in a wide empty box at the top with the number outside it. In the sidebar it becomes a full-width segmented bar with remaining and total inside it, segments per planned task, click a segment to remove, hover to name it. It must look like a bar even at 480/480 — show the empty track clearly.

**Gate**

1. No stats remain along the top of the screen.
2. The map fills all space to the right of the sidebar with no dead brown margins.
3. Selecting a surface on the map expands that row in the sidebar; nothing floats over the map.
4. The time bar is visibly a track with a fill, segments are clickable and removable.
5. Start day is always visible without scrolling the sidebar.

---

# Phase D — Fix the map

Four separate problems.

**1. Bunkers are grey, not sand.** They currently lerp `sand` toward `soil`, which walks them into the background colour. Bunkers must lerp between `sand` (#D8C9A8) at high quality and a slightly darker, duller sand at low quality — never toward brown, never toward green. A neglected bunker looks scruffy and weedy, not muddy.

**2. Holes overlap.** Holes 1, 2, 8 and 9 merge into one continuous mass of green in the south-east and cannot be told apart. Re-author the layout so no two holes' rough polygons intersect, and add a dev-mode assertion that fails loudly if any pair does. Leave a visible gap of rough or out-of-play between adjacent holes.

**3. The fairways look like roads.** Every one is a constant-width curved band with parallel edges. Real holes are not. Give each fairway a varying width along its length — wider off the tee, pinching at the landing zone, opening again near the green. Put a dogleg on at least three of the nine. Make the rough band width vary too, rather than a uniform offset. Bunkers should be irregular blobs at landing zones and greenside, not ellipses.

**4. Render the stripes.** Each patterned surface gets an SVG pattern fill matching its current pattern and angle. This is also the visual "last mowed" cue: stripe opacity runs from full on the day of cutting down to zero at that surface's neglect threshold, so faded turf reads as overdue at a glance. Rough gets no stripes.

Keep the layout hand-authored in a data file with clean coordinates, so it can be swapped for a generator later without touching the renderer.

**Gate**

1. Bunkers are visibly sand-coloured against both turf and boundary, at every quality level.
2. No two holes overlap, and the assertion catches it if they ever do.
3. Fairway widths vary along their length and at least three holes dogleg.
4. Freshly cut greens show stripes at the set angle; the stripes fade to nothing as the surface goes overdue.
5. Changing the pattern setting changes what is drawn on the map.

---

# Phase E — Zoom and pan

**Build**

- Scroll wheel zooms between 0.5x and 4x, anchored on the cursor.
- Click and drag pans. Distinguish a drag from a click with a 5px movement threshold, so panning never accidentally selects a surface.
- Double-clicking a hole zooms to fit that hole.
- A **Fit** control returns to the whole course. Also bound to the `0` key.
- `+` and `-` keys zoom. Arrow keys pan.
- Zoom and pan state persists in the save, so returning to the game keeps your view.
- Panning is clamped so the course cannot be dragged entirely off screen.

**Gate**

1. Wheel zoom is smooth, anchored on the cursor, and clamps at both ends.
2. Dragging pans without ever selecting a surface.
3. A single click still selects a surface reliably.
4. Fit returns to the full course from any zoom or pan position.
5. The view survives save and reload.

---

# Phase F — Weather forecast

Replace the single "Tomorrow: Fine" line with a 7-day strip in the sidebar, showing an icon, a short label and wind speed and direction per day.

**Accuracy degrades with distance.** Each morning, re-derive the displayed forecast from the true upcoming weather, corrupting it by day:

```js
FORECAST_ACCURACY = [0.90, 0.80, 0.65, 0.50, 0.40, 0.30, 0.25]
```

Tomorrow is nearly always right; day seven is close to a guess. Render that visually — confidence fades across the strip, so later days are dimmer. Do not show a numeric percentage.

Wind is flavour for now, but store it so it can drive spray windows later.

**Gate**

1. Seven days are shown with icon, label and wind.
2. Tomorrow's forecast is right about nine times in ten; day seven is wrong more often than right.
3. Confidence is legible from the styling alone.
4. The forecast re-derives each morning rather than being fixed at season start.

---

# Phase G — Tournament timing

The tournament selection currently fires the instant a new game starts, before the player has seen the course or understood what a day costs. Being asked to commit to three tournaments on turn zero is meaningless.

**Fix**

- Move the selection prompt to **7 days before the season ends**, choosing for the *coming* season.
- The first season of a new game has **no tournaments and no prompt**. The player gets 23 days to learn the loop, then on day 23 is asked about summer.
- The prompt arrives as a GM email with a deadline, not a blocking modal. It can be opened from the inbox at any point in those 7 days.
- If the player never answers, it defaults to zero tournaments and the GM notes the missed opportunity.

**Gate**

1. Starting a new game goes straight to day 1 with no tournament modal.
2. The first prompt appears on day 23 and concerns summer.
3. It is an inbox item with a deadline, not a modal that blocks play.
4. Ignoring it books zero tournaments and generates a GM email.

---

# Phase H — Soil moisture

Irrigation is currently set blind. The player picks Off, Light or Full with no information about whether the turf needs it, which makes it a coin flip rather than a decision. Soil moisture fixes that, and makes the pond economy matter.

## The model

Moisture is a percentage, tracked **per individual green** (nine separate values) and as a **single grouped value** for tees, fairways and rough. Tasks stay grouped as they are now — this is the only per-hole data in the game.

```js
MOISTURE_BAND = {
  greens:   { min: 18, max: 26 },
  tees:     { min: 20, max: 30 },
  fairways: { min: 20, max: 32 }
}
```

Rough is unirrigated and untracked.

**Below the band** — drought stress. This replaces the existing under-watering penalty; wire it to actual moisture rather than to the irrigation setting.

**Above the band** — both consequences:
- Disease pressure multiplier `WET_DISEASE_MULT` of 1.5 while the surface sits above band.
- Quality gain multiplier `WET_GAIN_MULT` of 0.85, because you cannot cut a soft surface cleanly.
- The water is wasted, which shows up as pond drawdown and mains cost for nothing.

**Nightly drift.** Irrigation adds, evapotranspiration removes. ET scales with season, and with weather — fine and windy days dry hardest, rain adds a lot. Height of cut feeds in through `HOC_WATER_MULT` from Phase A.

**Each green has its own drying rate.** Assign every green a fixed `dryingFactor` between 0.8 and 1.3 at layout time. Some greens are exposed or sandy and will always be the problem ones. This is what makes per-green data worth having.

## Getting the data

Without data, moisture is **hidden** — the sidebar shows unknown and the map overlay shows nothing. Three ways to see it:

**1. Manual check** — a task. Walk the surface with a meter.

```js
MOISTURE_CHECK_MINUTES = { greens: 40, tees: 25, fairways: 45 }
MOISTURE_DATA_FRESH_DAYS = 2
```

Readings go stale after two days and are then shown greyed and hatched rather than hidden, so the player knows they are working from old numbers.

**2. Fixed greens sensors** — 12,000 capital. Continuous readings on all nine greens, no time cost, never stale. Does nothing for tees or fairways.

**3. TurfRad on the mowers** — 20,000 capital. Any surface mown that day reports its moisture automatically. Covers everything, but **only what you actually cut** — skip the fairways for four days and the fairway reading goes stale with everything else. Skipping a cut now costs you information as well as quality, which is the point.

## Targeted hand watering

With per-green data, hand watering stops being all-or-nothing. Select individual greens.

```js
HAND_WATER_MINUTES_PER_GREEN = 15
```

Watering three dry greens costs 45 minutes instead of 60 for all nine. This is the payoff for having invested in data, and it is the main reason to buy sensors early.

## Display

- Sidebar: moisture per green in the greens row, expandable to the nine values; one figure each for tees and fairways.
- Map: a moisture overlay toggle, tinting surfaces dry-to-wet. Stale data hatched. Out-of-band surfaces marked in both views.

**Gate**

1. With no sensors and no recent check, moisture is genuinely hidden — not shown as a default or a guess.
2. A manual check reveals all nine greens individually, and the readings go stale after two days.
3. Greens sensors give permanent greens data and nothing else.
4. TurfRad reports only surfaces mown that day; skipping fairways for three days leaves the fairway reading stale.
5. Greens diverge over time — the same irrigation setting produces different moisture across the nine.
6. Running a surface above band raises its disease pressure and lowers its quality gain, and the extra water shows as pond drawdown.
7. Hand watering can target individual greens at 15 minutes each.
8. The old irrigation-setting-based under-watering penalty is gone, replaced by the moisture band.

---

## Out of scope

Do not touch: save format beyond the fields named here, staff, equipment costs, or the tournament scoring bands. Phase H changes the irrigation model deliberately; nothing else should. If a fix appears to need one of the above changed, note it in `DECISIONS.md` and leave it alone.
