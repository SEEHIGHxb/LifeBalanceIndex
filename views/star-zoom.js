// views/star-zoom.js - your star flies between Home and its own page (v135;
// the owner, 2026-09-28: a tap on the star should zoom into a page of its
// own, not burst; v136: "make the transition more creative").
//
// The page being left notes where its star sits on screen (markZoom); the
// page being drawn takes that note (takeZoom). Going in (enterStar), four
// things happen as one gesture:
//   the sky opens    a disc of the page's ground grows out of the spot where
//                    the star was tapped, so the new page blooms from it;
//   the star flies   along a gentle arc, not a straight line, growing into
//                    its place;
//   the regions      the eight labels shoot out of the star along their own
//                    rays, one after another clockwise from The Market;
//   the rest rises   the heading, the switches and Share settle up in turn.
// Coming back (leaveStar) runs it backwards: the regions are drawn back into
// the star, the disc closes onto Home's star and the star arcs home, so Home
// opens with its star already in place.
//
// Each page draws its finished layout first and only transform and opacity
// move (motion-mount.js), so reduced motion, a still page or a missed note
// simply shows the page as it is.
import { animate, easeStar, linear } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";
import { onAbort } from "./stage.js";

const ZOOM_MS = 560;
const ENTER_MS = 980;
const LEAVE_MS = 620;
// How far the flight bows away from the straight line, as a share of its length.
const ARC_BEND = 0.22;
// The labels leave the star one after another, each taking LABEL_MS.
const LABEL_FROM_MS = 280;
const LABEL_STEP_MS = 55;
const LABEL_MS = 380;
const RISE_FROM_MS = 380;
const RISE_STEP_MS = 70;
const RISE_MS = 420;
const RISE_PX = 16;
// The disc is drawn far bigger than the window, so it covers the stage well
// before it is full size; it grows slowly at first so the opening is seen.
const BLOOM_MS = 820;
const BLOOM_EASE = 2.2;
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

const flightPose = (flight, u) => {
  const at = arcOffset(flight.dx, flight.dy, u);
  const scale = flight.s0 + (1 - flight.s0) * u;
  return `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) scale(${scale.toFixed(4)})`;
};

// Where a flight starts: the note, relative to where `el` now sits.
function flightFrom(el, note) {
  const r = el.getBoundingClientRect();
  if (!(r.width > 0)) return null;
  const c = centre(r);
  return { dx: note.x - c.x, dy: note.y - c.y, s0: note.width / r.width };
}

// The disc of ground: it sits centred on the stage, big enough to cover it
// from any point, and is moved to the note and scaled down to begin there.
function bloomFrom(bloom, note) {
  const r = bloom?.getBoundingClientRect();
  if (!r || !(r.width > 0)) return null;
  const c = centre(r);
  return { dx: note.x - c.x, dy: note.y - c.y, s0: note.width / r.width };
}
const bloomPose = (b, u) => `translate(${b.dx.toFixed(1)}px, ${b.dy.toFixed(1)}px) scale(${(b.s0 + (1 - b.s0) * u).toFixed(4)})`;

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

// Into the star's page. `parts`: { stage, bloom, star, labels, fades }.
export function enterStar(note, parts, scope) {
  const { stage, bloom, star, labels = [], fades = [] } = parts;
  const flight = star && note ? flightFrom(star, note) : null;
  if (!scope || !flight) return Promise.resolve(false);
  const disc = bloomFrom(bloom, note);
  const paths = labelPaths(labels, star);
  const moved = [star, bloom, ...labels, ...fades];
  const rest = () => {
    restAll(moved);
    stage?.removeAttribute("data-blooming");
  };
  onAbort(scope.signal, rest);
  stage?.setAttribute("data-blooming", "");
  const paint = (p) => {
    const t = p * ENTER_MS;
    const fly = span(t, 0, 620);
    writeMotionStyle(star, { transform: flightPose(flight, fly) });
    if (disc) writeMotionStyle(bloom, { transform: bloomPose(disc, clamp01(t / BLOOM_MS) ** BLOOM_EASE) });
    paths.forEach((path, i) => paintLabel(path, span(t, LABEL_FROM_MS + i * LABEL_STEP_MS, LABEL_MS)));
    fades.forEach((el, i) => paintRise(el, span(t, RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
  };
  paint(0);
  return animate({ duration: ENTER_MS, ease: linear, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => { rest(); return true; }, (err) => {
      console.error("Star entrance failed:", err);
      rest();
      return false;
    });
}

// Out of the star's page, back to the spot the note came from. The page is
// about to be replaced, so the last pose is left as it is.
export function leaveStar(note, parts, scope) {
  const { stage, bloom, star, labels = [], fades = [] } = parts;
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const flight = star && back ? flightFrom(star, back) : null;
  if (!scope || !flight) return Promise.resolve(false);
  const disc = bloomFrom(bloom, back);
  const paths = labelPaths(labels, star);
  stage?.setAttribute("data-blooming", "");
  const paint = (p) => {
    const t = p * LEAVE_MS;
    const n = paths.length;
    paths.forEach((path, i) => paintLabel(path, 1 - span(t, (n - 1 - i) * 30, 260)));
    fades.forEach(el => paintRise(el, 1 - span(t, 0, 240)));
    if (disc) writeMotionStyle(bloom, { transform: bloomPose(disc, 1 - span(t, 180, LEAVE_MS - 180)) });
    writeMotionStyle(star, { transform: flightPose(flight, 1 - span(t, 120, LEAVE_MS - 120)) });
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
