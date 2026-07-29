# Round 1 — Which instruments have *representative Thai* norms?

**Why this round exists.** Round 0 asked, for each instrument we already use: "does a Thai
norm exist?" The answer came back essentially uniform — **no representative Thai general-adult
community norm exists for any of the twelve instruments.** Every usable number was a proxy:
hospital outpatients, university students, head nurses, or older adults.

That answer means the question was the wrong way round. Round 1 flips it:

> **Not** "does instrument X have a Thai norm?"
> **But** "which validated Thai instruments have a published *representative Thai* norm — and
> what do they measure?"

We will choose instruments to fit the norms that actually exist, rather than keep hunting for
norms to fit instruments chosen from Western literature.

**How to use this file:** paste sections 1–6 into a deep-research tool. Section 7 is my own
verification pipeline — it does not need to be sent.

---

## 1. Context

I maintain a bilingual (English/Thai) self-assessment web app for **Thai adults, general
community population, roughly ages 18–60, non-clinical**. It is not a diagnostic tool.

The app scores eight life aspects and converts each to a **population percentile**, which
requires a published **mean and standard deviation** from a sample that resembles the user.
A cut-off band is a weaker but still usable substitute; a mean without an SD is not usable for
percentiles at all.

**Already established in round 0 — do not re-research these:**

| Instrument | Thai validation | Thai norm | Status |
|---|---|---|---|
| WHO-5 | YES — Saipanish et al. 2009 | primary-care outpatients, mean 14.32 / SD 5.26 (0–25) | verified at source ✓ |
| PSS-10 | YES — Wongpakaran & Wongpakaran 2010 | medical students, mean 13.53 / SD 4.56 (0–40) | verified at source ✓ |
| RSES | YES — Wongpakaran & Wongpakaran 2012 (RSES-TR) | university students, mean 26.85 / SD 3.92 (10–40) | plausible, unverified |
| ST-5 | YES — Silpakit 2008, DMH | DMH cut-off bands only; no national mean/SD | bands confirmed |
| GSE | YES — Sukmak et al. 2002 | **none** (the round-0 "norm" was a Chinese sample) | no Thai norm |
| UCLA-3, LSNS-6, Grit-S, CFPB, JSS-4, CFC-12, RAS | NO | NO | — |

---

## 2. The question

For each of the eight constructs in section 4, identify **every instrument** that satisfies
**all three** of the following:

1. It has a **peer-reviewed Thai-language version** (or was authored in Thai).
2. It has a **published mean and SD from a Thai sample that is representative or
   population-based** — a national survey, a provincial or multi-province probability sample,
   a Department of Mental Health normative study, or a large community cohort.
3. The sample includes **working-age adults** (any span inside roughly 18–60 — it does not
   have to cover the whole range, but state exactly what it covers).

Rank the candidates you find per construct. If nothing meets all three, say so plainly and
give the best partial match with its exact shortfall.

---

## 3. Specific leads to check first

These are Thai-origin or Thai-normed instruments I believe may have national reference data.
**Confirm or refute each one** — a confirmed "no national norm published" is a useful result.

- **TMHI-15 / TMHI-55 — Thai Mental Health Indicator** (ดัชนีชี้วัดสุขภาพจิตคนไทย), Dept. of
  Mental Health. Was it normed on a national sample? Is a **mean and SD** published, or only
  the "lower than / equal to / higher than general population" bands? Give the source document.
- **WHOQOL-BREF-THAI** (Mahidol / DMH). Four domains — physical, psychological, social
  relationships, environment. Are Thai reference statistics published per domain, and from
  what sample? This one matters most: four domains would map onto four of our aspects at once.
- **Thai Happiness / wellbeing items in the National Statistical Office surveys** — the NSO
  Mental Health Survey and the Household Socio-Economic Survey. Do any publish a scored
  instrument with a distribution, rather than single-question percentages?
- **PSQI-Thai** and **AIS-Thai** (sleep) — is there a Thai *community adult* mean and SD, or
  only clinical/elderly samples and cut-off prevalences?
- **RULS-6** (Wongpakaran, Rasch-validated Thai loneliness) — is there any Thai norm from a
  **working-age** sample, or only the older-adult studies?
- **MSPSS-Thai / rMSPSS** (perceived social support) — Thai adult community mean and SD?
- **DASS-21 Thai**, **GHQ-12 Thai**, **WEMWBS Thai** — any Thai population norms?
- **Bank of Thailand financial-literacy / financial-wellbeing survey** — the national reports
  publish mean percentage scores. Is a **standard deviation or a score distribution** published
  anywhere (full report, appendix tables, OECD/INFE cross-country annex)? Without an SD we
  cannot compute a percentile.
- **National Health Examination Survey (NHES) Thailand** — beyond BMI, does it publish
  distributions for physical activity, sleep duration, or any scored psychological measure?

---

## 4. The eight constructs, and what the app currently uses

