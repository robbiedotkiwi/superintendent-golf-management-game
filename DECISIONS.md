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
- Task panel (and the pond panel) is `absolute` inside the map pane so it cannot shift layout or cover Start day. It unmounts when closed so it cannot leave a soil slab over the map. Machine copy only for mowing and roll; cups and hand water stay silent. Plan buttons lead with minutes.
- Nav: Pond/Office/Crew/Shed share one bordered group. Sound is a 40px speaker toggle. Start day keeps a `ml-6` gap and the orange fill. Office unread is a corner badge, not `(n)` text.

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
- Days since last worked is `day - lastMownDay` (or `lastRakedDay` for bunkers) on the current morning. Neglect mail and the satisfaction drain are evaluated against tomorrow morning during end-of-day resolve so the inbox matches the number the player sees after Start day.
- A golfer email fires on the first morning past the threshold (`daysSince === threshold + 1`). Greens therefore complain after three skipped days; rough does not complain after ten. A GM email and −2 satisfaction per neglected surface per day start when `daysSince` reaches double the threshold.
- Sidebar rows mark `overdue` when `daysSince >= threshold`, which is the first morning the surface has reached the limit. Mail still waits one extra day.
- Pond, surfaces, and map clicks share one `selected` id. Choosing pond collapses every surface row and shows irrigation under Locations; choosing a surface hides irrigation.
- Tournament line, disease, GM meeting, ball pick, and storm debris sit after Money and before Surfaces so those actions stay reachable without the old top weather strip.
- Sound stays next to Start day in the pinned footer. Task reorder arrows sit under the time bar, not inside it.
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
- Office, Crew and Shed replace the map pane only. The sidebar stays mounted. Start day returns to the map so the day film has a course to play on. Location ids stay `course` / `office` / `crew` / `shed` so existing view strings keep working.
- Office tabs are Inbox (mail + GM meeting), Money, Projects. Crew is Roster / Hire. Shed is Yard / Buy. Tab state lives in App for now and is not saved until the persist phase.
- Escape from Office, Crew or Shed (any sub-tab) returns to the map in one step. It does not walk back through tabs. On the map it still clears the selected surface.
- Custom presets store height, pattern, angle and auto-rotate for one surface. Cap is `PRESET_MAX` (8). Apply uses the existing HOC/pattern actions, so the mowing model is unchanged.
- Section and tab live on the save object (`state.section`, `state.tabs`). Continue restores them. Camera zoom stays in `state.view`. Start day still jumps to the map via `SET_SECTION`, which is also saved.
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

- Sidebar is day / season·year, one-line today+tomorrow weather, the condition number, Turf/Office/Crew/Shed, then a pinned footer (time bar, day button, Fit / moisture / sound). Skip-film lives only on the playout bar. Reorder arrows are gone until Phase D drag.
- Surfaces, mowing, irrigation, pond, disease and the 7-day strip live in Turf (Summary · Mowing · Irrigation · Bunkers · Pond · Presets). Cash, budgets, satisfaction and tournaments stay in Office. Map surface clicks open `MapJobPopover` (one-click jobs at current settings). Pond clicks open the Turf Pond tab.
- Invented shipped presets `Daily`, `Tournament` and `Recovery` are course-wide packs applied through the existing HOC/pattern patches. Badge numbers: overdue surface count, unread mail, low-morale workers + unread golfer/neglect mail, machines broken or away. Dots: outbreak or out-of-band moisture; GM meeting in `GM_MEETING_LEAD_DAYS` (2) or an open tournament decision; someone whose `trainingUntilDay` is tomorrow; used listings, an active sale, or `lastDeliveryDay` today. `MORALE_BADGE_BELOW` is `MORALE_SLOW_BELOW`. `lastMainsCost` is stored from the night's irrigation for the Pond tab.
- Round 2/UI checks that required money, surfaces and the forecast in the sidebar now look at Office/Turf. `SIDEBAR_FIT_HEIGHT` is 720; the sidebar itself does not scroll.

### Phase C

