# Round 7 research brief — do Personal Goals and Humanity Future earn aspect status, and what should they measure?

Status: **PARTLY CLOSED — answered 2026-08-14.** ASK C is answered and acted on in
v64. ASK A has candidates but none adopted. **ASK B returned nothing usable: both
Thai sources the export supplied are fabricated.** Read `## Outcome` at the foot of
this file before treating anything above it as settled.

Purpose: settle whether the two most contested aspects in the app should remain aspects, and
if so, replace the item sets behind them. This round differs from rounds 4-6: it asks a
**taxonomy** question before it asks a sourcing question. If the answer to Q1 is "no", most of
the rest of the round is moot, and that is an acceptable and cheap outcome.

Affected code:

| Aspect | Items | Scoring | Benchmark |
|---|---|---|---|
| Personal Goals | `gse` (`surveys.js:182`), `grit` (`surveys.js:193`) | `personalGoalsComposite` (`scoring.js:271`) | `personalGoalsBenchmark` (`benchmarks.js:770`) |
| Humanity Future | `lfis` (`surveys.js:229`) | `calculateHumanityFutureScore` (`scoring.js:383`) | `humanityFutureBenchmark` (`benchmarks.js:953`) |

## Why this round exists — a pre-audit of the two aspects (2026-08-14)

Not a hypothesis. Each finding below was read off the code before the brief was written.

### Finding 1 — "Personal Goals" contains no goals

```js
// scoring.js:271
0.4 * gseScore(gseRaw) + 0.3 * gritScore(gritRaw) + 0.3 * learningScore(profile)
```

GSE-6 measures generalised self-efficacy; Grit-S measures perseverance; `learningScore`
(`scoring.js:185`) is study hours plus self-rated digital literacy. **No item asks what the
user is aiming at, whether they are progressing toward it, or whether the goal is their own.**
The aspect is named for a construct it does not contain.

### Finding 2 — 70% of Personal Goals is trait, not state

Every other aspect measures a state or behaviour that can change: income, BMI, sleep, network
size, recycling frequency. GSE and Grit are **trait-stable by design**. This is a category
error against the other seven, and it has a concrete consequence for the yearly-retest plan:
conscientiousness will not move between retests, so 70% of this aspect is dead weight in any
longitudinal view.

### Finding 3 — Humanity Future's band is decided by one income proxy

```js
// benchmarks.js:954-955
const invested = Boolean(profile.longTermInvestments);
const { floor, ceil, fallback } = invested ? FUTURE_BANDS.invested : FUTURE_BANDS.none;
```

The percentile band turns entirely on **owning a retirement product**. LFIS only positions
within the band, and the two-stage architecture is explicitly band-locked — "stage 2 can never
cross a boundary stage 1 set" (`benchmarks.js:193`). A person who has taught three children a
trade and sustains a community, but holds no pension, is placed in the lower band **by
construction**, and no amount of legacy-building can lift them out.

### Finding 4 — three of LFIS's five items are occupation-, income-, or ideology-coded

| # | Item | Audit |
|---|---|---|
| 1 | "…skills that will stay relevant in the future **(AI, data, languages)**" | The parenthetical is knowledge-work coded. Soil management, culinary technique or a trade certification do not read as this. |
| 2 | "…leave a positive legacy beyond my own life" | **Universal. The actual construct.** |
| 3 | "…donate to causes addressing future generations' well-being" | Income-gated; overlaps Social Contribution's donation items. |
| 4 | "…plan my finances with a horizon of 10 years or more" | Income-gated; overlaps Finance. |
| 5 | "…support causes addressing **global existential risks (climate, pandemics, AI safety)**" | Ideology-coded, effective-altruism adjacent; near-floor for most Thai adults. |

### Finding 5 — the same facts are scored up to three times

High income raises Finance; donations raise Social Contribution; pension plus future-cause
donations raise Humanity Future. One circumstance, three credits — and symmetrically, three
penalties for one circumstance at the other end. Separately, `weeklyLearningHours` feeds both
`learningScore` and `futureStudyScore` (`scoring.js:196`), giving one input twice the leverage
of sleep across the eight-aspect total. The code acknowledges the reuse deliberately; the
compounding across Finance / Social / Future does not appear to be deliberate anywhere.

### Finding 6 — Humanity Future is ranked against a number we invented

