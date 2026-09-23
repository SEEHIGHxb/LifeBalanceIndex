# Star Atlas: symbol definitions (Phase 0)

Status: **draft v2 for owner approval, 2026-09-23.** It belongs to [`../interactive-web-plan.md`](../interactive-web-plan.md).

**v2 changes the look, not the structure.** The owner chose a soft illustrated style, sage and gold line art, for the whole identity. What stays from v1:
- the star mark
- the sparkles
- the eight regions
- every motion rule

What goes: the flat navy-outline stickers and the bright region hues. The style is called **Sage & Gilt** below.

**Nothing is drawn until its entry here is approved.** Each entry gives:
- subject
- silhouette
- colours
- line
- frames
- motion
- minimum size
- what it must never do

**How the symbols get made: Gemini (chosen by the owner, 2026-09-23).** The SVG tests on the style tile ([`style-tile.html`](style-tile.html)) were flatter than the reference; the Gemini images from [`gemini-prompts.md`](gemini-prompts.md) were accepted. The masters (1024 px WebP) are in [`emblems/`](emblems/). The originals (2048 px JPG) stay out of the repo in `assets/icons/`. The app will get smaller, trimmed copies in Phase 4. The SVG star and sparkles stay as the *animated* forms, because a raster image can't grow per score or spin.

## The style in one paragraph

Soft botanical line art on warm cream. Shapes are filled with flat sage or pale gold, and every shape has a fine, slightly darker line of its own colour, never black or navy. Small inner lines (leaf veins, petal ribs, wood grain) carry the detail; there is no hatching and no heavy shading. A thin gold halo arc or a few small gold sparkles add the "light". The mood is calm, kind and a little ceremonial, like a well-made almanac.

## Shared tokens

These were measured from the owner's reference image. Text contrast is checked against `cream`.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `cream` | `#FBF8F1` | Illustration ground, cards | |
| `paper` | `#F7F5F0` | App page, unchanged | |
| `sage-light` | `#C3CFB6` | Main sage fill | |
| `sage` | `#A8B49C` | Second sage fill, shade | |
| `sage-line` | `#6F7D64` | Lines on sage shapes | 4.13:1 (graphics ≥ 3:1) |
| `sage-deep` | `#56634E` | Selected states, strong UI | 6.02:1; cream text on it 6.02:1 |
| `gold-light` | `#F0D8A8` | Main gold fill | |
| `gold` | `#D9B77A` | Second gold fill | |
| `gold-line` | `#A88752` | Lines on gold shapes | 3.17:1 (graphics only) |
| `label` | `#7A6440` | Serif labels and headings | 5.32:1 (5.18 on `paper`) |
| `halo` | `#EBD3A0` | Halo arcs, glow | decoration only |
| Region `wash` | shipped in `views/journey.js` | Soft backgrounds per region | |

- **Region colour.** Regions no longer have a loud colour of their own. Each keeps its shipped pale `wash` as a background tint, and all illustrations use the same sage and gold. A region is recognised by its subject, not its colour.
- **Line weights.** At a 200-unit illustration box:
  - Outer lines are 1.6 units.
  - Inner detail lines are 0.9 units at 60 % opacity.
  - Caps and joins are round.

## Type

- **Display.** **Cormorant Garamond** 500/600 for Latin and **Trirong** 400/500 for Thai. Both are OFL and self-hostable, and both are classic serifs that match the reference's labels.
- **What this replaces.** It replaces Mitr (decision 5), because a rounded sans display fights the engraved look. The font dedupe still pays for it.
- **Body.** Stays Inter/Sarabun.
- **Colours.** Labels and headings use `label`; body text keeps the app's ink.

## S1. The Lumi Star (the mark)

- **Geometry.** Unchanged from v1.
  - An 8-point star in `RADAR_KEYS` order, finance at the top, so it can morph into the radar.
  - Long points (radius 47) at 0°, 90°, 180° and 270°; short points (31) on the diagonals; valleys at 15.
  - A centre hole of radius 6.
  - Below 32 px the valleys widen to 21 and the short points to 33.
- **Look:**
  - `gold-light` fill with a `gold-line` outline of 1.6 units at 100.
  - Fine engraved lines run from the centre to each tip (`gold-line`, 0.8 units, 50 %).
  - The centre hole has a `sage-line` ring.
  - At 64 px and above, a thin `halo` arc sits behind the upper half.
