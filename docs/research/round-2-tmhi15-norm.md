# Round 2 — Does the TMHI-15 have a published Thai mean and SD?

**Status:** drafted 2026-07-29, after rounds 0 and 1 both returned "no representative Thai
norm exists" and round 1's own output failed verification.

**Why this round is narrow.** Rounds 0 and 1 each asked a broad question across twelve
instruments and eight constructs. Both produced long documents in which the genuine findings
were buried among fabricated ones, and verifying each claim at its primary source cost more
than the surviving findings were worth. Round 1 additionally cited *its own previous draft* as
a source, so round 0's errors were laundered into round 1 as established fact.

This round asks **one question about one instrument**. If the answer is no, we stop
researching and keep the current design.

**How to use this file:** paste sections 1–5 into the deep-research tool. Section 6 is my
verification pipeline and does not need to be sent.

> **Attach nothing.** Do not supply the round 0 or round 1 documents, or any previous output,
> as an input or a source. That is what created the self-citation loop.

---

## 1. The question

The **Thai Mental Health Indicator, 15-item short form (TMHI-15 / ดัชนีชี้วัดสุขภาพจิตคนไทย
ฉบับสั้น 15 ข้อ)**, developed by the Department of Mental Health, raw score range 15–60.

> **Primary question:** Has any published source reported a **mean and standard deviation**
> of the TMHI-15 total score for a Thai **general-adult, community, non-clinical** sample?
>
> **Secondary question (answer this even if the primary answer is no):** Has any published
> source reported **what proportion of a representative Thai sample falls into each of the
> three interpretation bands** (≤43, 44–50, ≥51)?

The secondary question matters as much as the first. Three band proportions from a
representative sample would let us anchor a coarse but *honest* comparison, without a mean or
an SD. A mean without an SD is not usable. An SD without a mean is not usable.

## 2. What is already verified — do not re-research this

I have confirmed the following **at the primary source**. Do not spend effort re-deriving it,
and do not contradict it without producing the page that contradicts it.

| Fact | Status |
|---|---|
| Mongkol, A., Vongpiromsan, Y., Tangseree, T., Huttapanom, W., Romsai, P., & Chutha, W. (2009). The Development and Testing of Thai Mental Health Indicator Version 2007. *Journal of the Psychiatric Association of Thailand*, 54(3), 299–316 | exists, verified |
| N = 3,184 | verified in the article |
| Multi-stage cluster random sampling, 13 provinces across all 5 regions of Thailand, data collected 2007 | verified in the article |
| TMHI-15 interpretation bands on raw 15–60: **≥51** better than general people, **44–50** same as general people, **≤43** below general people | verified in the article |
| The long form uses different bands (179–220 / 158–178 / ≤157) — do not confuse the two | verified in the article |
| A **mean and SD of the TMHI-15 total** does **not** appear in the text of this article that I was able to extract | searched, not found |

That last row is the gap. A previous research round claimed "Mean 45.75, SD 5.60, page
305–308, Tables 2 and 4" for this article. **That number was not found in the article and
should be treated as false unless you can show it on the page.** If you report a mean for this
article, you must quote the surrounding line.

## 3. Where to look

In rough order of likely payoff:

1. **The Department of Mental Health's own TMHI manual / คู่มือ** — the band cut-offs came from
   somewhere, and the document that defines them may also publish the distribution.
2. **DMH national mental-health survey reports** (การสำรวจสุขภาพจิตคนไทย / รายงานประจำปี
   กรมสุขภาพจิต). Thailand runs recurring national mental-health surveys; annual or biennial
   reports may publish TMHI means by year, region, sex or age band.
3. **National Statistical Office (NSO)** — the NSO has fielded mental-health questions in
   household surveys; check whether TMHI items were used and whether means were published.
4. **National Health Examination Survey (NHES)**, Thai editions.
5. **ThaiJo / TCI-indexed Thai journals** (he01.tci-thaijo.org and related). Many Thai studies
   use the TMHI-15 and report their own sample's mean ± SD. These are *secondary* — see the
   rule in §4 about them.
6. **Thai university theses** (Chulalongkorn, Mahidol, Chiang Mai digital collections), which
   often reproduce normative tables in their literature reviews with a citation to the original.