`averages.js:67` sets the reference profile's LFIS to `[2,2,2,2,2]` — "app-authored items:
scale midpoint (ASSUMPTION)". Users receive a percentile against a guess.

**Together these are why the round is being run.** The construct may well be sound; the
operationalisation demonstrably is not.

## Verified leads found before writing this brief (2026-08-14)

Round 6's closing lesson was that a brief seeded from the codebase inherits the codebase's
errors. Every DOI below was resolved through the Crossref API and the returned title checked
against the claim it is attached to. **Do not re-verify these five; answer what they leave
open.**

1. **Generativity is a real, validated construct with a standard instrument.** McAdams & de St.
   Aubin (1992), *"A theory of generativity and its assessment through self-report, behavioral
   acts, and narrative themes in autobiography."* J. Personality and Social Psychology
   **62(6), 1003-1015**, `doi:10.1037/0022-3514.62.6.1003` — resolves, title matches. Source of
   the **Loyola Generativity Scale (LGS)** and the Generative Behavior Checklist.

2. **A shorter alternative exists.** Morselli & Passini (2015), *"Measuring Prosocial Attitudes
   for Future Generations: The Social Generativity Scale."* Journal of Adult Development
   **22(3), 173-182**, `doi:10.1007/s10804-015-9210-9`. Also deposited in PsycTESTS as
   `doi:10.1037/t48333-000`.

3. **Purpose is empirically separable from other wellbeing facets, and predicts hard
   outcomes.** Ryff (1989), *"Happiness is everything, or is it? Explorations on the meaning of
   psychological well-being."* JPSP **57(6), 1069-1081**, `doi:10.1037/0022-3514.57.6.1069` —
   the six-factor model separating *Purpose in Life* and *Personal Growth*. Hill & Turiano
   (2014), *"Purpose in Life as a Predictor of Mortality Across Adulthood."* Psychological
   Science **25(7), 1482-1486**, `doi:10.1177/0956797614531799` — MIDUS, 14-year follow-up,
   purpose predicted mortality **controlling for other wellbeing markers**. That control is the
   part that matters here: it is evidence of incremental validity, i.e. that purpose is not
   redundant with the Mental aspect.

4. **Grit's status is contested at meta-analytic scale.** Credé, Tynan & Harms (2017), *"Much
   ado about grit: A meta-analytic synthesis of the grit literature."* JPSP **113(3),
   492-511**, `doi:10.1037/pspp0000102` — resolves, title matches. The app weights Grit-S at
   0.3 of an aspect; the specific effect sizes and the conscientiousness-overlap estimate must
   be read from the paper, not from summaries of it.

5. **A goal-quality instrument exists that is not a trait measure.** Sheldon & Elliot (1999),
   *"Goal striving, need satisfaction, and longitudinal well-being: The self-concordance
   model."* JPSP **76(3), 482-497**, `doi:10.1037/0022-3514.76.3.482`.

### Two pre-search results that shape what to expect

- **Thai Ryff validations exist, but not on the population this app serves.** Located: Thai
  university and high-school student samples, and a sample of 111 Thai patients with major
  depressive disorder (Sakunpong et al., *Depression Research and Treatment*, 2021). These are
  useful for ASK A (a Thai translation exists) and **useless for ASK B** (neither is a general
  adult population). Expect the same pattern elsewhere and report it that way.
- **Generativity fairness evidence may not exist.** A targeted search for LGS measurement
  invariance or differential item functioning across **socioeconomic status or occupation**
  returned nothing. Invariance work by gender and age appears to exist; by SES/occupation it
  did not surface. **A NOT FOUND on Q2 is therefore a likely and fully acceptable result.** Say
  so plainly rather than substituting gender or age invariance and presenting it as an answer.

---

Paste everything below the line into Gemini Deep Research.

---

# Research task: purpose, generativity, and goal instruments — dimensionality, fairness, and Thai population data

## Your role and the single most important rule

You are sourcing psychometric evidence and instruments that will be written into a health
self-assessment app used by real people. Every claim and number you return will be
**independently re-verified against its primary source before use**. A claim I cannot trace and
confirm is worse than no claim, because it costs review time and is then discarded.

**"NOT FOUND" is a correct, valuable and expected answer.** One of the two live options in this
round is *removing* these aspects from the app. Evidence that a construct is not separable, or
that no fair instrument exists, directly supports a decision I am willing to make. **Do not
fill gaps. Do not manufacture a positive finding.**

