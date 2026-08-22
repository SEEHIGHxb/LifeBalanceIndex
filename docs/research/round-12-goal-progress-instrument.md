# Round 12 research brief — is there a goal-progress instrument this app can actually use?

Status: **OPEN — written 2026-08-22.**

Narrow by design. One construct, one question, following round 8's format rather than round 7's:
the broad rounds keep returning fabrications buried in good material, and this subject area is
unusually rich in instruments that look adoptable and are not.

Affected code:

| Thing | Where |
|---|---|
| The composite | `personalGoalsComposite` (`scoring.js`) |
| Its two inputs | `gseScore` (`scoring.js`), `learningScore` (`scoring.js`) |
| The items asked | `surveys.js` — `gse` (6 items), `grit` (4 items, shown not scored) |
| The bars | `personalGoalsComponents` (`aspects.js`) |
| The benchmark | `personalGoalsBenchmark` (`benchmarks.js`) |
| The existing pledge machinery | `goals.js`, `state.js` PLEDGES section |

---

## Why this round exists

Round 7, Finding 1, verbatim: **"Personal Goals contains no goals."** That finding was accepted and
acted on only in part. v64 removed grit from the score. It did not add anything that measures a
goal.

What the aspect computes today:

```js
// scoring.js
export function personalGoalsComposite(profile, gseRaw) {
  return ((0.4 * gseScore(gseRaw)) + (0.3 * learningScore(profile))) / 0.7;
}
// learningScore = 0.5 * (weeklyLearningHours / 5) + 0.5 * digitalLiteracy
```

