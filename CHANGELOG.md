# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Two version numbers, on purpose

- **`APP_VERSION`** (`version.js`, currently `42`) is a monotonic **cache-bust
  counter**, not semver. It appears in the `?v=N` query on every versioned
  asset and in the service worker's `CACHE_NAME`. Bump it on *any* release that
  changes a shipped file. `tests/consistency.test.mjs` fails CI if the sites
  disagree.
- **`package.json` `version`** is semver for the project as a whole. The
  package is `private` and never published, so this is documentation only.

They are deliberately independent: a one-character CSS fix needs a cache bust
but not a minor version.

## [2.9.1] — 2026-07-31 (APP_VERSION 42)

### The aspect board stops naming the norming country

Two aspects are ranked against foreign samples, and since v39 they said so on
the aspect card itself: mental read *"German adults aged 35-44"*, personal goals
read *"adults in the 25-country GSE norms"*. Those labels are accurate, and they
are staying accurate — but on the card they were the loudest words present, and
a Thai reader cannot do anything with them. Naming Germany at the point of the
claim was noise, not disclosure.

The board now says **"adults in the reference sample"**, or **"adults aged 35-44
in the reference sample"** where the age band applies.

**Deliberately not "general adults".** The obvious neutral word would assert
that the comparison group is the general population — a *stronger* claim than
the one being removed, and a false one. "The reference sample" says exactly what
is true: there is a specific sample, it is named elsewhere, and this is not a
claim about people in general.

**Nothing was hidden.** The methodology page still names Kliem et al. 2025, the
representative German sample, the by-age-band table, the 25-country GSE pool and
its N=19,120, and still says in full that being compared with Germans your own
age is more precise but no more relevant to life in Thailand. Three assertions
in `tests/methodology.test.mjs` pin those strings and were untouched. A new test
in `tests/who5-norms.test.mjs` asserts the inverse — that no board-facing
population, summary or note names the norming country — so the split cannot be
undone by accident.

