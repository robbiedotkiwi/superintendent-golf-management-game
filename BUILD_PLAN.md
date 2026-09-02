# Greenkeeper — Build Plan

A 2D browser game where you play a golf course superintendent. Written to be handed to Cursor as a single brief.

---

## How to use this document

Build the phases **in order**. Each phase has a **Gate** section listing conditions that must all be true before moving to the next phase. If a gate condition cannot be met, fix it before continuing — do not defer it, do not stub it, do not move on.

Anything marked **Not yet** in a phase must not be built in that phase, even if it seems easy. Building ahead is the main way this plan fails.

Where a number is given, use it. It is a starting value, not a final one — but do not substitute your own.

---

## Stack

- **Vite + React**, plain JavaScript with `.jsx` files. **No TypeScript.**
- **Tailwind CSS** for styling.
- **No backend, no database, no server.** Everything runs in the browser.
- **Save state in `localStorage`** under a single key, `greenkeeper.save.v1`.
- No routing library — one screen with view states.
- Only add a dependency if a phase explicitly calls for it.

Project structure:

```
src/
  main.jsx
  App.jsx
  data/
    constants.js      // ALL tunable numbers live here
    tasks.js
    equipment.js
    staff.js
    events.js
  engine/
    gameState.js      // state shape + reducer
    simulation.js     // end-of-day resolution
    assignment.js     // picks who does each task
    save.js
  components/
    CourseMap.jsx     // SVG
    ...
```

**Every balance number in this document goes in `src/data/constants.js` as a named export.** No magic numbers inside components or the simulation. This is a gate condition on every phase.

---

## The core fantasy

You are the only greenkeeper on a rundown nine-hole course. You have more work than hours. Every day you decide what gets done properly, what gets done quickly, and what gets skipped — and you live with it a week later.

The game is about **triage under time pressure**. Keep the money model simple and legible throughout.

---

## Visual direction

Ground the look in maintenance sheds and turf, not in dashboards.

**Palette** (name these in `constants.js`):

| Token | Hex | Use |
|---|---|---|
| `turf` | `#3E5C3A` | Primary surface, healthy grass |
| `turfStressed` | `#8A8748` | Degraded turf |
| `soil` | `#4A3B2E` | Panels, shed interior |
| `sand` | `#D8C9A8` | Bunkers, card backgrounds |
| `paint` | `#E8E4DA` | Body text on dark, line markings |
| `machineOrange` | `#D9541E` | Action buttons, time bar |

Dark, earthy base. The orange is the only bright colour in the game — spend it only on the time bar and primary actions.

**Type:** one family. Use a condensed grotesque with real presence (Archivo or Oswald via Google Fonts) for numbers and headings, regular weight for body. Numbers are the personality of this game — set the clock, the time bar and turf quality large and confident.

**Map rendering: SVG.** Each surface is a `<path>` or `<ellipse>` with its `fill` bound to quality and its own `onClick`. Do not use canvas — there is no render loop worth having here, and canvas would mean hand-writing hit detection. Do not use positioned divs — they cannot describe a fairway shape. Give each surface `tabIndex` and a visible focus ring so the map is keyboard navigable.

**Layout:** the course map is the hero and fills most of the screen. The day's remaining time sits as a persistent horizontal bar across the top, always visible, always the brightest thing on screen. Task selection slides in from the right when a surface is clicked.

**Avoid:** all-caps eyebrow labels, identical rounded cards for everything, arrows appended to button text, soft grey drop shadows on every panel. Panels should feel like painted metal and plywood, not SaaS cards.

**Copy:** plain and practical, the way a greenkeeper would say it. "Cut greens", not "Perform greens maintenance". Errors and empty states say what to do next.

---

# Phase 0 — Scaffold and state

**Build**

Vite + React + Tailwind running with `npm run dev`. Create `constants.js` with the palette and day-length constant. Create `gameState.js` exporting `initialState` and a reducer. Create `save.js` with `saveGame()`, `loadGame()`, `hasSave()`.

**The worker model matters here.** Even though the player starts alone, workers are an array from day one so that Phase 4 adds entries rather than restructuring state.

