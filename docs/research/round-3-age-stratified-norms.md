# Round 3 research brief — age-stratified norms + working-age loneliness prevalence

Status: **CLOSED — 2026-09-10.** **It was answered on 2026-07-30, the day the brief was written,
and acted on in code the same day. This line said "not yet answered" for six weeks because nobody
updated it.** The decisions live in `benchmarks.js`, under the heading "Why only WHO-5 is
age-banded (researched 2026-07-30)". Read `## Outcome` at the foot of this file: one code comment
is strengthened, no benchmark moves, and two of the export's figures do not exist.
Purpose: decide whether Life Balance Index can age-band its percentile benchmarks, and
whether the Relationships aspect can be ranked from prevalence rates.

Paste everything below the line into Gemini Deep Research.

---

# Research task: age-stratified population norms (Thailand + global)

## Your role and the single most important rule

You are sourcing numeric population statistics that will be written into a health
self-assessment app used by real people. Every number you return will be **independently
re-verified against its primary source before use**. A number I cannot trace and confirm is
worse than no number, because it costs review time and then gets discarded anyway.

**Therefore: "NOT FOUND" is a correct, valuable, and expected answer.** For several of these
questions I strongly suspect nothing exists. Confirming absence with evidence of a thorough
search is a successful result, not a failure. Do not fill gaps.

**Absolute prohibitions.** Do not do any of the following, even if it would produce a more
complete-looking answer:
- Do not **pool, average, or meta-analyse** figures across studies or countries to
  manufacture a value.
- Do not **interpolate or extrapolate** across age bands, or fit a curve to reach an age the
  source did not measure.
- Do not **convert between different measures** (e.g. a mean score into a prevalence, one
  scale's score into another's, a BMI ≥25 share into a BMI ≥23 share).
- Do not **re-band** data into age groups the source did not publish. Report the source's own
  bands verbatim, whatever they are.
- Do not cite a review, blog, secondary summary, news article, AI answer, or a figure quoted
  by another paper. Go to the **primary publication or official statistical release**. If you
  can only reach a secondary mention, report it explicitly as `SECONDARY ONLY — unverified`.

If a figure is widely repeated online but you cannot reach its primary source, say so plainly
and mark it unusable. That outcome is genuinely useful to me.

## Known traps in this exact subject area

These are real errors already caught in this project. Watch for them:

- **A "Thai" figure that is not Thai.** A commonly cited "Thai" General Self-Efficacy norm
  traces back to a study of 135 head nurses in **Yunnan, China**. Always confirm the sample's
  actual country and occupation, not the paper's affiliation.
- **A "population" norm that is a clinical sample.** The only Thai WHO-5 dataset is primary-care
  outpatients at a hospital. Hospital, clinic, university-student, single-workplace, and
  single-province samples are **not** general-population norms. Label the sampling frame every
  time.
- **Unit mismatches.** Per-day vs per-week vs per-month. Minutes vs MET-minutes. Portions vs
  grams. Quote the unit exactly as the source writes it.
- **Different thresholds treated as interchangeable.** WHO Asia-Pacific overweight starts at
  BMI **23.0**; the global line is 25.0. A share of adults at ≥25 tells you nothing about the
  share at ≥23.
- **Different constructs treated as interchangeable.** "Feels lonely", "lacks social support",
  "lives alone", and "is socially isolated" are four different measurements. Never merge them.

## Context you need

The app compares an adult user against a reference population, per life aspect, and shows a
percentile. Users are working-age and older Thai adults, roughly **ages 18 to 85**.

Two of its benchmarks are already age-banded, because the *source itself* published the bands:
the CFPB Financial Well-Being Scale has official separate scoring tables for under-62 and 62+,
and the sleep guideline specifies 7–9 hours for ages 18–64 and 7–8 hours for 65+. That is the
pattern I want to extend: **age stratification must come from the source, never from me.**

I need to know, per question below, whether published age-stratified data exists at all.

## Output format — required for every figure you report

Return one block per figure. Incomplete blocks are unusable, so if you cannot fill a field,
write `UNKNOWN` rather than guessing.