**Thai-sourced populations stay named** ("Thai adults", "Thai workers", "Thai
employees"). The asymmetry is deliberate: naming Thailand tells this app's
reader something they can use, and naming Germany does not.

### Not changed

No score, percentile, grade, Balance Index value or comparison code moves. This
is a string release: `benchmarks.js` labels, their Thai counterparts, one
relaxed and one added test assertion, and the version sites. No schema change,
no migration.

## [2.9.0] — 2026-07-30 (APP_VERSION 41)

### The mental percentile is now read from a table, and read by age band

The WHO-5 study this app has cited since v26 — **Kliem et al. 2025, *Frontiers
in Psychology* 16:1592614, doi:10.3389/fpsyg.2025.1592614**, N=2,515,
representative German sample fielded June–October 2021 — publishes more than the
mean and SD the app was using. Its **Table 2 gives the full cumulative percentile
distribution, broken down by age band** (16-24, 25-34, 35-44, 45-54, 55-64,
65-74, 75+). This release reads that table instead of approximating it.

**Why that matters: the old number was wrong, not merely imprecise.**
`normalCdf(score, 67.56, 22.96)` assumed the WHO-5 is normally distributed. It is
not — the same paper reports **Skew = −0.90**. At a score of 68/100 the normal
approximation returned about the **51st** percentile; the study's own pooled
column says **42.4**. That is an ~8-point error sitting in the middle of the
range, where most people are.

**And the age effect is large.** A score of 60/100 is the **20.3rd** percentile
among 25-34 year olds and the **59.7th** among the over-75s — a ~40-point swing
that the pooled figure erased. Mental well-being was being compared against the
wrong people in a way that had a measurable size.

**Nothing is interpolated, fitted, or inferred.** A WHO-5 sum is an integer 0–25
and the app's 0–100 score is that × 4, so *every* score the app can produce —
0, 4, 8 … 100 — is a printed row of Table 2. This is the first benchmark in the
file that reads a published number straight out and does no arithmetic on it at
all. It is also why the new method is called `norms` rather than reusing
`distribution`: there is no longer any distributional assumption to name.

**Its uncertainty band was deliberately not narrowed** (still ±6, ±3 when
verified). Sampling error is no longer the dominant error term — the
German-versus-Thai population mismatch is, and no margin captures that. A tighter
band would be precision theater about the wrong quantity.

### Grades can move without anyone answering anything

`benchmarks.js` states a principle: *"A grade must only move when the person's
own answers move it."* **This release deliberately breaks it for one aspect.**
The mental percentile changes for every user, so the mental grade can change, and
grade-driven pledge ordering can reorder with it.

That principle exists to stop grades drifting when band geometry is adjusted for
convenience. This is the other case: the old rank was **measurably wrong by ~8
points at the mode**, and the replacement is read from the same study's own
table. Correcting a wrong rank is the one legitimate reason to move a grade, and
it is stated here rather than buried. Concretely, the pinned test fixture at
WHO-5 68/100 with no age recorded moves from the **50th percentile to the 42nd**.

**Nothing else moves.** Proved by test, not asserted: the eight 0–100 scores,
`AVERAGE_ASPECT_SCORES`, the Balance Index, the at-or-above-average tally and
comparison codes are all byte-identical to v40 — one test holds the scores fixed,
varies only age, and checks each of them. **v2 comparison codes stay valid. No
migration, no schema bump.**

### Three published cells were repaired, and it is documented

Because Table 2's values are unsmoothed empirical distributions, its pooled
column must equal the count-weighted mix of the paper's own supplementary male
and female tables — an exact identity for this kind of data. It holds on **179 of
182 cells** to within 0.30. Three cells fail it badly, and each is an exact
duplicate of the cell above it in its own column: a cell-duplication error in
production. The worst, at score 80 in the 55-64 band, is off by **18.7 percentile
points** at the single most-populated cell in the table — large enough to be a
grade error on its own.

The reconciled values are stored, with the printed value, the corrected value and
the evidence recorded inline beside each one and pinned by test so nobody
"corrects" them back. No erratum has been published by the journal.

### A factually wrong comment, corrected

The relationships benchmark argued the direction of its UCLA-3 bias from a claim
that loneliness is U-shaped across the lifespan. Two Meta-Gallup datasets
contradict it: the 2022 seven-country pilot found *no* notable age relationship in
four countries and found the over-65s **less** lonely in the other three, and the
2023 global release (142 countries) reports 27% lonely at 19-29 against 17% at
65+. The direction of the error is **unknown**, not U-shaped. Relationships stays
unranked — the objection that actually holds is the population and response-scale
mismatch, which never needed the U-shape.

### Honest labelling

Age-banding a German norm makes the claim *"the average German your age"*, not
*"the average human"*. That is strictly better and it removes a real error, but it
does not make the reference population any more relevant to life in Thailand. The
methodology page and the aspect page both say so in as many words. The
improvement is in precision, not in relevance, and the copy is not allowed to
blur the two.

### Changed

- `benchmarks.js`: `WHO5_PERCENTILE_TABLE` (26 × 8, frozen, with the citation,
  the verbatim caption and note, the fieldwork dates and the errata record);
  `who5AgeBand()`; `mentalBenchmark(profile, baseline)`; new `norms` method in
  both margin tables; `WHO5_POPULATION_LABELS` as a literal-keyed map so the
  age-band names are visible to the i18n scanner.
- `benchmarks.js`: **a shared float bug**, found by the new tests. `toPercentile`
  did `Math.round(p01 * 100)`, so a value of 28.5 round-tripped through `/100` to
  28.4999… and rounded **down**. Split out `clampPercentile()` for values already
  on 0–100. No other benchmark changes value.
- `benchmarks.js`: the raw WHO-5 is snapped to 0–25 before the lookup. A lookup
  can miss where a formula could not — a hand-edited import carrying `17.5` would
  have indexed a non-existent row and taken the whole dashboard down.
- `views/methodology.js`: the mental provenance row names the table and the age
  band, with a new "Ranked from a published table" claim distinct from a fitted
  rank, plus a paragraph on what the age band does and does not buy.
- `views/helpers.js`: `methodTag()` gains `norms`, kept distinct from
  `distribution`.
- `th.js`: the age-band population labels, the reworded note, and the new
  methodology copy; the retired pooled-norm string pruned.
- `tests/who5-norms.test.mjs` (new, 18 tests) — table integrity and transcription
  guards, the three errata pinned, age routing at all 14 boundaries, the
  normality defect documented so reinstating `normalCdf` fails, and the
  blast-radius proof. `tests/benchmarks.test.mjs` and
  `tests/methodology.test.mjs` amended. **348 tests.**

## [2.8.0] — 2026-07-30 (APP_VERSION 40)

### Guideline checks — comparison that needs no norming sample

v39 established that no representative Thai general-adult norm is published for
any of the twelve instruments here, and said so on every surface. That left a
real question unanswered: if a percentile can't be trusted for some aspects,
what *can* be compared?

This release answers it with a second, independent kind of comparison. A **norm**
describes what people do and needs a sampled population. A **criterion** — a
published guideline — states what a body needs and needs no sample at all. That
is why a WHO recommendation applies to a Thai user without the cross-cultural
problems that make pooled questionnaire norms invalid rather than merely
unavailable (reference-group effect, response-style differences, no measurement
invariance — more data cannot fix any of those).

The pattern was already here in miniature: `relationshipsBenchmark` has used the
LSNS-6 `< 12` cutoff since v39 precisely because it is the instrument's own
published threshold rather than something derived from a sample. This
generalizes it.

**Six checks**, each verified verbatim at its primary source on 2026-07-30:

| Check | Guideline | Source |
|---|---|---|
| Aerobic activity | 150 min moderate or 75 min vigorous per week, or a 2:1 mix | WHO 2020 |
| Muscle strengthening | 2+ days/week | WHO 2020 |
| BMI | under 23.0 — the Asia-Pacific line | WHO WPRO |
| Sleep | 7–9 h, or 7–8 h from 65 | NSF (Hirshkowitz et al. 2015) |
| Fruit and vegetables | 400 g/day ≈ 5 portions | WHO healthy diet |
| Well-being | above 50/100 on WHO-5 | Topp et al. 2015 |

### The additive contract

Criteria feed **nothing**. Not scores, not percentiles, not grades, not the
Balance Index. `grades.js` derives every grade from a percentile and documents
why mixing bases is refused — *"falling back to the raw score would grade three
aspects on a different basis from the other five."* "Meets the WHO activity
guideline" and "top 30% of Thai earners" are not the same kind of claim, so a
criterion must never become a grade.

Consequently this release needs **no schema change, no migration and no
recalibrated bands**. `tests/criteria.test.mjs` pins `AVERAGE_ASPECT_SCORES` and
a fixed-profile Balance Index to their v39 values, so any future coupling to
scoring fails loudly instead of silently moving every user's grade.

`unmeasured` is a first-class status alongside met/unmet, following the same rule
as the v39 UNRANKED state: the app never having asked is different information
from the user falling short, and collapsing the two would invent a verdict.
Strength-training days are `unmeasured` today — the weekly review has no field
for it yet, and the criterion reads `profile.weeklyStrengthDays` defensively so
adding one needs no change in `criteria.js`.

### Two defects this surfaced and fixed

- **The BMI note showed the wrong line to Thai users.** `benchmarks.js` reported
  whether BMI was under **25** while `averages.js:45` was already reasoning on
  the *Asian* band — the codebase knew the right cutoff in one file and
  displayed the wrong one in another. A user at BMI 24 was told they were below
  the line; the WHO Western Pacific classification puts overweight at **23.0**
  because cardiometabolic risk rises earlier in Asian populations. The note now
  states the 23.0 line, and keeps the Thai NHES share pinned to the `>= 25`
  figure it actually measures as a separate clause — no verified Thai share at
  `>= 23` exists, and interpolating one would be inventing data. Note text only;
  no percentile changed.
- **The vegetable pledge default undershot the guideline it cites** — 3
  portions/day against WHO's 400 g ≈ 5. Now 5. Prefill only: `veg` is not in
  `createDefaultPledges()`, `min` still admits every previously-valid target, and
  pledge XP is fixed, so no stored pledge is invalidated.

### Deliberately excluded, and said so on the methodology page

- **Water.** EFSA's 2.0 L / 2.5 L adequate intake is *total* water including
  moisture from food, while the app measures drinking water. Citing it would
  repeat the plastics per-day/per-week unit error this project already fixed
  once. The 2 L pledge is labelled a convention, not a guideline.
- **Sedentary time.** WHO says only "limit" it, with no number — nothing to pass
  or fail.
- **Finance, social contribution, environment, humanity's future.** No
  institution publishes a per-person threshold. What counts as enough income or
  enough giving is local, so these keep their Thai norms and two-stage bands.
- **Fruit.** The guideline covers fruit *and* vegetables; the review asks only
  about vegetables, so the check is stricter than WHO intends. Disclosed in the
  detail line and on the methodology page rather than papered over.

### Two test-guard gaps found while doing this

Both are pre-existing and now closed or documented:

- `tests/i18n-coverage.test.mjs` scans a **hand-maintained** file list, so a new
  root module carrying `t()` literals escapes it silently. `criteria.js` proved
  it — none of its ~20 strings were flagged on the first run. Added to the list,
  with a comment saying to do the same for future modules.
- The literal scanner's regex only matches a string sitting *directly* after
  `t(`/`tp(`, so `tp(bmi < 23 ? "…" : "…")` in `benchmarks.js` is **invisible**
  to it. Those two BMI strings are maintained by hand in `th.js` and carry a
  comment saying so — if the English changes without the Thai, Thai mode falls
  back to English with no test failure.

### Files

- **New** `criteria.js` (~300 lines, pure: no DOM, no storage) — six criteria,
  `CRITERION_STATUS`, `evaluateCriteria`, `criteriaForAspect`, `criteriaTally`.
- **New** `tests/criteria.test.mjs` — every threshold at its boundary
  (149/150 moderate, 74/75 vigorous, the 2:1 mix, BMI 22.98/23.01, sleep
  6.9/7/9/9.1 and the 65+ band, veg 4.9/5, WHO-5 raw 12/13), the `unmeasured`
  states, source resolution, hostile-value coercion, both defect guards, and the
  additive contract.
- `benchmarks.js`: `SOURCES` exported so criteria cite from one registry; five
  new citation entries; BMI note rewritten; `whoWproBmi` added to the physical
  source list.
- `views/helpers.js`: new `criteriaCard()`. `views/aspect.js`: renders it after
  the grade explainer. `views/methodology.js`: new card, `CRITERION_ROWS` table
  and the exclusions.
- `goals.js`: `veg.def` 3 → 5. `index.css`: `.criteri*` selectors, no existing
  selector touched. `sw.js`: `+ ./criteria.js`. `th.js`: ~49 keys added, 3
  orphans replaced.

329 tests, lint clean, EN/TH verified.

## [2.7.0] — 2026-07-29 (APP_VERSION 39)

### Say who you are compared with — and stop ranking where we can't

A literature sweep of all twelve instruments this app uses established that **no
representative Thai general-adult norm is published for any of them.** Every
Thai figure that exists is a non-representative proxy: hospital outpatients,
university students, or older adults. Two of the numbers already in the app were
worse than foreign — they were from the wrong generation.

Until now every percentile was captioned *"Ahead of about N% of people like
you."* That sentence was true only for the Thai-sourced aspects. It was being
printed next to a German community norm, a 25-country pooled norm, and — for
relationships — a US sample **aged 57 to 85**.

**Changed**

- Every benchmark now declares the **population** it ranks against, and the UI
  names it: *"Ahead of about 62% of adults in a German community sample"*. The
  generic phrasing survives only as a fallback.
- **`relationships` no longer produces a percentile or a letter grade.** Its two
  instruments are normed on older adults (UCLA-3 on US ages 57-85, LSNS-6 on
  European over-65s). Loneliness is U-shaped across the lifespan, so the UCLA
  norm likely makes working-age users look lonelier than they are, while the
  LSNS norm never counted workplace ties and likely makes them look better
  connected. Two unquantified biases pointing opposite ways is not a percentile.
  The aspect still shows both raw readings and the LSNS-6 `< 12` isolation
  cutoff — that threshold ships with the instrument and does not depend on the
  norming sample.
- New **"Not ranked"** state, distinct from "Not graded". "Not graded" means you
  have not answered yet and can unlock it; "Not ranked" means the app has your
  answers and is declining to rank them. Rendered on the dashboard row, the
  aspect page and the grade chip, always with the reason attached.
- `#/methodology` gains **"Who you are actually compared with"** — a table of
  all eight aspects naming the reference sample, its country, its age band, and
  whether a rank is claimed at all.
- `SOURCES` labels for UCLA-3 and LSNS-6 now state their age bands outright, and
  the Thai-norm sourcing note in `benchmarks.js` was rewritten: it had described
  both as foreign *general-population* norms, which they are not.

**Not changed:** the Balance Index, the "N of 8 aspects at or above average"
headline, and every aspect's 0-100 score. Those run on raw scores against the
derived population average in `averages.js`, not on percentiles, so removing one
rank does not move them.

**Why it matters:** a percentile is a claim about rank within a comparable
group. Where the group is not comparable, the honest output is not a softer
number — it is no number, plus the reason. 294 → 298 tests.

## [2.6.1] — 2026-07-29 (APP_VERSION 38)

### The non-goal, written down

The app prints a great many numbers about a person: eight scores, eight
percentiles, eight letter grades and one index. Everything above this entry was
built to make those numbers *honest*. Nothing in the app had ever stated the
limit on what an honest number can be taken to mean.

`#/methodology` now says it, in the intro card, immediately after the
not-a-diagnosis disclaimer:

> One thing this app does not measure: your worth as a person. Every number here
> is built from behavior you reported and circumstances you were handed — what
> you earn, how you slept, who is near you, how much time you have — and all of
> those move. Read a low score as a description of a situation, never as a
> judgment on the person living in it.

Three deliberate choices in that wording:

- It names what the numbers **are** built from, not only what they are not. A
  bare "this doesn't measure your worth" is a reassurance; naming behavior and
  circumstance is an argument, and an argument survives a bad week.
- "Circumstances you were handed" is the load-bearing phrase. Several aspects —
  finance most obviously, but also relationships and physical — score
  conditions a person did not choose. A grade on those is a description of a
  situation, and the sentence says so.
- It is **not** softened at the low end and it is not hidden in fine print. It
  is styled apart (`.methodology-nongoal`, navy with a rule down the left) so it
  reads as a statement of intent rather than a legal footer.

`tests/methodology.test.mjs` pins all four claims — including the class name —
so a future copy edit cannot quietly drop it.

### Files

- `views/methodology.js`: one `<p>` in the intro card.
- `index.css`: new `.methodology-nongoal`. No existing selector touched.
- `th.js`: +1 key.
- `tests/methodology.test.mjs`: +1 test, 4 assertions.

No scoring, schema, or state change. 295 tests.

## [2.6.0] — 2026-07-29 (APP_VERSION 37)

### The three outward aspects finally measure something

Social contribution, environment and humanity's future carry this app's actual
thesis — three of eight aspects point *away* from the self, which is what makes
this unlike a sleep-and-steps tracker. They also had the thinnest instruments in
the app. Measured across the entire input space, here is every percentile they
could **ever** return:

| Aspect | Reachable percentiles | Reachable grades | Driven by |
| --- | --- | --- | --- |
| Social Contribution | 24, 62, 82, 88 | D, C, B — **A unreachable** | 2 booleans |
| Environment | 10, 20, 34, 50, 64, 78, 90 | D, C, B, A — F unreachable | 1 number (plastic/day) |
| Humanity's Future | **30, 70** | **C or B, and nothing else** | 1 checkbox |

Donating ฿50 and ฿50,000 produced an identical percentile. All five LFIS items,
all six GEB items and all five PTM items moved the *score* but had **zero**
effect on the percentile — which is what the letter grade, the standing
sentence and the pledge ordering are all built from.

This was not sloppiness. CAF, the Pollution Control Dept and OECD publish
participation **rates and averages**, not distributions, and `benchmarks.js`
refuses to invent a curve it cannot cite. The thinness was the price of that
honesty.

**Two-stage, band-locked percentiles** keep the honesty and add the resolution:

1. the **cited rate** decides which band you are in — the published claim, and
   the only thing that can move you across a boundary;
2. the **measured intensity** (the instrument composite) decides where inside
   that band you sit.

Band-locked means stage 2 can never cross a boundary stage 1 set. The strongest
possible non-donor still ranks below the weakest donor; a 10-pieces-a-day
plastic user can never pass someone at zero. Measured after the change:

| Aspect | Distinct percentiles | Grades |
| --- | --- | --- |
| Social Contribution | 4 → **31** | all five |
| Environment | 7 → **35** | all five |
| Humanity's Future | 2 → **10** | all five |

- `benchmarks.js`: new `positionInBand()` / `intensityOf()` helpers and a shared
  `TWO_STAGE_NOTE` disclosure rendered on all three aspects. The three benchmark
  functions now take `baseline` (the raw `ptm`/`geb`/`lfis` sums onboarding
  already stored but never used for standings). `getAllBenchmarks(state)` is
  unchanged; no exported signature moved.
- Social contribution's within-band position blends the five PTM items with
  **giving as a share of income**, capped at 5% — magnitude is precisely what a
  yes/no participation rate cannot capture. Falls back to PTM alone when income
  is unknown.
- **Nobody gets silently regraded.** When an instrument was never answered
  (older saves, express onboarding), the percentile returns the *exact*
  pre-existing fixed value rather than the band midpoint — a test pins all 15
  legacy values. An early draft used the midpoint and moved a volunteer from 82
  to 90 (B → A) for doing nothing; that is the bug this fallback exists to
  prevent. A grade may only move when the person's own answers move it.
- Scores, `AVERAGE_ASPECT_SCORES`, the Balance Index and the new headline
  sentence are all untouched — they run off the calculators, not the
  benchmarks. No schema change, no migration.
- `views/methodology.js` + `th.js`: the two-stage design is stated on the
  methodology page and in the note under every affected standing. A hidden fudge
  would be worse than the thin instrument it replaced.
- `tests/benchmarks.test.mjs`: six new tests — resolution, the three band-lock
  invariants, exact legacy fallback, giving-share ordering, and that every
  affected aspect discloses the design.

## [2.5.0] — 2026-07-28 (APP_VERSION 36)

### The app finally says its thesis in one sentence

This app exists to answer one question — *"am I at least the average of the
population?"* — and until now it never answered it directly. The answer was
implied in three places at once: eight per-aspect percentiles, the dashed
population polygon on the radar, and the Balance Index (where 50 *is* the
average person). A reader had to assemble it themselves.

The Balance Index card now states it outright, above the methodology caption:

> **You are at or above the population average in 5 of 8 aspects.**

- `grades.js`: new pure export `aspectsAtOrAboveAverage(aspects)` → `{count,
  total}`. "At or above" is judged on the **population-relative** standing
  (`relativeToPopulation(...) >= 50`), the same scale the Balance Index runs
  on, so the sentence and the number beside it can never disagree. Equivalent
  to `score >= populationAverage`, but routed through `relativeToPopulation`
  so the definition of "average" lives in exactly one place — a test pins the
  two readings together.
- **Not softened at the low end.** `0 of 8` renders as plainly as `8 of 8`.
  Special-casing bad news would make this a congratulation engine instead of a
  mirror; the forward-looking half of the answer is the existing gold
  `weakestAspect` line directly beneath it ("Lifting Environment would move it
  most"), so the card reads fact → lever.
- `views/helpers.js`: `balanceIndexBlock(index, band, weakest)` gains an
  optional 4th argument `standing`. Placed **above** the harmonic-mean caption
  on purpose — the reading order is now *what the number is → what it means
  about you → how it was built*.
- `index.css`: `.balance-index-standing` at 0.88rem/600, sized between the
  1rem title and the 0.76rem caption. Navy rather than gold: this is a
  statement of fact, and the gold line below it is the call to action.
- `views/dashboard.js`: computes `standing` alongside `index`/`weakest` and
  passes it through. `renderDashboard`'s signature is unchanged.
- `th.js`: one new string.
- `tests/grades.test.mjs`: four new tests. The boundary is pinned hard —
  *exactly at* the population average must **count** (the claim is "at or
  above"), one point under must not. An off-by-one here would tell a person
  standing at the average that they are below it.

### Peer Comparison defanged → "Side by Side"

The board ranked people. This app exists to tell one person whether they are at
least the average of the **population** — a comparison nobody loses, since
everyone can be above average on volunteering and nothing breaks. Ranking the
same eight scores against five friends asks a different and worse question:
*who is winning*. It turns "I could give more" into "I'm fine, better than
Ken", and no version of that helps anyone lift anything.

The tell was already in the code: **sample/NPC profiles filled the board when
it was empty**. A board that has to invent opponents to look populated is a
board nobody was filling.

Kept: comparison codes, the sharing flow, the wire format (`LQ1-…` codes from
before v2.0 still decode), and the route id `leaderboard` — so no cached path,
bookmark, or shared code breaks.

Removed: the **Rank** column and its gold/silver placement badges, the **Tier**
column, sorting by Balance Index, the Balance Index itself (a composite figure
for another person is a score to beat), and all six sample profiles.

In their place, `views/leaderboard.js` renders an **aspect matrix**: rows are
the eight aspects, columns are the population average, then you, then everyone
in the order they were added — an order that is fixed and meaningless on
purpose. Each cell carries a ▲/▽ mark for whether it clears the population
average for that aspect, using the same test as the new dashboard headline, so
both screens give one person the same verdict. Beneath it, one line per
participant: *"Ken clears the population average in Mental, Relationships,
where you do not yet."* — the one thing a peer can tell you that the population
cannot, framed as something to learn from rather than a deficit.

- Tab label "Peer Comparison" → "Side by Side" (`index.html`, `app.js`). The
  route id and module filename stay `leaderboard` deliberately; the module
  header explains why it is not one.
- `index.css`: `.npc-tag` retired; new `.sbs-*` block. No rank-badge styling
  survives.
- `th.js`: 9 new strings; **17 pruned** — `Rank`, `Participant`, `Balance`,
  `Tier`, `Sample`, the two sample-count plurals, the old intro copy, and the
  six NPC names (Nadia, Marcus, Priya, Kenji, Sofia, Liam). `Population
  average` was already defined for the radar legend and is reused.
- `tests/views-xss.test.mjs`: two new tests. One escapes a hostile participant
  name — this is the only view rendering a name **someone else authored**, so
  it is attacker-controlled by construction rather than by a corrupt backup.
  The other is a guard on the *design*: it fails if a rank, tier, or sample
  column returns, or if a far stronger participant is ever sorted ahead of the
  user.
- `README.md`: feature entry rewritten, including why it is not a leaderboard.

## [2.4.1] — 2026-07-28 (APP_VERSION 35)

### Fixed

- **Aspect Scores rows no longer break across three lines.** The band chip
  ("Around average") was dropping onto a line of its own, and the method tag
  was splitting mid-phrase into `(vs participation` / `rates)`. Every row is now
  exactly two lines at a uniform height.

  Causes, measured in the browser rather than guessed at:

  | Symptom | Cause | Fix |
  | --- | --- | --- |
  | Chip on its own line | `.benchmark-plain-lead` inherited the **monospace** stack from `.benchmark-line`. Monospace is wrong for prose and ~20% wider: the sentence measured 309px and the widest chip 113px against a 429px card — over by **1px**. | Set `--font-sans` and 0.86rem on the sentence. Slack goes from −1px to +56px. |
  | Chip *orphaned* when it does wrap | The lead was a flex row, so the sentence was one unbounded item and the chip was the only thing able to wrap. | Inline flow, so the sentence wraps mid-phrase and the chip trails the last line. |
  | `(vs participation rates)` split | Nothing held the parenthetical together. | `white-space: nowrap`, scoped to `.benchmark-detail` so the standalone block tag on the aspect page is unaffected. |
  | Detail line wrapping | `.benchmark-detail` overrode to 0.75rem, overshooting the card by 6px. | 0.72rem — the size `.benchmark-line` already declares for this block. |

  Also corrects a hierarchy inversion: at 0.95rem this secondary sentence was
  *larger* than the aspect name above it (0.85rem).

  Desktop rows go 3 lines → 2 (115px → 42px); mobile 375px goes 3 lines → 2
  (115px → 80px). At a 277px card the sentence and chip cannot share a line at
  any legible size, so two lines is the floor there.

## [2.4.0] — 2026-07-28 (APP_VERSION 34)

Every question is now asked **once**. No schema change, no migration.

### The in-depth assessment stopped re-asking the baseline's questions

Five in-depth instruments are supersets of a short form already answered during
the baseline assessment, so they put **24 identical questions** to the user a
second time — the whole of CFPB-5 inside CFPB-10, GSE-6 inside GSE-10, LSNS-6
inside LSNS-R, RAS-3 inside RAS-7, Grit-S inside Grit-12. Each of those is now
asked only at onboarding, and the in-depth form asks only the items the short
form does not cover:

| Section | Instrument | Was | Now |
|---|---|---|---|
| Finance | CFPB-10 | 10 | **5** |
| Personal Goals | GSE-10 | 10 | **4** |
| Personal Goals | Grit-12 | 12 | **8** |
| Relationships | LSNS-R | 12 | **6** |
| Relationships | RAS-7 (couples) | 7 | **4** |

A coupled user's in-depth assessment drops from 94 questions to 70.

**Nothing was removed from a published scale.** Every instrument is still scored
over its full item set, because the baseline already stores `rawSum(shortForm)`
— a sum over precisely the carried items — so the full-length raw sum
reconstructs exactly:

```
deep[key] = baseline[shortForm] + rawSum(answers to the remaining items)
```

`DEEP_NORM`'s ranges and the official CFPB lookup table therefore apply
unchanged, and a carried submission produces the identical raw sum to
administering all ten items (asserted in `tests/deep-carry.test.mjs`). This is
also why no schema change was needed: the sums being reused have been stored
since v1, so **existing saves get the shorter forms immediately**.

Three invariants make the arithmetic safe, all now enforced by tests: a carried
item must match its onboarding item in **text** and in **option values**, and
the carried set must cover the short form **completely and exactly once**.
Violate any one and the sum would silently double-count or drop items — a wrong
score with no error.

- `surveys.js`: new `DEEP_CARRY` map and `deepAskIndices(deepKey, baseline)`,
  the single source of truth for both rendering and scoring so the two cannot
  disagree about which items were asked.
- Grit-S items 2 and 4 now use the **canonical** wording (`Setbacks don't
  discourage me.`, `I am diligent.`). They previously carried a non-standard
  merged second clause, which was both a fidelity problem and the one thing
  blocking those items from carrying over. Item count, order, and option scale
  are unchanged, so stored `baseline.grit` sums remain valid.
- Everything is still asked in full when there is no short-form sum to carry:
  an older import missing the key, or `ras` for someone who was single at
  onboarding and is coupled now.
- `submitDeepAssessment` accepts either shape — the asked subset or the whole
  canonical scale — telling them apart by length, so a caller holding the full
  array stays correct. Any other length is a caller bug and is dropped rather
  than summed into a wrong score.
- Straight-line detection now judges the items **actually put to the user**.
  Coverage is unchanged: the reduced CFPB-10, Grit-12 and RAS-7 sets stay
  mixed-keyed, and the sets that become uniformly keyed (GSE-10, LSNS-R) were
  never judged anyway.
- `th.js`: one new string; the two merged Grit variants pruned (their canonical
  replacements were already translated for Grit-12).

## [2.3.1] — 2026-07-25 (APP_VERSION 33)

Copy, plus the guards that keep it from rotting again — no schema change, no
migration, no behaviour change.

### Stale "log routines" vocabulary retired

Three completeness notes still told users to **log routines**, an instruction that
has been impossible to follow since v27/1.5.0 removed daily activity logging
(`views/actions.js` and `views/ledger.js` are gone; there is no ledger to log
into). They now point at the **Weekly Review** (`#/review`), which is the thing
that actually confirms an estimated score: `submitWeeklyReview` writes each
measured field and marks it `provided`, which is exactly what upgrades an
aspect's confidence tier off `estimated`.

- `views/dashboard.js` — the `assessmentComplete === false` quick-start note:
  "Log routines to shape them" → "Submit a Weekly Review to shape them".
- `views/dashboard.js` — the `estimatedAspects` completeness note: "or log
  related routines to confirm them" → "or submit a Weekly Review to confirm
  them".
- `views/aspect.js` — the per-aspect "Estimated score." note: "or log routines
  to confirm it" → "or submit a Weekly Review to confirm it".

The quick-start note is only reachable by saves made through the old express
onboarding path (`assessmentComplete === false`), which v32 removed — no *new*
save can set it. It is reworded rather than deleted precisely because those
pre-v32 saves are still live on the site.

### Erase-data dialog named a feature that no longer exists

`app.js`'s "Erase all data?" confirmation said it deletes *"every logged routine,
your goals, and your baseline assessment"* — naming, as the thing you are about
to lose, a feature deleted several releases ago. It now names what the save
actually holds: **"every weekly review, your pledges, and your baseline
assessment."** (`resetState` replaces the whole save, so all three are accurate.)

### 118 dead Thai keys pruned

`tests/i18n-coverage.test.mjs` only enforces code → TH, so a key whose English
string disappeared from the code stays in `th.js` forever. Those orphans were
where the pre-v27 vocabulary was still hiding. `th.js` goes **951 → 833 keys**,
all of them entries no longer reachable from any source file or data module:
the routine presets and ledger UI, the old rank tiers (`S-Rank`…), the retired
proficiency labels (`Developing`…`Exemplary`), the daily/epic quest machinery,
and the v1 commitment-pledge strings.

Verified before deleting: a key was kept unless it appears nowhere as a quoted
string literal in any source file **and** nowhere in the deep-walked exports of
every data module — the two ways `t()` can be reached, including the
`t(variable)` calls the coverage test cannot see. Two section headers left
labelling unrelated survivors were handled: `Routines ledger` → `Shared dialog
actions`, while `Routine presets` and `Missions` emptied entirely and were
removed.

### Changed

- `th.js`: the three completeness-note keys renamed to match their new English
  text (English strings *are* the i18n keys, so a rename that misses `th.js`
  silently falls back to English) and their Thai retranslated onto the existing
  weekly-review vocabulary — `ส่งการทบทวนรายสัปดาห์`, matching
  `"Complete Weekly Review"`.
- `app.js`: `showReward()`'s comment said "when a routine is logged"; its only
  caller is now `handleReviewComplete`.
- `i18n.js` / `sw.js`: comments citing "user-authored routine names" as the
  example of untranslatable text now cite the user's own name. The `i18n.js`
  header illustrated `t()` with `"Weekly Commitment"` — a string that had itself
  been dead since the commitment feature was removed, and whose `th.js` entry
  only survived the orphan sweep *because* that comment referenced it.

### Added: an orphan guard, so this cannot silently recur

`tests/i18n-orphans.test.mjs` asserts the direction nothing checked before —
**TH → code**. 118 dead keys accumulated precisely because
`i18n-coverage.test.mjs` only proves the reverse, so a key whose English string
left the code was invisible to CI forever.

It scans for each key as a **quoted string literal** in any source file. That
covers the `t(variable)` calls a literal-argument scanner cannot see: a value
reaching `t()` through a variable still has to be *written* as a quoted string
in the data module that defines it. The scan deliberately excludes `tests/` and
prose files — a key propped up only by a test asserting its translation, or by
a changelog entry describing the feature that was removed, is still dead. An
`ALLOWLIST` covers strings intentionally landing ahead of use, and a second test
fails when an allowlist entry outlives the key it documents.

Turning it on immediately caught two more, both of exactly that shape:
`"Activity recorded: +{xp} points{detail}."`, alive only because
`tests/i18n.test.mjs` used it as its `tp()` interpolation example, and
`"Foundational"`, alive only because one fixture still carried a `rank` field
from the removed tier system. The `tp()` test now interpolates a live string,
with its empty-value edge case moved onto a deliberately synthetic key so that
retiring a feature can never quietly delete that coverage again. `th.js`: 833 →
831.

### Fixed: privacy.html served a six-release-stale stylesheet

`privacy.html` pinned `./index.css?v=27`. `tests/consistency.test.mjs` checked
only `index.html` and `app.js`, so the page sat six versions behind without ever
failing CI. Bumped to `?v=33`, and `privacy.html` added to the guard's file list
— a page omitted from the check is a page nobody notices going stale.

## [2.3.0] — 2026-07-24 (APP_VERSION 32)

Two display/UX changes, no schema change and no migration.

### Percentile standing on its own line

On the Overview's **Aspect Scores** panel, each aspect's benchmark standing used
to cram the plain-language sentence, the band chip, the exact percentile, and the
method tag onto one line — which wrapped mid-phrase (worse in Thai, which runs
longer). The exact `Nth percentile · typical range …` detail now sits on its own
second line, under the "Ahead of about N% of people like you" sentence. EN and TH
both, since they share one template.

### Blank-first assessments with mandatory `*` markers

The three **answering** forms — first-time onboarding, the monthly re-assessment,
and the in-depth assessment — now start **blank**. Nothing is pre-filled or
pre-selected: every number field is empty, every survey question is unanswered,
and dropdowns start on a "— Select —" placeholder. Each mandatory field shows a
red **`*`**, and you cannot advance an onboarding step (or submit a check-in /
deep section) until every visible required field is answered and in range.

Consequently the onboarding **"Optional" steps and the "See my results now"
express shortcut are gone** — a first baseline is now always completed in full.
Birthday stays optional (privacy: the year is never asked for). The **Profile
page and Weekly Review are unchanged** — they are edit screens, so they keep their
pre-filled values.

### Why

Pre-filling let a user click through onboarding and be scored almost entirely on
default values they never actually chose — a silent, low-quality baseline. Forcing
a conscious answer for every field means each aspect score reflects the user's own
data. (A visible side effect: new baselines now read "High" confidence throughout,
because the "Estimated" badge only ever came from those silent defaults.)

### Changed

- `views/instrument-forms.js`: `numberField` gains an optional `opts`
  (`required`/`placeholder`/`field`) — the pre-filled 4-arg form used by the
  Profile page and Weekly Review is unchanged; instrument radios render blank
  with a `*` and an inline error slot; new `validateScope`/`clearScopeErrors`
  enforce completeness against a DOM subtree (native `required` can't, because
  onboarding hides earlier steps).
- `views/onboarding.js`: blank fields, `*` markers, `— Select —` dropdowns,
  per-step and final validation, Optional/express removed.
- `views/assessments.js`: check-in and each deep section validate before submit.
- `views/helpers.js` / `views/dashboard.js`: two-line compact benchmark standing.
- `index.css`: `.req`, `.input-invalid`, `.survey-question-invalid`.
- `th.js`: 7 new strings; 6 now-dead ones pruned (`See my results now`,
  `You can finish here anytime`, `Optional`, and the three `Optional — …` step
  blurbs). The i18n-coverage test only enforces code → TH, so orphaned entries
  never fail CI — and dead keys are where stale terminology hides. Kept
  `Quick-start results.`: the Overview still shows it to saves made with the old
  express path (`assessmentComplete === false`).

## [2.2.0] — 2026-07-24 (APP_VERSION 31)

A **Profile & Data page** (`#/profile`), reached from a new **Profile** button in
the header. It lets you hand-edit the slow-moving facts about yourself that
onboarding captured once and previously locked in: name, age, gender, region,
employment, relationship status, income, height/weight, digital literacy,
long-term investments, and birthday. Day-to-day quantities (sleep, water,
activity, plastics, donations…) stay in the Weekly Review — they are measured,
not typed.

The Export / Import / Reset Data controls **moved off the header** onto this
page, leaving the header as `[ไทย] [Profile]`.

### Why

Everything demographic was write-once at onboarding. A raise, a move to Bangkok,
a new relationship, or losing weight had no home — the only way to correct a
demographic fact was to wipe all data and re-onboard. Several of those facts feed
live scores (income and region drive finance; weight/height drive the BMI half of
physical; investments drive humanity's future; digital literacy feeds personal
goals), so being unable to update them meant the scores slowly drifted from the
truth.

### How scores update

A score-affecting edit is **re-measured through the same formulas onboarding
uses** and applied as a **delta** (`profileEditShifts`), so accumulated
check-in, deep-assessment, and weekly-review adjustments are preserved — the
edit never rebuilds a score from scratch and discards months of history. This is
the same delta philosophy as `weeklyAspectShifts` and the birthday-driven
`ageBandShifts`.

- **gender** and **employment** move only your benchmarks and recommendations,
  never a score — the page says so.
- A **relationship-status** flip updates recommendations immediately, but the
  relationships score refines at your **next monthly check-in**: a user who
  onboarded single has no romantic-satisfaction answers on file, and inventing a
  delta from data that doesn't exist would be dishonest.
- Editing **age** re-syncs your **Level** (Level *is* your age) — but only when
  you actually change age, so it never undoes a birthday-driven level-up.
- Editing profile facts awards **no XP** (a correction is not an achievement, and
  it can't be farmed).

No schema change and no migration — every field already existed on the profile.

## [2.1.0] — 2026-07-23 (APP_VERSION 30)

The **Balance Index is now population-relative**. Each aspect is rescaled
against its population average before the harmonic mean, so being *typical* on
any aspect counts as 50 — regardless that some aspects sit low across the whole
population (social contribution averages ~32, humanity's future ~44). An aspect
the whole population scores low on no longer structurally anchors everyone's
balance down. No data or schema change — every user's Balance *number* shifts,
but nothing needs migrating.

### Why

The index was the harmonic mean of the raw 0-100 scores, which have no
population reference. Because aspects like social contribution are low for
nearly everyone, they dominated the harmonic mean's drag: a person sitting at
the population average on all eight aspects scored ~52 ("Uneven balance") while
their *grades* — which are percentile-based — read straight C's ("typical
across the board"). The two readings contradicted each other, and the harsher
one was the one no realistic behavior could move. Rescaling against the
population average makes the index agree with the grades: average everywhere is
now exactly 50.

### Changed

- **Balance Index is population-relative.** `relativeToPopulation(score, avg)`
  maps each aspect through the fixed points `(0→0, populationAverage→50,
  100→100)` before the harmonic mean. 50 = the average person, and every aspect
  is equally reachable. The comparison board recomputes from each participant's
  shared aspect scores, so comparison codes are unchanged and codes shared
  before v2.1 still decode identically.
- **Balance bands recalibrated** to the relative scale: Strong ≥75, Steady ≥50,
  Uneven ≥30, Strained <30. An all-average life now reads "Steady balance",
  never "Uneven".
- **"Lift this first"** and the dashboard's weakest-aspect prompt now name the
  aspect furthest below *what is typical for it*, not merely the lowest raw
  score.
- Methodology page and the Balance Index caption rewritten to explain the
  population-relative scale; the dashed population-average line on the radar is
  now the index's 50 mark (EN + TH).

### Notes

- Aspect scores, comparison codes, and storage (schemaVersion 5) are untouched.
  Only the derived Balance *Index* changes meaning.

## [2.0.0] — 2026-07-22 (APP_VERSION 29)

**Breaking release.** Level now means your age, XP resets each year, and the
shareable comparison code drops the fields that leaked age and tenure. Existing
saves migrate automatically (schemaVersion 4 → 5) with no data loss — your
aspect scores, baseline, history, and lifetime XP all carry over.

### Why level = age

The old level was XP-derived (`xpNeeded = level × 100`), so it measured time
spent tapping the app, not anything about the person. There is no honest,
self-scorable measure of "developmental level" — every validated instrument
needs a trained human rater, ego stages are empirically reversible, and ~80% of
adults sit in three adjacent stages (near-zero discrimination). Age is a fact,
not a claim, and it sidesteps all of that.

### Added

- **Level = your age.** It starts at your current age and ticks up by one on
  your birthday — never down. Existing users jump from ~level 6 to their real
  age on first load; that is intended, and reads as a gift rather than a reset.
- **Seasonal XP.** XP now accrues *within* a level-year and resets at each
  birthday. Each closed year is filed to a **season archive** (`levelYears`)
  with its earned/possible ratio, so the reset reads as "year closed", never
  "progress wiped". Lifetime XP is preserved across the change.
- **Year review** (`#/year`, opens on the 1st of your birth month) — a
  forward-looking screen with the runway still left in the year, your season
  pace, per-aspect movement, and the `levelYears` trend. No pass/fail language
  anywhere.
- **Pace bar** on the dashboard: season XP earned vs. what your configured
  pledges make possible (`PACE_THRESHOLD = 0.55`, a tunable, not a researched
  figure — revisit after a real year).
- **Grade-driven pledge order.** The *Add a Pledge* catalog now leads with
  pledges for the aspects you are graded lowest on — a join of the existing
  A–F grades (`grades.js`) with each pledge's `aspect` tag. A D or F aspect
  surfaces its pledge first; nothing new is stored.

### Changed

- **Comparison code is now v2.** A shared code carries only your name and the
  eight aspect scores — **no level (age) and no points**. The board ranks on
  the **Balance Index** alone; the age-derived "rank" is gone. Codes shared
  before this release (v1) still decode — their level/points are simply read
  past and dropped.
- The dashboard status card shows level = age and the XP bar as season progress
  against the pace bar, not a climb to the next level.
- Crossing a CFPB age band (e.g. turning 62) recalculates finance as a **delta**
  applied to your current score, so accumulated check-in and deep-assessment
  adjustments survive; the year review names the recalculation.

### Migration (schemaVersion 4 → 5, automatic, zero data loss)

- Adds `birthMonth`/`birthDay` (asked once via a soft, non-blocking prompt —
  month and day only, never the year you were born), `season`, `lastLevelUp`,
  and `levelYears: []`.
- Sets `level := your age` (falls back to the existing level if age is
  unavailable); moves the current `xp` into `season.earnedXp`; preserves
  `lifetimeXp` intact.
- `possibleXp` accrues for every ISO week elapsed since the last accrual,
  whether or not a review was submitted, using the *current* pledge config for
  missed weeks (a documented approximation).

## [1.6.0] — 2026-07-21 (APP_VERSION 28)

Letter grades per aspect, and a single Balance Index summarising all eight.
Additive only — no schema change, no existing number moves.

### Added

- **Letter grades (A–F) per aspect**, shown on the dashboard rows and each
  aspect page. Grades derive from the aspect's **population percentile** — the
  cited comparison in `benchmarks.js` — never from its 0–100 score. The score
  is this app's own composite; the percentile is the part that compares you
  with published data, so it is the only part worth grading. Bands are
  percentile floors: A ≥ 90th, B ≥ 70th, C ≥ 30th, D ≥ 10th, F below.
- **The C band is deliberately wide** (30th–69th). Most people are typical, and
  a scale handing out D's at the 35th percentile would misrepresent an
  ordinary life.
- **"Not graded" instead of F for unanswered aspects.** `mental`,
  `relationships` and `personalGoals` have no benchmark until their baseline
  questionnaires are answered, so they render an explicit *not graded* chip
  with a prompt. Missing data is not a failing result, and grading those three
  off the raw score would have put them on a different basis from the other
  five.
- **Balance Index** — the harmonic mean of the eight aspect scores, on the
  dashboard. It is dominated by your *lowest* aspect: eight scores of 70 give
  70, while seven near 79 plus one at 10 give 42, though both average 70. That
  is the point — a summary that rewarded a high average would reward
  abandoning an aspect, and lifting a neglected aspect moves it far more than
  polishing a strong one. The block names the weakest aspect for that reason.
- **Methodology page** gains a "Grades and the Balance Index" section stating
  plainly that the Balance Index is **this app's own summary figure, not a
  published or validated measure** — unlike the eight aspect scores and their
  percentiles, no research proposes it. The app cites everything it can; a
  headline number that merely *looked* equally sourced would have quietly
  broken that.
- New `grades.js` (pure module) and `tests/grades.test.mjs` (16 tests, 100%
  line and function coverage), pinning band edges, the balanced-beats-spiky
  property, and zero/missing-score guards.

### Fixed

- **i18n coverage gap.** Band labels reach `t()` as variables (`t(band.label)`),
  which the literal scanner in `tests/i18n-coverage.test.mjs` cannot see, so a
  new band could ship untranslated and silently render English in Thai mode.
  The data-walking guard already used for surveys and pledge templates now
  also walks `PERCENTILE_BANDS`, `GRADE_BANDS` and `BALANCE_BANDS`.

### Notes

- A bottom-decile grade on Mental Health always renders with the existing
  support notice attached — never a bare "F". The WHO-5 cutoffs make this
  structural (every raw score that grades F also trips
  `getMentalHealthNotice()`), and a test asserts it so the two cutoffs cannot
  drift apart.
- Grades are personal-page only. They are deliberately absent from the
  comparison board and the shareable code.

## [1.5.0] — 2026-07-18 (APP_VERSION 27)

The weekly-review redesign: daily activity logging is replaced by ONE measured
self-report per ISO week, so using the app well takes minutes a week, not a
daily ritual.

### Changed (breaking)

- **Daily activity logging is removed.** The Activity Log tab, preset and
  custom routines, the 5-logs-per-day fatigue caps, and per-log flat score
  bonuses are all gone. In their place, the new **Weekly Review** tab asks for
  rough weekly quantities ("about 2 L of water a day", "exercised 3 days"),
  prefilled with last week's answers so an unchanged week takes seconds.
- **Scores are now measured, not nudged.** The quantities you report replace
  last week's values inside the SAME cited formulas that scored your
  onboarding (`weeklyAspectShifts` in `scoring.js`), so a behavior-driven
  aspect moves exactly as much as the measured change implies — never by a
  flat +N per tap. Survey-only aspects (mental, relationships) are untouched
  by reviews and still recalibrate via the monthly re-assessment, whose small
  consistency bonus now counts weekly reviews instead of logged actions.
- **Goals are now weekly quantity pledges.** Count-of-logs goals and the
  separate weekly commitment pledge are replaced by up to 6 pledges chosen
  from 10 measurable templates (hydration, sleep, exercise days, MET-minutes,
  vegetables, learning, plastics, savings rate, donations, volunteering).
  Every pledge is auto-graded by the weekly review — nothing to log day to
  day — with streaks tracked and fixed per-template points so a self-set
  target cannot farm the economy.
- **XP economy**: weekly review pays 60 base + each met pledge's 25-40. An
  engaged week lands near ~135 points; levels now track weeks of consistency
  rather than tap volume. Existing levels and lifetime points are preserved.

### Migration (schema v3 -> v4, automatic, no data loss where a v4 meaning exists)

- Kept: profile (XP/level/lifetime points), aspect scores, the full onboarding
  baseline (incl. in-depth sections), snapshots, re-assessment history,
  crewmates, and the old action log — retained as a read-only archive.
- Converted: the three default quests with a measurable equivalent
  (`daily_water` → hydration ≥2 L/day, `weekly_workout` → exercise ≥3
  days/week, `epic_savings` → savings rate ≥10%).
- Dropped: the breathing-exercise quest (`daily_sigh`), custom routines and
  custom goals (no measurable weekly quantity maps to them), the commitment
  pledge, daily rate-limit counters, and quest reset stamps.

### Added

- `#/review`: the prefilled weekly form (IPAQ activity grid, sleep, water,
  vegetables, learning, plastics, savings; donations/volunteering under a
  collapsed monthly section), a "reviewed this week" state naming the next
  review date, past-review history, and a dashboard banner + Recent Reviews
  feed. Completing a review chains straight into the monthly re-assessment
  when that is due — one ritual, two short steps.
- Goals tab rebuilt around pledge cards (target, last week's ✓/✗ with the
  measured value, streak badge) and a bounded add-pledge form.
- Aspect pages now show a "Measured Weekly" card naming exactly which review
  fields feed that aspect's score.

### Fixed

- Radar legend no longer renders as a squeezed side column: the chart
  container is now a flex column, so the legend sits centered below the SVG
  at full card width.
- Peer Comparison table scrolls inside its card on narrow screens instead of
  making the whole page pan sideways.
- On phones the four nav tabs form a balanced 2x2 grid instead of three tabs
  plus one stretched full-width orphan on a second row.

## [1.4.0] — 2026-07-17 (APP_VERSION 26)

### Added

- **The dashboard radar now shows the population average.** A dashed outline
  drawn under your polygon marks the score an average person would get, with
  a legend and a provenance caption. The average is not hand-picked: a
  reference person assembled from the same cited statistics the benchmarks
  use (median Thai income, typical activity levels, published questionnaire
  means such as WHO-5 67.56/100; app-authored scales at their midpoints) is
  scored through the exact calculators in `scoring.js` that score you, so
  the overlay can never drift from the formulas (`averages.js`, pinned by
  `tests/averages.test.mjs`). The chart's accessible name includes both
  series, and the methodology page documents the derivation.

## [1.3.1] — 2026-07-16 (APP_VERSION 25)

### Fixed

- **In-depth questionnaires no longer render half-Thai, half-English.** The
  deep instruments' item texts deliberately stayed in English (the
  clinical-item carve-out), but items shared with the onboarding short forms
  were already translated — so Thai mode showed forms like the CFPB-10 with
  five Thai and five English questions. All 72 deep-only item texts now have
  Thai translations (unofficial renderings, faithful to the published items;
  the methodology page still cites the canonical English instruments), and
  `tests/i18n-coverage.test.mjs` now walks every survey title, item, and
  option label so a partially translated questionnaire fails CI.

## [1.3.0] — 2026-07-16 (APP_VERSION 24)

Assessment validity sprint: instrument fidelity, scoring-integrity guards,
careless-response detection, and a public methodology page.

### Changed

- **CFPB financial well-being is now scored with the official CFPB conversion
  tables** (self-administered, age-banded 18–61 / 62+) instead of the linear
  approximation — both the onboarding 5-item scale and the in-depth 10-item
  scale, so the deep recalibration delta stays metric-coherent. The in-UI
  disclosure notes now describe the official table. Existing scores adjust on
  the next re-assessment or deep section, not retroactively.
- **The sleep instrument uses the standard 6-point Jenkins Sleep Scale
  response set** ("Not at all (0 days)" … "22–31 days", past month) instead of
  a compressed 4-option adaptation. Raw range is unchanged (0–20), so stored
  baselines need no migration.
- **CFPB item 5 ("My finances control my life") uses the official
  frequency response set** (Always … Never) rather than "describes me",
  matching the published worksheet.

### Fixed

- **Thai-mode terminology made consistent.** Grit is now ความมุ่งมั่น everywhere
  (ความเพียร reserved for "perseverance"), self-efficacy is uniformly
  การรับรู้ความสามารถของตนเอง, the in-depth assessment is เชิงลึก on the
  methodology page too (was แบบเจาะลึก), and the in-depth section titles reuse
  the exact aspect names (ร่างกาย, จิตใจ, การช่วยเหลือสังคม, อนาคตมนุษยชาติ).
  Also fixed the level-up modal doubling "ระดับ: ระดับ S", a stray space before
  Thai percentile labels, and five stale dictionary entries left from the
  benchmark rewrite.

### Added

- **Scoring-integrity test guards** (`tests/scoring-integrity.test.mjs`):
  every normalizer's endpoints and direction are derived from the instrument
  definitions and pinned — editing an option value or item count now fails CI
  instead of silently misscaling scores. Composite calculators are
  bounds-checked at both extremes.
- **Straight-line (careless-response) detection**: a mixed-keyed questionnaire
  answered with the same option position on every row is demoted to
  "unanswered" at onboarding (flagged on the aspect page), and a straight-lined
  in-depth instrument is rejected outright — it never enters scoring, cannot
  mark an aspect Verified, and earns no points.
- **Methodology page** (`#/methodology`, footer link, EN/TH): per-aspect
  formulas and composite-weight rationale, instrument citations, an explicit
  "app-authored items" disclosure for the three non-standardized aspects,
  confidence-tier and benchmark explanations, and a measurement-stability
  readout computed from re-assessment history.

## [1.2.0] — 2026-07-16 (APP_VERSION 23)

Architecture cleanup (review finding #13). No user-visible behavior change.

### Changed

- **`state.js` split along responsibility lines** to satisfy the 800-line file
  rule: `defaults.js` (canonical empty state + starter quests), `sanitize.js`
  (untrusted-import coercion), and `scoring.js` (pure instrument normalizers,
  the eight aspect calculators, check-in composites, deep-assessment math, and
  level ranks). `state.js` keeps only the stateful manager.
- **Scoring formulas now have a single source of truth.** The same formulas
  previously lived in three places — onboarding calculators, `submitCheckin`
  targets, and the component breakdowns in `aspects.js` — and could silently
  drift. All three now import from `scoring.js`.
- **Importing `state.js` no longer mutates the save.** Constructing the
  manager only *reads*; the boot maintenance (periodic quest resets, weekly
  snapshot) moved to an explicit `stateManager.init()` called from `app.js`.

### Added

- **CI coverage gate**: the test job now fails if line coverage drops below
  80% or function coverage below 70% (currently ~93% / ~88%). CI Node bumped
  to 22 for the `--test-coverage-*` threshold flags.
- **Three Playwright E2E flows** (`tests/e2e.mjs`, run in the CI smoke job):
  express onboarding → dashboard, logging a routine → points/history update,
  and the EN→TH language toggle persisting across a reload.

## [1.1.0] — 2026-07-15 (APP_VERSION 22)

Hardening pass across correctness, privacy, accessibility, and release safety.

### Fixed

- **Single-use plastics were asked per *week* but scored and benchmarked per
  *day*.** An honest weekly answer was read as a daily one, scoring roughly
  7× worse than reality and dragging down the Environment aspect. The question
  is now phrased per day, the default is 3/day, and
  `tests/consistency.test.mjs` pins the unit so it cannot drift back.
- **Stale `ui.js` served the pre-split monolith.** `ui.js` changed from a
  1,400-line module into a barrel over `views/*.js` while its URL stayed at
  `?v=21`, so any browser holding the old copy kept running the old code.
  Bumped to `?v=22` and added a guard test.
- **Torn deploys.** The service worker now fetches with `cache: "no-cache"`,
  forcing revalidation. The `?v=N` scheme only ever tagged three URLs while the
  module graph has ~66 relative imports, so a returning user could otherwise
  run a fresh `app.js` against stale modules.
- Charts (radar and trend) were invisible to screen readers; both now expose
  `role="img"` and a localized `aria-label` describing the data.
- The assistant's speech bubble was an `aria-live` region, so its typewriter
  effect streamed partial words to screen readers on every navigation.
  Announcements moved to a dedicated hidden region, fired only on activation.

### Security

- **Imported goals are now sanitized.** `renderQuests` prints
  `t(goal.type.toUpperCase())` unescaped, and neither `t()` nor `tp()` escapes,
  so a hand-edited backup could smuggle markup straight into `innerHTML`.
  Goals are rebuilt to a known shape on import (enum `type`/`aspect`, numeric
  rewards, bounded milestones) *and* escaped at the sink.
- Profile enum and numeric fields are coerced on import. An unknown `region` or
  `gender` silently missed every benchmark lookup table; out-of-range numbers
  poisoned the score math.
- Content-Security-Policy tightened to `'self'`/`'none'` throughout now that no
  off-origin asset remains.

### Changed

- **Fonts are self-hosted** (`assets/fonts/`). The app no longer contacts
  `fonts.googleapis.com` or `fonts.gstatic.com`, so no visitor IP reaches a
  third party, `privacy.html`'s "no third parties" claim is literally true, and
  the PWA is genuinely offline-capable. Only the weights actually used ship
  (400/500/600/700 — the old `<link>` also pulled an unused 300).
- `ui.js` split into focused modules under `views/`.
- Manifest `theme_color`/`background_color` corrected to the real palette
  (`#24344d` / `#f7f5f0`); they previously disagreed with the stylesheet and
  flashed the wrong colour on PWA launch. Dropped `orientation` lock.
- The Pages artifact now ships only what the app loads (~1.5 MB, was ~2.2 MB
  of the entire repo including `tests/`, `docs/` and unreferenced design
  images). CI verifies every `APP_SHELL` path is staged, because
  `cache.addAll` is atomic and one 404 silently kills offline support.

### Added

- Privacy page (`privacy.html`) reachable from an in-app footer, alongside
  source and version links. The PDPA statement previously existed only in the
  repo, invisible to users of the live site.
- Backup nudge on the dashboard once there is data worth losing and the last
  export is stale (or never happened), plus `navigator.storage.persist()` after
  onboarding. `localStorage` is evictable and a "clear site data" wipes it —
  this is the only warning before the data is simply gone.
- Modal dialogs now trap focus, close on Escape/backdrop, and restore focus to
  the invoking element.
