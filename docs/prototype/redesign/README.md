# Redesign prototype (disposable)

Status: **waiting for the owner's phone check.**

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

All three screens have EN / ไทย in the header.

## Rules it keeps

- **Quiet zones.** The Still Water and The Commons don't burst, type, spring or slide in, on any screen. Their journey question arrives whole, and a line says the stillness is on purpose.
- **The answer doesn't change the motion.** Every option moves the same way. The quiet chapter has no press at all.
- **Answer pills aren't magnetic.** Only the recreation's call-to-action pills lean toward the pointer. Choices don't.
- **Reduced motion** shows every screen in its final state. The chapter ending is simply there, with no burst.
- **Thai types by whole characters** (`Intl.Segmenter` graphemes), so a vowel or tone mark is never split off.
- **Sample data.** The Home numbers and the news feed are invented, and a badge on every screen says so. The page never reads the app's storage. The only thing it saves is the language choice, under its own key `lbi_proto_lang`.

## What's copied and what's new

Chapter names, themes, colours, motifs, blurbs, questions and answers are copied from the app in EN and TH (`views/journey.js`, `aspects.js`, `surveys.js`, `th.js`). The emblems and photographs are the app's own `assets/`.

The headlines, the "how it works" lines and the Home feed are **new prototype copy**, marked `NEW` in `content.js`. The Thai for them hasn't been reviewed yet.

The Anton wordmark font comes from Google Fonts. Inter and Sarabun are the app's self-hosted files.

## Checks

```bash
node docs/prototype/redesign/check.mjs http://127.0.0.1:8181
```

18 checks: no sideways scroll on a phone or a laptop on any screen, Thai grapheme typing, the press spring on answer pills, the modal chapter ending, a burst in The Market but none in The Still Water, the progress star, the reduced-motion final states, and no page errors or failed requests.

## Not in it yet

The weekly review, goals, compare, aspect pages, profile, method, year in review, Lumi, the share card, and the mental-health notice. Each will get its own mapping once this frame is approved.