- The reducer action stays `END_DAY`. The button, tutorial and copy use `START_DAY_LABEL` ("Start day"). Pressing it opens `StartDayDialog` (local UI state, not saved). Confirm still calls `SET_SECTION` to the map then `END_DAY`. Back closes the dialog with the plan and any in-dialog irrigation edits intact. Irrigation uses the existing `SET_IRRIGATION` action, so the night is planned from the same field as Turf.
- Unused copy is `You still have N minutes unused.` or `DAY_FULLY_COMMITTED_COPY`. Overdue-and-skipped is `skippedOverdueSurfaces`. The 7-day `ForecastStrip` is in the dialog. The spec file `FIXES_ROUND_5.md` still contains the old phrase because it describes the rename; every other file does not.

### Phase D

- Unavailable = `minutesToday === 0` after morning prep. Reasons, in order: volunteer off-day (`VOLUNTEER_OFF_REASON`), training (`NAME — training, back day N` where N is `trainingUntilDay`, the first day they work again), `sickUntilDay` if set (`NAME — off sick`), morale below `MORALE_NOSHOW_BELOW` (`NAME — staying home (morale)`), otherwise `Not in today`. There is no sick roll in the sim; the reason exists so a set `sickUntilDay` cannot be assigned. `assignWorker`, `canPlanTask` and `SET_TASK_WORKER` already reject `!isWorkerPresent`.
- The numbered drag list is `PlanList`: map overlay during planning, and again in Start day. Not in the sidebar (Phase B). `REORDER_TASKS` replaces the arrows; `MOVE_TASK` remains. `OVERRUN_DROP_COPY` matches `planned.pop()` of the last task when autonomous interruptions overrun. Reorder is pointer-driven (press a row, move onto another, release) so it is not fighting the map pan HTML5 drag or a `dragend` race.

### Phase E

- Grace uses the spec numbers: days 1–5 always `fine`; days 1–10 never `storm` or `heavyRain` (those types remap to `overcast` if a roll or old save would show them); no breakdowns while resolving days 1–10; disease pressure is forced to 0 through season 1 (`seasonNumberFromDay(day) <= GRACE_NO_DISEASE_SEASON`) and starts accruing on day 31. Forecast generation and `corruptDay` both run through `applyWeatherGrace`, so the strip cannot advertise weather the grace period will prevent. After those windows the old weights, breakdown chance and pressure gain run unchanged. Phase 6's disease checks now start on day 31 so they still cover accrual, outbreak and spray suppression after the grace window.

## Fixes Round 6

- `FIXES_ROUND_6.md` is in the repo root and is the source of truth for this round.

### Phase A

- Section buttons are four full-width stacked blocks (`SIDEBAR_NAV_GAP` 8) with the spec one-liners. Weather sits on the season line at `text-xs` so the descriptions fit at `SIDEBAR_FIT_HEIGHT` 720. Badges and dots stay on the block. The sidebar still does not scroll.

### Phase B

- Last-cut memory is three new fields (`heightAtLastCut`, `patternAtLastCut`, `angleAtLastCut`) written only in `applyMowingAftermath`. They start `null` so a new game and migrated saves count as never cut. Existing `hocAtLastCut` / `lastPattern` / `lastAngle` stay for the height-change and grain-wear rules.
- Match last mowing is one Summary action (`MATCH_LAST_MOWING`). It restores settings through the same surface patch as `SET_HOC` / `SET_PATTERN` / `SET_ANGLE` and never adds tasks. Surfaces with `heightAtLastCut == null` are skipped, including bunkers (not a cut).
- Plan this cut lives on Mowing rows and on Summary rows that have a cut (`HOC_SURFACES`). Bunkers keep rake on Other.
- Auto-pick ranks owned, permitted, available machines by highest surface ceiling, then lowest catalogue `timeMult`. A per-surface `machineOverride` is a preference: if that unit is missing, broken, away, or out of daily minutes, planning falls back to auto and the UI shows `MACHINE_OVERRIDE_FALLBACK`.
- Turf tabs are Summary · Mowing · Irrigation · Other · Presets. `TURF_TAB_BUNKERS` and `TURF_TAB_POND` alias Other; old `bunkers` / `pond` tab values migrate. Pond map clicks still use `TURF_TAB_POND`.

