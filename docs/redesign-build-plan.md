# LBI redesign: building it into the app

Status: **draft for the owner, 2026-09-25.** No app code changes until this is approved.

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

## 3. How the code is organised

- **Motion:** the prototype's helpers go into the existing `motion.js` / `views/motion-mount.js`:
  - spring, tween, loop and typeOut are already there in some form
  - the burst, the sticker spring and the wipe are new

  Everything still goes through the mount's AbortController, so leaving a screen stops its motion.
- **Styles:** the new design gets its own sheets per area (`css/frame.css`, `css/journey.css` and so on), each under 800 lines. `index.css` (3,318 lines now) shrinks release by release until R6 removes it or reduces it to the shared basics.
- **Views** keep returning the final HTML string. Motion only animates toward it, as the plan has always required.
- **Guards to update, deliberately and each with a reason in the test:**
  - **Guard 2** ("modules that render items do not import motion") becomes: the question may type in, and the answer pills may rise, but pressing an answer moves every option the same way.
  - **The motion budget** is "motion JS ≤ 6 KB" today. The prototype's motion is far bigger, so I propose **≤ 20 KB minified for motion code**, measured the same way.
  - **Typography:** the serif stack tests follow whatever replaces Source Serif 4 for headings. Anton has no Thai, so Thai headings fall back to Sarabun, as in the prototype.

## 4. Open decisions for you

1. **What visitors see mid-rollout. My recommendation: ship each release live.** Between R1 and R4, some screens are new and some old inside the new frame, for a few days. The alternative is a hidden preview switch until R4. That keeps the live site all-old, then all-new, but it means running two frames side by side, which costs time and bugs.
2. **The motion budget: approve 20 KB,** or name another number.
3. **The screens with no prototype** (Re-assessment, in-depth assessments, Privacy). **My recommendation: build them straight in R6** from the journey's pattern, and you review them live. The alternative is a short prototype first.
4. **The Thai for the NEW copy** (the prototype's `content.js` and `content-more.js` lines marked NEW) needs your review before the release that ships it. The first one is R2 (the Landing).

## 5. Risks

- **The journey is the most-tested flow:** drafts, resume, focus following the screen and the screening notice. R2 keeps `onboarding.js`'s logic and changes only its markup and motion, and the existing journey, draft and deep-carry tests must pass unchanged.
- **Service worker caching:** every release bumps all version sites together, which `consistency.test.mjs` already enforces.
- **Screen readers:** the TalkBack/VoiceOver pass is still deferred from Phase 3. The new markup keeps the same patterns: hidden full-text copies, `aria-hidden` letters, and focus that follows the screen.
