# Star Atlas: symbol definitions (Phase 0)

Status: **draft for owner approval, 2026-09-23.** It belongs to [`../interactive-web-plan.md`](../interactive-web-plan.md).

**Nothing is drawn until its entry here is approved.** Each entry gives:
- subject
- silhouette (in units of its own box)
- colours
- line weight
- frames
- motion
- minimum size
- what it must never do

The style tile ([`style-tile.html`](style-tile.html)) draws S1, S2, S3, S8, S9 and S10 exactly as written here. S4–S7 (Lumi) are defined here but not drawn yet. Lumi is a character redesign, so she goes through a GPT exploration sheet first, as agreed in the plan.

## Shared tokens

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `ink` | `#1F2A44` | Every outline; text on stickers | 13.09:1 on paper |
| `paper` | `#F7F5F0` | Page, unchanged from the app | |
| `diecut` | `#FFFDF8` | Sticker border, Lumi's whites | |
| `gold` | `#F2B632` | The Star, glints on Lumi, trim | ink on gold 7.82:1 |
| `cornflower` | `#5A78C4` | Lumi's jacket, Star facet, quiet-surface accent | ink on it 3.34:1 (outline only, never text) |
| Region `hue` / `wash` | shipped in `views/journey.js` | Fills only | |
| Region `deep` | see S8 | Region-coloured text | ≥ 5.43:1 on paper |

## S1. The Lumi Star (the mark)

- **Subject.** An 8-point star, one point per aspect, in `RADAR_KEYS` order clockwise from the top:
  - finance (top), physical, mental, relationships
  - personalGoals (bottom), socialContribution, environment, humanityFuture
  - The point angles match `radarPoints` in `chart.js` exactly, so the mark and the radar can morph into each other.
- **Silhouette (100-unit box, centre 50,50):**
  - **Long points** at 0°, 90°, 180° and 270° reach radius 47.
  - **Short points** on the diagonals reach radius 31.
  - **Valleys** sit at radius 15, halfway between the points.
  - **Centre hole:** radius 6, the "you are here" of the ring.
  - **Highlight:** one `diecut` dot, radius 2, on the gold (left) flank of the top point (at 48.6, 26). On the blue facet it read as a hole, and the points are slim, so a larger dot would cross the outline.
  - The four long points are Lumi's existing 4-point hairpin; the four short points are what makes it the mark.
- **Colours.**
  - Solid: `gold` fill, `ink` outline.
  - Facet: the right half of each long point is `cornflower`, which carries over the blue facets of the painted pin.
  - Mono: `ink` or `diecut` only.
- **Line.** Outline is 3 % of the box (3 units), never under 1.25 px on screen, with round joins.
- **Small form (below 32 px).** The valleys widen to 21 and the short points to 33, because the full-size proportions turn wiry at icon sizes (seen on the style tile).
- **Variants:**
  1. **Solid.** The logo, the app icon and the header.
  2. **Outline.** Used on quiet surfaces.
  3. **Score-stretched.** Used on the share card:
     - Every point uses the *same* base, tip radius `18 + 28 × score / 100`, with the valleys fixed at 13.
     - The long/short rhythm is dropped here, so no aspect looks privileged by its shape before any score is applied.
     - A score of 0 still leaves a nub; the displayed ceiling of 99 is respected.
- **Motion:**
  - Idle: none.
  - The highlight dot may play the glint frames (S2) once, when the mark first appears on a screen.
  - Score-stretched: the points grow from 0 to their score over 900 ms using `cubic-bezier(.2,.9,.25,1)`, in radar order with a 45 ms stagger.
