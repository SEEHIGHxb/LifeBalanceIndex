# Round 2 — findings: does the TMHI-15 have a published Thai mean and SD?

**Status:** verified 2026-07-30 against primary sources. Answers the brief in
[round-2-tmhi15-norm.md](round-2-tmhi15-norm.md).

**Verdict on the primary question: NO.** No published source reports a mean *and* standard
deviation of the TMHI-15 total for a **nationally representative** Thai general-adult sample.

**Verdict on the secondary question: YES, with a caveat that blocks direct use.** Band
proportions for a representative national sample *are* published (NSO 2020), but on the NSO's
own cut-offs, not the DMH ≤43 / 44–50 / ≥51 bands.

Per §6 of the brief: **no code change follows.** WHO-5 keeps its named representative German
norm. The mental aspect uses WHO-5 + ST-5, so nothing here is a norm swap — using it would be an
instrument swap. See "What adoption would cost" below.

---

## 1. VERIFIED — the 2001 DMH norm table (regional, not national)

This is the first genuine normative finding in three rounds. Table 2 of the original TMHI
development paper is titled, by its own authors, a norm table.

```
Source: อภิชัย มงคล, วัชนี หัตถพนม, ภัสรา เชษฐ์โชติศักดิ์, วรรณประภา ชลอกุล, ละเอียด ปัญโญใหญ่,
        สุจริต สุวรรณชีพ. การศึกษาดัชนีชี้วัดสุขภาพจิตคนไทย (The Study of Thai Mental Health
        Indicators). Journal of the Psychiatric Association of Thailand, 46(3),
        July–September 2001. ISSN 0125-6985. Khon Kaen Psychiatric Hospital +
        Department of Mental Health.
URL: https://www.psychiatry.or.th/JOURNAL/463/v4635.htm
Instrument: TMHI-15, raw range 0–45  (NOT the 15–60 scale our bands use — see §3)
What it reports: mean AND SD, plus median, quartiles, range
Exact table: ตารางที่ 2
Sample: N = 1,429; 19 provinces of NORTHEASTERN Thailand; multi-stage sampling; data 2000–2001
Sample type: REPRESENTATIVE — but of one region only, not the nation
```

Table 2, verbatim from the source:

```
ตารางที่ 2 การวิเคราะห์ค่าปกติ หรือเกณฑ์มาตรฐาน (norm) ของดัชนีชี้วัดสุขภาพจิตคนไทย (TMHI)
ฉบับ 66 ข้อ และ 15 ข้อ (n = 1,429)
ค่าสถิติต่าง ๆ      TMHI-66   TMHI-15
Mean                 131.29     29.71
Standard deviation    16.21      4.10
Median                  132        30
25 th percentile        122        27
75 th percentile        142        32
Maximum                 196        45
Minimum                  76        14
Potential range       0-198      0-45
Obtained range       76-196     14-45
```

Recruitment, verbatim (Thai body + English abstract):

> ประชากรใน 19 จังหวัดภาคตะวันออกเฉียงเหนือ … รวมจำนวน 1,429 คน

> the data were collected from samples living in metropolitan government level, city government
> level and district government levels (Or-bor-tor level 1 to level 5) of the north eastern
> Thailand. The sample size was 1,429 people. Multi-stage sampling technique was used.

Also in the article: kappa between TMHI-66 and TMHI-15 = 0.61 (95% CI 0.57–0.64). The appendix
prints the **66-item** instrument (ภาคผนวก ดัชนีชี้วัดความสุขคนไทยฉบับสมบูรณ์ (THI – 66)) with
4-point anchors ไม่เลย / เล็กน้อย / มาก / มากที่สุด — the 15 items are not separately listed there.

**Why this does not become a norm in the app:** the sample is one region, the data are 25 years
old, and the score scale is 0–45 (items 0–3), not the 15–60 of the 2007 revision whose bands are
already documented in the brief.

## 2. VERIFIED — NSO 2020 national mean and band proportions

```
Source: National Statistical Office (Thailand), 2020 mental-health survey report
URL: https://www.nso.go.th/nsoweb/storage/survey_detail/2023/20230505104130_19919.pdf
Instrument: TMHI-15, 15 items scored 0–3, total 0–45 (confirmed in the methodology section)
What it reports: mean (no SD) AND band proportions, broken down by region, sex and age band
NSO's own cut-offs: 0.00–27.00 / 27.01–34.00 / 34.01–45.00
Sample type: REPRESENTATIVE (national household survey)
```

