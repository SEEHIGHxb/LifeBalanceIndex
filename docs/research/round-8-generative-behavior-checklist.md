# Round 8 research brief — is the Generative Behavior Checklist adoptable for Humanity's Future?

Status: **CLOSED — 2026-08-15. Adoption rejected. See the Outcome section at the foot of this
file.** No code changed. The finding worth keeping is recorded there and is not about the GBC.

Purpose: decide whether to replace the five app-authored `lfis` items (`surveys.js:229`,
consumed by `calculateHumanityFutureScore` at `scoring.js:383`) with a published instrument.

## Why this round is narrow

Rounds 0, 1, 6 and 7 each asked a broad question across several instruments and constructs.
Every one returned genuine findings mixed with fabricated ones, and verifying each claim at its
primary source cost more than the surviving findings were worth. Round 7's export invented a
national TMHI-15 norm that this project had **already established does not exist**, supplied it
with a mean, an SD, a sample size, age bands and page numbers, and marked it
`CONFIDENCE: High`. It also cited WVS Wave 7 variables that are demographic fields.

Round 2 asked **one question about one instrument** and produced the cleanest result in the
project's history. This round copies that shape deliberately.

**One instrument, one decision.** If the answer is no, we keep the current app-authored items
with their existing disclosure and stop.

> **Attach nothing.** Do not supply any previous round's document, or any previous output, as
> an input or a source. Round 1 cited its own predecessor and laundered round 0's errors into
> established fact.

## What this round explicitly does NOT ask

- **No Thai population norms.** Round 7 established none exist for purpose or generativity, and
  v64 already made this aspect **unranked** in response (`humanityFutureBenchmark` in
  `benchmarks.js`). We do not need a distribution and are not looking for one. **A Thai
  statistic is not a deliverable here and will not be used.** This is items, scoring and licence
  only.
- **No alternative instruments.** Not the LGS, not the Social Generativity Scale, not Ryff, not
  the MLQ or the Life Engagement Test. Those were assessed in round 7 and are closed for now. If
  the GBC fails, the answer is "keep what we have", not "here is a substitute".

## 1. The question

The **Generative Behavior Checklist (GBC)** — the behavioural instrument published alongside the
Loyola Generativity Scale in the same 1992 paper — and its Japanese revision, the **GBC-R**.

> **Primary question:** Can the GBC or GBC-R items be obtained, licensed, and adapted as the
> item set behind an aspect measuring what a person contributes to the people who come after
> them?
>
> **Secondary question (answer this even if the primary answer is no):** The GBC-R's factor
> analysis reports a **"maintaining"** factor. **Which specific items load on it, and would a
> farmer, cook, carer or manual worker actually score on those items?**

The secondary question is why this round exists, so answer it even if licensing kills the
primary one. The app's current items reward a professional's idea of contributing to the future,
and a maintainer of a community scores near the floor. If the GBC-R's maintaining items are
about **sustaining land, household, craft and community**, this instrument solves that problem.
If they are about maintaining *organizations, institutions or boards*, it does not — and knowing
that is worth the round on its own.

## 2. What is already verified — do not re-research this

Checked at source before this brief was written. **Do not re-verify. Answer what these leave
open.**

| Fact | Status |
|---|---|
| The GBC exists and was published with the LGS in McAdams & de St. Aubin (1992), *"A theory of generativity and its assessment through self-report, behavioral acts, and narrative themes in autobiography"*, JPSP **62(6), 1003-1015**, `doi:10.1037/0022-3514.62.6.1003` | **VERIFIED** — DOI resolves via Crossref, title matches |
| A revision exists: Marushima & Arimitsu (2007), *"Revised generative concern scale and generative behavior checklist (GCS-R, GBC-R): Scale reconstruction, reliability, and validity"*, *Shinrigaku Kenkyu* (The Japanese Journal of Psychology) **78(3), 303-309**, `doi:10.4992/jjpsy.78.303`, PMID 17892029 | **VERIFIED** — DOI resolves, title matches |
| The GBC-R was administered to **996 adults**, and its factor analysis found **three factors: offering, maintaining, and creativity** | **VERIFIED** from the indexed English abstract |
| That sample is **Japanese** (Kobe College affiliation); the article body is in **Japanese** with an English abstract | **VERIFIED** |

