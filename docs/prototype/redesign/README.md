# Redesign prototype (disposable)

Status: **third batch built: every screen on the confirmed map is now in the prototype.** The owner confirmed the map for the rest of the app on 2026-09-25 ("just proceed") and passed the first two batches the same day ("prototype look nice. We can proceed.").

This is LBI's content inside the approved humanmade-style recreation (`hm-recreation-v7`). The recreation is the frame: its layout, navigation, pacing and motion stay. LBI supplies everything that fills it. The owner confirmed the section-to-content map on 2026-09-24, including two decisions:
- The burger menu replaces the bottom tab bar.
- The scoring engine is unchanged.

Nothing in the app imports this folder, and the deploy step doesn't ship it.

Open it with the dev server running (`.claude/launch.json`, port 8181): <http://localhost:8181/docs/prototype/redesign/>

## What's in it

| Screen | Recreation section | LBI content |
|---|---|---|
| **Landing** `#/` | Hero lockup that follows the pointer and bursts | The gilt star, LIFE BALANCE / INDEX, and a burst of the 8 aspect motifs. On a phone, tap the star. |
| | Travelling typed headline (pinned on desktop; types once on a phone) | "Eight parts of one life, measured against the evidence." The caret is the gilt star. |
| | Statement | How it works: the journey, the cited benchmarks, local-first storage |
| | Pinned shape growing 0.725 → 1 behind sliding cards | A huge dark star behind the 8 regions: emblem, photograph, theme and aspect tag |
| | Photo band wipes | The Market, The Highlands and The Lookout |
| | Big pill | Start the journey |
| **Journey** `#/journey` | Mission panel | One real question per screen: CFPB (The Market), WHO-5 (The Still Water) and GSE-6 (The Workshop). The question types itself and the answers spring in. |
| | Photo-band wipe and burst | The chapter ending: the region wipes up over the question, then its motifs burst |
| | Header nav pill | Becomes the progress star, with one petal lit per chapter in its hue |
| **Home** `#/home` | Hero lockup | *Your* star (the radar shape of the sample scores), YOUR STAR, and the Balance Index |
| | Headline | Strongest and weakest region |
| | Pinned shape and cards | Your star's shape, huge, behind the 8 regions with their scores |
| | News list | Recent weekly reviews, goals and the journey |
| | Sticker wall | Goals as die-cut stickers |
| | Big pill | This week's check-in |
| **Menu** | Menu where every letter starts as a duck | The app's navigation. Every letter starts as a small gilt star. Items not built yet are dimmed and marked. |
| **Aspect page** `#/aspect/<region>` (second batch) | Hero lockup | The region's emblem in the star's place, its name and score. It follows the pointer and bursts only that region's motifs. |
| | Travelling typed headline | The score, and the standing: "Ahead of 41% of people like you", or "Not ranked — on purpose." |
| | Statement | What the aspect measures (the app's blurb) and the region's theme |
| | Pinned shape and cards | Your star behind the component cards (the app's component names, with sample scores) |
| | Photo band, news list, big pill | The region's photograph; the weekly trend; Lumi's tip for that aspect, and the pill to the Weekly Review (the Re-assessment for the two quiet regions) |
| **Weekly Review** `#/review` (second batch) | Mission panel, one per region | The app's real review fields, one region per screen: The Market, The Highlands, The Workshop, The Crossroads, The Wildwood. The heading types itself and the fields rise in. |
| | Photo-band wipe | The next region's photograph wipes up as the divider between screens |
| | Chapter ending | "Reviewed this week." Every reviewed region bursts, and the line counts the numbers you changed |
| | News list | Past reviews |
| **Goals** `#/goals` (second batch) | Hero lockup | WEEKLY PLEDGES and how many are active |
| | Sticker wall | Your pledges as die-cut stickers that stick on as they come into view, with the streak and a Remove that asks first |
| | Pinned shape and cards | The app's pledge catalog, each card with its weekly target and ADD PLEDGE |
| **Home notice** (third batch) | A still panel above the hero | The app's duty-of-care notice with the hotlines 1323, 02-113-6789 and 1669 as tap-to-call links. It never moves. The app shows it only when the WHO-5 or ST-5 answers cross the screening cutoff; the prototype always shows it, and says so. |
| **Side by Side** `#/compare` (third batch) | Hero lockup, typed headline | Your star, SIDE BY SIDE, and "Not a ranking. Where you differ, not who is ahead." |
| | Statement | Comparison codes as in the app: your code with COPY, and a field to paste someone's (the app's own v2 format and error messages) |
| | Two stars over each other | Pick whose star lies over yours; it slides into the new shape the same way whoever is picked. The population average is dashed behind. |
| | Pinned shape and cards | One card per aspect: the population average, you, then everyone in the order they were added, each marked ▲ or ▽ against the average. Never sorted, no totals. |
| | Statement | What each person has cleared that you have not yet (the app's line) |
| **Share card** `#/share` (third batch) | A die-cut sticker poster | Your radar as a sticker on a 9:16 card that sticks on as the page opens; Light or Dark, and Shape only, Aspect names or Everything. Share and Save image are the full build's. |
| **Your year** `#/year` (third batch) | Hero lockup | YEAR and the level number in Anton |
| | Typed headline, statement | When the year closes and the weeks left; this year's points |
| | News lists | Movement this year, and years filed |
| **Profile** `#/profile`, **Methodology** `#/method` (third batch) | Text only, no motion | The profile facts as rows; what each score is built from, who it is compared with, and what the app does not measure |
| **Lumi** (the header's star, third batch) | A small panel | The app's tip for your lowest aspect types itself in, with a link to that region |

Every screen has EN / ไทย in the header.

## Rules it keeps

- **Quiet zones.** The Still Water and The Commons don't burst, type, spring or slide in, on any screen. Their journey question arrives whole, and a line says the stillness is on purpose.
- **The answer doesn't change the motion.** Every option moves the same way. The quiet chapter has no press at all. The Weekly Review's ending bursts every reviewed region, whatever the numbers were, rather than only the regions that moved: bursting for "moved" would celebrate a drop as much as a rise.
- **The quiet regions aren't in the Weekly Review.** The app re-assesses The Still Water and The Commons monthly, so their aspect pages point to the Re-assessment instead. Their pages have no tap burst, no typing and no sliding cards.
- **Side by Side is not a ranking**, as in the app: nothing is ordered by score and no one gets a total. The morph between people takes the same time whoever is picked.
- **The notice never moves**, under any setting.
- **Answer pills aren't magnetic.** Only the recreation's call-to-action pills lean toward the pointer. Choices don't.
- **Reduced motion** shows every screen in its final state. The chapter ending is simply there, with no burst.
- **Thai types by whole characters** (`Intl.Segmenter` graphemes), so a vowel or tone mark is never split off.
- **Sample data.** The Home numbers and the news feed are invented, and a badge on every screen says so. The page never reads the app's storage. The only thing it saves is the language choice, under its own key `lbi_proto_lang`.

## What's copied and what's new

Chapter names, themes, colours, motifs, blurbs, questions and answers are copied from the app in EN and TH (`views/journey.js`, `aspects.js`, `surveys.js`, `th.js`). The emblems and photographs are the app's own `assets/`.

The headlines, the "how it works" lines and the Home feed are **new prototype copy**, marked `NEW` in `content.js`. The Thai for them hasn't been reviewed yet.

The second and third batches reuse the app's own words wherever it has them: the review field labels and their note, the pledge catalog, the component names, Lumi's per-aspect tips, "Reviewed this week.", and the third batch's Side by Side, year, share, profile, methodology and notice copy (`content-more.js`). The sample scores, percentiles, streaks, trend, people, profile and year are invented. Methodology shows the first sentence of each formula; the app's page has the full text.

The Anton wordmark font comes from Google Fonts. Inter and Sarabun are the app's self-hosted files.

## Checks

```bash
node docs/prototype/redesign/check.mjs http://127.0.0.1:8181
```

67 checks:
- No sideways scroll on any screen: on a phone in English, on a phone in Thai (after the headline's star caret has flown off), and on a laptop.
- Thai grapheme typing, the press spring on answer pills, the modal chapter ending, a burst in The Market but none in The Still Water, and the progress star.
- The Market's page against The Still Water's, which stays still.
- The Weekly Review: a bad number is flagged, described and focused; the next region; the modal ending and its count; Escape to the done page.
- Goals: removing asks first, and adding disables the catalog card.
- Home opens with the notice and its three hotlines.
- Side by Side: a bad code is explained and focused; a pasted code adds a person in added order, never by score; removing works; a 20-character name adds no sideways scroll on a phone.
- The share card: a toggle shows the finished card with names and scores.
- Lumi: the tip types itself in, and Escape closes it and returns focus.
- The reduced-motion final states, including the review with no wipe, the share card and Lumi's tip.
- No page errors or failed requests.

The Weekly Review stays done once submitted, as in the app. Reload the page to go through it again.

## Not in it yet

Privacy, and the in-depth assessments beyond the journey's three questions. Profile editing, sharing the image and pasted codes that survive a reload are the full build's. The Phase 3-4 moments in the live app stay until the redesign replaces it.