A prior export in this project stated a confident central verdict that was wrong and closed the
best available lead. Verifying it reopened the lead and exposed a live defect in the app. State
your confidence honestly and mark anything you could not open.

## The three separate questions you must answer for every source

**Label every source ASK A, ASK B, ASK C, or a combination. Never merge them.**

- **ASK A — VALIDATED ITEMS.** A published instrument whose items and scoring I can adopt with
  a citation. No population data required. What matters is exact item wording, response scale,
  scoring direction, published reliability, and **licence terms**.
- **ASK B — A THAI POPULATION DISTRIBUTION.** A nationally representative Thai adult sample
  reporting the distribution of these constructs. Not students. Not patients. Not one province.
- **ASK C — DIMENSIONALITY AND FAIRNESS EVIDENCE.** This is the ask that decides whether these
  aspects survive at all, and it has two halves that must be reported separately:
  - **C1 — Discriminant / incremental validity.** Is purpose (or generativity) empirically
    separable from general mental wellbeing, life satisfaction, and personality? Does it
    predict anything **after controlling for** those?
  - **C2 — Measurement invariance / differential item functioning across socioeconomic status,
    education, income, or occupation type.** Do people at equal true levels of the construct
    score differently because of the items' content? This is the crux of the round.

## Absolute prohibitions

- Do not **pool, average, or meta-analyse** across studies or countries yourself.
- Do not **interpolate or extrapolate** across bands, score points, or years.
- Do not **convert between measures** — not between instruments, not between response scales of
  different lengths, not between a mean and a distribution.
- Do not **re-band** data into groups the source did not publish.
- Do not **reconstruct a distribution from a mean and SD.**
- Do not cite a review, blog, secondary summary, news article, AI answer, or a figure quoted in
  another paper's background section. Go to the **primary publication, official statistical
  release, or data archive**. If you can only reach a secondary mention, mark it
  `SECONDARY ONLY — unverified`.
- **Do not present your own tabulation of microdata as a published statistic.** Mark it
  `MICRODATA ONLY — not published`. This distinction is decisive and I will act on it.
- **Do not substitute a different grouping variable for the one asked.** If you find invariance
  by gender or age but not by SES or occupation, that is a NOT FOUND on C2. Report the gender
  and age work separately, clearly labelled as not answering the question.

## Known traps in this exact subject area

Real errors already caught in this project, plus ones specific to this round:

- **Mismatched citations.** A previous export attached the DOI of an *attachment
  questionnaire* to a claim about a *loneliness scale*. Another rewrote a table row and
  presented it as a verbatim quote. **Open every DOI. Confirm the returned title matches the
  claim before submitting.**
- **A "Thai" figure that is not Thai.** A widely cited "Thai" self-efficacy norm traces to 135
  head nurses in Yunnan, CHINA. Confirm the sample's country and occupation, not the authors'
  affiliation.
- **A "population" sample that is students or patients.** Already confirmed for this topic: the
  Thai Ryff validations located so far are university students, high-school students, and 111
  major-depressive-disorder patients. State the sampling frame **first and prominently**, every
  time.
- **Attitude vs behaviour vs disposition vs trait.** "It matters to me that future generations
  thrive" (attitude), "I taught someone a skill this year" (behaviour), "Helping describes me"
  (disposition) and "I am a hard worker" (trait) are four different constructs. Say which one
  each instrument measures. The app currently mixes all four inside one aspect, which is part
  of what I am trying to fix.
- **Generativity is life-stage theory, not a universal standard.** Erikson locates generativity
  in **midlife**. If the literature supports that, a low score at 22 is developmentally
  expected, not a deficit — and any norm must be **age-stratified**. Report age effects
  explicitly. The app already age-bands one aspect (CFPB, 18-61 vs 62+), so it can do this.
- **Construct-name drift.** "Purpose", "meaning", "generativity", "legacy", "long-term
  orientation" and "future time perspective" are **not synonyms** and have separate literatures
  and instruments. Do not treat a finding about one as a finding about another.
- **Licensing is a live constraint.** Some wellbeing scales require written permission or a fee
  for non-research use in an app. Report licence terms for every ASK A candidate. An instrument
  I cannot legally ship is not a candidate.

## Context: exactly what the app asks today

