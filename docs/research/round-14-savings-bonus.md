# Round 14 — is the savings bonus a real term, or a second payment for one answer?

Status: **CLOSED — 2026-08-26** (opened 2026-08-26). **The bonus was indefensible on three independent
grounds and was removed in v76. Saving is still collected and still shown; it is no longer scored.**

A literature round. The question could not be settled from the codebase alone, because it is about what
validated instruments actually do — so the brief went out for deep research and came back as
`docs/research/.docx/Financial Wellbeing Index Research.docx`.

Affected code:

| Thing | Where |
|---|---|
| The removed term | `savingsBonus`, `savingsHabitScore` — deleted from `scoring.js` |
| The composite | `calculateFinanceScore` (`scoring.js`) |
| The weekly delta | `weeklyAspectShifts` (`scoring.js`) — finance entry removed |
| The aspect page | `financeComponents` → `aspectFacts` (`aspects.js`) |
| The dead suggestion | `RULES.finance.savings` — deleted from `suggestions.js` |
| The reference average | `AVERAGE_ASPECT_SCORES.finance`, 54 → 49 (derived, not hand-edited) |

---

## Why this round exists

Round 13 closed by naming the one thing in the finance calculator that round 10 never examined:

> `savingsBonus` is the only weight in the finance calculator that round 10 did not examine.

The intent then was to ask whether **10 was the right cap**. Reading `surveys.js` before writing the brief
changed the question entirely. The five CFPB items the app uses include, as item 4:

> "I have money left over at the end of the month."

And `savingsRate` is derived in `connections.js:276` as `(income − expenses) / income` — **the money left
over at the end of the month.** The same fact, asked subjectively at weight 0.85 and measured objectively as
a bonus outside the weighting.

So this round is not a calibration question. It is round 13's double-count pattern, in Finance.

## WHAT WAS THERE

```js
score = clamp99( 0.15·income_standing + 0.85·CFPB_wellbeing + savingsBonus )
savingsBonus = min(100, savingsRate / 20 × 100) / 10        // 0 … +10
```

Two weights summing to exactly 1.0, and then up to ten more points added on top and the total clamped.

## THE THREE FINDINGS

Each is independently sufficient to remove the term. That matters: the decision does not rest on the
weakest of them.

### 1. It double-counted CFPB item 4 — CORRELATE, and the strongest one available

The CFPB scale is a psychometric IRT instrument with **zero objective inputs**; item 4 is an ordinal
self-rating of exactly the quantity `savingsRate` measures. The research reports moderate-to-strong
correlations between objective savings/liquid buffers and CFPB scores (r ≈ 0.38–0.51).

**Those coefficients are the weakest evidence in the report and are treated as directional only** — see
*Where the research is thin* below. They are not needed: the double-count is established by reading the two
item texts against each other, which is a fact about this app, not a finding about the literature.

### 2. No validated index adds a term outside its composite — NOT FOUND, and the load-bearing finding

The register searched FinHealth, the OECD/INFE toolkits (2018/2022/2026), World Bank financial-capability
frameworks and the CAF Latin American index, and found **no instance** of the shape
`weights summing to 1.0, plus a bonus, then clamped`. Every validated composite normalises all inputs inside
the weights.

The brief predicted this would produce a NOT FOUND entry and asked for it to be recorded rather than filled
in. It was. That is the finding — a confirmed structural absence, not a gap in the searching.

The clamp compounds it: an un-normalised bonus on a 0–100 composite compresses the top of the range, so two
people whose CFPB answers genuinely differ come out of the clamp identical.

### 3. The 20% divisor was never published — WEIGHT, traced to its origin

| Claim | Verdict |
|---|---|
| 20% of income is a savings threshold | **Warren & Tyagi, *All Your Worth* (2005)** — the 50/30/20 rule. A trade paperback. |
| Any central-bank or peer-reviewed 20% flow target | **NOT FOUND.** Institutional targets are all about savings **stock** (3–6 months of expenses), never monthly flow. |

And in Thailand the number is not merely unpublished, it is unreachable: household debt service is such that
median net saving across income deciles 1–6 runs **0–5%**, with 20% reachable by roughly the top fifth of
earners. The bonus therefore paid its full +10 mostly to people already scoring high on `income_standing` —
the same circumstance, a third time.

## WHAT THE CODE DOES NOW

```js
score = clamp99( 0.15·income_standing + 0.85·CFPB_wellbeing )
```

