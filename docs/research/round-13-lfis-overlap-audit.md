# Round 13 — does any LFIS item get scored twice?

Status: **CLOSED — 2026-08-23** (opened 2026-08-23). **One genuine double-count found out of six items. One
suspected double-count DISPROVED. Fixed in v74 by rewording, not by re-weighting.**

Not a literature round. Rounds 11 and 12 went looking for outside instruments; this one reads the app's own
scorers against each other, because the question — *does one answer get paid in two aspects?* — is answerable
from `scoring.js` and the item texts alone. The only external sources needed were already on disk.

Affected code:

| Thing | Where |
|---|---|
| The instrument | `surveys.js` — `lfis` (6 items since v65) |
| Its scorer | `calculateHumanityFutureScore` (`scoring.js`) |
| The aspects it was checked against | `calculateFinanceScore`, `calculateSocialContributionScore`, `calculateEnvironmentScore`, `personalGoalsComposite` |

---

## Why this round exists

v64 removed the pension from Humanity's Future because it was "a financial fact, and Finance already scores
the financial facts". v67 confirmed that removal. Both were fixes to the same class of error — one
circumstance paid in two aspects — and both were found by noticing a single item rather than by checking all
of them. This round checks all of them, once, and writes down the result so the next reader does not have to
re-derive it.

## THE MAP

Weights are read off `calculateHumanityFutureScore` at its current 6-item length, where each of the five terms
carries `w = 0.2`.

| # | Item | Term (weight in H&F) | Scored elsewhere? |
|---|---|---|---|
| 1 | skills that will still matter in ten years | Skills, 0.1 | **Yes — the field, not the item.** See below |
| 2 | leave a positive legacy beyond my own life | Legacy, 0.2 | No |
| 3 | donate to causes for future generations | Offering, 0.1 | **YES — the finding** |
| 4 | plan finances 10 years out | Security, 0.2 | **No — suspected and disproved** |
| 5 | teach or pass on skills | Offering, 0.1 | No |
| 6 | maintain, repair, care for lasting things | Maintaining, 0.2 | No |

Items 2, 5 and 6 are clean and the checks are recorded so they are not repeated:

- **Item 2 (legacy)** — nothing else in the app measures legacy. Personal Goals measures goal progress,
  self-efficacy and learning; Social Contribution measures giving, helping and civic action. Neither asks
  about anything outlasting the user.
- **Item 5 (teaching)** — the nearest neighbours are PTM items 2 and 3, "help friends or family members who
  are in need" and "help strangers". Helping someone in need is not passing on knowledge, and a teacher of a
  well-off apprentice scores on item 5 and on neither PTM item.
- **Item 6 (maintaining)** — GEB scores recycling, single-use avoidance, transit, energy habits and
  eco-product choices. All five are about consumption; item 6 is about upkeep of a physical or shared thing.
  The v65 comment anticipated this and named things rather than people for the same reason.

## THE FINDING — item 3

Giving is scored in Social Contribution at **0.4** of the aspect, through two inputs:
`0.5 × PTM item 1` ("How often do you donate money to charity, temples, or people in need?") plus
`0.5 × donationVolumeFactor(monthlyDonations)`.

LFIS item 3 asked "I support or donate to causes addressing future generations' well-being" — the same act,
scored again at 0.1 of Humanity's Future.

**The overlap was CONDITIONAL, not structural, and that is what makes it worse than it first looks.** The
pension was one fact counted twice for everybody, which is at least uniform. Here, whether a donation is paid
once or twice depends on *where it goes*: a monthly gift to a temple scores in Social Contribution only, an
identical gift to a children's education fund scores in both. The double payment lands precisely on the users
Humanity's Future exists to credit.

## THE DISPROOF — item 4

This round expected item 4 to be a second pension: "I plan my finances with a horizon of 10 years or more"
looks like a Finance question sitting in the wrong aspect. **It is not.** `calculateFinanceScore` scores
exactly three things:

```
0.15 × incomeStandingScore  +  0.85 × cfpbScore  +  savingsBonus(savingsRate)
```

