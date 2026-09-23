# Sage & Gilt: Lumi prompt pack (Gemini)

Status: **ready to generate, 2026-09-23.** It is written from [`symbols.md`](symbols.md) S4–S7. It replaces the painted splash-art kit in [`../lumi/`](../lumi/00-README.md) for the Sage & Gilt look.

It works the same way as the emblem pack ([`gemini-prompts.md`](gemini-prompts.md)), which the owner accepted.

## What to attach (all three, in the first message)

1. **Style:** [`emblems/s8-3-still-water.webp`](emblems/s8-3-still-water.webp). Our own accepted emblem; it shows the palette and the line better than the original reference.
2. **Character, face:** `assets/lumi_current_design/warm.png`.
3. **Character, figure:** `assets/lumi_current_design/full_body.png`.

The single-file pack (`sage-gilt-lumi-pack.pdf`) holds these three images and every prompt below.

## How to use

1. Open a **new** Gemini chat. Attach the three images and paste **Step L0**. Wait for "Ready".
2. Paste **L1** (the warm bust). Regenerate until the face is right, because every later image copies it. Count the hairpin's points and check its side.
3. Paste L2–L6 one per turn in the same chat. Then L7–L11 for the full figure.
4. If an image drifts, reply with the **Fix** line and the step number.
5. Save as `lumi-bust-warm.png`, `lumi-bust-curious.png`, …, `lumi-full-idle.png`, and so on (1:1, 1024 px or larger).

## Step L0: style and character (paste once, with the three images attached)

```text
I'm going to ask you for a set of portraits of one character, Lumi, drawn in a new style.

Image 1 is the STYLE reference: soft botanical line art in sage green, pale gold and cream. Copy its style exactly, but not its subject.
Images 2 and 3 are the CHARACTER reference: copy who she is (face, hair, eyes, hairpin, clothes), but NOT their painted, glossy anime rendering and NOT their blue coat colour.

The style:
- Clean line-art illustration with flat fills and at most a very soft gradient. No painterly brushwork, no glossy highlights, no dramatic lighting, no heavy shading.
- Every shape has a fine, even outline slightly darker than its own fill. Never black outlines.
- Detail comes from a few thin inner lines: hair strands, fabric folds, the collar embroidery.
- Plain warm cream background (#FBF8F1), no scene, no frame, no drop shadow.
- Calm, kind, a little ceremonial, like a well-made almanac.

Lumi (keep her identical in every image):
- A friendly young woman in her early twenties, semi-realistic proportions (not chibi, not a child).
- Straight blue-black hair (#2E3547) just past her shoulders, with a muted cornflower under-layer (#6E7FA6) showing at the ends, and a side-swept fringe over her right brow. Hair outlines #1F2533.
- Warm amber eyes (#C8923E).
- A small gold eight-pointed star hairpin (four long points, four short diagonal points) above HER RIGHT ear, which is on the LEFT side of the image as we look at her, tilted slightly clockwise.
- A single small gold four-point sparkle earring.
- A high, closed mandarin collar with small gold four-point sparkles embroidered along it and a gold toggle clasp at the throat.
- A knee-length coat in sage green (#C3CFB6, shade #A8B49C, outlines #6F7D64) with gold trim (#F0D8A8, #D9B77A, outlines #A88752) at the collar and cuffs.
- Cream trousers and cream boots with fine gold outlines.
- Warm light skin (#F6E3D3) with soft outlines (#C9A58C).

Colours allowed: sage, gold, cream, her skin, her blue-black hair and amber eyes. Nothing else.
Never: text, letters or numbers; a second person; a sad, worried or crying face; a background scene; black outlines.

Reply "Ready" and wait.
```

## Busts: the six expressions (S5)

Every bust uses the same camera: head and shoulders, the collar fully visible, head centred with clear margin on all four sides (the app crops it inside a circle), looking at the viewer, hands out of frame. Only the face changes.

