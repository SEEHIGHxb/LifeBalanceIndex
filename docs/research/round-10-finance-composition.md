# Round 10 research brief — what should the Finance aspect be made of?

Status: **OPEN — 2026-08-18.** Three questions, deliberately: two candidate new inputs and the
weight that would sit beside them. See "Why this round breaks the one-question rule" before reading
further, and read the fabrication guard attached to it.

---

## Why this round exists

Two real people, described by the app's own author:

- A friend earning **75,000 THB/month** in Bangkok who supports his family and carries debt, and
  who describes himself as worried about money.
- The author: **no salary**, back home studying, receiving ~**3,000 THB/month** from family, no
  debt, no essential expenses of his own, and describing himself as having no money worry at all.

Run through the shipped calculator, with the friend answering **maximum distress** on all five CFPB
items and the author answering near-maximum calm:

| | Income standing | CFPB wellbeing | **Finance score** |
|---|---|---|---|
| Friend, 75k, Bangkok, very worried | 72.8 | 36.0 | **58.0** |
| Author, 3k, Provinces, no worry | 22.5 | 72.0 | **42.0** |

**The app already asks the question that separates them, gets the right answer, and then overrules
it.** CFPB places the author 36 points above the friend. `calculateFinanceScore` (`scoring.js:294`)
is `0.6 × income standing + 0.4 × CFPB + savings bonus`, and the 0.6 inverts the ordering into a
16-point win for the friend. Sweeping the income weight on this pair, the ordering flips at
approximately **w = 0.4**.

That finding has two candidate explanations, and they call for opposite fixes:

1. **Missing inputs.** Finance measures income and a savings *rate* but knows nothing about
   committed outflow, savings *stock*, or debt. The friend's 75,000 has a large committed slice; the
   author's 3,000 has none. Adding the missing variable would fix the ranking.
2. **A wrong weight.** No new field repairs a term that overrides the data. If 0.6 on an objective
   income proxy is unsupported by any published composite, the weight is the defect and new fields
   are a distraction from it.

These are not alternatives — both may be true, or neither — but they cannot be settled separately,
because **a new term's weight cannot be set without setting the others.** Hence one round.

## Why this round breaks the one-question rule — and what guards it

Round 9's brief states: *"Round 8 was disciplined on its primary question and fabricated twice on
its secondary one — both inventions landed exactly where the export had nothing to report. A second
question is a fabrication magnet, so there isn't one."*

Round 9 then fabricated anyway, on its own secondary distribution question: four per-income-quintile
percentages in an exact 5-point arithmetic progression, against a source that publishes only a
combined range and states it does not disaggregate. **The pattern is now three rounds long and it is
specific: invention happens on distribution statistics, in the question that is not the headline.**

This round cannot be reduced to one question without making its answer unusable. So instead:

- **Q2 is pre-declared the high-risk question.** It asks for Thai distributions, which is where all
  three prior fabrications occurred. Every percentage in Q2 must carry a table number. A Q2 answer
  of "NOT FOUND, no disaggregated Thai table exists" is an **expected and fully acceptable result**
  and will not weaken the round — Q1 and Q3 can close it alone.
- **The NOT FOUND register is required to be non-empty per question, not per round.** A register
  that names no gap under Q2 will be treated as evidence of invention, not of thoroughness.
- **Ranges must be reported as ranges.** If a source publishes "20–40% across Q1–Q4", that is the
  finding. Splitting it into per-quintile values is fabrication even when the endpoints are real.

## What is already verified — do not re-research any of this

From rounds 1–9, settled. Re-deriving these wastes the round:

- Finance scores `0.6 × income standing + 0.4 × CFPB well-being + savings bonus (0–10)`.
- The **CFPB Financial Well-Being Scale** (5-item form, age-banded conversion) is sourced and
  shipped. Its provenance is settled.
- The CFPB scale is **ten subjective items** and scores **no** asset-ownership input. Its published
  validators are credit rating, ability to raise $2,000 in 30 days, three months of expenses saved,
  self-rated financial situation, negative events, and material hardship. The word "retirement" does
  not appear in the technical report.
- CFPB **found differential item functioning** across age groups and survey modes and therefore
  publishes **four** scoring rubrics. It did **not** test invariance across income. Round 9's export
  claimed the opposite; the report contradicts it. Do not repeat that claim.
- Thai retirement-product uptake is income-concentrated (~70% tax-filer participation in the top
  income quintile against a combined 20–40% across Q1–Q4), roughly half the workforce is informal,
  and `longTermInvestments` is therefore **not scored anywhere** and, as of v68, no longer asked.
- `savingsRate` is derived from a baht amount the user can look up, not a percentage they guess.

