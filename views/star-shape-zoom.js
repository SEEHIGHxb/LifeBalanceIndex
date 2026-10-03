// views/star-shape-zoom.js - the way into your star's page when it is shown
// as a radar or an asterism (v152; the owner, 2026-09-30: the star's warp
// stays as it is, and the other two get ways in of their own; v153: nothing
// flies, each one leaves Home where it is and grows again in the middle).
//
// Radar, in three beats:
//   shrink    the whole radar shrinks away where it sits on Home;
//   grid      the empty grid grows from nothing in its place on the page,
//             the page's own ground opening with it;
//   shape     the shape grows out of the centre all at once, the region
//             labels riding out with it.
// Asterism, in four:
//   dim       the stars and their line go out, then Home's sky fades away
//             where it is;
//   sky       the black grows from nothing out of the figure's centre on the
//             page until it fills the page;
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
  clamp01, span, centre, flightFrom, flightPose, discFrom, paintDisc, grow,
  labelPaths, paintLabel, paintRise, restAll
} from "./star-zoom.js";
import {
  ringParts, prepareRing, restRing, paintRingPose, paintSymbols, staggered,
  paintSweep, paintWave
} from "./dial-zoom.js";

const RADAR_MS = 1750;
const RADAR_LEAVE_MS = 1000;
const SHRINK = [0, 360];
const GRID = [420, 520];
const SHAPE = [980, 460];
const RADAR_LABEL_STEP_MS = 25;
const RADAR_RISE_FROM_MS = 1150;

const ASTER_MS = 2550;
const ASTER_LEAVE_MS = 1100;
const DIM = [0, 280];
const FADE = [260, 260];
const SKY = [500, 700];
// The page's figure shows once the black has grown past it, and the specks
// once it fills the page.
const FIGURE = [880, 200];
const SPECKS = [950, 400];
// The constellation: star i pops as the line reaches it; the line leaves a
// star LEAD_MS after the first one pops and takes STEP_MS to the next.
const DRAW_FROM_MS = 1100;
const LEAD_MS = 100;
const STEP_MS = 100;
const POP_MS = 320;
const POP_PEAK = 1.6;
const POP_TURN = 0.55;
const FILL = [1900, 300];
const ASTER_RISE_FROM_MS = 1900;
const SETTLE = [2000, 450];

const RISE_STEP_MS = 65;
const RISE_MS = 400;

// The ring (v180, views/dial-zoom.js): the radar's beam goes round from the
// grid's start, then fades; the symbols come on one after another and the
// marker last, for each shape at its own time.
const BEAM = [420, 650];
const BEAM_FADE_MS = 220;
const SYMBOL_STEP_MS = 60;
const SYMBOL_MS = 160;
const MARK_MS = 150;
const RADAR_SYMBOLS_FROM_MS = 980;
const RADAR_MARK_FROM_MS = 1150;
// The asterism's ring waits for the line to close (v181), then lights in one
// wave and settles into ticks by the end.
const WAVE = [1850, 350];
const COOL = [2150, 400];
const ASTER_SYMBOLS_FROM_MS = 2200;
const ASTER_MARK_FROM_MS = 2400;
const RING_OUT_MS = 300;

const fmt = (n) => n.toFixed(2);
const scaleBy = (s) => ({ transform: `scale(${s.toFixed(4)})` });
const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const pointsOf = (pts) => pts.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(" ");
// The figure where it sat on Home, shrunk by `shrink` (0 to 1) about its centre.
const homePose = (flight, shrink = 0) => ({ transform: flightPose(flight, 0, 0, -shrink) });

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
// marked with the shape while it plays, which picks its backdrop in CSS. The
// radar's ground and the asterism's black both open from the figure's centre.
function measure(parts, from, shape) {
  const { stage, night, specks, bloom, star, labels = [], fades = [] } = parts;
  stage?.setAttribute("data-blooming", shape);
  const flight = star && from ? flightFrom(star, from) : null;
  const you = star?.querySelector(".sh-you");
  if (!flight || !you) {
    stage?.removeAttribute("data-blooming");
    return null;
  }
  const middle = centre(star.getBoundingClientRect());
  const dots = [...you.querySelectorAll(".sh-stars circle")];
  const fill = you.querySelector(".sh-fill");
  const line = you.querySelector(".sh-line");
  const ring = ringParts(parts.ring);
  prepareRing(ring, shape);
  return {
    flight, you, dots, fill, line, labels, fades, ring,
    specks: shape === "asterism" ? specks : null,
    tips: dots.map(d => ({ x: Number(d.getAttribute("cx")), y: Number(d.getAttribute("cy")) })),
    points: line?.getAttribute("points") ?? "",
    night: shape === "asterism" ? discFrom(night, middle, 0) : null,
    bloom: shape === "radar" ? discFrom(bloom, middle, 0) : bloom,
    paths: labelPaths(labels, star),
    moved: [star, night, specks, bloom, you, fill, ...dots, ...labels, ...fades]
  };
}

