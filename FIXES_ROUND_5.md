Fixes — Round 5

Phases A to E, in order, each with a gate.

Before starting: confirm this file is actually present at the repo root. The Round 3 and Round 4 spec files were never committed, so both rounds were built from prompt text alone and several requirements were missed. If you cannot read this file from disk, stop and say so rather than working from the prompt.

---

Phase A — Rebuild the hole geometry

The holes read as bent roads with vaguely placed blobs, and hole 7 sits on top of the shed. Rebuild `holeShape.js` and the layout data around an explicit, repeatable anatomy.

Anatomy of a hole

Every hole is built from the same six pieces, in this draw order:

Perimeter — a long oval enclosing the whole hole. This is the rough. It follows the centreline and is capsule-shaped: rounded at both ends, not a rectangle with rounded corners.

Tee — a rectangle at the near end, inside the perimeter.

Fairway — a long slot running down the middle, from just past the tee to just short of the green. It may carry a single bend for variation. Its ends are rounded, not square.

Green — a bean shape or a circle at the far end. Vary it per hole: some circular, some kidney-shaped, some elongated. No two holes should have identical greens.

Bunkers — semicircles or bean shapes, two to four per hole, placed at the landing zone and greenside.

Centreline — a thin line drawn from the centre of the tee to the centre of the green, following the same bend as the fairway.

Then, on top:

Hole number — a cream disc with the number, sitting at the midpoint of the centreline. Not on the tee, not on the green.

Flag — planted at the centre of the green, on the far side from the tee.

```js
TEE_SIZE = { w: 34, h: 20 }
FAIRWAY_WIDTH = 58
GREEN_SIZE_RANGE = [58, 82]
BUNKER_SIZE_RANGE = [24, 42]
BUNKERS_PER_HOLE = [2, 4]
CENTRELINE_WIDTH = 2
HOLE_NUMBER_RADIUS = 20
```

Layout data

Keep the split that already exists — coordinates in `courseLayout.js`, geometry expansion in `holeShape.js`, drawing in `CourseMap`. Each hole recipe carries: tee position, green position, an optional bend point, a green shape variant, and bunker placements as a fraction along the centreline plus a side.

Placement rules, enforced by assertion

Add dev-mode assertions that fail loudly at startup:

No two hole perimeters may intersect.

No hole perimeter may intersect the shed footprint plus `SHED_CLEARANCE` (40). This is what hole 7 currently violates.

No hole perimeter may intersect the pond.

Every hole must sit fully inside the property boundary.

Move whichever holes need moving to satisfy these. The routing should still walk sensibly from green to next tee.

Gate

Every hole shows all six pieces, correctly layered.

Greens visibly differ in shape between holes.

The number disc sits at the midpoint of the centreline on every hole.

Flags sit on the far side of the green from the tee.

No hole touches the shed, the pond, another hole, or the boundary — and the assertions prove it.

At least three holes have a bend in the fairway and centreline.

---

Phase B — The sidebar, properly this time

This was specified in Round 3 and never built. The sidebar must reduce to four buttons plus a minimal summary.

Exact sidebar contents

Nothing else may live here.

Day — number, season, year.

Weather — today and tomorrow on one compact line.

Condition — the large turf-coloured number.

Four buttons — Turf, Office, Crew, Shed. Each opens a section screen that replaces the map pane.

Pinned footer — time bar, then Start day, then small Fit / Moisture / Sound icons.

Everything currently in the sidebar that is not on that list moves into a section. Surfaces, mowing settings, irrigation, pond, cash, budgets, satisfaction, disease, tournaments — all of it.

Turf section

The section that was never built. Tabs: Summary · Mowing · Irrigation · Bunkers · Pond · Presets.

Summary — every surface: quality, days since worked, moisture with staleness, disease pressure, current height and pattern, overdue flag. Plus the 7-day forecast strip.

Mowing — per surface height slider with the seasonal stress band marked, pattern picker, angle, auto-rotate, resulting minutes, pattern wear.

Irrigation — per surface policy, nightly draw estimate, moisture per green, hand-water targeting.

Bunkers — quality, days since raked, rake scheduling.

Pond — volume, health, aerator, recent mains spend.

