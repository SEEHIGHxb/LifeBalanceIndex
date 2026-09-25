// views/stage.js - the redesign's shared motion pieces (docs/redesign-build-plan.md,
// R2): typed lines, the burst of stars and motifs, and a settle-in spring.
// Ported from the approved prototype (docs/prototype/redesign/proto.js) with its
// constants, and routed through motion.js and the mount like every other scene.
//
// The rules they keep:
//   - FINAL STATE FIRST. Markup is rendered finished; a piece is parked (letters
//     hidden, a spring moved to its start) only just before it plays, and an
//     aborted scope puts it back to the finished state.
//   - MOTION NEVER DEPENDS ON AN ANSWER. Nothing here takes an answer as input,
//     and the burst's spread is fixed per particle index, not random, so every
//     reader sees the same burst.
//   - THAI TYPES BY GRAPHEME. typedMarkup splits with graphemes(), so a vowel or
//     tone mark never lands in a cell of its own.
//   - Screen readers never hear the letter cells: the full text sits in an
//     .sr-only span and the cells are aria-hidden.

import { animate, loop, spring, linear } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";
import { graphemes } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

export const SPRITES = "./assets/sprites.svg";

// V5/V6_REVIEW burst, in CSS px at the prototype's 1440px-wide laptop. `reach`
// scales the radii for a smaller stage.
const BURST = {
  n: 16, r0: 68, r1: 407, tauMs: 270, mMin: 0.65, mMax: 1.3,
  shrinkAt: 130, shrinkOver: 640, shrinkPow: 1.3, minScale: 0.27,
  fadeIn: 100, fadeAt: 500, fadeOver: 600, lifeMs: 800
};
const BURST_JITTER_RAD = 0.4;

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

// Runs fn once when the signal aborts (or at once if it already has).
export function onAbort(signal, fn) {
  if (!signal) return;
  if (signal.aborted) fn();
  else signal.addEventListener("abort", fn, { once: true });
}

// A line (or several) as one cell per grapheme, with the full text for screen
// readers. Rendered finished: every cell visible.
export function typedMarkup(lines) {
  const list = Array.isArray(lines) ? lines : [lines];
  const cells = list.map(line => graphemes(line)
    .map(g => `<span class="tc">${escapeHtml(g)}</span>`).join("")).join("<br>");
  return `<span class="sr-only">${escapeHtml(list.join(" "))}</span><span class="typed" aria-hidden="true">${cells}</span>`;
}

// Types the cells of a .typed element in over count * msPerChar. Resolves true
// when every cell is in; an aborted scope shows every cell at once.
export function typeIn(typed, { msPerChar = 32, delay = 0, signal } = {}) {
  const cells = typed ? [...typed.querySelectorAll(".tc")] : [];
  if (!cells.length) return Promise.resolve(true);
  let shown = -1;
  const show = (n) => {
    if (n === shown) return;
    shown = n;
    cells.forEach((c, i) => c.classList.toggle("off", i >= n));
  };
  show(0);
  onAbort(signal, () => show(cells.length));
  return animate({
    duration: cells.length * msPerChar, delay, ease: linear, signal,
    update: (p) => show(Math.round(p * cells.length)),
    reduced: "end"
  });
}

// Settles an element in from a smaller scale and a drop, on a spring. The
// transform is cleared at rest, so the element ends exactly as rendered.
export function settleIn(el, { scale = 0.86, drop = 0, stiffness = 300, damping = 20, signal } = {}) {
  if (!el) return Promise.resolve(true);
  const pose = ([s, y]) => writeMotionStyle(el, {
    transform: s === 1 && y === 0 ? "" : `translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})`
  });
  onAbort(signal, () => pose([1, 0]));
  pose([scale, drop]);
  return spring({
    from: [scale, drop], to: [1, 0], stiffness, damping, restDelta: 0.001, restSpeed: 0.01,
    update: pose, signal, reduced: "end"
  });
}

// One burst particle: every third a gilt star, the rest a region's motif in
// its hue, taken in turn from `motifs` ({ motif, hue } pairs). The motif comes
// from the sprite sheet, so no path data is inlined.
function particle(i, motifs) {
  const el = document.createElement("span");
  const { motif, hue } = motifs.length ? motifs[i % motifs.length] : {};
  const star = !motif || i % 3 === 2;
  el.className = star ? "spr" : "spr spr--motif";
  el.innerHTML = star
    ? `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="${SPRITES}#star"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true" stroke="${escapeHtml(hue)}"><use href="${SPRITES}#motif-${escapeHtml(motif)}"/></svg>`;
  return el;
}

// The fixed spread for particle i: an angle round the circle with a small
// jitter, and a reach multiplier. Pure, so every reader gets the same burst.
export function burstSpread(i, n = BURST.n) {
  const jitter = (((i * 37) % 11) / 10 - 0.5) * BURST_JITTER_RAD;
  const th = (i / n) * Math.PI * 2 + jitter;
  return { c: Math.cos(th), s: Math.sin(th), m: lerp(BURST.mMin, BURST.mMax, ((i * 53) % 17) / 16) };
}

// Pose of a particle t ms into its life, at `reach` times the laptop radii.
export function burstPose(t, m, reach = 1) {
  const r = (BURST.r0 + BURST.r1 * (1 - Math.exp(-t / BURST.tauMs))) * m * reach;
  const u = clamp01((t - BURST.shrinkAt) / BURST.shrinkOver);
  const scale = 1 - (1 - BURST.minScale) * (1 - (1 - u) ** BURST.shrinkPow);
  const opacity = Math.min(1, t / BURST.fadeIn) * (1 - clamp01((t - BURST.fadeAt) / BURST.fadeOver));
  return { r, scale, opacity };
}

// Bursts from the centre of `from` into `layer` (a positioned, aria-hidden,
// pointer-events:none box). Reduced motion: nothing, since the burst is
// decoration and the screen is already finished without it.
export function burst(layer, from, { motifs = [], signal } = {}) {
  if (!layer || !from || signal?.aborted) return Promise.resolve(false);
  const lb = layer.getBoundingClientRect();
  const fb = from.getBoundingClientRect();
  const ox = fb.left + fb.width / 2 - lb.left;
  const oy = fb.top + fb.height / 2 - lb.top;
  const reach = Math.min(1, Math.max(0.55, lb.width / 1440));
  const live = [];
  const remove = () => live.splice(0).forEach(p => p.el.remove());
  onAbort(signal, remove);
  let t0 = null;
  return loop({
    signal,
    reduced: "end",
    step(now) {
      if (t0 === null) {
        t0 = now;
        for (let i = 0; i < BURST.n; i++) {
          const el = particle(i, motifs);
          writeMotionStyle(el, { opacity: 0 });
          layer.appendChild(el);
          live.push({ el, ...burstSpread(i) });
        }
      }
      const t = now - t0;
      for (const p of live) {
        const { r, scale, opacity } = burstPose(t, p.m, reach);
        writeMotionStyle(p.el, {
          transform: `translate(${(ox + r * p.c).toFixed(1)}px,${(oy + r * p.s).toFixed(1)}px) scale(${scale.toFixed(3)})`,
          opacity: opacity.toFixed(3)
        });
      }
      if (t < BURST.lifeMs) return true;
      remove();
      return false;
    }
  });
}