This is a Thai-language wellbeing self-assessment scoring eight aspects 0-100 and showing each
against a cited Thai population percentile. Users are **Thai adults, roughly 18-85, general
population** — not students, not patients. It has a leaderboard, so scores are compared between
people. That is why fairness across occupation and income is not academic here.

**Aspect "Personal Goals" — currently GSE-6 + Grit-S + study hours:**

GSE-6 (4-point agreement): "I can always manage to solve difficult problems if I try hard
enough." / "If someone opposes me, I can find the means and ways to get what I want." / "I am
confident that I could deal efficiently with unexpected events." / "Thanks to my
resourcefulness, I know how to handle unforeseen situations." / "I can solve most problems if
I invest the necessary effort." / "I can usually handle whatever comes my way."

Grit-S perseverance facet (5-point like-me): "I finish whatever I begin." / "Setbacks don't
discourage me." / "I am a hard worker." / "I am diligent."

Plus weekly study hours and self-rated digital literacy.

**Aspect "Humanity Future" — five app-authored items, 5-point frequency, scored 0-20:**
1. "I actively learn skills that will stay relevant in the future (AI, data, languages)."
2. "I do things intended to leave a positive legacy beyond my own life."
3. "I support or donate to causes addressing future generations' well-being."
4. "I plan my finances with a horizon of 10 years or more."
5. "I support causes addressing global existential risks (climate, pandemics, AI safety)."

Plus a yes/no on holding long-term retirement investments.

**The specific fairness concern driving this round.** Human work divides roughly into
*maintaining* (farming, cooking, caregiving, repair, manual and repetitive labour — the work
that keeps a community alive) and *creating* (research, development, design). The items above
appear to reward the second and penalise the first. A farmer who teaches three children a trade
scores near zero. **I need to know whether that is a flaw in my items or a property of the
construct itself** — those have opposite fixes.

## Output format — required for every source

```
SOURCE NAME:            [instrument, study, or survey; exact name and version]
SERVES:                 [ASK A - items | ASK B - Thai distribution | ASK C1 - dimensionality | ASK C2 - fairness/DIF | combination]
CONSTRUCT:              [purpose | meaning | generativity | goal quality | self-efficacy | trait | behaviour frequency | attitude | mixed]
CONSTRUCT DEFINITION:   [how THIS source defines it, in its own words]
ITEMS:                  [exact wording, or count + where to obtain them]
RESPONSE SCALE:         [option count + exact labels + numeric coding + score range + direction]
AGE EFFECTS:            [does the source report scores by age band? give them]
FIGURE TYPE:            [full distribution | percentiles | mean+SD | prevalence | factor loadings | fit indices | effect sizes | N/A]
VALUES:                 [numbers exactly as published; the whole table if there is one]
PUBLISHED OR MICRODATA: [PUBLISHED in a report/annex | MICRODATA ONLY - not published]
POPULATION:             [country + sampling frame; probability sample, panel, students, patients]
SAMPLE SIZE:            [N for this specific cell]
DATA YEARS:             [when COLLECTED]
THAI VERSION:           [validated Thai translation? cite it + its sampling frame, or "none located"]
LICENCE/COST:           [free for commercial/app use? permission required? fee? unknown?]
SOURCE TYPE:            [PRIMARY peer-reviewed | PRIMARY official statistic | data archive | SECONDARY ONLY - unverified]
CITATION:               [authors, year, full title, journal, volume(issue), pages]
PERSISTENT ID:          [DOI/ISBN/archive number; "none" if genuinely absent]
DOI CHECK:              [state that you opened it and the returned title matched — or that it did not]
EXACT LOCATION:         [table/figure/page/variable name/appendix]
VERBATIM QUOTE:         ["the sentence or table cell, copied exactly, not paraphrased"]
URL:                    [direct link to the document, not a search page]
CONFIDENCE:             [high | medium | low] + one line why
```

End with a **summary table**: one row per source, columns = SOURCE NAME, SERVES, CONSTRUCT,
PUBLISHED OR MICRODATA, THAI VERSION, LICENCE, PERSISTENT ID. I read this first.

---

# The questions, in priority order

## Q1 — Does purpose earn separate-dimension status? (HIGHEST — ASK C1)

This decides whether the aspect survives. I need the case **for and against**, not advocacy.

