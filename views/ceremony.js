// views/ceremony.js - the final ceremony: the ring unfolds into the radar.
// docs/interactive-web-plan.md §4 and §6, Phase 4, from the approved Phase 1
// prototype (docs/prototype/phase1, scene 4).
//
// The journey ends with every region lit on the ring. The dashboard's radar is
// the same eight regions in the same order, so the ceremony hands one over to
// the other: a ring stands at 0.725 of the plot's radius, the reader's shape
// takes over from it, and each region grows to its score in radar order while
// the grid blooms to full size. Then one burst.
//
// WHEN. Once, the first time the dashboard is seen after the journey is
// finished, as the radar scrolls into view; and again whenever the reader
// presses Play. Skip is shown while it plays. It is never offered with
// reduced motion: the radar is simply there.
//
// QUIET (non-negotiable 4): nothing moves near the mental-health notice or the
// hotline, and on a dashboard that shows them, the radar card sits right under
// them. There it never plays by itself and never bursts; Play stays, because
// a reader who presses it has asked to see it.
//
// Scores are shown here, and only here, which is allowed: chapter 8 is over
// (non-negotiable 3). The motion is the same length for everyone; only the
// distance each point travels is the reader's.
//
// THE ONE GEOMETRY EXCEPTION. Style writes are transform and opacity only,
// through writeMotionStyle. The shape itself is an 8-point polygon, and no
// transform can change its outline, so its `points` attribute is rewritten
// per frame, as in the approved prototype. Its vertices move by transform.

import { animate, easeStar, linear, isReduced } from "../motion.js";
import { disposeMotion, runScene, writeMotionStyle } from "./motion-mount.js";
import { playBurst } from "./moments.js";

const SVG_NS = "http://www.w3.org/2000/svg";
// The ring starts at 0.725 of the plot radius and blooms to full size (§4).
export const RING_START = 0.725;
const RING_GAP_DEG = 4;
const MORPH_AT_MS = 300;
const VERTEX_MS = 900;
const VERTEX_STAGGER_MS = 45;
const HANDOVER_MS = 350;
const LABELS_AT_MS = 900;
const LABELS_MS = 400;
const VISIBLE_AT = 0.5;

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const easeOut = (p) => 1 - (1 - p) ** 3;
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

export const ceremonyMs = (points = 8) => MORPH_AT_MS + (points - 1) * VERTEX_STAGGER_MS + VERTEX_MS;

// Clockwise from the top, as chart.js radarPoints.
function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

function parsePoints(str) {
  return String(str || "").trim().split(/\s+/).filter(Boolean).map(pair => pair.split(",").map(Number));
}

const pointsOf = (pts) => pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");

// Everything the ceremony moves, read from the radar as chart.js drew it. The
// drawn radar is the end state; null if there is nothing to animate.
export function readPlot(svg) {
  const shape = svg?.querySelector(".radar-shape");
  if (!shape) return null;
  const cx = Number(svg.dataset.cx);
  const cy = Number(svg.dataset.cy);
  const r = Number(svg.dataset.r);
  const target = parsePoints(shape.getAttribute("points"));
  if (![cx, cy, r].every(Number.isFinite) || target.length < 3) return null;
  const step = 360 / target.length;
  return {
    svg, cx, cy, r, shape, target,
    points: shape.getAttribute("points"),
    start: target.map((_, i) => polar(cx, cy, r * RING_START, i * step)),
    step,
    vertices: [...svg.querySelectorAll(".radar-vertex")],
    bloom: svg.querySelector(".radar-bloom"),
    fades: [...svg.querySelectorAll(".radar-label, .radar-score, .radar-average")],
    ring: null
  };
}

// The ring the shape takes over from: one arc per region, with the journey
// ring's gap, at the ring's start radius.
function makeRing(plot) {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "radar-ring");
  g.setAttribute("aria-hidden", "true");
  const rr = plot.r * RING_START;
  for (let i = 0; i < plot.target.length; i++) {
    const [x1, y1] = polar(plot.cx, plot.cy, rr, i * plot.step);
    const [x2, y2] = polar(plot.cx, plot.cy, rr, (i + 1) * plot.step - RING_GAP_DEG);
    const arc = document.createElementNS(SVG_NS, "path");
    arc.setAttribute("d", `M ${r2(x1)} ${r2(y1)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x2)} ${r2(y2)}`);
    g.appendChild(arc);
  }
  plot.svg.insertBefore(g, plot.shape);
  return g;
}

function bloomTo(plot, k) {
  const { cx, cy } = plot;
  return `translate(${r2(cx)}px, ${r2(cy)}px) scale(${r3(k)}) translate(${r2(-cx)}px, ${r2(-cy)}px)`;
}

// Where each vertex is at time `now`, in radar order.
function vertexAt(plot, i, now) {
  const e = easeStar(clamp01((now - MORPH_AT_MS - i * VERTEX_STAGGER_MS) / VERTEX_MS));
  const [sx, sy] = plot.start[i];
  const [tx, ty] = plot.target[i];
  return [sx + (tx - sx) * e, sy + (ty - sy) * e];
}

