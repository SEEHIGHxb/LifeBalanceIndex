# Lumi — splash-art prompt kit for ChatGPT

Status: **READY TO GENERATE — written 2026-09-12.** No images produced from these yet.
The app continues to use the existing `assets/lumi.png` until they are.

Supersedes the style and character blocks in `../lumi-prompts.md`, which were written in a
bright-anime direction and for a generator with a negative-prompt field. Its acceptance
checks still apply and are repeated below.

## The order

Six files, pasted **one after another into a single ChatGPT conversation**:

| Paste | File | Used in the app for |
|---|---|---|
| 1st | `01-warm.txt` | chapter openings, and anywhere no other state applies |
| 2nd | `02-curious.txt` | beside a question while the reader is deciding |
| 3rd | `03-encouraging.txt` | the mid-chapter aside |
| 4th | `04-pleased.txt` | the chapter ending, where she reads their answers back |
| 5th | `05-gentle.txt` | The Still Water, and any sensitive moment |
| 6th | `06-delighted.txt` | the end of the journey, all eight regions lit |

**One chat, not six.** `01-warm.txt` is long and self-contained because it establishes the
character. Files 2 to 6 are deliberately short — they say "same character, change only the
expression" and then re-name every anchor that drifts. This is the whole reason to keep one
conversation: ChatGPT can see the image it just made, and a short delta against a visible
reference holds a face far better than six long prompts do.

**If the chat drifts or you start a fresh one**, use the full standalone form from the
fallbacks section at the bottom, and attach your kept variant-1 image to the message as a
reference. An attached reference is the strongest consistency lever available in the browser
chat.

## Lock variant 1 before generating anything else

Generate `01-warm.txt`, regenerate until you have one you genuinely like, then **download and
keep that file**. Every other variant is judged against it, and re-running variant 1 later
gives you a different person.

## What is different about the browser chat

Four things that change how these prompts are written, all of them worth knowing before you
wonder why an image came back wrong:

- **There is no negative-prompt field.** Every "not this" has to be phrased as a positive
  instruction in the prompt itself, which is why each file ends with an explicit constraints
  sentence rather than a list of banned words.
- **It regenerates, it does not edit.** Asking for "the same image but happier" produces a
  new painting of a similar person. That is expected, not a failure — it is why the delta
  files re-state the hairpin, the eye colour and the jacket every single time.
- **Naming the game may get refused or watered down.** If ChatGPT declines or the result
  ignores the style, delete the words "League of Legends" from the first line and keep the
  rest — the sentence after it describes the same visual grammar (painterly, semi-realistic,
  sculpted, strong rim light, jewel tones) without naming anyone.
- **One image per turn.** Hence six turns. There is no way around this in the browser chat.

## A tension worth knowing you are choosing

Splash art is built to be dark, high-contrast and dramatic, and the project already tried a
dark Lumi against the bright green Wildwood — the mismatch was immediate and the decision
taken was to brighten her to match the world. These prompts therefore ask for splash-art
**rendering** (painterly, sculpted, richly detailed, strong rim light) on a **daylight key**
with a flat pale background, rather than a literal splash. If you want her more dramatic,
the knob is the sentence beginning "Keyed for daylight rather than night" — cut it and you
will get the real thing, darker.

The other cost is scale. Splash art earns its keep through fine rendering, and she is
displayed at **54 pixels** inside a circular medallion. Check every image at that size
before accepting it.

## Before you accept an image

- **The star hairpin is the identity anchor.** If it changes shape or moves to her other
  side between variants, regenerate. It is the one detail a reader subconsciously tracks
  across eight chapters.
- **Check her at 54 pixels**, not at full size. An expression that reads clearly at 1024px
  and turns to mud at 54px is the wrong expression, however beautiful the image.
- **The jacket must stay closed and high-collared.** This is a wellbeing app with a general
  audience.
- **Watch the eye colour.** Amber is the brightened form of the original red. If it drifts
  to brown she loses her most distinctive feature.
- **Check the corners are empty.** Anything near a corner is cropped away by the circular
  frame.

## Where the files go

