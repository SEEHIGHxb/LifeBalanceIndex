# LBI redesign: building it into the app

Status: **approved by the owner on 2026-09-25**, all four open decisions as recommended (§4). **R1 (the frame) is built, in v96 (2.44.0); R2 (Landing and journey) in v97 (2.45.0); R3 (Home) in v98 (2.46.0); R4 (the weekly loop) in v99 (2.47.0); R5 (the rest of the map) in v100 (2.48.0); R6 (the screens with no prototype) in v101 (2.49.0). The redesign is complete.**

The prototype in [`prototype/redesign/`](prototype/redesign/README.md) is approved. It covers every screen on the confirmed map, and the dark pinned star was turned off on 2026-09-25. This plan moves the real app into that design one release at a time.

Owner decisions this plan follows:
- **The whole app** takes the new design (2026-09-24).
- **The burger menu replaces the bottom tab bar** (2026-09-24).
- **The scoring engine does not change** (2026-09-24).
- **The journey's questions are animated too** (2026-09-24). This replaces non-negotiable 5 of [`interactive-web-plan.md`](interactive-web-plan.md).
- **The Phase 3–4 moments are retired screen by screen** (2026-09-25). Each screen drops its old moments in the release that redesigns it.

## 1. What stays exactly as it is

- **Data:** `state.js`, `scoring.js`, `benchmarks.js`, `surveys.js`, `criteria.js`, `grades.js`, the comparison-code format and the draft schema. A user's saved data works before and after every release.
- **Routes:** the app keeps its own hashes (`#/dashboard`, `#/review`, `#/quests`, `#/leaderboard`, `#/aspect/<key>`, `#/year`, `#/profile`, `#/methodology`, `#/checkin`, `#/deep`). The prototype's names (`#/home`, `#/goals`, `#/compare`, `#/method`) were only its own labels, so existing bookmarks and links keep working.
- **Local-first and the CSP:** nothing loads off-origin. **The Anton wordmark font is vendored** into `assets/fonts/` (SIL Open Font License) instead of coming from Google Fonts as it does in the prototype.
- **The rules:**
  - Quiet regions never move.
  - Motion never depends on the answer.
  - The notice never moves.
  - Reduced motion shows the final state.
  - Thai types by graphemes.
  - Side by Side is never ranked.
  - Every value goes through the existing escaping (`views-xss` tests).
- **Real features the prototype only showed:**
  - share and save the image (`story-card.js` canvas export)
  - profile editing, and backup / restore / delete data
  - pasted comparison codes that survive a reload
  - the in-depth assessments and the Re-assessment
  - the Privacy page

## 2. Releases