1. **Factor-analytic evidence.** Does Purpose in Life load as a factor distinct from life
   satisfaction, positive affect, and depression? Ryff's six-factor model has been contested —
   find the **critiques** (Springer & Hauser and any replies) as well as the supporting work.
   Report fit indices and inter-factor correlations as published. If Purpose correlates .8+
   with another factor, say so; that would argue for merging it into Mental.
2. **Incremental validity.** Beyond Hill & Turiano 2014, what predicts what **after
   controlling** for other wellbeing facets? Include null and failed-replication results.
3. **Is generativity separable from purpose?** Or are LGS and Ryff-Purpose measuring one thing?
   Report their observed correlation if published. This determines whether the app needs one
   aspect here or two.
4. **Applied precedent.** Do any established national or international wellbeing frameworks
   treat purpose as a **separate measured domain** — OECD Better Life / How's Life, the UK ONS4
   ("to what extent do you feel the things you do in your life are worthwhile?"), WHO-QOL,
   national wellbeing accounts? List which include it, which do not, and the exact item wording
   where they do. A one-item national measure that ships at population scale is extremely
   valuable to me.

## Q2 — Is generativity fair across occupation and social class? (HIGHEST — ASK C2)

**The crux of the round.** My pre-search found nothing; a NOT FOUND is expected and useful.

1. **Measurement invariance or DIF studies for the LGS, Social Generativity Scale, or any
   generativity measure, across socioeconomic status, education, income, or occupational
   class.** If none exist, say so explicitly.
2. **Mean differences by SES/occupation**, even without formal invariance testing. Do
   working-class and blue-collar samples score lower on the LGS? Is any observed gap attributed
   to item content rather than true differences?
3. **Does the theory include maintenance work?** McAdams frames generativity as involving
   creating, maintaining, and offering. Quote the theoretical treatment **verbatim** and state
   whether *maintaining* is genuinely part of the construct or a gloss added by later authors.
   Then check whether the LGS **items** actually operationalise maintenance, or only creation
   and mentoring. Theory and items can diverge and that difference is the whole question.
4. **Non-Western and non-professional samples.** Any generativity work in agricultural,
   manual-labour, informal-sector, or rural populations — anywhere, not only Thailand.
5. **Parallel literature.** If generativity has no SES/DIF work, is there equivalent evidence
   for **purpose** or **meaning in life** scales across class or occupation? The MLQ and Life
   Engagement Test are widely used and more likely to have been tested.

## Q3 — Generativity instruments I could adopt (HIGH — ASK A)

For each: exact items, response scale and coding, reliability, factor structure, licence, and
whether a validated **Thai** translation exists.

- **Loyola Generativity Scale (LGS)**, McAdams & de St. Aubin 1992 — 20 items. Confirm the
  full item list, the 4-point scale and its exact labels, and whether the items appear in the
  paper's appendix or must be licensed. Note any short forms.
- **Generative Behavior Checklist (GBC)** from the same paper — a **behaviour** measure rather
  than a disposition measure. Given that the app's other aspects measure behaviour frequency,
  this may fit better than the LGS. Report its items and recall window.
- **Social Generativity Scale**, Morselli & Passini 2015 — 6 items. Confirm items, scale,
  psychometrics, and translations.
- Any generativity measure developed **in or for an Asian population**, with its validation
  sample.
- Any measure explicitly designed to capture generativity in **non-professional** roles —
  parenting, caregiving, teaching a trade, community maintenance.

## Q4 — Instruments for goals, purpose and growth to replace GSE + Grit (HIGH — ASK A)

The app needs items that measure **what someone is working toward and whether they are moving**
— a state that changes between yearly retests, not a stable trait.

- **Ryff Purpose in Life and Personal Growth subscales.** Give the exact items for the **9-item,
  7-item, and 3-item** per-scale versions, the response scale, reverse-keyed items, and scoring.
  **Licence terms for use in a commercial app are essential** — report them explicitly.
  Confirm which Thai translation exists and its sampling frame.
- **Meaning in Life Questionnaire (Steger)** — 10 items, Presence and Search subscales. These
  two behave differently and must not be summed blindly; report both. Licence and Thai version.
- **Life Engagement Test (Scheier et al.)** — 6 items, purpose-focused, brief.
- **Self-concordance (Sheldon & Elliot 1999)** — this is an idiographic procedure where the
  respondent lists their own goals and rates each for autonomy. Report **how it is administered
  and scored**, and assess whether it can work in a short self-serve app form. If it cannot,
  say so; that is a useful negative.