```js
{
  day: 1,
  season: 'spring',      // spring | summer | autumn | winter
  year: 1,
  cash: 8000,
  holes: 9,
  workers: [
    {
      id: 'player',
      name: 'You',
      speedSkill: 3,
      qualitySkill: 3,
      morale: 100,
      wage: 0,
      sprayCertified: false,
      isMechanic: false,
      isVolunteer: false,
      allowedSurfaces: 'all',
      availableFromDay: 1,
      minutesToday: 480,
      minutesUsed: 0,
      daysWorkedRunning: 0
    }
  ],
  surfaces: {
    greens:   { quality: 55 },
    tees:     { quality: 50 },
    fairways: { quality: 50 },
    rough:    { quality: 45 },
    bunkers:  { quality: 40 }
  },
  plannedTasks: [],       // { taskId, surface, level, workerId }
  log: []
}
```

The **time bar shown to the player is a single combined pool** — the sum of every available worker's remaining minutes. Assignment to a specific worker happens underneath, in `assignment.js`, and only surfaces in the UI when it matters (Phase 4).

Render a bare screen showing day, season, cash and combined minutes remaining. Add a **New game** and **Continue** entry screen.

**Gate — all must be true**

1. `npm run dev` starts with zero console errors and zero warnings.
2. The entry screen shows **Continue** only when a save exists.
3. Refreshing restores day, season, cash and all five surface quality values exactly.
4. **New game** clears the save and returns state to `initialState`.
5. `workers` is an array and the combined time pool is computed from it, not hardcoded.
6. Every number on screen traces back to a named export in `constants.js`.

**Not yet:** tasks, time spending, the course map, any simulation.

---

# Phase 1 — The day loop

The heart of the game. Do not proceed until it is genuinely fun to poke at.

**Build**

An SVG top-down course map: nine holes as simple shapes. Each hole has a green, tee, fairway and rough; three holes also have a bunker. Colour each surface by interpolating between `turfStressed` and `turf`.

Surfaces are managed as **five groups**, not 36 individual patches. Clicking any green opens the greens panel and the task applies to all nine greens.

| Surface | Tasks |
|---|---|
| Greens | Cut, Roll, Change cups |
| Tees | Cut |
| Fairways | Cut |
| Rough | Cut |
| Bunkers | Rake |

Each task is chosen at one of three **quality levels**:

| Level | Time multiplier | Base quality gain |
|---|---|---|
| Quick | 0.7x | +3 |
| Standard | 1.0x | +6 |
| Thorough | 1.4x | +10 |

Base task times, one worker, starting equipment, nine holes:

```js
TASK_MINUTES = {
  cutGreens: 120,
  rollGreens: 75,
  changeCups: 30,
  cutTees: 70,
  cutFairways: 150,
  cutRough: 180,
  rakeBunkers: 50
}
```

Total is 675 minutes against a 480-minute day. **This overload is deliberate.** The player must skip things from day one.

Adding a task decrements the pool and fills the time bar. A task that would exceed remaining time is shown but disabled, with the reason stated. Tasks can be removed to refund the time.

**End day** resolves:

- Planned tasks apply their gain, capped at the equipment ceiling (Phase 3; use a flat cap of 70 for now).
- Unworked surfaces decay by `DECAY_BASE = 8`.
- Asymmetric decay: below 50, multiply decay by `DECAY_ACCELERATION = 1.5`. Above 70, multiply gain by `GAIN_DIMINISH = 0.6`.
- Quality clamps 0–100.
- Advance day, reset worker minutes, clear planned tasks.

Show **Course condition**, a weighted average:

```js
CONDITION_WEIGHTS = { greens: 0.40, tees: 0.15, fairways: 0.20, rough: 0.10, bunkers: 0.15 }
```

An end-of-day summary lists what was done, what was skipped, and how each surface moved.

**Gate — all must be true**

1. Clicking each of the five surface groups opens its panel with the correct tasks.
2. Planning tasks visibly fills the time bar and the numbers add up exactly.
3. A task that does not fit is disabled and states why.
4. Removing a planned task refunds exactly the time it cost.
5. Ending the day applies gains and decay, and the summary matches the state change.
6. Surface colours on the map visibly change as quality moves.
7. Ten days without greens work drives greens below 20 and the map shows it.
8. Ten days of greens-only work leaves greens high and everything else visibly failing.
9. Quality never exceeds 100 or drops below 0.
10. Save and reload mid-plan preserves planned tasks and remaining minutes.

**Not yet:** seasons, weather, staff, equipment purchases, money changing, irrigation, tournaments.

---

# Phase 2 — Seasons, weather and growth

**Build**

Seasons of 30 days, cycling spring → summer → autumn → winter, then the year increments.

