# Round 6 research brief — published sources for Social Contribution and Environment

Status: **PARTLY CLOSED — answered 2026-08-13.** ASK A is answered: GEB-50 and the
Self-Report Altruism Scale both survived verification. ASK B is **reopened, not closed** —
the export's central finding is wrong. Four defects found in the export; read `## Outcome`
at the foot of this file before treating anything above it as settled.
Purpose: replace the app-authored item sets behind the two aspects that currently disclose
*"App-authored behavioral items — not a standardized instrument. Read this aspect as a habits
index, not a validated psychological measure."* Those are `ptm` (Social Contribution) and
`geb` (Environment) in `surveys.js:208-228`, consumed as STAGE 2 by
`socialContributionBenchmark` (`benchmarks.js:786`) and `environmentBenchmark`
(`benchmarks.js:847`).

Unlike rounds 4 and 5, this brief is **not** written blind. Pre-brief searching found six
verified leads, and the questions below are built around them rather than around a hope.

## What must be understood first: these aspects are TWO-STAGE

Getting this wrong would waste the whole round. Both aspects already produce a **cited**
percentile. The app-authored part is not the rank — it positions the user *inside* a band the
citation already fixed.

| | STAGE 1 — sets the band (cited) | STAGE 2 — positions within it (app-authored) |
|---|---|---|
| Social Contribution | CAF World Giving Index 2024: 67% of Thais donated, 24% volunteered | `ptm`, 5 frequency items, 0-20 |
| Environment | Thai post-ban average of ~3 single-use plastic pieces/day | `geb`, 6 frequency items, 0-24 |

So there are **two separable asks**, and a source can satisfy one without touching the other:

- **ASK A — validated ITEMS.** Replace app-written questions with items from a published
  instrument, so wording and scoring are traceable. Needs no population data at all.
- **ASK B — a Thai population DISTRIBUTION** of those behaviours. Would let stage 2 stop being
  a within-band nudge and become a real comparison. Needs a nationally representative sample.

**Both must be answered separately for every source.** A source giving validated items with no
Thai norm is still a win for ASK A and must not be discarded as a failure.

The resolution lesson from round 5 (`round-5-rankable-relationships.md`) applies to ASK B
only: a distribution cannot support a rank if one raw score spans a wide percentile range. It
does **not** apply to ASK A.

## Verified leads found before writing this brief (2026-08-13)

Each checked at source; confidence stated honestly.

### 1. Thailand IS in ISSP 2020 Environment IV — strongest lead, serves ASK B

- **Verified**: Thailand is an ISSP member, represented by **King Prajadhipok's Institute
  (KPI)** — https://issp.org/member-states/thailand/ and issp.org/regions/asia/.
- **Verified**: Thailand fielded Environment IV, **N = 1,498**, in the first data release
  beside Japan (1,491), Philippines (1,500), Taiwan (1,822). Archive **GESIS ZA7650**, Data
  file Version 2.0.0, doi:10.4232/1.14153.
- The module carries pro-environmental **behaviour frequency** items — e.g. making "a special
  effort to sort glass or tins or plastic or newspapers and so on for recycling" — a near
  match for `geb` item 1.