```
FIGURE:            [what it measures, in one line]
VALUE:             [the number, with its unit exactly as published]
AGE BAND:          [the source's own band, verbatim, e.g. "45-59 years"]
SEX/SUBGROUP:      [if the figure is split further, or "combined"]
POPULATION:        [country + sampling frame, e.g. "Thailand, nationally representative household survey"]
SAMPLE SIZE:       [N for this specific cell, if given]
DATA YEARS:        [when the data was collected, not when published]
SOURCE TYPE:       [PRIMARY official statistic | PRIMARY peer-reviewed | SECONDARY ONLY - unverified]
CITATION:          [authors/agency, year, full title, journal or report series, volume/report number]
PERSISTENT ID:     [DOI, ISBN, or official report number; "none" if genuinely absent]
EXACT LOCATION:    [table number / figure number / page number where the value appears]
VERBATIM QUOTE:    ["the sentence or table cell containing the number, copied exactly"]
URL:               [direct link to the document itself, not a search page or landing page]
PAYWALL/ACCESS:    [open access | paywalled | requires request | link may rot]
CONFIDENCE:        [high | medium | low] + one line on why
```

Then end your entire report with a single **summary table**: one row per figure, columns =
FIGURE, VALUE, AGE BAND, POPULATION, SOURCE TYPE, PERSISTENT ID. This is what I read first.

---

# The four questions

## Q1 — Thai income by age (HIGH priority)

Does Thailand's official statistics agency publish **personal or employment income
distributed by age group**?

Wanted, in this order of usefulness:
1. Percentile thresholds (deciles/quartiles) of monthly income **within each age band**.
2. Median monthly income by age band.
3. Mean and standard deviation of monthly income by age band.

Look at: National Statistical Office of Thailand (NSO) **Labor Force Survey** and **Socio-Economic
Survey (SES)**; NESDC; Bank of Thailand; ILOSTAT's Thailand tables. Thai-language releases are
fine and often more detailed — quote the Thai and give a translation.

State clearly: is this **individual** income or **household** income? Is it wages only, or all
sources? Before tax or after? These distinctions decide whether the figure is usable at all.

## Q2 — Thai physical activity by age (HIGH priority)

Does a nationally representative Thai survey report **physical activity by age group**?

Wanted:
1. Share of adults **failing to meet** the WHO aerobic guideline (<150 min/week moderate, or
   <75 min/week vigorous), **by age band**. This is the most useful form.
2. Alternatively, mean MET-minutes/week by age band, with SD if available.

Look at: Thailand's Surveillance of Physical Activity (SPA / "Thailand Report Card"), Institute
for Population and Social Research (IPSR) Mahidol, Thai National Health Examination Survey
(NHES), WHO's Thailand country profile, and the Global Observatory for Physical Activity.

Note the existing figure I hold: **29% of Thai adults are below the guideline** (SPA 2012–2019),
all-ages combined. I am specifically asking whether that 29% has ever been **broken out by age**.

## Q3 — Thai BMI by age (MEDIUM priority)

Does the Thai **National Health Examination Survey (NHES)**, or another nationally
representative Thai source, report BMI **by age group**?

Wanted:
1. Share of adults at **BMI ≥ 23.0** (the WHO Asia-Pacific overweight line) by age band. This is
   the figure I most need and currently do not have at any age.
2. Share at **BMI ≥ 25.0** by age band.
3. Mean BMI and SD by age band.

NHES rounds 4, 5, and 6 are the likely sources. Report which round each figure comes from and its
fieldwork years. **Do not derive a ≥23 share from a ≥25 share** — if only ≥25 is published, say
exactly that.

## Q4 — Working-age loneliness prevalence (HIGH priority — this one unblocks a decision)

I need to rank an adult on social connection, and the two instruments I currently use are normed
only on people aged 57–85 and over-65s respectively. So I need **prevalence of loneliness among
working-age adults**, ideally with age breakdowns, ideally including Thailand.

Wanted:
1. Share of adults reporting loneliness **by age band**, for **Thailand** specifically.
2. The same **globally** or for **Southeast Asia**, if no Thai figure exists.
3. The exact **question wording and response options** used to classify someone as lonely. Two
   surveys with different wording are not comparable, so this field is mandatory — a prevalence
   without its question text is unusable to me.

Look at: **Meta-Gallup, "The State of Social Connections" (2023)** — reportedly covers 142
countries with age breakdowns, so check whether Thailand and its age bands are in the public
microdata or report annex, and whether the numbers are actually published or only charted.
Also: WHO Commission on Social Connection reports; Gallup World Poll social-support items;
the Thai NSO Time Use or Mental Health surveys; Thai Department of Mental Health releases.

Also answer this directly: **is the age pattern of loneliness U-shaped** (high in young adults,
lower in midlife, high again in old age) in any nationally representative dataset that includes
Thailand or Southeast Asia? Cite the specific dataset and its age bands. I have seen this claimed
generally and want to know whether it is demonstrated for this region or merely assumed from
Western samples.

---

## Two secondary questions, answer only if cheap

