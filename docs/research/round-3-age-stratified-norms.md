# Round 3 research brief — age-stratified norms + working-age loneliness prevalence

Status: OPEN — brief written 2026-07-30, not yet answered.
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