### Phase C

- Starting fleet is two new catalogue ids (`greensmaster1000`, `reelmaster3100`) rather than retuning the shop walk-behind / fairway unit. Push rotary stays in the shop (`ownedAtStart` false) at invented `PUSH_ROTARY_COST` 1200.
- Starter hulls are `GREENSMASTER_START_CONDITION` 28 and `REELMASTER_START_CONDITION` 24. `STARTING_MACHINE_CONDITION` stays 100 for new buys and lookups that omit a stored value. Old saves that already list `ownedMachines` keep that fleet.
- Phase 1 / Round 4 duration equalities now use `durationForTask` (base × catalogue `timeMult` × condition penalty). `BASE_MINUTES` retuned to 91 / 56 / 118 / 130 so the default full day is exactly 672 minutes = 140% of 480. Fairways/rough stay under one worker-day and remain plannable on day 1.
- Claiming is unchanged. Round 4 booked-mower checks now fill the Reelmaster's daily pool explicitly, because two machines no longer share one 480-minute claim.

### Phase D

- Every catalogue unit now has `manufacturer`, `model` and `type`. Shop walk-behind / ride-on / fairway model names are invented Toro numbers (1600 / 5410 / 5510 / 5610) so they are not described only by function. The Foley card uses `MACHINE_BRAND_FOLEY` + `FOLEY_MODEL`.
- One status line under the title: broken, then grinding, then leased, then `Used · N hours` if hours > 0, else `New`. Starters start at 340 / 480 hours. Hours are a stored field and do not tick with use. New shop buys stay instant (acquisition system is out of scope); used orders still queue on `pendingDeliveries` and are the Deliveries section on Yard.
- Invented delivery sources are `new` / `ex-demo` / `used`. Used buys write `used`. Empty copy is `Nothing is on order.`

### Phase E

- `VOLUNTEER_DAY` is 3 and is also `VOLUNTEER_DEFAULT_WEEKDAY`. Saves with weekday 6 (the old default) or a missing weekday migrate to 3. Any other stored weekday is kept.

## Fixes Round 7

- `FIXES_ROUND_7.md` is in the repo root and is the source of truth for this round.

### Phase A

- `state.holes` is the hole-record array; count is `holeCount(state)`. Expanding to 18 appends nine cloned front-nine records via `expandHoleRecords`.
- Hole records do not store live `hoc` / `pattern` / `angle`. Those live in `surfaceDefaults` plus an optional per-hole `override`. `hocAtLastCut` / `lastPattern` / `lastAngle` stay on the hole for height-change and grain-wear.
- `MATCH_LAST_MOWING` restores defaults from the most recently cut hole of that type (`mostRecentCut`).
- Course-wide `autoRotate` rotates `surfaceDefaults.angle` once per job, not once per hole. A per-hole override rotates that hole's override angle.
- Incomplete saves (day/cash but no grouped `surfaces` and no hole model) refuse rather than inventing a nine-hole course.
- `state.moisture` arrays stay in parallel for the overlay and ET tick; hole records are the spec home. Phase F may drop the arrays.
- Neglect mail is one message per neglected hole when the day count equals the threshold (existing equality, not ≥).

### Phase B

- A planned job stores `holes` (sorted ids) and a `planId`. Same task on a different hole set is a second job. Turf still plans every hole of that type.
- `jobMinutes = SETUP + PER_HOLE × n × height/pattern`. Setup is not multiplied by machine, height, pattern or worker. `PER_HOLE_MINUTES` is `BASE_MINUTES / 9` until Phase D retunes the day.
- 18-hole time is the selected hole count, not `TASK_TIME_MULT_18` on top. Extra-bunker and new-tee multipliers still apply to the variable part.
- Empty map selection plans the whole course. Click a hole surface to toggle it; drag across holes to add. The number disc still opens hole detail.
- Repeat last snapshots the plan at day start (`lastDayJobs`) and replays it the next morning. Anything that no longer fits is skipped and listed in `lastRepeatDropped`.
- Spray and fertiliser jobs take time for the selected holes but still apply type-wide until Phase F.

