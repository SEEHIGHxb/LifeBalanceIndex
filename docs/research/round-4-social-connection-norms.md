# Round 4 research brief — a rankable norm for the Relationships aspect

Status: CLOSED — answered 2026-07-31. Result: **NOT FOUND on all four questions.**
The Relationships aspect stays UNRANKED, and this search is the reason.
Purpose: decide whether the Relationships aspect can stop being UNRANKED
(`benchmarks.js:557`), by finding a general-population score DISTRIBUTION for an
instrument the app already administers — or, failing that, confirm that none exists.

## Outcome (raw export: `docs/research/.docx/UCLA-3 LSNS-6 Population Norms.docx`)

No code change. The brief was written to make a negative result as solid as a positive
one, and that is what it returned.

- **Q1 — UCLA-3 raw-score distribution (3–9), all-ages general population: NOT FOUND.**
  Searched ONS harmonised standards, Community Life Survey, Understanding Society, ELSA,
  HRS, Japan Cabinet Office, Thai NSO. All publish subgroup *means* or a dichotomised
  prevalence; none publishes the seven-number frequency table. ONS guidance explicitly
  advises against fixed thresholds and recommends comparing subgroup means — i.e. the
  body that runs the measure nationally declines to do what a percentile rank needs.
- **Q2 — LSNS-6 distribution (0–30), working-age general population: NOT FOUND.**
  Every community sample located is 60+ or clinical. Published work uses custom tertiles,
  not percentiles.
- **Q3 — a better-normed instrument: NOT FOUND.** De Jong Gierveld (6 and 11 item),
  UCLA-20, Berkman-Syme SNI all lack working-age general-population distributions.
  Gallup World Poll's social-support item *does* have annual nationally representative
  Thai data — but it is one binary question, so it yields a single proportion and cannot
  produce a rank. Nothing clears both bars (distribution + validated Thai adult version).
- **Q4 — Thai validation studies: found, but none usable.** Thai LSNS-6 work exists
  (250 older adults with NCDs, northeastern Thailand; a 1,960-person five-region elderly
  survey; a northern-Thailand intervention trial) plus a De Jong Gierveld validation in
  *adolescent* Muslims in southern Thailand. Every frame is elderly, clinical, or
  adolescent. No general working-age norm.

**Traps the brief pre-loaded, and which fired.** The response-scale trap caught a real
one: the largest UCLA-3 sample returned (Liu et al. 2020, Hong Kong, N=1653) re-coded the
items 0–3 rather than 1–3, giving a 0–9 range that is not comparable with this app's 3–9.
Without the brief demanding `RESPONSE SCALE` on every figure that would have looked like a
usable mean. The Taiwan UCLA-3 study is a convenience sample of sexual-minority men — the
clinical/convenience trap.

**Two figures in the export are NOT citable and were not taken.** The Thai rural LSNS-6
figure (mean 14.9, 27% scoring <12) is flagged SECONDARY ONLY / low confidence — quoted
from another paper's background section, with N and data years unknown. And the Zhou/CLASS
LSNS-6 block carries a mismatched citation: the DOI and PMC ID resolve to a 2018 suicidality
paper, not the 2020 title given. Neither matters here because nothing was adopted, but it
is the same fabrication pattern that made the earlier `.docx` exports non-citable.

## Follow-up search, 2026-07-31 — what the deep-research pass missed

Two rounds of direct searching after the export. Thai sources first, then the UK tables the
export named but never opened.

### Thai sources: nothing usable, and NHES does not carry the construct

- The "83% of Thais are lonely" figure (สสส. + ธนาคารจิตอาสา + Chulalongkorn) is n=864,
  ages 18-75, measured with **UCLA Loneliness Scale V.3 — the 20-item version**. Right age
  frame, wrong instrument, small non-representative sample, three coarse bands only.
- CMMU/Mahidol's "26.75 million lonely Thais (40.4%)" is a 2020 commercial study of the
  "lonely market" trend.
