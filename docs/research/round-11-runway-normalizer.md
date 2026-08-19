# Round 11 research brief — is there a defensible normalizer for runway?

Status: **OPEN — 2026-08-19.** Opened by v70, which ships the runway measure *collected and
displayed but not scored*. This round has exactly one job: find out whether months-of-runway can
honestly be turned into a 0–100 component, or confirm that it cannot.

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
