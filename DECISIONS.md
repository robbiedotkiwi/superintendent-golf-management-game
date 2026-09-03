# Decisions

Ambiguous plan items, resolved by the simplest reading that still satisfies the gate.

## Phase 0

- Refresh always returns to the entry screen. Continue is shown only when `loadGame()` succeeds, and hydrates that exact snapshot (day, season, cash, surfaces, workers, planned tasks).
- While the game screen is open, every state change is written to `greenkeeper.save.v1`. New game removes the previous key, resets to `createInitialState()`, then the auto-save writes a fresh snapshot so Continue works after the next refresh.
- Combined minutes remaining is `sum(worker.minutesToday - worker.minutesUsed)` over the `workers` array. It is never a literal `480` in the UI.
- Palette tokens are exported as the individual names in the plan table (`turf`, `soil`, …) and applied as CSS variables from those exports.

## Phase 1

- Task duration is `Math.round(baseMinutes * levelMultiplier)` so the time bar stays in whole minutes. Quick roll is 53 minutes, not 52.5.
- A surface counts as worked if any planned task targets it. Cut, roll, and cup changes on greens all prevent greens decay that day and apply sequentially before the equipment ceiling.
- The Phase 1 ceiling is the flat `EQUIPMENT_CEILING` of 70. Gain-diminish above 70 is implemented but does not fire until a later ceiling is higher.
- One planned entry per task id. Change level by taking the task off first.
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
- Autonomous mowers auto-cut fairways and rough at standard quality when those surfaces were not planned, skip rain/storm mowing days, and drop the last planned task if interruptions overrun the day. Planned-task order is priority (first = keep).
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