- **NHES-7** (การสำรวจสุขภาพประชาชนไทย ครั้งที่ 7, Aug 2024-Apr 2025, n=22,822, ages 15+,
  20 provinces) is the strongest Thai instrument-bearing survey and the same family this app
  already cites for BMI. Its modules are NCDs, diet, smoking, alcohol, physical activity,
  reproductive health. **No loneliness, social support or social network measure.** NSO has
  none either; its mental-health work runs on TMHI-15.

### UK Community Life Survey — a real, verified, all-ages reference (FOUND, and now used)

**Shipped in v43 / 2.10.0** as a band placement on the Relationships aspect — `CLS_BANDS` and
`CLS_LONELIEST_BY_AGE` in `benchmarks.js`. The aspect still returns `percentile: null`.


ONS itself publishes no combined-score distribution: the 2018 "Testing of loneliness
questions" compendium has five tables, all item-level responses or chi-square associations
(Table 5 is demographic associations, not a distribution), and the recommended-indicators
page advises using the UCLA module alongside the direct question rather than as a composite.
That is the dead end the export reported, and it is correct **for ONS**.

DCMS's Community Life Survey is not. Retrieved and read directly from the published annual
data tables (`Community_Life_Survey_2024_25_Annual_data_tables.FINAL.ods`, DCMS, England,
Oct 2024-Mar 2025):

**Table A3a — Indirect Loneliness Composite Score, adults 16+, unweighted base 160,755:**

| Score | % of adults | respondents |
|---|---|---|
| 3 or 4 | 58 | 97,341 |
| 5, 6 or 7 | 33 | 50,215 |
| 8 or 9 | 9 | 13,199 |

**Table A3b — the same, by age, but published ONLY for the 8-or-9 band:**

| Age | % scoring 8-9 |
|---|---|
| 16-24 | 12 |
| 25-34 | 11 |
| 35-49 | 10 |
| 50-64 | 8 |
| 65-74 | 5 |
| 75 and over | 7 |

Same three items, same 3-9 composite, same three response options as `surveys.js` (CLS
prints the lowest option as "Hardly ever or never" where the app prints "Hardly ever" —
worth a fidelity note if this is ever used). General population, all ages, nationally
representative, N=160,755.

**What this does and does not license.**
- It does **not** license a percentile. Three bands cannot produce a rank without
  interpolating inside a band, which is the prohibited move.
- It **does** license a banded comparison against a named, correctly-aged population — the
  same shape as the ST-5 case-3 note, but for the first time with a real general-population
  sample behind it.
- It **empirically vindicates the unranked decision.** The age gradient runs 12% at 16-24
  down to 5% at 65-74 — younger adults are lonelier. Ranking a 28-year-old against a
  57-85-year-old norm does not just use the wrong sample, it uses one sloped the wrong way.

**One lead still unpursued:** HILDA (Household, Income and Labour
Dynamics in Australia) appears in the works-cited via a psychometric assessment of
loneliness and social-isolation scales, but is never addressed in Q1. HILDA is an all-ages
household panel, which is exactly the missing sampling frame. If Relationships is ever
revisited, start there rather than re-running this brief.

Round 3 Q4 asked for loneliness *prevalence* and the answer was unusable: a prevalence is a
single cut point ("18% often lonely"), not a curve, and the one age-stratified source found
(Meta-Gallup 2023) was a single item with unpublished wording and no Thailand break-out.
This round asks a different and much more answerable question: **not "how many people are
lonely" but "what does the spread of scores look like".**

Paste everything below the line into Gemini Deep Research.

---

# Research task: population score distributions for UCLA-3 and LSNS-6

## Your role and the single most important rule

You are sourcing numeric population statistics that will be written into a health
self-assessment app used by real people. Every number you return will be **independently
re-verified against its primary source before use**. A number I cannot trace and confirm is
worse than no number, because it costs review time and then gets discarded anyway.

