// views/moments.js - the journey's moments. docs/interactive-web-plan.md §6,
// Phase 3.
//
// First release:
//   * A region LIGHTS UP when its chapter ends: its arc on the ring brightens,
//     the marker settles onto the arc's end, and (outside the quiet zones) eight
//     gold glints burst from the ring's centre.
//   * The recap is DEALT AS CARDS, one line at a time; the fact card turns over
//     last.
//   * The NEUTRAL SETTLE: when the ring advances, its marker springs to the new
//     place. The spring depends only on how far the marker moved, which depends
//     only on how many items are answered, never on which point was chosen
//     (non-negotiable 1). Nothing inside an item moves: the ring is the only
//     thing that settles.
//   * A tab's icon HOPS once when its tab is chosen.
//
// Second release, on a chapter's first screen:
//   * The REGION TITLE IS SPELLED IN GLINTS: each grapheme appears as a gold
//     glint, then turns into its letter. Split with graphemes(), so a Thai
//     cluster such as "ที่" is one letter, never three (non-negotiable 10).
//   * The STAR CARET on Lumi's line: the theme line is revealed one grapheme
//     at a time with a glint riding at its end; then the caret lifts off and
//     arcs into the ring's marker, which takes the light with one pulse.
//   Screen readers get each text once, from a visually hidden copy; the
//   per-letter copy is aria-hidden, so it is never read out letter by letter.
//
// Third release: TUG-THE-RING's poses and scenes (the pointer handling is in
// views/tug.js).
//
// Every scene goes through runScene (render, then park, then play), so the
// markup on screen is always the finished state and motion only travels to it.
// The pieces are handed in by the caller rather than looked up here: this file
// never queries the document, which keeps it testable against the stub.

import { animate, spring, easeStar, linear, isReduced } from "../motion.js";
import { runScene, writeMotionStyle } from "./motion-mount.js";
import { graphemes } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

// The Still Water and The Commons: no bursts (non-negotiable 4, symbols.md S2).
export const QUIET_ASPECTS = Object.freeze(["mental", "relationships"]);
export const isQuietChapter = (chapter) => QUIET_ASPECTS.includes(chapter?.aspect);

// Timings from the approved Phase 1 prototype (docs/prototype/phase1).
const LIGHT_MS = 600;
const LIGHT_FROM = 0.25;
const CARDS_AT_MS = 300;
const CARD_STAGGER_MS = 170;
const CARD_MS = 460;
const CARD_DROP_PX = 22;
const CARD_TILT_DEG = -2.5;
const FLIP_DELAY_MS = 180;
const FLIP_MS = 620;
const FLIP_PERSPECTIVE = "perspective(600px)";
const HOP_MS = 360;
const HOP_PX = 5;

// symbols.md S2: 8 particles on the star's angles in radar order, half glints
// and half dots, travelling 70-110 px over 800 ms and fading from half-life.
const BURST_COUNT = 8;
const BURST_LIFE_MS = 800;
const BURST_MIN_PX = 70;
const BURST_JITTER_PX = 40;
// The S2 silhouette lives once, in the sprite sheet (Phase 4).
const GLINT_HREF = "./assets/sprites.svg#glint";
const GLINT_FRAME_MS = 110;
// The emblem arrives with the burst: fades in over its first 40 % while it
// grows from 0.86 with a small overshoot (the prototype's timing).
const EMBLEM_MS = 520;
const EMBLEM_FROM = 0.86;
// A upright, B 22° at 0.78, C 45° at 0.5, cycling A-B-C-B.
const GLINT_FRAMES = [[0, 1], [22, 0.78], [45, 0.5], [22, 0.78]];
const glintFrame = (ms) => GLINT_FRAMES[Math.floor(Math.max(0, ms) / GLINT_FRAME_MS) % GLINT_FRAMES.length];

const easeOut = (p) => 1 - (1 - p) ** 3;
const easeOutBack = (p) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Where each marker has been pulled to right now, so a settle that interrupts
// another one starts from where the marker IS, not from where it was headed.
const markerOffsets = new WeakMap();

// Back to the stylesheet: the rendered markup is the end state.
function land(els) {
  for (const el of els) {
    if (!el) continue;
    writeMotionStyle(el, { transform: "", opacity: "" });
    markerOffsets.delete(el);
  }
}

// A scene cut short by the next one must not leave its pieces parked. The
// abort fires inside the next scene's mountMotion(), before that scene parks,
// so this can never undo the newer scene's start pose.
function onAbort(scope, fn) {
  scope.signal.addEventListener("abort", fn, { once: true });
}

