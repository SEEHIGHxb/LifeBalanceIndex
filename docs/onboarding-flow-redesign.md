# Onboarding flow redesign — the eight chapters

Status: **PHASES 0-2 SHIPPED — 2026-09-11 (APP_VERSION 81).** The Environment
prototype was built, played and approved ("I have tried the Wildwood, and it's look
good"), and the flow engine now runs all eight chapters in the app: 30 screens, the
reveal rhythm, the ring, and eight cited chapter endings. Phase 3 (Lumi and the
ceremony) and Phase 4 (one answering language across the deep and monthly flows)
are not started. Lumi is still visually unlocked — see `lumi/00-README.md`.

## Why this exists

Every planning document in this repository so far has been about *defending numbers* —
sourcing norms, verifying citations, refusing to rank what cannot be ranked. This one is
not. It is about the experience of answering, which no amount of research rigour improves.

The author's framing, and the reason this outranks the remaining research rounds:

> our app is the new idea that combine the variant aspect to create a rpg-like aspects
> but apply to the real human aspect and become the name life balance index. The 8 aspects
> itself is came from my creativity. I think since we are deliver something new,
> interesting and particularly fun (I guess?). We are not doing the Reviewing of Articles
> and Research though (It seem to look like that currently).

That is a correct read of where the project's effort has gone. The research is sound and
stays; it just stopped being the bottleneck a while ago.

## The problem, in counts

Onboarding asks for **85 required inputs across 6 pages** — 64 Likert items drawn from 14
instruments, plus 21 numeric/select fields. Counted from `views/onboarding.js` and
`surveys.js` on 2026-09-11.

| Step | Likert | Numeric/select | Total |
|---|---|---|---|
| 1 Profile & Finance | 5 | 7 | 12 |
| 2 Physical Baseline | 4 | 10 | 14 |
| 3 Mental Well-Being | 10 | 0 | 10 |
| 4 Relationships | 12 | 0 | 12 |
| 5 Goals & Learning | 16 | 1 | 17 |
| 6 Contribution, Environment & Future | 17 | 3 | 20 |

Three defects follow from that shape:

1. **Six pages is the worst available granularity.** Too coarse to register as progress,
   too dense to feel quick. Within a page there is no feedback at all — the only signal is
   `Step {n} of {total}`, which updates roughly once every four minutes.
2. **The load increases toward the end.** The two heaviest pages are last, so the flow gets
   harder exactly where attention is thinnest.
3. **Nothing is given back until it is over.** The reader supplies 85 answers before the
   app says anything about any of them.

A tester's verdict on the v79 runway fields — that the step was confusing — was the first
outside signal on any of this, and it was right. This document is the response.

## Decisions, settled

| Question | Decision |
|---|---|
| Setting | A place travelled through: eight regions on a ring. Neutral / invented, not literally Thai |
| The eight aspects | Chapters of a story, in `RADAR_KEYS` order |
| Pacing | One instrument per screen; items revealed one at a time within it |
| Chapter ending | A recap of the reader's own answers, plus a cited fun fact |
| Lumi | A travelling companion — peripheral during questions, full presence at chapter boundaries |
| Feeling | Bright and playful |
| Art | Hybrid: Lumi stays a raster character, the world is drawn in SVG/CSS |
| Fun facts | Cited only, drawn from the existing `SOURCES` registry and round docs |
| Scope | Onboarding only. The deep and monthly flows follow later, once this is proven |
| Prototype | One chapter end to end — Environment |

## The world

**A ring of eight regions, traversed in order.**

The reason for a ring rather than a road: `RADAR_KEYS` in `chart.js` fixes the eight
aspects in a clockwise order, and the radar is eight spokes around a centre. Place the
regions on a ring *in that same order* and completing the circuit is completing the
assessment — while the finished map **is** the radar chart, each region's distance from
the centre being the score in it. `story-card.js` then renders a map of the reader's
world rather than a chart of their data, from the same eight keys it already uses.

The consequence worth protecting: **the artwork built during the journey and the artwork
taken away at the end are the same object.** Every completion moment advances the real
deliverable. Nothing is animated purely as decoration.

Working names, neutral by decision, in radar order:

| Aspect | Region |
|---|---|
| `finance` | The Market |
| `physical` | The Highlands |
| `mental` | The Still Water |
| `relationships` | The Commons |
| `personalGoals` | The Workshop |
| `socialContribution` | The Crossroads |
| `environment` | The Wildwood |
| `humanityFuture` | The Lookout |

Placeholders. The structure is the commitment; the nouns are not.

## Screen anatomy

**One instrument per screen, items revealed one at a time.**

The shared stem pins to the top. Item 1 appears alone. On answer it settles into a
compact answered row and item 2 rises into focus. The reader looks at one question at a
time, but sees the answered ones accumulating above — which is the in-screen progress the
current form has none of.

That turns 6 mega-pages into roughly **20 light screens** (14 instruments plus grouped
profile fields), each a coherent unit of 20–40 seconds. It is closer to how these
instruments are meant to be administered than the current wall of items, not further.

Rejected: one question per screen. 85 screens and 85 taps would read as *longer*, not
faster.

## The chapter ending

The most consequential decision here, because a recap must read the reader's own answers
back to them. Each of the eight endings is a small piece of writing that reacts to input,
not a static card.

Two rules govern it.

### 1. Descriptive, never evaluative

No score, no grade, no percentile, no rank — not until all eight chapters are done.

This is not tidiness. `docs/research/usability-test-plan.md` already worries whether
testers *"answer ST-5 and UCLA-3 honestly, or begin optimizing their score"*. If chapter 1
shows a rank, chapters 2–8 are answered by someone who has just learned how the scoring
works, and every number downstream is contaminated. The verdict stays at the end, where it
cannot reach back.

Nothing is lost by it. *"Three single-use plastics a day — about 1,100 a year"* is a
better beat than *"62nd percentile"* regardless.

### 2. Facts must be cited

Fun facts come from the verified `SOURCES` registry and the round documents, under the
same sourcing rule the rest of the app obeys: no reviews, blogs, scale-database entries,
secondary summaries or AI answers as the source.

This is the reuse that makes the research pay twice. Fifteen rounds of verified Thai
population figures currently surface only as percentiles in small type. As chapter facts
they become the delight, and the sourcing standard stays single across the whole app —
which matters, because a reader cannot be expected to tell "flavour" from "finding".

Where no cited fact exists for a chapter, that chapter gets a recap and no fact. It does
not get an invented one.

## What cannot change

Item **wording** and the **five-point response scale** are the instruments. WHO-5,
UCLA-3, Grit-S, CFPB and the rest yield defensible percentiles only when administered as
published, so the binary forced-choice format of the Adobe reference cannot transfer.

Everything around the question is open, which is nearly the whole surface: layout, motion,
colour, pacing, one-tap answering, Lumi, reveal rhythm, the ceremony. The scale may even
render as five growing dots or five expressions, provided the published anchor labels stay
visible.

## Phases

**Phase 0 — Direction.** Lock Lumi's look and voice; define the eight chapter identities
(a colour and a one-line theme each); write the recap and fact for one chapter. No code.

**Phase 1 — One chapter, prototyped and disposable.** A standalone page running Environment
end to end: Lumi's opening beat, the instrument screens with the reveal rhythm, the recap,
the region completing. Not wired into the app, not tested, deliberately throwaway. **This
is the decision point** — the pacing is judged by feel here, where abandoning it is cheap.

**Phase 2 — The flow engine.** Replace the six-step pager with a chapter/screen model.
The real work, and the first phase where the repo's usual standards apply in full.

**Phase 3 — Lumi and the ceremony.** Poses, voice lines, the map assembling region by
region.

**Phase 4 — One answering language.** Extend the pattern to the deep assessment and the
monthly review.

Parallel agents are worth using in Phase 0, where several directions can be explored at
once and chosen between. Phases 2–4 want a single coherent hand.

## Open dependencies

- **Lumi is not visually locked.** The four assets in `assets/` disagree — `lumi.png` is
  black-haired, `lumi_focused.jpg` purple-haired. A reactive companion needs a consistent
  character across several expressions. Phase 1 can proceed on the existing `lumi.png`
  plus placeholders; Phase 3 cannot.
- **Fact inventory is unknown.** Roughly 20–30 facts are wanted across eight chapters; how
  many the existing research can actually supply has not been counted. Worth doing before
  Phase 0 commits to a fact per chapter.
- **Asset weight.** The app is a no-build PWA with a versioned cache. Code-drawn regions
  keep this cheap, which is part of why the hybrid was chosen.

## References

Both driven hands-on on 2026-09-11, not summarised from memory.

- **mycreativetype.com** — one binary question per screen, full-bleed colour changing per
  question, a full-screen animated scene after each answer with **Mute and Skip** controls,
  dot-row progress, 15 questions. Taken from it: pacing, and the reward interstitial.
- **ooopenlab.cc quiz `tnktDkj2opl5kCRUunbC`** — character-first; a pixel avatar centre
  screen changing expression and pose per question, narrative framing (*"Welcome to Job
  Hunting Village"*), a **diegetic** progress bar — a road with a marker travelling it while
  the background scene scrolls — and large stacked pill answers. Taken from it: the
  companion, the world, and progress as part of the fiction.

Neither's question format transfers. Both their pacing ideas do.
