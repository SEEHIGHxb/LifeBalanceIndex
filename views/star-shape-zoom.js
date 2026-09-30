// views/star-shape-zoom.js - the way into your star's page when it is shown
// as a radar or an asterism (v152; the owner, 2026-09-30: the star's warp
// stays as it is, and the other two get ways in of their own).
//
// Radar, in three beats:
//   fold      the shape folds into the hub, leaving the empty grid;
//   grow      the grid flies to the middle and grows, while the page's own
//             ground opens behind it (no night, no streaks, no spin);
//   unfold    the shape opens again ray by ray, clockwise from the top, each
//             region's label riding out on its ray.
// Asterism, in four:
//   dim       the stars and their line go out, leaving the sky;
//   sky       the sky grows out of Home's figure until it fills the page;
//   draw      from the top star, each star pops and a line runs on to the
//             next, until the eighth closes on the first; each star's label
//             lights as it pops;
//   settle    the sky fades into the page's own style.
// Coming back runs each one backwards, quicker.
//
// As with the warp (views/star-zoom.js), the page is drawn finished first and
// only transform and opacity move, plus the line's points, which the shape
// switch moves the same way; a missed note or reduced motion shows the page
// as it is.
import { animate, linear } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";
import { onAbort } from "./stage.js";
import {
  clamp01, span, flightFrom, flightPose, discFrom, paintDisc, grow,
  labelPaths, paintLabel, paintRise, restAll
} from "./star-zoom.js";

const RADAR_MS = 1800;
const RADAR_LEAVE_MS = 900;
const FOLD = [0, 320];
const FLY = [260, 700];
const RAY_FROM_MS = 960;
const RAY_STEP_MS = 60;
const RAY_MS = 300;
const RADAR_RISE_FROM_MS = 1100;

const ASTER_MS = 2500;
const ASTER_LEAVE_MS = 1000;
const DIM = [0, 300];
const SKY = [250, 500];
// The constellation: star i pops as the line reaches it; the line leaves a
// star LEAD_MS after the first one pops and takes STEP_MS to the next.
const DRAW_FROM_MS = 950;
const LEAD_MS = 100;
const STEP_MS = 110;
const POP_MS = 320;
const POP_PEAK = 1.6;
const POP_TURN = 0.55;
const FILL = [1850, 300];
const ASTER_RISE_FROM_MS = 1850;
const SETTLE = [1950, 450];

const RISE_STEP_MS = 65;
const RISE_MS = 400;
const SVG_C = 50;

const fmt = (n) => n.toFixed(2);
const scaleBy = (s) => ({ transform: `scale(${s.toFixed(4)})` });
const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
// A tip drawn `s` of the way out from the figure's centre.
const outward = (p, s) => ({ x: SVG_C + (p.x - SVG_C) * s, y: SVG_C + (p.y - SVG_C) * s });
const pointsOf = (pts) => pts.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(" ");

// The line through the stars drawn `amount` segments along (0 to the number
// of stars), from the first star round and back to it. The line is a closed
// polygon, so the way drawn so far is walked out and back again: the closing
// edge then lies on what is already drawn instead of cutting across.
export function tracePoints(tips, amount) {
  const n = tips.length;
  const done = Math.max(0, Math.min(n, amount));
  const k = Math.floor(done);
  const way = [];
  for (let j = 0; j <= k; j++) way.push(tips[j % n]);
  if (done > k) way.push(lerp(tips[k % n], tips[(k + 1) % n], done - k));
  if (way.length < 2) way.push(tips[0]);
  return pointsOf([...way, ...way.slice(1, -1).reverse()]);
}

// A star's size as it pops, `u` from 0 to 1: it swells past its size, then
// settles back.
export function popScale(u) {
  if (u <= 0) return 0;
  if (u < POP_TURN) return POP_PEAK * (u / POP_TURN);
  return POP_PEAK - (POP_PEAK - 1) * clamp01((u - POP_TURN) / (1 - POP_TURN));
}

