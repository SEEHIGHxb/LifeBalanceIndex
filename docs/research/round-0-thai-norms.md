# Round 0 — Thai norms and official Thai translations

**Purpose:** every percentile, letter grade and the Balance Index in Life Balance Index is
computed by comparing a user's instrument score against a published population mean and SD.
Most of those reference values currently come from foreign samples, and two come from
*elderly* samples. This round establishes, per instrument, whether a Thai-validated version
and a Thai general-adult norm exist.

**How to use this file:** paste sections 1–5 into a deep-research tool. Paste section 6 back
here with the results. Do not edit the code from the results directly — every number is
verified against its primary source before it enters `benchmarks.js`.

---

## 1. Context for the researcher

I maintain a self-assessment web app that scores eight life aspects for **Thai adults,
general community population, roughly ages 18–60, non-clinical**. It is not a diagnostic
tool. Each aspect score combines published psychometric instruments with self-reported
facts, and each aspect is then converted to a population percentile by comparing the user's
instrument score against a published mean and standard deviation.

The app is bilingual (English / Thai). The Thai item wording currently in the app is **our
own translation**, not an officially validated Thai adaptation. This matters: comparing a
self-translated instrument against norms collected with a validated translation is not a
valid comparison.

I need to fix two things, per instrument:

- **(A) Translation validity** — does an officially validated Thai-language version exist?
- **(B) Norm validity** — is there a published Thai (or, failing that, Southeast Asian)
  **general-adult community** norm: mean, SD, sample size, age range, and internal
  consistency?

---

## 2. What I need for each instrument

For every instrument in section 4, answer both questions:

