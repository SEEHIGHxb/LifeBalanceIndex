# Round 12 research brief — is there a goal-progress instrument this app can actually use?

Status: **CLOSED — 2026-08-22** (opened 2026-08-22). **Kill criterion 1 fired: the CIT Accomplishment subscale is adoptable.**
**Addendum 2026-08-22: all four unretrievable items closed at primary source; weight and display decided.**

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

## FINDINGS — closed 2026-08-22

**Kill criterion 1 fired.** A validated, self-administered, non-idiographic goal-progress subscale
exists, it clears all six constraints, and its publisher explicitly permits using the subscale on
its own, free, for non-commercial use.

The instrument is the **Accomplishment subscale of the Comprehensive Inventory of Thriving (CIT)**,
Su, Tay & Diener 2014, *Applied Psychology: Health and Well-Being* 6(3), 251–279,
`doi:10.1111/aphw.12027`.

The round did not have to settle for it. A second candidate — the PERMA-Profiler's Accomplishment
subscale — also clears the constraints on paper and is rejected below on evidence, not on taste.

### The recommended instrument, quoted in full

Source: *Comprehensive Inventory of Thriving (CIT)*, Appendix A, the full instrument as published by
the authors at `labs.psychology.illinois.edu/~ediener/`. Copyright © 2014 Ed Diener, Rong Su, and
Louis Tay.

Dimension III (Mastery) → **Accomplishment**:

> 1. I am achieving most of my goals
> 2. I am fulfilling my ambitions
> 3. I am on track to reach my dreams

Response scale, as published for the whole instrument:

> 1 Strongly Disagree · 2 Disagree · 3 Neither Agree nor Disagree · 4 Agree · 5 Strongly Agree

Three items, raw 3–15, and the app's existing conversion shape applies unchanged:
`((raw - 3) / 12) * 100`, which is exactly how `gseScore` already normalises GSE-6.

Item 1 is **also the item chosen for the 10-item Brief Inventory of Thriving** — the instrument's
own authors picked it as the single best representative of the whole Accomplishment facet when they
had room for ten items out of fifty-four. If the app ever wants one item instead of three, the
authors have already published which one.

### Why this one and not the other: the structural argument

This is the finding that makes the round worth having run, and it was not anticipated by the brief.

The CIT's Mastery dimension has **five** subscales:

| CIT Mastery subscale | In the app today? |
|---|---|
| Skills | no |
| **Learning** | **yes** — `learningScore`, 0.3/0.7 of the composite |
| **Accomplishment** | **NO — this is the gap** |
| **Self-Efficacy** | **yes** — `gseScore`, 0.4/0.7 of the composite |
| Self-Worth | no |

Personal Goals is currently **two of the five facets of a published, validated Mastery dimension**,
and the facet it is missing is the one its name promises. The app did not arrive at Self-Efficacy
plus Learning by copying the CIT — it arrived there by accretion and then by subtraction when grit
left in v64. That an independent validated instrument groups exactly those two constructs together,
and names the third one Accomplishment, is convergent evidence that the aspect's shape was right and
its contents were incomplete.

Two of the CIT's own Self-Efficacy items are near-verbatim GSE:

> "I am confident that I can deal with unexpected events" (CIT Self-Efficacy 2)
> "I am confident that I could deal efficiently with unexpected events" (GSE-6 item 3, `surveys.js`)

So the app is not merely near the CIT's construct space. It is already inside it, using
near-identical wording, and missing one labelled part.

### Constraint check — all six, for both candidates

| # | Constraint | CIT Accomplishment | PERMA-Profiler A |
|---|---|---|---|
| 1 | Self-administered | **PASS** | **PASS** |
| 2 | No stored free text | **PASS** — "my goals", never named | **PASS** |
| 3 | State, not trait | **PASS** — present-tense appraisal, moves with circumstance | **PASS** — frequency phrasing |
| 4 | Short (6–8 items) | **PASS** — 3 items | **PASS** — 3 items |
| 5 | Licensable | **PASS** — free, non-commercial, subscale-alone use explicitly permitted | **PASS with a condition** — free non-commercial, but Penn copyright and a registration form |
| 6 | Scores a person with no occupation | **PASS** — goals, ambitions, dreams; no employer, no salary, no title | **PASS** |