| Aspect | What it should capture | Instrument in the app today | Round-0 verdict |
|---|---|---|---|
| **Mental** | stress + general wellbeing | ST-5 (0–15) + WHO-5 (0–25) | Thai text good; no representative norm |
| **Relationships** | loneliness, social network, partner satisfaction | UCLA-3 (3–9), LSNS-6 (0–30), RAS (3–15) | no Thai version at all |
| **Physical** | sleep quality, activity, BMI | JSS-4 (0–20) + IPAQ items + BMI | JSS-4 has no norm anywhere |
| **Finance** | subjective financial wellbeing | CFPB 5-item (scored 19–82) | US IRT tables, no Thai norm |
| **Personal goals** | self-efficacy, perseverance, learning | GSE-6 (6–24), Grit 4-item (4–20) | Thai GSE text exists; no norm |
| **Social contribution** | donating, volunteering, helping | app-authored items | no instrument; uses CAF World Giving Index rates |
| **Environment** | pro-environmental behaviour | app-authored items | no instrument; uses Thai plastic-use statistic |
| **Humanity's future** | long-term orientation | CFC-12 (12–60) + app-authored items | no Thai version |

For each construct, prioritise finding **one** instrument that satisfies all three criteria in
section 2, even if it is shorter or less well known internationally than what we use now. A
short instrument with a real Thai norm beats a famous instrument with none.

**Length constraint:** the onboarding form must stay usable. Prefer instruments of **10 items
or fewer**; note the item count for every candidate. If the only normed option is long (e.g.
19-item PSQI), say whether a validated **short form** exists and whether the norm applies to it.

---

## 5. Rules — read before answering

1. **Every numeric claim needs a primary source**: DOI or PMID (or the ministry document's
   title and year), **plus the exact table or page the number came from.** A number without a
   table or page reference will be discarded.
2. **State the sample's country explicitly for every number.** Round 0 returned a study of
   head nurses in **Yunnan, China** presented as a Thai norm. A study published in a Thai
   journal, or by Thai co-authors, is not a Thai sample.
3. **Do not invent bibliographic detail.** Round 0 returned an author name and journal title
   that do not exist for the article cited, and reported a mean age the source never states.
   If the source does not report a figure, write `NOT REPORTED` — never fill the field.
4. **Never infer, interpolate or convert a norm** across instruments or versions. If a norm
   exists for the 10-item version, it does not transfer to the 6-item version.
5. **Mean and SD both, or say so.** A mean alone cannot produce a percentile. Flag any source
   that publishes only a mean.
6. **Distinguish a population mean from a clinical cut-off** — we need the mean and SD;
   cut-offs are a secondary, separate answer.
7. **Label every proxy** and state exactly how it differs from Thai working-age community
   adults (country / age / recruitment / clinical status).
8. Thai-language sources, TCI-indexed journals, and DMH/NSO/NHES publications are welcome and
   often better than international literature here. Give the Thai citation plus an English
   gloss.
9. If sources disagree, report all of them with their samples. Do not choose.

---

## 6. Required output format

Organise by **construct**, not by instrument. For each of the eight constructs:

```
## <Construct>

### Candidate 1: <instrument name> (<item count> items, raw range ___)
- Thai version: YES / NO — citation, DOI/PMID, α
- Thai norm: REPRESENTATIVE / COMMUNITY-CONVENIENCE / STUDENT / CLINICAL / ELDERLY / NONE
- Country of sample: (must be stated)
- Mean: ___  SD: ___  (on which raw scale: ___)
- N: ___  Age range: ___ (as reported — NOT REPORTED if absent)  Sex split: ___
- Recruitment: ___   Year of data collection: ___
- Source: <full citation>   DOI/PMID: ___
- **Exact table or page:** ___
- Item count ≤ 10: YES / NO
- Rights: public domain / free for research / permission required (holder) / proprietary
- Thai item wording available at: ___

### Candidate 2: ...

### Recommendation for this construct
One paragraph: which candidate is best and why, or "no candidate meets all three criteria —
best available is ___, which falls short on ___."
```

End with a table: construct × chosen instrument × norm quality × item count × whether it
replaces what we use today.

---

## 7. What happens to these results (internal — not part of the research prompt)

1. Verify every mean/SD at the cited table or page before it enters `benchmarks.js`.
2. Confirm the sample's country and age range at source, not from the report.
3. Check the response scale against our stored raw range — a scale change is a schema
   migration of stored `baseline` sums, not a norms edit.
4. Instrument replacements are a bigger change than norm replacements: new items in
   `surveys.js`, new Thai text in `th.js`, new normalizer in `scoring.js`, migration for
   existing users' stored sums, and updates to `DEEP_CARRY` where the instrument is carried.
5. Where no norm survives, the aspect stops claiming a percentile and states its cited band or
   raw score instead — an honest "we cannot rank this against Thai adults" is a shippable
   result, not a failure.