**(A) Validated Thai version**
- Does a peer-reviewed Thai translation/validation exist? Full citation.
- Who published it, what year, what sample.
- Reported reliability (Cronbach's α, and test–retest if available).
- **Does the Thai version keep the same item count and the same response scale as the
  original?** If it changed either, say so explicitly and give both. This is critical — our
  stored user data uses the raw ranges in section 4, so a changed scale means a data
  migration, not just a text swap.
- Is the Thai item wording freely usable (public domain / CC / permission required /
  proprietary)? Name the rights holder if permission is needed.

**(B) Thai general-adult norm**
- Mean and SD on the instrument's own raw scale (state the scale).
- N, age range, sex distribution, recruitment (community? students? patients? online panel?).
- Year of data collection.
- Whether the sample is representative or convenience.

---

## 3. Rules — read before answering

1. **Every numeric claim must carry a primary source**: DOI or PubMed ID, **plus the exact
   table or page number the number came from.** A citation without a table/page reference
   will be treated as unverified and discarded.
2. **Never infer or interpolate a norm.** If no Thai norm exists for an instrument, write
   `NOT FOUND` for part B. That is a useful, actionable answer.
3. If only a **proxy** is available (another SE Asian country, a Thai clinical sample, a
   Thai student sample), report it but **label it clearly as a proxy** and state exactly how
   it differs from the target population.
4. **Always state the sample's age range and recruitment setting.** A norm from a clinical
   or elderly sample is not interchangeable with a community adult norm — that mismatch is
   the specific defect this round exists to fix.
5. Thai-language journals (including TCI-indexed) are acceptable and often preferable. Give
   the Thai citation and an English gloss of the title.
6. Prefer peer-reviewed sources. Government/ministry publications are acceptable if they
   publish the actual statistics. Blog posts, scale-vendor marketing pages and secondary
   summaries are not acceptable as the source of a number.
7. If sources disagree, report **all** values with their samples rather than picking one.
8. Distinguish clearly between a **population mean** and a **clinical cut-off**. We need the
   mean and SD; cut-offs are a separate, secondary question.

---

## 4. The instruments, with the values currently in the code

Twelve instruments. The "current benchmark" column is what the app compares users against
**today** — this is what I am trying to replace or confirm.

### Priority 1 — known wrong population

| Instrument | As used in app | Raw range | Current benchmark in code | Problem |
|---|---|---|---|---|
| **UCLA-3 Loneliness** (Hughes et al. 2004) | 3 items, 3-point scale (1 = Hardly ever, 2 = Some of the time, 3 = Often) | 3–9 | mean **3.89**, SD **1.34** — US Health and Retirement Study | HRS sample is **ages 57–85**. Our users are working-age. |
| **LSNS-6** (Lubben et al. 2006) | 6 items, 6-point count scale (0 = None … 5 = Nine or more) | 0–30 | mean **17.0**, SD **5.5** — three European community samples; isolation cut-off < 12 | LSNS-R was designed for **older adults (65+)**, and the norm is European. |

For these two, additionally answer: **is this even the right instrument for working-age
adults?** If a better-validated alternative exists for general adults (e.g. De Jong Gierveld
Loneliness Scale, or another social-network measure with Thai adult norms), report it with
its Thai validation status and norms.

### Priority 2 — foreign norm, right age band

| Instrument | As used in app | Raw range | Current benchmark in code |
|---|---|---|---|
| **WHO-5 Well-Being Index** | 5 items, 6-point (0 = At no time … 5 = All of the time); raw × 4 → 0–100 | 0–25 | mean **67.6**, SD **23.0** on the 0–100 scale — representative **German** sample, 2025 |
| **GSE** (Schwarzer & Jerusalem) | GSE-6 at onboarding, GSE-10 in the deep form; 4-point (1 = Not at all true … 4 = Exactly true) | 6–24 / 10–40 | mean **29.55**/40, SD **5.32** (≈ **2.96 per item**) — 25-country pooled sample, N = 19,120 |
| **Grit-S** (Duckworth & Quinn 2009) | onboarding uses the **4 perseverance-facet items only**, 5-point; Grit-12 in the deep form | 4–20 / 12–60 | adult reference point **≈ 3.4 / 5** — US |
| **CFPB Financial Well-Being** | 5-item self-administered at onboarding, 10-item in the deep form; official IRT conversion tables, age-banded (18–61 / 62+) | scored 19–82 / 20–90 | US distribution, "centred near the US mean of ~50" |

For CFPB additionally: does **any** Thai financial well-being distribution exist (Bank of
Thailand, NSO, OECD/INFE financial-literacy survey, or a published Thai CFPB adaptation)?
If the CFPB scale itself has no Thai norm, what is the best-documented Thai measure of
financial well-being, and does it publish a distribution?

### Priority 3 — no norm cited at all

| Instrument | As used in app | Raw range | Current benchmark in code |
|---|---|---|---|
| **Jenkins Sleep Scale (JSS-4)** | 4 items, 6-point frequency (0 = Not at all … 5 = 22–31 days) | 0–20 | **none — no population mean is cited anywhere in the app** |

Question: is there **any** published general-adult mean and SD for JSS-4, Thai or otherwise?
If not, name the best-normed short sleep-quality instrument that does have Thai adult norms.

### Priority 4 — already Thai, confirm only

| Instrument | As used in app | Raw range | Current benchmark in code |
|---|---|---|---|
| **ST-5 (Srithanya Stress Test)** | 5 items, 4-point (0 = Rarely/Not at all … 3 = Regularly) | 0–15 | Thai Dept. of Mental Health bands: ≤ 4 no problem, 5–7 watch, 8–9 problem, 10+ severe |

Questions: are those cut-offs still the **current** DMH guidance? And is there a published
**population mean and SD** for ST-5 in Thai adults (we currently have bands but no mean, so
we cannot compute a proper percentile for the stress half of the Mental aspect).

### Priority 5 — deep-assessment instruments

These are optional long-form scales taken after onboarding. Same two questions (A and B).

| Instrument | As used in app | Raw range |
|---|---|---|
| **PSS-10** (Cohen et al. 1983) | 10 items, 5-point, 4 items reverse-keyed | 0–40 |
| **RSES** (Rosenberg Self-Esteem) | 10 items, 4-point agree scale | 10–40 |
| **CFC-12** (Strathman et al. 1994) | 12 items, 5-point; 7 items reverse-keyed | 12–60 |
| **RAS** (Hendrick 1988) | 3 items at onboarding, full 7-item in the deep form, 5-point | 3–15 / 7–35 |

Note: PSS-10 and RSES are known to have Thai validations — I need the **specific** citation,
the α, and whether a **community adult** norm (not student, not clinical) exists.

---

## 5. Required output format

Answer with **one block per instrument**, in this exact shape. Empty fields are fine; guessed
fields are not.

```
### <Instrument name>

**A. Thai validation**
- Exists: YES / NO / PARTIAL
- Citation:
- DOI / PMID:
- Sample: N=, age range, setting (community/student/clinical), year
- Cronbach's α:
- Item count same as original: YES / NO (if NO, describe the difference)
- Response scale same as original: YES / NO (if NO, give both scales)
- Rights: public domain / permission required (holder) / proprietary
- Thai item wording available at:

**B. Thai general-adult norm**
- Exists: YES / NO / PROXY ONLY
- Mean: ___ (on which raw scale: ___)
- SD: ___
- N: ___   Age range: ___   Sex split: ___
- Recruitment: representative / convenience / online panel / clinical
- Year of data collection:
- Source: <full citation>
- DOI / PMID:
- **Exact table or page the mean and SD were read from:**
- Notes / caveats:
```

End the report with a summary table: instrument × (Thai version YES/NO) × (Thai norm
YES/NO/PROXY) × (recommended action: KEEP / REPLACE NORM / REPLACE TRANSLATION / REPLACE
INSTRUMENT / NO CHANGE POSSIBLE).

---

## 6. What happens to these results

Nothing goes into the code unverified. For each returned value I will:

1. Open the primary source and confirm the mean/SD at the cited table or page.
2. Check the response scale matches our stored raw range — a scale change requires a schema
   migration, not just a norms edit.
3. Update `benchmarks.js` (`SOURCES` label + the mean/SD in the aspect's percentile
   function), recompute the `averages.js` reference person, and adjust the tests that pin
   the expected ballpark.
4. Reword the Methodology page so the cited sample is stated honestly, including where a
   proxy is being used.
5. Ship as one release per aspect, with the change documented in `CHANGELOG.md`.

An honest `NOT FOUND` is a good result: it tells us to state the foreign norm openly on the
Methodology page rather than imply a Thai comparison we do not have.