- **NOT verified, and decisive**: whether GESIS publishes **per-country marginal frequency
  tables** (the ISSP *Variable Report* usually does) or whether Thailand's distribution is
  obtainable only by analysing microdata. That distinction settles everything — a published
  variable report is citable; our own tabulation would make this project the source of the
  statistic, which `benchmarks.js:425` forbids ("Age stratification must come from the SOURCE,
  never from this project").

### 2. GEB-50 is the instrument the `geb` key gestures at — serves ASK A

- Kaiser's **General Ecological Behavior** scale: six domains — energy saving, mobility, waste
  avoidance, consumption, recycling, civic engagement. Rasch-scaled with published item
  difficulties; separation reliability ~.71-.88, test-retest ~.76-.83. Full
  *Verfahrensdokumentation* in PsychArchives; cross-culturally validated on Swedish and Swiss
  samples.
- **Five of the app's six `geb` items map onto five of those six domains.** The app is already
  an uncredited GEB adaptation, missing only civic engagement.
- Unknown: whether a short form with published item difficulties exists, and whether any Thai
  translation is validated.

### 3. The `ptm` key is MISNAMED — a citation-hygiene defect, serves ASK A

- **Verified**: the Prosocial Tendencies Measure (Carlo & Randall 2002) has six subscales
  (public, anonymous, dire, emotional, compliant, altruistic) on a **dispositional** scale,
  1 = "does not describe me at all" to 5 = "describes me a lot".
- The app's five `ptm` items are **frequency-of-behaviour** ("How often do you donate money to
  charity, temples, or people in need?", FREQ_5). They are not PTM items and share neither its
  structure nor its response format. The key names an instrument the app does not use.
- ASK A is therefore genuinely open here: find the instrument that actually measures frequency
  of prosocial behaviour, or adopt PTM properly and rewrite the items to match.

### 4. KPI fields several other nationally representative Thai series — serves ASK B

Beyond ISSP, KPI is reported to run the **Asian Barometer Survey**, **World Values Survey**,
Social Quality Survey and CSES for Thailand. WVS and ABS both carry organisational membership,
voluntary work and civic-participation items. Which waves and which items is unverified. This
is the richest untapped vein for Social Contribution and where Q2 should start.

### 5. OECD EPIC 2022 — a model, but the WRONG population

17,000+ households, four domains (energy, transport, waste, food), nationally representative —
but **nine countries, none in Asia**: Belgium, Canada, Israel, France, Netherlands, Sweden,
Switzerland, UK, US. Useful only as a template for how behaviour frequencies are reported.
Not a Thai norm. Do not spend effort making it fit.

### 6. CAF WGI publishes THREE rates; the app uses TWO

Stage 1 *scores* on "donated money" and "volunteered time". CAF's third component — **"helped
a stranger"** — is published on the same basis and maps directly onto `ptm` item 3 ("How often
do you help strangers…").

**Correction, added 2026-08-13.** This lead was written wrong in two ways, both my error:

- The third rate was **already in the citation label**, not missing. It is only absent from
  the *bands*, which is a different and much smaller observation than the one I made.
- The three rates as written here (52 / 19) were taken from the app's own label rather than
  from CAF, so this brief repeated the app's mistake instead of catching it. Verifying the
  export later exposed both: the label had the helped-a-stranger and donated-money columns
  swapped, and drew them from the 2023 edition under a 2024 label. Corrected in v63 — see
  the CHANGELOG entry for 2.14.16 and the note above `SOCIAL_BANDS`.

The lesson generalises past this line: a brief that seeds itself from the codebase inherits
whatever the codebase already got wrong. Pre-brief leads must be read from the source, on the
same standard demanded of the export.

---

Paste everything below the line into Gemini Deep Research.

---

# Research task: published instruments and Thai population data for pro-environmental and prosocial behaviour

## Your role and the single most important rule

You are sourcing psychometric instruments and population statistics that will be written into
a health self-assessment app used by real people. Every item and number you return will be
**independently re-verified against its primary source before use**. A number I cannot trace
and confirm is worse than no number, because it costs review time and is then discarded.

**"NOT FOUND" is a correct, valuable and expected answer.** The app currently discloses these
two aspects as *"app-authored behavioural items — not a standardized instrument"*, and that
honest disclosure is a shipped feature, not a bug I am desperate to remove. Confirming no
better source exists is a successful result. **Do not fill gaps.**

## The two separate questions you must answer for every source

This app scores each aspect in two stages: a cited population statistic sets a percentile
band, and a set of behaviour items positions the user inside that band. These need different
things from you, and **a source may satisfy one and not the other**:

- **ASK A — VALIDATED ITEMS.** A published instrument whose items and scoring I can adopt or
  adapt with a citation. **No population data required.** What matters is item wording,
  response scale, scoring direction, and published psychometrics.
- **ASK B — A THAI POPULATION DISTRIBUTION.** A nationally representative Thai sample
  reporting how often people actually perform these behaviours.

**Label every source ASK A, ASK B, or BOTH. Never merge them.** Reporting a good instrument as
useless because it lacks Thai norms is a failure mode; so is reporting a Thai statistic as
though it validated an instrument.

## Absolute prohibitions

- Do not **pool, average, or meta-analyse** across studies or countries.
- Do not **interpolate or extrapolate** across bands, score points, or years.
- Do not **convert between measures** — not between instruments, not between a prevalence and
  a distribution, not between response scales of different lengths.
- Do not **re-band** data into groups the source did not publish.
- Do not **reconstruct a distribution from a mean and SD.**
- Do not cite a review, blog, secondary summary, news article, AI answer, or a figure quoted
  in another paper's background section. Go to the **primary publication, official statistical
  release, or data archive**. If you can only reach a secondary mention, mark it
  `SECONDARY ONLY — unverified`.
- **Do not present your own tabulation of microdata as a published statistic.** If a figure can
  only be obtained by analysing a dataset, say so and mark it `MICRODATA ONLY — not published`.
  This distinction is decisive and I will act on it.

## Known traps in this exact subject area

Real errors already caught in this project:

- **An instrument-shaped name attached to items from no instrument.** This app's own code has
  a key called `ptm` holding five frequency questions that are *not* Prosocial Tendencies
  Measure items. Always confirm that items you attribute to an instrument are that
  instrument's published items.
- **Attitude vs behaviour vs disposition.** "I care about the environment" (attitude), "I
  recycled last week" (behaviour) and "Helping describes me" (disposition) are three different
  constructs. This app measures BEHAVIOUR FREQUENCY. State which one each source measures.
- **A "Thai" figure that is not Thai.** A widely cited "Thai" self-efficacy norm traces to 135
  head nurses in Yunnan, CHINA. Confirm the sample's actual country and occupation, not the
  authors' affiliation.
- **A "population" sample that is students or one province.** University, single-school,
  single-province and online-panel samples are not national norms. Thai pro-environmental
  research skews heavily to Bangkok high-school and university samples — state the sampling
  frame first and prominently.
- **Mismatched citations.** A previous export in this project attached the DOI of an
  *attachment questionnaire* to a claim about a *loneliness scale*. Open each DOI and confirm
  the title matches the claim before submitting.
- **Response-scale drift.** This app uses a 5-point frequency scale. An instrument using
  yes/no, 4-point or 7-point options is not directly comparable — report options and coding
  every time.

## Context: exactly what the app asks today

**Environment — six items, 5-point frequency scale, scored 0-24, higher = greener:**
1. How often do you separate recyclables (plastic, paper, glass) from general waste?
2. How often do you refuse or avoid single-use plastics (bags, straws, cups)?
3. How often do you use public transit, walk, or cycle instead of a private car?
4. How often do you turn off lights and appliances when not in use?
5. How often do you limit air-conditioning use or set it to 25°C or higher?
6. How often do you choose eco-friendly or refillable products?

**Social Contribution — five items, 5-point frequency scale, scored 0-20, higher = more:**
1. How often do you donate money to charity, temples, or people in need?
2. How often do you help friends or family members who are in need?
3. How often do you help strangers (e.g., giving directions, carrying things)?
4. How often do you participate in community or neighborhood activities?
5. How often do you engage in local civic issues (e.g., voting, community meetings)?

Users are **Thai adults, roughly 18-85, general population** — not students, not patients.
Thai specifics matter: temple donation (ทำบุญ) is a major giving channel, and
air-conditioning is the dominant household energy behaviour.

## Output format — required for every source

```
SOURCE NAME:            [instrument or survey, exact name and version]
SERVES:                 [ASK A - items | ASK B - Thai distribution | BOTH]
CONSTRUCT:              [behaviour frequency | attitude | disposition | mixed]
ITEMS:                  [for ASK A: exact item wording, or the count and where to obtain them]
RESPONSE SCALE:         [option count + exact labels + numeric coding + score range + direction]
FIGURE TYPE:            [full frequency table | per-item percentages | percentiles | mean+SD | prevalence | N/A - instrument only]
VALUES:                 [numbers exactly as published; the whole table if there is one]
PUBLISHED OR MICRODATA: [PUBLISHED in a report/annex | MICRODATA ONLY - not published]
POPULATION:             [country + sampling frame; probability sample or panel]
SAMPLE SIZE:            [N for this specific cell]
DATA YEARS:             [when COLLECTED]
THAI VERSION:           [validated Thai translation? cite it, or "none located"]
LICENCE/COST:           [free to use? permission required? fee? many instruments are restricted]
SOURCE TYPE:            [PRIMARY official statistic | PRIMARY peer-reviewed | data archive | SECONDARY ONLY - unverified]
CITATION:               [authors/agency, year, full title, journal or report series, volume/number]
PERSISTENT ID:          [DOI, ISBN, archive study number; "none" if genuinely absent]
EXACT LOCATION:         [table/figure/page/variable name/supplementary file]
VERBATIM QUOTE:         ["the sentence or table cell containing the number, copied exactly"]
URL:                    [direct link to the document or data file, not a search page]
CONFIDENCE:             [high | medium | low] + one line why
```

End with a **summary table**: one row per source, columns = SOURCE NAME, SERVES, CONSTRUCT,
PUBLISHED OR MICRODATA, THAI VERSION, LICENCE, PERSISTENT ID. I read this first.

---

# The questions, in priority order

## Q1 — Does ISSP 2020 Environment IV publish Thailand's item-level frequencies? (HIGHEST)

Already confirmed by me: Thailand fielded the module, N = 1,498, archived as **GESIS ZA7650,
Data file Version 2.0.0**, doi:10.4232/1.14153, member institution King Prajadhipok's
Institute. **Do not re-verify that Thailand participated. Answer what I could not:**

1. Does GESIS publish a **Variable Report** (or codebook, topline, or annex) for ZA7650 giving
   **per-country marginal frequency distributions**? If yes, this is the single most valuable
   thing you can return — give **Thailand's percentage distribution for every behaviour item**,
   verbatim, with variable names.
2. List the module's **behaviour** items specifically, separated from the attitude and
   knowledge items, with exact wording and response options.
3. Which items correspond to recycling, car use, and eco-product purchasing?
4. If the distributions exist only in microdata, **say so plainly and mark it
   `MICRODATA ONLY`.** Do not tabulate it yourself.
5. Also check the **ISSP cumulation "Environment I-IV"** — does it include Thailand, and does
   it publish country topline tables?

## Q2 — Thai national data on volunteering, donating and civic participation (HIGH)

For Social Contribution's stage 1 and ideally ASK B. King Prajadhipok's Institute reportedly
fields several nationally representative Thai series. For each, report which behaviour items it
carries and whether frequencies are published:

- **World Values Survey**, Thailand — which waves? WVS carries organisational membership and
  voluntary-work items. Are Thai country tables published on the WVS site?
- **Asian Barometer Survey**, Thailand — civic and political participation items across waves.
- **ISSP Citizenship** (2004, 2014) and **ISSP Social Networks** (2017) — did Thailand field
  either? Both carry helping and civic-participation items.
- **KPI's own Thai Democracy Index / citizen surveys** — KPI publishes an annual "Monitoring
  the Pulse of Thai Democracy". Does any edition report volunteering or community
  participation rates?
- **CAF World Giving Index**: confirm Thailand's most recent figures for **all three**
  components separately — helped a stranger, donated money, volunteered time — with survey
  year. The app cites 52% donating and 19% volunteering; confirm or correct those and supply
  the third.
- Any Thai NSO survey covering volunteering, merit-making (ทำบุญ), or community participation.

## Q3 — A published instrument for pro-environmental BEHAVIOUR FREQUENCY (HIGH, ASK A)

The app's six environment items are an uncredited adaptation of the domains in Kaiser's
**General Ecological Behavior (GEB)** scale. Assess:

- **GEB-50 and any published short form.** Exact items, response scale, scoring, Rasch item
  difficulties if published, and licence terms. Is there a validated **Thai** translation? Is
  there a version whose items suit a 5-point frequency scale rather than the original format?
- **Pro-Environmental Behaviour Scale (PEBS)**, **Recurring Pro-environmental Behaviour
  Scale**, **New Ecological Paradigm** (note: NEP is an ATTITUDE scale — say so and rule it
  out for this purpose), and any household-behaviour battery used in national statistics.
- Any instrument with **published Thai validation** for pro-environmental behaviour in
  general-population adults, not students.
- For each: is adoption free, and how many items?

## Q4 — A published instrument for prosocial BEHAVIOUR FREQUENCY (HIGH, ASK A)

The app's key is called `ptm` but its items are not Prosocial Tendencies Measure items — PTM is
dispositional ("describes me"), the app's are frequency ("how often"). I need the instrument
that actually matches frequency of giving, helping and civic participation:

- **PTM (Carlo & Randall 2002) and PTM-R** — confirm item format and whether any Thai
  validation exists. If adopting PTM properly means moving from frequency to disposition, say
  so plainly: that is a design decision, not a swap.
- Instruments measuring **frequency** of prosocial behaviour: Self-Report Altruism Scale
  (Rushton 1981), Prosocial Behaviour Questionnaire, volunteering-frequency batteries used in
  official statistics.
- **Civic participation** batteries with published items: ISSP Citizenship, WVS, the US Current
  Population Survey Volunteering Supplement, the UK Community Life Survey volunteering module.
- Which of these has a **validated Thai translation** in adults?

## Q5 — Is there a Thai per-person norm for single-use plastic? (MEDIUM)

Environment's stage 1 bands around "~3 single-use plastic pieces per day, the Thai post-ban
average", and the app's own note concedes "per-person distribution data is not published".
Test that:

- Is there a **published per-person distribution** — not just a national average — of
  single-use plastic or plastic-bag consumption in Thailand? Check PCD (Pollution Control
  Department), TEI, ONEP, and the post-2020 bag-ban evaluations.
- Confirm or correct the ~3/day figure, with exact source, year and definition — bags only, or
  all single-use items?

---

## Final self-check before you submit

- Did I open the actual source document or data file, not a summary of it?
- **Did I open every DOI and confirm the title matches the claim I attached it to?**
- Did I label every source ASK A / ASK B / BOTH, and never merge the two?
- Did I state the CONSTRUCT (behaviour / attitude / disposition) for every instrument?
- Did I mark anything obtainable only by analysing microdata as `MICRODATA ONLY`?
- Is the sampling frame a **general adult population**, and did I say so, including whether it
  is a probability sample?
- Did I record exact response options and coding?
- Did I check licensing, given that some instruments require permission or a fee?
- Would a reviewer with only my citation and location field find this exact item or number in
  under two minutes?

Close with an explicit **NOT FOUND list**: every question and sub-question where you searched
and found nothing, with a one-line note on where you looked. A solid negative on Q1 is
genuinely valuable — it tells me the ISSP route is closed and I stop paying attention to it.

---

# Outcome — 2026-08-13

Export: *"Comprehensive Research Report: Psychometric Instruments and Thai Population
Benchmarks for Environmental and Social Contribution Behaviors."* Every load-bearing claim was
re-verified at source before any of it was used. Two survived, one reversed, four were defects.

## ASK A — answered

**GEB-50 — adopt-ready.** `doi:10.23668/psycharchives.4489` resolves correctly to Kaiser,
*GEB-50. General Ecological Behavior Scale*, PsychArchives, item type Test, 50 items, the six
domains as described, open access. (Export says 2021; the record says **2020**.) Five of the
app's six `geb` items already map onto five of those domains, so this is a citation for an
existing adaptation rather than a rewrite. Unresolved: the export's Rasch difficulty range of
-2.50 to +2.30 logits is unverified, and GEB's native scoring is dichotomous — putting a
5-point frequency scale over Rasch-calibrated items without recalibration changes the psycho-
metric distances, which the export states but does not resolve.

**Self-Report Altruism Scale — the answer to the `ptm` misnaming.** Rushton, Chrisjohn &
Fekken 1981, *Personality and Individual Differences* 2(4) 293-302,
`doi:10.1016/0191-8869(81)90084-2` — DOI resolves. Its response format is *Never / Once / More
than once / Often / Very often*: a genuine **frequency** scale, which is the construct the app
actually measures. Better than adopting PTM, which would mean switching the whole aspect from
frequency to disposition. No Thai general-adult norm exists (student and medical cohorts only),
which does not matter — ASK A never needed one.

## ASK B — REOPENED, against the export's verdict

**The export's central finding is wrong, and it closed the best lead we have.** It states the
GESIS Variable Report gives "international pooled frequencies and summary parameters rather
than standalone, item-level marginal frequency distribution tables for Thailand", and marks
Thailand `MICRODATA ONLY`.

GESIS's own Variable Report front matter says the opposite, verbatim:

> "this Variable Report presents cross tabulations over countries for all substantial and most
> of the demographic variables… All cross tabulations, descriptive statistics and frequency
> distributions are based on unweighted data."

A real ISSP Variable Report (963 pages) was opened and the structure confirmed directly:
substantive variables carry a table with one row per country ISO code. Per-country marginals
are precisely what these reports publish.

Two honest limits on that finding:

- The report opened was **ZA5950** (National Identity III), not ZA7650. GESIS returns 403 to
  automated fetches and the download needs registration. The structural claim rests on the
  shared ISSP Variable Report template, which the export itself confirms exists for ZA7650
  (Issue 2023|06). One step removed — verify against ZA7650 itself before relying on it.
- The tables are **unweighted**. That is a published statistic, but it is not the weighted
  population estimate, and the Thai sample carries weights. Whether an unweighted marginal
  clears this project's bar is a decision, not a lookup.

**Next step, narrow:** open ZA7650's Variable Report and look for the Q19a and Q19b rows.

## Defects in the export

1. **The CAF figures are shifted one column.** Reported "helped a stranger 45%, donated money
   52%, volunteered 19%". **45 is the World Giving Index score, not a percentage**, and 52% is
   the helped-a-stranger rate. Verified by extracting both reports directly:

   | Edition | Rank | Index score | Helped a stranger | Donated money | Volunteered |
   |---|---|---|---|---|---|
   | 2023 (2022 data) | 38 | 45 | 52% | 63% | 19% |
   | 2024 (2023 data) | 14 | 52 | 64% | 67% | 24% |

   Its own aside — *"reaches 63% in the 2023 data wave report"* — is the real donated-money
   figure, spotted and then filed as a footnote. Its `VERBATIM QUOTE` field is a rewritten
   table row, not a sentence that exists in the report. This defect matched an identical one in
   the app's own citation, which is how the app's error was found; corrected in v63.

2. **A fabricated DOI.** `doi:10.1016/S0140-1971(02)00073-2`, given for Carlo & Randall 2002,
   **returns 404 at doi.org** — it is not registered. That prefix belongs to *Journal of
   Adolescence*; the paper is in *Journal of Youth and Adolescence* 31, 31-44,
   `doi:10.1023/A:1014033032440`. Third mismatched-citation incident across rounds 5 and 6. The
   prompt made "open every DOI and confirm the title matches" a mandatory closing self-check;
   it demonstrably did not run.

3. **The ISSP item set is misdescribed.** The export lists four behaviour items on "a
   standardized 4-point frequency scale: Always / Often / Sometimes / Never". From the ISSP
   2020 source questionnaire:

   | Export's claim | Actual |
   |---|---|
   | RECYCLE, 4-point | Q19a, 4-point ✓ — but with a `(-4)` "Recycling not available where I live" code the export dropped, which changes how it must be scored |
   | AVOID, 4-point | Q19b, 4-point ✓ |
   | OUT, 4-point | Q16, **5-point** (daily / several times a week / month / year / never), and it measures leisure in nature — nature *exposure*, not pro-environmental behaviour |
   | MEAT, 4-point | Q17c, **not a frequency scale at all**: "In a typical week, on how many days do you eat **beef, lamb**, or products that contain them?", answered 0-7. The word "meat" does not appear |

   It also missed Q17a (plane trips, a count) and Q17b (hours per week in a car), which are
   genuinely behavioural. One response scale was asserted across items using three different
   formats.

   **Consequence for ASK A:** ISSP supplies frequency-Likert items matching only **2 of the
   app's 6** environment items. Nothing covers single-use plastics, lights and appliances, or
   air-conditioning — the three that matter most in Thailand, and the app's own note says A/C
   is the dominant household energy behaviour. ISSP is a much weaker ASK A source than the
   export presents it as.

4. **An arithmetic claim that does not hold.** "Thai households donate over 75 billion Baht
   annually (~0.6% of GDP)" implies a GDP near 12.5 trillion Baht, against roughly 17-18
   trillion in recent years — closer to 0.43%. Marked unverified; the underlying TDRI figure
   was not checked.

**Unverified, treat as unconfirmed:** the GEB logit range; the Thai student samples (N=423,
N=62, N=175); SRA's original N=416; MICS6's N=35,604; the ZA7650 Variable Report pages 654-655.

## What changed in the app as a result

Nothing from this round has been adopted into scoring. The only code change it *caused* was
the v63 CAF correction, which is a defect fix the round surfaced by accident rather than a
research finding: verifying the export's CAF dossier exposed the same column-shift in
`SOURCES.cafWgi`, plus a stale edition and a wrong recall window. Two tests now pin the band
edges to the cited rates so that class of error fails in CI.

GEB-50 and SRA remain candidates, not commitments. Adopting either means rewriting an item set
and re-deriving its scoring, which is its own piece of work.