// Puts everything back as the page drew it.
function restore(m, stage) {
  restAll(m.moved);
  restRing(m.ring);
  if (m.line) m.line.setAttribute("points", m.points);
  stage?.removeAttribute("data-blooming");
  stage?.removeAttribute("data-sky");
}

// While the stars are drawn on the sky, the labels read light on it (CSS).
const markSky = (stage, on) => {
  if (stage && on !== stage.hasAttribute("data-sky")) stage.toggleAttribute("data-sky", on);
};

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
  const paint = (p) => {
    const t = p * RADAR_MS;
    const home = t < GRID[0];
    writeMotionStyle(parts.star, home ? homePose(m.flight, span(t, ...SHRINK)) : scaleBy(span(t, ...GRID)));
    writeMotionStyle(m.you, scaleBy(home ? 1 : span(t, ...SHAPE)));
    paintDisc(m.bloom, grow(t, GRID));
    // The ring shrinks away with the radar, then its beam goes round once as
    // the grid grows and leaves the ring behind it (v180).
    paintRingPose(m.ring, home ? homePose(m.flight, span(t, ...SHRINK)).transform : "none");
    if (!home) {
      paintSweep(m.ring, clamp01((t - BEAM[0]) / BEAM[1]), 1 - clamp01((t - BEAM[0] - BEAM[1]) / BEAM_FADE_MS));
      paintSymbols(m.ring, staggered(t, RADAR_SYMBOLS_FROM_MS, SYMBOL_STEP_MS, SYMBOL_MS), clamp01((t - RADAR_MARK_FROM_MS) / MARK_MS));
    }
    m.paths.forEach((path, i) => paintLabel(path, span(t, SHAPE[0] + i * RADAR_LABEL_STEP_MS, SHAPE[1])));
    m.fades.forEach((el, i) => paintRise(el, span(t, RADAR_RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
  };
  return play(scope, RADAR_MS, paint, "Radar entrance").finally(rest);
}

// Back to Overview: the labels go in with the shape, the empty grid shrinks
// away, and the whole radar grows again where it sits on Home. The page is
// about to be replaced, so the last pose is left as it is.
export function leaveRadar(note, parts, scope) {
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const m = scope && back ? measure(parts, back, "radar") : null;
  if (!m) return Promise.resolve(false);
  const n = m.paths.length;
  const paint = (p) => {
    const t = p * RADAR_LEAVE_MS;
    const page = t < 560;
    m.paths.forEach((path, i) => paintLabel(path, 1 - span(t, (n - 1 - i) * 20, 240)));
    m.fades.forEach(el => paintRise(el, 1 - span(t, 0, 220)));
    writeMotionStyle(m.you, scaleBy(page ? 1 - span(t, 0, 280) : 1));
    writeMotionStyle(parts.star, page ? scaleBy(1 - span(t, 240, 300)) : homePose(m.flight, 1 - span(t, 600, 400)));
    paintDisc(m.bloom, 1 - span(t, 240, 320));
    // The beam goes back round and takes the ring with it; at Home a quick
    // sweep draws it again as the radar grows there.
    const out = (i) => 1 - clamp01((t - i * 30) / 150);
    if (page) {
      paintRingPose(m.ring, "none");
      paintSweep(m.ring, 1 - clamp01(t / 300), 1);
      paintSymbols(m.ring, [out(0), out(1), out(2)], 1 - clamp01(t / 120));
    } else {
      paintRingPose(m.ring, homePose(m.flight, 1 - span(t, 600, 400)).transform);
      paintSweep(m.ring, clamp01((t - 700) / 240), 1 - clamp01((t - 940) / 60));
      paintSymbols(m.ring, staggered(t, 880, 30, 100), clamp01((t - 940) / 60));
    }
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
    const home = t < SKY[0];
    const drawing = t >= DRAW_FROM_MS;
    writeMotionStyle(parts.star, home
      ? { ...homePose(m.flight), opacity: (1 - span(t, ...FADE)).toFixed(3) }
      : { transform: "none", opacity: span(t, ...FIGURE).toFixed(3) });
    writeMotionStyle(m.you, { opacity: (home ? 1 - span(t, ...DIM) : drawing ? 1 : 0).toFixed(3) });
    if (drawing) {
      m.dots.forEach((dot, i) => writeMotionStyle(dot, scaleBy(popScale(clamp01((t - popAt(i)) / POP_MS)))));
      m.line?.setAttribute("points", tracePoints(m.tips, drawnAt(t, n)));
      if (m.fill) writeMotionStyle(m.fill, { opacity: span(t, ...FILL).toFixed(3) });
    }
    paintDisc(m.night, grow(t, SKY));
    if (m.specks) writeMotionStyle(m.specks, { opacity: span(t, ...SPECKS).toFixed(3) });
    m.labels.forEach((el, i) => paintLight(el, span(t, popAt(i), POP_MS)));
    m.fades.forEach((el, i) => paintRise(el, span(t, ASTER_RISE_FROM_MS + i * RISE_STEP_MS, RISE_MS)));
    if (m.bloom) writeMotionStyle(m.bloom, { opacity: span(t, ...SETTLE).toFixed(3) });
    markSky(parts.stage, t < SETTLE[0]);
    // The ring goes out with Home's sky; on the page it waits for the line
    // to close, then its ticks light as faint stars in one wave from the
    // marker and cool into ticks as the sky settles (v181).
    if (home) paintRingPose(m.ring, homePose(m.flight).transform, 1 - span(t, ...FADE));
    else {
      paintRingPose(m.ring, "none");
      paintWave(m.ring, t - WAVE[0], WAVE[1], span(t, ...COOL));
      paintSymbols(m.ring, staggered(t, ASTER_SYMBOLS_FROM_MS, 50, SYMBOL_MS), clamp01((t - ASTER_MARK_FROM_MS) / 130));
    }
  };
  return play(scope, ASTER_MS, paint, "Asterism entrance").finally(rest);
}

// Back to Overview: the page's style fades back to the sky, the line and the
// stars go out from the last to the first, the black shrinks into the
// figure's centre, and Home's figure fades in where it sits.
export function leaveAsterism(note, parts, scope) {
  const back = note ? { x: note.x, y: note.docY ?? note.y, width: note.width } : null;
  const m = scope && back ? measure(parts, back, "asterism") : null;
  if (!m) return Promise.resolve(false);
  const n = m.tips.length;
  let ringHome = false;
  const paint = (p) => {
    const t = p * ASTER_LEAVE_MS;
    const page = t < 820;
    m.labels.forEach(el => paintLight(el, 1 - span(t, 0, 200)));
    m.fades.forEach(el => paintRise(el, 1 - span(t, 0, 220)));
    if (m.bloom) writeMotionStyle(m.bloom, { opacity: (1 - span(t, 80, 300)).toFixed(3) });
    markSky(parts.stage, t >= 80);
    m.line?.setAttribute("points", page ? tracePoints(m.tips, n * (1 - clamp01((t - 200) / 340))) : m.points);
    m.dots.forEach((dot, i) => writeMotionStyle(dot, scaleBy(page ? 1 - span(t, 200 + (n - 1 - i) * 40, 160) : 1)));
    if (m.fill) writeMotionStyle(m.fill, { opacity: (page ? 1 - span(t, 150, 200) : 1).toFixed(3) });
    if (m.specks) writeMotionStyle(m.specks, { opacity: (1 - span(t, 400, 160)).toFixed(3) });
    paintDisc(m.night, 1 - clamp01((t - 540) / 360));
    writeMotionStyle(parts.star, page
      ? { transform: "none", opacity: (1 - span(t, 660, 140)).toFixed(3) }
      : { ...homePose(m.flight), opacity: span(t, 840, 260).toFixed(3) });
    // The ring just fades, so the stars going out stay the moment; at Home
    // it is whole again and fades in with the figure (v181).
    if (page) paintRingPose(m.ring, "none", 1 - span(t, 0, RING_OUT_MS));
    else {
      if (!ringHome) {
        restRing(m.ring);
        ringHome = true;
      }
      paintRingPose(m.ring, homePose(m.flight).transform, span(t, 840, 260));
    }
  };
  return play(scope, ASTER_LEAVE_MS, paint, "Asterism exit");
}