- **Variants:**
  1. **Gilt.** The version above; the logo and the header.
  2. **Line only.** Used on quiet surfaces.
  3. **Score-stretched.** Used on the share card, with the same rule as v1: tip `18 + 28 × score / 100`, valleys 13, the same base for every point.
- **Motion.** Unchanged from v1.
- **Minimum size.** 16 px. Below 32 px the engraved lines, hole and halo are dropped.
- **Never:**
  - rotated off-axis
  - drawn with 5 or 6 points
  - filled with a region tint
  - used as a rating icon

## S2. Sparkle (the recurring particle)

- **Subject.** A thin 4-point sparkle with concave sides, as in the reference's small gold stars. It is also the dot pattern on Lumi's collar.
- **Silhouette (24-unit box).** `M12 0 Q13 11 24 12 Q13 13 12 24 Q11 13 0 12 Q11 11 12 0Z`, slimmer than v1. It is often paired with one or two gold dots of radius 0.8 nearby.
- **Colours.** `gold` fill with a `gold-line` line at 20 px and above. It is gold for every region; sparkles no longer carry region colours.
- **Frames.** Unchanged: A upright, B rotated 22° at 0.78, C rotated 45° at 0.5, cycling A-B-C-B at 110 ms.
- **Burst.** Unchanged, except that all 8 sparkles are gold. Half of them are replaced by small gold dots, which reads softer.
- **Never:** fired by an answer, burst in The Still Water or The Commons, or drawn over body text.

## S3. Wordmark

- **Subject.** "LBI" in Cormorant Garamond 600, with the S1 Gilt star at the top-right of the "I".
- **Lockups:**
  - **Stacked:** "LBI" over the full name (in Cormorant 500, or Trirong 500 for "ดัชนีสมดุลชีวิต") at 0.3 × the "LBI" size.
  - **Inline:** the star then the name, used in the app header.
  - Language-specific, never both scripts in one lockup.
- **Colour.** `label` for the letters.
- **Clear space.** One star-width.
- **Minimum size.** 14 px cap height.

## S4–S7. Lumi

**Status: redraw in Sage & Gilt line art, draft for owner approval, 2026-09-23.** The owner chose the redraw. She is made the same way as the emblems (Gemini, prompts in [`gemini-prompts-lumi.md`](gemini-prompts-lumi.md)), with her current portraits as the character reference.