## 4. Rules

These exist because previous rounds broke each of them.

1. **Do not cite any previous research document, draft, or prior answer of your own.** Every
   number must trace to an independently locatable publication.
2. **State the sample's country explicitly for every number.** Round 0 returned a study of head
   nurses in **Yunnan, China** as a Thai norm. Round 1 repeated it with "Country of sample:
   Thailand" written on top. Stating a country is not the same as checking one.
3. **Do not invent bibliographic detail.** If you cannot find an author, journal, page, DOI or
   year, write `NOT REPORTED`. Never fill the field with something plausible. A previous round
   invented an author surname, a journal title and a page range for a real article.
4. **Never reuse a sample size, mean, SD or demographic across two entries.** Round 1 gave a
   1997 study the same N=3,184 as the 2007 study above. If two entries share a statistic,
   assume you have made a copying error and re-check both.
5. **The number and its citation must come from the same document.** Round 1 attributed 2019
   Bangkok office-worker figures to a 1997 national cohort. Quote the table or line the number
   sits on.
6. **Do not transfer a statistic between the 15-item and the long form.** They have different
   score ranges and different bands.
7. **A convenience sample is not a representative one.** Label honestly: `REPRESENTATIVE`
   (probability sample of the general population), `COMMUNITY-CONVENIENCE`, `OCCUPATIONAL`,
   `STUDENT`, `CLINICAL`, `ELDERLY`. A mislabel is worse than a missing answer.
8. **Secondary studies:** a Thai study that merely *uses* the TMHI-15 and reports its own
   sample mean is useful **only** if its sample is a general-adult community sample. Report the
   sample description verbatim so I can judge it. Do not present a study's own sample mean as
   a national norm.

## 5. Output format

Answer the primary question first, in one line: **YES** or **NO**. Then the secondary question,
in one line: **YES** or **NO**. Then, for each candidate source found:

```
Source: full citation (authors, year, title, journal, volume(issue), pages, DOI/PMID or NOT REPORTED)
URL:
Instrument and version: TMHI-15 (raw 15-60) / long form / other — state which
What it reports: mean ___ SD ___  OR  band proportions ___% / ___% / ___%  OR  neither
Exact table or page:
Quote the line the number appears on:
Sample: N ___ , age range ___ , sex split ___ , country ___
Sample type: REPRESENTATIVE / COMMUNITY-CONVENIENCE / OCCUPATIONAL / STUDENT / CLINICAL / ELDERLY
Recruitment, verbatim from the paper:
Year of data collection:
```

If the answer to both questions is NO, say so plainly and list what you checked. **A
well-evidenced NO is a successful result for this round** and is more useful than a maybe.

### Also worth reporting, briefly

If a usable norm does exist, adoption becomes possible, and these decide whether it is
practical:

- The **15 item texts in Thai**, and where they are published.
- **Licensing** — is the TMHI-15 free to use in a non-commercial public web app? Who holds it?
- The **response scale and scoring direction** (are any items reverse-scored?).

Do not research these unless the answer to §1 is yes for at least one source.

---

## 6. My verification pipeline (not for the research tool)

1. Locate the cited document independently; do not trust the supplied URL.
2. Confirm the quoted line actually appears on the stated page.
3. Confirm the sample's country, age range and recruitment **from the source**, never from the
   report's summary of it.
4. Confirm the statistic belongs to the 15-item form, not the long form.
5. If a mean and SD survive all four: mental gains a real Thai percentile, and the reference
   person in `averages.js` gets a real anchor for that aspect.
6. If only band proportions survive: mental gains a Thai *grade* with no percentile — the
   unranked-with-bands treatment, which the UI shipped in v39 can already express.
7. If nothing survives: no code change. WHO-5 keeps its representative German norm with the
   population named, which is the honest arrangement already in place.

**Note on adoption cost.** Replacing an instrument is far more expensive than replacing a norm:
new items in `surveys.js`, Thai text in `th.js`, a normalizer in `scoring.js`, `DEEP_CARRY`
updates, and a migration for stored `baseline` sums, which are raw totals on the old scale.
A norm swap touches `benchmarks.js` only. Do not adopt TMHI-15 for its bands alone without
weighing that.
