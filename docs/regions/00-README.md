# The eight regions — chapter-plate prompt kit for ChatGPT

Status: **READY TO GENERATE — written 2026-09-15.** No images produced yet. The
onboarding flow currently shows a flat region colour and no plate; the markup and CSS for
the plate are deliberately NOT written until the first image exists, so the band height and
crop can be tuned against real art rather than guessed.

## What these are for

Each of the eight chapters gets one wide illustrated plate at the top of its screens —
a chapter plate, the way an illustrated book opens a chapter. It sits inside the card,
above the region banner, at full opacity.

**Why a plate and not a page background.** Measured on the real layout: the card covers
77% of the viewport width on a 1280px desktop and **91% on a 375px phone**, and it is 88%
opaque, so a painted page background shows as two 16px slivers on a phone dimmed to 12%.
The plate is the one placement where the art is fully visible on every device and never
sits under body text.

## The order

Eight files, pasted **one after another into a single ChatGPT conversation**:

| Paste | File | Region | Aspect | Accent | Ground |
|---|---|---|---|---|---|
| 1 | `01-the-market.txt` | The Market | `finance` | `#d9a441` | `#f2e2bb` |
| 2 | `02-the-highlands.txt` | The Highlands | `physical` | `#3fa796` | `#d9eeea` |
| 3 | `03-the-still-water.txt` | The Still Water | `mental` | `#5b8dd9` | `#dde8f8` |
| 4 | `04-the-commons.txt` | The Commons | `relationships` | `#d9738f` | `#f7dfe6` |
| 5 | `05-the-workshop.txt` | The Workshop | `personalGoals` | `#e08a3c` | `#f8e4cf` |
| 6 | `06-the-crossroads.txt` | The Crossroads | `socialContribution` | `#8d6fd1` | `#e6dff8` |
| 7 | `07-the-wildwood.txt` | The Wildwood | `environment` | `#2e9e5b` | `#d8eddf` |
| 8 | `08-the-lookout.txt` | The Lookout | `humanityFuture` | `#5a63b8` | `#e0e2f5` |

The accent and ground columns are the `hue` and `wash` already declared per chapter in
`views/journey.js`. They are in each prompt so the art matches the ring segment, the
banner rule and the page colour that region already paints.

**One chat, not eight.** `01-the-market.txt` is long and self-contained because it
establishes the style. Files 2–8 are short deltas that say "same style, same light, new
location" — the eight have to hang together as one set, and that survives far better
against an image the model can still see than across eight separate long prompts.

## Generate The Market first and lock it

Everything else is judged against it. If its style is wrong, all eight are wrong, and you
will have spent eight generations to find out. Regenerate the first one until the *style*
is right, not just the scene, then keep going.

## What the crop means, and why the prompts insist on it

The plate is a wide band; ChatGPT's widest option is 1536×1024 (3:2). So the picture gets
cropped to a horizontal strip through the middle and the top and bottom are thrown away.
Every prompt therefore asks for the interest in the central horizontal third and open,
uneventful sky and ground at the edges. An image with its subject at the top will lose it.

## What the regions mean

The scene in each prompt is derived from the chapter's own theme line, which is already on
screen in both languages:

- **The Market** — *Where what you have meets what it costs.*
- **The Highlands** — *The climb your body does every day, whether or not you notice it.*
- **The Still Water** — *Where the surface tells you something about what is underneath.*
- **The Commons** — *The people you would call, and the people who would call you.*
- **The Workshop** — *What you are building, and whether you believe you can finish it.*
- **The Crossroads** — *What you hand to people you will never meet again.*
- **The Wildwood** — *The mark a single ordinary day leaves behind it.*
- **The Lookout** — *How far ahead you are looking, and who is standing there with you.*

## Rules the whole set follows

- **No people, no animals, no faces.** Lumi is the only character in this app, and she is
  a separate raster asset. A figure in a region would also read as *the reader*, which the
  neutral region naming was chosen to avoid.
- **No text anywhere.** The app is bilingual EN/TH; baked-in lettering cannot be
  translated, and a signpost with readable words would be English-only art in a Thai UI.
  That is why The Crossroads asks for a signpost with *blank* arms.
- **Nothing place-specific.** The region names were chosen neutral on purpose. Flip this
  if you want a recognisably Thai world — it would be a deliberate change, not a detail.
- **Light and high-key.** These sit above a form. A dark or high-contrast plate turns the
  top of every screen into the loudest thing on it.

## Before you accept an image

- **Squint at it as a thin band.** Crop the middle third and shrink it to about 900×280.
  That is what a reader sees. Detail that only reads at full size is detail you paid for
  and threw away.
- **Check the edges are quiet.** A busy top or bottom edge means the crop will look
  arbitrary.
- **Check it against the region's colour.** Open the app on that chapter and compare: the
  plate and the page wash should look like the same place.
- **Check all eight together at the end.** One image in a different style is more
  noticeable than eight in a mediocre one.

## Where the files go

Save the accepted images as `assets/regions/<slug>.jpg` — `market`, `highlands`,
`still-water`, `commons`, `workshop`, `crossroads`, `wildwood`, `lookout`.

**Convert to JPEG or WebP and keep each under about 200 KB.** ChatGPT returns ~2 MB PNGs;
eight of those is 16 MB added to a PWA that precaches every asset, on an app whose entire
current payload is a fraction of that. Tell me when the first image is in and I will wire
the plate, add them to the `sw.js` precache list and bump the version.