**Constraint 5, quoted rather than characterised.** The CIT authors' own usage page:

> "Permission to use the scales is granted for free to all professionals (researchers and
> practitioners) if the scales are used for noncommercial purposes."

And, decisively for this app, the note at the foot of the published instrument itself:

> "The CIT subscales may be used alone or in combination with each other."

That sentence is the difference between adopting three items and adopting fifty-four. It is a
published permission for exactly the thing round 12 needs, and it is the reason this candidate wins.
Compare the FinHealth Toolkit in round 11, whose publisher requires a licence for software use — the
contrast is what a usable licence looks like.

The PERMA-Profiler's terms are workable but heavier:

> "Copyright © 2013 University of Pennsylvania. For commercial usage, please contact the Center for
> Technology Transfer of the University of Pennsylvania"
> "You are welcome to use the measure for noncommercial research or assessment purposes, giving
> credit as noted below. There is no cost involved in using the measure for these purposes."
> "Before using the measure, please read through this document, and register by completing this
> form."

### Why PERMA-Profiler A is the runner-up and not the pick

Its three items are, verbatim from the instrument document (Butler & Kern, updated 14 Oct 2016):

> A1 — "How much of the time do you feel you are making progress towards accomplishing your goals?"
> A2 — "How often do you achieve the important goals you have set for yourself?"
> A3 — "How often are you able to handle your responsibilities?"

A1 is the single best-worded goal-progress item found in this entire round. It asks precisely what
the app wants to know. So the rejection is narrow and evidential:

1. **A3 is not about goals.** "Able to handle your responsibilities" is coping capacity, which is
   what GSE already measures. One of three items would duplicate the component it is meant to
   complement.
2. **The five-factor structure failed to replicate in the one open-access validation retrieved.**
   Psychometric properties of the PERMA-Profiler in Australian adults (PMC6927648), N = 439: "The
   solution for the confirmatory factor analysis examining the five-factor structure of the PERMA
   was not admissible due to a non-positive definite psi matrix." The single-factor model fit badly
   (χ²(90) = 903.22, CFI .82, RMSEA .14, SRMR .07) and a two-factor solution fit moderately
   (CFI .92, RMSEA .11, SRMR .04). Accomplishment's α in that sample was **.72**, and it correlated
   **r = .774** with overall wellbeing — high enough to raise the question of whether the subscale
   carries information distinct from general wellbeing at all.
3. **Which matters here specifically**, because the app already scores general wellbeing with WHO-5
   in Mental. A subscale that behaves like a wellbeing proxy would quietly double-count across two
   aspects — the defect class round 7 catalogued as Finding 5.

**One PERMA figure is NOT VERIFIED and is therefore not used.** A secondary source reports α = .79
for the Accomplishment subscale in Butler & Kern's own validation (N = 31,966 across eight studies).
The primary source could not be retrieved: `internationaljournalofwellbeing.org` serves a TLS
certificate whose altnames do not include that hostname, and the Harvard mirror returns HTTP 403.
Named as a barrier, not worked around, and not relied on.

### Q2 — is goal accomplishment distinct from self-efficacy? Yes, structurally, and it is measured.

> **Superseded in part by the source-retrieval addendum below**, which reports the measured
> correlation (r = .62) instead of the factor-model argument.

The strongest available evidence is that a CFA of the CIT **models Accomplishment and Self-Efficacy
as separate first-order factors and fits well**.

Source: *Psychometric properties of the inventory of thriving: brief and comprehensive versions*,
open access at `pepsic.bvsalud.org`, N = **801** participants across 24 Brazilian states and the
Federal District. The 18-first-order-factor model — which lists accomplishment and self-efficacy as
two of the eighteen — was the best-fitting model tested: **χ²(1220) = 2144.53, CFI = 0.92,
TLI = 0.91, RMSEA = 0.03**. The Accomplishment subscale's internal consistency was **α = 0.90**
(Table 2), which is higher than PERMA A's in either sample.

**The honest limit of this answer.** That is evidence of *discriminability* — the two constructs are
separable in a factor model. It is **not** the thing Q2 literally asked for, which was an incremental
prediction of wellbeing by goal progress over and above self-efficacy. No such regression was
retrieved, and none should be asserted. What can be said is: a validated instrument treats them as
distinct facets, fits well doing so, and the app would be adopting that instrument's own structure
rather than inventing a distinction.

