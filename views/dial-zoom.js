// views/dial-zoom.js - the ring round your star on its way in and out (v180;
// the owner, 2026-10-03: "the static ring is really off", then picked from
// four prototypes: the star's ring orbits it like an armillary sphere's, the
// radar's is swept round by its beam, the asterism's comes on as stars).
//
// The ways in and out (views/star-zoom.js, views/star-shape-zoom.js) call
// these with their own clock.
//   Star (v181: "a bit lifeless", and all of it in front of the star): the
//     ring is Saturn's. Its far half goes behind the star and its near half
//     stays in front, the far half dimmer and a glint riding the near edge.
//     It trails the star a little and wobbles as it circles, swings level as
//     the star lands, and a pulse runs round it as it locks.
//   Radar: a beam goes round once and leaves the band and the ticks behind.
//   Asterism (v181: the ring caught the eye before the constellation): it
//     waits until the line has closed, then its ticks come on as faint stars
//     in one wave from the marker, and settle into ticks with the sky.
// The ring is drawn finished; only transform and opacity move, plus the
// band's dash, the ring's turn and what is laid on for the trip (the far
// half, the glint, the pulse, the beam, the stars), taken off after it.
import { easeStar } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const C = 50;
const RING_R = 55;
const CIRC = 2 * Math.PI * RING_R;
// The orbit: how far the ring tips over, how far it leans while it does, and
// how much it wobbles on the way.
const TILT = 74;
const LEAN = 30;
const WOBBLE_TILT = 5;
const WOBBLE_LEAN = 6;
// The far half, seen through the star's light, at its dimmest.
const FAR_DIM = 0.5;
// The pulse round the ring as it locks: how long, and how far it swells.
export const PULSE_MS = 280;
const PULSE_GROW = 0.07;
// The beam: its trailing glow in slices, each SLICE_DEG wide, out to BEAM_R.
const SLICES = 10;
const SLICE_DEG = 4;
const BEAM_R = 58;
// The asterism's wave: each tick lights as it passes, faint and small.
const STAR_R = 0.45;
const STAR_LIGHT = 0.32;
const FLARE = 0.6;
const FLARE_MS = 160;
const FADE_IN_MS = 120;

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
// circles the star wobbling a little and swings level as it lands, flat and
// turned whole by ORBIT_IN_MS.
export const ORBIT_IN_MS = 1200;
export function orbitIn(t) {
  const up = ease(t / 240);
  const level = backOut((t - 560) / 640);
  const free = up * (1 - level);
  return {
    tilt: (TILT + WOBBLE_TILT * Math.sin(t / 150)) * free,
    lean: (LEAN + WOBBLE_LEAN * Math.sin(t / 110)) * free,
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
  const free = up * (1 - level);
  const cruise = 0.75 * Math.min(t, fall);
  return {
    tilt: (TILT + WOBBLE_TILT * Math.sin(t / 150)) * free,
    lean: (LEAN + WOBBLE_LEAN * Math.sin(t / 110)) * free,
    spin: cruise + (720 - 0.75 * fall) * ease((t - fall) / (ms - fall))
  };
}

// The ring's pose: where the figure is (`base`, its flight or its spot on
// Home), then the orbit's lean and tilt about the ring's own centre. The spin
// is the ring's turn inside it, so the halves stay split across the tilt.
export const orbitPose = (base, o) =>
  `${base} rotateZ(${o.lean.toFixed(1)}deg) rotateX(${o.tilt.toFixed(1)}deg)`;

// How bright the far half is: full when the ring is flat, dimmest on edge.
export const farLight = (tilt) => lerp(1, FAR_DIM, clamp01(Math.abs(tilt) / TILT));

// Where on the ring a tick sits, as a share of a turn clockwise from the
// marker at the top, the ring turned `turnDeg`.
export const tickShare = (k, n, turnDeg) => ((((k / n) * 360 + turnDeg + 90) % 360) + 360) % 360 / 360;

// A tick lighting as the wave reaches it, `dt` ms ago: faint, and only a
// little bigger at first.
export function waveLight(dt) {
  if (dt < 0) return { opacity: 0, scale: 1 };
  return { opacity: STAR_LIGHT * clamp01(dt / FADE_IN_MS), scale: 1 + FLARE * Math.exp(-dt / FLARE_MS) };
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
  const turn = ring.querySelector(".dial-turn");
  const turnAttr = turn?.getAttribute("transform") ?? "";
  const turnDeg = Number(/rotate\(\s*(-?[\d.]+)/.exec(turnAttr)?.[1]) || 0;
  const ticks = [...ring.querySelectorAll(".dial-ticks line")];
  return {
    ring,
    turnDeg,
    turn,
    turnAttr,
    band: ring.querySelector(".dial-band"),
    ticks,
    icons: [...ring.querySelectorAll(".dial-icon")],
    mark: ring.querySelector(".dial-mark"),
    shares: ticks.map((_, k) => tickShare(k, ticks.length, turnDeg)),
    laid: []
  };
}

// The star's trip: a copy of the ring behind the figure shows the far half,
// the ring itself the near half; a glint on the near edge and the pulse for
// the landing are laid on the ring.
function layOrbit(rp) {
  const back = rp.ring.cloneNode(true);
  back.classList.add("is-far");
  back.querySelector(".dial-mark")?.remove();
  back.querySelector(".dial-hit")?.remove();
  const dial = rp.ring.parentNode;
  dial.insertBefore(back, dial.firstChild);
  rp.ring.classList.add("is-near");
  const glint = svgEl("path", {
    class: "dial-glint",
    d: `M${fmt(C + Math.cos(Math.PI / 3.6) * RING_R)} ${fmt(C + Math.sin(Math.PI / 3.6) * RING_R)}A${RING_R} ${RING_R} 0 0 1 ${fmt(C + Math.cos(Math.PI - Math.PI / 3.6) * RING_R)} ${fmt(C + Math.sin(Math.PI - Math.PI / 3.6) * RING_R)}`,
    opacity: 0
  }, rp.ring);
  const pulse = svgEl("circle", { class: "dial-pulse", cx: C, cy: C, r: RING_R, opacity: 0 }, rp.ring);
  rp.far = { el: back, turn: back.querySelector(".dial-turn") };
  rp.glint = glint;
  rp.pulse = pulse;
  rp.laid.push(back, glint, pulse);
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
  rp.laid.push(g);
}

// The asterism's stars, one on each tick, inside the ring's turn so they sit
// where the ticks do.
function layStars(rp) {
  const g = svgEl("g", { class: "dial-stars" }, rp.turn ?? rp.ring);
  const n = rp.ticks.length;
  rp.stars = rp.ticks.map((_, k) => {
    const a = (k / n) * 2 * Math.PI;
    const star = svgEl("circle", { cx: 0, cy: 0, r: STAR_R, opacity: 0 }, g);
    return { el: star, x: fmt(C + Math.cos(a) * 54), y: fmt(C + Math.sin(a) * 54) };
  });
  rp.laid.push(g);
}

export function prepareRing(rp, kind) {
  if (!rp || rp.laid.length) return;
  if (kind === "star") layOrbit(rp);
  if (kind === "radar") layBeam(rp);
  if (kind === "asterism") layStars(rp);
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
  if (rp.turnAttr) rp.turn?.setAttribute("transform", rp.turnAttr);
  rp.ring.classList.remove("is-near", "is-flipped");
  rp.laid.forEach(el => el.remove());
  rp.laid = [];
  rp.far = null;
  rp.glint = null;
  rp.pulse = null;
  rp.beam = null;
  rp.stars = null;
}

// The whole ring: where it is and how much of it shows.
export function paintRingPose(rp, transform, opacity = 1) {
  if (rp) writeMotionStyle(rp.ring, { transform, opacity: opacity.toFixed(3) });
}

const turnTo = (turn, deg) => turn?.setAttribute("transform", `rotate(${fmt(deg)} ${C} ${C})`);

// The star's ring in orbit: both halves at the pose, turned by the spin, the
// far half dimmer the more it is tipped, and the glint shimmering on the
// near edge while it is. Once `landed`, the near ring shows whole again and
// the pulse runs round it (`pulse` 0 to 1).
export function paintOrbit(rp, base, o, { t = 0, landed = false, pulse = 0 } = {}) {
  if (!rp) return;
  const transform = orbitPose(base, o);
  const tipped = clamp01(Math.abs(o.tilt) / TILT);
  // Tipped past flat the other way, the halves trade places.
  const flip = o.tilt < 0;
  rp.ring.classList.toggle("is-near", !landed);
  rp.ring.classList.toggle("is-flipped", flip);
  writeMotionStyle(rp.ring, { transform, opacity: "1" });
  turnTo(rp.turn, rp.turnDeg + o.spin);
  if (rp.far) {
    rp.far.el.classList.toggle("is-flipped", flip);
    writeMotionStyle(rp.far.el, { transform, opacity: (landed ? 0 : farLight(o.tilt)).toFixed(3) });
    turnTo(rp.far.turn, rp.turnDeg + o.spin);
  }
  if (rp.glint) rp.glint.setAttribute("opacity", fmt(landed ? 0 : 0.85 * tipped * (0.7 + 0.3 * Math.sin(t / 70))));
  if (rp.pulse) {
    const on = pulse > 0 && pulse < 1;
    rp.pulse.setAttribute("opacity", fmt(on ? 0.8 * (1 - pulse) : 0));
    rp.pulse.setAttribute("transform", `translate(${C} ${C}) scale(${fmt(1 + PULSE_GROW * ease(pulse))}) translate(${-C} ${-C})`);
  }
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

// The asterism's wave: from the marker clockwise, each tick lights as a faint
// star `wave` ms after the wave starts (`tau`), and `cool` (0 to 1) turns
// them into the ring's ticks and brings the band up.
export function paintWave(rp, tau, wave, cool) {
  if (!rp?.stars) return;
  rp.stars.forEach((star, k) => {
    const lit = waveLight(tau - rp.shares[k] * wave);
    star.el.setAttribute("opacity", fmt(lit.opacity * (1 - cool)));
    star.el.setAttribute("transform", `translate(${star.x} ${star.y}) scale(${fmt(lit.scale)})`);
  });
  rp.ticks.forEach(el => writeMotionStyle(el, { opacity: cool.toFixed(3) }));
  if (rp.band) writeMotionStyle(rp.band, { opacity: cool.toFixed(3) });
}