```js
SEASON_GROWTH = { spring: 1.2, summer: 1.4, autumn: 1.0, winter: 0.5 }
```

Growth scales **decay only**, so winter degrades slowly and leaves capacity for projects.

Daily weather, rolled each morning, with per-season probability tables:

| Weather | Effect |
|---|---|
| Fine | None |
| Overcast | None |
| Rain | Mowing unavailable today; decay as normal |
| Heavy rain | Mowing unavailable; bunkers lose an extra 10 quality |
| Storm | Mowing unavailable; a forced **Clear debris** task costing 90 minutes must be planned before anything else |
| Frost | Greens tasks unavailable until 10am — day starts 120 minutes short |

Show today's weather and tomorrow's forecast, the forecast being 70% accurate.

**Gate — all must be true**

1. Day 31 rolls to summer; day 121 rolls to year 2 spring.
2. Weather appears each morning and its stated effect applies.
3. On a rain day, mowing is disabled with the reason shown; rolling and cup changing still work.
4. On a storm day, nothing else can be planned until debris clearing is planned.
5. Frost days start with 360 minutes.
6. Winter decay is visibly slower than summer decay for an identical skipped surface.
7. The forecast is sometimes wrong and this is not treated as an error.

**Not yet:** irrigation, tournaments, staff.

---

# Phase 3 — Equipment and the shed

**Build**

A **Shed** view reachable from the course map.

**Which machine can cut what matters as much as its ceiling.** Big machines damage fine turf.

| Machine | Cost | Greens | Tees | Fairways | Rough | Ceiling | Time mult | Brand |
|---|---|---|---|---|---|---|---|---|
| Push rotary (owned at start) | — | yes | yes | yes | yes | 65 | 1.0x | — |
| Walk-behind reel | 4,500 | yes | yes | no | no | 80 | 0.85x | Toro |
| Ride-on reel (greens) | 22,000 | yes | yes | yes | no | 92 | 0.5x | Toro |
| Premium ride-on reel | 48,000 | yes | yes | yes | no | 97 | 0.4x | Toro |
| Large ride-on fairway unit | 30,000 | **no** | **no** | yes | yes | 88 | 0.35x | Toro |
| Rough/utility mower | 18,000 | **no** | **no** | yes | yes | 85 fairways / 90 rough | 0.45x | Ventrac |
| Greens roller | 9,000 | roll only | no | no | no | +4 to roll gain | 0.7x | Salsco |
| Autonomous mower | 35,000 | no | no | yes | yes | 85 | runs free | Nexmow |

Machines marked **no** are not offered for that surface at all, with a tooltip explaining they would damage the turf. The ceiling applied to a surface is that of the best machine the player owns which is permitted on it. The Ventrac is deliberately good at rough and merely acceptable on fairways.

**Wear and maintenance.** Reel machines gain `WEAR_PER_USE = 8` (scale 0–100) each day used. Above `WEAR_THRESHOLD = 60`, quality gain drops 30%.

- **Send away for grinding** — 400, unavailable 2 days, wear resets to 0.
- **Foley bedknife grinder** (15,000) — grind in-house, 90 minutes, no cash, no downtime.

**Breakdowns.** Daily chance per machine in use:

```js
BREAKDOWN_BASE = 0.005
BREAKDOWN_PER_WEAR = 0.0005   // so wear 100 gives ~5.5%
```

A broken machine is unusable until repaired: 120 minutes of worker time, or free and same-day once a mechanic is hired (Phase 4).

**Autonomous mowers** do their work without being planned, but generate **random interruptions** — 1 to 3 times a week, costing 10–40 minutes each, deducted automatically when the day resolves. If that pushes the day over, the **lowest-priority planned task is dropped** and reported in the summary. The player sets a priority order for their planned tasks; default order is the order they were added.

**Gate — all must be true**

1. Buying a machine deducts cash and immediately changes task times.
2. The capability matrix is enforced — a Ventrac is never offered on greens or tees, with a reason shown.
3. Ceilings apply per surface: with only the push rotary, greens cannot exceed 65 however many thorough cuts are done.
4. Wear accumulates with use and is visible in the shed.
5. A worn machine demonstrably produces smaller gains.
6. Sending a machine away makes it unavailable for exactly two days.
7. The Foley grinder offers the in-house option, costing 90 minutes and resetting wear same-day.
8. Breakdowns occur, block that machine, and can be resolved with 120 minutes.
9. Autonomous interruptions occur, deduct time automatically, and drop the lowest-priority task when the day overruns.
10. Cash cannot go negative — unaffordable purchases are disabled with the reason shown.

