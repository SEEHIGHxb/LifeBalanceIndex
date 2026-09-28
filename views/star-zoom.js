// views/star-zoom.js - your star flies between Home and its own page (v135;
// the owner, 2026-09-28: a tap on the star should zoom into a page of its
// own, not burst; v136: "make the transition more creative"; v139: "even
// make it more creative and impressive").
//
// The page being left notes where its star sits on screen (markZoom); the
// page being drawn takes that note (takeZoom). Going in (enterStar) is a warp
// into your star, in beats that overlap:
//   night falls      a disc of night sky opens out of the spot you tapped;
//   the star spins   it flies to the middle on a gentle arc, turning once,
//                    and lands with a small bounce;
//   warp             gold streaks shoot out of it as it travels;
//   landing          two rings ripple out from where it lands;
//   dawn             the page's own ground opens out of the star over the
//                    night;
//   the page         the eight regions shoot out along their rays, then the
//                    heading and the switches rise.
// Coming back (leaveStar) runs it backwards: the regions are drawn in, dawn
// closes back to night, the streaks rush inward, and the night closes onto
// Home's star as the star spins home.
//
// Each page draws its finished layout first and only transform and opacity
// move (motion-mount.js), so reduced motion, a still page or a missed note
// simply shows the page as it is; the night and the streaks are only shown
// while the stage is marked as blooming (css/star-page.css).
import { animate, easeStar, linear } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";
import { onAbort } from "./stage.js";

const ZOOM_MS = 560;
const ENTER_MS = 1500;
const LEAVE_MS = 900;
// How far the flight bows away from the straight line, as a share of its length.
const ARC_BEND = 0.22;
// The beats of the way in, in ms from the tap: [start, length].
const NIGHT = [0, 560];
const FLIGHT = [0, 720];
const WARP_FROM_MS = 120;
const LAND_MS = 640;
const DAWN = [620, 560];
// The rings ripple out one after the other as the star lands.
const RING_STEP_MS = 140;
const RING_MS = 620;
const RING_GROW = 7;
// The labels leave the star one after another, each taking LABEL_MS.
const LABEL_FROM_MS = 820;
const LABEL_STEP_MS = 50;
const LABEL_MS = 380;
const RISE_FROM_MS = 1000;
const RISE_STEP_MS = 70;
const RISE_MS = 420;
const RISE_PX = 16;
// The star turns once on its way and swells a little as it lands.
const SPIN_DEG = -360;
const POP = 0.14;
const POP_MS = 420;
// Each streak leaves a little after the one before, at its own reach, so the
// warp reads as depth rather than a ring.
const STREAK_LAG_MS = 260;
const STREAK_MS = 440;
// A disc grows slowly at first so its opening is seen.
const DISC_EASE = 2;
// A note older than this belongs to some other navigation; it is dropped.
const FRESH_MS = 1500;
let pending = null;

const now = () => (typeof performance === "object" ? performance.now() : Date.now());
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// Progress through [start, start + length] of a timeline at `t` ms, eased.
const span = (t, start, length) => easeStar(clamp01((t - start) / length));
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// `y` is where the star was on screen; `docY` where it sits on its page, for
// the way back, when Home is drawn again from its top.
export function markZoom(el) {
  const r = el?.getBoundingClientRect?.();
  const scrolled = typeof scrollY === "number" ? scrollY : 0;
  pending = r && r.width > 0
    ? { ...centre(r), docY: r.top + r.height / 2 + scrolled, width: r.width, at: now() }
    : null;
}

export function takeZoom() {
  const from = pending;
  pending = null;
  return from && now() - from.at < FRESH_MS ? from : null;
}

// A point on the arc from an offset (dx, dy) home to (0, 0); u runs 0 to 1.
export function arcOffset(dx, dy, u) {
  const cx = dx / 2 - dy * ARC_BEND;
  const cy = dy / 2 + dx * ARC_BEND;
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  return { x: a * dx + b * cx, y: a * dy + b * cy };
}

// The star at `u` along its flight, turned `turn` degrees and swollen by `pop`.
const flightPose = (flight, u, turn = 0, pop = 0) => {
  const at = arcOffset(flight.dx, flight.dy, u);
  const scale = (flight.s0 + (1 - flight.s0) * u) * (1 + pop);
  return `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) rotate(${turn.toFixed(1)}deg) scale(${scale.toFixed(4)})`;
};