// --- the neutral settle ----------------------------------------------------------

function moveMarker(marker, [dx, dy]) {
  markerOffsets.set(marker, [dx, dy]);
  writeMotionStyle(marker, { transform: `translate(${r2(dx)}px, ${r2(dy)}px)` });
}

// `shift` is the marker's old place minus its new one, in the ring's viewBox
// units (CSS px on an SVG element are user units).
function settleMarker(marker, shift, signal) {
  if (!marker || (shift[0] === 0 && shift[1] === 0)) return Promise.resolve(true);
  return spring({ from: shift, to: [0, 0], update: (xy) => moveMarker(marker, xy), signal, reduced: "end" });
}

function liveShift(marker, shift) {
  const [ox, oy] = (marker && markerOffsets.get(marker)) || [0, 0];
  return [shift[0] + ox, shift[1] + oy];
}

// The ring has already been painted in its new place; the marker travels there.
export function settleRing({ marker, shift }) {
  const from = liveShift(marker, shift);
  return runScene({
    render: () => land([marker]),
    park(scope) {
      if (marker && (from[0] !== 0 || from[1] !== 0)) moveMarker(marker, from);
      onAbort(scope, () => land([marker]));
    },
    play: async (scope) => {
      const ok = await settleMarker(marker, from, scope.signal);
      if (ok) land([marker]);
      return ok;
    },
    reduced: "end"
  });
}

// --- the burst ---------------------------------------------------------------------

