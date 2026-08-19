# Life Balance Index — Personal Wellbeing Assessment

A formal, static self-assessment dashboard. Complete a scientifically-grounded baseline
assessment, then check in ONCE A WEEK with rough measured quantities to track eight life
aspects, see A–F grades and a single Balance Index, level up each birthday, and keep
weekly pledges — no daily
logging ritual. Pure static HTML/JS/CSS — no build step, no backend; all data lives in
your browser's localStorage.

> **Live at [lbi.plainpoint.net](https://lbi.plainpoint.net/)**
> (repo [`SEEHIGHxb/LifeBalanceIndex`](https://github.com/SEEHIGHxb/LifeBalanceIndex), formerly *LifeQuest*).
> Internal storage keys, the export filename prefix, and the `LQ1-` comparison-code
> prefix keep the legacy `lifequest`/`LQ1` names for backward compatibility.

Bilingual: the whole UI switches between **English and Thai (ไทย)** with the header
toggle — surveys, benchmarks, recommendations, goals, and toasts included. Thai text is
set in Sarabun.

## Features

- **Baseline assessment (6 steps)** using validated instruments — every field
  starts blank with a required `*` and must be answered (no pre-filled defaults),
  so each aspect reflects answers you actually gave; the monthly re-assessment and
  in-depth assessment are blank-first too:
  - Finance: CFPB Financial Well-Being (5 items) + income standing on a log scale
    anchored at the published LFS average wage and the Revenue Department's top
    tax band (Bangkok/Provinces) + savings, entered in baht
  - Physical: IPAQ MET-minutes, Asian BMI bands, sleep quality + duration, nutrition
  - Mental: ST-5 (Thai DMH stress index) + WHO-5 Well-Being Index
  - Relationships: LSNS-6, UCLA Loneliness (3-item), RAS (couples only)
  - Personal Goals: GSE-6 self-efficacy, Grit-S, learning habits
  - Social Contribution, Environment (GEB), and Humanity's Future (long-term index)
- **Weekly Review**: one prefilled form per ISO week reports rough averages
  (activity days/minutes, sleep, water, vegetables, learning hours, plastics,
  savings rate; donations/volunteering monthly). The reported quantities
  replace last week's values inside the same cited scoring formulas, so
  behavior-driven scores move exactly as much as the measured change implies
- **Society benchmarks**: each aspect shows your approximate percentile against
  published population statistics (NSO income/wages, Thai physical-activity
  surveillance, WHO-5 community norms, DMH ST-5 bands, UCLA-3/LSNS-6 samples,
  GSE 25-country norms, CAF World Giving Index, Thai plastic-use and pension
  coverage data) — every number cites its source in the UI, and estimates are
  labeled as estimates
- **Dedicated aspect pages** (`#/aspect/physical`, ...): percentile gauge vs
  society, component breakdown (e.g., Physical → Activity / Body / Sleep /
  Nutrition), trend chart of weekly snapshots, and a "Measured Weekly" card
  naming which review fields feed that aspect — reachable by clicking any
  aspect on the Overview
- **Personalized recommendations**: a rule-based engine targets your weakest measured
  components and adapts the advice to your profile — region (Bangkok transit vs
  upcountry), employment status, and relationship status — on the Overview
  (top 3) and on every aspect page
- **Weekly pledges**: up to 6 quantity targets chosen from 10 measurable
  templates ("average ≥2 L water/day", "≤2 plastics/day", "≥600 MET-min");
  every pledge is auto-graded by the weekly review — streaks tracked, fixed
  per-template points, nothing to log day to day
- **Monthly re-assessment**: every 28 days the short instruments (WHO-5, ST-5,
  UCLA-3, GSE-6, RAS for couples) re-run and recalibrate the survey-based
  aspects — shifts are capped at ±15 per re-assessment, with a small bonus for
  consistent weekly reviews (the hybrid scoring model)
- **Weekly snapshots** of all aspect scores, drawn as trend lines on aspect pages
- **Profile & Data page**: a header **Profile** button opens an editor for the
  slow-moving facts about you — name, age, gender, region, employment,
  relationship status, income, height/weight, digital literacy, long-term
  investments, and birthday. Score-affecting edits (income, region, age, body,
  investments) are re-measured through the same cited formulas onboarding uses
  and applied as deltas, so accumulated check-in/deep/weekly adjustments survive.
  Gender and employment move only benchmarks and recommendations; a
  relationship-status change refines the relationships score at the next monthly
  check-in. Day-to-day quantities stay in the Weekly Review, not here
- **Connected sources**: two sibling apps of ours — **Midori** (a ledger) and
  **Runaway** (a run tracker) — are served from the same origin, so they can hand
  aggregate facts over through `localStorage` with **no network request, no
  account, and no change to `default-src 'self'`**. Each source app writes; this
  app only reads, and only when switched on at *both* ends. What arrives
  pre-fills the matching weekly-review boxes with a source chip and the window it
  covers, for you to confirm or correct — never applied to a score behind your
  back, and never overwriting an answer you gave (someone who runs *and* swims
  raises the number themselves). The payload is treated as untrusted input: shape,
  version, timestamp and every number are validated, and no string it contains is
  ever rendered, so the XSS surface does not exist rather than being escaped. A
  run log covering the wrong week, or a ledger older than 35 days, is reported as
  stale and never used
- **Backup**: one-click JSON export / import, on the Profile & Data page
- **Hash routing** (`#/dashboard`, `#/review`, `#/aspect/<key>`, `#/checkin`, ...) — browser back/forward work
- **Radar chart**: dependency-free SVG rendering of the 8 aspects
- **Shareable story card**: exports the radar as a 1080×1920 PNG for Instagram
  Stories and the like, drawn on a canvas (an SVG rasterised through an `<img>`
  loses both the CSS custom properties and the self-hosted fonts). You choose
  light or dark and how much is legible — shape only, shape plus aspect names,
  or everything including scores and grades — and the sheet is candid that
  Instagram cannot accept a post directly from a website, so the image goes out
  through the system share sheet or a download
- **Side by Side (comparison codes)**: share your `LQ1-...` code with others
  and paste theirs to lay your eight aspects out beside theirs — a code carries
  only a name and the eight aspect scores (no age, no points); no backend, no
  accounts. Codes shared before v2.0 still decode. **Deliberately not a
  leaderboard**: no rank, no tier, no ordering by score, and no sample
  profiles. Every cell is marked against the *population* average, which is the
  comparison this app is actually about; a friend's column is there to show you
  where you differ, not who is ahead
- **Age as level, seasonal XP**: your level is simply your age (a fact, not a
  claim), ticking up on your birthday. XP accrues within each level-year and
  resets at the birthday, with every closed year filed to a season archive — the
  dashboard shows a pace bar, not a climb to an arbitrary next level
- **Letter grades + Balance Index**: each aspect gets an A–F grade from its
  cited population percentile (personal pages only, never on a shared code), and
  a single **Balance Index** — the harmonic mean of your eight aspects'
  population-relative standings, where 50 is the average person — summarises
  overall balance. Rescaling against the population average means an aspect the
  whole population scores low on (like social contribution) no longer anchors
  your balance down. The *Add a Pledge* catalog leads with pledges for your
  lowest-graded aspects
- **Built for a phone, not shrunk onto one**: below 640px the app switches to a
  mobile layout — a fixed bottom tab bar within thumb reach at any scroll
  position, the radar and Balance Index first, and the action prompts reduced to
  a single "next step" with the rest demoted to compact rows. Form fields are
  16px because iOS Safari zooms anything smaller on focus, every tap target
  clears 44px, and nothing is set below 12px. The desktop layout is deliberately
  unchanged by it
- **PWA**: installable with offline support — a network-first service worker
  always serves fresh files online and the cached shell offline
- **Bilingual (EN / ไทย)**: a header toggle re-renders the whole app in
  English or Thai and remembers the choice (in its own localStorage key, so
  it survives a data reset). Every user-facing string — survey items, benchmark
  summaries, recommendations, goals, and toasts — is translated; literature
  citations stay in English on purpose
- **Guidance assistant**: contextual, neutrally-worded tips targeting your weakest aspect

## Run locally

ES modules require a web server (opening `index.html` via `file://` will not work):

```bash
npm start            # http-server on http://localhost:8123
# or
python -m http.server 8123
```

## Tests

```bash
npm test             # node --test (requires Node 18+)
```

Covers the scoring functions, points/leveling, the weekly-review shift math and
pledge grading, and localStorage schema migration (including v3 → v4).

## Deploy

CI (`.github/workflows/ci.yml`) runs the test suite on every push and PR, and
deploys the repo root to GitHub Pages on every green push to `main` (the
workflow enables Pages automatically on first run). Any other static host
works too — publish the repo root as-is.

When releasing, bump both cache busters together: the `?v=N` query on the
entry points in `index.html`/`app.js` and `CACHE_NAME` in `sw.js`.

## Design

Formal / academic look: warm-paper background (`#f7f5f0`), white cards, muted
borders, navy primary (`#24344d`) with a restrained burgundy accent (`#6d2e3f`).
Headings are set in **Source Serif 4**, body text in **Inter**, and Thai in
**Sarabun**; numeric readouts use a monospace stack. Flat surfaces, thin borders,
~4px radii — no gradients, glows, or text-shadows.

## Project layout

| File | Responsibility |
|------|----------------|
| `index.html` / `index.css` | Shell and formal design system |
| `app.js` | Coordinator: navigation, toasts, level-up modal, guidance assistant |
| `state.js` | `GameStateManager`: persistence, migration, scoring, goals, points |
| `benchmarks.js` | Population percentile benchmarks with cited sources |
| `aspects.js` | Per-aspect detail: component breakdowns and trend series |
| `suggestions.js` | Rule-based, profile-aware recommendation engine |
| `comparison-code.js` | Shareable comparison codes (name + aspect scores) for real peer comparison |
| `i18n.js` / `th.js` | EN/TH localization layer and the Thai dictionary |
| `sw.js` / `manifest.webmanifest` | PWA: offline service worker and install manifest |
| `surveys.js` | Survey instrument question banks and option scales |
| `ui.js` | View rendering: onboarding, dashboard, weekly review, pledges, peer comparison |
| `chart.js` | SVG radar chart renderer, and the shared `radarPoints` geometry |
| `story-card.js` | Canvas renderer for the 1080×1920 shareable story card |
| `tests/` | Node test suite for assessment/scoring logic |