// When star i pops: the first at once, each other one as the line reaches it.
const popAt = (i) => DRAW_FROM_MS + (i ? LEAD_MS + i * STEP_MS : 0);
// How many segments of the line are drawn at `t`.
const drawnAt = (t, n) => {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += clamp01((t - DRAW_FROM_MS - LEAD_MS - i * STEP_MS) / STEP_MS);
  return sum;
};

// A label lighting where it stands, as its star pops.
const paintLight = (el, u) => writeMotionStyle(el, { transform: `scale(${(0.6 + 0.4 * u).toFixed(3)})`, opacity: u.toFixed(3) });

// Everything that moves, measured once from the finished page. The stage is
// marked with the shape while it plays, which picks its backdrop in CSS.
function measure(parts, from, shape) {
  const { stage, night, bloom, star, labels = [], fades = [] } = parts;
  stage?.setAttribute("data-blooming", shape);
  const flight = star && from ? flightFrom(star, from) : null;
  const you = star?.querySelector(".sh-you");
  if (!flight || !you) {
    stage?.removeAttribute("data-blooming");
    return null;
  }
  const polys = [...you.querySelectorAll(".sh-fill polygon")];
  const dots = [...you.querySelectorAll(".sh-stars circle")];
  const fill = you.querySelector(".sh-fill");
  const line = you.querySelector(".sh-line");
  return {
    flight, you, polys, dots, fill, line, labels, fades,
    tips: dots.map(d => ({ x: Number(d.getAttribute("cx")), y: Number(d.getAttribute("cy")) })),
    points: line?.getAttribute("points") ?? "",
    night: shape === "asterism" ? discFrom(night, from, from.width) : null,
    bloom: shape === "radar" ? discFrom(bloom, from, from.width) : bloom,
    paths: labelPaths(labels, star),
    moved: [star, night, bloom, you, fill, ...polys, ...dots, ...labels, ...fades]
  };
}

// Puts everything back as the page drew it.
function restore(m, stage) {
  restAll(m.moved);
  if (m.line) m.line.setAttribute("points", m.points);
  stage?.removeAttribute("data-blooming");
  stage?.removeAttribute("data-sky");
}

// While the stars are drawn on the sky, the labels read light on it (CSS).
const markSky = (stage, on) => {
  if (stage && on !== stage.hasAttribute("data-sky")) stage.toggleAttribute("data-sky", on);
};

// The radar's shape with ray i drawn `grown(i)` of the way out.
function paintRays(m, grown) {
  m.polys.forEach((poly, i) => writeMotionStyle(poly, scaleBy(grown(i))));
  m.line?.setAttribute("points", pointsOf(m.tips.map((p, i) => outward(p, grown(i)))));
}