Saving moved from `components` (a scored bar) to `facts` (a reported line), joining runway. That placement
follows the rule `aspects.js` already states for runway: a fact carries a formatted string and **no
`value`**, and the view reads `value` to size a bar — so a fact structurally cannot acquire a weight. Grit
kept a bar when it stopped being scored because grit had a published normalizer to rank against. Saving has
none: finding 3 is precisely that the old bar's divisor was invented.

## CONSEQUENCES, MEASURED

| | Before (v75) | After (v76) |
|---|---|---|
| Reference profile's finance score | 54 | **49** |
| Finance ceiling, under 70 | 95 | **85** |
| Finance ceiling, 70+ | 99 (the app cap) | **92** |
| Balance Index, 99 on the other seven | 98 | **97** |
| Weekly review finance shift | up to ±10 | **none** |

Two of these deserve saying out loud rather than burying:

**Finance can no longer reach the app-wide cap of 99 at any age.** The ceiling is
`0.15(100) + 0.85(cfpb_max)`, and the CFPB conversion tops out at 82 under 70 and 90 from 70 up. This is not
a bug: the bonus was what used to close that gap, and it closed it with points no instrument published.
Pinned in `tests/finance-scale.test.mjs`.

**The Balance Index cost is one point**, the same as v69's. It stays small because `relativeToPopulation`
measures each aspect against its own reference average — and that average fell by 5 in the same release, so
the gap the index actually reads barely moved.

## WHAT WAS DELIBERATELY NOT DONE

**Income was not touched.** The report's Option A recommends removing `income_standing` too, on the grounds
that no validated index scores raw income. That is the *same* finding round 10 made, and round 10 already
acted on it — cutting the weight 0.6 → 0.15 with the reasoning and its inferential step recorded in
`scoring.js`. Re-litigating a settled decision on no new evidence would be churn, not rigour.

**Savings stock was not scored.** The report's Option B recommends replacing the flow term with a
FinHealth-style liquid-stock indicator. The app already collects `liquidSavings` — but round 11 examined
that exact FinHealth indicator and declined it **permanently**, for reasons recorded above `runwayMonths`.
Option B is closed by a prior round, not by this one.

**The savings suggestion was removed, not rehomed.** `getAspectSuggestions` looks rules up by *component*
key, so `RULES.finance.savings` became unreachable the moment saving stopped being a component. It was
deleted rather than left as dead code advertising "15-20% of income maxes this component". The Savings
pledge in `goals.js` still works and is arguably the better home — a target the user sets, rather than one
the score implies. **A future round could give facts their own suggestion path**; that was out of scope here.

## WHERE THE RESEARCH IS THIN

Recorded so the next reader weighs it correctly rather than inheriting it as uniform.

**Solid, and what the decision rests on:** the FinHealth structure (8 indicators, unweighted mean, 12.5%
each, Save = stock not flow) — independently corroborated by round 11, which found the same thing in the
Toolkit; the Q2 NOT FOUND register; the Warren & Tyagi attribution.

**Thin, and treated as directional only:**

- **The Netemeyer correlation figures.** The report cites Table 3 (p. 77) for correlations with "monthly
  savings rate", but its own NOT FOUND register under Q3 states that no continuous coefficient for monthly
  flow is published. Those two claims contradict each other, and the URL given resolves to a *different*
  paper. The ID CHECK is reported as passing; it evidently did not.
- **The Thai decile table.** Every numeric cell of it is a PNG image in the source document, not text — 41
  images in total, which is also why the inline equations are unreadable. The "75–80% cannot reach 20%"
  figure survives in body prose, but the table backing it cannot be read from the file as delivered.
- **Two other URLs miss.** The OECD 2022 toolkit link resolves to a 2026 publication; the NSO 2021 SES link
  resolves to a Kasetsart journal article.

None of this changes the outcome. Findings 2 and 3 alone remove the term, and both are textual, checkable,
and consistent with what the app had already established in round 11.

## THE OPEN QUESTION THIS LEAVES

Finance now has two scored components and two reported facts. That is honest, and it is thinner than it
looks in one specific way: **nothing the weekly review collects moves the finance score any more.** The
user can raise their savings rate every week and watch the number not move. The pledge still tracks it and
the Finance page still reports it, but the feedback loop that existed in v75 was real, and it is gone.

Restoring it would mean finding a published normalizer for *something* objective in personal finance —
which is what rounds 10, 11 and 14 have each failed to find, three times, for three different quantities.
That consistency is itself worth noting. It may be that subjective wellbeing instruments are simply the
only validated thing in this domain, and the app's job is to report the objective facts beside the score
rather than inside it.
