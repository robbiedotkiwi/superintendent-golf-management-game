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