- **Goal-progress measures** usable without a therapist: any validated short scale of perceived
  goal progress or goal attainment in general adults.
- **Brief national single items**, e.g. the ONS "worthwhile" item — exact wording, response
  scale, and published population distributions.

## Q5 — Thai population data for purpose, meaning or generativity (MEDIUM — ASK B)

Stage 1 of this app's two-stage percentile needs a **published Thai statistic**. Currently
Humanity Future's stage 1 is pension ownership, which is an income proxy.

- **World Values Survey, Thailand** — which waves, and does it carry items on meaning, life
  purpose, importance of leaving something for future generations, or long-term orientation?
  Are Thai country tables published on worldvaluessurvey.org?
- **Asian Barometer Survey, Thailand** — comparable items?
- **ISSP** modules Thailand has fielded (King Prajadhipok's Institute is the member
  institution) — does any carry purpose, meaning, or intergenerational-obligation items?
- **Thai National Statistical Office** — any mental-wellbeing, happiness or social-capital
  survey carrying a purpose or "worthwhile" item, with published distributions.
- **Thai Department of Mental Health** — the DMH fields Thai happiness and mental-health
  indicators (e.g. TMHI-15, already used elsewhere in this app). Does any DMH instrument carry
  a purpose or meaning subscale with **published population distributions**, ideally age-banded?
- Any Gallup World Poll Thailand item on purpose or "learning something interesting yesterday"
  with a published national figure.

**Age-banded distributions are worth substantially more than a single national number**, given
the Erikson life-stage issue.

## Q6 — Should grit stay in the app at all? (MEDIUM — ASK C1/A)

The app weights Grit-S at 0.3 of an aspect. Read the primary sources, not the commentary.

1. Credé, Tynan & Harms 2017 (`doi:10.1037/pspp0000102`): report the **actual** meta-analytic
   estimates — the corrected correlation between grit's perseverance facet and
   conscientiousness, grit's validity for performance outcomes, and the authors' verdict on the
   higher-order construct. Quote the key figures verbatim with table numbers.
2. Duckworth's published **response** to that critique, and any later meta-analysis.
3. Is there a validated **Thai** grit measure in general adults, and any Thai norm?
4. If grit is largely conscientiousness, is there a defensible reason for a wellbeing app to
   score it as a life domain rather than report it as a trait? Argue **both** sides.

---

## Final self-check before you submit

- Did I open the actual source document, not a summary of it?
- **Did I open every DOI and confirm the returned title matches the claim I attached it to?**
  State this per source. Three separate mismatched-citation defects have been caught in this
  project already.
- Did I label every source ASK A / B / C1 / C2 and never merge them?
- Did I state the CONSTRUCT and the source's own definition of it, for every entry?
- For C2, did I resist substituting gender or age invariance for the SES/occupation question I
  was actually asked?
- Did I state the sampling frame first, and flag every student, patient, single-province and
  online-panel sample as **not** a population norm?
- Did I report **age effects** wherever published, given the life-stage issue?
- Did I report **licence terms** for every ASK A candidate, including whether commercial app use
  is permitted?
- Did I include disconfirming evidence — failed replications, critiques, null results — rather
  than only the supporting case?
- Would a reviewer with only my citation and location field find this exact item or number in
  under two minutes?

Close with an explicit **NOT FOUND list**: every question and sub-question where you searched
and found nothing, with one line on where you looked. **A solid negative on Q2 is one of the
most valuable things you can return** — if no fairness evidence exists for generativity across
social class, that itself is a finding I will act on, and inventing a weak substitute would
cost me more than the gap does.

---

# Outcome — 2026-08-14

Export: *"Psychometric Evaluation and Taxonomic Restructuring of Personal Goals and Humanity
Future."* Structurally the best export this project has received — it followed the output
format, labelled ASK A/B/C properly, and produced a real NOT FOUND register. Every load-bearing
claim was still re-verified at source before use. **The structural argument survived. Both Thai
population sources did not.**

Shipped as v64 (see the CHANGELOG entry for 2.15.0). Everything shipped is a SUBTRACTION;
nothing was adopted, because nothing verified well enough to adopt.

## ASK C — answered, and acted on

**Ryff's Purpose in Life has a genuine discriminant-validity problem.** Verified directly from
Springer, Hauser & Freese (2006), *"Bad news indeed for Ryff's six-factor model of well-being"*,
Social Science Research 35:1120-1131. Verbatim from the paper:

