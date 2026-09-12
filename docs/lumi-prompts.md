# Lumi — image generation prompts

Status: **SUPERSEDED — 2026-09-12.** The art direction moved to League of Legends splash
art; the live kit is `lumi/00-README.md`. Kept because its role description, identity
anchors and acceptance checks still hold — only the style and character blocks below were
replaced. No images have been produced from either kit yet.

## What this is for

Lumi becomes a travelling companion in the redesigned onboarding flow
(`onboarding-flow-redesign.md`): present but peripheral while a reader answers,
fully present at the boundary of each of the eight chapters, where she reads their
own answers back to them.

That role needs something the project does not have. There are four Lumi images in
`assets/` and **they are not the same character** — `lumi.png` is black-haired with
red eyes, `lumi_focused.jpg` is purple-haired with a ribbon. A companion who changes
appearance between chapters is not a companion. The first job of this document is to
fix one Lumi; the second is to give her a range of expressions.

She also has to fit a world she currently fights. The prototype put her at the centre
of a bright green forest and the mismatch was immediate: she is lit like a night scene,
rendered dark and serious, against a daylight palette. The direction chosen was to
**brighten her while keeping her identity** — same person, same star motifs, moved into
daylight.

## How to use these

1. **Generate variant 1 first and lock it.** It is the default expression and the one
   the others must match.
2. Once you like a variant-1 image, **feed it back as a character reference** (img2img,
   character reference, or a style/consistency feature, depending on your generator)
   for variants 2-6. Text alone will not hold a face consistent across six images.
3. Keep the **character block identical, word for word**, in every prompt. Only the
   expression sentence changes. Drifting wording is the usual cause of drifting faces.
4. Record the seed of the variant-1 image you keep, and reuse it.

## Technical settings, all variants

| | |
|---|---|
| Aspect | 1:1 square, 1024×1024 or larger |
| Framing | Head and shoulders, head centred with clear headroom — she is displayed inside a circular medallion, so anything near the corners is cropped away |
| Background | Flat, uniform `#DCF2E4` (pale mint) — no scenery, no gradient, no props. A flat field keys out cleanly so she can be composited over the code-drawn world |
| Output | PNG. Transparent background if your generator supports it; otherwise the flat mint above |
| Consistency | Same seed family, same character block verbatim, variant 1 as reference image |

**Negative prompt for every variant:**

```
dark, moody, desaturated, heavy shadows, harsh contrast, night scene, photorealistic,
glossy 3D render, text, letters, watermark, signature, logo, busy background, scenery,
extra fingers, deformed hands, multiple characters, weapon, sexualized, cleavage,
low-cut clothing, blurry, jpeg artifacts
```

## The character block

Paste this verbatim into every prompt. It carries the identity anchors from the
existing `assets/lumi.png` — the star hairpin, the star-embroidered collar, the warm
eye colour — while moving the palette into daylight.

```
Lumi: a friendly young woman in her early twenties, straight dark hair with a soft
blue sheen falling just past her shoulders, side-swept fringe, a small gold and
cornflower-blue star hairpin above her left ear, warm amber eyes, a single small
star-drop earring, wearing a high-collared jacket in soft cornflower blue with fine
gold star embroidery along the collar.
```

## The style block

Paste this verbatim too.

```
bright modern anime illustration, clean cel shading with soft gradients, light
confident linework, soft diffuse daylight, gentle warm rim light, cheerful airy
colour palette, storybook quality, subtle paper grain, flat pale mint background
```

---

## Variant 1 — Warm (the default)

Used on chapter openings and anywhere no other state applies. **Generate this one
first and lock it.**

```
bright modern anime illustration, clean cel shading with soft gradients, light
confident linework, soft diffuse daylight, gentle warm rim light, cheerful airy
colour palette, storybook quality, subtle paper grain, flat pale mint background.
Lumi: a friendly young woman in her early twenties, straight dark hair with a soft
blue sheen falling just past her shoulders, side-swept fringe, a small gold and
cornflower-blue star hairpin above her left ear, warm amber eyes, a single small
star-drop earring, wearing a high-collared jacket in soft cornflower blue with fine
gold star embroidery along the collar.
Expression: a calm, open, welcoming half-smile, looking directly at the viewer, head
slightly tilted, relaxed shoulders. She looks like someone glad you arrived and in no
hurry at all. Head and shoulders, head centred with headroom.
```

## Variant 2 — Curious

Shown beside a question while the reader is deciding.

```
[style block] [character block]
Expression: attentively curious, eyebrows slightly raised, eyes bright and focused on
the viewer, lips closed in a small interested smile, head tilted a little to one side
as if listening carefully. Alert but completely unhurried — never impatient. Head and
shoulders, head centred with headroom.
```

## Variant 3 — Encouraging

The mid-chapter aside, roughly halfway through a set of questions.

```
[style block] [character block]
Expression: warmly encouraging, a genuine open smile showing a little warmth in the
eyes, chin lifted slightly, one hand raised near the shoulder in a small easy
thumbs-up. Friendly and low-key — a nudge, not a cheer. Head and shoulders, head
centred with headroom.
```

## Variant 4 — Pleased

The chapter ending, where she reads the reader's answers back to them.

```
[style block] [character block]
Expression: quietly pleased and proud, eyes softened and slightly narrowed with a
closed warm smile, head straight, shoulders settled. The look of someone who has just
finished writing something down and is happy with it. Content rather than excited.
Head and shoulders, head centred with headroom.
```

## Variant 5 — Gentle

For The Still Water, the mental well-being chapter, and any moment following a
sensitive disclosure. **This is the most important variant to get right.** A reader
has just answered ten questions about their mood; she must read as steady and kind,
never pitying and never concerned.

```
[style block] [character block]
Expression: gentle and reassuring, eyes calm and soft, a very small closed smile,
head level, gaze direct and steady. Serene and grounded, with no trace of worry,
pity or sadness in the face. The palette stays bright — this is a kind moment, not a
sombre one. Head and shoulders, head centred with headroom.
```

## Variant 6 — Delighted

The end of the journey, when all eight regions are lit and the map is revealed.

```
[style block] [character block]
Expression: openly delighted, a wide happy smile, eyes bright and crinkled with joy,
both hands lifted slightly in a small celebratory gesture, hair caught in gentle
motion, faint warm golden sparkles of light drifting around her. The biggest emotion
in the whole set. Head and shoulders, head centred with headroom.
```

---

## Optional extras

Not needed for the first build. Worth having if the set works.

- **Playful** — a light teasing look, one eyebrow raised, for a wry aside.
- **Thinking** — eyes up and to the side, fingertip at her chin, for a loading or
  calculating state.
- **Waving** — for the very first screen a new user ever sees.

## Notes on what to check before accepting an image

- **The star hairpin is the identity anchor.** If it drifts in shape or moves to the
  other side between variants, regenerate. It is the one detail a reader will
  subconsciously track across eight chapters.
- **Check her at 54 pixels**, not at full size. She is displayed small, inside a
  circular medallion. An expression that reads clearly at 1024px and turns to mud at
  54px is the wrong expression, however beautiful the image.
- **The jacket must stay closed and high-collared.** This is a wellbeing app used by
  a general audience.
- **Watch the eye colour.** Amber is the brightened form of the original red. If a
  generator pushes it to brown, the character loses her most distinctive feature.
