// views/moments.js - the journey's moments, first release.
// docs/interactive-web-plan.md §6, Phase 3.
//
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
// Every scene goes through runScene (render, then park, then play), so the
// markup on screen is always the finished state and motion only travels to it.
// The pieces are handed in by the caller rather than looked up here: this file
// never queries the document, which keeps it testable against the stub.

import { animate, spring, easeStar, linear } from "../motion.js";
import { runScene, writeMotionStyle } from "./motion-mount.js";

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
const GLINT_PATH = "M12 0 Q13 11 24 12 Q13 13 12 24 Q11 13 0 12 Q11 11 12 0Z";
const GLINT_FRAME_MS = 110;
// A upright, B 22° at 0.78, C 45° at 0.5, cycling A-B-C-B.
const GLINT_FRAMES = [[0, 1], [22, 0.78], [45, 0.5], [22, 0.78]];

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
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${GLINT_PATH}"/></svg>`;
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
  const [rot, k] = part.glint ? GLINT_FRAMES[Math.floor((p * BURST_LIFE_MS) / GLINT_FRAME_MS) % GLINT_FRAMES.length] : [0, 1];
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

function pieceList(p) {
  return [p.lit, p.marker, ...p.cards, p.fact];
}

function parkEnding(p, scope, quiet) {
  if (p.lit) writeMotionStyle(p.lit, { opacity: LIGHT_FROM });
  if (p.marker) moveMarker(p.marker, p.shift);
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
  const dealt = p.cards.map((el, i) => animate({
    duration: CARD_MS, delay: CARDS_AT_MS + i * CARD_STAGGER_MS, signal, reduced: "end",
    update: (q) => dealCard(el, q)
  }));
  const results = await Promise.all([
    lightUp, settleMarker(p.marker, p.shift, signal), burst(p.particles, signal), ...dealt
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
// pieces(): returns { lit, marker, shift, cards, fact, layer } from the page
//           as drawn. `shift` is the marker's old place minus its new one.
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