Su, Tay & Diener's original validation reports N = **3,191** across five US samples (publisher's
abstract page), with the paper claiming convergent and discriminant validity and incremental
prediction of health outcomes over existing wellbeing measures. The full text sits behind Wiley; the
figures above come from the open-access Brazilian replication instead, which is the stronger source
for this purpose anyway because it tests the factor structure directly.

### Q3 — not pursued, per the brief

Criterion 1 fired, and the brief says stop. Recorded so it is not mistaken for a negative: whether a
published GAS or Personal-Projects adaptation uses a fixed goal taxonomy remains **unasked**. It is
moot unless the CIT recommendation is rejected.

### Q4 — NOT FOUND. Pledge attainment stays XP.

Nothing published was found that scores wellbeing or goal functioning from **observed attainment of
self-set behavioural targets** of the kind `goals.js` already produces.

Goal Attainment Scaling remains what round 12 predicted it would be: individualised goals scaled
across five levels from −2 to +2, set **collaboratively with a clinician** using SMART framing. Its
psychometric literature is clinical throughout. It fails constraint 1 exactly as the brief
anticipated, and it does not license the app's shortcut.

So the answer to the pledge question is the one the brief pre-committed to accepting: **no citation
exists, therefore no score.** Weekly pledges continue to pay XP and continue to touch no aspect
score. This is now a checked negative rather than an untested assumption.

### Q5 — NOT FOUND for Thailand, as expected.

> **The Wiese blocker is resolved in the source-retrieval addendum below.** The country list and the
> three inadmissible countries are now recorded at primary source. Thailand is still NOT FOUND.

No Thai validation of the CIT, the BIT, or the PERMA-Profiler was found. A Vietnamese validation of
the PERMA-Profiler exists (Ho Chi Minh City Open University Journal of Science) and is recorded as a
lead only — it was not retrieved or assessed, it concerns the rejected instrument, and Vietnam is not
Thailand.

A cross-national CIT/BIT measurement-equivalence study exists — Wiese et al. 2018, *Applied
Psychology: Health and Well-Being*, `doi:10.1111/aphw.12119`, reported as 10 countries and N = 3,077,
with the CIT factor structure **inadmissible in three of them**. **The country list was not
retrieved**: PubMed returned a cookie wall and Europe PMC returned an empty record. Whether any Asian
or middle-income country is in that set is therefore **unknown**, and the "inadmissible in three"
figure is secondary and unverified. It is recorded as the first thing to check before adoption, not
as support for it.

### What this means for the code — and what it does not

