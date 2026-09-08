# Round 15 — is `INCOME_LOG_SIGMA` a free parameter, and does the income rank understate the tail?

Status: **CLOSED — answered 2026-09-08** (brief written 2026-09-06). **Still no code change to the
distribution, and now for a stronger reason than "unverified": the anchor the round asked for arrived,
and it is the wrong quantity.** Q1 and Q4 are answered from primary NSO sources. Q2 is answered but
REFUSED. Q3 is answered structurally. Read `## Outcome` at the foot of this file before treating
anything above it as settled — the export's central recommendation does not survive it.

Affected code:

| Thing | Where |
|---|---|
| The parameter | `INCOME_LOG_SIGMA`, `INCOME_MEDIAN_NATIONAL` (`benchmarks.js`) |
| The rank it drives | `incomePercentile` (`benchmarks.js`) — the finance benchmark card |
| The guard added | `impliedIncomeMean` (`benchmarks.js`), two tests in `tests/benchmarks.test.mjs` |
| NOT affected | `incomeStandingScore` — the magnitude scale carries no dispersion assumption at all |

---

## Why this round exists

A review of the norms layer flagged `INCOME_LOG_SIGMA = 0.65` as an invented parameter, on the strength of
the code comment that sat above it:

> `sigma 0.65 is a typical wage dispersion; this is an estimate, not published decile data.`

The review then reasoned: Thailand's published income Gini is in the mid-0.4s, a lognormal's Gini is
`2*Phi(sigma/sqrt(2)) - 1`, so sigma should be about **0.85**, and 0.65 understates Thai inequality. The
recommendation was to recalibrate.

**Reading the code before acting on that changed the question entirely,** in the same way round 14's brief
changed once `surveys.js` was actually read.

## What sigma actually is

For a lognormal, `mean = median * exp(sigma^2 / 2)`. The model fixes two things:

- `INCOME_MEDIAN_NATIONAL = 12900`
- the published LFS average wage, **15,972 THB/mo** (`SOURCES.botWage`)

Those two **determine** sigma. There is no freedom left:

```
sigma = sqrt(2 * ln(15972 / 12900)) = 0.6536   ->   the 0.65 in the file
```

Check it the other way: `12900 * exp(0.65^2 / 2) = 15,934`, against a published 15,972. The pair reproduces
the anchor to within 0.2%.

So the proposed fix would have been a **regression**. Raising sigma to 0.85 while leaving the median alone
implies a mean of `12900 * exp(0.85^2/2) = 18,513` — breaking the only genuinely published number in the
model in order to fix an unsourced one. `tests/benchmarks.test.mjs` now fails if that is attempted.

The old comment is what caused the misreading. It described a derived quantity as an estimate, which is the
opposite of the error this project usually makes. Corrected in v77.

## The real weakness, which is worse than the reported one

**Only ONE of `{median, sigma}` is independently anchored.** The published input is the LFS *mean*.
`INCOME_MEDIAN_NATIONAL = 12900` has **no cited source anywhere in this repository** — not in
`benchmarks.js`, not in `SOURCES`, not in rounds 0 or 10. Given the identity above, it can only have been
derived from the mean together with an assumed sigma, or chosen alongside one.

That means the distribution rests on **one published number and one free parameter wearing two names**. It
is structurally the same defect as the Environment percentile that v77 removed — one anchor, an assumed
shape — and it is milder only because a lognormal pinned at a known mean is far more constrained than a
seven-band ladder, and because a rank is *supposed* to saturate in a long right tail.

This is the finding a future round should act on. It was not what the review reported, and it is not what
the code comment claimed.

## The tension a Gini would expose

The two calibration targets disagree, and they cannot be reconciled by moving one parameter:

| Calibration target | implied sigma | implied Gini |
|---|---|---|
| published mean/median pair | 0.654 | **0.354** |
| a mid-0.4s income Gini | ~0.85 | ~0.452 |

A single lognormal cannot satisfy both. If a Thai income Gini in the mid-0.4s is confirmed, the honest
reading is **not** "sigma is misset" but **"the lognormal family understates the Thai upper tail"** —
real income distributions carry a Pareto tail that a lognormal does not reproduce. That is a model-choice
question, not a constant-tuning one, and it deserves its own decision rather than a quiet parameter edit.

