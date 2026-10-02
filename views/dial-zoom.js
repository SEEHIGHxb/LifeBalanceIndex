// views/dial-zoom.js - the ring round your star on its way in and out (v180;
// the owner, 2026-10-03: "the static ring is really off", then picked from
// four prototypes: the star's ring orbits it like an armillary sphere's, the
// radar's is swept round by its beam, the asterism's twinkles on as stars).
//
// The ways in and out (views/star-zoom.js, views/star-shape-zoom.js) call
// these with their own clock. The star's ring flies with the star and tilts
// into orbit round it, then swings level as it lands. The radar's beam goes
// round once and leaves the band and the ticks behind it. The asterism's
// ticks come on as stars twinkling round the ring, which cool into ticks as
// the sky fades into the page's style. The ring is drawn finished; only
// transform and opacity move, plus the band's dash and the beam and the
// twinkles, which are laid on for the trip and taken off after it.
import { easeStar } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const C = 50;
const RING_R = 55;
const CIRC = 2 * Math.PI * RING_R;
// The orbit: how far the ring tips over, and how far it leans while it does.
const TILT = 74;
const LEAN = 30;
// The beam: its trailing glow in slices, each SLICE_DEG wide, out to BEAM_R.
const SLICES = 10;
const SLICE_DEG = 4;
const BEAM_R = 58;
// The twinkles: when each one comes on, spread over TWINKLE_MS, and its glow.
const TWINKLE_MS = 620;
const TWINKLE_R = 0.55;
const FLARE = 1.8;
const FLARE_MS = 140;
const FADE_IN_MS = 90;

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => easeStar(clamp01(u));
// Past its mark and back, for the ring swinging level.
export const backOut = (u) => {
  const x = clamp01(u) - 1;
  return 1 + 2.70158 * x * x * x + 1.70158 * x * x;
};
const fmt = (n) => n.toFixed(2);

// The orbit at `t` ms into the way in: the ring tips over as it takes off,
// circles the star in flight and swings level as it lands, flat and turned
// whole by ORBIT_IN_MS.
export const ORBIT_IN_MS = 1200;
export function orbitIn(t) {
  const up = ease(t / 240);
  const level = backOut((t - 560) / 640);
  return {
    tilt: TILT * up * (1 - level),
    lean: LEAN * up * (1 - level),
    // Two whole turns, so the symbols start and end where Home had them.
    spin: -720 * (1 - ease(t / ORBIT_IN_MS))
  };
}

// The way out over `ms`: it tips over as the page folds, circles home with the
// star and swings level as it lands, two whole turns round so the view's
// symbol is back under the marker.
export function orbitOut(t, ms) {
  const fall = ms * 0.62;
  const up = ease(t / 300);
  const level = backOut((t - fall) / (ms - fall));
  const cruise = 0.75 * Math.min(t, fall);
  return {
    tilt: TILT * up * (1 - level),
    lean: LEAN * up * (1 - level),
    spin: cruise + (720 - 0.75 * fall) * ease((t - fall) / (ms - fall))
  };
}

// The ring's pose: where the figure is (`base`, its flight or its spot on
// Home), then the orbit about the ring's own centre.
export const orbitPose = (base, o) =>
  `${base} rotateZ(${o.lean.toFixed(1)}deg) rotateX(${o.tilt.toFixed(1)}deg) rotateZ(${o.spin.toFixed(1)}deg)`;

// Where on the ring a tick sits, as a share of a turn clockwise from the
// marker at the top, the ring turned `turnDeg`.
export const tickShare = (k, n, turnDeg) => ((((k / n) * 360 + turnDeg + 90) % 360) + 360) % 360 / 360;

// When twinkle k comes on, as a share of TWINKLE_MS: scattered round the ring,
// the same each time.
export const twinkleAt = (k, n) => ((k * 97) % n) / n;
const brightness = (k) => 0.45 + ((k * 31) % 7) / 12;

// A star coming on `dt` ms ago: its brightness and its size.
export function twinkle(dt, k) {
  if (dt < 0) return { opacity: 0, scale: 1 };
  return { opacity: brightness(k) * clamp01(dt / FADE_IN_MS), scale: 1 + FLARE * Math.exp(-dt / FLARE_MS) };
}

const svgEl = (name, attrs, parent) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent.appendChild(el);
  return el;
};