- **Minimum size.** 16 px. Below 32 px the centre hole and highlight are dropped. Below 24 px the facet is dropped.
- **Never:**
  - rotated off-axis (finance must point up)
  - drawn with 5 or 6 points
  - drawn in a region hue (a star in one region's colour would read as that region "winning")
  - used as a rating icon

## S2. Glint (the recurring particle)

- **Subject.** A 4-point sparkle with concave sides. These are the gold star dots already printed on Lumi's collar and her earring.
- **Silhouette (24-unit box).** `M12 0 Q13.4 10.6 24 12 Q13.4 13.4 12 24 Q10.6 13.4 0 12 Q10.6 10.6 12 0Z`. The waist is 1.4 units from the centre lines.
- **Colours.** Region `hue` fill, or `gold` for anything that is not a region. There is no outline below 20 px; above that, a 1.5-unit `ink` outline.
- **Frames.** Three stacked poses, switched with `step-end` like the study's duck sprites:
  - **A:** upright, scale 1.
  - **B:** rotated 22°, scale 0.78.
  - **C:** rotated 45°, scale 0.5.
  - The cycle is A-B-C-B at 110 ms a frame.
- **Motion:**
  - **Burst.** 8 glints, one per region hue in radar order, fly out along the 8 star angles.
  - Distance is 70–110 px (seeded jitter), over an 800 ms life.
  - Scale shrinks from 1 to 0.3 on an ease-out.
  - Opacity fades from 0.5 of life.
  - They draw *behind* the card they burst from.
- **Minimum size.** 8 px.
- **Never:**
  - fired by an answer
  - burst inside The Still Water or The Commons
  - drawn over body text
  - used as a bullet point in data views

## S3. Wordmark

- **Subject.** "LBI" in Mitr 600, with the Lumi Star (S1 solid) set as a companion at the top-right of the "I".
- **Silhouette:**
  - **Star size:** its height is 0.62 × the cap height.
  - **Star position:** its centre sits on the cap line, with its left point touching the right side bearing of the "I".
  - **Tracking:** −1 %.
- **Lockups:**
  - **Stacked:** "LBI" over the full name, set in Mitr 500 at 0.26 × the "LBI" size.
  - **Inline:** the Star (at 1.15 × the cap height) then the full name, used in the app header.
- **Language.** The full name is locale-specific ("Life Balance Index" or "ดัชนีสมดุลชีวิต"), never both in one lockup. Thai lockups get a line height of 1.6 so the upper vowel and tone marks clear the line above.
- **Clear space.** One star-width on every side.
- **Minimum size.** "LBI" cap height of 14 px.
- **Never:** letter-by-letter animation of "LBI", or outlined text.

## S4. Lumi head, neutral front (the reference for S5–S7)

These anchors are taken from `assets/lumi_current_design/warm.png`, `full_body.png` and the other portraits. Where the portraits disagree, the majority wins, and the disagreement is noted.

- **Proportions.** The whole figure is **3 heads tall**. The head is 0.92 wide to 1 tall, with a soft pointed chin.
- **Hair:**
  - **Shoulder-length.** The ends sit at the shoulder line. Six portraits show this length; `full_body.png` alone shows waist-length, and is treated as drift.
  - **Colour:** blue-black `#232238`. The lower ends show a `#3E5FC4` under-layer on both sides.
  - **Fringe:** a side-swept lock falls across **her right brow (the viewer's left)**.
- **Eyes:**
  - Large, set 55 % down the head, 22 % of the head height each, with centres 0.34 head-widths apart.
  - Iris `#C27A2C` (amber), pupil `#3B2217`, and two `diecut` highlights, the upper one larger.
  - Lashes are a single thick upper lid line in `ink`.
- **Skin:** `#F3D2BF`. Blush is `#F2A7A0` at 60 % opacity, as two ovals.
- **Hairpin:**
  - The Lumi Star (S1 solid), sitting above **her right ear (the viewer's left)**, the same side as her earring in every portrait.
  - The identity brainstorm said "left ear"; the portraits show otherwise.
  - The pin is tilted 12° clockwise.
- **Earring:** a small gold glint (S2) hanging from her right ear. It is only drawn at 96 px head height or more.
- **Line.** The outer outline is 1.25 % of the figure height in `ink`. Inner lines (fringe, mouth) are half that. There is no cel shading except one skin shade `#E3B29C` under the fringe and the chin.
- **Minimum size.** The 54 px medallion shows the head only. At 54 px the eyes must be at least 4 px tall and the pin at least 8 px, or the head crop is enlarged.
- **Never:** swap the pin's side, change the eye colour, or be drawn from the back in the app.

## S5. Lumi expression parts

The six states from `docs/lumi/` become brow, eye and mouth swaps on the same S4 head:

| State | Brows | Eyes | Mouth | Extra |
|---|---|---|---|---|
| `warm` | relaxed arcs | open, lids lowered 15 % | closed smile | none |
| `curious` | her left brow raised | wide open | small neutral line | head tilts 6° |
| `encouraging` | lifted in the middle | open | open smile | none |
| `pleased` | relaxed | closed happy arcs | wide closed smile | none |
| `gentle` | inner ends raised slightly | half-lidded, looking down | small soft line | blush at 40 % |
| `delighted` | high arcs | closed happy arcs | open laugh | 3 gold glints around the head |

- **Motion.** A part change is a 160 ms cross-fade.
- **When the state changes.** Only on a *screen* change, never in response to an answer (non-negotiable 2). `gentle` holds for all of The Still Water.
- **Never:** a sad, worried or disappointed state. Lumi does not react to how someone is doing.

## S6. Lumi poses

- **Poses:**
  - `idle`: arms relaxed.
  - `point`: her right arm is raised, pointing at the ring.
  - `wave`: used in the prologue.
  - `read`: she holds a small card, used for the recap.
  - `cheer`: both arms up. Used only at the end of the journey.
- **How arms are built.** Arms are separate parts pivoting at the shoulder. Each pose swaps the forearm and hand, with no IK.
- **Motion:**
  - **Idle bob:** translateY 0 → −2 px, sine, over 2.4 s.
  - **Blink:** 110 ms, every 3.2–6 s (seeded).
  - **Pin glint:** the S2 frames play over the pin once every 9 s.
  - **Pose change:** a 120 ms swap with a 1-frame squash (scaleY 0.97).
- **Reduced motion.** No bob and no pin glint. The blink stays, because it is too small to trigger vestibular symptoms.
- **Never:** jumping or spinning, or any pose held over a question item.

## S7. Lumi costume and region accent

- **Jacket:**
  - Knee-length and `cornflower`.
  - A **high mandarin collar**, closed, with a `gold` edge and three gold glints on each side.
  - A gold toggle clasp at the throat.
  - Bell sleeves lined in `diecut`, with gold trim.
- **Under the jacket:** `diecut` trousers and white boots. The trousers replace the portraits' short skirt; the kit's own general-audience rule already asked for this.
- **Belt:** `ink`, with an S1 buckle.
- **Region accent.** A **sash** tied at her left hip, with both ends hanging, filled with the current region `hue`. On quiet surfaces it is `cornflower`.
  - The plan said "scarf". A scarf would cover the collar, which is one of her anchors, so it is a sash instead.
- **Never:** an open collar, bare legs, or any region colour on the jacket itself.

## S8. Region emblems

**Rule.** Each emblem is **the shipped `motif` path** from `views/journey.js`, stroked in `ink` at 2 units on its 24-unit grid with round caps and joins, centred on a disc of the region `hue`. The disc's radius is 12 on the 24-unit grid, and the whole emblem sits inside an S9 sticker frame.

Reusing the motifs means the ring, the tab icons and the stickers share one drawing.

| Region | Aspect | Emblem | `hue` fill | `deep` text | deep on paper | ink on fill |
|---|---|---|---|---|---|---|
| The Market | finance | stacked coins | `#d9a441` | `#8A5A12` | 5.43 | 6.34 |
| The Highlands | physical | twin peaks | `#3fa796` | `#1F6B5E` | 5.80 | 4.87 |
| The Still Water | mental | ripples | `#5b8dd9` | `#2F5DA8` | 5.93 | 4.25 |
| The Commons | relationships | two people | `#d9738f` | `#A83A5C` | 5.63 | 4.62 |
| The Workshop | personalGoals | ladder | `#e08a3c` | `#9A4E12` | 5.55 | 5.34 |
| The Crossroads | socialContribution | signpost | `#8d6fd1` | `#5E43A6` | 6.81 | 3.62 |
| The Wildwood | environment | tree | `#2e9e5b` | `#1D6B3C` | 5.98 | 4.18 |
| The Lookout | humanityFuture | **telescope** (changed) | `#7F88D6` (lightened from `#5a63b8`) | `#3D4596` | 7.74 | 4.34 |

- **Contrast.** The ratios in the table were computed against `paper` `#F7F5F0`, as WCAG relative luminance.
- **One change to a shipped motif.** The Lookout's motif is currently a 5-point star over a horizon. With stars now belonging to the mark and the glints, it would read as "the star region", so it becomes a telescope on the same horizon line. Proposed path: `M2 20 L22 20 M6 13 L17 7 L19 10.5 L8 16.5 Z M12 14 L10 20 M12 14 L15 20`. This changes the ring too, and only needs owner approval.
- **Minimum size.** 20 px. Below that, the disc only.
- **For the owner (seen on the style tile).** Two shipped motifs misread as stickers:
  - The Still Water's ripples read as a Wi-Fi icon.
  - The Commons' two people read as a face.
  - They are unchanged here, because they also draw the ring. Redrawing them would be a separate motif decision, like the telescope.
- **Never:** emblems re-drawn per surface, or a hue used for text.

## S9. Sticker frame

- **Layers, from outside in:**
  1. a flat shadow
  2. a `diecut` border
  3. an `ink` outline
  4. the content
- **Sizes (at a 64 px sticker):**
  - Outline: 2.5 px.
  - Border: 4 px.
  - Shadow: `ink` at 15 %, 2 px down, with no blur.
- **Scaling:**
  - The outline is 3.9 % of the size, clamped between 1.5 and 4 px.
  - The border is 6.25 %, clamped between 2 and 12 px.
  - The shadow offset is 3 %, clamped between 1 and 6 px.
  - At 32 px or smaller there is no shadow.
- **Radius.** Round stickers are circles. Card stickers use 14 px on playful surfaces and 6 px on data surfaces.
- **Never:** a gradient, a blurred shadow, or a double outline.

## S10. Answer scale

This is the most constrained symbol: it sits on the instrument items.

- **Subject.** The existing `.radio-option` labels in `views/instrument-forms.js`, with every option's published text visible.
- **Silhouette.** All options are **the same size and weight**. The identity brainstorm suggested "growth per step"; that is rejected here, because size by value is a value-valent encoding.
- **Colours:**
  - Unselected: `diecut` fill, `ink` 1.5 px outline, `ink` text.
  - Selected: `ink` fill with `diecut` text.
  - No option is ever tinted by its value (no red-to-green ramp), and no region hue appears inside the scale.
  - Focus: a 2 px `cornflower` ring, offset by 2 px.
- **Order and direction.** As published by each instrument. `fix/likert-direction` (#67) owns this, not the identity.
- **Motion.** The neutral settle: on tap, a translateY of 1 px over 90 ms and back, **identical for every option**. The ring sub-step is the only other feedback.
- **Minimum target.** 44 × 44 px.
- **Never:**
  - sparkle, burst, emoji, colour ramp or Lumi reaction tied to a value
  - icon-only options
  - hover drift