**Therefore: "NOT FOUND" is a correct, valuable, and expected answer.** The app currently
refuses to rank this aspect at all, and telling the user "we will not pretend to rank you"
is a shipped, deliberate feature — not a bug I am desperate to fix. Confirming that no usable
distribution exists is a successful result. Do not fill gaps.

**Absolute prohibitions.** Do not do any of the following, even if it would produce a more
complete-looking answer:
- Do not **pool, average, or meta-analyse** figures across studies or countries.
- Do not **interpolate or extrapolate** across age bands or score points.
- Do not **convert between different measures** — not between instruments, not between a
  prevalence and a distribution, not between response scales of different lengths.
- Do not **re-band** data into groups the source did not publish. Report the source's own
  bands verbatim, whatever they are.
- Do not **reconstruct a distribution from a mean and SD.** These scales are short, discrete
  and skewed; a normal fit is exactly the error this app already removed once.
- Do not cite a review, blog, secondary summary, news article, AI answer, or a figure quoted
  by another paper. Go to the **primary publication or official statistical release**. If you
  can only reach a secondary mention, report it explicitly as `SECONDARY ONLY — unverified`.

## What "usable" means here — read this before searching

I need a **distribution**, in descending order of usefulness:

1. **A full frequency or cumulative-percentage table** over the scale's raw scores. For
   UCLA-3 that is just **seven numbers** (raw 3,4,5,6,7,8,9). For LSNS-6 it is at most 31
   points, or any binned version the source published. This is the ideal answer and it is a
   small ask — please look specifically for it in appendices, supplementary files, and
   official statistical annexes, not only in the article body.
2. **Percentile thresholds** (quartiles, deciles) of the raw score.
3. **A mean and SD, clearly labelled as such** — usable only as a weak fallback, and I will
   likely reject it. Report it, but do not present it as satisfying the question.
4. **A headline prevalence alone** ("X% scored 6+") — this is what Round 3 returned and it is
   NOT usable as a rank. Report it only as context, explicitly marked insufficient.

A "loneliness statistic" that is not tied to one of the instruments below, with its exact
item wording and response scale, cannot be used at all.

## Known traps in this exact subject area

These are real errors already caught in this project. Watch for them:

- **The same instrument in a different response scale.** A 2022 seven-country pilot uses this
  app's three UCLA items *verbatim* but on a **4-point** scale where the app uses 3. That
  makes the raw scores non-comparable. **Always report the number of response options and
  their exact labels.** A distribution without its response scale is unusable.
- **Different constructs treated as interchangeable.** "Feels lonely" (a direct question),
  "scores high on UCLA-3" (an indirect scale), "lacks social support" (Gallup World Poll),
  "is socially isolated" (LSNS-6), and "lives alone" (a census variable) are five different
  measurements. Never merge them. The UK ONS asks BOTH a direct question and the three-item
  scale — do not report one as the other.
- **A "population" norm that is a clinical or convenience sample.** Hospital, clinic,
  university-student, single-workplace, and single-province samples are **not** general-
  population norms. Label the sampling frame every time.
- **A "Thai" figure that is not Thai.** A commonly cited "Thai" self-efficacy norm traces back
  to 135 head nurses in **Yunnan, China**. Confirm the sample's actual country and occupation,
  not the authors' affiliation.
- **Reverse-scored items.** LSNS-6 and UCLA-3 both have versions where higher = worse and
  versions where higher = better. State the direction explicitly for every figure.

## Context you need

The app asks every user these exact questions.

**UCLA-3 (three items, each scored 1–3, raw total 3–9, higher = lonelier):**
- "How often do you feel that you lack companionship?"
- "How often do you feel left out?"
- "How often do you feel isolated from others?"
- Response options: **Hardly ever (1) / Some of the time (2) / Often (3)**

This is the Hughes, Waite, Hawkley & Cacioppo (2004) short form, *Research on Aging* 26(6),
655–672. It was derived on the US Health and Retirement Study (adults 57–85), which is why the
app currently has no norm for working-age adults.