Save the accepted images into `assets/` as `lumi.png` (variant 1, replacing the current
file), then `lumi-curious.png`, `lumi-encouraging.png`, `lumi-pleased.png`,
`lumi-gentle.png`, `lumi-delighted.png`. They will need adding to the `sw.js` precache list
and a version bump, same as any other asset.

## Fallbacks — the full standalone form of variants 2 to 6

Use these only if you are not in the same chat as variant 1. Attach your kept variant-1
image alongside.

### 02-curious — Curious

```
League of Legends splash art style: painterly digital illustration, semi-realistic stylised proportions, richly rendered with confident visible brushwork, sculpted form and volume, strong directional key light with a bright warm rim light separating her from the background, jewel-tone palette, crisp focal detail on the face, high production-quality character portrait. Keyed for daylight rather than night: the overall value range stays bright and open, so the drama is in the lighting on the character, not in darkness around her.

Lumi: a friendly young woman in her early twenties. Straight dark hair with a cool blue sheen falling just past her shoulders, side-swept fringe, individual strands catching the light. A small polished gold and cornflower-blue enamel star hairpin above her left ear. Warm amber eyes with clear bright catchlights. A single small gold star-drop earring. She wears a high-collared jacket in soft cornflower-blue wool with fine gold star embroidery threaded along the collar and a brass clasp at the throat.

Framing: head-and-shoulders portrait, head centred with clear headroom and empty margin at all four corners, because the image is displayed cropped inside a circle. Background: a flat uniform pale mint field, hex #DCF2E4, completely plain -- no scenery, no gradient, no props. Square 1:1 composition, 1024x1024 or larger.

Expression: attentively curious, eyebrows slightly raised, eyes bright and focused on the viewer, lips closed in a small interested smile, head tilted a little to one side as if listening carefully. Alert but completely unhurried -- never impatient.

Keep it bright and friendly. One character only. Fully clothed with the collar closed. No text, lettering, watermark or signature anywhere in the image. Keep her hands out of frame.
```

### 03-encouraging — Encouraging

```
League of Legends splash art style: painterly digital illustration, semi-realistic stylised proportions, richly rendered with confident visible brushwork, sculpted form and volume, strong directional key light with a bright warm rim light separating her from the background, jewel-tone palette, crisp focal detail on the face, high production-quality character portrait. Keyed for daylight rather than night: the overall value range stays bright and open, so the drama is in the lighting on the character, not in darkness around her.

Lumi: a friendly young woman in her early twenties. Straight dark hair with a cool blue sheen falling just past her shoulders, side-swept fringe, individual strands catching the light. A small polished gold and cornflower-blue enamel star hairpin above her left ear. Warm amber eyes with clear bright catchlights. A single small gold star-drop earring. She wears a high-collared jacket in soft cornflower-blue wool with fine gold star embroidery threaded along the collar and a brass clasp at the throat.

Framing: head-and-shoulders portrait, head centred with clear headroom and empty margin at all four corners, because the image is displayed cropped inside a circle. Background: a flat uniform pale mint field, hex #DCF2E4, completely plain -- no scenery, no gradient, no props. Square 1:1 composition, 1024x1024 or larger.

Expression: warmly encouraging, a genuine open smile with real warmth reaching the eyes, chin lifted slightly, one hand raised near the shoulder in a small easy thumbs-up. Friendly and low-key -- a nudge, not a cheer.

Keep it bright and friendly. One character only. Fully clothed with the collar closed. No text, lettering, watermark or signature anywhere in the image. Both hands visible and clearly drawn with five fingers each.
```

### 04-pleased — Pleased

