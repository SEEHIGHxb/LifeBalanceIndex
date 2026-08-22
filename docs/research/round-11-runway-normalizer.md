# Round 11 research brief — is there a defensible normalizer for runway?

Status: **CLOSED — 2026-08-22** (opened 2026-08-19). Opened by v70, which ships the runway measure *collected and
displayed but not scored*. This round has exactly one job: find out whether months-of-runway can
honestly be turned into a 0–100 component, or confirm that it cannot.

---

## FINDINGS — closed 2026-08-22

**Kill criterion 1 fired: a validated index does score an expense-coverage item, and does publish its
weight.** Runway *can* honestly become a 0–100 component. Two obstacles stand between that finding
and an implementation, and both are recorded below rather than resolved here.

Round 10's access failures did not reproduce. Both PDFs that returned HTTP 403 or could not be
located were retrieved without difficulty on the first attempt. **Round 10's negative on the
Financial Health Network was a search error, not an absence**: the weighting is published in the
*FinHealth Score Toolkit*, not in the Pulse report that round 10 cited for it.

### Q1 — Yes. The Financial Health Network scores it, at a published weight.

Source: *The Financial Health Network's FinHealth Score® Toolkit* (2021), pp. 3, 6, 8.
`https://finhealthnetwork.org/wp-content/uploads/2021/11/FinHealthScoreToolkit-2021.pdf`

Indicator 3 of eight, in the SAVE pillar. Item wording, quoted in full:

> "At your current level of spending, how long could you and your household afford to cover
> expenses, if you had to live on only the money you have readily available, without withdrawing
> money from retirement accounts or borrowing?"

Published point values (Toolkit p. 6, "Assigning Point Values"):

| Response | Points |
|---|---|
| 6 months or more | **100** |
| 3–5 months | **75** |
| 1–2 months | **50** |
| 1–3 weeks | **25** |
| Less than 1 week | **0** |

Published weight (Toolkit p. 7, "Calculating Scores"): the FinHealth Score is the **average of the
point values for questions 1–8**, and the SAVE sub-score is the **average of questions 3 & 4**.
Equal weighting, stated as a formula rather than inferred — **1/8 of the composite, 1/2 of SAVE**.
2021 U.S. national benchmarks are published alongside it (FinHealth 66, SAVE 61).

**The OECD/INFE asks the same question but does not score it continuously.** QF13 of the *OECD/INFE
Toolkit for Measuring Financial Literacy and Financial Inclusion 2022* (p. 22):

> "If you lost your main source of income today, how long could you continue to cover your living
> expenses, without borrowing any money or moving house?"

Bands: less than a week / at least a week but not one month / at least one month but not three /
at least three but not six / six months or more. In the toolkit's question-by-question annex the
"Creating financial literacy scores" column for QF13 is **blank** — it is a reporting indicator for
financial resilience, not a component of the literacy score. It *is* a component of the financial
well-being score reported in the 2023 international survey, but **binarised**: "1 point for being
able to cover living expenses for at least three months", one of four objective indicators rescaled
to 0–50, i.e. a published weight of 12.5/100 *for a yes/no at the three-month line*. The OECD
publishes a weight and destroys the distribution in the same step.

Not examined, because the brief says to stop once a criterion fires: UK MaPS, ANZ Roy Morgan, CFPB
supplementary measures.

**One caveat on the word "validated", stated rather than glossed.** Criterion 1 asks for a
*validated* index. The FinHealth Score is an industry instrument published by the Financial Health
Network and fielded annually in the U.S. Financial Health Pulse; **no peer-reviewed psychometric
validation of it was located**, and searching for one returned no technical or validation report.
That is a weaker footing than the CFPB Financial Well-Being Scale the app already uses, which ships
a technical report with its IRT calibration. So criterion 1 fired on "a named instrument that
publishes its item scoring and weights", which is what the app needs to cite honestly — but not on
"a psychometrically validated scale". Anyone acting on this should know which of the two they have.

### Q2 — No distribution exists. A single Thai anchor point does.

**Round 10's "Thai anchor NOT FOUND" is half overturned.** Thailand participated in the OECD/INFE
2023 international survey — fielded by the **Bank of Thailand**, n = **12,402**, face-to-face,
Q4 2022 (2023 report, Annex A). Its published result:

> **48.2% of Thai adults could cover their living expenses for at least three months** without
> borrowing money or moving house, if they lost their main source of income.