> "In the WLS the correlations among the four factors are all above 0.9 even before we adjust
> for methodological artifacts created by item proximity and polarity (reverse-scoring)."

> "four of the six RPWB factors are virtually indistinguishable"

The export gave the WLS Purpose↔Self-Acceptance range as "0.85 to 0.97". **The floor is too
low** — the source says all four are above .9. So the finding is *more* damaging to Ryff than
the export claimed, which is an unusual direction of error. Corroborated inside the same paper:
Van Dierendonck (2004) found correlations approaching .90; Kafka & Kozma (2002) concluded the
structure "is limited to face validity."

Consequence for us: if we ever adopt a purpose instrument, **it should not be Ryff's**, and it
must not be scored alongside Mental without checking overlap.

**Grit: decommission. Done in v64.** Credé, Tynan & Harms 2017, `doi:10.1037/pspp0000102` —
DOI resolves, title matches. ρ ≈ .84 with conscientiousness, higher-order structure
unconfirmed, ΔR² < .005 over the Big Five. Grit is still asked and shown; it no longer scores.

**Q2 — NOT FOUND, and the export was honest about it.** No measurement-invariance or DIF study
exists for the LGS or SGS across socioeconomic status, occupation or income. This matches the
independent pre-search recorded above. Critically, the export **did not substitute** the
gender/age invariance work and present it as an answer — the failure mode this brief was
written to prevent. That is the first time an export in this project has declined a tempting
substitution.

So the fairness question is unanswerable from the literature. That is itself decisive: **we
cannot certify any generativity instrument as fair across occupation, so we should not rank
anyone on one.**

## ASK B — NOTHING USABLE. Both sources fabricated.

This is the finding that shaped the release.

**1. The claimed national TMHI-15 norm does not exist.** The export reported mean 46.85, SD
6.42, N = 7,337, a five-region national probability sample, a 2018-2020 re-standardization,
age-banded published distributions, page numbers, and `CONFIDENCE: High` — citing *J.
Psychiatric Association of Thailand* **54(3)**, 2009.

Round 2 of this project already settled this at the primary Thai-language source. See
[round-2-findings.md](round-2-findings.md): the real norm table gives **mean 29.71, SD 4.10 on
a 0-45 range, N = 1,429, nineteen NORTH-EASTERN provinces, data 2000-2001**, published in
volume **46(3)**, 2001. Round 2's verdict, verbatim: *"No published source reports a mean and
standard deviation of the TMHI-15 total for a nationally representative Thai general-adult
sample."*

The export manufactured a national norm that this project had specifically established does not
exist, and dressed it with a mean, an SD, a sample size, age bands and a page range. **It was
caught only because we had already done the work.** That is the strongest argument yet for
keeping these round files: prior verified findings are the cheapest defence against a
confident-sounding fabrication.

**2. The WVS Wave 7 Thailand variables are demographic fields.** The export cited Q262 as
*"Generational solidarity and environmental protection for future generations (10-point
scale)"* and Q275-Q280 as *"post-materialism and long-term societal orientation indices."* In
WVS7, **Q262 is the respondent's age** and Q275 is highest educational level; both sit in the
Q260-Q290 demographics block. This matters because WVS7 Thailand was the sole basis for the
export's implementation step 3, *"Implement Age-Stratified Normative Benchmarking… using World
Values Survey Wave 7 Thai reference data."*

**Consequence: there is no Thai norm for purpose or generativity, so Humanity's Future is now
unranked** rather than re-based. `humanityFutureBenchmark` returns `percentile: null` with an
`unranked` reason, following the `relationships` precedent.

## ASK A — candidates, none adopted

- **LGS** (McAdams & de St. Aubin 1992) — 20 items, 4-point, α ≈ .83, published in the paper's
  appendix. Item content skews to high-agency creation and enduring public legacy.
- **Social Generativity Scale** (Morselli & Passini 2015) — 6 items. **Not adopted, and not
  merely deferred.** It is a 7-point ATTITUDE scale validated on N = 199 Italian internet
  volunteers, while every other aspect in this app measures behaviour frequency. Its item 5
  ("things that will survive even after I die") is the same enduring-legacy framing the export
  itself flagged as overrepresented in the LGS, and **no SGS item mentions teaching a trade,
  raising children, caregiving, or maintaining anything concrete.** It would not score the
  farmer meaningfully better. Adopting it would have traded one construct mismatch for another.