```
League of Legends splash art style: painterly digital illustration, semi-realistic stylised proportions, richly rendered with confident visible brushwork, sculpted form and volume, strong directional key light with a bright warm rim light separating her from the background, jewel-tone palette, crisp focal detail on the face, high production-quality character portrait. Keyed for daylight rather than night: the overall value range stays bright and open, so the drama is in the lighting on the character, not in darkness around her.

Lumi: a friendly young woman in her early twenties. Straight dark hair with a cool blue sheen falling just past her shoulders, side-swept fringe, individual strands catching the light. A small polished gold and cornflower-blue enamel star hairpin above her left ear. Warm amber eyes with clear bright catchlights. A single small gold star-drop earring. She wears a high-collared jacket in soft cornflower-blue wool with fine gold star embroidery threaded along the collar and a brass clasp at the throat.

Framing: head-and-shoulders portrait, head centred with clear headroom and empty margin at all four corners, because the image is displayed cropped inside a circle. Background: a flat uniform pale mint field, hex #DCF2E4, completely plain -- no scenery, no gradient, no props. Square 1:1 composition, 1024x1024 or larger.

Expression: quietly pleased and proud, eyes softened and slightly narrowed above a closed warm smile, head straight, shoulders settled. The look of someone who has just finished writing something down and is happy with it. Content rather than excited.

Keep it bright and friendly. One character only. Fully clothed with the collar closed. No text, lettering, watermark or signature anywhere in the image. Keep her hands out of frame.
```

### 05-gentle — Gentle

```
League of Legends splash art style: painterly digital illustration, semi-realistic stylised proportions, richly rendered with confident visible brushwork, sculpted form and volume, strong directional key light with a bright warm rim light separating her from the background, jewel-tone palette, crisp focal detail on the face, high production-quality character portrait. Keyed for daylight rather than night: the overall value range stays bright and open, so the drama is in the lighting on the character, not in darkness around her.

Lumi: a friendly young woman in her early twenties. Straight dark hair with a cool blue sheen falling just past her shoulders, side-swept fringe, individual strands catching the light. A small polished gold and cornflower-blue enamel star hairpin above her left ear. Warm amber eyes with clear bright catchlights. A single small gold star-drop earring. She wears a high-collared jacket in soft cornflower-blue wool with fine gold star embroidery threaded along the collar and a brass clasp at the throat.

Framing: head-and-shoulders portrait, head centred with clear headroom and empty margin at all four corners, because the image is displayed cropped inside a circle. Background: a flat uniform pale mint field, hex #DCF2E4, completely plain -- no scenery, no gradient, no props. Square 1:1 composition, 1024x1024 or larger.

Expression: gentle and reassuring, eyes calm and soft, a very small closed smile, head level, gaze direct and steady. Serene and grounded, with no trace of worry, pity or sadness in the face. The palette stays bright -- this is a kind moment, not a sombre one.

Keep it bright and friendly. One character only. Fully clothed with the collar closed. No text, lettering, watermark or signature anywhere in the image. Keep her hands out of frame.
```

### 06-delighted — Delighted

```
League of Legends splash art style: painterly digital illustration, semi-realistic stylised proportions, richly rendered with confident visible brushwork, sculpted form and volume, strong directional key light with a bright warm rim light separating her from the background, jewel-tone palette, crisp focal detail on the face, high production-quality character portrait. Keyed for daylight rather than night: the overall value range stays bright and open, so the drama is in the lighting on the character, not in darkness around her.

Lumi: a friendly young woman in her early twenties. Straight dark hair with a cool blue sheen falling just past her shoulders, side-swept fringe, individual strands catching the light. A small polished gold and cornflower-blue enamel star hairpin above her left ear. Warm amber eyes with clear bright catchlights. A single small gold star-drop earring. She wears a high-collared jacket in soft cornflower-blue wool with fine gold star embroidery threaded along the collar and a brass clasp at the throat.

Framing: head-and-shoulders portrait, head centred with clear headroom and empty margin at all four corners, because the image is displayed cropped inside a circle. Background: a flat uniform pale mint field, hex #DCF2E4, completely plain -- no scenery, no gradient, no props. Square 1:1 composition, 1024x1024 or larger.

Expression: openly delighted, a wide happy smile, eyes bright and crinkled with joy, both hands lifted slightly in a small celebratory gesture, hair caught in gentle motion, faint warm golden sparkles of light drifting around her. The biggest emotion in the whole set.

Keep it bright and friendly. One character only. Fully clothed with the collar closed. No text, lettering, watermark or signature anywhere in the image. Both hands visible and clearly drawn with five fingers each.
```