Presets — the three shipped presets plus saved custom ones.

Clicking a surface on the map still opens the quick popover for one-click jobs at current settings. Detail lives in Turf.

Badges

Button	Badge	Dot
Turf	Overdue surfaces	Disease outbreak, surface out of moisture band
Office	Unread mail	GM meeting in 2 days, tournament decision open
Crew	Low morale or complaint waiting	Someone returning tomorrow
Shed	Machines down or out for service	New used stock, sale running, delivery arrived

Gate

The sidebar contains only the five items listed, and fits at 720px height with no scrolling on any day.

Turf opens as a full section screen with all six tabs.

No turf, pond, money or surface content renders in the sidebar.

All four badges and dots fire correctly.

Map quick-jobs still work without opening Turf.

---

Phase C — Start day, confirmation, and irrigation

Rename

The button still says End day. It becomes Start day everywhere — button, keyboard hint, any copy referencing it.

The confirmation step

Pressing Start day opens a confirmation before the playout runs. It exists to catch wasted time and to collect the night's irrigation.

The dialog shows:

Unused time — stated plainly when meaningful. "You still have 30 minutes unused." If the day is fully committed, say so instead.

The plan — every task, its worker, its machine, its minutes, in run order. Anything can still be removed here.

Anything skipped that is overdue — surfaces past their neglect threshold that got no job today.

Tonight's irrigation — the per-surface Off / Light / Full policy, editable in place. This is where the night gets planned.

The forecast — the next several days, prominently, because it is what the irrigation decision depends on. Rain tomorrow means tonight's water is wasted.

Then Start day confirms and runs the playout, or Back returns to planning.

Irrigation stops being something buried in a panel and becomes a decision the game asks you for every single day, with the forecast in front of you.

Gate

No "End day" string remains anywhere.

Start day opens the confirmation rather than running immediately.

Unused minutes are stated when any remain.

Overdue surfaces with no job today are listed.

Irrigation can be set for every surface from the dialog and applies that night.

The forecast is visible in the dialog.

Back returns to planning with the plan intact.

---

Phase D — Availability and priority

Unavailable workers

Anyone not working today must not be selectable. This covers the volunteer on their off days, anyone away at training, anyone off sick, and anyone whose morale has kept them home.

They still appear in the worker list, shown struck through with the reason — "Volunteer — not in today", "Sam — training, back day 34". They cannot be assigned, and a task cannot be planned against them.

Priority

Keep task ordering, but replace the up/down arrows with drag to reorder. The arrows are unclear about what they affect. Dragging a task in the plan list is self-explanatory, and the run order is what the playout follows and what gets dropped when autonomous interruptions overrun the day.

Show the run order plainly: numbered, top runs first, with a line explaining that the last task is the one dropped if the day overruns.

Gate

Unavailable workers appear struck through with a stated reason and cannot be selected.

No task can be assigned to an unavailable worker by any route.

Tasks reorder by dragging, and the new order persists.

The consequence of order is stated in the UI.

An overrun drops the last task in the list, matching what the UI says.

---

Phase E — Grace period

The opening is currently harsh enough to be discouraging. Give a new player room to learn the loop.

```js
GRACE_FINE_DAYS = 5          // days 1-5 are always Fine
GRACE_NO_STORM_DAYS = 10     // no storms or heavy rain before day 11
GRACE_NO_BREAKDOWN_DAYS = 10 // no machine breakdowns before day 11
GRACE_NO_DISEASE_SEASON = 1  // no disease pressure accrues in season 1
```

The forecast must reflect the grace period rather than showing storms that will not arrive.

After the grace window, everything behaves normally with no ramp — the player has had time to get their bearings and the game starts properly.

Gate

Days 1 to 5 are always Fine.

No storm or heavy rain occurs before day 11.

No breakdown occurs before day 11.

Disease pressure stays at zero throughout the first season and begins accruing in the second.

The forecast never shows weather the grace period will prevent.

Day 11 onward, and season 2 onward, behave exactly as before.

---

Out of scope

No changes to the mowing model, moisture model, machine claiming, or the acquisition system from Round 4. If a fix appears to need one of those changed, note it in `DECISIONS.md` and leave it alone.