### Phase C

- Catalogue `surfaces` flags stay as native/designed-for metadata and ceiling lookup. They no longer gate assignment. Any non-roller, non-autonomous mower can be sent to any turf surface.
- Suitability and `MACHINE_TIME_MULT` are by machine class: walk-behind reel, greens triplex (`rideOnReel` and `premiumRideOn`), fairway unit (`reelmaster3100` and `fairwayUnit`), rough/utility, push rotary. Roller and autonomous stay out of player mowing assignment.
- Course-wide `surfaceCeiling` uses only a listed `ceiling[surface]` on ideal or acceptable machines, so a fairway unit cannot raise the greens cap. A job uses that machine's native ceiling (or the max of its ceilings if the surface is unlisted) minus the suitability penalty.
- Auto-pick ranks suitability first (ideal, then acceptable, then damaging), then listed ceiling, then spec time. Damaging is never auto-picked when an ideal or acceptable unit is owned — a booked better mower reports booked rather than silently sending a damaging stand-in. A damaging machine is auto-picked only when it is the only class owned, and planning still requires confirm.
- `ineligibleMachines` is the damaging list so older damage-copy checks still hold. Override lists every mower.
- Planning a damaging job without `confirmDamaging` no-ops. The UI is a two-step confirm, not `window.confirm`. Repeat last passes confirm because yesterday already chose that machine.
- Catalogue `timeMult` constants now alias the class `MACHINE_TIME_MULT` values. The full-day total moved from 910 to 756; historical 1.8–2.0 ratio windows follow the new 1.575 until Phase D retunes the day.

### Phase D

- Nine greens 384 is a target. `PER_HOLE_MINUTES.greens` is `(384 − 35) / (9 × default height/pattern × walk-behind 1.0 × condition 28)`.
- Weekly extras are one cups, one rake, one roll and one GM meeting. Tees 90 / fairways 91 / rough 1450 are the job-length targets that land the fortnightly cadence on 2160 min (75% of 2880) and make a weekly full rough overflow 2880.
- A full-course rough job is longer than a machine day, so duration uses auto-pick even when the job cannot be planned in one go. Partial jobs from Phase B are how rough actually gets done. `pickMachineForTask` uses the selected hole set so a one-hole job is not treated as a 1450-minute claim.
- `NZ_PRICE_MULT` is 2.5. Machine, wage, training, materials, lease rate and repair (grind-away) use `nzPrice`. Lease rate becomes 0.25 so the dollar lease scales with prices, not 6.25×. Starter machines stay $0. Fines were scaled as a cost. Mains water stayed at $2.5/m³ — it is not a listed materials cost.
- Historical packed-day checks now hire a second worker, plan a one-hole rough, or buy with a larger capital pot, because nine greens is 384 min and NZ prices no longer fit the old $40,000 / one-worker packing.

### Phase E

- Opening cash is `STARTING_CASH + STARTING_MAINTENANCE_BUDGET + STARTING_CAPITAL_BUDGET` so day-1 purchasing power matches the three old pots. `STARTING_CASH` stays 8000 (the reserve).
- One grant every season from `SEASON_GRANT_BASE`, not a maintenance grant plus a yearly capital grant. Old `maintenanceGrant` / `capitalGrant` are gone.
- Forecast snapshots satisfaction seven days before season end (inclusive). Bonus/penalty is ±5 satisfaction against that snapshot, applied on top of the live grant formula at close. Leases still charge before the grant; loan repayment after the grant, before solvency.
- Old saves with `maintenanceBudget` / `capitalBudget` add those remaining pots into `cash` once. A save with no cash and no pots is refused. Save version is 3.

### Phase F