function pose(plot, now) {
  const hand = easeOut(clamp01(now / HANDOVER_MS));
  if (plot.ring) writeMotionStyle(plot.ring, { opacity: r3(1 - hand) });
  writeMotionStyle(plot.shape, { opacity: r3(hand) });
  const pts = plot.target.map((_, i) => vertexAt(plot, i, now));
  plot.shape.setAttribute("points", pointsOf(pts));
  plot.vertices.forEach((el, i) => {
    const [x, y] = pts[i] || plot.target[i];
    const [tx, ty] = plot.target[i];
    writeMotionStyle(el, { opacity: r3(hand), transform: `translate(${r2(x - tx)}px, ${r2(y - ty)}px)` });
  });
  const b = easeStar(clamp01((now - MORPH_AT_MS) / VERTEX_MS));
  if (plot.bloom) writeMotionStyle(plot.bloom, { opacity: r3(b), transform: bloomTo(plot, RING_START + (1 - RING_START) * b) });
  const labels = r3(clamp01((now - LABELS_AT_MS) / LABELS_MS));
  for (const el of plot.fades) writeMotionStyle(el, { opacity: labels });
}

// Back to the radar exactly as chart.js drew it.
function land(plot) {
  plot.shape.setAttribute("points", plot.points);
  for (const el of [plot.shape, plot.bloom, ...plot.vertices, ...plot.fades]) {
    if (el) writeMotionStyle(el, { transform: "", opacity: "" });
  }
  plot.ring?.remove();
  plot.ring = null;
}

async function playPlot(plot, scope, { layer, skip, quiet }) {
  const run = scope.child();
  if (skip) {
    scope.listen(skip, "click", () => run.abort());
    skip.hidden = false;
  }
  const total = ceremonyMs(plot.target.length);
  const ok = await animate({
    duration: total, ease: linear, signal: run.signal, reduced: "end",
    update: (p) => pose(plot, p * total)
  });
  if (skip) skip.hidden = true;
  // Skipped (not replaced by another scene): the radar is simply there.
  if (scope.signal.aborted) return false;
  land(plot);
  if (!ok || quiet) return true;
  if (layer) writeMotionStyle(layer, { transform: `translate(${r2(plot.cx)}px, ${r2(plot.cy)}px)` });
  return playBurst(layer, scope.signal);
}

// svg:   the radar as chart.js drew it (the end state).
// layer: an empty, aria-hidden box for the burst, positioned at the svg's
//        top-left; the scene moves it to the plot's centre.
// skip:  a button shown only while the ceremony plays.
// quiet: true near the mental-health notice: no burst.
export function playRadarCeremony({ svg, layer, skip, quiet = false }) {
  let plot = null;
  return runScene({
    render() {
      // A replay must read the radar as drawn, not a previous run mid-flight:
      // ending the live mount first lands that run before anything is read.
      disposeMotion();
      plot = readPlot(svg);
    },
    park(scope) {
      if (!plot) return;
      plot.ring = makeRing(plot);
      pose(plot, 0);
      scope.signal.addEventListener("abort", () => { land(plot); if (skip) skip.hidden = true; }, { once: true });
    },
    play: (scope) => (plot ? playPlot(plot, scope, { layer, skip, quiet }) : true),
    reduced: "end"
  });
}

// The autoplay's watcher, while the radar has not yet been seen. It is not a
// listener the mount can own (it must outlive the tab-hop scene that mounts
// right after the dashboard draws), so renderActiveTab() ends it by hand,
// beside disposeMotion(): a dashboard left before its radar came on screen
// must not keep watching a detached svg for the rest of the session.
let watcher = null;

export function disposeCeremony() {
  watcher?.disconnect();
  watcher = null;
}

// Wires the dashboard's radar card. `autoplay` plays once, when at least half
// the radar is on screen; `play` replays on demand. Returns nothing: the
// buttons belong to the card, and the watcher ends with disposeCeremony().
export function bindRadarCeremony({ svg, layer, play, skip, autoplay = false, quiet = false, onError = () => {} }) {
  disposeCeremony();
  if (!svg) return;
  // Play and Skip share the header's space: one of them at a time.
  const offerPlay = () => { if (play) play.hidden = isReduced(); };
  const start = () => {
    if (play) play.hidden = true;
    playRadarCeremony({ svg, layer, skip, quiet }).catch(onError).finally(offerPlay);
  };
  if (play) {
    offerPlay();
    play.addEventListener("click", start);
  }
  if (!autoplay || quiet || isReduced()) return;
  if (typeof IntersectionObserver !== "function") { start(); return; }
  const io = new IntersectionObserver((entries) => {
    // A redrawn dashboard has left this svg behind: nothing to play.
    if (!svg.isConnected) { disposeCeremony(); return; }
    // The first callback reports any overlap as intersecting, so ask for the
    // ratio itself: half the radar, not a sliver of it.
    if (!entries.some(e => e.isIntersecting && e.intersectionRatio >= VISIBLE_AT)) return;
    disposeCeremony();
    start();
  }, { threshold: VISIBLE_AT });
  watcher = io;
  io.observe(svg);
}