Criterion 1 fired, so the brief's own rule applies: an instrument was found, and **the weight it
should carry against GSE inside `personalGoalsComposite` is not decided here.** *(Decided
afterwards, on the addendum's evidence: equal thirds, unranked. See the decisions there.)* That is a release
decision argued against the existing 0.4/0.3 split, exactly as round 11 refused to propose a runway
weight.

What can be said without proposing a weight:

- The aspect would, for the first time, contain an item asking whether the user is getting where they
  are trying to go.
- Nothing needs removing. GSE stays (the brief forbade displacing it and nothing here displaces it);
  learning stays; grit stays shown-not-scored.
- The addition is three agreement items on the app's existing 5-point pattern, one new normaliser of
  a shape already in `scoring.js`, one new component bar, a `th.js` translation of three short
  sentences, and a schema addition. No migration of existing stored baselines is required, because
  the field is additive — the same shape as v70's `liquidSavings`.
- **The renaming outcome in criterion 3 is now moot.** The aspect can keep its name, because it can
  now contain goals.

### Two cautions that belong in the adopting release, not here

1. **"I am on track to reach my dreams" is the weakest of the three items** for this app's audience.
   It is aspirational rather than concrete, and it is the item most likely to read differently in
   Thai than in American English. The subscale should be adopted whole — dropping an item forfeits
   the published α and the published factor structure — but the translation deserves care, and the
   item is the one to watch if the component ever behaves oddly.
2. **This is still a subjective appraisal, not a behavioural record.** Adopting it does not make
   Personal Goals behavioural in the way Physical or Environment are. It makes it *measured*, which
   is a different and lesser claim, and the methodology page should say so rather than implying the
   app now observes goal attainment. It does not; Q4 is why.

### Source-retrieval addendum — 2026-08-22

The round closed with four items recorded as unretrievable, because the primary texts sat behind
Wiley and behind a journal whose TLS certificate does not cover its own hostname. **The author
supplied the three PDFs directly.** All four items are now closed at primary source, and the record
below supersedes the secondary and unverified figures above where they conflict.

Read at source: Su, Tay & Diener 2014 (`doi:10.1111/aphw.12027`); Wiese, Tay, Su & Diener 2018
(`doi:10.1111/aphw.12119`); Butler & Kern 2016 (`doi:10.5502/ijw.v6i3.1`). The PDFs are publisher
copies and are **not committed** — `docs/article/` is git-ignored for the same reason the raw
research exports are.

#### 1. The instrument and the licence, verified against the published paper

The three Accomplishment items and the 1–5 response scale quoted above match Appendix A of the
published paper exactly. The subscale-reuse permission is **in the paper itself**, as the closing
note of Appendix A, not only on the author's webpage:

> "The CIT subscales may be used alone or in combination with each other."

Item 1 carries the BIT asterisk in the published appendix, confirming what the findings claimed
about it being the authors' own single-item representative of the facet.

**α from the original validation, five samples: .88, .94, .93, .94, .95** (Table 4). This supersedes
the α = 0.90 taken from the Brazilian replication — the original range is higher, and the replication
figure stays valid as an independent confirmation in a second language.

**Four-month test–retest = .78** (Table 5 diagonal). The paper names Accomplishment as one of its
five most stable subscales, behind only Support (.83), Optimism (.81), Life Satisfaction (.80) and
Positive Emotions (.79). Stable enough to justify treating it the way `gse10` is treated in the
yearly deep retest.

#### 2. Q2 is now answered directly, and it supersedes the structural argument above

Table 5 of the original paper reports the subscale intercorrelations the findings could not obtain:

| Pair | r |
|---|---|
| Accomplishment ↔ Self-Efficacy | **.62** |
| Accomplishment ↔ Learning | **.50** |

Moderate. The two constructs share meaningful variance and remain distinct — which is the answer the
factor-model argument could only approximate. The honest limit stated above still stands unchanged:
this is discriminability, **not** an incremental prediction of wellbeing by goal progress over and
above self-efficacy. No such regression exists in the retrieved text and none is claimed.

#### 3. A finding that argues against adoption, recorded because the round rejected PERMA on it

PERMA-Profiler Accomplishment was rejected above partly for correlating **.774** with overall
wellbeing — near enough to a wellbeing proxy to risk double-counting against WHO-5 in Mental.

Applied evenly, the same test reads worse for the pick. From Table 5:

| Pair | r |
|---|---|
| Accomplishment ↔ Life Satisfaction | **.82** |
| Accomplishment ↔ Positive Emotions | **.71** |

That is the third-highest life-satisfaction correlation of any non-SWB subscale, behind only
Meaning (.84) and Optimism (.83).

**Why this does not reverse the decision, stated so the reasoning can be attacked later.** The PERMA
rejection was for *item contamination*: its A subscale asks about handling responsibilities, and
Butler & Kern's own sub-domain list describes A as bundling "self-efficacy, sense of accomplishment,
and achieving personal goals" — three constructs scored as one. CIT Accomplishment's three items ask
about goal progress and nothing else; its correlation with life satisfaction is a substantive
relation between distinct constructs, not shared item content. Meaning sits at .84 and is not
thereby redundant.

**The consequence is real and belongs on the methodology page:** after this adoption, Personal Goals
and Mental are **not independent evidence**. A user scoring low on both is not two findings.

#### 4. Q5's blocker is resolved — the Wiese country list

Ten countries plus a US reference sample: **Argentina, Australia, China, Germany, India, Mexico,
Russia, Singapore, Spain, Turkey.** No Thailand. The only Southeast Asian sample is Singapore.

The three countries whose CIT solutions were inadmissible are **Argentina, Mexico, and China**:

- Argentina and Mexico failed on the **Flow** subscale — α = .37, with item 19 loading .12–.23.
  Irrelevant to this adoption; the app is not taking Flow.
- **China failed differently and more seriously.** Several latent factors correlated above .90, no
  single factor could be identified as the cause, and no theory-driven or exploratory alternative
  model reached acceptable fit. The nearest East Asian sample in the study is the one where the
  instrument's structure could not be established at all.

This supersedes the unverified "inadmissible in three" note above, which is now confirmed but was
recorded as secondary.

#### 5. The invariance result, which decides how the score may be displayed

Item numbering was cross-checked before drawing conclusions: the paper's BIT-asterisked items map
exactly onto the BIT's freed-intercept set {16, 31, 20, 28, 3, 34}, and the Flow discussion pins
items 19–21, so the item-to-subscale mapping is certain. Accomplishment is items **28–30**.

**In the CIT's seven-country invariance test, the freed intercepts were items 13, 9, and 25** —
Loneliness, Trust, and Learning. Accomplishment's three items were **fully scalar invariant**.

**In the BIT's ten-country test, the freed intercepts included item 28 — "I am achieving most of my
goals."** Intercept non-invariance is precisely the property that breaks *mean comparison* across
cultures.

The two results are not in conflict — different models, different item sets — but the second is the
binding one for a Thai user compared against an American norm.

**Therefore: score the subscale, do not rank it.** See the decisions below.

US norms are recorded here for completeness, and deliberately **not** wired into `benchmarks.js`:
N = 1,090, **M = 3.30, SD = 1.06**, quartiles 2.67 / 3.33 / 4.00 — which is **57.5** on the app's
0–100 normaliser. Accomplishment has the lowest mean of any positively-worded CIT subscale except
Community.

#### 6. There is no published CIT aggregation rule. This was searched for, not merely unfound.

The round's follow-up question was whether the CIT publishes its own rule for combining subscales,
because a published rule would make any weight in `personalGoalsComposite` a citation rather than an
inference — the way FinHealth's stated "average of the point values for questions 1–8" settled the
equivalent question in round 11.

**It does not.** Su et al. treat the 18 subscales as 18 separate scores throughout. In the validity
regressions the CIT enters as eighteen predictors; the only overall figure computed anywhere is a
*sum of relative importance weights*, which is a statistic about variance explained, not a scoring
rule. No CIT total-score formula appears in the paper.

What exists instead, and it is weaker: when these authors built a composite of this instrument
themselves — the BIT — they took **one item from each of ten different subscales and weighted them
equally**, as a unit-weighted single factor with no facet privileged. That is the authors' revealed
aggregation practice across facets, and it is an inference from their construction rather than a
stated rule. It is recorded at that strength and must be disclosed at that strength.

#### Decisions taken on this evidence

1. **Weight: equal thirds.** `personalGoalsComposite` becomes an equal-weighted mean of GSE-6,
   CIT Accomplishment, and learning. The justification is the BIT's unit weighting plus the CIT's own
   treatment of Mastery facets as coordinate — **an inferred precedent, not a published rule**, and
   the release must disclose it in the register v69 used for the 0.15 income weight. The alternative
   considered and not taken was dropping Accomplishment into grit's vacated 0.3 slot, whose only
   virtue was changing one thing at a time.
2. **No benchmark.** Accomplishment is displayed unranked. No `benchmarks.js` entry, no percentile,
   no band — because item 28's intercept is known to move across cultures and the only norms
   available are American. This is cheaper to build than the alternative and better supported.
3. **The two cautions above stand unchanged**, and the Mental non-independence in §3 joins them as a
   third thing the adopting release must state rather than imply.

#### What remains open after this addendum

- **Nothing about the instrument.** Items, scale, licence, reliability, stability, discriminant
  correlations, cross-cultural behaviour and norms are all now at primary source.
- **Still unanswered, and unchanged by these PDFs:** whether goal progress predicts wellbeing over
  and above self-efficacy. It would need a regression nobody in this literature appears to have run.
- **Still NOT FOUND:** any Thai validation of the CIT or BIT, and any licence to score wellbeing from
  observed pledge attainment (Q4). Pledges stay XP.
- **Newly raised, not pursued:** `learningScore` is now the only term in the aspect not drawn from a
  published instrument — half of it is an unvalidated self-rated slider — and the CIT publishes a
  **Learning** subscale under the same licence (α .79–.82) that would replace it. Note that its first
  item is item 25, one of the CIT's freed intercepts, so it carries the same do-not-benchmark
  property. Deliberately deferred to a release after the Accomplishment addition, because it changes
  an existing score rather than adding one.

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