The five CFPB items are all about **present coping**: "I am just getting by financially", "I have money left
over at the end of the month", "My finances control my life", "Because of my money situation I feel like I
will never have the things I want", and "I am concerned that the money I have or will save won't last". The
last is anxiety about the future, not a planning practice. `savingsBonus` is a rate, capped at 10 points, and
a rate carries no horizon.

**Nothing in the app scores planning horizon.** Item 4 stays, unchanged and unweighted-differently, and there
is a positive case for it beyond the absence of overlap: a long planning horizon is future orientation, in an
instrument named the Long-Term Future Index.

Recorded because a disproof is worth as much as a finding here — the next reader will have the same suspicion.

## THE DISCLOSED ONE — item 1

`weeklyLearningHours` is worth **~0.167 of Personal Goals** (half of `learningScore`, which is a third of the
aspect since v73) and **0.1 of Humanity's Future** (half of the Skills term, the other half being item 1
itself). That is a larger double-count than item 3, and structural rather than conditional.

It is deliberate, and it stays. Learning time is genuinely evidence for both personal development and
future-proofing; the reuse is stated in three code comments and, more importantly, on the user-facing detail
line: *"reuses your weekly learning hours"*. A disclosed reuse is a design decision. An undisclosed one is
this round's subject.

## THE REWORD, AND WHY IT WAS HARD

The remedy chosen was to change what item 3 measures rather than to drop it or unscore it:

- **Dropping it** would take the instrument from six items to five, and `calculateHumanityFutureScore` infers
  the presence of the maintaining term from `lfisAnswers.length >= 6`. A new five-item save would be read as
  a pre-v65 save and silently lose maintaining. Fixable, but it trades a small wording problem for a
  length-inference problem.
- **Keeping it asked but unscored**, the way grit and `longTermInvestments` already are, breaks the aspect
  page instead: LFIS has no per-item bars, only a single "Raw {n}/24" line, so an unscored item would still be
  inside the number shown to the user. Grit can be honest about not counting because it has its own row.

**Rewording turned out to be the hard part, and the difficulty is itself a finding.** Every other act in the
"offering toward the future" space is already scored: money → Social Contribution's donation terms, time →
its volunteering term, helping people → its two prosocial items, local or civic action → its civic items,
green consumption → Environment. Strip all of those out and what remains is teaching (item 5) and legacy
(item 2), both already in the instrument. **Offering, minus money, collapses into the items LFIS already
has.**

The wording that survives measures the one future-directed behaviour nothing in the app scores — restraint
with a beneficiary who does not exist yet:

> I use less of something now so more of it is left for the people who come after me.

Distinct from GEB items 4–6, which score using *well* (energy habits, eco-product choices) rather than using
*less for someone later*. Distinct from item 6, which keeps a thing in good order rather than leaving more of
it.

**The binding constraint was the floor, not the overlap.** The conditional phrasings tried first — "when I
give or help, I choose causes whose benefit lands on future generations" — score zero for every user with
nothing to give, which is the exact failure round 7 rewrote this instrument to remove. The item that shipped
can be answered by anyone with anything at all.

Same position, same count, same FREQ_5 scale, so stored `lfis` sums stay valid and need no migration — the
same reasoning v64 used for its own rewordings.

## What v74 does NOT change

**No weights move.** Not the 0.2 across the five terms, not the 0.4 on Social Contribution's donation term,
not Finance. This release changes what one question measures, not how much any question counts. That is worth
stating because the two previous fixes in this class (v64, v67) both moved weights, and a reader scanning the
history could reasonably expect this one to as well.

## What remains open

- **Nothing about LFIS.** All six items are now checked against every other scored input in the app.
- **Not pursued, and not a defect:** the `weeklyLearningHours` reuse above. It is disclosed to the user; a
  future round could still argue it should be scored in one aspect only.
- **Newly raised:** `savingsBonus` is capped at 10 points and sits outside the 0.15/0.85 split that round 10
  established for the rest of Finance. It was not in this round's scope — this round asked about
  double-counting, and a bonus term counted once is not a double-count — but it is the only weight in the
  finance calculator that round 10 did not examine.