## What the app collects today

| Field | Asked in-app | From Midori | Scored |
|---|---|---|---|
| `income` | yes | yes | yes, weight 0.6 |
| `monthlySavings` → `savingsRate` | yes | derived from income − expenses | yes, bonus 0–10 |
| CFPB 5-item | yes | — | yes, weight 0.4 |
| `monthlyExpenses` | **no** | yes, stored | no |
| `liquidSavings` | **no** | validated contract, not sent | no |
| debt / debt service | **no** | **no** | no |

Two things worth noting, because they shape what is worth asking. **Expenses are already a
first-class field reachable only through the Midori connector** — the un-connected user is already
measured worse than the connected one. And `liquidSavings` carries a validated range contract
awaiting exactly the anchors this round asks for.

## My unverified priors — verify or refute these, do not accept them

Written down so the research can attack them. Round 9's export returned a **reversed source that
agreed with these priors**, and agreement is the cheapest thing an export can manufacture. Treat
each as a claim to check, never as background fact:

1. **0.6 on an objective income term is high** relative to published composite financial-wellbeing
   indices, which I believe weight behaviour and subjective assessment more heavily than income —
   and several of which I believe exclude income as a scored input entirely.
2. **Income's empirical association with financial wellbeing is moderate, not dominant** — income
   explains a minority of the variance in CFPB-type scores.
3. **Expense-coverage duration** ("how many months could you cover") is a validated objective
   resilience item that does **not** proxy income, unlike asset ownership.
4. **Debt is not scoreable as a balance.** A mortgage on an owned home and a revolving credit-card
   balance are not the same quantity; only debt *service* against income is comparable across
   people.

If priors 1 and 2 hold, **the correct outcome may be to change the weight and add nothing.** That is
a successful round and costs one line of code.

## Kill criteria — pre-registered, and they point in both directions

Against adding a runway / savings measure:

1. **No validated financial-wellbeing or resilience instrument scores an expense-coverage or
   savings-runway item as a component** (as opposed to using it as a validation correlate).
2. **No Thai anchor exists** for the distribution of emergency savings or expense-coverage months,
   from a statistics office, central bank or regulator. Without a distribution there is no
   defensible normalizer, and this app does not ship uncited thresholds.

Against adding a committed-outflow question:

3. **Published evidence that self-reported household expenses or debt service are badly estimated by
   respondents**, to a degree that makes a single-number self-report unusable.

Against keeping the income weight where it is:

4. **No published composite financial-wellbeing index weights an objective income term at or above
   0.5.** If the highest documented weight is materially below 0.6, the current value is unsupported
   and must move regardless of what happens to Q1 and Q2.

Criterion 4 is the one most likely to fire, and firing it is the cheapest useful outcome available.

---

# Research task: the composition and weighting of a financial-wellbeing score

## Your role and the single most important rule

You are sourcing evidence that may be written into a wellbeing self-assessment app used by real
people in Thailand. Every claim you return will be **independently re-verified against its primary
source before use.** A claim I cannot trace and confirm is worse than no claim, because it costs
review time and is then discarded.

**"NOT FOUND" is a correct, valuable and expected answer.** The app currently scores none of the
candidate fields and openly discloses what it does not measure. Disclosure is a shipped feature, not
a bug I am desperate to remove. **Confirming that a field should not be added, or that a weight
cannot be sourced, is a successful result and I will act on it.**

Four consecutive rounds of research in this project have returned fabrications: a national norm
complete with mean, SD, sample size and page numbers; real DOIs attached to the wrong claims; an
"explicit definition" quoted from a paper the same report admitted it never opened; and — most
recently — a primary source quoted as concluding the **opposite** of what it concludes, plus four
invented per-quintile percentages. State your confidence honestly and mark plainly anything you
could not open.

## Scope

- **In scope:** the published component structure and weighting of financial-wellbeing,
  financial-health and financial-resilience indices; the empirical relationship between income and
  measured financial wellbeing; validated objective items for expense coverage, emergency savings
  and debt burden; and Thai distributional and institutional facts for those quantities.
- **Out of scope, do not report:** investment or financial advice of any kind; product
  recommendations; returns, yields, tax strategy; debt-management advice. This app does not give
  financial advice and will not carry any.
- **Out of scope, do not report:** financial *literacy* scores presented as financial wellbeing.
  Different construct. Name it and move on.

If you find yourself recommending what a person should do with money, you have left the scope.

## Absolute prohibitions

- Do not conflate **financial wellbeing** (how a money situation affects a person), **financial
  literacy** (what they know), **financial inclusion** (what they can access), and **financial
  resilience** (what shock they can absorb). Name which one every source measures, every time.