**LSNS-6 (six items, each 0–5, raw total 0–30, higher = better connected):**
- Three items about relatives and three about friends: how many you see or hear from monthly,
  feel at ease talking to about private matters, and feel close enough to call on for help.
- This is Lubben et al. (2006), *The Gerontologist* 46(4), 503–513, validated on European
  adults aged 65+. The app uses its published **< 12 = isolation risk** cutoff, which is the
  instrument's own validated threshold and needs no sample — that part already works.

Users are Thai adults, roughly **ages 18–85**, general population — not patients, not students.

## Output format — required for every figure you report

Return one block per figure. Incomplete blocks are unusable, so if you cannot fill a field,
write `UNKNOWN` rather than guessing.

```
INSTRUMENT:        [exact name and item count, e.g. "UCLA-3 (Hughes 2004 short form)"]
RESPONSE SCALE:    [number of options + their exact labels + the numeric coding]
DIRECTION:         [higher = lonelier | higher = better connected]
FIGURE TYPE:       [full frequency table | cumulative percentiles | quartiles/deciles | mean+SD | prevalence at a cutoff]
VALUES:            [the numbers, with units exactly as published; give the whole table if there is one]
AGE BAND:          [the source's own band, verbatim, e.g. "16-24"; or "all ages 16+"]
SEX/SUBGROUP:      [if split further, or "combined"]
POPULATION:        [country + sampling frame, e.g. "UK, nationally representative household survey"]
SAMPLE SIZE:       [N for this specific cell]
DATA YEARS:        [when collected, not when published]
SOURCE TYPE:       [PRIMARY official statistic | PRIMARY peer-reviewed | SECONDARY ONLY - unverified]
CITATION:          [authors/agency, year, full title, journal or report series, volume/report number]
PERSISTENT ID:     [DOI, ISBN, or official report/dataset number; "none" if genuinely absent]
EXACT LOCATION:    [table number / figure number / page number / supplementary file name]
VERBATIM QUOTE:    ["the sentence or table cell containing the number, copied exactly"]
URL:               [direct link to the document or data file, not a search page]
PAYWALL/ACCESS:    [open access | paywalled | requires request | link may rot]
CONFIDENCE:        [high | medium | low] + one line on why
```

Then end your entire report with a single **summary table**: one row per figure, columns =
INSTRUMENT, FIGURE TYPE, AGE BAND, POPULATION, RESPONSE SCALE, SOURCE TYPE, PERSISTENT ID.
This is what I read first.

---

# The questions, in priority order

## Q1 — UCLA-3 score distribution in an all-ages general population (HIGHEST priority)

This one question could unblock the whole aspect, because it would let the app keep its
existing items unchanged.

The three-item UCLA measure above is used, apparently verbatim, in several national surveys of
**all adults**, not just older ones. I need the **distribution of its raw score** from any of
them. Please check each of these specifically and report what is published, even if the answer
is "only a headline percentage":

- **UK Office for National Statistics harmonised loneliness measures.** ONS publishes a
  harmonised standard that includes both a direct loneliness question and the three-item
  indirect scale. Does any ONS release, dataset, or technical annex publish the **distribution
  of the three-item score** rather than only the direct question's percentages?
- **UK Community Life Survey** (DCMS) — adults 16+, annual, publishes loneliness tables.
- **Understanding Society / UK Household Longitudinal Study** — carries the three-item scale;
  check whether the published tables or the data documentation give a score distribution.
- **English Longitudinal Study of Ageing (ELSA)** — older adults, but check whether its
  younger-partner sample is broken out separately.
- **US Health and Retirement Study (HRS)** — the original source. It covers 57–85, but check
  whether HRS or its sister studies publish a full frequency table for the raw 3–9 score,
  which the app could at least use for its own older users.
- **Any national survey in Asia** using this exact three-item form: Japan (the Japanese
  government has run loneliness surveys since 2021), Korea, Singapore, Taiwan, China (CHARLS,
  CFPS). Report the response scale carefully — translations often re-scale.
- **Thailand specifically** — any survey at all, national or regional, that has administered
  these three items.