### L1: warm (the default; lock this one first)

```text
Bust 1, "warm". Head and shoulders, collar fully visible, head centred with clear margin on all sides, hands out of frame, looking at the viewer. A calm, open, welcoming closed-mouth smile, eyelids slightly lowered, relaxed brows. She looks glad you arrived and in no hurry. Same style and same Lumi as described, no text.
```

### L2: curious

```text
Bust 2, "curious". Same camera, same Lumi, same framing as bust 1; only the face changes. Her left brow slightly raised, eyes wide open and interested, a small neutral mouth, head tilted a little to one side. Same style, no text.
```

### L3: encouraging

```text
Bust 3, "encouraging". Same camera, same Lumi, same framing as bust 1; only the face changes. Brows lifted in the middle, eyes open and bright, an open, supportive smile, as if saying "you can do this". Same style, no text.
```

### L4: pleased

```text
Bust 4, "pleased". Same camera, same Lumi, same framing as bust 1; only the face changes. Eyes closed in happy arcs, relaxed brows, a wide closed-mouth smile. Same style, no text.
```

### L5: gentle

```text
Bust 5, "gentle". Same camera, same Lumi, same framing as bust 1; only the face changes. Inner ends of the brows raised very slightly, half-lidded eyes looking softly down, a small soft mouth, a faint blush. Quiet and kind, never sad. Same style, no text.
```

### L6: delighted

```text
Bust 6, "delighted". Same camera, same Lumi, same framing as bust 1; only the face changes. High arched brows, eyes closed in happy arcs, an open laugh, a light blush, and three small gold four-point sparkles floating near her head. Same style, no text.
```

## Full figure: the five poses (S6)

Every pose uses the same camera: the whole figure from head to boots, standing on a small sage grass mound, centred with clear margin, the warm face from bust 1.

### L7: idle

```text
Full figure 1, "idle". The whole Lumi from head to boots, centred with clear margin, standing on a small sage grass mound, facing the viewer at a slight three-quarter angle, arms relaxed at her sides, the warm smile from bust 1. The knee-length sage coat, cream trousers and cream boots are all visible. Same style, no text.
```

### L8: point

```text
Full figure 2, "point". Same camera and mound as full figure 1. Her right arm raised, pointing up and to the side at something just outside the image, with an encouraging smile. Same style, no text.
```

### L9: wave

```text
Full figure 3, "wave". Same camera and mound as full figure 1. One hand raised in a friendly wave, a warm open smile, as if greeting someone arriving. Same style, no text.
```

### L10: read

```text
Full figure 4, "read". Same camera and mound as full figure 1. She holds a small open book in both hands and reads it with a gentle, focused face. The book is pale gold with no visible writing. Same style, no text.
```

### L11: cheer

```text
Full figure 5, "cheer". Same camera and mound as full figure 1. Both fists raised happily at shoulder height, a delighted open laugh, and three small gold four-point sparkles around her. Same style, no text.
```

## Fix (reply with this when an image drifts)

```text
Please redo image N. Keep the pose and expression, but match the style and character exactly: clean line art with flat fills, fine outlines slightly darker than each fill (never black), sage coat with gold trim, blue-black hair, amber eyes, the gold eight-pointed star hairpin above HER RIGHT ear (the LEFT side of the image), plain cream background, no text.
```

## Accept an image only if

- **It's the same person as bust 1:** face shape, fringe, eyes.
- **The hairpin** is on the **left side of the image**, has **8 points**, and is gold. Gemini often mirrors the pin or draws a 5-point star, so check both.
- **Colours:** the coat is sage, not blue. Only sage, gold, cream, skin, blue-black hair and amber eyes appear. No outline is black.
- **Style:** it's line art, not painted. If it looks like the old portraits with a colour change, redo it.
- **Content:** no text, no second person, and no sad or worried face.
- **Busts only:** it still reads when shrunk to a **54 px circle**, with visible eyes and a visible pin.