// Where a flight starts: the note, relative to where `el` now sits.
function flightFrom(el, note) {
  const r = el.getBoundingClientRect();
  if (!(r.width > 0)) return null;
  const c = centre(r);
  return { dx: note.x - c.x, dy: note.y - c.y, s0: note.width / r.width };
}

// A disc (the night, or the page's ground): it sits centred on the stage, big
// enough to cover it from any point, and is moved to `from` and scaled down
// to `width` to begin there.
function discFrom(disc, from, width) {
  const r = disc?.getBoundingClientRect();
  if (!r || !(r.width > 0)) return null;
  const c = centre(r);
  return { el: disc, dx: from.x - c.x, dy: from.y - c.y, s0: width / r.width };
}
function paintDisc(disc, u) {
  if (!disc) return;
  const q = 1 - u;
  writeMotionStyle(disc.el, {
    transform: `translate(${(disc.dx * q).toFixed(1)}px, ${(disc.dy * q).toFixed(1)}px) scale(${(disc.s0 + (1 - disc.s0) * u).toFixed(4)})`
  });
}
const grow = (t, [start, length]) => clamp01((t - start) / length) ** DISC_EASE;

// The warp's streaks and the landing's rings, placed from the star's centre
// on the stage. Every streak has its own angle, lag and reach, fixed by its
// index so the warp looks the same each time.
function fxFrom(stage, star, streaks, rings) {
  const sr = stage?.getBoundingClientRect();
  if (!sr || !(sr.width > 0)) return null;
  const c = centre(star.getBoundingClientRect());
  const reach = Math.hypot(sr.width, sr.height) * 0.55;
  const n = streaks.length || 1;
  return {
    x: c.x - sr.left,
    y: c.y - sr.top,
    streaks: streaks.map((el, i) => ({
      el,
      angle: (i / n) * Math.PI * 2 + (((i * 37) % 11) - 5) * 0.03,
      lag: (((i * 53) % 7) / 6) * STREAK_LAG_MS,
      reach: reach * (0.6 + ((i * 29) % 5) * 0.1)
    })),
    rings: rings.map(el => ({ el, half: el.offsetWidth / 2 || 0 }))
  };
}
function paintStreak(fx, streak, u) {
  const out = 24 + streak.reach * u;
  writeMotionStyle(streak.el, {
    transform: `translate(${fx.x.toFixed(1)}px, ${fx.y.toFixed(1)}px) rotate(${streak.angle.toFixed(3)}rad) translateX(${out.toFixed(1)}px) scaleX(${(0.2 + 1.6 * Math.min(1, u * 2)).toFixed(3)})`,
    opacity: Math.sin(Math.PI * u).toFixed(3)
  });
}
function paintRing(fx, ring, u) {
  writeMotionStyle(ring.el, {
    transform: `translate(${(fx.x - ring.half).toFixed(1)}px, ${(fx.y - ring.half).toFixed(1)}px) scale(${(0.3 + RING_GROW * u).toFixed(3)})`,
    opacity: (u > 0 && u < 1 ? (1 - u) * 0.9 : 0).toFixed(3)
  });
}

// Each label's way out of the star's centre to its place.
function labelPaths(labels, star) {
  const s = centre(star.getBoundingClientRect());
  return labels.map(el => {
    const c = centre(el.getBoundingClientRect());
    return { el, dx: s.x - c.x, dy: s.y - c.y };
  });
}
function paintLabel(path, u) {
  const q = 1 - u;
  writeMotionStyle(path.el, {
    transform: `translate(${(path.dx * q).toFixed(1)}px, ${(path.dy * q).toFixed(1)}px) scale(${(0.35 + 0.65 * u).toFixed(3)})`,
    opacity: u.toFixed(3)
  });
}
const paintRise = (el, u) => writeMotionStyle(el, { transform: `translateY(${(RISE_PX * (1 - u)).toFixed(1)}px)`, opacity: u.toFixed(3) });

function restAll(els) {
  for (const el of els) if (el) writeMotionStyle(el, { transform: "", opacity: "" });
}

// Everything that moves, measured once from the finished page. `parts`:
// { stage, night, bloom, star, labels, fades, streaks, rings }.
function measure(parts, from) {
  const { stage, night, bloom, star, labels = [], fades = [], streaks = [], rings = [] } = parts;
  const flight = star && from ? flightFrom(star, from) : null;
  if (!flight) return null;
  return {
    flight,
    fx: fxFrom(stage, star, streaks, rings),
    night: discFrom(night, from, from.width),
    dawn: discFrom(bloom, centre(star.getBoundingClientRect()), 0),
    paths: labelPaths(labels, star),
    fades,
    moved: [star, night, bloom, ...labels, ...fades, ...streaks, ...rings]
  };
}