Each release is one version bump (`version.js`, the `?v=` busters, `sw.js`'s `CACHE_NAME`, CHANGELOG). Each one ships only when:
- tests, lint and coverage are green
- the e2e and moments-e2e runs pass with and without reduced motion
- EN and TH are checked on a phone and a laptop with no sideways scroll
- the code review has no critical or high findings
- CI passes

| # | Release | Screens redesigned | Old moments retired |
|---|---|---|---|
| **R1** | **Frame** | Header (wordmark, EN/ไทย, Lumi's star), burger menu with the star-letter reveal, footer (Privacy, Methodology, Source, version), page colours and type. The screens inside still have their current content. | The emblem tab icons and their hop (`hopTabIcon`): the tab bar is gone |
| **R2** | **Landing and journey** | The Landing for anyone not onboarded yet. **Every** journey question goes in the mission panel: the prototype showed three, and the app has all the instrument screens. Chapter ending (photo wipe, then the region's burst), and the progress star in the nav pill. | Tug-the-ring (`tug.js`), the journey ring (`journey-ring.js`), glint titles, the Lumi caret, the chapter recap cards and the region light-up |
| **R3** | **Home** | Hero with your star, the headline, the aspect cards with their scores, the news list, the goal stickers, the check-in pill, and the notice above it all, still shown only when the screening cutoff is crossed | The ring → radar ceremony (`ceremony.js`) |
| **R4** | **The weekly loop** | Aspect pages, the Weekly Review (one region per screen, then the ending) and Goals (the sticker wall, and the catalog cards) | Whatever moments remain on these screens |
| **R5** | **The rest of the map** | Side by Side, the share card (the poster design, still exported by the real canvas), Your year, Profile and Methodology (text only), and Lumi's panel | The old floating Lumi bubble; `moments.js` is deleted once nothing imports it |
| **R6** | **Not in the prototype** | The Re-assessment and the in-depth assessments use the journey's mission panel. `privacy.html` uses the frame. | Dead CSS in `index.css`. The docs are updated, and the prototype folder is marked historical. |

R1 and R2 each end with a phone check by you before the next one starts. After that, you review each release as it ships.

**R1 as built (v96, 2.44.0):** the header, the menu with the star-letter reveal, the desktop quick links and the footer, with the Anton font bundled.
- **Lumi's star moves to R5.** It arrives with its panel, because a header star now would duplicate the floating Lumi that R5 retires.
- **Privacy & Data is a line under YOU, not a heading.** A menu line never wraps (a wrap between letter cells could split a Thai word), and at heading size the Thai name is wider than a column.
- **The header is sticky on the page colour, not transparent over the content** as in the prototype. The screens inside are still the old ones until R2–R5.

**R2 as built (v97, 2.45.0):** the Landing, every question in the mission panel, the chapter ending's wipe and burst, and the progress star.
- **The journey moved to `#/journey`.** Before onboarding, every other route shows the Landing, and the menu offers both.
- **"Continue the journey" / "เดินทางต่อ" is new copy** that is not in the prototype. It replaces the Landing's call when a draft exists, so a returning reader is not told to start over.
- **The region photograph is only on the chapter ending.** No text sits on it, so the veil and its contrast table are gone. The secondary ink is held to 4.5:1 on every wash by a test.

**R3 as built (v98, 2.46.0):** Home, with the section-to-content map the owner approved on 2026-09-25 ("Approve map").
- **The labelled radar card is gone.** The hero star is the radar shape of your scores, and each aspect card shows your score beside the population average. `renderRadarChart` in `chart.js` now has no caller in the app; R5 (Side by Side) decides whether it returns, otherwise R6 removes it.
- **The long pages share one layer.** The hero, typed headline, sliding cards and photo band moved from `views/landing.js` into `views/stage-page.js` and `css/stage-page.css` (was `css/landing.css`), which Home and the Landing both use. Full-bleed pages are marked with `body.bleed`.
- **Beside the care notice, Home is still.** No hero motion, no typing, no sliding: the old ceremony's quiet rule, applied to the whole page.
- **The pledge wall drifts with the scroll, not on a clock.** The prototype's wall ran continuously; moving content that plays by itself for more than five seconds needs a pause control (WCAG 2.2.2), and a scroll-linked drift needs none.
- **The news list holds reviews, re-assessments and the journey.** Pledges carry no date, so they are on the wall instead of in the list.
- **`views/moments.js` and `views/ceremony.js` are deleted**, earlier than R5, because nothing imported them any more. The quiet-region rule moved to `views/stage.js`.
- **New Thai copy** for Home (the lines the prototype did not have) is marked in `th.js` and awaits the owner's review.

**R4 as built (v99, 2.47.0):** the aspect pages, the Weekly Review and Goals, with the map the owner approved on 2026-09-25 ("Split the Body screen").
- **The Weekly Review has six screens, not five.** The Highlands asks its nine boxes over two screens (moving, then sleep, water and vegetables); the photograph wipes only when the region changes. All six screens stay in one form, so the submit path is unchanged.
- **The ending replaces the reward pop-up and toast.** Every reviewed region bursts whatever was entered; the words say what moved.
- **The trend is a dated list.** `renderTrendChart` is gone from `chart.js`.
- **Removing a pledge asks on the page.** The page redraws itself after a change and puts focus back on the pledge or the list.
- **New Thai copy** for the three screens is marked in `th.js` and awaits the owner's review.

**R5 as built (v100, 2.48.0):** Side by Side, the share poster, Your year, Profile, Methodology and Lumi's panel, with the map the owner approved on 2026-09-25 ("Approve map").
- **Side by Side replaces the radar chart.** Two stars over each other, the average dashed behind; `renderRadarChart` is deleted. The page gained what the prototype lacked: removing someone, which asks on the page first, and the share button.
- **The share card stays a dialog**, opened from Home and Side by Side, not a `#/share` route. The canvas draws the prototype's poster.
- **Your year keeps the birthday form**; Profile keeps every real field and control; Methodology keeps its full text (the prototype showed first sentences).
- **Lumi speaks only when asked.** The floating bubble and its per-screen tip are gone; the header's star opens the tip for the lowest aspect.
- **New Thai copy** for R5 is marked in `th.js` and awaits the owner's review.

**R6 as built (v101, 2.49.0):** the Re-assessment, the in-depth assessment and Privacy, with the map the owner approved on 2026-09-25 ("Approve map").
- **Both assessments are one scrolling page of mission panels**, one per aspect, not a stepper: the drafts, ids and validation stay exactly as they were. Nothing on them moves.
- **Privacy keeps no script.** It links the frame's sheets and uses the text page's markup directly.
- **`index.css` is the shared basics, 1,696 lines.** The rules no screen used were removed (checked by a pixel comparison of every redesigned page); what is left still styles the instruments, the forms and the aspect pages' shared pieces. Moving those into the area sheets is ordinary maintenance, not part of the redesign.
- **The prototype folder is historical** (its README says so); the app is now the reference.

## 3. How the code is organised

- **Motion:** the prototype's helpers go into the existing `motion.js` / `views/motion-mount.js`:
  - spring, tween, loop and typeOut are already there in some form
  - the burst, the sticker spring and the wipe are new

  Everything still goes through the mount's AbortController, so leaving a screen stops its motion.
- **Styles:** the new design gets its own sheets per area (`css/frame.css`, `css/journey.css` and so on), each under 800 lines. `index.css` (3,318 lines at the start) shrank release by release; after R6 it holds the shared basics (1,696 lines).
- **Views** keep returning the final HTML string. Motion only animates toward it, as the plan has always required.
- **Guards to update, deliberately and each with a reason in the test:**
  - **Guard 2** ("modules that render items do not import motion") becomes: the question may type in, and the answer pills may rise, but pressing an answer moves every option the same way.
  - **The motion budget** is "motion JS ≤ 6 KB" today. The prototype's motion is far bigger, so I propose **≤ 20 KB minified for motion code**, measured the same way.
  - **Typography:** the serif stack tests follow whatever replaces Source Serif 4 for headings. Anton has no Thai, so Thai headings fall back to Sarabun, as in the prototype.

## 4. Decisions (answered 2026-09-25: "accept", "ok we can have more size", "ok", "ok")

1. **What visitors see mid-rollout. My recommendation: ship each release live.** Between R1 and R4, some screens are new and some old inside the new frame, for a few days. The alternative is a hidden preview switch until R4. That keeps the live site all-old, then all-new, but it means running two frames side by side, which costs time and bugs.
2. **The motion budget: approve 20 KB,** or name another number.
3. **The screens with no prototype** (Re-assessment, in-depth assessments, Privacy). **My recommendation: build them straight in R6** from the journey's pattern, and you review them live. The alternative is a short prototype first.
4. **The Thai for the NEW copy** (the prototype's `content.js` and `content-more.js` lines marked NEW) needs your review before the release that ships it. The first one is R2 (the Landing).

## 5. Risks

- **The journey is the most-tested flow:** drafts, resume, focus following the screen and the screening notice. R2 keeps `onboarding.js`'s logic and changes only its markup and motion, and the existing journey, draft and deep-carry tests must pass unchanged.
- **Service worker caching:** every release bumps all version sites together, which `consistency.test.mjs` already enforces.
- **Screen readers:** the TalkBack/VoiceOver pass is still deferred from Phase 3. The new markup keeps the same patterns: hidden full-text copies, `aria-hidden` letters, and focus that follows the screen.