Source: OECD/INFE 2023 International Survey of Adult Financial Literacy, **Annex D, Table 4.4**
(published as a separate workbook, `Financial Literacy Survey Adults_Annex D.xlsx`). The same row
gives 40.97% for "income covered living expenses". Thailand has **no** composite financial
resilience score in Table 4.2 — only two of the four objective questions were fielded there.

For scale: 43% across all participating countries and economies, 49% across participating OECD
countries.

**But this is a binary, not a distribution — which is exactly the trap Q2.3 warned about.** No table
in the Annex D workbook publishes the five-band breakdown; the bands are collected and then
collapsed to a threshold before publication. Tables 4.1–4.14 were enumerated and none carries them.
So a normalizer cannot be *read off Thai data*. **Kill criterion 2 is a confirmed NOT FOUND**, now
on far better evidence than round 10 had.

One secondary source reports that 22.4% of Thais hold savings sufficient for six months or more,
attributed to the same 2022 BOT/NSO survey. **It could not be confirmed against a Bank of Thailand
or NSO primary document and is therefore excluded**, per the sourcing bar. If it were confirmed it
would give a second point on the Thai cumulative curve, which is why it is recorded here as an open
lead rather than dropped.

### Q3 — Both instruments use TOTAL spending. v70 asks for committed outflow. These do not match.

This is the first of the two obstacles, and it is not small.

- **FinHealth**: "**At your current level of spending** … cover expenses, if you had to live on only
  the money you have readily available, without withdrawing money from retirement accounts or
  borrowing." Denominator = total current spending. Numerator = liquid savings, retirement excluded.
- **OECD QF13**: "cover your **living expenses**, without borrowing any money **or moving house**" —
  the housing clause confirms the denominator includes rent, so again total living expenses.

`profile.committedOutflow` is defined in v70 as the unskippable slice — rent, loans, family support,
bills. That is a **strict subset** of total spending, so the same household's runway computed our way
is **always larger** than the quantity both instruments band. Applying the FinHealth point table to
our number would systematically overstate everyone's position, by a factor that varies with how
discretionary each person's spending is. The two numbers are not interchangeable and the mismatch
cannot be corrected without knowing the discretionary share.

**Q3.2** (published share of Thai household spending that is non-discretionary): not pursued —
criterion already fired. It is the natural first question if this line is ever picked up again,
because it is exactly the conversion factor the mismatch above requires.

**Q3.3 answered, as the expected negative**: neither instrument distinguishes committed from
discretionary outflow *at all*, so neither has a committed-outflow definition, and the question of
whether financial support given to family members counts inside one **does not arise**. Round 10
expected a negative from Western instruments; the negative is confirmed, and it is stronger than
expected — the distinction is absent rather than merely resolved the other way.

### Q4 — Concave, saturating at six months. From a point table, not a fitted curve.

The FinHealth point values imply the shape directly: 0 at under a week, then 25 / 50 / 75 / 100
across roughly half a week, 1.5 months, 4 months, and 6+ months. Strongly **concave** — the first
weeks of runway are worth far more per month than the fifth and sixth.

**The saturation point is 6 months**: it takes the maximum 100, and nothing beyond it scores higher.
Note that this is the ubiquitous "3–6 months" guidance appearing as an instrument's scoring rule
rather than as advice, which is a materially better thing — but it is still a **judgement encoded by
the instrument's authors, not a curve fitted to a distribution**. The Financial Health Network
publishes no statistic, sample, or regression for the shape. So the honest description is: a
published, citable, equally-weighted point table from a named instrument — not an empirically
derived normalizer.

### Not in the brief, and gating: the FinHealth Score is licensed.

The Toolkit carries "© 2021 Financial Health Network. All rights reserved." and no open licence.
The Financial Health Network's own measurement page states:

> "We offer the FinHealth Score Toolkit free of charge for research, advocacy, and internal business
> purposes." … "Use of the Score in software and commercial uses requires licensing through Attune,
> our exclusive technology partner for FinHealth Score implementation."

This app is software. Whether embedding one item's band-to-point mapping as a single component
normalizer constitutes "use of the Score in software" is a question this round cannot answer and
must not guess at. It is the second obstacle, and it is a permissions question rather than a
research one.

Separately: the Financial Health Network **released an updated FinHealth Score in early 2026**. Its
own page states the changes "build upon, rather than replace, our original FinHealth Score
framework, and the original Score remains valid", so the 2021 point table quoted above is not stale.
The 2026 toolkit itself is behind a request form and **was not retrieved** — an unresolved access
gap, named rather than worked around.