Reported in secondary sources and **NOT verified** — treat each as an open question, never as a
premise:

- That the GBC contains **50 items**, covering acts such as teaching a skill, volunteering,
  restoring a house, producing a piece of art.
- That its recall window is the **preceding two months**.
- That some items are **fillers**, not scored toward generativity.
- That adaptations exist in **Polish** (reported N = 237, ages 19-93) and **Spanish** (reported
  with LGBT+ older adults, α ≈ .879), and that a **Chinese** "Generative Acts Scale" (GAS-C)
  exists for grandparents.

## 3. What would make this adoptable, and what would kill it

State a verdict against these. They are the decision, not background.

**Adoptable if all four hold:**

1. The item list is **obtainable** — printed in a paper, an appendix, a thesis or a test
   archive — not merely described.
2. The licence permits use in a **free, publicly distributed app**, or the terms are stated
   clearly enough that permission can be sought.
3. There is a **maintaining** subscale whose items a non-professional performs in ordinary life.
4. The response format is compatible with a short self-report form, or its native format is
   stated precisely enough to adopt as-is.

**Killed if any of these hold — say so plainly and stop:**

- The items are proprietary, fee-bearing, or obtainable only by contacting an author.
- The instrument is ~50 items with no validated short form. The app asks five items per aspect
  at onboarding; fifty is not shippable, and **a subset chosen by us would make this project the
  source of the instrument** — exactly what adopting a published one is meant to avoid.
- The "maintaining" factor turns out to mean institutional or organizational maintenance rather
  than sustaining land, household, craft or community.

---

Paste everything below the line into Gemini Deep Research.

---

# Research task: the Generative Behavior Checklist — items, factor structure, and licence

## Your role and the single most important rule

You are sourcing one psychometric instrument that may be written into a wellbeing
self-assessment app used by real people. Every claim you return will be **independently
re-verified against its primary source before use**. A claim I cannot trace and confirm is worse
than no claim, because it costs review time and is then discarded.

**"NOT FOUND" is a correct, valuable and expected answer.** The app currently uses app-authored
items and discloses them as such — that honest disclosure is a shipped feature, not a bug I am
desperate to remove. Confirming the instrument is unobtainable, unlicensable or too long is a
**successful result**, and I will act on it by keeping what I have. **Do not fill gaps. Do not
manufacture a positive finding.**

Recent exports in this project have invented a national norm complete with a mean, an SD, a
sample size and page numbers, and have attached real DOIs to the wrong claims. State your
confidence honestly, and mark plainly anything you could not open.

## Scope — read this before searching

This is a **single-instrument** round.

- **In scope:** the Generative Behavior Checklist (GBC), McAdams & de St. Aubin 1992; the
  revised GBC-R, Marushima & Arimitsu 2007; and any published translation or adaptation of
  either.
- **Out of scope, do not report:** the Loyola Generativity Scale, the Social Generativity Scale,
  Ryff's scales, the Meaning in Life Questionnaire, the Life Engagement Test, grit,
  self-efficacy. All were assessed in a previous round.
- **Out of scope, do not report: population norms or distributions of any kind, for any
  country.** I do not need them and will not use them. This round is about item wording, scoring
  and licence only.

If you find yourself reporting a percentage of a population, you have left the scope.

## Absolute prohibitions

- Do not **reconstruct item wording from an abstract, a summary, a citation in another paper, or
  a description of the instrument.** Items come from the instrument itself. If you can only find
  a description, say `ITEMS DESCRIBED, NOT OBTAINED`, and keep the description separate from
  anything you present as an item.
- Do not **translate items yourself** and present the result as published wording. If a version
  exists only in Japanese, Polish or Spanish, say so and report the original with its language
  marked.
- Do not **conflate the GBC with the LGS.** They appear in the same 1992 paper and are
  constantly confused in secondary sources. The LGS measures generative **concern** — a
  disposition, "describes me". The GBC measures generative **acts** — behaviour frequency, "how
  often did you do this". A source referring to "the McAdams generativity scale" may mean
  either. Say which one it means, every time.