- **WHO-5 age-stratified norms.** The app uses a representative German community norm
  (mean 67.6/100, SD 23.0), all-ages. Does that same normative study — or any other
  *representative general-population* WHO-5 study, any country — publish **mean and SD by age
  band**? If yes, give the full block for each band.
- **Thai fruit and vegetable intake.** Mean daily portions or grams consumed by Thai adults from
  a nationally representative survey, by age band if available. The WHO guideline is 400 g/day
  (≈5 portions). Report portions and grams separately and never convert between them.

## Final self-check before you submit

For each figure, confirm you can answer yes to all of these. If not, downgrade or drop it:
- Did I open the actual source document, not a summary of it?
- Is the sampling frame a **general population**, and did I say so explicitly?
- Are the age bands **the source's own**, unmodified by me?
- Did I copy the number verbatim rather than recompute it?
- Would a reviewer with only my citation and location field find this exact number in under
  two minutes?

Close your report with an explicit **NOT FOUND list**: every question or sub-question where you
searched and found nothing, with a one-line note on where you looked. I will act on that list —
it tells me which parts of the app must stay unranked.

---

# Outcome — 2026-09-10

## The round was already answered. Only this file did not know.

`Thai Age Stratified Population Norms.docx` is dated **2026-07-30** — the same day this brief was
written. The answer was read, acted on, and written into `benchmarks.js` on that date, under a
heading that says so:

> `--- Why only WHO-5 is age-banded (researched 2026-07-30) ---`
>
> "Age stratification must come from the SOURCE, never from this project. Only one aspect has an
> age-banded table published with the norm it already cites, so only one is age-banded. Recorded
> so the research is not re-run."

That block answers all four questions and both secondaries. What failed was **bookkeeping, not
research**: the status line at the top of this file kept saying `OPEN — not yet answered` while
the work sat finished in a shipped file. A reader auditing this directory would have concluded a
high-priority round had been abandoned. `tests/consistency.test.mjs` now guards against a repeat
— see "What changed" below.

## Verification of the export against primary sources

The export is **unusually good on absence and unreliable on presence**, which is now the fourth
round running (6, 7, 15, 3) where that has been the exact shape of the result.

### Where it is right, and corroborates the code independently

| Question | Export | This project's independent finding, 2026-07-30 |
|---|---|---|
| Q1 Thai income by age | NOT FOUND. SES is household-level; LFS carries wages by industry/region, not by age | "NSO SES is household-level and the LFS age tables carry participation, not earnings" |
| Q3 Thai BMI by age | NOT FOUND at either the 23.0 or 25.0 line, no mean/SD by band | "no Thai age-stratified data exists" |
| Q4 Thailand-specific loneliness by age | NOT FOUND — country-level aggregates published, age break-outs not | "no Thailand break-out" |

Three NOT FOUNDs reached twice, from two different search environments, six weeks apart. That is
the strongest form this project's negative results ever take, and it is what makes the unranked
aspects defensible rather than merely unfinished.

### Q2 — verified verbatim at the primary source, and the code's reasoning gets stronger

The export's physical-activity figures are **exactly right**, including a detail that looks like
an error and is not: it reports the SPA 2015 middle-age cell as `76.9% (95% CI: 45.5% - 78.3%)`,
a confidence interval that cannot contain its own point estimate that way. Fetching Table 1 of
Katewongsa et al. 2021 (BMC Public Health 21:649, doi:10.1186/s12889-021-10508-3) confirms the
paper prints exactly that. **The malformed interval is the publication's own typo, transcribed
faithfully.** An export that had been inventing numbers would have produced a tidier one.

The full series, read from Table 1 rather than one wave:

| Wave | 18–34 | 35–64 | 65+ | Spread across bands |
|---|---|---|---|---|
| SPA 2012 | 67.4% | 68.9% | 53.2% | **15.7 pts** |
| SPA 2015 | 68.8% | 76.9% | 65.2% | 11.7 pts |
| SPA 2017 | 71.0% | 75.6% | 65.7% | 9.9 pts |
| SPA 2018 | 74.9% | 77.2% | 70.4% | 6.8 pts |
| SPA 2019 | 72.5% | 76.0% | 70.8% | **5.2 pts** |

The code's existing note cites the 2019 spread as "70.8-76.0% — a 5-point gradient" and declines
to age-band on that basis. **That figure is exact, and the decision is now better supported than
the note claimed.** The age gradient in Thai activity has closed monotonically across the whole
survey series — 15.7 points in 2012 down to 5.2 in 2019 — so the flatness is a trend, not a
quirk of the wave that happened to be quoted. Resting the argument on one wave was the note's
only weakness, and it is the one thing this round changes in code.

