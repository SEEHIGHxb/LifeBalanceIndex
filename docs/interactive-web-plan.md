# LBI: interactive and creative web plan

Status: **approved 2026-09-23.** Phase 0 has started; the symbol definitions are in [`identity/symbols.md`](identity/symbols.md).

**Look updated the same day to "Sage & Gilt"** (owner's style reference: soft sage and gold line art). The structure below stands: the star mark, the sparkles, the eight regions and every motion rule. The flat navy stickers, bright region hues and the Mitr font are replaced; `identity/symbols.md` v2 is the source of truth for the look.

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
| Recurring particle | **Glints**: 4-point sparkles, gold in every region (v2), 3 spin frames. Used as bursts, the ring caret and letter placeholders. They are the star dots already printed on Lumi's collar |
| Character | **Lumi.** Her character anchors are fixed; her drawing style is open again under Sage & Gilt (see decision 2) |
| Symbol language | **Sage & Gilt**: flat sage and pale-gold fills, fine outlines of their own colour, thin inner detail lines, an optional gold halo or sparkles. Region emblems are illustrations with new subjects (symbols.md S8) |
| Type | **Cormorant Garamond** (Latin) and **Trirong** (Thai) display serifs. Body text stays Inter/Sarabun |
| Density | **One identity, two densities.** The journey is loud (region colour, big type, Lumi). The dashboard and methodology stay quiet paper; only the mark and region emblems cross over |

- **Palette.** Sage, gold and cream, measured from the owner's reference (tokens and contrast in `identity/symbols.md`). Regions keep only their pale shipped `wash` as a background tint and are told apart by their illustrated subject.
- **Font budget.** The Inter and Source Serif weight files are byte-identical copies of one variable font. Deduping them saves about 150 KB, which pays for Cormorant Garamond and Trirong.
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
| **0 Direction** (no app code) | Written definitions for the first 10 symbols ([`identity/symbols.md`](identity/symbols.md)), then a style tile drawn from them ([`identity/style-tile.html`](identity/style-tile.html)). Region emblems: **done**, made with Gemini ([`identity/emblems/`](identity/emblems/)). Lumi: redraw in Sage & Gilt with Gemini ([`identity/gemini-prompts-lumi.md`](identity/gemini-prompts-lumi.md)) | Owner approves the symbol sheet, the style tile, the emblem set and Lumi's style | M |
| **1 Prototype** (disposable, outside the app) | One phone-first page: tug-the-ring and burst, a chapter ending lighting up with recap cards, a Thai glint title and the Lumi caret, a rough ring → radar. A manual-clock harness through Playwright `addInitScript` (the CSP blocks inline injection) | Owner plays it on the reference devices and approves the feel. Numeric motion checks pass. The reduced-motion variant is reviewed | M |
| **2 Foundation** | `motion.js` (loop, spring, follow, scrub; injected clock) and `views/motion-mount.js` (AbortController lifecycle, disposed in `renderActiveTab`). Clock in `tests/dom-stub.mjs`. Seven guards: every animation has a reduced path; no motion on items; no global listeners outside the mount; transform/opacity only; `APP_SHELL`/`?v=` parity; frame budget under 4× CPU; the Thai splitter keeps marks attached. The in-app Reduce-motion toggle | Tests and lint green; no visible change; `motion.js` coverage ≥ 80 % | M |
| **3 Journey moments** | First release: region lights up, recap cards, neutral settle, emblem tab icons. Second: the Lumi caret and glint titles. Third: tug-the-ring | e2e runs pass with motion and with reduced motion; TalkBack/VoiceOver pass; contrast guards hold | M |
| **4 Art set and ceremony** | `sprites.svg` (Star, glints, emblems, vector Lumi), the ring → radar ceremony, the share card as the map | Asset budget met: motion JS ≤ 6 KB, SVG sprites ≤ 25 KB, and each raster emblem or Lumi image ≤ 20 KB at its display size (WebP, lazy-loaded). No layout shift | L |
| **5 Spread** | Weekly review, monthly ghost ring, year-review flipbook, quiet dashboard touches, one answering language | Guards hold without new exceptions | M |

**Landed in v88 (2.36.0), 2026-09-24:**
- The quick wins: the Thai typewriter now types graphemes (`graphemes()` in `i18n.js`), the font dedupe (about 580 KB), and `100vh` → `dvh`.
- The onboarding fix queue that had to land before Phase 3: recaps never state answers that weren't given, drafts survive releases (`DRAFT_SCHEMA`), a resume lands on the first incomplete screen, and focus follows the screen.
- Checked and dropped: the suspected relationship-switch bug on the RAS screen is unreachable. The relationship select lives on the prologue, so nobody can change it while standing on RAS.

**Phase 0 status:** the emblems are done (Gemini). Lumi is parked (GPT busts as the fallback, SVG takes in `identity/lumi-concepts.html`). Phase 1 does not wait for her.

**Phase 1 status (2026-09-24):** built in [`prototype/phase1/`](prototype/phase1/README.md). It has all four moments, EN/TH, and the reduced-motion paths. `check.mjs` runs 51 numeric checks through a manual clock, and all 51 pass. **The owner played it on a phone and approved the feel on 2026-09-24, all four scenes as built.** Phase 1 is done; Phase 2 is next.

**Phase 1 independent review (2026-09-24):** no critical issues, one high, one medium and four low; `check.mjs` 51/51 on the reviewer's own run. The prototype is left as the approved reference and is not patched. Two things the review found about it:
- It has never been linted: `biome.json` ignores `docs/**`.
- Its CSP is stricter than the app's (it has no `'unsafe-inline'`), not the "same plus fonts" its README says.

**Phase 2 carries these forward from the review:**
1. **Combine abort signals correctly everywhere.** The prototype's `either()` falls back to one signal where `AbortSignal.any` is missing (Safari before 17.4), so a spring outlives its scene. `motion.js` either subscribes to both signals and aborts a shared controller, or uses `AbortSignal.any` only where it exists. A test covers the fallback.
2. **Separate render, park and animate.** `sceneEnding` and `sceneRadar` are about 95 lines each and mix all three. `motion-mount.js` keeps them as separate steps, with functions under 50 lines.
3. **Enforce "transform and opacity only" at runtime.** The prototype's check greps the source, which misses `style["left"]` and `cssText`. The Phase 2 guard watches style writes in `tests/dom-stub.mjs` instead.
4. **Controls are at least 44 px, and live readouts are announced.** In the prototype, the segmented toggles and the switch are 40 px, and the drag readout has no `aria-live`.

**Phase 2 status (2026-09-24): built, in v89 (2.37.0).**
- **Motion core.** `motion.js` has an injected clock, `loop`, `animate`, `spring`, `follow` and `scrub`. Every entry point throws unless it is given a reduced path.
- **Lifecycle.** `views/motion-mount.js` keeps one live mount at a time, disposed in `renderActiveTab`. `runScene` renders, then parks, then plays, and renders again if either of the last two throws.
- **Tests.** `tests/dom-stub.mjs` has a hand-driven clock and a log of every style write. The seven guards are in `tests/motion-guards.test.mjs`. The frame budget is `tests/motion-budget.mjs`, run in CI's smoke job (p95 16.8 ms at 4× CPU locally, against 34 ms).
- **Reduce motion.** The switch is on Profile. It only adds reduction and is mirrored to the sheet.
- **The four carry-forwards:**
  - Items 1 to 3 are built into the code above.
  - Item 4 holds for the one new control: the switch is 44 px, and the page has no live readout yet.
- **An independent review of the Phase 2 diff** found:
  - one high issue: a throwing `update` left the promise pending for ever
  - three medium issues: a delayed zero-length `animate` never landed; the Profile switch had no render test; the guards' comment stripper could hide code after `,//` inside a string
  - one low issue: a throwing `park` left the scene half-parked

  All five are fixed, each with a test.
- **Exit criteria:** tests and lint green; `motion.js` coverage 96.5 % (the target is 80 %); no visible change apart from the switch. Phase 3 is next.

**Phase 3, first release (2026-09-24): built, in v90 (2.38.0).**
- **Region lights up, recap cards, neutral settle.** `views/moments.js` holds the three scenes; `views/onboarding.js` hands them the pieces. Each goes through `runScene`, so the page is always the finished state.
- **The ring's sub-step.** It now moves one step per item answered. The settle's motion depends only on the distance moved. `tests/moments-e2e.mjs` checks that the lowest and highest answers give the same motion, frame by frame, under a hand-driven clock.
- **Fixed on the way:** the ending screen read one region fewer than the screen before it.
- **Tab icons (an owner call made without asking; easy to change):**
  - Overview → the Lumi Star
  - Weekly Review → The Lookout
  - Goals → The Workshop
  - Side by Side → The Commons

  All four use the one-line motifs, per symbols.md S8.
- **Still to check:** TalkBack and VoiceOver need the owner's phone. The second release (Lumi caret, glint titles) and the third (tug-the-ring) are next.

## 7. Decisions (approved 2026-09-23)

| # | Question | Decision |
|---|---|---|
| 1 | Identity direction | **Star Atlas structure with the Sage & Gilt look** (revised 2026-09-23) |
| 2 | Lumi's form | **Redrawn in Sage & Gilt line art** (owner, 2026-09-23): a sage coat with gold trim; her blue-black hair stays as the one colour outside the palette. Made with Gemini from [`identity/gemini-prompts-lumi.md`](identity/gemini-prompts-lumi.md) |
| 3 | Two densities or unify | **Two densities.** The dashboard and methodology stay quiet paper |
| 4 | Region critters | **None for now.** Lumi is the only living thing; glints are the particles |
| 5 | Display font | **Cormorant Garamond + Trirong** (replaces Mitr), funded by the font dedupe |
| 6 | First surface | **Onboarding chapter boundaries** |
| 7 | In-app Reduce-motion toggle | **Yes**, in Profile. It overrides the OS setting in the "reduce" direction only |
| 8 | Reference test devices | Layout is designed for **every phone width** (320 px and up). The devices are only for the performance check: if the owner names none, Chrome's 4× CPU throttle plus iOS Safari stand in |

| 9 | How symbols are made | **Gemini** (owner, 2026-09-23). The Gemini set was accepted over the SVG tests; masters in `identity/emblems/`. SVG stays only for the animated star and sparkles |

Settled without asking: no device tilt, and no new libraries (the CSP blocks CDNs; `motion.js` is hand-written).
