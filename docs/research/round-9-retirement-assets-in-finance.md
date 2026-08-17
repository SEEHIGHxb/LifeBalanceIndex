# Round 9 research brief — should holding retirement assets score in Finance?

Status: **CLOSED — 2026-08-17. Verdict adopted: `longTermInvestments` will not be scored, in
Finance or anywhere else.** Six defects found in the export, one of them a reversal of its primary
source. The change this round produced is not a scoring change — it removed advice the research
showed to be wrong. See the Outcome section at the foot of this file.

---

## Why this round exists

`profile.longTermInvestments` is a boolean captured at onboarding and editable in the profile:

> Long-term pension / retirement products (SSF, RMF, stock portfolio)?
> — "No, not yet planning pension" / "Yes, retirement assets secured"

It is **collected, stored, displayed, and scores nothing.** v64 removed it from Humanity's Future
because ranking a person's contribution to the future on whether they hold a retirement product
ranked their income instead. The aspect page now says so in as many words:

> Long-term security — 0 — *Not scored here — shown for information. No retirement/long-term
> investments yet.*

That is honest, and it is also a loose end. Either the field belongs somewhere or it should stop
being asked. Finance is the obvious candidate, and **this round exists to find out whether that is
defensible or whether it repeats the v64 mistake in a new aspect.**

## Why this round is narrow

One question. Round 8 was disciplined on its primary question and fabricated twice on its
secondary one — both inventions landed exactly where the export had nothing to report. A second
question is a fabrication magnet, so there isn't one.

**Deliberately excluded, to be its own round:** published anchors for a savings-runway measure
(months of expenses covered by liquid savings). `liquidSavings` is already validated and stored
via the Midori connector (`connections.js:72`) and is waiting on exactly that. Different
literature, different kill criterion. Not this round.

## What is already verified — do not re-research any of this

- **Finance scores** `0.6 × income standing + 0.4 × CFPB well-being + savings bonus (0–10)`
  (`scoring.js:294`). Income already carries the largest single weight in the aspect.
- The **CFPB Financial Well-Being Scale** (5-item form, age-banded raw-to-score conversion) is
  sourced and shipped. Its provenance is settled.
- `savingsRate` is derived from a baht amount the user can look up, not a percentage they guess
  (`scoring.js:212–226`).
- v64's removal of this field from Humanity's Future, and its reasoning, are settled. Do not
  relitigate them.

## My unverified priors — verify or refute these, do not accept them

I hold these beliefs and **they may be wrong.** They are written down so the research can attack
them. Treat each as a claim to check, never as background fact:

1. SSF and RMF are **tax-deduction vehicles** whose benefit scales with marginal tax rate and is
   worth nothing below the taxable-income threshold.
2. Retirement coverage in Thailand is largely a function of **employment sector**, not choice:
   formal employees have mandatory social-security coverage, civil servants have their own fund,
   and a large share of the workforce is informal with neither by default.
3. If 1 and 2 hold, the question above measures **income and employment formality**, which Finance
   already scores at 0.6 — so scoring it again would double-count income while penalising informal
   workers. That would reintroduce into Finance the exact bias v64 removed from Humanity's Future.

If prior 3 is right, the correct outcome is **not** to score the field, and possibly to stop
asking the question. That is a successful round.

## Kill criteria — any one of these closes the round against adoption

1. **No validated index treats retirement-asset ownership as a scored *component* of financial
   wellbeing** — as opposed to a correlate of it, or an outcome of it. Those three are different
   and must not be blurred.
2. **Thai ownership is strongly concentrated by income.** Finance already weights income 0.6; a
   second income proxy is double-counting, not measurement.
3. **Coverage is determined mostly by employment sector rather than by the user's choice.** Then
   the item measures which job someone has, and two users with identical prudence answer
   differently.

---

# Research task: is retirement-asset ownership a component of financial wellbeing?

## Your role and the single most important rule

You are sourcing evidence that may be written into a wellbeing self-assessment app used by real
people in Thailand. Every claim you return will be **independently re-verified against its primary
source before use.** A claim I cannot trace and confirm is worse than no claim, because it costs
review time and is then discarded.