- Moisture checking and rolling were already in the model (`checkMoisture*`, `rollGreens`, Salsco `greensRoller`). They were missing from Turf UI (Irrigation / map selection, and Mowing). Restored those surfaces; did not rebuild the tasks or catalogue.
- Healthy Ponds dosing and rescue were missing from the model. Dosing is `pondDosing` (nightly `POND_DOSE_COST` + `POND_DOSE_MINUTES` off the player's morning, holds health like the aerator). Rescue is task `pondRescue`. A week of dosing is cheaper than one rescue. The aerator still stacks with both.
- Fertiliser uses `FERTILISER_DAYS` (21), not the HOC interval. Spray/fert on a hole subset stamps that hole's `fertiliserUntil` / `sprayedUntil`; type-wide until is set only when every hole of the type is treated. Old type-wide untils fan onto every hole on load. Save version stays 3 — new fields default.
- Approaching-outbreak flag is `DISEASE_OUTBREAK_WARN` (45), below the outbreak threshold of 60.
- Greens moisture status uses that hole's own read day. An unread green no longer inherits hole 1's reading, so a partial moisture check can leave other greens hidden.

## Fixes Round 8

- `FIXES_ROUND_8.md` is in the repo root and is the source of truth for this round.

### Phase A

- Hole chips follow `holeCount(state)`, with `HOLE_SELECTOR_COUNT` as the 9-hole fallback. One `HoleSelector` bound to `state.selectedHoles` is mounted on the map overlay and on Turf Mowing / Irrigation / Inputs — not a second selection model.
- Empty selection still means the whole course (Round 7). All / Front nine / Clear and numbered chips write the same `SET_SELECTED_HOLES` / `TOGGLE_HOLE` actions from both places.
- Map fairway clicks stay as a shortcut. Turf planning (`PlanJob` / `PlanThisCut`) uses `jobHolesFromSelection`.

### Phase B

- Forecast remaining days include today (`daysUntilSeasonEnd`). Wages, dosing and the fuel extrapolation use that count. Leases, grant and loan land on season close.
- Used-market deliveries are prepaid at purchase, so they are listed with $0 still due. Fuel spend is `FORECAST_FUEL_LOOKBACK_DAYS` of `fuelSpendLog` (missing days count as zero); empty until Phase D.
- Insolvency day is the first day running cash goes negative after that day's charges (and after the full season-close sequence on the last day). Intra-close dips that the grant covers are not flagged if the net close stays non-negative.
- Sidebar cash sits under condition. Round 5's "no money in the sidebar" check now expects `formatMoney(state.cash)`.

### Phase C

- The player cannot be fired. Hired staff can. The volunteer is not fired; "Don't come back" removes them permanently at $0 with no morale hit.
- Firing still proceeds if cash is short (balance can go negative). Remaining workers, including the player and volunteer, take `FIRING_MORALE_HIT`.
- Jobs keep their plan rows with `needsReassignment` and a null worker. Start day skips those jobs instead of falling back to the player.

### Phase D

- Burn uses the resolved job's minutes, split as setup plus per-hole variable. A dry tank completes only whole holes it could pay for; leftover litres go to zero. Later jobs that day are dropped.
- Fuel spend in the forecast is `burned litres × FUEL_PRICE_PER_L` written to `fuelSpendLog`. Old saves get `FUEL_START` in a 400 L tank.
- Per-litre prices show two decimals in the Shed; the charged amount is still whole dollars via `fuelCost` / `formatMoney`.

### Phase E

- New games set `tutorialDone` so the old instruction card never shows. The GM queue is the walk-in. Day 1 is marked seen when queued, same as later messages. Crew unlocks on `GM_UNLOCK_CREW_DAY` (3); Office on `GM_UNLOCK_OFFICE_DAY` (7).
- A save without `sectionUnlocks` is treated as a finished tutorial: both sections open, every GM flag seen, empty queue. Save version stays 3.
- Satisfaction trigger is the first time live satisfaction is 10 points from `SATISFACTION_START`. Cash trigger needs a non-zero weekly wage bill.
- Locked clicks set `lockHint` and do not change section. Hint copy names the unlock in outline, not the day.


