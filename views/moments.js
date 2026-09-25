// views/moments.js - what is left of the Phase 3 journey moments
// (docs/interactive-web-plan.md §6). The redesign retires them screen by
// screen (docs/redesign-build-plan.md): R2 took the ring's settle, the
// region light-up, the dealt recap, the glint titles, Lumi's caret and
// tug-the-ring, which the journey's mission panel replaced (views/stage.js).
//
// Still here: the quiet regions, which every screen honours, and the eight-
// particle burst the dashboard's ceremony plays (views/ceremony.js, R3). The
// file is deleted in R5 once nothing imports it.

import { animate, linear } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";

// The Still Water and The Commons: no bursts (non-negotiable 4, symbols.md S2).
export const QUIET_ASPECTS = Object.freeze(["mental", "relationships"]);
export const isQuietChapter = (chapter) => QUIET_ASPECTS.includes(chapter?.aspect);

// symbols.md S2: 8 particles on the star's angles in radar order, half glints
// and half dots, travelling 70-110 px over 800 ms and fading from half-life.
const BURST_COUNT = 8;
const BURST_LIFE_MS = 800;
const BURST_MIN_PX = 70;
const BURST_JITTER_PX = 40;
// The S2 silhouette lives once, in the sprite sheet (Phase 4).
const GLINT_HREF = "./assets/sprites.svg#glint";
const GLINT_FRAME_MS = 110;
// A upright, B 22° at 0.78, C 45° at 0.5, cycling A-B-C-B.
const GLINT_FRAMES = [[0, 1], [22, 0.78], [45, 0.5], [22, 0.78]];
const glintFrame = (ms) => GLINT_FRAMES[Math.floor(Math.max(0, ms) / GLINT_FRAME_MS) % GLINT_FRAMES.length];

const easeOut = (p) => 1 - (1 - p) ** 3;
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

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

// One burst on its own, for a scene that has no parked particles (the final
// ceremony's). Made, flown and removed here; cut short, removed at once.
export async function playBurst(layer, signal) {
  if (!layer) return true;
  const parts = makeParticles(layer);
  const removeAll = () => { for (const part of parts) part.el.remove(); };
  signal.addEventListener("abort", removeAll, { once: true });
  const ok = await burst(parts, signal);
  removeAll();
  return ok;
}