Her *character* anchors are fixed and still hold:
- shoulder-length blue-black hair with a cornflower under-layer
- a side-swept fringe over her right brow
- amber eyes
- the Lumi Star hairpin above **her right ear (the viewer's left)**
- a high, closed mandarin collar with gold sparkle dots and a gold toggle
- a knee-length cornflower coat over white trousers and boots
- six expressions (`warm`, `curious`, `encouraging`, `pleased`, `gentle`, `delighted`) that change on screen changes only, never on answers, with no sad or worried state
- five poses (`idle`, `point`, `wave`, `read`, `cheer`)

### How she looks in Sage & Gilt

- **Style.** The same line art as the emblems: flat fills, fine outlines slightly darker than each fill (never black), a few thin inner lines for hair strands and fabric folds, and at most a very soft gradient. Her proportions stay semi-realistic, as in the current portraits, not chibi.
- **Colours:**

  | Part | Colour | Note |
  |---|---|---|
  | Hair | deep blue-black `#2E3547`, under-layer muted cornflower `#6E7FA6`, outline `#1F2533` | **The one colour outside the palette.** Blue-black hair is her strongest recognition cue, so it stays |
  | Coat | sage `#C3CFB6`, shade `#A8B49C`, outline `#6F7D64` | Replaces the cornflower coat |
  | Collar trim, toggle, cuffs, sparkle dots | gold `#F0D8A8` / `#D9B77A`, outline `#A88752` | |
  | Trousers, boots | cream `#FBF8F1` with gold-line outline | |
  | Skin | warm light `#F6E3D3`, outline `#C9A58C` | Soft blush only on `delighted` and `gentle` |
  | Eyes | amber `#C8923E` | |
  | Hairpin | the S1 star in gold | Above **her right ear (the viewer's left)**, tilted 12° clockwise |

- **Background.** Cream `#FBF8F1`, plain, with no scene. The app places her on its own surfaces.
- **Two framings.** A bust portrait (head and shoulders, collar visible) for the six expressions, and a full figure for the five poses. Each set shares one camera, so swapping images never jumps.
- **Minimum size.** The 54 px medallion uses a head crop of the bust. At 54 px the eyes must stay at least 4 px tall and the pin at least 8 px; if they don't, the crop is tightened.
- **Never:** swap the pin's side, change the eye or hair colour, add a sad or worried face, add text, or give her a background scene.

Until the redraw is approved, the app keeps `assets/lumi.png`.

## S8. Region emblems (new subjects)

Each emblem is a single illustration in a 200-unit square with no frame, like the reference tiles. It follows these rules:
- Sage for living and natural things, gold for made things and light.
- One gold accent (a halo arc or sparkles) per emblem at most.
- Labels are set in the app as text below the image, never drawn into it, so they stay bilingual and accessible.

The subjects are **ours, not the reference's**. Where the reference drew scales, a rose and a lotus-with-flame, LBI's regions get their own.

| # | Region · aspect | Subject | Sage parts | Gold parts | Why this subject |
|---|---|---|---|---|---|
| S8.1 | The Market · finance | A woven market basket holding a few coins and a sprig of rice | basket weave, rice stalk leaves | coins, rice grains | The region is "what you have meets what it costs": an everyday basket, not wealth |
| S8.2 | The Highlands · physical | Two soft mountain peaks with a winding path to the top and a rising sun | peaks, grass tufts | path, sun, halo arc | The body as a climb you take at your own pace |
| S8.3 | The Still Water · mental | A lotus opening on a lily pad over three calm ripples | lily pad, ripples | petals, two sparkles | Calm without religious fire. The lotus is local and gentle |
| S8.4 | The Commons · relationships | Two teacups side by side on a small table, their steam curling into one | table, saucers | cups, steam | Being together, not romance (the rose and hands of the reference read as dating) |
| S8.5 | The Workshop · personalGoals | A clay pot half-made on a potter's wheel, with a small tool beside it | wheel base, tool handle | clay pot, tool blade | Goals as something you shape by hand, still unfinished |
| S8.6 | The Crossroads · socialContribution | A wooden signpost with two arms and a lantern hanging from it, lit | post, grass | arms, lantern, glow | Lighting the way for others |
| S8.7 | The Wildwood · environment | A broad tree with visible roots, a fern at its base and two falling leaves, inside a thin circle | canopy, fern, circle | two leaves, sun dapples | The living world around you |
| S8.8 | The Lookout · humanityFuture | A small telescope on a tripod on a hill, pointed at three sparkles | hill, tube body | tube bands, lens, tripod, sparkles | Looking ahead. It replaces the old 5-point star motif |

- **The ring and tab icons.** They keep the shipped one-line `motif` paths for now; a 24 px illustration would turn to mud. After the emblems are approved, each motif is redrawn as a single-line simplification of its new subject. The Still Water's "Wi-Fi" ripples and The Commons' "face" go away then.
- **Minimum size.** 64 px for the illustration. Below that, use the line motif.
- **Never:**
  - region subjects mixed
  - people's faces
  - text inside the image
  - a sad or dark scene (The Still Water and The Commons especially)

## S9. Illustration tile (replaces the sticker frame)

- **Layout.** The illustration on `cream`, with no border and no shadow, and a label beneath it in Cormorant or Trirong `label`, like the reference.
- **Surfaces:**
  - On loud surfaces (chapter openings, endings) the tile sits on the region `wash`.
  - On quiet surfaces it sits on `paper`.
  - Cards around tiles use a 1 px `sage` border and a 12 px radius, with no shadow.
- **Never:** a gradient behind the illustration, a drop shadow, or an outline around the illustration.

## S10. Answer scale

The rules are unchanged from v1: equal size, no colour by value, one identical settle, published text visible, and a 44 px minimum target. Only the colours change:
- **Unselected:** `cream` fill, 1.5 px `sage` border, ink text.
- **Selected:** `sage-deep` fill with `cream` text (6.02:1).
- **Focus:** a 2 px `gold-line` ring, offset by 2 px.
