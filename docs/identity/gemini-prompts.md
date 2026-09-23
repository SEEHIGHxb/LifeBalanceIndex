# Sage & Gilt: Gemini prompt pack

Status: **ready to generate, 2026-09-23.** It is written from [`symbols.md`](symbols.md) v2 (S1, S2, S8).

These prompts make the same symbols as the SVG tests on [`style-tile.html`](style-tile.html), so the owner can compare the two methods and pick one.

The owner's style reference image is **not** committed (its source is not ours). It lives only in the single-file pack (`sage-gilt-gemini-pack.pdf`) given to the owner.

## How to use

1. Open **one** Gemini chat and attach the style reference image.
2. Paste **Step 0** (the style). Wait for Gemini to confirm; it does not need to draw anything yet.
3. Paste the steps one at a time, one image per turn. **Stay in the same chat**, because Gemini keeps the style far better when it can see its own previous images.
4. If an image drifts (black outlines, extra colours, text appears, a face appears), reply with the **Fix** line at the bottom and the step number.
5. Save each image as `S8-1-market.png` and so on (1:1, 1024 px or larger).

## Step 0: the style (paste once, with the reference image attached)

```text
I'm going to ask you for a set of matching illustrations. The attached image is a STYLE reference only: copy its illustration style, but NOT its subjects, NOT its text labels, and NOT its layout of many icons on one page.

The style:
- Soft botanical line-art illustration on a plain, warm cream background (#FBF8F1), one subject per image.
- Flat fills in only two colour families. Sage green (#C3CFB6 main, #A8B49C shade) for living and natural things. Pale gold (#F0D8A8 main, #D9B77A shade) for made things and light.
- Every shape has a fine, even outline slightly darker than its own fill: sage outlines #6F7D64, gold outlines #A88752. Never black, never navy.
- Detail comes from a few thin inner lines (leaf veins, petal ribs, wood grain), not hatching and not heavy shading. At most a very soft gradient inside gold shapes.
- Light is shown by EITHER a thin, softly glowing gold halo arc OR two or three small four-point gold sparkles with a couple of tiny gold dots. Never both in one image.
- Mood: calm, kind, a little ceremonial, like a well-made almanac.
- Composition: square 1:1 canvas. One centred subject filling about 70% of the canvas with an even margin, sitting on a small ground (a grass mound, water or a table) when it makes sense.
- Never: text, letters or numbers; people; faces (including faces hidden in objects); frames or borders unless I ask; drop shadows; any colour outside sage, gold and cream.

Reply "Ready" and wait for the first subject.
```

## Step 1: S8.1 The Market (finance)

```text
Subject 1. A woven market basket seen slightly from the front, holding a few round gold coins and a sprig of ripe rice laid across the top. The basket weave is sage with fine weave lines. The coins and rice grains are gold, with a thin line on each coin's rim. The rice leaves are sage. It sits on a small sage grass mound. Two small gold sparkles above. Same style as the reference, no text.
```

## Step 2: S8.2 The Highlands (physical)

```text
Subject 2. Two soft, rounded mountain peaks in sage, the back one lighter, with a thin gold winding path climbing from the bottom to the top of the front peak. A rising gold sun is half-hidden behind the peaks, with a thin glowing gold halo arc. A few sage grass tufts at the base. Gentle, not dramatic. Same style, no text.
```

## Step 3: S8.3 The Still Water (mental)

```text
Subject 3. A lotus opening on a round sage lily pad, floating over three calm, thin sage ripple lines. The lotus has five pale-gold petals (one tall centre petal, two at the sides, two low outer ones) with fine rib lines, and a soft gradient from lighter tips to deeper gold at the base. A smaller second lily pad behind. Two small gold sparkles and two tiny gold dots in the air. Very calm and quiet. No flame, no fire, no religious symbols. Same style, no text.
```

## Step 4: S8.4 The Commons (relationships)

```text
Subject 4. Two teacups side by side on their saucers, on a small round sage tabletop seen from the front. The cups are pale gold with a thin rim line. Soft steam rises from each cup and curls together into one shared wisp above them, drawn in thin gold lines. Warm and companionable, not romantic: no hearts, no roses, no hands. Same style, no text.
```

## Step 5: S8.5 The Workshop (personalGoals)

```text
Subject 5. A half-made clay pot on a potter's wheel. The pot is pale gold with the top still uneven and unfinished, with fine throwing lines around its body. The wheel and its base are sage. A small wooden shaping tool lies beside the wheel: a sage handle and a gold blade. A thin glowing gold halo arc behind the pot. Same style, no text.
```

## Step 6: S8.6 The Crossroads (socialContribution)

```text
Subject 6. A wooden signpost with two arms pointing in different directions, on a small sage grass mound. The post is sage with fine wood-grain lines, and the arms are pale gold with no writing on them. A small lantern hangs from one arm, lit, with a soft gold glow. It looks like it lights the way for passers-by. Same style, no text, no letters on the signs.
```

## Step 7: S8.7 The Wildwood (environment)

```text
Subject 7. A broad, rounded tree with a full sage canopy (fine leaf-cluster lines) and visible roots gripping the ground, a small fern at its base, and two gold leaves falling. The whole scene sits inside a thin sage circle outline that the canopy slightly overlaps. A few tiny gold dots of dappled light in the canopy. No house, no buildings. Same style, no text.
```

## Step 8: S8.8 The Lookout (humanityFuture)

```text
Subject 8. A small telescope on a wooden tripod standing on a low sage grass mound, pointed up and to the right at the sky. The telescope tube is sage with two gold bands, a gold lens hood and a gold eyepiece. The tripod legs are gold wood. Three small four-point gold sparkles and a few tiny gold dots in the sky where it points. Hopeful and quiet. Same style, no text.
```

## Step 9: S1 The Lumi Star (the mark)

```text
Subject 9. A single emblem: an eight-pointed star seen straight on. It has four long points (up, down, left, right) and four shorter points on the diagonals, all sharp and slim, with a small round hole in the exact centre ringed by a thin sage line. Pale gold fill with a soft gradient, a fine gold outline, and thin engraved lines running from the centre to each point. A thin, softly glowing gold halo arc behind the upper half. Perfectly symmetrical, the top point exactly vertical. Same style, no text.
```

## Step 10: S2 Sparkle sheet

```text
Subject 10. On one square canvas, a neat row of three four-point gold sparkles with slim concave sides and a fine gold outline: the first upright and full size, the second turned slightly and a little smaller, the third turned 45 degrees and half size. Plenty of cream space around them. Same style, no text.
```

## Fix (reply with this when an image drifts)

```text
Please redo subject N. Keep the subject, but match the style exactly: only sage, pale gold and cream; fine outlines slightly darker than each fill, never black; thin inner detail lines; no text; no faces; one centred subject with an even margin on a plain cream background.
```

## Accept an image only if

- Only sage, gold and cream appear, and no outline is black.
- There is no text, no letters, no face, and no person.
- It still reads clearly when shrunk to **64 px**. Check this before accepting.
- The subject matches its definition in `symbols.md` S8. It must not be a copy of the reference's subjects (scales, rose, lotus-with-flame, cottage, theatre masks).
- The Star (step 9) has exactly 8 points with the top point vertical. Gemini often adds or drops points, so count them.