### Where this leaves v70

Unchanged, and correctly so. The brief forbids proposing a weight here, and nothing above should be
read as one. What changed is that "no published normalizer exists" is **no longer true** — one
exists, it is citable, and it is equally weighted. What stands between it and the Finance page is a
denominator that does not match ours and a licence that may not permit it. Both are decisions for a
release, not findings for a round.

The `runwayMonths` comment should **not** yet be changed to say "unscored permanently" — criterion 3
did not fire.

---

## Why this round exists

Round 10 asked what the Finance aspect should be made of, and answered decisively about **income**:
no validated instrument scores raw income at any weight, which is why v69 cut it from 0.6 to 0.15.

It did **not** answer the other half of the question. The two real people that started round 10 — a
friend earning 75,000 THB/month who supports family and carries debt, and the app's author living
on ~3,000 THB/month from family with no obligations at all — differ in a way that neither `income`
nor `savingsRate` can express. That difference is **committed outflow against liquid savings**, and
v70 now asks for both:

```
runway = liquidSavings ÷ committedOutflow     // months
```

v70 shows this number on the Finance page and **scores nothing with it**. `runwayMonths`
(`scoring.js`) returns months, `aspectFacts` (`aspects.js`) renders it as a line of text with no
0–100 value and no bar, and `tests/runway.test.mjs` asserts across five probes that no aspect score
moves by so much as a point when either field changes.

**That restraint is the open question, not the answer.** A bar needs a scale. Saying that 3 months
is worth 40 and 9 months is worth 85 requires a published distribution to read those numbers off,
and round 10 could not find one:

| What round 10 sought | Outcome |
|---|---|
| OECD/INFE financial-competence instrument | **HTTP 403** — the instrument PDF could not be retrieved |
| Financial Health Network FinHealth component weighting | **Absent from the report cited for it** |
| Thai anchor for emergency savings / months covered | **Confirmed NOT FOUND** |

Two of those three are unresolved *access* failures rather than confirmed negatives, which is
precisely why this is a round and not a closed decision.

---

## Kill criteria — decide the round, then stop

State which fired, and stop researching once one does.

1. **A validated index scores an expense-coverage / runway / emergency-savings item as a component,
   and publishes its weight.** → Runway becomes a scored component at that weight. Quote the item,
   the scale, and the weight.
2. **A published distribution of months-covered exists for Thailand, or for a comparable
   middle-income setting that names itself as such.** → A normalizer can be built the way
   `incomeStandingScore` was: anchored to published points, with the inference disclosed.
3. **Both are confirmed NOT FOUND against primary sources.** → Runway stays unscored **permanently**,
   the code comment in `runwayMonths` is updated from "until round 11" to say so, and the round
   closes as a confirmed negative rather than an open question.

A round that closes on criterion 3 is a success. The v70 shipping decision was made assuming that
outcome; confirming it costs the app nothing and settles a question that would otherwise be reopened
every release.

---

## Sourcing bar

Unchanged from round 10, and it is strict because round 10's export contained ten defects including
a fabricated statistic and two DOIs resolving to the wrong papers:

- Government statistics offices, central banks, regulators, peer-reviewed journals, and an index's
  own technical documentation. **Nothing else.** Not a blog, not a bank's marketing page, not a
  consultancy summary, not an AI answer.
- Every percentage needs a table number and a page. Every DOI must be checked to resolve to the
  paper it is claimed to be.
- **NOT FOUND is an expected answer and does not weaken the round.** An inferred weight presented as
  a published one is the single failure mode this brief exists to prevent — it is the exact mistake
  v69 spent a release undoing.
- If a source cannot be retrieved (403, paywall, dead link), say so and name the barrier. Do not
  substitute a secondary description of it.

---

## The questions, in priority order

### Q1 — Does any validated index score an expense-coverage or runway item? (HIGHEST)

This is a re-ask of round 10's Q1.3, which was never answered because the sources could not be
reached. It is the question most likely to close the round.

1. For each index below, state whether an **expense-coverage / emergency-savings / months-covered**
   item is a **scored component** (not a correlate, not a reporting breakdown). Quote the exact item
   wording and its response scale.