The practical consequence, either way, is in the same direction the review described: the rank saturates
at 99 from roughly 52,900 THB/mo upward, so every earner above that shares one percentile and, until v77,
one letter grade. (v77 removed the grade dependency — finance now grades on its composite score — so the
saturation now affects only the displayed rank, which is the number it least distorts.)

## Why nothing was changed

**No Thai income Gini could be verified against a primary source from this environment.** A figure of
**0.417 (NESDC, 2023)** appears in search results and is attributed to NESDC in at least one peer-reviewed
article, but every candidate primary and academic source was unreachable: `nesdc.go.th`, `nso.go.th`,
`pip.worldbank.org`, `api.worldbank.org`, `tandfonline.com`, `link.springer.com` and `journals.plos.org`
were all blocked by the network egress policy.

Round 8's sourcing rule is explicit that a secondary summary is not a citation:

> Do not cite a review, blog, scale-database entry, secondary summary or AI answer as the source.

Writing `0.417` into `benchmarks.js` on the strength of a search snippet would break that rule in the same
release that removed a percentile for resting on one unverifiable number. So it was not written.

There is also a live confound to resolve before any figure is adopted: **Thailand's consumption Gini and
its income Gini are different numbers**, and the World Bank series most often quoted (~33 in recent years)
is consumption-based, while this model needs an **income** Gini. Adopting the wrong one would understate
dispersion again, in the same direction as today.

## What would settle it

In rough order of value:

1. **NSO Labour Force Survey microdata** — individual monthly earnings by age and region. This replaces the
   whole parametric model with an empirical ECDF, the same upgrade WHO-5 received in v41 when the normal
   fit was dropped for the published table. It also removes the Bangkok/Provinces binary as a side effect.
   This is a data request, not a literature search.
2. **Any published NSO/NESDC decile or quintile table of individual wages.** Five points would let the rank
   interpolate between published values instead of assuming a family. Household deciles are NOT a
   substitute: this field asks for individual income.
3. **A verified NESDC income Gini, from NESDC's own publication**, with the welfare aggregate stated
   (income, not consumption) and the year. This is the cheapest option and the weakest: it pins sigma but
   leaves the family assumption, and it will contradict the mean/median pair (see above), which is a
   finding in itself and would need resolving rather than averaging away.
4. **A source for the 12,900 median**, or its removal. If the median is derived rather than published, the
   comment should say so plainly — the same treatment `SHARE_BELOW_GUIDELINE` gets, which states in-line
   that it is this project's own midpoint of a range.

## Open questions for the next round

- **Q1.** Is there a published NSO figure for the MEDIAN individual monthly wage, as opposed to the mean?
  If yes, sigma stops being derived and becomes measured, and the whole tension above may resolve.
- **Q2.** Is Thailand's published income Gini (not consumption) in the mid-0.4s, per NESDC's own report?
  Give the figure, the year, the welfare aggregate and a primary URL.
- **Q3.** If Q1 and Q2 both land and they disagree — which they will, on the arithmetic above — is the
  right response a heavier-tailed family (lognormal-Pareto splice), an empirical table, or refusing the
  rank the way `environment` was refused in v77?
- **Q4.** Does any published Thai source break individual earnings out by REGION beyond Bangkok/rest? The
  binary in `sanitize.js` currently ranks an Isaan farmer against a national-minus-Bangkok median that sits
  materially above their own region's, understating their percentile.

---

# Outcome — 2026-09-08

Answered by `Thai Income Distribution Calibration.docx` (Gemini Deep Research), then verified here. The
export's **arithmetic is exact** and its **structural diagnosis is right**. Its **headline recommendation
is refused**, and its **regional table is substantially wrong**. All four outcomes are evidenced below.

The material difference from the brief is environmental, and worth recording for future rounds: the brief
was written where `nso.go.th` and `nesdc.go.th` were blocked by network egress policy. Verification ran
from a machine that could reach `nso.go.th`, so the Labour Force Survey could be read directly instead of
through summaries. **`nesdc.go.th` still could not be read** — its download endpoint self-redirects without
a browser session — so the Gini itself remains uncited by this project.