For each, answer explicitly: **is a score distribution published, or only a prevalence?**
If only a prevalence, give its exact cutoff ("scored 6 or more out of 9") and its wording, and
mark it insufficient.

## Q2 — LSNS-6 score distribution in a general adult population (HIGH priority)

Same question for the six-item Lubben scale. It was validated on over-65s, but it has since
been administered far more widely.

Wanted:
1. A frequency or cumulative distribution of the raw 0–30 score in a general adult population,
   any country, ideally spanning working age.
2. Failing that, quartiles or deciles.
3. The **share scoring under 12** by age band — useful context even though the app already
   uses the cutoff itself without needing a sample.

Look at: Japanese general-population studies (LSNS-6 is heavily used in Japan and there are
large community samples), German and Austrian community surveys, the original Lubben 2006
multi-country validation, and any Thai or Southeast Asian validation study. Note whether the
sample is community-dwelling **general adult** or specifically elderly, every time.

## Q3 — Is there a better-normed instrument the app could switch to? (MEDIUM priority)

If Q1 and Q2 both come back empty, the remaining option is to add or swap an instrument. I do
not want a list of every loneliness scale in existence — I want to know which ones have a
**published general-population distribution covering working-age adults**, ideally including
Thailand or Southeast Asia.

Assess specifically, and only report ones where a distribution actually exists:
- **De Jong Gierveld Loneliness Scale** (6-item and 11-item). Used in the European Social
  Survey and several national statistics offices. Is a score distribution published, by age?
  Is there a validated Thai translation?
- **UCLA Loneliness Scale Version 3, full 20-item** (Russell 1996) — are there general-
  population norms, or only student and clinical samples?
- **Gallup World Poll social-support item** ("If you were in trouble, do you have relatives or
  friends you can count on?"). Thailand is covered annually and this feeds the World Happiness
  Report. But it is a **single binary item** — report the exact wording, the Thai national
  values with data years, and state plainly whether any distribution beyond a yes/no share
  exists. I suspect it does not, and that is worth confirming.
- **Berkman-Syme Social Network Index**, **Duke Social Support Index**, **Social Provisions
  Scale** — only if a general-population distribution exists.

For each, state the **cost of switching**: how many items, and whether a validated Thai
translation is published. An instrument with a beautiful norm and no Thai version is close to
useless to this app.

## Q4 — Thai-language validation studies (MEDIUM priority)

Independently of the above: has **any** Thai-language validation or normative study been
published for UCLA-3, the full UCLA scale, LSNS-6, LSNS-18, or the De Jong Gierveld scale?

Thai-language sources are welcome and often more detailed — quote the Thai and give a
translation. Thai Journal of Nursing, Journal of the Psychiatric Association of Thailand,
Chiang Mai University Nursing Journal, and ThaiJO generally are worth searching directly.

For each hit, state the sampling frame **first and prominently**. I expect most will be
elderly, clinical, or single-province samples, which makes them unusable as population norms —
but I still want to know they exist, and a study of Thai *working-age* adults would be a major
find even at modest sample size.

---

## Final self-check before you submit

For each figure, confirm you can answer yes to all of these. If not, downgrade or drop it:
- Did I open the actual source document or data file, not a summary of it?
- Did I record the **exact response scale and number of options**, and confirm it matches the
  3-point UCLA / 0–5 LSNS coding described above?
- Is the sampling frame a **general population**, and did I say so explicitly?
- Is this a **distribution**, or did I quietly report a prevalence as if it were one?
- Are the age bands **the source's own**, unmodified by me?
- Did I copy the number verbatim rather than recompute or model it?
- Would a reviewer with only my citation and location field find this exact number in under
  two minutes?

Close your report with an explicit **NOT FOUND list**: every question or sub-question where you
searched and found nothing, with a one-line note on where you looked. I will act on that list —
if Q1 through Q4 are all NOT FOUND, the app keeps its unranked disclosure permanently and I
will cite this search as the reason, so please make the negative result as solid as the
positive ones.
