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
- Days since last worked is `day - lastMownDay` (or `lastRakedDay` for bunkers) on the current morning. Neglect mail and the satisfaction drain are evaluated against tomorrow morning during end-of-day resolve so the inbox matches the number the player sees after End day.
- A golfer email fires on the first morning past the threshold (`daysSince === threshold + 1`). Greens therefore complain after three skipped days; rough does not complain after ten. A GM email and −2 satisfaction per neglected surface per day start when `daysSince` reaches double the threshold.
- Sidebar rows mark `overdue` when `daysSince >= threshold`, which is the first morning the surface has reached the limit. Mail still waits one extra day.
- Pond, surfaces, and map clicks share one `selected` id. Choosing pond collapses every surface row and shows irrigation under Locations; choosing a surface hides irrigation.
- Tournament line, disease, GM meeting, ball pick, and storm debris sit after Money and before Surfaces so those actions stay reachable without the old top weather strip.
- Sound stays next to End day in the pinned footer. Task reorder arrows sit under the time bar, not inside it.
- The map pane is an unpadded `flex-1` column with the SVG `absolute inset-0`. `xMidYMid meet` is kept so the whole course stays visible; leftover pane area is the same soil fill as the map, not a HUD gutter.
- Course layout lives in `courseLayout.js` as centerline coordinates plus bunker placements. `holeShape.js` expands those into polygons; `CourseMap` only draws the polygons so a later generator can replace the data file.
- Rough polygons are asserted with a `ROUGH_GAP_MIN` inflate so a visible gap is required, not just a non-touching edge. Sequential green-to-tee walks may be up to `HOLE_WALK_MAX` because pinched collars still need space.
- Neglected bunkers lerp `sand` toward `BUNKER_DULL`, never toward `soil` or turf. Bunkers are irregular polygons (7 vertices), not ellipses.
- Pattern fill is an SVG `<pattern>` rotated by the surface angle (diamond adds 45°). Opacity runs linearly from 1 on the cut day to 0 at that surface's neglect threshold. Rough has no pattern overlay.
- Zoom is a viewBox scale 0.5–4, cursor-anchored on wheel. Pan is clamped so at least `VIEW_PAN_KEEP` of the course stays on screen. Drag uses a 5px threshold and swallows the following click. Fit (button and `0`) resets to zoom 1 / pan 0. Arrow pan is `VIEW_PAN_STEP / zoom` so it feels similar at every scale.
- True upcoming weather is a 7-day queue. Actual morning weather is the previous tomorrow. The sidebar strip is re-corrupted from that queue every morning using `FORECAST_ACCURACY[i]`. `state.forecast` remains tomorrow's displayed type for older UI. Wind is stored per day as flavour.
- Tournament prompt day is `seasonEndDay - TOURNAMENT_SETUP_LEAD_DAYS` (day 23 in spring). The email is for the coming season; the first spring has no events. Booking 0 from the picker is an answer and does not drop standing. The Decline button drops standing and also counts as an answer. Silence through season end books zero dates and sends `tournamentMissed`. Booked coming-season dates are kept when the season rolls. `SET_TOURNAMENTS` replaces only that season's dates so leftover current-season events survive. The picker lives in the inbox, not a blocking modal.
- Moisture is always simulated; the UI stays hidden until a check, greens sensors, or TurfRad. Starting moisture is the band midpoint. Nightly: irrigation add, then ET (season × weather × HOC × dryingFactor × wind on fine/overcast), then rain add. Hand watering adds to selected greens and does not cancel sprinklers. Drought uses the old summer under-water quality hits whenever a surface is below band, any season. Wet disease and wet gain use mean greens moisture for the grouped greens surface. Stale means `day - readDay >= MOISTURE_DATA_FRESH_DAYS`. Overlay mix values live in `constants.js`; drying factors live on hole recipes.

## Fixes Round 3

