# LBI: interactive and creative web plan

Status: **approved 2026-09-23.** Phase 0 has started; the symbol definitions are in [`identity/symbols.md`](identity/symbols.md).

This plan extends [`onboarding-flow-redesign.md`](onboarding-flow-redesign.md). That doc's Phase 3 (Lumi and the ceremony) and Phase 4 (one answering language) are folded into the phases below.

It was synthesised from three brainstorms (motion, identity, engineering) and a recreation study of a playful brand site. Those were working notes and are not committed. Everything they found that matters is here.

## 1. The idea in one line

**LBI stops looking like a form and becomes a small world you travel through.** One ownable mark is also the result, one companion is also the UI, and every playful moment rewards progress, never the answers.

The study's lesson is not "add animation". Its identity works for three reasons:
- **One shape repeated at every size.**
- **One character reused as UI:** burst particle, text caret and letter placeholder.
- **The toy sits around the serious content, never on it.**

In LBI, the serious content is the instrument item.

## 2. Non-negotiables (these hold across every phase)

1. **Motion never depends on the answer.** Every point on a scale gets the same settle. There is no sparkle for "Strongly agree", and no magnetic drift on options. Otherwise WHO-5, UCLA-3 and ST-5 get contaminated, which is the exact fear of `research/usability-test-plan.md`.
2. **Lumi reacts to progress, never to content.**
3. **No score, grade or XP until chapter 8.** A burst celebrates finishing a region, not how it went.
4. **Quiet zones.** There are no bursts in The Still Water or The Commons, and nothing moves near the mental-health notice or the hotline.
5. **Items are never typed, pulled or animated while being read.** The existing `q-rise` is the only exception.
6. **Touch first.** Every pointer idea has a tap or drag form. There is no hover-only feedback, no scroll-jacking and no device tilt.
7. **Reduced motion.** Every animation's reduced path is a cross-fade or the end state, never a blink.
8. **Progressive enhancement.** The rendered HTML string is the correct final state, and motion only animates toward it.
9. **Symbols are defined in writing before any drawing.**
10. **Thai.** Any per-letter effect splits text with `Intl.Segmenter` graphemes, never `split("")` or `charAt`.

## 3. Identity: "Star Atlas"

| Element | LBI |
|---|---|
| Ownable mark | **The Lumi Star**: an 8-point star, one point per aspect in `RADAR_KEYS` order. On the share card each point stretches by its score, so **the mark is the result**. It is also Lumi's hairpin, the ring and the radar in one shape |
| Recurring particle | **Glints**: 4-point sparkles in the region colour, 3 spin frames. Used as bursts, the ring caret and letter placeholders. They are the star dots already printed on Lumi's collar |
| Character | **Lumi, redrawn as a flat vector mascot** about 3 heads tall. She keeps her anchors, and expressions are swappable parts |
| Sticker language | Paper-white die-cut, **navy** outline `#1F2A44` (not black), one flat shadow |
| Type | **Mitr** 500/600 display (covers both Thai and Latin). Body text stays Inter/Sarabun; data pages keep their serif headings |
| Density | **One identity, two densities.** The journey is loud (region colour, big type, Lumi). The dashboard and methodology stay quiet paper; only the mark and region stickers cross over |

- **Palette.** The shipped region `hue`/`wash` stay, as fills only; as text on white they fail at 2.25–3.94:1. Each region gains a deep text tone (see `identity/symbols.md` §S8). The Lookout's sticker fill lightens to `#7F88D6` so navy outlines pass 3:1 against it.
- **Font budget.** The Inter and Source Serif weight files are byte-identical copies of one variable font. Deduping them saves about 150 KB, which pays for Mitr.
- **Rejected directions:**
  - **"Storybook Map"** (painted everything): heavy, and it cannot move.
  - **"Riso Almanac"** (two-ink print): dates fast and muddies Thai diacritics.

## 4. Signature moments

| Moment | What happens | Where |
|---|---|---|
| **Tug-the-ring** | Drag the ring. Past about 90 px it snaps, bursts 8 region glints and springs home | Landing and after completion only; never beside answers |
| **Region title spelled in glints** | Each grapheme first appears as a glint, then flips to its letter (Thai-safe) | Each chapter opening |
| **Star caret on Lumi's lines** | Lumi's line types by grapheme. At the end the caret arcs into the ring marker | Lumi's speech only |
| **Ring unfolds into the radar** | Each region grows to its score (0.725 → 1 bloom) | Final ceremony, playable from a button, with Skip |
| **Press-spring** | Primary buttons spring on press (no hover magnet on phones) | App shell, pledges |
| **Recap dealt as cards** | Recap lines are dealt one by one; the fact card flips last | Chapter endings |