## What was verified, and how

### The arithmetic: 9 of 9 exact

Every quantitative claim was recomputed independently before being believed. All reproduce:

| Claim | Export | Recomputed |
|---|---|---|
| sigma from the mean/median identity | 0.6536 | 0.6536 |
| Gini at sigma 0.6536 | 0.3561 | 0.3560 |
| Gini at sigma 0.65 | 0.3542 | 0.3542 |
| implied mean, sigma 0.65, median 12,900 | 15,934 | 15,934 |
| implied mean, sigma 0.85, median 12,900 | 18,513 | 18,513 |
| Gini at sigma 0.85 | 0.4520 | 0.4522 |
| sigma required for Gini 0.417 | 0.7763 | 0.7764 |
| median if that sigma holds and the mean is preserved | 11,817 | 11,816 |
| income at which the rank saturates at 99 | 52,900 | 52,867 |

The saturation figure is the rounding threshold, not the 99th centile of the distribution — a first attempt
to check it computed the latter, got 58,519, and was wrong. The export was right.

### Q1 — is there a published NSO median individual wage? **NO. Confirmed at the primary source.**

NSO Labour Force Survey, Q4/2025 (ไตรมาสที่ 4 ตุลาคม–ธันวาคม 2568), read directly. The report publishes
**Table 3.7, "Employees by wage/salary"** — a bracket frequency distribution — and **Table 18, "Employee
average monthly wage by economic activity, region and area"** — arithmetic means. **No median scalar
appears in either.** The export's account of NSO's reporting practice is accurate.

`INCOME_MEDIAN_NATIONAL = 12900` therefore remains what the v77 comment said it was: derived from the
published mean under an assumed dispersion, not an independently published figure.

### Q2 — is Thailand's income Gini in the mid-0.4s? **Answered as 0.417, and REFUSED anyway.**

The export attributes 0.417 (2023) to NESDC's *Report on the Analysis of Poverty and Inequality Situation
in Thailand 2023*, and the cited NESDC page is real. The PDF could not be retrieved, so **this project
still has no primary citation for 0.417** and does not adopt it under round 8's sourcing rule.

That turned out not to matter, because the figure is the wrong quantity regardless of whether it verifies:

- **NESDC measures per-capita HOUSEHOLD income** from the Socio-Economic Survey. The export states this
  itself, in its own comparison table, and then recommends importing the number anyway.
- **This field asks one person for their own monthly income.** Household per-capita income pools earners,
  dependants and non-wage income, and disperses more widely than individual wages.

This is the same error the export correctly warns about between consumption and income, one level further
down. Catching it at the first level and walking into it at the second is the round's main lesson.

**And it fits worse, measurably.** Against NSO Table 3.7 (19.53 million employees; shares renormalised over
the 99.2% with a known wage):

| Monthly wage | NSO published | Current model (sigma 0.65) | Export's fix (sigma 0.7764) |
|---|---|---|---|
| under 10,000 | 27.3% | 34.8% | 41.5% |
| 10,000–14,999 | 32.8% | 24.4% | 20.6% |
| 15,000–29,999 | 29.9% | 31.1% | 26.4% |
| over 30,000 | **10.0%** | **9.7%** | 11.5% |

The proposed recalibration misses the body by 14 points where the current one misses by 8, and loses the
one bracket the current calibration gets right. **Recommendation refused on evidence, not on taste.**

### Q3 — if the targets conflict, is the answer a heavier tail? **Yes. Confirmed by free fit.**

A lognormal was fitted **freely** to the four published brackets — both parameters loose, no anchor, no
published mean to honour. The best attainable fit is median 13,160 / sigma 0.5165, and it reaches only
**5.5% above 30,000 THB against a published 10.0%**: it buys agreement in the body by giving up the tail.

So the mean/Gini conflict is **not** evidence that sigma is misset. No two-parameter lognormal reproduces
this distribution. Fixing it properly means a heavier-tailed family (lognormal–Pareto splice, GB2) or the
published quantiles themselves — a decision about model family, not an edit to a constant.