function play(scope, duration, paint, what) {
  paint(0);
  return animate({ duration, ease: linear, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => true, (err) => {
      console.error(`${what} failed:`, err);
      return false;
    });
}

export function enterRadar(note, parts, scope) {
  const m = scope && note ? measure(parts, note, "radar") : null;
  if (!m) return Promise.resolve(false);
  const rest = () => restore(m, parts.stage);
  onAbort(scope.signal, rest);
  const rayAt = (t, i) => span(t, RAY_FROM_MS + i * RAY_STEP_MS, RAY_MS);
  const paint = (p) => {
    const t = p * RADAR_MS;
    const unfolding = t >= RAY_FROM_MS;
    writeMotionStyle(m.you, scaleBy(unfolding ? 1 : 1 - span(t, ...FOLD)));
    if (unfolding) paintRays(m, i => rayAt(t, i));
    writeMotionStyle(parts.star, { transform: flightPose(m.flight, span(t, ...FLY)) });
    paintDisc(m.bloom, grow(t, FLY));
    m.paths.forEach((path, i) => paintLabel(path, span(t, RAY_FROM_MS + i * RAY_STEP_MS + 40, RAY_MS + 80)));
    m.fades.forEach((el, i) => paintRise(el, span(t, RADAR_RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
  };
  return play(scope, RADAR_MS, paint, "Radar entrance").finally(rest);
}

// Back to Overview: the labels go in, the shape folds, the grid flies home
// and the shape opens again there. The page is about to be replaced, so the
// last pose is left as it is.
export function leaveRadar(note, parts, scope) {
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const m = scope && back ? measure(parts, back, "radar") : null;
  if (!m) return Promise.resolve(false);
  const n = m.paths.length;
  const paint = (p) => {
    const t = p * RADAR_LEAVE_MS;
    m.paths.forEach((path, i) => paintLabel(path, 1 - span(t, (n - 1 - i) * 25, 240)));
    m.fades.forEach(el => paintRise(el, 1 - span(t, 0, 220)));
    writeMotionStyle(m.you, scaleBy(t < 700 ? 1 - span(t, 60, 260) : span(t, 700, 200)));
    paintDisc(m.bloom, 1 - span(t, 150, 420));
    writeMotionStyle(parts.star, { transform: flightPose(m.flight, 1 - span(t, 280, 440)) });
  };
  return play(scope, RADAR_LEAVE_MS, paint, "Radar exit");
}

export function enterAsterism(note, parts, scope) {
  const m = scope && note ? measure(parts, note, "asterism") : null;
  if (!m) return Promise.resolve(false);
  const rest = () => restore(m, parts.stage);
  onAbort(scope.signal, rest);
  const n = m.tips.length;
  const paint = (p) => {
    const t = p * ASTER_MS;
    const drawing = t >= DRAW_FROM_MS;
    writeMotionStyle(m.you, { opacity: (drawing ? 1 : 1 - span(t, ...DIM)).toFixed(3) });
    if (drawing) {
      m.dots.forEach((dot, i) => writeMotionStyle(dot, scaleBy(popScale(clamp01((t - popAt(i)) / POP_MS)))));
      m.line?.setAttribute("points", tracePoints(m.tips, drawnAt(t, n)));
      if (m.fill) writeMotionStyle(m.fill, { opacity: span(t, ...FILL).toFixed(3) });
    }
    writeMotionStyle(parts.star, { transform: flightPose(m.flight, span(t, ...SKY)) });
    paintDisc(m.night, grow(t, SKY));
    m.labels.forEach((el, i) => paintLight(el, span(t, popAt(i), POP_MS)));
    m.fades.forEach((el, i) => paintRise(el, span(t, ASTER_RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
    if (m.bloom) writeMotionStyle(m.bloom, { opacity: span(t, ...SETTLE).toFixed(3) });
    markSky(parts.stage, t < SETTLE[0]);
  };
  return play(scope, ASTER_MS, paint, "Asterism entrance").finally(rest);
}

// Back to Overview: the page's style fades back to the sky, the line and the
// stars go out from the last to the first, then the sky closes onto Home's
// figure as it flies home.
export function leaveAsterism(note, parts, scope) {
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const m = scope && back ? measure(parts, back, "asterism") : null;
  if (!m) return Promise.resolve(false);
  const n = m.tips.length;
  const paint = (p) => {
    const t = p * ASTER_LEAVE_MS;
    m.labels.forEach(el => paintLight(el, 1 - span(t, 0, 200)));
    m.fades.forEach(el => paintRise(el, 1 - span(t, 0, 220)));
    if (m.bloom) writeMotionStyle(m.bloom, { opacity: (1 - span(t, 80, 300)).toFixed(3) });
    markSky(parts.stage, t >= 80);
    m.line?.setAttribute("points", tracePoints(m.tips, n * (1 - clamp01((t - 200) / 340))));
    m.dots.forEach((dot, i) => writeMotionStyle(dot, scaleBy(1 - span(t, 200 + (n - 1 - i) * 40, 160))));
    if (m.fill) writeMotionStyle(m.fill, { opacity: (1 - span(t, 150, 200)).toFixed(3) });
    writeMotionStyle(parts.star, { transform: flightPose(m.flight, 1 - span(t, 520, 480)) });
    paintDisc(m.night, 1 - span(t, 560, 440));
  };
  return play(scope, ASTER_LEAVE_MS, paint, "Asterism exit");
}