// The ring's parts, read from its markup (views/shape.js ringMarkup).
export function ringParts(ring) {
  if (!ring?.querySelector) return null;
  const turnAttr = ring.querySelector(".dial-turn")?.getAttribute("transform") ?? "";
  const turnDeg = Number(/rotate\(\s*(-?[\d.]+)/.exec(turnAttr)?.[1]) || 0;
  const ticks = [...ring.querySelectorAll(".dial-ticks line")];
  return {
    ring,
    turnDeg,
    turn: ring.querySelector(".dial-turn"),
    band: ring.querySelector(".dial-band"),
    ticks,
    icons: [...ring.querySelectorAll(".dial-icon")],
    mark: ring.querySelector(".dial-mark"),
    shares: ticks.map((_, k) => tickShare(k, ticks.length, turnDeg)),
    beam: null,
    stars: null,
    starLayer: null
  };
}

// The radar's beam: a wedge pointing up from the centre, its glow trailing
// behind it, turned round by its transform.
function layBeam(rp) {
  const g = svgEl("g", { class: "dial-beam", opacity: 0 }, rp.ring);
  for (let k = 0; k < SLICES; k++) {
    const a1 = ((-90 - (k + 1) * SLICE_DEG) * Math.PI) / 180;
    const a2 = ((-90 - k * SLICE_DEG) * Math.PI) / 180;
    svgEl("path", {
      d: `M${C} ${C}L${fmt(C + Math.cos(a1) * BEAM_R)} ${fmt(C + Math.sin(a1) * BEAM_R)}A${BEAM_R} ${BEAM_R} 0 0 1 ${fmt(C + Math.cos(a2) * BEAM_R)} ${fmt(C + Math.sin(a2) * BEAM_R)}Z`,
      "fill-opacity": fmt(0.32 * (1 - k / SLICES))
    }, g);
  }
  svgEl("line", { x1: C, y1: C, x2: C, y2: C - BEAM_R }, g);
  rp.beam = g;
}

// The asterism's stars, one on each tick, inside the ring's turn so they sit
// where the ticks do.
function layStars(rp) {
  const g = svgEl("g", { class: "dial-stars" }, rp.turn ?? rp.ring);
  const n = rp.ticks.length;
  rp.stars = rp.ticks.map((_, k) => {
    const a = (k / n) * 2 * Math.PI;
    const star = svgEl("circle", { cx: 0, cy: 0, r: TWINKLE_R, opacity: 0 }, g);
    return { el: star, x: fmt(C + Math.cos(a) * 54), y: fmt(C + Math.sin(a) * 54) };
  });
  rp.starLayer = g;
}

export function prepareRing(rp, kind) {
  if (!rp) return;
  if (kind === "radar" && !rp.beam) layBeam(rp);
  if (kind === "asterism" && !rp.stars) layStars(rp);
}

// Everything back as the page drew it.
export function restRing(rp) {
  if (!rp) return;
  for (const el of [rp.ring, rp.band, rp.mark, ...rp.ticks, ...rp.icons]) {
    if (el) writeMotionStyle(el, { transform: "", opacity: "" });
  }
  rp.band?.removeAttribute("stroke-dasharray");
  rp.band?.removeAttribute("stroke-dashoffset");
  rp.band?.removeAttribute("transform");
  rp.beam?.remove();
  rp.starLayer?.remove();
  rp.beam = null;
  rp.stars = null;
  rp.starLayer = null;
}

// The whole ring: where it is and how much of it shows.
export function paintRingPose(rp, transform, opacity = 1) {
  if (rp) writeMotionStyle(rp.ring, { transform, opacity: opacity.toFixed(3) });
}

// The three symbols and the marker coming on, each 0 to 1.
export function paintSymbols(rp, icons, marker) {
  if (!rp) return;
  rp.icons.forEach((el, i) => writeMotionStyle(el, { opacity: clamp01((icons[i] ?? 1) * 1.5).toFixed(3) }));
  if (rp.mark) writeMotionStyle(rp.mark, { transform: `translateY(${(-5 * (1 - marker)).toFixed(2)}px)`, opacity: marker.toFixed(3) });
}
// Three symbols in turn: each starts `gap` ms after the one before.
export const staggered = (t, start, gap, length) => [0, 1, 2].map(i => clamp01((t - start - i * gap) / length));

// The beam `drawn` of the way round (0 to 1), leaving the band and the ticks
// behind it; `glow` is how much of the beam itself shows.
export function paintSweep(rp, drawn, glow) {
  if (!rp) return;
  if (rp.band) {
    rp.band.setAttribute("stroke-dasharray", fmt(CIRC));
    rp.band.setAttribute("stroke-dashoffset", fmt(CIRC * (1 - drawn)));
    // The band's dash starts at its right; turned so it starts at the top.
    rp.band.setAttribute("transform", `rotate(${fmt(-90 - rp.turnDeg)} ${C} ${C})`);
  }
  rp.ticks.forEach((el, k) => writeMotionStyle(el, { opacity: clamp01((drawn - rp.shares[k]) * 24).toFixed(3) }));
  if (rp.beam) {
    rp.beam.setAttribute("opacity", fmt(drawn > 0 ? glow : 0));
    rp.beam.setAttribute("transform", `rotate(${fmt(drawn * 360)} ${C} ${C})`);
  }
}

// The twinkles at `tau` ms after the first can come on; `cool` (0 to 1) turns
// them back into the ring's ticks and brings its band up full.
export function paintTwinkles(rp, tau, cool) {
  if (!rp?.stars) return;
  const n = rp.stars.length;
  rp.stars.forEach((star, k) => {
    const lit = twinkle(tau - twinkleAt(k, n) * TWINKLE_MS, k);
    star.el.setAttribute("opacity", fmt(lit.opacity * (1 - cool)));
    star.el.setAttribute("transform", `translate(${star.x} ${star.y}) scale(${fmt(lit.scale)})`);
  });
  rp.ticks.forEach(el => writeMotionStyle(el, { opacity: cool.toFixed(3) }));
  if (rp.band) writeMotionStyle(rp.band, { opacity: lerp(0.35 * clamp01(tau / 600), 1, cool).toFixed(3) });
}

// The way out: each tick sparks and goes out, the last to come on first,
// over the `ms` from `start`.
export function paintSparks(rp, t, start, ms) {
  if (!rp?.stars) return;
  const n = rp.stars.length;
  rp.stars.forEach((star, k) => {
    const dt = t - start - (1 - twinkleAt(k, n)) * ms;
    const glow = dt < 0 ? 0 : Math.exp(-dt / FLARE_MS);
    star.el.setAttribute("opacity", fmt(brightness(k) * glow));
    star.el.setAttribute("transform", `translate(${star.x} ${star.y}) scale(${fmt(1 + FLARE * glow)})`);
    writeMotionStyle(rp.ticks[k], { opacity: dt < 0 ? "1" : "0" });
  });
  if (rp.band) writeMotionStyle(rp.band, { opacity: (1 - clamp01((t - start) / ms)).toFixed(3) });
}