function glintMarkup() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="${GLINT_HREF}"/></svg>`;
}

// Deterministic spread: the same for every reader and every answer.
function makeParticles(layer) {
  return Array.from({ length: BURST_COUNT }, (_, i) => {
    const el = document.createElement("span");
    const glint = i % 2 === 0;
    el.className = `ring-particle ${glint ? "ring-particle-glint" : "ring-particle-dot"}`;
    if (glint) el.innerHTML = glintMarkup();
    writeMotionStyle(el, { opacity: 0 });
    layer.appendChild(el);
    const rad = ((i * 45 - 90) * Math.PI) / 180;
    const dist = BURST_MIN_PX + BURST_JITTER_PX * (((i * 5) % BURST_COUNT) / BURST_COUNT);
    return { el, glint, dx: Math.cos(rad) * dist, dy: Math.sin(rad) * dist };
  });
}

function placeParticle(part, p) {
  const travel = easeOut(p);
  const [rot, k] = part.glint ? glintFrame(p * BURST_LIFE_MS) : [0, 1];
  const scale = (1 - 0.7 * travel) * k;
  writeMotionStyle(part.el, {
    transform: `translate(${r2(part.dx * travel)}px, ${r2(part.dy * travel)}px) rotate(${rot}deg) scale(${r3(scale)})`,
    opacity: r3(p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5)
  });
}

function burst(parts, signal) {
  if (!parts.length) return Promise.resolve(true);
  return animate({
    duration: BURST_LIFE_MS,
    ease: linear,
    signal,
    reduced: "end",
    update: (p) => { for (const part of parts) placeParticle(part, p); }
  });
}

// --- the chapter ending ------------------------------------------------------------

function dealCard(el, p) {
  const e = easeOutBack(p);
  writeMotionStyle(el, {
    opacity: r3(Math.min(1, p / 0.4)),
    transform: `translate(0, ${r2(CARD_DROP_PX * (1 - e))}px) rotate(${r3(CARD_TILT_DEG * (1 - e))}deg)`
  });
}

function turnFact(el, e) {
  writeMotionStyle(el, {
    opacity: r3(Math.min(1, e / 0.3)),
    transform: `${FLIP_PERSPECTIVE} rotateY(${r2(90 * (1 - e))}deg)`
  });
}

function showEmblem(el, p) {
  writeMotionStyle(el, {
    opacity: r3(Math.min(1, p / 0.4)),
    transform: `scale(${r3(EMBLEM_FROM + (1 - EMBLEM_FROM) * easeOutBack(p))})`
  });
}

function pieceList(p) {
  return [p.lit, p.marker, p.emblem, ...p.cards, p.fact];
}

function parkEnding(p, scope, quiet) {
  if (p.lit) writeMotionStyle(p.lit, { opacity: LIGHT_FROM });
  if (p.marker) moveMarker(p.marker, p.shift);
  if (p.emblem) showEmblem(p.emblem, 0);
  for (const el of p.cards) dealCard(el, 0);
  if (p.fact) turnFact(p.fact, 0);
  p.particles = !quiet && p.layer ? makeParticles(p.layer) : [];
  p.removeParticles = () => { for (const part of p.particles) part.el.remove(); };
  onAbort(scope, () => {
    land(pieceList(p));
    p.removeParticles();
  });
}

async function playEndingPieces(p, scope) {
  const { signal } = scope;
  const lightUp = p.lit
    ? animate({
      duration: LIGHT_MS, ease: easeStar, signal, reduced: "end",
      update: (e) => writeMotionStyle(p.lit, { opacity: r3(LIGHT_FROM + (1 - LIGHT_FROM) * e) })
    })
    : Promise.resolve(true);
  const emblemIn = p.emblem
    ? animate({
      duration: EMBLEM_MS, ease: linear, signal, reduced: "end",
      update: (q) => showEmblem(p.emblem, q)
    })
    : Promise.resolve(true);
  const dealt = p.cards.map((el, i) => animate({
    duration: CARD_MS, delay: CARDS_AT_MS + i * CARD_STAGGER_MS, signal, reduced: "end",
    update: (q) => dealCard(el, q)
  }));
  const results = await Promise.all([
    lightUp, emblemIn, settleMarker(p.marker, p.shift, signal), burst(p.particles, signal), ...dealt
  ]);
  p.removeParticles();
  if (!results.every(Boolean)) return false;
  const turned = !p.fact || await animate({
    duration: FLIP_MS, delay: FLIP_DELAY_MS, ease: easeStar, signal, reduced: "end",
    update: (e) => turnFact(p.fact, e)
  });
  if (turned) land(pieceList(p));
  return turned;
}

// draw():   writes the finished ending (the recap lines) into the page.
// pieces(): returns { lit, marker, shift, emblem, cards, fact, layer } from
//           the page as drawn. `shift` is the marker's old place minus its new
//           one; `emblem` (optional) is the region's illustration tile.
// quiet:    true in The Still Water and The Commons: no burst.
export function playEnding({ draw, pieces, quiet }) {
  let p = null;
  return runScene({
    render() {
      draw();
      const got = pieces();
      p = { ...got, cards: [...(got.cards || [])], shift: liveShift(got.marker, got.shift || [0, 0]) };
      land(pieceList(p));
    },
    park: (scope) => parkEnding(p, scope, quiet),
    play: (scope) => playEndingPieces(p, scope),
    reduced: "end"
  });
}

// --- the tab hop ---------------------------------------------------------------------

export function hopTabIcon(icon) {
  return runScene({
    render: () => land([icon]),
    park: (scope) => onAbort(scope, () => land([icon])),
    play: async (scope) => {
      const ok = await animate({
        duration: HOP_MS, signal: scope.signal, reduced: "end",
        update: (p) => writeMotionStyle(icon, { transform: `translateY(${r2(-HOP_PX * Math.sin(Math.PI * p))}px)` })
      });
      if (ok) land([icon]);
      return ok;
    },
    reduced: "end"
  });
}

// --- the chapter opening (second release) ---------------------------------------------

const LETTER_STAGGER_MS = 55;
const GLINT_IN_MS = 140;
const LETTER_FLIP_AT_MS = 300;
const LETTER_IN_MS = 160;
const TYPE_MS = 34;
const TYPE_DELAY_MS = 150;
const FLIGHT_DELAY_MS = 260;
const FLIGHT_MS = 720;
const FLIGHT_MIN_LIFT_PX = 80;
const PULSE_MS = 360;

// The title, one span per grapheme. Spaces stay plain text so the line still
// wraps. As rendered, every letter shows and every glint is hidden by the
// stylesheet: that is the finished title.
//
// Each word is kept whole (.g-word does not wrap inside), because a line may
// break between any two inline-blocks and "ที่ราบสูง" must never split mid-word.
export function glintTitleMarkup(title) {
  const letter = (g) => `<span class="g"><span class="g-letter">${escapeHtml(g)}</span><span class="g-glint">${glintMarkup()}</span></span>`;
  const row = String(title).split(/(\s+)/).filter(Boolean).map((part) => (part.trim() === ""
    ? escapeHtml(part)
    : `<span class="g-word">${graphemes(part).map(letter).join("")}</span>`)).join("");
  return `<span class="sr-only">${escapeHtml(title)}</span><span class="g-row" aria-hidden="true">${row}</span>`;
}

// Lumi's line, one span per grapheme, with the caret after it (hidden when
// the line is finished: the caret has already flown home).
export function caretLineMarkup(line) {
  const letters = graphemes(line).map((g) => `<span class="t">${escapeHtml(g)}</span>`).join("");
  return `<span class="sr-only">${escapeHtml(line)}</span><span class="t-row" aria-hidden="true">${letters}<span class="star-caret">${glintMarkup()}</span></span>`;
}

function poseLetter([letter, glint], t) {
  if (t < 0) {
    writeMotionStyle(letter, { opacity: 0 });
    writeMotionStyle(glint, { opacity: 0 });
    return;
  }
  if (t < LETTER_FLIP_AT_MS) {
    const [rot, k] = glintFrame(t);
    const grow = easeOut(Math.min(1, t / GLINT_IN_MS));
    writeMotionStyle(letter, { opacity: 0 });
    writeMotionStyle(glint, { opacity: r3(grow), transform: `rotate(${rot}deg) scale(${r3(grow * k)})` });
    return;
  }
  const e = easeOut(Math.min(1, (t - LETTER_FLIP_AT_MS) / LETTER_IN_MS));
  writeMotionStyle(glint, { opacity: r3(1 - e), transform: `rotate(45deg) scale(${r3(0.5 * (1 - e))})` });
  writeMotionStyle(letter, {
    opacity: r3(e),
    transform: `translate(0, ${r3(0.18 * (1 - e))}em) scale(${r3(0.85 + 0.15 * e)})`
  });
}

function spellTitle(pairs, signal) {
  if (!pairs.length) return Promise.resolve(true);
  const total = (pairs.length - 1) * LETTER_STAGGER_MS + LETTER_FLIP_AT_MS + LETTER_IN_MS;
  return animate({
    duration: total, ease: linear, signal, reduced: "end",
    update: (p) => pairs.forEach((pair, i) => poseLetter(pair, p * total - i * LETTER_STAGGER_MS))
  });
}

// Where the caret sits before each letter and after the last, relative to its
// resting place at the end of the line. Measured once, at park: the letters
// never move while they are revealed, and measuring every frame would force a
// layout per frame.
function caretStops(letters, caret) {
  const home = caret.getBoundingClientRect();
  const homeMid = home.top + home.height / 2;
  const rel = (x, r) => [x - home.left, r.top + r.height / 2 - homeMid];
  const first = letters[0].getBoundingClientRect();
  return [rel(first.left, first), ...letters.map((el) => {
    const r = el.getBoundingClientRect();
    return rel(r.right, r);
  })];
}

function typeLine(p, signal) {
  const { letters, caret, stops } = p;
  const total = letters.length * TYPE_MS;
  let shown = 0;
  return animate({
    duration: total, delay: TYPE_DELAY_MS, ease: linear, signal, reduced: "end",
    update: (q) => {
      const n = Math.min(letters.length, Math.floor(q * letters.length + 1e-9));
      for (; shown < n; shown++) writeMotionStyle(letters[shown], { opacity: "" });
      const [x, y] = stops[n];
      const [rot, k] = glintFrame(q * total);
      writeMotionStyle(caret, { opacity: 1, transform: `translate(${r2(x)}px, ${r2(y)}px) rotate(${rot}deg) scale(${k})` });
    }
  });
}

// The caret lifts off and arcs into the ring's marker on a quadratic curve.
function flyCaret(caret, marker, signal) {
  const from = caret.getBoundingClientRect();
  const to = marker.getBoundingClientRect();
  const end = [
    to.left + to.width / 2 - (from.left + from.width / 2),
    to.top + to.height / 2 - (from.top + from.height / 2)
  ];
  const lift = Math.max(FLIGHT_MIN_LIFT_PX, Math.hypot(end[0], end[1]) * 0.35);
  const mid = [end[0] / 2, Math.min(0, end[1]) - lift];
  return animate({
    duration: FLIGHT_MS, delay: FLIGHT_DELAY_MS, ease: easeStar, signal, reduced: "end",
    update: (e) => {
      const u = 1 - e;
      const [rot, k] = glintFrame(e * FLIGHT_MS);
      writeMotionStyle(caret, {
        opacity: r3(1 - e * e),
        transform: `translate(${r2(2 * u * e * mid[0] + e * e * end[0])}px, ${r2(2 * u * e * mid[1] + e * e * end[1])}px) rotate(${rot}deg) scale(${r3(k * (1 - 0.3 * e))})`
      });
    }
  });
}

// The marker takes the light. Scaled about its own centre (index.css gives
// it transform-box: fill-box).
function pulse(marker, signal) {
  return animate({
    duration: PULSE_MS, ease: linear, signal, reduced: "end",
    update: (q) => writeMotionStyle(marker, { transform: `scale(${r3(1 + 0.8 * Math.sin(q * Math.PI))})` })
  });
}

function openingPieces(p) {
  return [...p.pairs.flat(), ...p.letters, p.caret, p.marker];
}

function parkOpening(p, scope) {
  for (const pair of p.pairs) poseLetter(pair, -1);
  for (const el of p.letters) writeMotionStyle(el, { opacity: 0 });
  if (p.caret && p.letters.length) p.stops = caretStops(p.letters, p.caret);
  if (p.marker) moveMarker(p.marker, p.shift);
  onAbort(scope, () => land(openingPieces(p)));
}

async function playOpeningPieces(p, scope) {
  const { signal } = scope;
  const [settled, spelled] = await Promise.all([settleMarker(p.marker, p.shift, signal), spellTitle(p.pairs, signal)]);
  if (!settled || !spelled) return false;
  land(p.pairs.flat());
  if (!p.caret || !p.letters.length) return true;
  if (!(await typeLine(p, signal))) return false;
  if (p.marker && !(await flyCaret(p.caret, p.marker, signal))) return false;
  const pulsed = !p.marker || await pulse(p.marker, signal);
  if (pulsed) land(openingPieces(p));
  return pulsed;
}

// draw():   writes the finished screen (already rendered by the view, so
//           usually nothing).
// pieces(): { pairs: [[letter, glint], ...], letters, caret, marker, shift }
//           from the page as drawn. `shift` is the marker's old place minus
//           its new one; the caret, the line and the marker are optional.
export function playOpening({ draw, pieces }) {
  let p = null;
  return runScene({
    render() {
      draw();
      const got = pieces();
      p = {
        pairs: [...(got.pairs || [])],
        letters: [...(got.letters || [])],
        caret: got.caret || null,
        marker: got.marker || null,
        shift: liveShift(got.marker, got.shift || [0, 0])
      };
      land(openingPieces(p));
    },
    park: (scope) => parkOpening(p, scope),
    play: (scope) => playOpeningPieces(p, scope),
    reduced: "end"
  });
}

// --- tug-the-ring (third release) ---------------------------------------------------

const TUG_STRETCH = 0.1;
const TUG_THIN = 0.05;
const TUG_REACH_PX = 60;
const TAP_MS = 260;

// The ring under tension: moved by (x, y), stretched along the pull and thinned
// across it, like a band. Follows the finger directly (no time involved), and
// never under reduced motion.
export function poseTug(body, [x, y]) {
  if (isReduced()) return;
  const d = Math.hypot(x, y);
  if (d < 0.01) {
    writeMotionStyle(body, { transform: "" });
    return;
  }
  const theta = r3(Math.atan2(y, x));
  const k = d / TUG_REACH_PX;
  writeMotionStyle(body, {
    transform: `translate(${r2(x)}px, ${r2(y)}px) rotate(${theta}rad) scale(${r3(1 + TUG_STRETCH * k)}, ${r3(1 - TUG_THIN * k)}) rotate(${-theta}rad)`
  });
}

function burstScene({ layer, withBurst, park, play, body }) {
  let parts = [];
  const removeParts = () => { for (const part of parts) part.el.remove(); parts = []; };
  return runScene({
    render: () => land([body]),
    park(scope) {
      park();
      parts = withBurst && layer ? makeParticles(layer) : [];
      onAbort(scope, () => { land([body]); removeParts(); });
    },
    play: async (scope) => {
      const results = await Promise.all([play(scope.signal), burst(parts, scope.signal)]);
      removeParts();
      const ok = results.every(Boolean);
      if (ok) land([body]);
      return ok;
    },
    reduced: "end"
  });
}

// Let go: the ring springs home from where the finger left it, bursting if
// it was pulled past the line.
export function releaseTug({ body, from, layer, burst: withBurst }) {
  return burstScene({
    body, layer, withBurst,
    park: () => poseTug(body, from),
    play: (signal) => spring({ from, to: [0, 0], update: (xy) => poseTug(body, xy), signal, reduced: "end" })
  });
}

// A tap (or Enter, or Space): the ring dips and springs back, and bursts.
export function tapTug({ body, layer }) {
  return burstScene({
    body, layer, withBurst: true,
    park: () => {},
    play: (signal) => animate({
      duration: TAP_MS, ease: linear, signal, reduced: "end",
      update: (p) => {
        const k = p < 0.35 ? 1 - 0.08 * easeOut(p / 0.35) : 0.92 + 0.08 * easeOutBack((p - 0.35) / 0.65);
        writeMotionStyle(body, { transform: `scale(${r3(k)})` });
      }
    })
  });
}
