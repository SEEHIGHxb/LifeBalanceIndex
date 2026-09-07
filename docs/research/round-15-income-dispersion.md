# Round 15 — is `INCOME_LOG_SIGMA` a free parameter, and does the income rank understate the tail?

Status: **OPEN — brief written 2026-09-06.** **No code change to the distribution. The one change made in
v77 was to correct a code comment that misdescribed how sigma is derived, plus a test that stops the
calibration being broken silently.**

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