- Do not conflate a **component** of an index with a **correlate** of it or an **outcome** of it.
  Label every finding COMPONENT, CORRELATE or OUTCOME.
- Do not conflate **subjective wellbeing / life satisfaction** research with **financial wellbeing**
  measurement. The income–happiness literature is a different construct; if you cite it under Q3,
  label it and say so explicitly.
- Do not conflate a **household** statistic with an **individual** one, or a **debt balance** with a
  **debt-service ratio**. State which, every time.
- Do not report a **percentage of any population** unless you opened the source table and can cite
  it by table number. **If a source publishes a range or a grouped figure, report the range.**
  Disaggregating a published range into per-group values is fabrication.
- **Open every DOI and URL, and confirm the returned title matches the claim you attached to it.**
  State per source that you did this.
- Do not cite a blog, a bank's marketing page, a consultancy summary or an AI answer as a primary
  source for a statistic or an index's structure. Government statistics offices, central banks,
  regulators, peer-reviewed journals and the index's own technical documentation only.

## The questions, in priority order

### Q1 — What do validated composite indices actually score, and at what weight? (HIGHEST)

This is the headline question and the one most likely to close the round.

For each financial-wellbeing / financial-health / financial-resilience index you can document:

1. **List its scored components and their published weights.** If components are equally weighted,
   say so. If the index does not publish weights, say NOT FOUND rather than inferring them.
2. **Is income itself a scored input?** Yes or no. If yes, quote the item and give its weight — this
   is the single highest-value number in the round. If income is used only for norming, reporting or
   validation, say CORRELATE and say so plainly.
3. **Is an expense-coverage, emergency-savings or runway item a scored component?** Quote the exact
   item wording and its response scale.
4. **Is a debt item scored, and is it a balance or a service ratio?** Quote it.
5. Cover at minimum, and say NOT FOUND for any you cannot document: the **CFPB Financial Well-Being
   Scale**; the **Financial Health Network FinHealth Score**; the **UK Money and Pensions Service**
   financial-wellbeing framework; **OECD/INFE** financial-competence measures; the **ANZ Roy Morgan
   Financial Wellbeing Indicator**; and any national financial-wellbeing or financial-health index
   that publishes component weights.

### Q2 — Thai distributions for the candidate fields (HIGH — *pre-declared high fabrication risk*)

**Read the guard above before answering this.** Every percentage needs a table number. NOT FOUND is
an expected answer here and will not weaken the round.

1. Distribution of **emergency savings** or **months of expenses covered by liquid savings** among
   Thai households or individuals — from the National Statistical Office, Bank of Thailand, or a
   peer-reviewed study. Report the published bands exactly as published.
2. Distribution of **household debt-service ratio** or debt-to-income. Same sourcing bar. State
   household vs individual.
3. Any published Thai figure for the share of households that **could not cover an unexpected
   expense** of a stated size, with that size named.
4. **What share of household spending is non-discretionary / committed** in Thai household
   socio-economic survey data, if published.

### Q3 — How strongly is income actually associated with financial wellbeing? (HIGH)

The app weights an objective income proxy at 0.6. This question asks what the empirical relationship
justifies.

1. Published **correlations, R², or variance-explained** figures between income and scores on the
   CFPB scale or any comparable financial-wellbeing instrument. Give the statistic, the sample, and
   the exact location.
2. Does the **CFPB's own technical documentation or research brief** report income's relationship to
   the score? Quote it. This is the highest-value single answer in Q3, because the app is already
   committed to CFPB's definition of the construct.
3. Is there published work on **diminishing returns** — a threshold or log relationship between
   income and financial wellbeing specifically? If the only literature you find concerns life
   satisfaction or emotional wellbeing rather than financial wellbeing, **say so explicitly and
   label it**; do not present it as the same construct.
4. Any published work on financial wellbeing among people with **low or no income but low
   obligations** — students, those supported by family, multigenerational households. Expected
   answer: possibly none. Confirm the negative rather than assuming it.

### Q4 — Item wording for the candidate fields (MEDIUM)

Only if Q1 shows such items are scored somewhere.

1. Exact item wording and response scale for validated **expense-coverage / runway** items.
2. Exact item wording for validated **committed-outflow, financial-obligation or debt-service**
   items, including any that capture **financial support given to family members** — this last is
   directly relevant and I expect it may be absent from Western instruments. Confirm the negative.
3. For each: the validating study, whether it is free to use, and whether it has been used or
   validated **in Thailand or a comparable middle-income setting**.
4. Published evidence on the **accuracy of self-reported** household expenses, debt service or
   savings balances. If self-report is documented as unreliable, kill criterion 3 fires.