So the aspect is **57% generalised self-efficacy** (a trait: "I can usually handle whatever comes my
way") and **43% study hours plus a self-rated digital-skills slider**. No item asks what the user is
aiming at, whether they are moving toward it, or whether the aim is their own.

Round 7 asked for the fix in its Q4 and **never got an answer**. The round's own defect register
lists it under *silently skipped*: "Goal-progress measures usable without a therapist — the actual
replacement for a Personal Goals aspect that measures goals." It has been the number-two open item
since 2026-08-14.

---

## The constraint set, stated up front, because it kills most candidates

This is the part round 7 did not do, and the reason its ASK A returned four candidates and adopted
none. An instrument must clear **all six** of these to be adoptable here. Report each explicitly.

1. **Self-administered.** No clinician, coach, or therapist in the loop. Goal Attainment Scaling in
   its original form fails here and is the single most likely wrong answer to this brief.
2. **No user-authored free text may be stored.** `goals.js` states the rule and the reason: "nothing
   user-authored is stored, which keeps the XSS surface at zero and every string translatable." An
   instrument that requires the user to *write down* their three current goals cannot be scored
   without storing them. This is the hard architectural constraint and it eliminates most
   idiographic methods as-published — see Q3, which asks whether any of them survive adaptation.
3. **State, not trait.** Every other aspect measures something that can move between retests. This
   is exactly why grit left the score. An instrument that cannot change in a year is not a fix.
4. **Short.** The app's instruments run 4–10 items. Personal Goals can afford roughly **6–8 new
   items**, and fewer if GSE stays.
5. **Licensable for software, free preferred.** Ryff is already closed on this ground. Report the
   licence for every candidate, including whether non-commercial app use is permitted, and quote
   the terms rather than characterising them.
6. **Must score a person with no formal occupation, no employer, and no income.** This is round 7's
   crux restated. The app's author lives on ~3,000 THB/month from family; the friend who started
   round 10 earns 75,000 and supports relatives. An instrument whose items presume a career ladder
   scores one of them and insults the other.

---

## The idiographic trap, named so it is not walked into

Goal progress is intrinsically **idiographic**: progress is measured against *this person's* goal,
which differs per person. The published measures split into three families and each fails a
different constraint:

- **Idiographic-with-facilitator** (Goal Attainment Scaling, Personal Projects Analysis): valid,
  well-cited, and requires either a clinician or a page of free text. Fails 1 or 2.
- **Nomothetic trait measures near the construct** (GSE, Grit, goal orientation, locomotion /
  assessment): adoptable and short, but they are what the aspect already has too much of. Fails 3.
- **Nomothetic *appraisal* measures** — items of the form "I am making good progress toward the
  goals I have set for myself", answered on a frequency or agreement scale without naming the goal.
  **This is the only family that can clear all six constraints**, and finding whether a validated
  one exists is the point of this round.

If the answer is that the third family is empty, that is a real finding and it closes the round.

---

## The thing that already exists, and must be assessed rather than ignored

The app **already has a goal system**: `goals.js` weekly pledges. Templated (no free text), with a
user-set numeric target inside published bounds, graded automatically against the measured profile
fields the weekly review writes. `gradeGoal` returns `{ value, met }`.

That is a genuine, stored, per-user record of goal attainment that costs the user nothing extra to
produce — and it currently feeds **XP only**. It touches no aspect score.

The temptation is obvious and the brief names it in order to forbid the shortcut: **"percentage of
pledges met" is not a published instrument.** Adopting it because it is convenient would be exactly
the v69 mistake — an invented normalizer wearing the clothes of a measurement. Q4 asks whether any
published work licenses that step. If nothing does, pledge attainment stays XP.

---

## Kill criteria — decide the round, then stop

1. **A validated, self-administered, non-idiographic goal-progress or goal-pursuit instrument exists
   that clears all six constraints.** → It becomes the Personal Goals replacement. Quote every item,
   the response scale, the scoring, the validation sample, and the licence.
2. **Such an instrument exists but fails exactly one constraint, and the failure is licence (5).** →
   Record it, name the licensor and the cost, and stop. That is a purchasing decision, not research.
3. **Only families one and two exist — every published goal-progress measure needs a facilitator or
   free text, and everything self-administered and short is a trait.** → **Personal Goals is
   measuring what can honestly be measured, and the aspect should be renamed rather than rescored.**
   That is a legitimate and cheap outcome, and it is probably the most likely one.

Criterion 3 is not a failure. It converts a four-round-old open item into a settled one and points
at a rename — a change to a label, which costs one `t()` string and one `th.js` key, against a
rescore that would cost an instrument, a migration, and a benchmark.

---

## Sourcing bar

Unchanged from rounds 10 and 11, and strict for the same reason — round 7's export on this exact
subject contained a fabricated national norm, misattributed WVS variables, and a "verbatim quote"
from a 1992 paper that cites itself.

- Peer-reviewed journals, an instrument's own technical documentation, government statistics
  offices, central banks, regulators. **Nothing else.**
- Every DOI must be opened and checked to resolve to the paper it is claimed to be. Round 7 shipped
  two that did not.
- Every item wording must be quoted from the instrument or its validation paper, not from a
  secondary description of it.
- **NOT FOUND is an expected answer.** Criterion 3 is a success condition, not a shortfall.
- If a source cannot be retrieved, name the barrier. Do not substitute a description of it.

---

## The questions, in priority order

### Q1 — Does a self-administered goal-progress appraisal instrument exist? (HIGHEST)

The third family, above. For each candidate, state whether it clears all six constraints and quote
the items in full.

Cover at minimum, saying NOT FOUND for any that cannot be documented from primary material:

- The **goal-progress / goal-pursuit subscales** embedded in larger wellbeing instruments — check
  whether any publishes its subscale separately with its own scoring.
- **Self-concordance** measures (Sheldon & Elliot 1999 and successors): note that self-concordance
  asks *why* a goal is held, not whether it is progressing. If that is all that exists, say so —
  "the goal is mine" is a different and possibly better question than "the goal is advancing", and
  the round should report which one the literature actually supports.
- The **Goal Adjustment Scale** (Wrosch et al. 2003) — disengagement and reengagement. Note it
  measures the response to *blocked* goals, which is a third construct again.
- **Aspiration Index** (Kasser & Ryan) — content of goals, and check its attainment subscale
  specifically, which is the part that would matter here.
- Anything from the **PROMIS** or WHO item banks that scores goal pursuit.

### Q2 — What does the published evidence say goal progress is worth? (HIGH)

Only relevant if Q1 lands. If an instrument exists, is there published evidence that goal progress
predicts wellbeing **independently of self-efficacy**? GSE is staying unless something displaces it,
and an instrument that correlates .8 with GSE would add a bar and no information. Give the
statistic, the sample, and the DOI.

### Q3 — Can any idiographic method be adapted to a no-free-text app? (MEDIUM)

Specifically: does any published adaptation of Goal Attainment Scaling or Personal Projects Analysis
use a **fixed, pre-written goal taxonomy** that the user selects from rather than authors? A
published taxonomy the app could render as options would clear constraint 2. If such an adaptation
exists, report its validation separately from the parent method's — an adaptation does not inherit
the original's psychometrics, and treating it as though it does is the failure mode this question
exists to catch.

### Q4 — Does anything published license scoring goal attainment from behavioural records? (MEDIUM)

The pledge question. Is there published work that scores wellbeing or goal functioning from
**observed attainment of self-set behavioural targets** — the shape the app already produces? If
yes, quote the scoring. If no, that is the answer and pledge attainment stays XP.

### Q5 — Thai data (LOW, and expected to be empty)

Any Thai population data on goal pursuit or goal progress. Round 7's ASK B on the adjacent
constructs returned two fabricated sources. Expect NOT FOUND, and prefer it to anything thin.

---

## What this round must not do

- **Do not propose a weight.** If an instrument is found, its weight against GSE inside the
  composite is a decision for the release that adopts it, argued against the 0.4/0.3 split, not
  assumed here.
- **Do not recommend scoring pledge attainment on convenience grounds.** See Q4. It needs a
  citation or it does not happen.
- **Do not remove GSE.** It is validated, short, already asked, and already carried in the deep
  retest (`gse10`). Displacing it requires evidence, not a better-sounding alternative.
- **Do not treat "SMART goals" or any management-training framework as an instrument.** It is
  guidance with no psychometrics, and it is the most heavily search-optimised thing in this subject
  area.
