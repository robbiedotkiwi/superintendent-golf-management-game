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