- `FIXES_ROUND_3.md` was not in the repo or uploads when this round started. Phase A follows the user brief: playout is a film of an already-resolved day and must not call `resolveDay`. Watch vs skip of the same planned seed must leave identical game state.
- Invented presentation timings, since the spec file was missing: `PLAYOUT_SPEEDS` 1/2/4, `PLAYOUT_MS_PER_MINUTE` 12, `PLAYOUT_MIN_EVENT_MS` 480, `PLAYOUT_EMPTY_MS` 600, `PLAYOUT_END_HOLD_MS` 240. Speed and skip prefs default to 1× and off.
- `END_DAY` still resolves immediately in the reducer. The map then paints `summary.before` and applies each done task's `after` as the film cursor moves. Skip jumps the film; it does not resolve again.
- `prefers-reduced-motion` takes the skip path. In-progress film is local React state and is not saved; reload shows the already-resolved morning.
- Speed/skip live on the save object so old saves pick up defaults. Custom presets and section/tab wait for later phases.
- Office, Crew and Shed replace the map pane only. The sidebar stays mounted. End day returns to the map so the day film has a course to play on. Location ids stay `course` / `office` / `crew` / `shed` so existing view strings keep working.
- Office tabs are Inbox (mail + GM meeting), Money, Projects. Crew is Roster / Hire. Shed is Yard / Buy. Tab state lives in App for now and is not saved until the persist phase.
- Escape from Office, Crew or Shed (any sub-tab) returns to the map in one step. It does not walk back through tabs. On the map it still clears the selected surface.
- Custom presets store height, pattern, angle and auto-rotate for one surface. Cap is `PRESET_MAX` (8). Apply uses the existing HOC/pattern actions, so the mowing model is unchanged.
- Section and tab live on the save object (`state.section`, `state.tabs`). Continue restores them. Camera zoom stays in `state.view`. End day still jumps to the map via `SET_SECTION`, which is also saved.
- `view` / `tabs` are read at the top of `GameScreen` so the Escape handler never closes over a later `const`. Environments with `prefers-reduced-motion` take the skip-film path, same as the skip checkbox.

## Fixes Round 4

- `FIXES_ROUND_4.md` was not in the repo or uploads. Phases follow the user brief: condition → claiming → BASE_MINUTES/block-cut retune → `formatMoney` → salesman/used market → event invitations. Invented numbers live as named exports in `constants.js`.
- Machine condition is a 0–100 hull/engine stat, separate from reel wear. New games and shop buys start at `STARTING_MACHINE_CONDITION` / `NEW_PURCHASE_CONDITION` (100) so Phase 1/3 duration checks stay 1.0×. Old saves get `MIGRATED_MACHINE_CONDITION` (80). Runtime lookups that omit the map still treat the unit as 100 so ad-hoc test machines do not pick up the migrate value.
- Time penalty is linear: `1 + (CONDITION_MAX - condition) * CONDITION_TIME_PENALTY_PER_POINT` (0.005). Condition 100 is 1.0×; 0 is 1.5×. It multiplies the catalogue `timeMult` inside `machineTimeMultiplier`, so `mowingMinutes` stays surface-only.
- Each use (mow, roll, autonomous) drops condition by `CONDITION_LOSS_PER_USE` (1). Grinding still only resets reel wear. Repair still only clears `machineBroken`.
- Save also grows empty Round 4 fields now so later phases do not break old files: `machineDailyMinutes` (default `MACHINE_DAILY_MINUTES` = 480), `salesmanRelationship` (`SALESMAN_RELATIONSHIP_START` 50), `usedListings`, `pendingDeliveries`, `activeSales`, `eventInvitations`. Claiming, the used market, and invitations wait for later phases.
- Claiming (Phase B): each owned machine has a daily pool (`machineDailyMinutes`, default 480). Planned mowing and roll tasks store `machineId` and spend `planned.minutes` from that pool. `canPlanTask`, `assignWorker`, `durationForTask`, `recomputePlannedMinutes` and `SET_TASK_WORKER` all go through `pickMachineForTask`. One worker who is simply out of time still sees the Phase 1 "Needs N min" reason; a second worker who has time but the mower does not sees `MACHINE_BOOKED_REASON`. Roll is optional: if the roller is booked, the job is hand-rolled.
- Block cut (Phase C): new pattern `PATTERN_BLOCK` (time 1.0, presentation 0). Fairways and rough default to it; greens and tees stay on stripes. Rough is now a patterned surface for time, grain wear and presets. Overlay is not drawn for block (or on rough). Dry HOC stress still uses `MOISTURE_SURFACES`, not the new patterned list, so rough only takes height stress in summer.
- Starting fleet stays `STARTING_MACHINE_IDS` = push rotary at condition 100. Faster starters would break the Phase 1 `planned minutes === mowingMinutes` equality. Condition 100 × rotary 1.0 × block 1.0 leaves the default day at 670 minutes = 140% of 480, so `BASE_MINUTES` (104/64/136/152) were verified rather than rewritten.
- Money (Phase D): one `formatMoney()` in `src/engine/format.js`. Every player-facing amount (UI copy, buy reasons, mail grants) goes through it. Simulation arithmetic still uses raw numbers.
- Used market (Phase E): salesman relationship starts at 50. Buying used adds `SALESMAN_BUY_RELATIONSHIP` (6); listing a sale adds `SALESMAN_SELL_RELATIONSHIP` (3). Each season (and a new game) rolls `USED_LISTING_COUNT` (3) used machines at condition 45–88, priced at 55% of catalogue × condition/100 × (1 − relationship × 0.003). Prices freeze at roll. A buy spends capital and arrives after `USED_DELIVERY_DAYS` (3) mornings at that listing's condition. A sale removes the unit immediately and pays `SALE_PRICE_FRACTION` (40%) of catalogue × condition/100 into capital after `SALE_DAYS` (4). Cannot sell the last machine, a lease, or the zero-cost starter. Used stock lives on the existing Shed Buy tab — no third tab. Listings are rolled after the hire pool so the forecast seed and candidates stay as Round 3. Old saves missing the arrays stay empty until the next season change.
- Events (Phase F): one member-day invitation per season on `EVENT_INVITE_DAY_OF_SEASON` (10). It is stored on `eventInvitations` with `response: null | accept | decline` and mirrored as `eventInvite` mail in the Office inbox. Accept adds `EVENT_ACCEPT_STANDING` (4); decline subtracts `EVENT_DECLINE_STANDING` (3). Ignoring it leaves `response` null — no auto-penalty. Old saves get an empty list.