- Do not **conflate the GBC with the GBC-R.** Different item sets, different language, different
  decade. Label every finding with which one it concerns.
- Do not cite a review, blog, scale-database entry, secondary summary or AI answer as the source
  of item wording. Go to the **primary publication, a thesis appendix, a test archive, or the
  instrument's own documentation**. Scale-aggregator websites are frequently wrong about item
  counts and response scales — if one is your only source, mark it
  `SECONDARY ONLY — unverified`.
- **Open every DOI and confirm the returned title matches the claim you attached it to.** Three
  separate mismatched-citation defects have already been caught in this project.

## The questions, in priority order

### Q1 — The GBC's actual items and format (HIGHEST)

1. **Reproduce the item list** if it is published, with exact wording. If it appears in the 1992
   paper's appendix, say which pages. If it does not appear there, say so plainly and report
   where it *does* appear — a later paper, a thesis appendix, PsycTESTS, the Foley Center for
   the Study of Lives, or nowhere.
2. **How many items**, and how many are **fillers** not scored toward generativity? Give both
   numbers separately.
3. The **exact response format**: option labels, numeric coding, score range, direction.
4. The **exact recall window** — the period respondents are asked to report on.
5. Is there a **validated short form** of any length? This is decisive: the app asks five items
   per aspect and cannot ship fifty.

### Q2 — The GBC-R's "maintaining" factor (HIGHEST)

Marushima & Arimitsu (2007), `doi:10.4992/jjpsy.78.303`, N = 996, report three factors:
**offering, maintaining, creativity**. Already confirmed by me — do not re-verify it. Answer
what I could not:

1. **Which items load on the maintaining factor?** Exact wording, in the published language,
   with the language marked. This is the single most valuable thing you can return.
2. What does the paper mean by *maintaining* — sustaining a household, land, craft, tradition and
   community, or maintaining organizations, institutions and roles? **Quote the paper's own
   definition.**
3. How many items per factor, and each factor's reliability?
4. The GBC-R's response format and recall window, if they differ from the original.
5. The article body is in Japanese. State clearly what you obtained from the **full text** and
   what came only from the **English abstract**. An abstract is not an item list.

### Q3 — Licence and availability (HIGH)

For the GBC and the GBC-R separately:

1. Are the items **free to use** — public domain, printed in an open-access article, or released
   under a stated licence?
2. Does use require **written permission**, registration, or a fee?
3. Is use in a **free, publicly distributed mobile or web app** permitted, restricted to
   academic research, or simply unaddressed?
4. Who holds the rights — the authors, the publisher, Northwestern University's Foley Center, or
   a test publisher?

An instrument I cannot legally ship is not a candidate, so a clear negative here closes the
round cheaply.

### Q4 — Translations and adaptations (MEDIUM)

Reported to exist but unverified by me. For each: confirm existence, give the citation and the
sample, and say whether the **items** are published in that paper.

- A **Polish** adaptation (reported N = 237, ages 19-93).
- A **Spanish** psychometric study (reported with LGBT+ older adults).
- The **Chinese "Generative Acts Scale" (GAS-C)** for grandparents — is it a GBC derivative or an
  independent instrument? If independent, say so and stop; it is out of scope.
- Any **Thai** version. Expected answer: none. Confirm the negative rather than assuming it.

### Q5 — Does the GBC behave differently across occupation or social class? (MEDIUM)

A previous round asked this of *disposition* scales and found nothing published. A **behaviour**
checklist may differ, because it asks what someone did rather than how they see themselves.

1. Any study reporting GBC or GBC-R scores **by occupation, education, income or social class**.
2. Any measurement-invariance or differential-item-functioning work on either, across those
   groupings.
3. Any critique in the literature arguing the GBC's item content favours particular occupations
   or social positions.

**A NOT FOUND here is expected and entirely acceptable.** Report it as a negative; do not
substitute findings about gender or age, which are different questions.

## Output format

One block for each of the GBC, the GBC-R, and any translation:

```
INSTRUMENT:             [GBC (1992) | GBC-R (2007) | translation — name it]
ITEMS OBTAINED:         [YES - reproduced below | ITEMS DESCRIBED, NOT OBTAINED | NOT FOUND]
ITEM COUNT:             [total, and how many are fillers]
ITEMS:                  [exact wording in the published language; mark the language]
FACTORS:                [names, item counts per factor, reliability per factor]
MAINTAINING ITEMS:      [GBC-R: the exact items loading on that factor]
RESPONSE SCALE:         [option count + exact labels + numeric coding + range + direction]
RECALL WINDOW:          [the exact period respondents report on]
SHORT FORM:             [exists? length? citation? or "none located"]
LICENCE/COST:           [free | permission required | fee | unknown] + who holds the rights
APP USE PERMITTED:      [yes | no | not addressed] + the wording that says so
LANGUAGE OF SOURCE:     [and whether you read the full text or only an abstract]
SOURCE TYPE:            [PRIMARY peer-reviewed | thesis | test archive | SECONDARY ONLY - unverified]
CITATION:               [authors, year, full title, journal, volume(issue), pages]
PERSISTENT ID:          [DOI/PMID/archive number; "none" if genuinely absent]
DOI CHECK:              [state that you opened it and the returned title matched — or that it did not]
EXACT LOCATION:         [appendix/table/page]
VERBATIM QUOTE:         ["one sentence, copied exactly, not paraphrased"]
URL:                    [direct link to the document, not a search page]
CONFIDENCE:             [high | medium | low] + one line why
```

Then a short **VERDICT** section answering, in plain language:

1. Can I obtain the items? Yes or no.
2. Can I legally ship them in a free public app? Yes, no, or unclear.
3. Is there a maintaining subscale, and would an agricultural or manual worker score on it?
4. Is there a form short enough to ask five to eight items?

## Final self-check before you submit

- Did I open the actual source document, not a summary of it?
- **Did I open every DOI and confirm the returned title matches the claim?** State this per
  source.
- Did I keep the GBC and the LGS separate, and the GBC and the GBC-R separate, everywhere?
- Did I mark every item list as obtained-from-the-instrument versus described-in-a-summary?
- Did I avoid translating anything myself and presenting it as published wording?
- Did I report licence terms explicitly, including "not addressed" where that is the truth?
- Did I stay inside scope — no other instruments, and **no population norms for any country**?
- Would a reviewer with only my citation and location field find this exact item in under two
  minutes?

Close with an explicit **NOT FOUND list**: every question and sub-question where you searched and
found nothing, with one line on where you looked. A solid negative on Q1 or Q3 closes this round
cheaply and correctly, and that is a good outcome, not a failure.

---

## 4. My verification pipeline — not part of the prompt above

On receipt:

1. Resolve every DOI and PMID through the Crossref API and compare the returned title to the
   claim it is attached to.
2. Trace any item wording presented as published back to the document it is claimed to come
   from. Wording that cannot be traced is discarded, not softened.
3. Cross-check every claim against the existing round files before accepting it. The TMHI-15
   fabrication in round 7 was caught only because round 2 had already verified the real figures
   — prior rounds are the cheapest defence this project has.
4. Read licence claims from the rights-holder's own wording, not from a summary.
5. Adoption additionally requires a mutation-tested guard in `tests/` binding the shipped items
   to their citation, on the pattern of the CAF band tests added in v63.

---

# Outcome — 2026-08-15

**Verdict: adoption rejected. No code changed. The five app-authored `lfis` items stay exactly as
v64 left them, with their existing "measured, not ranked" disclosure.**

The export reached the same verdict I did, for one of the same reasons. Kill criterion 2 fired:
the GBC is 50 items with no validated short form, so it cannot be asked at onboarding, and a
subset chosen by us would make this project the source of the instrument. That is decisive on
its own and the licensing question never needed to be reached.

Source: `docs/research/.docx/Generative Behavior Checklist Assessment.docx`.

## What verified at source

Everything below was checked against the primary document, not against the export.