### Q4 — does NSO break wages out beyond Bangkok/rest? **Yes, and the export's numbers are wrong.**

Table 18 exists as described, and disaggregates by region *and* by municipal/non-municipal area. But the
export claims five macro-regions where **NSO uses seven**, and its wage figures — footnoted to a blog, a
news site and a web forum rather than to the LFS it names — do not match the source:

| Region | Export claimed | NSO Table 18, Q4/2025 | |
|---|---|---|---|
| Bangkok | ~22,500–24,000 | **21,458** | overstated |
| Central | ~15,500–16,500 | **15,340** | slightly overstated |
| Eastern | *not listed* | **15,137** | region omitted |
| Northern | ~11,200–12,100 | **14,496** | understated by ~2,700 |
| Northeastern | ~10,500–11,600 | **13,230** | understated by ~1,900 |
| Southern | ~13,000–14,200 | **13,933** | correct |
| Southern Border | *not listed* | **11,395** | region omitted |
| non-municipal (kingdom) | ~8,400–9,500 | **13,648** | wrong by ~4,500 |

Whole kingdom: **15,912**. The rows that verify are the ones the export sourced to NSO PDFs; the rows that
fail are the ones it sourced to `the-shiv.com`, `sanook.com` and `pantip.com`. Rounds 6 and 7 found the
same pattern in their own exports.

**The regional argument survives in weakened form.** Isaan really is below Bangkok, but at a ratio of
13,230/21,458 = **0.617**, not the ~0.5 claimed, and the spread among non-Bangkok regions (13,230 to
15,340, about 16%) is far narrower than the export implies. The Bangkok/Provinces binary distorts less
than the export argues — while still distorting.

## Two things the verification found that the export did not

1. **The mean anchor is corroborated.** LFS Q4/2025 reports a whole-kingdom average wage of **15,912 THB**
   against the **15,972** (Q3/2025) the model uses. The anchor is current.

2. **The Bangkok multiplier is corroborated across two surveys.** `INCOME_MEDIAN_BANGKOK` is the national
   median scaled by the SES household-income ratio 39,100/29,000 = **1.3483**. NSO's Bangkok-to-kingdom
   *individual wage* ratio is 21,458/15,912 = **1.3485**. Two different surveys measuring two different
   aggregates give the same regional multiplier to four significant figures. That is a coincidence worth
   nothing statistically and a great deal practically: the one regional assumption in the model is now
   independently supported.

## What changed in code

Nothing in the distribution. Deliberately.

| Change | Where |
|---|---|
| Calibration measured against published NSO brackets, and the refused recalibration guarded | `tests/benchmarks.test.mjs` |
| Free-fit proof that no lognormal fits body and tail together | `tests/benchmarks.test.mjs` |
| Calibration comment corrected: a Gini is not the missing anchor | `benchmarks.js` |

The comment mattered. It previously told a reader that an income Gini "would close" the median's missing
anchor and had been left out only because it could not be verified — which invites precisely the change
this round refused. It now says why the figure is the wrong one.

## Still open

- **The median is still unanchored.** Round 15 asked whether a Gini would fix that. It would not.
- **The rank still saturates at ~52,900 THB.** Structural, not a constant; see Q3.
- **Q4's regional expansion is now possible and was not taken.** Published per-region means exist and the
  Bangkok median already demonstrates the ratio method. It was deferred because it changes the onboarding
  and profile inputs, and the flow redesign is pending. The data is in the table above when wanted.

## What would still settle it, revised

Superseded ranking from the brief. NSO **individual-wage quantiles** are the only thing that helps now:

1. **NSO LFS microdata** — an empirical ECDF, as WHO-5 got its published table in v41. Removes the family
   assumption, the median assumption and the saturation together. A data request, not a literature search.
2. **A finer published wage-bracket table.** Table 3.7's four bands with an open top are enough to *test*
   against and too coarse to *interpolate*. Ten bands would replace the parametric model outright.
3. **A published median individual wage.** Q1 answers that NSO does not publish one; an academic paper
   computing it from microdata, with the computation stated, would do.
4. ~~A verified NESDC income Gini~~ — **struck.** Answered, and it is the wrong aggregate. Do not spend
   another round retrieving it.