## 5. Loud versus quiet

- **Loud (the journey):**
  - landing (tug-the-ring, a wipe of region plates)
  - chapter openings (glint title, Lumi caret)
  - answering (neutral settle and a ring sub-step only)
  - chapter endings (region lights up, recap cards)
  - the final ceremony (ring → radar, one burst)
  - the share card, which assembles as the map
- **Quiet (the app):**
  - tab icons become region emblems with a small hop
  - grades count up only when they changed since your last visit
  - aspect pages get a region header
  - the re-assessment ring shows a faint ghost of last month
  - the year review is a flipbook of monthly radars
- **Never:** answer options, mental-health notices, leaderboard count-ups.

## 6. Phases

| Phase | Scope | Exit criteria | Size |
|---|---|---|---|
| **0 Direction** (no app code) | Written definitions for the first 10 symbols ([`identity/symbols.md`](identity/symbols.md)), then a style tile drawn from them ([`identity/style-tile.html`](identity/style-tile.html)). Vector Lumi: explore with GPT only, then define the chosen sheet and redraw it in SVG | Owner approves the symbol sheet, the style tile and the Lumi sheet | M |
| **1 Prototype** (disposable, outside the app) | One phone-first page: tug-the-ring and burst, a chapter ending lighting up with recap cards, a Thai glint title and the Lumi caret, a rough ring → radar. A manual-clock harness through Playwright `addInitScript` (the CSP blocks inline injection) | Owner plays it on the reference devices and approves the feel. Numeric motion checks pass. The reduced-motion variant is reviewed | M |
| **2 Foundation** | `motion.js` (loop, spring, follow, scrub; injected clock) and `views/motion-mount.js` (AbortController lifecycle, disposed in `renderActiveTab`). Clock in `tests/dom-stub.mjs`. Seven guards: every animation has a reduced path; no motion on items; no global listeners outside the mount; transform/opacity only; `APP_SHELL`/`?v=` parity; frame budget under 4× CPU; the Thai splitter keeps marks attached. The in-app Reduce-motion toggle | Tests and lint green; no visible change; `motion.js` coverage ≥ 80 % | M |
| **3 Journey moments** | First release: region lights up, recap cards, neutral settle, emblem tab icons. Second: the Lumi caret and glint titles. Third: tug-the-ring | e2e runs pass with motion and with reduced motion; TalkBack/VoiceOver pass; contrast guards hold | M |
| **4 Art set and ceremony** | `sprites.svg` (Star, glints, emblems, vector Lumi), the ring → radar ceremony, the share card as the map | Asset budget met (motion JS ≤ 6 KB, sprites ≤ 25 KB); no layout shift | L |
| **5 Spread** | Weekly review, monthly ghost ring, year-review flipbook, quiet dashboard touches, one answering language | Guards hold without new exceptions | M |

**Can land any time, independent of the plan:**
- The Thai typewriter bug: `app.js` types with `charAt`, which detaches tone marks for a frame.
- The font dedupe.
- `100vh` → `dvh` in `index.css`.

**Before Phase 3:** the parked onboarding fix queue touches the same files, so it lands first. That queue is the journey recap null handling, the draft version discard, and the onboarding clamp and focus.

## 7. Decisions (approved 2026-09-23)

| # | Question | Decision |
|---|---|---|
| 1 | Identity direction | **Star Atlas** |
| 2 | Lumi's form | **Stylised flat-vector mascot.** The painted portraits stay as promo art only |
| 3 | Two densities or unify | **Two densities.** The dashboard and methodology stay quiet paper |
| 4 | Region critters | **None for now.** Lumi is the only living thing; glints are the particles |
| 5 | Display font | **Mitr**, funded by the font dedupe |
| 6 | First surface | **Onboarding chapter boundaries** |
| 7 | In-app Reduce-motion toggle | **Yes**, in Profile. It overrides the OS setting in the "reduce" direction only |
| 8 | Reference test devices | **Open.** Needed before Phase 1 ends: one named low-end Android and one iPhone |

Settled without asking: no device tilt, and no new libraries (the CSP blocks CDNs; `motion.js` is hand-written).