Worth stating plainly: had only SPA 2012 existed, a 15.7-point gradient would have been worth a
mechanism. The decision not to age-band physical activity is a fact about 2019 Thailand, not a
permanent property of the measure.

### Q4 — two of the five figures do not exist

The export reports Meta-Gallup loneliness for five age bands, each with a `VERBATIM QUOTE` of a
table row and `EXACT LOCATION: Page 18 / Online Report Summary Table`. All five cite the same
URL, a Gallup **opinion/news article**. Fetching it:

| Age band | Export's "verbatim" table row | At the cited URL |
|---|---|---|
| 15–18 | 25% very/fairly lonely | traceable in public reporting |
| 19–29 | 27% | **present**, quoted in prose |
| 30–44 | 25% | **absent — no such figure anywhere reachable** |
| 45–64 | 22% | **absent — no such figure anywhere reachable** |
| 65+ | 17% | **present**, quoted in prose |

The page publishes **no table at all**, has no page 18, and does not print the survey question.
So the two middle-band figures are quoted as cells of a table that does not exist, and the
`SOURCE TYPE: PRIMARY official statistic` label is wrong for a news article under round 8's
sourcing rule regardless of whether the numbers are true.

The export also claims the mandatory item wording — *"In general, how lonely do you feel?"* with
four response options — footnoted to that same page, **which does not contain it.** The brief
made question wording mandatory precisely because a prevalence without it is unusable. So:

> **`benchmarks.js`'s existing claim that Meta-Gallup's question wording is unpublished stands.**
> The export appeared to contradict it and does not survive its own citation.

One more overstatement: the export declares loneliness "demonstrates a **linear decrease** with
advancing age", refuting the U-shape. Its own five figures are 25 → 27 → 25 → 22 → 17, which
rises before it falls. The U-shape is refuted, but by the peak sitting in young adulthood, not by
linearity.

### Q3's one positive figure is unusable either way

A single BMI ≥ 25 figure is offered for ages 15–29 (19.5%, NHES IV) with `PERSISTENT ID: none`,
`EXACT LOCATION: PMC12892435 text snippet`, and an author line reading "Aekplakorn W et al. /
Secondary analysis in primary literature". That article could not be reached from here (the host
served a CAPTCHA), so it is recorded as **unverified rather than fabricated** — but a snippet
inside a secondary analysis is not a citable source under round 8's rule, and one band out of six
could not be used anyway. The app's Thai BMI reference stays the all-ages ≥ 25 share it already
cites.

### Secondary Q1 — the export answered the question asked and missed the need behind it

The export marks age-stratified WHO-5 norms **NOT FOUND**, correctly: Kliem et al. 2025 does not
print mean and SD per age band. It then notes in passing that Table 2 publishes cumulative
percentile lookups by age band instead.

**That table is what this app has been using since v41.** For an app that reports percentiles, a
published percentile table is not a consolation prize for missing mean/SD — it is strictly
better, because it removes the normal-distribution assumption entirely. The project had already
found it, adopted it, verified all 182 cells against the male/female supplementary tables, and
**repaired three published cells** that were duplication errors in production. The export's own
description of the scale ("0 to 56") is also wrong; it is 0–100 after the ×4 transform.

Nothing to act on. Recorded because a future reader comparing this export against the code would
otherwise see a NOT FOUND next to a working implementation and wonder which was wrong.

## What changed

| Change | Where |
|---|---|
| Status corrected; this outcome recorded | this file |
| Physical-activity age note now rests on all five SPA waves, not 2019 alone | `benchmarks.js` |
| Round-doc status bookkeeping guarded — an OPEN round must be declared in the test | `tests/consistency.test.mjs` |
| Rounds 0 and 1 given the `Status:` line they never had | those two files |

**No benchmark, constant or score moved.** No version bump, following round 15's precedent for a
comment-only change to a shipped file: nothing about the app's behaviour differs.

## Still open after this round

- **Nothing in round 3.** All four questions and both secondaries are answered: one adopted
  (WHO-5, already shipped), one found-and-declined (physical activity, on a measured 5-point
  gradient), four NOT FOUND with agreement from two independent searches.
- **The Bangkok/Provinces binary** remains the live age/geography question, and it is a *region*
  question rather than an age one. Round 15 verified per-region NSO wage means for all seven
  regions; expanding to them waits on the flow redesign.
- **Relationships stays unranked.** Round 3 was the round that could have unblocked it, via
  working-age loneliness prevalence. It did not: the only age-stratified prevalence that exists
  is a single non-UCLA item with no Thai break-out and, as verified above, no published wording.
  Rounds 4 and 5 reached the same wall from different directions. Three rounds is enough — this
  should not be asked a fourth time without a new instrument or new data appearing first.