function paintWarp(m, t) {
  if (!m.fx) return;
  m.fx.streaks.forEach(s => paintStreak(m.fx, s, clamp01((t - WARP_FROM_MS - s.lag) / STREAK_MS)));
  m.fx.rings.forEach((ring, i) => paintRing(m.fx, ring, easeStar(clamp01((t - LAND_MS - i * RING_STEP_MS) / RING_MS))));
}

// The night and the effects are only laid out while the stage is marked as
// blooming, so the mark goes on before they are measured, and comes off
// again when there is nothing to play.
function measureBlooming(parts, from) {
  parts.stage?.setAttribute("data-blooming", "");
  const m = measure(parts, from);
  if (!m) parts.stage?.removeAttribute("data-blooming");
  return m;
}

// Into the star's page: the warp.
export function enterStar(note, parts, scope) {
  const m = scope && note ? measureBlooming(parts, note) : null;
  if (!m) return Promise.resolve(false);
  const { stage, star } = parts;
  const rest = () => {
    restAll(m.moved);
    stage?.removeAttribute("data-blooming");
  };
  onAbort(scope.signal, rest);
  const paint = (p) => {
    const t = p * ENTER_MS;
    const fly = span(t, ...FLIGHT);
    const pop = Math.sin(Math.PI * clamp01((t - LAND_MS) / POP_MS)) * POP;
    paintDisc(m.night, grow(t, NIGHT));
    writeMotionStyle(star, { transform: flightPose(m.flight, fly, SPIN_DEG * (1 - fly), pop) });
    paintWarp(m, t);
    paintDisc(m.dawn, grow(t, DAWN));
    m.paths.forEach((path, i) => paintLabel(path, span(t, LABEL_FROM_MS + i * LABEL_STEP_MS, LABEL_MS)));
    m.fades.forEach((el, i) => paintRise(el, span(t, RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
  };
  paint(0);
  return animate({ duration: ENTER_MS, ease: linear, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => { rest(); return true; }, (err) => {
      console.error("Star entrance failed:", err);
      rest();
      return false;
    });
}

// Out of the star's page, back to the spot the note came from: the warp run
// backwards, quicker. The page folds away first, dawn closes to night, the
// streaks rush in, then the night and the star go home together. The page
// is about to be replaced, so the last pose is left as it is.
export function leaveStar(note, parts, scope) {
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const m = scope && back ? measureBlooming(parts, back) : null;
  if (!m) return Promise.resolve(false);
  const { star } = parts;
  const n = m.paths.length;
  const paint = (p) => {
    const t = p * LEAVE_MS;
    m.paths.forEach((path, i) => paintLabel(path, 1 - span(t, (n - 1 - i) * 25, 240)));
    m.fades.forEach(el => paintRise(el, 1 - span(t, 0, 220)));
    paintDisc(m.dawn, 1 - span(t, 120, 320));
    if (m.fx) m.fx.streaks.forEach(s => paintStreak(m.fx, s, 1 - clamp01((t - 260 - s.lag / 2) / 360)));
    const home = span(t, 380, LEAVE_MS - 380);
    writeMotionStyle(star, { transform: flightPose(m.flight, 1 - home, SPIN_DEG * home) });
    paintDisc(m.night, 1 - span(t, 460, LEAVE_MS - 460));
  };
  return animate({ duration: LEAVE_MS, ease: linear, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => true, (err) => {
      console.error("Star exit failed:", err);
      return false;
    });
}

// Home's end of a trip that began elsewhere (the page was opened by its
// address, so there is no way back to fly): the star settles from the note.
export function zoomFrom(el, from, scope, fade = []) {
  const flight = el && from ? flightFrom(el, from) : null;
  if (!scope || !flight) return Promise.resolve(false);
  const rest = () => restAll([el, ...fade]);
  onAbort(scope.signal, rest);
  const paint = (p) => {
    writeMotionStyle(el, { transform: flightPose(flight, p) });
    for (const f of fade) writeMotionStyle(f, { opacity: p.toFixed(3) });
  };
  paint(0);
  return animate({ duration: ZOOM_MS, ease: easeStar, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => { rest(); return true; }, (err) => {
      console.error("Star zoom failed:", err);
      rest();
      return false;
    });
}