**Not yet:** staff, hiring a mechanic, irrigation, leasing.

---

# Phase 4 — Staff

**Build**

A **Crew** view. Hire from a rotating list of three candidates, refreshed each season.

**Skill is two separate axes**, each 1–5:

- `speedSkill` — scales time taken: `minutes x (1.3 - speedSkill x 0.1)`. A 5 is roughly 25% faster than a 3.
- `qualitySkill` — scales quality gain: `gain x (0.7 + qualitySkill x 0.1)`, plus randomness of ±20% at 1, falling to ±5% at 5.

A fast but sloppy worker and a slow perfectionist are both viable hires. Candidates should regularly be strong on one axis and weak on the other.

**Wages** are deducted daily. Each worker adds 480 minutes to the combined pool.

**Assignment** happens in `assignment.js`: each planned task goes to the best available worker permitted to do it, preferring `qualitySkill` for greens and tees and `speedSkill` for fairways and rough. The player can override per task. If no permitted worker is available, the task is disabled with the reason shown.

**Morale** drops if a worker exceeds `MORALE_SAFE_MINUTES = 420` in a day, or works more than six days running. Below 40 they slow down; below 20 they may not turn up. Morale recovers on days off.

**Volunteer.** From day 1, a volunteer arrives one day a week with 240 minutes, `allowedSurfaces: ['fairways', 'rough']`, wage 0. Default day is day 6 of each week; the player can change the day once per season.

**Training.** 5 days unavailable, costs 1,200, returns +0.5 to a chosen skill axis. Training is also how a worker becomes **spray certified**.

**Mechanic.** One candidate type. Makes repairs free and same-day, and halves wear accumulation.

**Early starts.** Setting a start before 6am adds 60 minutes to every worker but accumulates **neighbour complaints**. Three in a season triggers a GM warning; six triggers a 2,000 fine.

**Gate — all must be true**

1. Hiring adds minutes to the combined pool and daily wages leave the cash balance.
2. Assignment picks a sensible worker automatically and the player can override it.
3. A worker with high `speedSkill` completes the same task in visibly fewer minutes.
4. A worker with low `qualitySkill` produces lower and more erratic gains over ten days.
5. Working someone 480 minutes for seven straight days drops morale below 40 and slows them.
6. The volunteer appears weekly, cannot be assigned greens, tees or bunkers, and costs nothing.
7. A worker sent to training is unavailable for exactly five days and returns improved on the chosen axis.
8. Hiring a mechanic makes a breakdown repair cost zero minutes.
9. Early starts add time and accumulate complaints; six in a season deducts 2,000.

**Not yet:** spraying itself, irrigation, tournaments.

---

# Phase 5 — Irrigation and the pond

**Build**

**All water is measured in cubic metres (m³).** Pond capacity `POND_CAPACITY = 8000`, starting volume 6,000. Display as both a volume and a percentage.

Irrigation runs overnight, set as a nightly policy per surface: **Off / Light / Full**.

```js
IRRIGATION_M3 = {
  greens:   { light: 12, full: 25 },
  tees:     { light: 7,  full: 15 },
  fairways: { light: 60, full: 120 }
}
SEASON_WATER = { spring: 1.0, summer: 1.6, autumn: 0.7, winter: 0.2 }
```

Rough is never irrigated.

Pond refills: `GROUNDWATER_M3 = 20` per day, rain adds 150, heavy rain or storm adds 400.

If the pond cannot cover the night's draw, the shortfall comes from mains at `MAINS_COST_PER_M3 = 2.5`, straight out of cash and itemised in the summary.

Under-watering in summer adds extra decay, heaviest on greens. **Hand watering** is a task (60 minutes, greens) that offsets a shortfall without using pond water — the way out when the pond is low and cash is tight.

**Pond health** 0–100, separate from level. Falls in summer and when the pond sits low. Low health reduces golfer satisfaction (Phase 7). An **aerator** (6,000) holds health up and is drawn on the map.

**Gate — all must be true**

1. Irrigation policy is set per surface and persists between days.
2. Pond volume is in m³, drops overnight, and drops faster in summer than winter.
3. Rain raises the pond volume.
4. A shortfall draws mains water, deducts cash at 2.5 per m³, and is itemised in the day summary.
5. Turning irrigation off in summer produces obvious extra decay on greens within five days.
6. Hand watering prevents that penalty and costs 60 minutes.
7. Pond health declines when the pond sits low; buying an aerator holds it up and changes the map.