## Fixes Round 5

- `FIXES_ROUND_5.md` is in the repo root and is the source of truth for this round.
- Hole anatomy is capsule perimeter (`ribbon` at `PERIMETER_HALF_WIDTH` 54 with round caps), tee rectangle `TEE_SIZE` 34×20, constant-width fairway `FAIRWAY_WIDTH` 58 from `FAIRWAY_START_T` 0.14 to `FAIRWAY_END_T` 0.78, per-hole green variant, 2–4 bunkers, then centreline. Round 2's varying fairway width is superseded; `fairwayWidthVaries()` is false.
- Placement assertions in `placement.js` throw at module load in `course.js`, not only under `import.meta.env.DEV`, so Node checks and a bad layout both fail loudly. Property bounds are the axis-aligned rect `PROPERTY_MIN_*` 0 / `PROPERTY_MAX_*` 1280×1260, independent of the drawn convex hull.
- Invented layout helpers: `FLAG_FAR_FACTOR` 0.4 (flag offset along the last centreline tangent), `RANGE_X/Y` 40/1080 so the range bbox misses the new holes, `BACK_NINE_OFFSET_X` 1320, `ROUGH_GAP_MIN` 0 (capsules may sit close; intersection is still forbidden). Routing loops around the shed and pond; hole 7 no longer overlaps the shed. Holes 2, 4 and 9 bend.
- `SHED_CLEARANCE` 40 inflates the shed footprint (including roof) before the intersection test.

### Phase B

- Sidebar is day / season·year, one-line today+tomorrow weather, the condition number, Turf/Office/Crew/Shed, then a pinned footer (time bar, day button, Fit / moisture / sound). The footer still says End day until Phase C. Skip-film lives only on the playout bar. Reorder arrows are gone until Phase D drag.
- Surfaces, mowing, irrigation, pond, disease and the 7-day strip live in Turf (Summary · Mowing · Irrigation · Bunkers · Pond · Presets). Cash, budgets, satisfaction and tournaments stay in Office. Map surface clicks open `MapJobPopover` (one-click jobs at current settings). Pond clicks open the Turf Pond tab.
- Invented shipped presets `Daily`, `Tournament` and `Recovery` are course-wide packs applied through the existing HOC/pattern patches. Badge numbers: overdue surface count, unread mail, low-morale workers + unread golfer/neglect mail, machines broken or away. Dots: outbreak or out-of-band moisture; GM meeting in `GM_MEETING_LEAD_DAYS` (2) or an open tournament decision; someone whose `trainingUntilDay` is tomorrow; used listings, an active sale, or `lastDeliveryDay` today. `MORALE_BADGE_BELOW` is `MORALE_SLOW_BELOW`. `lastMainsCost` is stored from the night's irrigation for the Pond tab.
- Round 2/UI checks that required money, surfaces and the forecast in the sidebar now look at Office/Turf. `SIDEBAR_FIT_HEIGHT` is 720; the sidebar itself does not scroll.