- **Life Engagement Test** (Scheier et al. 2006, `doi:10.1007/s10865-005-9044-1` — DOI verified)
  — 6 items, free, brief, measures the value of one's actual activities rather than public
  achievement. **The best ASK A candidate.** But the export's reason for recommending it,
  *"stable unidimensionality across diverse educational and occupational backgrounds"*, is
  contradicted by its own source sheet: the validation samples are undergraduates, middle-aged
  women, and coronary-artery-bypass patients. There is no occupational diversity in that set.
  The instrument may still be the right choice; the fairness claim is unsupported.
- **Ryff Purpose/Growth** — proprietary, commercial app use requires licensing. Combined with
  the Springer-Hauser finding, this is effectively closed.

## Defects and gaps in the export

1. **The TMHI-15 national norm is fabricated** (above). Most dangerous finding in the round.
2. **WVS7 variables misattributed** (above).
3. **The McAdams "verbatim quote" is not from McAdams.** Attributed to the 1992 paper at
   p. 1004, it reads *"…generative actions, involving creating, maintaining or offering acts
   concerning the next generations (McAdams and de St Aubin, 1992)."* A 1992 paper cannot
   contain a parenthetical citation to itself. It is a sentence from a later source quoting
   McAdams, presented as primary. Third round running for this defect class. The substance is
   probably right, but it is now unverified — and it is the load-bearing claim for whether
   maintenance work is inside the construct.
4. **The central fairness claim is unsupported by the export's own data** (LET, above). Same
   for MLQ-Presence's *"r < 0.10 with SES"*, which carries no citation at all.
5. **Every ASK C1 number is prose-only** — Hill & Turiano's HR 0.85 [0.78, 0.93], the 17%
   cardiovascular reduction, the Rush Memory and Aging Project, LGS↔Purpose r = .42-.58, MIDUS
   r ≈ .18 / .12, d = 0.25-0.45. No source sheets, DOIs, pages or quotes. The rigorous format
   was applied to the instruments (the easy part) and dropped for the evidence that decides the
   question.
6. **"Maintenance is entirely absent from the LGS" overstates.** LGS item 18 is *"I have a
   responsibility to improve the neighborhood in which I live"*, and items 1 and 12 are
   knowledge transfer. Underrepresented, yes; absent, no.
7. **ONS**: mean 7.73 is **correct** (verified against the ONS bulletin), but the URL 404s and
   `URN: ONS-PWB-2023-BULLETIN` is not a real identifier. The real path is
   `.../bulletins/measuringnationalwellbeing/april2022tomarch2023`.

**Silently skipped** — asked, not answered, and absent from the NOT FOUND register:

- **The Generative Behavior Checklist** (Q3), from the same 1992 paper. A *behaviour* measure,
  which is what every other aspect here uses. Never mentioned. **Probably the best-fitting
  instrument in the whole round.**
- **Goal-progress measures usable without a therapist** (Q4) — the actual replacement for a
  Personal Goals aspect that measures goals.
- Generativity measures developed **in or for an Asian population**, and any measure built for
  **non-professional roles** (Q3). The second is the crux of the round.
- Thai NSO, DMH beyond TMHI-15, and Gallup World Poll Thailand (Q5).

## What shipped, and what is still open

Shipped in v64: grit out of the Personal Goals score; the pension out of the Humanity's Future
score AND out of its percentile band; the aspect unranked; LFIS items 1 and 5 de-biased; the
provenance table and methodology blurbs corrected. 464/464 tests pass, Biome clean.

Still open, in priority order:

1. **Round 8, narrow, one instrument: the Generative Behavior Checklist.** Items, recall window,
   scoring, licence, any non-Western validation. Round 2's one-question format is the right
   shape — the broad rounds keep returning fabrications buried in good material.
2. **A goal-progress instrument** for Personal Goals, so the aspect measures what its name says.
3. **The remaining double-count**: LFIS item 3 (donations toward future generations) still
   overlaps Social Contribution, and item 4 (10-year financial horizon) still overlaps Finance.
   Left in place because removing them without a replacement instrument would leave the aspect
   with two items.
4. **Whether `longTermInvestments` should score in Finance.** It currently scores nowhere. That
   needs its own citation and is deliberately not answered here.