| Claim | Status |
|---|---|
| McAdams & de St. Aubin's taxonomy of generative action is **creating, maintaining, offering** | **VERIFIED** — this is the genuine 1992 model, and it is the one thing from this round worth keeping |
| GBC-R: N = 996 Japanese adults, three factors **offering / maintaining / creativity**, validated against the EPSI and the IPB, positive with Big Five extraversion and openness, negative with the BDI | **VERIFIED** verbatim from the J-Stage English abstract (this was already verified pre-brief) |
| Polish adaptation: Bandel, Soroko & Sękowski, *Psychologia Rozwojowa* 28(2), 63-79, `doi:10.4467/20843879PR.23.016.19853`, **N = 237, ages 19-93**, **CC BY 4.0** | **VERIFIED** via Crossref. One correction: Crossref dates it **2024**, not the 2023 in the export's citation line |
| Spanish study: Casado et al., *Revista de Enfermagem Referência* VI(3) e31274, `doi:10.12707/RVI23.64.31274`, **N = 141** LGBT+ adults 50+, GBC explained **41.76 %** of variance, GBC↔LGS **r_s = 0.310** | **VERIFIED** from the article's own abstract |
| GAS-C: Guo & Ngai 2021, `doi:10.3390/ijerph18189950`, **20 items, 5-point (1 = Almost none … 5 = Very often), two-month recall, four factors** (domestic 4, agentic 5, communal 6, civic 5), **N = 1,013**, α total **0.923**, subscales **0.897-0.953**, invariance across gender, age and hukou | **VERIFIED** from the PMC full text |
| No occupational DIF or IRT study exists for the GBC | **Reported NOT LOCATED**, and consistent with round 7's identical negative for disposition scales. Accepted as a negative |
| No Thai translation of the GBC or GBC-R | **Reported NOT LOCATED.** Accepted |

The GAS-C is correctly identified as an independent instrument rather than a GBC translation,
which is what the brief asked for, and it was correctly not pursued further.

## Defects found

Six. Two are fabrications of the same kind as rounds 6 and 7.

**1. The Spanish study's factor names are invented.** The export reports Factor 1 as
*"Collaboration, Care, and Donation" / Colaboración, Cuidado y Donación* and Factor 2 as
*"Civic and Community Involvement" / Participación Cívica y Comunitaria*. The paper's actual
factors are **"Volunteering and donate" (11 items, 32.26 % of variance)** and **"Collaboration
and care" (9 items, 9.41 %)**. There is no civic factor. The export's Factor 1 is the two real
factor names blended together, and its Factor 2 does not exist. The Spanish-language names it
supplies appear nowhere in the article — the words *Colaboración* and *Cívica* return zero hits
in the full text. The export invented a bilingual label pair for a factor that was never
extracted.

**2. The Spanish study did not use the 50-item pool.** The export's comparison table lists it as
"50 items (Full pool)". The paper states a GBC score range of **0 to 58**, which at the 0-2
response coding is **29 items**, and its two factors account for 20 of them. It is the Villar et
al. Spanish version, not the full instrument.

**3. The "maintaining" definition — the answer to this round's secondary question — is
unsourced.** The export states that Marushima and Arimitsu define maintaining as *"the sustained
preservation, upkeep, and continuity of community assets, physical surroundings, craft
traditions, and household life, rather than the bureaucratic maintenance of corporate boards,
public institutions, or executive hierarchies"*, and then maps ten original-GBC English item
numbers (19, 25, 29, 32, 35, 37, 40, 41, 42, 45) onto that factor.

Three things are wrong with this at once:

- The export's **own NOT FOUND register** says the raw 2007 Japanese item strings *"remain behind
  restricted journal print barriers"*. It cannot both lack the items and know which items load.
- The item mapping carries citation marker `1` — the **1992** paper. A 1992 paper cannot contain
  2007 factor loadings.
- The export's own comparison table gives the GBC-R's item count as a **"Reconstructed pool"**,
  which is what the abstract says: the scales were *reconstructed* from item analysis. Mapping a
  reconstructed Japanese pool onto original English item numbers is not possible from anything it
  located.

The J-Stage abstract, which I read in full, contains no definition of maintaining beyond the
factor's name. **The secondary question this round existed to answer is still open**, and it did
not fail for lack of an answer — it failed because the answer was manufactured.

