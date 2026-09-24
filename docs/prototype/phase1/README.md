# Phase 1: motion prototype (disposable)

Status: **approved 2026-09-24.** The owner played all four scenes on a phone and kept them as built. It belongs to [`../../interactive-web-plan.md`](../../interactive-web-plan.md) §6, Phase 1.

This is one phone-first page outside the app. Nothing in the app imports it, and the deploy step doesn't ship it. Once the feel is approved, Phase 2 rewrites the motion core as `motion.js` and this folder can be deleted.

## What's in it

| Scene | What it tries | Signature moment (plan §4) |
|---|---|---|
| 1 Tug the ring | Drag the ring: it follows like a rubber band (at most 60 px). Past 90 px of finger travel it lets go, bursts 8 glints and springs home. Tap or Enter bursts too. | Tug-the-ring |
| 2 Chapter ending | The region's arc fills, the count turns to 1 / 8, the emblem arrives with one burst, the recap lines are dealt 170 ms apart, and the fact card is dealt face down and flips last. **The Still Water** is the quiet-zone variant with no burst. | Region lights up, recap cards |
| 3 Chapter opening | "The Highlands" / "ที่ราบสูง" is spelled in glints, one grapheme cluster at a time. Lumi's line types by grapheme, then the glint caret arcs into the ring marker. | Glint title, star caret |
| 4 Ring to radar | The ring hands over to the octagon it stands on. Each region grows to its score in radar order (900 ms, 45 ms stagger, the S1 curve) while the grid blooms from 0.725 to 1, then one burst. Play and Skip. | Ring unfolds into the radar |

The header has EN / ไทย, a ¼× speed for inspecting the motion, and a **Reduce motion** toggle. The toggle can only add reduction; it never overrides the device setting (plan decision 7). With reduced motion on:
- the ring doesn't follow the finger
- bursts fade in place with no travel
- the chapter ending and the radar are one short cross-fade
- the opening shows its end state at once

Lumi is parked, so her medallion is the S1 star for now.

## Rules it keeps

- **Final state first.** Each scene renders its finished markup, then parks the pieces at their start pose in the same task and animates toward the markup. If the script fails, the page is still correct.
- **Transform and opacity only** for style writes. The two exceptions are SVG geometry attributes: the ring's `stroke-dashoffset` and the radar polygon's `points`. That's one 8-point shape, so it's cheap.
- **Thai.** Titles and Lumi's line split with `Intl.Segmenter` graphemes, so ที่ and สู never come apart.
- **Quiet zones.** There is no burst in The Still Water.
- **Touch first.** Every drag has a tap and a keyboard form. There is no hover feedback.
- **The CSP matches the app's** (`default-src 'self'`), except that it also allows Google Fonts, so the owner sees Cormorant Garamond and Trirong before they are self-hosted in Phase 4.

## Numeric checks

With the dev server running (`.claude/launch.json`, port 8181):

```bash
node docs/prototype/phase1/check.mjs http://127.0.0.1:8181
```

It checks 51 things:
- **Manual clock.** Time is driven by hand, through Playwright `addInitScript`, because the CSP blocks inline injection.
- **Tug.** Rubber band, spring settle under 1 s, snap at 90 px, burst geometry (8 particles on the star angles, 70–110 px, removed after 800 ms), and the tap and Enter forms.
- **Chapter ending.** Card stagger (170 ms), fact-card order and flip, and no burst in the quiet zone.
- **Chapter opening.** The Thai cluster split, and the caret landing on the ring marker.
- **Radar.** Every vertex lands exactly on its score, in radar order; Skip works.
- **Reduced motion.** Every reduced path.
- **Style writes.** Transform and opacity only.
- **Frame budget.** A p95 frame under 34 ms with Chrome at a 4× CPU throttle, for the radar, the ending and the opening.

## For the owner

Open the published link on your phone and play each scene. The "What to judge" notes under each one list the questions. For each scene the answer is keep, change (say what), or drop.
