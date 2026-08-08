# Usability test plan — comprehension of the scored screens

Status: READY TO RUN (not yet run)
Written: 2026-08-07, against APP_VERSION 51 / v2.14.4

## Why this document exists, and why it is not another round file

`round-0` through `round-4` in this directory are **desk research**: sourcing and
defending the population norms behind the percentiles. They are the reason the app can
say "86th percentile" and cite who said so.

None of them is user research. Nobody outside the author has ever been observed using
this app. The gap that leaves is specific, not general: this product's entire output is
*numbers a person must interpret correctly*, and interpretation is the one property that
cannot be verified by reading source, running `node --test`, or checking a citation.

Two defects found in v50 make the case concretely. An aspect row rendered a percentile
grade chip ("B") eight pixels from a raw component score ("20"), same size, same weight,
with nothing saying which was the verdict. A level badge reading "Lv.15" sat directly
above a bar reading "0 points this year", implying the bar filled the level; it does not,
because level is the reader's age. Both shipped for many versions. Both were found by
reading code, which means they were found by luck. A test finds the rest on purpose.

## Objective

One question, and the plan is scoped to answer only it:

> When a first-time reader looks at a screen in this app, do they form the belief the
> data actually supports?

Not "do they like it." Not "would they pay." Comprehension.

## Method, and why not the alternatives

**Moderated usability test, 5 participants, ~45 min each, conducted in Thai.**

Five is the standard number because the marginal find-rate collapses after it; with one
developer and no research budget, sessions six through eight would cost more than the
findings they returned.

Rejected, with reasons, so they are not revisited by default:

- **User interviews.** Wrong instrument. Interviews explore an unknown problem space.
  The problem space here is known and the product is already built; interviews would
  return opinions about wellbeing tracking in general, which changes nothing in this
  repo.
- **Survey.** Needs 100+ responses to say anything, and would poll people who have not
  used the thing.
- **Retention / diary study.** **Cannot be run, by construction.** The app is local-first
  with no backend and no analytics; `tests/smoke.mjs` fails the build on any off-origin
  request, and `docs/privacy.md` promises nothing leaves the device. Retention is
  simultaneously the most valuable unknown and the one that is structurally unmeasurable
  without breaking the product's central promise. The substitute is Task 3 plus the
  closing question below. That is weaker, and it is worth knowing that it is weaker.

## Participants

| Criterion | Target | Why |
|---|---|---|
| Thai adults, 22–45 | 5 | The instruments are Thai-normed (ST-5, TMHI-15) |
| Thai-only UI users | ≥ 2 | The Thai UI is a first-class surface, not a translation afterthought |
| Living outside Bangkok | ≥ 2 | `suggestions.js` branches on region; the upcountry branch has never met an upcountry reader |
| Income spread across the LFS average wage | mixed | The finance scale is anchored to it; readers on both sides should be observed |
| Own smartphone, used for the mobile tasks | ≥ 2 | See Task 2 — hover-dependent UI fails silently here |

Exclude anyone who has seen the app before, including friends who have been shown it.

## Session guide

Screen-record with permission. Do not explain anything unless the participant is stuck
past the point of usefulness; note the moment you had to intervene, because that moment
is itself a finding.

### Warm-up (5 min)

- How do you keep track of how your life is going right now, if at all?
- Have you used any app like that? What made you stop?

Nothing about this app yet.

### Task 1 — onboarding, unassisted, timed (15 min)

Hand over the URL cold: *"Set this up for yourself. Please think aloud."* Then stop
talking.

This is the highest-risk surface in the product: six steps, every field required,
blank-first by design, clinical instrument phrasing. Record:

- **Total time to reach the dashboard.** The clock is the finding here.
- The step where they first sigh, scroll back, or go quiet.
- Any field they ask you to explain — each one is a labeling defect.
- Whether they answer ST-5 and UCLA-3 honestly, or begin optimizing their score. Score
  optimization on a self-assessment invalidates every number downstream of it.

**If any participant says they would close the page, that outranks every finding below
it.** Write it at the top of the report.

### Task 2 — read the dashboard (15 min)

Explain nothing. Point, and ask:

- **The aspect row** (grade chip beside `NN/100`):
  *แถวนี้กำลังบอกอะไรคุณ ตัวเลขไหนคือตัวสำคัญ*
  "What is this row telling you? Which number is the one that matters?"
- **The level badge:**
  *"Lv.15" หมายถึงอะไร* — "What does Lv.15 mean?"
  then *ทำยังไงถึงจะขึ้นเลเวล* — "How would you level up?"
  As of v2.14.4 the answer is printed under the points bar as visible text. Check
  whether they read it before answering, or answer wrong with it on screen — a caption
  nobody reads is no better than a tooltip nobody hovers.
- **The Balance Index:**
  *ตัวเลขนี้คำนวณจากอะไร* — "What do you think this single number is made of?"
- **The percentile band.** If a participant reads "Bottom 25%" about their own life, stop
  the script and ask how it makes them feel. This is a wellbeing app delivering a verdict
  on the reader in the smallest type on the page. Whether that motivates or wounds is a
  design decision, and it should be tested rather than defended.

### Task 3 — the weekly review (8 min)

*"It's Sunday evening. Do your check-in."*

The form asks for rough weekly averages — litres of water per day, plastics per day,
MET-minutes, savings rate. Watch which of three things happens:

1. they compute from memory,
2. they estimate honestly,
3. they invent a number to get past the field.

If (3) is common, the finding is not about the form. It is that precise, cited arithmetic
is running on fabricated inputs — a product-model problem that belongs in the scoring
discussion, not the UI backlog.

### Close (5 min)

- *อาทิตย์หน้าจะเปิดขึ้นมาใช้อีกไหม* — "Would you open this again next Sunday?"

Ask it, then stay silent. The pause is where the real answer arrives.

## Synthesis

Affinity-map the transcripts, then sort every observation on one axis:

**Did the participant form a wrong belief, or were they merely slowed down?**

- **Wrong belief → P1.** In an app whose product is interpretation, a reader who leaves
  believing their level tracks their effort has been actively misinformed by software
  that cites the WHO for everything else. Correctness of understanding is the same class
  of defect as correctness of arithmetic.
- **Slowed down → P3.** Real, fixable, not urgent.

Skip the impact/effort matrix. With five sessions and one developer it is ceremony.

Findings that reproduce across ≥ 2 participants go into the changelog queue with the
participant count attached. A single participant's confusion is a hypothesis, not a
defect — record it and wait for the second.

## Deliverable

A findings section appended to this file, dated, containing: total onboarding times, the
count of wrong beliefs per screen, verbatim quotes for each P1, and an explicit list of
what was tested and found *fine*. That last part matters — an unqualified list of
problems reads as a broken product, and quietly licenses redesigning things that already
work.