**4. Every Cronbach's alpha in the document is an empty placeholder.** The numbers in the export
are LaTeX images rather than text. Recovering all 22 of them shows six rendered as a bare
`α =` or `α ≈` **with no value**. Two of those had a published value sitting in the abstract of
the paper being cited: the Spanish GBC is **0.879** and the GAS-C total is **0.923**. In the
plain-text reading the holes appear as *"high internal reliability ()"*, which scans as a value
rather than as a gap.

**5. The licensing position is overstated in a checkable direction.** The export says the GBC is
proprietary, that *"institutional researchers must execute signed copyright permission agreements
with the original authors"*, and that a *"validated scoring manual maintained by the Foley Center
for the Study of Lives"* supplies the filler designations. The rights-holder's own instruments
page says the opposite about what it distributes — **"Researchers are free to use any and all of
these instruments – no explicit permission is needed"** — and the GBC is **not among the ten
instruments listed there**; the LGS is. The Foley Center itself ran until 2019 and its successor
is the Study of Lives Research Group.

The accurate position is therefore **"not distributed by the rights-holder, terms unaddressed"**,
not "signed permission required". That is still not a licence to ship, so the conclusion holds,
but the reasoning as written is wrong and would not survive being checked.

**6. Item wording and the filler list come from a scale-aggregator, which the brief prohibited.**
The brief said in terms: *"Do not cite a review, blog, scale-database entry, secondary summary or
AI answer as the source of item wording."* Citation `1`, carrying the entire 50-item table, is
`db.arabpsychology.com`. Worse, that page **contradicts** the export: it designates no fillers at
all and states that researchers *"typically calculate a total score by summing the frequency
ratings … across all 50 items"*. The specific filler list (items 3, 4, 8, 14, 18, 22, 33, 39, 46,
47) is attributed to a doctoral dissertation on Academia.edu that I could not open. Treat both
the item text and the filler split as **unverified**.

## The finding worth keeping, which is about our items and not the GBC

The taxonomy is real and verified: generative action is **creating, maintaining, offering**.
Measured against it, the five `lfis` items at `surveys.js:240` sit like this:

| Item | Facet |
|---|---|
| 1. Learn or practise skills that will still matter in ten years | neither — self-directed preparation |
| 2. Do things intended to leave a positive legacy | creating |
| 3. Support or donate to causes for future generations | offering, and money-gated |
| 4. Plan finances with a 10-year-plus horizon | neither — and it double-counts Finance |
| 5. Teach or pass on skills and knowledge | offering |

**There is no maintaining item.** v64 removed the profession-specific *examples* from items 1 and
5, which was the right fix for the wording, but it did not change the shape of the set: two
offering items, one creating item, two planning items. The farmer who keeps land in good heart,
the cook who feeds a neighbourhood, the carer who holds a household together, the mechanic who
keeps things running rather than replaced — none of that is asked about anywhere in this app.
Your original objection was that the aspect rewarded a creator's idea of contributing to the
future. It still does, and now there is a published taxonomy that names exactly what is missing.

Two honest options, and the choice is a design decision rather than a research one:

- **Author a maintaining item ourselves.** All five items are already app-authored and disclosed
  as such, and the aspect is already unranked, so a sixth app-authored item adds no new
  unsourced claim — it is the same disclosure covering one more item. It would need the same
  treatment as v64: FREQ_5, an explicit comment, i18n lockstep, and a stored-sum migration,
  because adding an item changes the `lfis` range from 20 to 25 and every saved sum with it.
  That migration is the real cost, not the item.
- **Leave it and record the gap.** Defensible, since the aspect is unranked and the methodology
  page already says the items are ours.

I have not done either. It changes what the app measures, so it is yours to call.

## What this round cost and what the shape is worth

The narrow shape held up. Scope was respected — no other instruments, and no population statistic
for any country, which was the surface both round-7 fabrications appeared on. The verdict came
back as a decision rather than a reading list, and the kill criteria written up front are what
made it cheap to accept. The two fabrications that did occur (defects 1 and 3) were both in
answer to the *secondary* question, where the export had nothing and would not say so — even
though the brief told it plainly that NOT FOUND was a successful result.

Six rounds have now produced a fabricated positive whenever a question had no published answer.
The countermeasure that works is not a better prompt. It is that every load-bearing claim gets
opened at its source before it touches the code, and that prior rounds stay in the repository to
contradict the next one.