Report these as candidates only. Do not recommend one.

### Q5 — Published critiques (MEDIUM)

1. Literature arguing that **income-weighted** composite wellbeing measures are biased, or that
   objective and subjective financial measures should not be combined into a single score at all.
2. Measurement-invariance or DIF work on financial-wellbeing instruments **across income groups**
   specifically. Note that CFPB tested age, sex and mode — not income. Whether anyone has tested
   income is an open question and a genuine NOT FOUND is expected.

## Output format

One block per source. No source, no block.

```
CLAIM:                  [the single thing this source establishes, in one sentence]
CLAIM TYPE:             [COMPONENT | WEIGHT | CORRELATE | OUTCOME | DISTRIBUTION | INSTRUMENT ITEM | INSTITUTIONAL FACT | CRITIQUE]
CONSTRUCT MEASURED:     [financial wellbeing | literacy | inclusion | resilience | subjective wellbeing | other — name it]
UNIT:                   [individual | household | not stated]
ANSWERS QUESTION:       [Q1 | Q2 | Q3 | Q4 | Q5]
SOURCE TYPE:            [peer-reviewed | government statistics | regulator | central bank | index technical documentation | SECONDARY ONLY - unverified]
CITATION:               [authors/agency, year, full title, publication, volume(issue), pages]
PERSISTENT ID:          [DOI / report number / "none" if genuinely absent]
ID CHECK:               [state that you opened it and the returned title matched — or that it did not]
EXACT LOCATION:         [table number / section / page — a document-level citation is not a location]
VERBATIM QUOTE:         ["one sentence, copied exactly, not paraphrased"]
AS-PUBLISHED FIGURE:    [for any statistic: the value or RANGE exactly as the table prints it]
POPULATION & DATE:      [who was measured, when, sample size]
URL:                    [direct link to the document, not a search page]
FULL TEXT READ:         [yes | abstract only | paywalled — could not open]
CONFIDENCE:             [high | medium | low] + one line why
```

Then a **NOT FOUND register, organised by question**, with **at least one entry under Q2**. A
register that names no gap under Q2 will be read as invention, not as thoroughness.

Then a **VERDICT** section answering, in plain language and without hedging:

1. Do validated composite financial-wellbeing indices score income as an input — and if so, at what
   published weight? What is the highest weight you found?
2. Is an expense-coverage / savings-runway item a scored component of any validated index?
3. Is a debt item scored anywhere, and as a balance or a service ratio?
4. What does the evidence say about how much of financial wellbeing income actually explains?
5. Do Thai anchors exist for emergency savings, debt-service ratio, or committed spending share —
   yes, no, or only as ranges?
6. Given 1–5: **is 0.6 on an objective income term defensible?** If not, what does the published
   evidence support instead? **"The evidence does not support a specific number" is an acceptable
   answer** — say it rather than inventing one.

## Final self-check before you submit

- Did I open the actual source document, not a summary of it?
- Did I open every DOI and URL and confirm the returned title matched the claim?
- Did I label every finding COMPONENT / WEIGHT / CORRELATE / OUTCOME rather than blurring them?
- Did I name the construct each source measures, keeping financial wellbeing separate from literacy,
  inclusion, resilience and life satisfaction?
- Did I state household vs individual for every statistic?
- Is every percentage traceable to a table I opened and cited by number, and did I report published
  ranges **as ranges** rather than splitting them into per-group values?
- Did I give financial advice anywhere? If so, remove it.
- Is my NOT FOUND register honest, organised by question, and non-empty under Q2?
- Did I check whether any source I cite actually concludes the **opposite** of the claim I attached
  to it? A reversed source is the defect that cost the most review time last round.
- Would a reviewer with only my citation and location field find the exact claim in under two
  minutes?

---

## My verification pipeline — not part of the prompt above

When the export comes back I will, as in rounds 2–9:

1. Extract the document and read it whole before judging any part of it.
2. Re-open every DOI, report number and URL, and confirm each returned title matches the claim.
3. Check every statistic against the cited table, by table number — and check that no published
   range has been silently disaggregated.
4. Check that COMPONENT and WEIGHT claims really are components and weights, not correlations
   restated, and that no source has been reversed.
5. Enumerate defects in an Outcome section appended to this file, whatever the verdict.
6. Change code only for claims that survive all of the above — and record what did not.

**The cheapest good outcome** is a documented set of published index weights showing that no
validated composite puts 0.6 on income. That closes the round with a one-line change and no new
questions asked of the user. **The most likely failure mode** is a Q2 answer full of clean
per-quintile Thai percentages that no table contains.