| Breakdown | Mean | ≤27.00 % | 27.01–34.00 % | ≥34.01 % |
|---|---|---|---|---|
| **National** | **33.53** | **11.1** | **50.5** | **38.4** |
| North | 34.36 | 8.6 | 44.7 | 46.7 |
| Northeast | 33.88 | 11.0 | 47.2 | 41.8 |
| South | 34.18 | 8.2 | 47.3 | 44.4 |
| Central | 33.17 | 12.8 | 50.3 | 36.9 |
| Bangkok | 33.82 | 10.3 | 48.3 | 41.4 |
| Male | 33.80 | 10.1 | 49.3 | 40.6 |
| Female | 33.27 | 12.7 | 49.1 | 38.2 |
| Age 15–24 | 33.21 | 11.9 | 51.9 | 36.2 |
| Age 25–59 | 33.43 | 11.7 | 49.6 | 38.6 |
| Age 60+ | 33.76 | 11.0 | 47.9 | 41.1 |

**No SD is published**, so this cannot yield a z-score percentile. What it *is*, however, is a
3-point national CDF on 0–45 — P(≤27.00) = 11.1 %, P(≤34.00) = 61.6 %, P(≤45) = 100 % — with age
strata. That is precisely the shape the secondary question was written to catch, and the
UNRANKED-with-bands treatment shipped in v39 can already express it.

**The blocker:** these are the NSO's cut-offs, not the DMH's. The DMH bands ≤43 / 44–50 / ≥51 on
15–60 convert to **≤28 / 29–35 / ≥36** on 0–45. 27.00 and 34.00 are close to but not equal to
28 and 35, and the NSO does not publish enough of the distribution to re-cut it. They cannot be
mapped onto our bands without inventing the interpolation.

## 3. Errors found in the Round 2 research output

The deep-research document got two headline numbers right (§1 and §2 above) and no longer cites
its own prior drafts — a real improvement over Round 1. These did not survive verification:

| Claim in the document | Verified reality |
|---|---|
| Thai Cohort Study: mean **31.00**, SD **4.70** | Source (PMC3538273) says **32.3 / 5.0**. N = 60,569 is correct; the mean and SD are not. |
| That row attributed to "Mongkol et al. (2007)" and labelled "Nationwide Adult Cohort" | Cite [15] is a different author team; the sample is self-selected distance-learning students at Sukhothai Thammathirat Open University (enrolled 2005, follow-up 2009) — a `STUDENT` sample, breaking rule 7. |
| NSO means presented on the **15–60** scale | The NSO scores 0–45. Self-refuting: 33.80 on 15–60 sits deep inside the ≤43 "below general people" band, while the same document claims only 17.4 % are in it. |
| Band mapping ≤43 ↔ <28, 44–50 ↔ 28–34, ≥51 ↔ >34 | Contradicts the document's own +15 conversion rule, which gives ≤28 / 29–35 / ≥36. The 27/34 boundaries are the NSO's own cut-offs, relabelled as converted DMH bands. |
| Band proportions **17.4 / 54.3 / 28.3** attributed to the Mahidol IPSR monograph | **UNVERIFIED.** The IPSR host returns 403 to every route tried (curl plain, curl + UA, curl + UA + Referer, WebFetch). It also disagrees with the NSO 2020 national figures that *were* verified. Tied to the mismapped cut-offs above; treat as not established. |

Exact quote from the Thai Cohort source, for the record:

> Overall the average score out of a maximum score of 45 was 32.3 (standard deviation 5.0)

### Extraction note for future rounds

This `.docx` was a Google Docs export in which **every numeral is a PNG image** (69 unique
images, 111 embeds — Docs exports equations as pictures). Plain text extraction silently drops
all of them and still reads fluently: "Mean Total Score (): 5." Any future round must map
`r:embed` ids to `word/media/*` and read the images before trusting a text dump.

## 4. Conclusion and decision

Three rounds have now asked this from three directions and converged on the same answer. The
only real mean-and-SD is regional and 25 years old; the only national mean has no SD. Pairing
the 2020 national mean with the 2001 northeastern SD would manufacture a distribution across 19
years and one region — the same move refused for the BOT norm in Round 1, and less defensible
here. **Stop researching.**

**Decision: no code change.** v39 already states that no representative Thai general-adult norm
is published for the mental aspect, and that remains true.

### What adoption would cost, if it is ever revisited

Recorded so this is a decision and not an oversight. Per §6 of the brief, replacing an
instrument is far more expensive than replacing a norm:

- new items in `surveys.js` (and the 15 Thai item texts, which are **not** published in the 2001
  appendix — that prints the 66-item form)
- Thai strings in `th.js`
- a normalizer in `scoring.js`
- `DEEP_CARRY` updates
- a migration for stored `baseline` sums, which are raw totals on the WHO-5 + ST-5 scale
- licensing clarity from the Department of Mental Health for non-commercial web use

A norm swap, by contrast, touches `benchmarks.js` only. The NSO 2020 CDF is a genuinely usable
anchor — but only *after* an instrument swap, and only if the ≤27/≤34 cut-offs are used as-is
rather than pretending they are the DMH bands.