**Not yet:** spraying, fertiliser, disease.

---

# Phase 6 — Spraying, fertiliser and disease

**Build**

Two tasks, available only to a **spray-certified** worker. The player starts uncertified — this is a real bottleneck.

- **Spray fungicide** — 90 minutes, 600 materials, suppresses disease pressure for 14 days.
- **Apply fertiliser** — 75 minutes, 450 materials, raises the treated surface's ceiling by 5 for 21 days. Branded **Plant Fitness**.

**Disease pressure** 0–100, rising in warm wet conditions, faster in summer and on under-watered turf. Susceptibility differs sharply by surface:

```js
DISEASE_SUSCEPTIBILITY = {
  greens:   1.0,
  tees:     0.35,
  fairways: 0.35,
  rough:    0
}
```

Greens are the constant worry, tees and fairways an occasional nasty surprise, rough never affected. Pressure is tracked per surface and reduced by recent spraying.

Above 60 pressure an outbreak becomes likely: the surface loses 25 quality immediately and 5 per day until sprayed.

Certification comes through training — 5 days away and 1,200. If your only certified worker is at training when pressure peaks, you are stuck. That is the intended tension.

**Gate — all must be true**

1. Spray and fertiliser tasks do not appear when no available worker is certified, with the reason shown.
2. Sending someone to certification unlocks the tasks on their return.
3. Disease pressure is tracked per surface and visible.
4. Greens reach outbreak thresholds far more often than tees or fairways; rough never does.
5. An outbreak causes a visible 25-point drop and ongoing daily loss.
6. Spraying stops the loss and suppresses pressure for 14 days.
7. Fertiliser raises the ceiling by 5 for 21 days, then expires.
8. Materials costs leave the maintenance budget.

---

# Phase 7 — Money, communications and satisfaction

**Build**

**Two budgets, tracked separately.**

- **Maintenance budget** — granted each season. Covers wages, materials, repairs, mains water, fines.
- **Capital budget** — granted each year. Covers machine purchases, leases and course projects.

```js
MAINTENANCE_BASE = 12000    // per season
CAPITAL_BASE = 40000        // per year
maintenanceBudget = MAINTENANCE_BASE * (0.5 + satisfaction / 100) * gmStandingMultiplier
capitalBudget     = CAPITAL_BASE * (0.5 + satisfaction / 100) * gmStandingMultiplier
```

Satisfaction and GM standing are both 0–100 and both start at 50. `gmStandingMultiplier` runs 0.6 at standing 0 to 1.4 at standing 100.

Unspent maintenance budget rolls into cash at season end. Unspent capital budget does not roll over — spend it or lose it.

**Leasing.** Any machine can be leased instead of bought, at `LEASE_RATE = 0.10` of its purchase price per season, charged to the maintenance budget rather than capital. No deposit. Stop paying and the machine goes back. Leasing is how a cash-poor player gets a ride-on early.

**Raising cash.** Two options when short:

- **Snap tournament** — call one at short notice. Available any time, but the course gets no preparation window and the result is scored as normal, so a poorly conditioned course will embarrass you.
- **Loan against next season** — borrow up to `LOAN_LIMIT_MULTIPLIER = 2` times last season's total revenue, at 10% interest, repaid from next season's budget.

**Solvency.** Checked at each season end. Being in the red at season end is survivable once — the GM notes it. Two consecutive insolvent season ends and you are dismissed. That is the lose condition.

**Inbox**, with an unread count on the main screen.

- **Golfer emails** generated from the worst-performing surfaces — slow greens, unraked bunkers, long rough.
- **GM emails** — requests, complaint warnings, budget notices, solvency warnings.
- **Weekly GM meeting** — every 7 days, costs 60 minutes of the player's own time. Skipping is allowed but costs GM standing.

**Golfer satisfaction** moves slowly toward course condition, modified by pond health and unresolved complaints.

**Gate — all must be true**

1. Maintenance and capital budgets are tracked separately and the right costs hit the right one.
2. Unspent maintenance rolls into cash at season end; unspent capital does not.
3. A machine can be leased, charged per season to maintenance, and repossessed if unpaid.
4. Neglecting bunkers for a week produces bunker complaint emails.
5. The GM meeting appears every 7 days, costs 60 minutes, and skipping lowers GM standing.
6. Satisfaction tracks course condition with a lag, not instantly.
7. A high-satisfaction save receives visibly more budget than a low-satisfaction one.
8. A loan is capped at twice last season's revenue and is repaid from next season's budget.
9. Two consecutive insolvent season ends triggers dismissal and a game-over screen.