**"NOT FOUND" is a correct, valuable and expected answer.** The field in question currently scores
nothing, and the app openly tells the user it scores nothing. That disclosure is a shipped
feature, not a bug I am desperate to remove. **Confirming that retirement-asset ownership should
not be scored is a successful result and I will act on it.** Do not fill gaps. Do not manufacture
a positive finding.

Three consecutive rounds of research in this project have returned fabrications: a national norm
complete with mean, SD, sample size and page numbers; real DOIs attached to the wrong claims; and
an "explicit definition" quoted from a paper whose full text the same report admitted it never
obtained. State your confidence honestly and mark plainly anything you could not open.

## Scope

- **In scope:** whether ownership of retirement or long-term investment assets is a scored
  component of any validated financial-wellbeing, financial-capability or financial-resilience
  index; and the Thai distribution and institutional structure of such ownership.
- **Out of scope, do not report:** investment advice of any kind; which products are good; returns,
  yields or performance; tax-optimisation strategy; anything about how a person *should* invest.
  This app does not give financial advice and will not carry any.
- **Out of scope, do not report:** general financial-literacy scores presented as financial
  wellbeing. They are a different construct. If a source measures knowledge, say so and move on.

If you find yourself recommending a product, you have left the scope.

## Absolute prohibitions

- Do not conflate **financial wellbeing** (how a person's money situation affects them),
  **financial literacy** (what they know), **financial inclusion** (what they can access), and
  **financial resilience** (what shock they can absorb). Name which one every source measures,
  every time.
- Do not conflate a **component** of an index with a **correlate** of it or an **outcome** of it.
  "Retirement savers score higher on X" is a correlation and is *not* evidence that ownership
  belongs inside X. Label every finding COMPONENT, CORRELATE or OUTCOME.
- Do not conflate **LTF** with **SSF**. LTF closed to new contributions; SSF is the later
  instrument. A source about LTF may be describing a product that no longer accepts money — say so
  and give the date.
- Do not conflate **mandatory** coverage (social-security pension, civil-service funds) with
  **voluntary** products (SSF, RMF, elective provident funds, private portfolios). That
  distinction is the whole question.
- Do not report a **percentage of any population** unless you opened the source table and can cite
  it by table number. Invented statistics are the most common defect in this project's research
  history.
- **Open every DOI and URL, and confirm the returned title matches the claim you attached to it.**
  State per source that you did this. Three mismatched-citation defects have already been caught
  here.
- Do not cite a blog, a bank's marketing page, a consultancy summary or an AI answer as a primary
  source for a statistic or a scale's structure. Government statistics offices, central banks,
  regulators, peer-reviewed journals and the index's own technical documentation only.

## The questions, in priority order

### Q1 — Is asset ownership a scored component of a validated index? (HIGHEST)

For each financial-wellbeing / capability / resilience index you can document:

1. Does the index **score** retirement-asset or long-term-investment ownership as an input? If so,
   quote the item and give its weight. If it appears only as a validation correlate, say CORRELATE
   and say so plainly.
2. What is the index's own **definition of the construct**? Quote it.
3. Specifically for the **CFPB Financial Well-Being Scale**, which this app already uses: does the
   CFPB's own framework treat retirement holdings as a component, a correlate, or an outcome?
   This is the highest-value single answer in the round, because the app is already committed to
   CFPB's definition of the construct and must not contradict it.
4. Cover at minimum, and say NOT FOUND for any you cannot document: CFPB Financial Well-Being
   Scale; OECD/INFE financial-competence and wellbeing measures; any World Bank or IMF
   financial-capability survey instrument; any national financial-wellbeing index that publishes
   its component weights.

### Q2 — Who in Thailand actually holds these products? (HIGHEST)

1. Ownership or participation rates in **SSF, RMF, provident funds, the National Savings Fund**
   and private investment accounts, **broken down by income** — decile, quintile or bracket.
   Source must be a statistics office, regulator, central bank or peer-reviewed study.
2. The same **broken down by employment sector** — formal employee, civil servant, self-employed,
   informal worker, agricultural worker.
3. Is there published work explicitly characterising uptake as **income-concentrated**, or the tax
   benefit as **accruing to higher earners**? Quote it.

A clear positive here fires kill criterion 2 and closes the round cheaply.

### Q3 — What is automatic and what is a choice? (HIGH)

The app asks one yes/no question of every user. It is only a fair question if different users can
answer it on comparable terms.

1. Which retirement arrangements are **mandatory or automatic** for which categories of Thai
   worker, and which are **elective**? Cover social-security pension provisions, the civil-service
   fund, provident funds and the voluntary schemes.
2. What share of the Thai workforce is **informal** and therefore outside mandatory coverage by
   default? Cite the source table.
3. Is there an accessible voluntary route for informal workers, and what is its documented uptake?

If coverage turns out to be mostly a property of the job rather than of the person, kill
criterion 3 fires.

### Q4 — Is there a better field to ask instead? (MEDIUM)

Only if Q1–Q3 point away from scoring ownership.

1. Are there **validated objective** financial-wellbeing or resilience items that do **not** proxy
   income — for example ability to absorb an unexpected expense, or expense-coverage duration?
2. For each: exact item wording, response scale, validating study, and whether the item is free to
   use.
3. Has any such item been **used or validated in Thailand or a comparable middle-income setting**?
   Expected answer: possibly none. Confirm the negative rather than assuming it.

Report these as candidates only. Do not recommend one.

### Q5 — Published critiques (MEDIUM)

1. Any literature arguing that **asset-ownership-based** measures of financial wellbeing are
   biased against informal-sector, agricultural or low-income workers.
2. Any measurement-invariance or differential-item-functioning work on financial-wellbeing
   instruments across income or employment-sector groups.

**A NOT FOUND here is expected and entirely acceptable.** Report it as a negative. Do not
substitute findings about gender or age, which are different questions.

## Output format

One block per source. No source, no block.

```
CLAIM:                  [the single thing this source establishes, in one sentence]
CLAIM TYPE:             [COMPONENT | CORRELATE | OUTCOME | DISTRIBUTION | INSTITUTIONAL FACT | CRITIQUE]
CONSTRUCT MEASURED:     [financial wellbeing | literacy | inclusion | resilience | other — name it]
ANSWERS QUESTION:       [Q1 | Q2 | Q3 | Q4 | Q5]
SOURCE TYPE:            [peer-reviewed | government statistics | regulator | central bank | index technical documentation | SECONDARY ONLY - unverified]
CITATION:               [authors/agency, year, full title, publication, volume(issue), pages]
PERSISTENT ID:          [DOI / report number / "none" if genuinely absent]
ID CHECK:               [state that you opened it and the returned title matched — or that it did not]
EXACT LOCATION:         [table number / section / page — a document-level citation is not a location]
VERBATIM QUOTE:         ["one sentence, copied exactly, not paraphrased"]
POPULATION & DATE:      [who was measured, when, sample size]
URL:                    [direct link to the document, not a search page]
FULL TEXT READ:         [yes | abstract only | paywalled — could not open]
CONFIDENCE:             [high | medium | low] + one line why
```

Then a **NOT FOUND register**: every question or sub-question you could not answer, listed
explicitly. An empty register will be read as a failure to look, not as total success.

Then a **VERDICT** section answering, in plain language and without hedging:

1. Is retirement-asset ownership a scored component of any validated financial-wellbeing index —
   yes or no?
2. Does the CFPB framework specifically treat it as a component?
3. In Thailand, is ownership concentrated by income? Yes, no, or not documented.
4. Is coverage mostly determined by employment sector rather than by choice?
5. Given 1–4: should a wellbeing app score this field in a Finance aspect that already weights
   income at 0.6? **A "no" is a perfectly good answer.**

## Final self-check before you submit

- Did I open the actual source document, not a summary of it?
- Did I open every DOI and URL and confirm the returned title matched the claim?
- Did I label every finding COMPONENT / CORRELATE / OUTCOME rather than blurring them?
- Did I name the construct each source measures, keeping wellbeing separate from literacy,
  inclusion and resilience?
- Did I keep mandatory coverage separate from voluntary products everywhere?
- Is every percentage traceable to a table I actually opened and cited by number?
- Did I give investment advice anywhere? If so, remove it.
- Is my NOT FOUND register honest and non-empty?
- Would a reviewer with only my citation and location field find the exact claim in under two
  minutes?

---

## My verification pipeline — not part of the prompt above

When the export comes back I will, as in rounds 2–8:

1. Extract the document and read it whole before judging any part of it.
2. Re-open every DOI, report number and URL, and confirm each returned title matches the claim
   attached to it.
3. Check every statistic against the cited table, by table number.
4. Check that COMPONENT claims really are components and not correlations restated.
5. Enumerate defects in an Outcome section appended to this file, whatever the verdict.
6. Change code only for claims that survive all of the above — and record what did not.

An export returning "no, do not score it" with sound sourcing closes this round in one pass and
costs nothing further. That is the outcome I expect, and it is a good one.

---

# Outcome — 2026-08-17

**Verdict adopted: do not score `longTermInvestments`.** All three kill criteria fire, each on
evidence verified at the primary source. The export reached the right conclusion.

It also reversed one of its two most important sources, invented four data points, and restated a
three-group econometric design as a five-group one. The conclusion survives all of it, because the
conclusion never depended on the parts that were wrong.

## What verified at source

| Claim | Status |
| --- | --- |
| PIER: ~70% of Q5 tax filers hold long-term savings vs 20%–40% for Q1–Q4 | **VERIFIED.** Thai quote accurate at `pier.or.th/abridged/2020/21/` |
| MPS declines 22.6% (middle income) and 5.4% (high income); low income not significant | **VERIFIED** in PIER DP 143 |
| `doi:10.1007/s10797-021-09687-w` → Muthitacharoen & Burong, *Int Tax Public Finance* 29(3), 726–750, 2022 | **VERIFIED** via Crossref — title, journal, volume, issue, pages, both authors |
| CFPB scale is 10 items (5-item abbreviated form), IRT-scored, all items subjective | **VERIFIED** in the technical report |
| No asset-ownership item is scored in the CFPB scale | **VERIFIED** — the 10 items are all self-report statements |
| Thai PIT brackets 0%→35%; SSF capped at 30% of taxable income / THB 200,000; THB 500,000 combined ceiling | **VERIFIED** against the statutory schedule |
| ~half the Thai workforce is informal and outside mandatory coverage | **VERIFIED directionally** (NSO 2023: 52.3%) |

## Defects found

**1. The CFPB measurement-invariance claim is the reverse of what the report says.** The export
wrote that CFPB "confirmed that subjective evaluative items maintain structural measurement
invariance across demographic and income groups". The technical report says:

> "Because differential item functioning was found across both age groups and survey modes, item
> parameters are provided in Appendix B for scoring four different types of scale respondents"

CFPB **found** DIF — enough of it to ship four separate scoring rubrics. And the grouping variables
it examined were "age, sex, mode of administration"; **income was never tested.** So the export
inverted the finding *and* added a grouping variable that does not appear. This is the worst defect
of the round: it sits on the highest-priority question, and it manufactures psychometric support
for the conclusion the export was already heading toward. The direction of the error is the tell.

**2. Four fabricated data points.** The export's table gives per-quintile participation as Q1 20%,
Q2 25%, Q3 30%, Q4 35%. The source publishes a single combined range for Q1–Q4 and does not
disaggregate by quintile at all. Four point estimates ascending in exact 5-point steps is
interpolation wearing the costume of data.

**3. A three-group design restated as five quintiles.** DP 143 estimates **low / middle / high**
income groups. The export copied the middle-income −22.6% into Q2, Q3 *and* Q4 as though they were
three separate estimates, and mapped high-income −5.4% onto Q5. The numbers are real and correctly
signed; the structure around them is invented.

**4. CFPB's validator list is misdescribed.** The export states that "holding retirement accounts,
investment portfolios, or home equity is analyzed strictly as an external covariate to establish
criterion-related validity". The report's actual validators are self-reported credit rating,
confidence in raising $2,000 in 30 days, having three months of expenses saved, self-rated
financial situation, negative economic events, and material hardship. The word **"retirement"
appears zero times in the entire report.** The conclusion — assets are not scored — is right. The
mechanism offered for it was made up.

**5. The NSO "VERBATIM QUOTE" is not verbatim, and its numbers are off.** The quote carries its own
disclaimer — "(Documented in labor sector evaluation of NSO survey data)" — which is an admission
that it was not copied from the document. Its figures are 20.4M informal of 37.5M employed; NSO's
2023 release reports ~21M informal, 52.3% of ~40.1M employed. The export also puts 52.5% of
informal workers in agriculture where NSO reports 55.4%. The share is roughly right; the counts are
not, and a fabricated quotation is a fabrication regardless of how close the number lands.

**6. Works-cited contamination.** The reference list includes a humanitarian-crisis article about
Myanmar and a study of herbicide metabolite levels in Thai tractor sprayers. Neither has any
relation to the topic. Rounds 6, 7 and 8 each had a version of this.

**Unverified, not counted as a defect:** the Global Findex figure of 59.2% of Thai adults able to
raise emergency funds. I could not reach a Thailand row. It is plausible against the 55%
developing-economy benchmark, but the export blends "within 30 days" with "without difficulty",
which are different denominators in Findex. Treat as unconfirmed.

**Missed opportunity:** DP 143 footnote 18 states that top-quintile taxpayers account for around
75% of the tax expenditure on savings-related deductions. That is a cleaner regressivity statistic
than anything the export used, and it sits in a document the export claims to have read in full.

## The verdict, restated on verified evidence only

1. **No validated index scores asset ownership.** The CFPB scale is ten subjective items. Verified
   directly, without needing the export's invented mechanism.
2. **Thai ownership is concentrated by income.** ~70% in Q5 against 20%–40% in Q1–Q4 — and note
   this is among *tax filers*, who are already a higher-income subset of the workforce, so the
   population gradient is steeper than the published one.
3. **Coverage tracks employment sector.** Roughly half the workforce is informal and outside
   mandatory coverage by default.

`longTermInvestments` will not be scored. Finance already weights income at 0.6; adding a field
whose main signal is income and job formality would double-count earnings and mark down informal
workers for a structural exclusion — the v64 mistake in a new aspect.

## What actually changed in the code, and why it was not the scoring

The verdict is the status quo, so nothing needed to change to honour it. But verifying the round
surfaced something live and wrong.

The Humanity's Future aspect page carried this as its **top-ranked** suggestion:

> **Start long-term investing** — "Open an SSF/RMF or index fund with any amount — most Thai
> workers have no retirement savings, so starting at all puts you ahead."

Three things are wrong with it, and this round is what makes them provable:

- **It is product-specific financial advice**, which this app does not give and which this round's
  brief explicitly refused to source.
- **It is worst for the users the app is aimed at.** SSF and RMF are tax *deductions*. Below the
  taxable threshold the benefit is exactly zero, while the lock-up is real — ten years for SSF, age
  55 for RMF. A verification profile on 20,000 THB/month sits in the 0% bracket, and the app told it
  to buy a tax-deduction product.
- **It was ranked first for almost everyone.** `getAspectSuggestions` ranks components weakest-first
  and the `security` component reads 0 for anyone without a pension — so an *unscored,
  informational* field was driving the app's leading recommendation. Suggesting action on a
  component that cannot move any score is incoherent on its own terms, independent of this round.

Fixed by excluding `scored: false` components from suggestion ranking entirely — the general fix, so
this cannot be reintroduced one component at a time — and by deleting the rule. The aspect-page copy
also dropped "yet" from "No retirement/long-term investments yet": the research is that
non-ownership is frequently rational liquidity management or structural exclusion, and "yet" quietly
told the user they were behind.

## What this round cost and what the shape bought

One question, one export, six defects, verdict adopted. The narrow shape held for a second round
running: everything fabricated was **decoration on a conclusion that was already true** —
per-quintile granularity, a quotation, a mechanism — rather than the conclusion itself. Round 8
showed the same pattern.

The uncomfortable part is defect 1. The brief wrote down my own priors and told the export to attack
them; instead the export returned a reversed source that supported them. Accepting the verdict
because it matched what I already believed would have shipped a claim about CFPB that its own
technical report contradicts. **Agreement with a prior is the cheapest thing an export can
manufacture, and the point at which verification matters most.**

Left open, unchanged: whether to keep *asking* the question at all. It now scores nothing by
decision rather than by omission, it is still shown for information, and it still feeds the Midori
connector. Removing it is a product call, not a research finding.
