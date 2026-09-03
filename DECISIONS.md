# Decisions

Ambiguous plan items, resolved by the simplest reading that still satisfies the gate.

## Phase 0

- Refresh always returns to the entry screen. Continue is shown only when `loadGame()` succeeds, and hydrates that exact snapshot (day, season, cash, surfaces, workers, planned tasks).
- While the game screen is open, every state change is written to `greenkeeper.save.v1`. New game removes the previous key, resets to `createInitialState()`, then the auto-save writes a fresh snapshot so Continue works after the next refresh.
- Combined minutes remaining is `sum(worker.minutesToday - worker.minutesUsed)` over the `workers` array. It is never a literal `480` in the UI.
- Palette tokens are exported as the individual names in the plan table (`turf`, `soil`, …) and applied as CSS variables from those exports.

## Phase 1

- Task duration is whole minutes (`Math.round`). Mowing time is `BASE_MINUTES` × height multiplier × pattern multiplier, then worker and machine.
- A surface counts as worked if any planned task targets it. Cut, roll, and cup changes on greens all prevent greens decay that day and apply sequentially before the equipment ceiling.
- The Phase 1 ceiling is the flat `EQUIPMENT_CEILING` of 70. Gain-diminish above 70 is implemented but does not fire until a later ceiling is higher. Fixes Round 2 adds a height-of-cut ceiling bonus on top of the machine ceiling.
- One planned entry per task id.
- Day summaries live in `state.log`. The modal only opens for summaries appended while the game screen is open, so Continue does not replay old days.

## Phase 2

- Day number is continuous. Season and year are derived from it: 30 days per season, spring → summer → autumn → winter, then year increments. Day 31 is summer year 1; day 121 is spring year 2.
- Per-season weather weights are in `WEATHER_WEIGHTS` (the plan asked for tables but did not give numbers). Summer has no frost.
- Day 1 weather is always Fine so the opening day is a full 480 minutes. The forecast is still rolled.
- Frost shortens the whole time pool by 120 minutes (360 remaining). Greens tasks are available during that shortened day — the late start is the 10am rule.
- Growth scales decay only. Heavy rain subtracts an extra 10 bunker quality after gains and decay, even if bunkers were raked.
- Forecast is kept with 70% accuracy: 30% of mornings pick a different type. A mismatch is normal, not an error.

## Phase 3

- Starting ceiling is the push rotary (65), replacing the Phase 1 flat 70.
- Reel machines take wear; rotary, roller, Ventrac and the autonomous unit do not.
- Send-away grinding sets `awayUntil = day + 2`, so a machine sent on day 1 is back on day 3.
- Autonomous mowers auto-cut fairways and rough at the current height and pattern when those surfaces were not planned, skip rain/storm mowing days, and drop the last planned task if interruptions overrun the day. Planned-task order is priority (first = keep).
- Old saves missing equipment fields get the starting push rotary on load.

## Phase 4

- Quality-gain randomness applies to hired staff only, so the player's skill-3 work stays deterministic (1.0×).
- Volunteer is always in `workers` with 0 minutes except on their weekday (default 6).
- Mechanic repairs cost 0 minutes if any mechanic is employed; wear is halved whenever a mechanic is on the books.
- Morale: −12 if a worker exceeds 420 minutes, extra −8 if they work more than 6 days running, +18 on a day off.
- Candidate list is always one fast/sloppy, one slow/careful, and one mechanic, names rolled each season.

## Phase 5

- Pond health is a 0–100 number separate from volume. Without an aerator it drops `POND_HEALTH_SUMMER_DROP` (5) every summer day and `POND_HEALTH_LOW_DROP` (6) whenever volume is below `POND_LOW_FRACTION` (35% of capacity). An aerator stops both drops and is drawn as a cross in the pond.
- Invented nightly draw, groundwater, rain fill, and extra summer decay live in `constants.js`. Hand watering zeros greens irrigation demand that night and counts the greens as watered.
- Irrigation policy UI is the pond side panel (map click or Pond button). Volume and percent sit on the main HUD.

## Phase 6

- Outbreaks fire as soon as pressure reaches `DISEASE_OUTBREAK_THRESHOLD` (60), not as a random roll. First night is the 25-point hit; later nights take the daily 5 until sprayed.
- Spray and fertiliser are per-surface tasks on greens, tees and fairways. Both need a spray ticket. The player can take the ticket (5 days away) as well as hired staff.
- Materials come off `maintenanceBudget`, a separate tin that starts at `STARTING_MAINTENANCE_BUDGET`. Cash is untouched by spray/fertiliser. Phase 7 will grant and spend this budget properly.
- Pressure formula (base × susceptibility × season × wet × underwater) is invented; rough susceptibility 0 so it never outbreaks.

## Phase 7

- Opening maintenance and capital grants use the plan formula at satisfaction 50 and GM standing 50 (12,000 and 40,000). Cash stays as the rolled reserve.
- Wages, mains, materials, grind-away, fines and leases hit maintenance. Machines, Foley and the aerator hit capital.
- Snap tournaments use the Phase 8 score table so the raise-cash button has a real payout. Full season booking is still Phase 8.
- Insolvent means cash below zero after unspent maintenance rolls in. Two consecutive season ends in that state dismiss the player.
- GM meeting is due when `day % 7 === 0`. Skipping costs `GM_MEETING_SKIP_STANDING` (10).

## Phase 8