---

# Phase 8 — Tournaments

**Build**

At the start of spring, summer and autumn the player chooses how many tournaments to host: **0, 1, 2 or 3**. Winter offers one optional tournament, flagged as risky. Dates are announced at selection so the player can plan backwards.

On the day, the course is scored weighted heavily toward greens:

```js
TOURNAMENT_WEIGHTS = { greens: 0.55, tees: 0.15, fairways: 0.20, bunkers: 0.10 }
```

| Result | Score | Payment | Satisfaction |
|---|---|---|---|
| Excellent | 85+ | 18,000 | +12 |
| Good | 70–84 | 12,000 | +6 |
| Acceptable | 55–69 | 7,000 | 0 |
| Poor | Below 55 | 3,000 | −15 |

Rain on the day caps the result at Acceptable — the winter tournament risk made real.

Preparation tasks unlock in the 3 days before: double-cutting greens, extra rolling, bunker edging. Expensive in time, meaningful in score.

The GM may also **request** a tournament. Declining costs GM standing.

**Gate — all must be true**

1. The season-start screen offers the count choice and shows the chosen dates.
2. A countdown to the next tournament is visible on the main screen.
3. Tournament day scores on the tournament weights, not the normal ones.
4. Each band pays and moves satisfaction exactly as tabled.
5. Rain on the day caps the result at Acceptable.
6. Preparation tasks appear only in the 3 days before and demonstrably raise the score.
7. Winter tournaments are offered, flagged as risky, and frequently go badly.
8. Snap tournaments from Phase 7 use the same scoring with no preparation window.
9. GM requests appear in the inbox and declining lowers GM standing.

---

# Phase 9 — Course expansion

**Build**

Capital projects, funded from the capital budget, taking real time:

- **Expand to 18 holes** — 180,000, built over 60 days. All task times roughly double. Offered only above 70 satisfaction.
- **Driving range** — 60,000. Adds a daily ball-picking task (45 minutes), or an autonomous picker (25,000) reducing it to 10 minutes.
- **Additional bunkers, new tees** — smaller projects that raise the condition ceiling but add ongoing work.

Projects are best scheduled in winter. Do not enforce this — let the player discover it.

**Gate — all must be true**

1. The 18-hole project is hidden below 70 satisfaction and offered above it.
2. Committing deducts from the capital budget and shows a completion date.
3. On completion the map shows 18 holes and task times increase accordingly.
4. The driving range adds a daily task planned like any other.
5. The autonomous picker reduces it to 10 minutes.
6. A project started in summer is visibly harder to absorb than one started in winter.

---

# Phase 10 — Polish

**Build**

- Title screen and a short, unpatronising tutorial covering the time budget and the first day.
- **Year in review** at each year boundary: condition graph, tournament results, money spent, staff retained.
- Sound: mower engine on task completion, birdsong on fine mornings. One toggle, off by default.
- Map animation only when something changes — a mower crossing a fairway as a task resolves.
- Keyboard support for planning, visible focus states, `prefers-reduced-motion` respected.
- Save versioning so future changes do not break existing saves.

**Gate — all must be true**

1. A new player can reach the end of day 1 without reading anything outside the game.
2. The year in review shows accurate historical data.
3. Sound toggles cleanly and defaults to off.
4. The game is playable to day 120 with no console errors.
5. `prefers-reduced-motion` disables non-essential animation.
6. An old save either loads or is migrated, never silently corrupts.

---

## Balance targets

Sanity-check the whole build against these:

- A competent player alone on nine holes should reach roughly 70 course condition by day 30 and stall there — the equipment ceiling should be the wall.
- The first hire should feel necessary by around day 45.
- Summer should be the hardest season by a clear margin.
- Ignoring irrigation in summer should cost you the greens within two weeks.
- Reaching 18 holes should take at least two in-game years.
- A player who never leases and never borrows should find the mid-game slow but survivable.

---

## Things deliberately excluded

Do not build these. They were considered and cut to keep the game about turf and time:

- Clubhouse management, food and beverage, pro shop
- Individual golfer characters or relationships
- Detailed financial reporting or P&L
- Multiplayer or online features
- Per-hole individual surface management