2. If scored, give its **published weight**, or say the index publishes none.
3. Cover at minimum, saying NOT FOUND for any you cannot document from primary material:
   **Financial Health Network FinHealth Score** (round 10 found the weighting absent from the report
   cited for it — find the document that actually carries it, or confirm none does); **OECD/INFE**
   financial-competence / financial-resilience measures (round 10 hit HTTP 403 — try the OECD
   iLibrary record and the national-implementation reports); **UK Money and Pensions Service**
   financial-wellbeing framework; **ANZ Roy Morgan Financial Wellbeing Indicator**; the **CFPB**'s
   own supplementary measures beyond the well-being scale itself.

### Q2 — Is there a published distribution of months-covered? (HIGHEST)

A distribution is what a normalizer is read off. Round 10 confirmed NOT FOUND for Thailand
specifically; this asks the question wider before accepting that as final.

1. **Thailand first**: National Statistical Office household socio-economic survey, Bank of Thailand,
   or a peer-reviewed Thai study. Report published bands exactly as published, with the table number.
2. **Comparable middle-income settings**, each labelled as such and never presented as a Thai figure:
   Malaysia, Indonesia, Philippines, Vietnam, or a World Bank Global Findex breakdown that reports
   months-covered rather than a yes/no emergency-fund question.
3. **The distinction that matters**: many surveys ask a *binary* ("could you cover an unexpected
   expense of X?"). That is not a distribution of months and cannot normalize a continuous measure.
   Say which you found. If only binaries exist, state that plainly — it is a finding, and it points
   at criterion 3.

### Q3 — What denominator do published measures actually use? (HIGH)

v70 asks for **committed** outflow — rent, loans, family support, bills. Emergency-fund guidance
more often uses **total** monthly spending. These are different numbers and produce different
runways from the same savings.

1. For every runway or expense-coverage measure found in Q1/Q2, state whether its denominator is
   **total spending**, **essential/non-discretionary spending**, or **income**. Quote the definition.
2. Is there published work on what share of household spending is **non-discretionary** in Thai
   household survey data? (Round 10's Q2.4, unanswered.)
3. Does any instrument's committed-outflow definition include **financial support given to family
   members**? Round 10 expected this to be absent from Western instruments and asked for the negative
   to be confirmed. It still has not been. It matters directly: it is the largest committed slice for
   the 75,000-earner this whole line of work started from.

### Q4 — If a normalizer exists, what shape is it? (MEDIUM — only if Q1 or Q2 lands)

1. Is the relationship between months-covered and financial wellbeing **linear, log, or
   threshold**? Give the statistic and the sample.
2. Is there a published **saturation point** — a number of months beyond which no further benefit is
   measured? If a guidance figure (the ubiquitous "3–6 months") is the only thing available, say so
   and label it **guidance, not a distribution**. Guidance is not an anchor.

---

## What this round must not do

- **Do not propose a weight for runway inside the finance composite.** Even if Q1 lands, the weight
  is a separate decision made against the 0.15/0.85 split v69 established, and it will be argued in
  the release that makes it — not assumed here.
- **Do not recommend changing the CFPB conversion table.** v69 pinned Finance's 95 ceiling
  deliberately (`tests/finance-scale.test.mjs`); 82 is the published scale's honest maximum.
- **Do not treat "3–6 months of expenses" as an anchor.** It is repeated everywhere and sourced
  nowhere to a distribution. Finding its actual provenance would itself be a useful answer.

---

## What v70 shipped, for the reader picking this up cold

- `profile.liquidSavings` and `profile.committedOutflow` — asked in onboarding step 1, editable on
  the Profile page, both in THB, both defaulting to 0 (additive, no schema bump).
- `runwayMonths(profile)` in `scoring.js` — returns months, or **null** when committed outflow is
  zero or absent, because an unbounded runway is not a printable quantity.
- `aspectFacts` in `aspects.js` — a **second list** alongside `components`, carrying a formatted
  string and deliberately **no** 0–100 value, so the aspect view structurally cannot render it as a
  bar. Rendered under a "Measured, Not Scored" heading.
- `tests/runway.test.mjs` — nine tests, including `V70 CONTRACT: runway changes no score anywhere in
  the app`, which is the guard that makes shipping without an anchor safe.
- **Not wired**: the Midori connector's `liquidSavings` fact is still validated-and-unconsumed. Its
  `monthlyExpenses` is *total* spending, which is not the same quantity as committed outflow — see
  Q3. Connecting them is a decision this round should inform.