- Tournament pay is cash, same as snap tournaments. Prep bonuses add to the tournament score, not surface quality.
- Choosing 0 on the season-start screen is a GM-request decline if the request is still pending. Inbox Decline drops standing once and does not double-drop if 0 is chosen afterwards.
- Winter offers at most one date, labelled risky. Rain (including heavy rain and storm) caps Excellent/Good at Acceptable; that is the winter risk, not a separate frost rule.
- Snap scoring ignores `tournamentPrepScore` and has no prep window.
- Prep tasks only appear in the three days before a booked date (not on the day, not for snaps).

## Phase 9

- Range, extra bunkers and new tees use invented build days and daily site minutes; 18 holes is the plan's 60 days and 180,000. Site work scales with `SEASON_GROWTH` so summer costs more of the day than winter.
- Ball picking is a daily planned task (not a new decaying surface). The autonomous picker is an instant capital buy and does not double with 18 holes.
- Extra bunkers and new tees raise that surface's ceiling and multiply rake/tee task times.

## Phase 10

- Tutorial is a single in-game card after the season-start dates. Sound uses Web Audio beeps (mower sawtooth, bird sine), off by default.
- Year review records one condition point per resolved day, tournament logs, maintenance spend (wages/mains/materials/fines) and capital purchases. `saveVersion` 1; unusable saves (no surfaces) refuse to load instead of filling fake turf.

## UI Round 1

- Map `viewBox` is the bounding box of holes, shed, pond and range plus `MAP_VIEW_PADDING`. The range is included even before it is built so the camera does not jump. The SVG is absolutely positioned in the leftover HUD space with `xMidYMid meet`.
- Fairway "black" was overlapping hole roughs drawn on top of earlier fairways, plus bunkers using the turf lerp. Surfaces now share one green family (greens lightest, rough darkest); bunkers lerp `sand` toward `soil`. All roughs are painted before all fairways.
- Course routing is out-and-back, not a ring around a hub: 1–4 go out, 5 turns down the west, 8–9 close along the shed. The pond sits west of the holes as a hazard, not in the middle. A returning nine still loops, so the convex property line looks oval; the shed is on the south edge rather than the centre. Tee numbers sit on cream discs behind each tee (`TEE_MARKER_RADIUS` 20) so they stay readable after the map scales to the HUD leftover. Flags sit on the north edge of each green. The property line is a convex hull of the roughs, shed and pond, expanded by `BOUNDARY_EXPAND`. The range bbox stays in the camera even before the range exists so the view does not jump.
- Time-bar segments are the planned tasks: width is `minutes / capacity`, orange fill, paint hairline, native `title` for name + cost, click removes. Remaining/total sits immediately beside the track. Task reorder stays as tiny ↑↓ next to the numeral so MOVE_TASK is still reachable.
- HUD tiers: condition is `text-6xl` and turf-coloured via `qualityColor`; day/season `text-4xl`; cash/satisfaction `text-2xl` with `$` and `en-US` grouping; maintenance and capital share a "Budgets" label at `text-lg`. Hole count leaves the HUD for the map label and the Office line. Disease is a single word until any surface pressure is above zero.
- Task panel (and the pond panel) is `absolute` inside the map pane so it cannot shift layout or cover End day. It unmounts when closed so it cannot leave a soil slab over the map. Machine copy only for mowing and roll; cups and hand water stay silent. Plan buttons lead with minutes.
- Nav: Pond/Office/Crew/Shed share one bordered group. Sound is a 40px speaker toggle. End day keeps a `ml-6` gap and the orange fill. Office unread is a corner badge, not `(n)` text.

## Fixes Round 2

- Height-of-cut stress for rough only fires in summer. Rough has no irrigation, so treating it as always under-watered would scalp it every day at the default 45 mm (`hocFactor` 0.6 is not in the stress band; anything lower would be). Irrigated surfaces (greens, tees, fairways) also take stress when `watered` is false outside summer.
- Default height sits exactly on `HOC_STRESS_THRESHOLD` (greens 3.5 mm → factor 0.6). Stress uses a strict `>` so the default cut is safe.
- `hocAtLastCut` starts at the default height, so the first cut at that height is not a change. Changing height before the first cut does penalise.
- Pattern wear: the first cut of a pattern and angle is not a repeat. Eight consecutive same-pattern, same-angle days are one first cut plus seven increments of 6 (= 42), which is above the grain threshold of 40.
- Angle comparison is circular on 0–180, so 0° and 180° count as the same heading. Auto-rotate wraps with `% 180`.
- Changing the angle slider by 30° or more resets wear immediately, not only on the next cut.
- Presentation only scores a surface that has a `pattern` field. Bare quality objects in older tests do not pick up default stripes.
- `BASE_MINUTES` (104 / 64 / 136 / 152) were chosen so default height and stripes display as 120 / 70 / 150 / 175. With roll, cups and rake that is 670 minutes.
- Double-cut greens is mowing, so it uses `TASK_MINUTES.doubleCutGreens` × height × pattern, and it applies mowing gain as well as the prep bonus.
- Slider steps: 0.1 mm on greens, 1 mm on tees, fairways and rough. Old saves get default height, stripes at 0°, `lastMownDay` / `lastRakedDay` of day 1, `moisture: null`, and `view: { zoom: 1, panX: 0, panY: 0 }`.
- Planned-task `level` is stripped on migrate. Changing height or pattern recomputes planned mowing minutes and drops that cut if it no longer fits the worker.

