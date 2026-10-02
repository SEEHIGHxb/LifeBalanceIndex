// views/shape.js - your eight scores as a star, a radar or your asterism
// (v134; the owner, 2026-09-28: bring back the radar, swap between them, and
// a third view that fits the name).
//
// One figure, three views. Every view is eight kites (chart.js shapeKite), so
// a switch morphs the same eight polygons point by point: star to radar moves
// only the valleys out to the radar's edges, and radar to asterism keeps the
// points, fades the fill and lights a star on each one over a night disc. The
// guides (the star's ground and outline, the radar's rings, the night) are
// layers the figure's data-view shows and hides in CSS (css/shape.css).
//
// The choice is a display preference kept in its own key, like the language:
// it survives an erase and follows the reader to Home, Side by Side and the
// share card.
import { shapeKite, shapeRim, asterismStarRadius, SHAPE_VIEWS } from "../chart.js";
import { animate, anySignal, easeStar } from "../motion.js";
import { t } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

export { SHAPE_VIEWS };
const VIEW_KEY = "lifequest_shape_view";
const MORPH_MS = 620;
const C = 50;
export const SHAPE_R = 47;
const RINGS = [0.25, 0.5, 0.75, 1];
// The sky behind the asterism: fixed specks, the same on every visit.
const SPECKS = [[22, 30], [74, 18], [83, 64], [30, 80], [58, 88], [12, 55], [66, 40], [40, 16], [90, 42], [18, 72], [48, 60], [79, 84]];

export function readShapeView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return SHAPE_VIEWS.includes(saved) ? saved : "star";
  } catch {
    return "star";
  }
}

export function saveShapeView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Blocked storage only means the choice is not remembered.
  }
}

const fmt = (n) => n.toFixed(2);
const attr = (pts) => pts.map(p => `${fmt(p.x)} ${fmt(p.y)}`).join(" ");
const lerpPt = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
// Scores as numbers in 0..100: a missing one reads as 0, as the star draws it.
const norm = (scores) => (scores ? scores.map(v => Math.max(0, Math.min(100, Number(v) || 0))) : null);

const starRadius = (score) => asterismStarRadius(score) * SHAPE_R;

// One reading's layer: its eight kites, the line through its tips and a star
// on each tip. Which of the three shows is the view's business (CSS).
function personMarkup(cls, view, scores, half) {
  const kites = scores.map((_, i) => shapeKite(view, i, scores, C, C, SHAPE_R, half));
  const tips = kites.map(k => k[2]);
  return `<g class="sh-person ${cls}">` +
    `<g class="sh-fill">${kites.map(k => `<polygon points="${attr(k)}"/>`).join("")}</g>` +
    `<polygon class="sh-line" points="${attr(tips)}"/>` +
    `<g class="sh-stars">${tips.map((p, i) => `<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(starRadius(scores[i]))}"/>`).join("")}</g>` +
    `</g>`;
}

function guidesMarkup() {
  const rings = RINGS.map(f => `<polygon points="${attr(shapeRim("radar", C, C, SHAPE_R, f))}"/>`).join("");
  const spokes = shapeRim("radar", C, C, SHAPE_R).map(p => `<line x1="${C}" y1="${C}" x2="${fmt(p.x)}" y2="${fmt(p.y)}"/>`).join("");
  const specks = SPECKS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.45"/>`).join("");
  return `<circle class="sh-night" cx="${C}" cy="${C}" r="49"/>` +
    `<g class="sh-specks">${specks}</g>` +
    `<polygon class="sh-ground" points="${attr(shapeRim("star", C, C, SHAPE_R))}"/>` +
    `<g class="sh-grid">${rings}${spokes}</g>`;
}

// Each ray's average as an open chevron (valley, tip, valley).
function avgLevels(avg) {
  return avg.map((_, i) => {
    const [, a, tip, b] = shapeKite("star", i, avg, C, C, SHAPE_R);
    return `M${fmt(a.x)} ${fmt(a.y)}L${fmt(tip.x)} ${fmt(tip.y)}L${fmt(b.x)} ${fmt(b.y)}`;
  }).join("");
}

// The figure. `you` and `them` are eight scores in RADAR_KEYS order; with
// `them`, the star view splits every ray between the two ("start" is yours).
// `avg` dashes the population average, as a level on each ray in the star and
// as a ring through the average points in the other two.
export function shapeFigure({ view = readShapeView(), you, them = null, avg = null, extra = "" } = {}) {
  you = norm(you);
  them = norm(them);
  const duo = !!them;
  const avgMarkup = avg
    ? `<path class="sh-avg sh-avg-star" d="${avgLevels(avg)}"/>` +
      `<polygon class="sh-avg sh-avg-ring" points="${attr(avg.map((_, i) => shapeKite("radar", i, avg, C, C, SHAPE_R)[2]))}"/>`
    : "";
  return `<svg class="shape${duo ? " shape-duo" : ""}" data-view="${view}" viewBox="0 0 100 100" aria-hidden="true">` +
    guidesMarkup() +
    personMarkup("sh-you", view, you, duo ? "start" : "both") +
    (duo ? personMarkup("sh-them", view, them, "end") : "") +
    avgMarkup +
    `<polygon class="sh-edge" points="${attr(shapeRim("star", C, C, SHAPE_R))}"/>` +
    `<circle class="sh-hub" cx="${C}" cy="${C}" r="6"/>` +
    extra +
    `</svg>`;
}

// Redraws one reading part way (p, 0..1) from one view and set of scores to
// another. Tips and star sizes follow the scores; the kites follow both.
function drawPerson(layer, half, from, to, p) {
  if (!layer) return;
  const polys = layer.querySelectorAll(".sh-fill polygon");
  const stars = layer.querySelectorAll(".sh-stars circle");
  const tips = [];
  polys.forEach((poly, i) => {
    const a = shapeKite(from.view, i, from.scores, C, C, SHAPE_R, half);
    const b = shapeKite(to.view, i, to.scores, C, C, SHAPE_R, half);
    const kite = a.map((pt, k) => lerpPt(pt, b[k], p));
    poly.setAttribute("points", attr(kite));
    tips.push(kite[2]);
    const star = stars[i];
    if (star) {
      star.setAttribute("cx", fmt(kite[2].x));
      star.setAttribute("cy", fmt(kite[2].y));
      star.setAttribute("r", fmt(starRadius(from.scores[i] + (to.scores[i] - from.scores[i]) * p)));
    }
  });
  layer.querySelector(".sh-line")?.setAttribute("points", attr(tips));
}

// Records what a freshly drawn figure shows, so the first morph knows.
export function adoptShape(svg, { view, you, them = null }) {
  if (svg) svg.__shape = { view, you: norm(you), them: norm(them) };
}

// Moves a figure to a new view and/or new scores. With a live motion scope it
// morphs; without one (a still page, reduced motion) it lands at once. The
// figure remembers where it is going, so a second switch mid-way starts from
// the new target rather than jumping back.
export function morphShape(svg, next, scope = null) {
  if (!svg?.__shape) return Promise.resolve(false);
  const from = svg.__shape;
  const to = { view: next.view ?? from.view, you: norm(next.you) ?? from.you, them: norm(next.them) ?? from.them };
  svg.__shape = to;
  svg.dataset.view = to.view;
  const duo = svg.classList.contains("shape-duo");
  const draw = (p) => {
    drawPerson(svg.querySelector(".sh-you"), duo ? "start" : "both", { view: from.view, scores: from.you }, { view: to.view, scores: to.you }, p);
    if (duo) drawPerson(svg.querySelector(".sh-them"), "end", { view: from.view, scores: from.them }, { view: to.view, scores: to.them }, p);
  };
  if (!scope) {
    draw(1);
    return Promise.resolve(true);
  }
  return animate({ duration: MORPH_MS, ease: easeStar, update: draw, signal: scope.signal, reduced: "end" })
    .catch(err => {
      console.error("Shape morph failed:", err);
      draw(1);
    });
}

// Each view as a symbol (the owner, v157: symbols rather than words, on every
// screen): the star, the radar's web, the asterism's joined dots. The word is
// the button's name and its tooltip.
const SHAPE_ICONS = {
  star: `<path d="M12 2.5l1.6 5.6 5.1-2.8-2.8 5.1 5.6 1.6-5.6 1.6 2.8 5.1-5.1-2.8-1.6 5.6-1.6-5.6-5.1 2.8 2.8-5.1-5.6-1.6 5.6-1.6-2.8-5.1 5.1 2.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  radar: `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.5l6.7 2.8 2.8 6.7-2.8 6.7-6.7 2.8-6.7-2.8-2.8-6.7 2.8-6.7z"/><path d="M12 7.5l3.2 1.3 1.3 3.2-1.3 3.2-3.2 1.3-3.2-1.3-1.3-3.2 1.3-3.2z" stroke-width="1.2"/><path d="M12 2.5v19M2.5 12h19" stroke-width="1"/></g>`,
  asterism: `<g fill="currentColor"><path d="M4.5 17.5L9 9.5l6 3 4.5-8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4.5" cy="17.5" r="2"/><circle cx="9" cy="9.5" r="2"/><circle cx="15" cy="12.5" r="2"/><circle cx="19.5" cy="4.5" r="2"/></g>`
};

// --- the dial (v179) ---------------------------------------------------------
// The owner, 2026-10-02: rather than a bar of buttons, a ring round the figure
// to turn like a compass bezel. A third of a turn is one view, and it goes
// round for ever: past the asterism the star comes back (its kites morph
// straight from the asterism's), so either way round is a way there. The
// kites follow the hand; the layers (the ground, the grid, the night) cross
// over at halfway with the fades css/shape.css already has, which keeps Side
// by Side's two readings in their own colours. The ring is the only grip: the
// figure inside it still scrolls the page and, on Home, opens Your star.
const TURN = (2 * Math.PI) / 3;
// A release this fast carries on to the next view: the turn it would reach
// in this many milliseconds decides where it lands.
const FLING_MS = 200;
const SETTLE_MS = 420;
// The first sight of a ring sways it this far (a fraction of a view), twice.
const SWAY = 0.22;
const SWAY_MS = 1400;
const SWAY_DELAY_MS = 1800;
const HINT_MS = 6000;
const HINT_KEY = "lifequest_dial_hint_seen";
const TICK_DEG = 7.5;
const RING_R = 55;

const mod3 = (n) => ((n % 3) + 3) % 3;
export const viewAtTurn = (turn) => SHAPE_VIEWS[mod3(Math.round(turn))];

// The nearest turn from `turn` that shows `view`.
export function turnFor(view, turn) {
  const base = Math.round(turn);
  const want = SHAPE_VIEWS.indexOf(view);
  return [base, base + 1, base - 1].find(v => mod3(v) === want) ?? base;
}

// Where a released ring lands: the nearest view, or the next one along when
// it was let go moving fast. Never more than one view from where it was.
export function settleTurn(turn, velocity = 0) {
  const near = Math.round(turn);
  const projected = Math.round(turn + velocity * FLING_MS);
  return Math.max(near - 1, Math.min(near + 1, projected));
}

// The ring: a band of ticks with the three symbols on it, turned so the
// current view's symbol sits under the marker at the top. Its box is the
// figure's plus 12 units each side (css/shape.css insets the figure to
// match). The wide clear circle over the band, reaching in over the rays'
// outer part, is what the hand takes hold of.
function ringMarkup(turn) {
  const ticks = [];
  for (let deg = 0; deg < 360; deg += TICK_DEG) {
    const a = (deg * Math.PI) / 180;
    const major = deg % 30 === 0;
    const inner = major ? 52.2 : 53.2;
    ticks.push(`<line${major ? ' class="major"' : ""} x1="${fmt(C + Math.cos(a) * inner)}" y1="${fmt(C + Math.sin(a) * inner)}" x2="${fmt(C + Math.cos(a) * 54.6)}" y2="${fmt(C + Math.sin(a) * 54.6)}"/>`);
  }
  const icons = SHAPE_VIEWS.map((v, i) => {
    const a = ((-90 - i * 120) * Math.PI) / 180;
    const x = fmt(C + Math.cos(a) * RING_R);
    const y = fmt(C + Math.sin(a) * RING_R);
    return `<g class="dial-icon" transform="translate(${x} ${y}) rotate(${-i * 120}) scale(0.26) translate(-12 -12)">${SHAPE_ICONS[v]}</g>`;
  }).join("");
  return `<svg class="dial-ring" viewBox="-12 -12 124 124" aria-hidden="true" focusable="false">` +
    `<g class="dial-turn" transform="rotate(${fmt(turn * 120)} ${C} ${C})">` +
    `<circle class="dial-band" cx="${C}" cy="${C}" r="${RING_R}"/>` +
    `<g class="dial-ticks">${ticks.join("")}</g>${icons}</g>` +
    `<path class="dial-mark" d="M50 -8.4L46.6 -11.8L53.4 -11.8Z"/>` +
    `<circle class="dial-hit" cx="${C}" cy="${C}" r="50"/>` +
    `</svg>`;
}

// A figure (shapeFigure) inside its ring.
export function shapeDial(figure, view = readShapeView()) {
  const turn = Math.max(0, SHAPE_VIEWS.indexOf(view));
  return `<div class="shape-dial"><div class="dial-fig">${figure}</div>${ringMarkup(turn)}</div>`;
}

// The figure part way round: between the views either side of `turn`, and
// showing the layers of the nearer one.
function drawTurn(svg, turn) {
  const shape = svg?.__shape;
  if (!shape) return;
  const base = Math.floor(turn);
  const p = turn - base;
  const from = SHAPE_VIEWS[mod3(base)];
  const to = SHAPE_VIEWS[mod3(base + 1)];
  const duo = svg.classList.contains("shape-duo");
  drawPerson(svg.querySelector(".sh-you"), duo ? "start" : "both", { view: from, scores: shape.you }, { view: to, scores: shape.you }, p);
  if (duo) drawPerson(svg.querySelector(".sh-them"), "end", { view: from, scores: shape.them }, { view: to, scores: shape.them }, p);
  const near = p < 0.5 ? from : to;
  if (svg.dataset.view !== near) svg.dataset.view = near;
}

// Under the figure: a dot for each view, the buttons a tap, the keyboard and
// a screen reader use, and the line the first sight of a ring shows.
export function shapeSwitchMarkup(view = readShapeView()) {
  const names = { star: t("Star"), radar: t("Radar"), asterism: t("Asterism") };
  return `<div class="shape-dots" role="group" aria-label="${escapeHtml(t("Show your eight aspects as"))}">` +
    SHAPE_VIEWS.map(v => `<button type="button" class="shape-dot" data-shape="${v}" aria-pressed="${v === view}" aria-label="${escapeHtml(names[v])}" title="${escapeHtml(names[v])}"><i aria-hidden="true"></i></button>`).join("") +
    `<span class="dial-hint" hidden>${escapeHtml(t("Turn the ring to change the view"))}</span>` +
    `</div>`;
}

const tick = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    // No vibration (a desktop, or not allowed yet): the turn still works.
  }
};

function hintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function markHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Blocked storage: the hint may show again, which is harmless.
  }
}

// Turning by hand. The angle swept round the ring's centre is the turn; a
// pointer that leaves the ring keeps turning it until let go.
function bindRing(dial, dialer) {
  const hit = dial.querySelector(".dial-hit");
  if (!hit) return;
  let drag = null;
  const angleAt = (e) => {
    const box = dial.getBoundingClientRect();
    return Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2));
  };
  hit.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    dialer.stop();
    dialer.hideHint();
    const now = performance.now();
    drag = { angle: angleAt(e), start: dialer.turn(), swept: 0, last: dialer.turn(), lastAt: now, velocity: 0 };
    hit.setPointerCapture?.(e.pointerId);
    dial.classList.add("is-turning");
  });
  hit.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const angle = angleAt(e);
    let delta = angle - drag.angle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    else if (delta < -Math.PI) delta += 2 * Math.PI;
    const value = drag.start + (drag.swept + delta) / TURN;
    const now = performance.now();
    const speed = (value - drag.last) / Math.max(1, now - drag.lastAt);
    drag = { ...drag, angle, swept: drag.swept + delta, last: value, lastAt: now, velocity: 0.6 * speed + 0.4 * drag.velocity };
    const before = viewAtTurn(dialer.turn());
    dialer.paint(value);
    if (viewAtTurn(value) !== before) tick();
  });
  const release = () => {
    if (!drag) return;
    const { velocity } = drag;
    drag = null;
    dial.classList.remove("is-turning");
    dialer.settle(settleTurn(dialer.turn(), velocity));
  };
  hit.addEventListener("pointerup", release);
  hit.addEventListener("pointercancel", release);
  // iOS scrolls the page under a touch unless the touch itself is held.
  hit.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
}

// Wires the dials and dots under `root`: the choice is saved and every
// figure under `root` moves to it, so a page with two figures keeps them in
// step (one without a ring, Side by Side's small mark, follows by a morph).
// `scope` is the page's motion scope, or null on a still page. The listeners
// sit on elements each render draws afresh, so a redraw never stacks them.
export function bindShapeSwitch(root, scope) {
  if (!root) return;
  const dials = [...root.querySelectorAll(".shape-dial")];
  const hint = root.querySelector(".dial-hint");
  let turn = Math.max(0, SHAPE_VIEWS.indexOf(root.querySelector(".shape-dial svg.shape")?.dataset.view ?? readShapeView()));
  let shown = viewAtTurn(turn);
  let running = null;

  const markDots = (view) => root.querySelectorAll(".shape-dot").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.shape === view)));
  const paint = (value) => {
    turn = value;
    dials.forEach(d => d.querySelector(".dial-turn")?.setAttribute("transform", `rotate(${fmt(value * 120)} ${C} ${C})`));
    dials.forEach(d => drawTurn(d.querySelector("svg.shape"), value));
    const view = viewAtTurn(value);
    if (view !== shown) {
      shown = view;
      markDots(view);
    }
  };
  const commit = (value) => {
    const view = viewAtTurn(value);
    saveShapeView(view);
    dials.forEach(d => {
      const svg = d.querySelector("svg.shape");
      if (svg?.__shape) svg.__shape = { ...svg.__shape, view };
    });
    root.querySelectorAll("svg.shape").forEach(svg => {
      if (!svg.closest(".shape-dial") && svg.dataset.view !== view) morphShape(svg, { view }, scope);
    });
  };
  const stop = () => {
    running?.abort();
    running = null;
  };
  const settle = (target) => {
    stop();
    commit(target);
    const from = turn;
    if (!scope || from === target) {
      paint(target);
      return;
    }
    const ctl = new AbortController();
    running = ctl;
    animate({ duration: SETTLE_MS, ease: easeStar, update: (p) => paint(from + (target - from) * p), signal: anySignal([scope.signal, ctl.signal]), reduced: "end" })
      .catch(err => {
        console.error("Shape dial failed:", err);
        paint(target);
      });
  };
  const hideHint = () => {
    if (hint) hint.hidden = true;
  };
  const dialer = { turn: () => turn, paint, settle, stop, hideHint };

  dials.forEach(dial => bindRing(dial, dialer));
  root.querySelectorAll(".shape-dots").forEach(group => {
    group.addEventListener("click", (e) => {
      const view = e.target.closest(".shape-dot")?.dataset.shape;
      if (!SHAPE_VIEWS.includes(view)) return;
      hideHint();
      settle(turnFor(view, turn));
    });
    group.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      hideHint();
      const target = Math.round(turn) + step;
      settle(target);
      group.querySelector(`.shape-dot[data-shape="${viewAtTurn(target)}"]`)?.focus();
    });
  });

  // The first ring a device shows sways, with a line under it, once.
  if (!dials.length || !hint || !scope || hintSeen()) return;
  markHintSeen();
  hint.hidden = false;
  const home = turn;
  animate({ duration: SWAY_MS, delay: SWAY_DELAY_MS, update: (p) => paint(home + SWAY * Math.sin(p * Math.PI * 4)), signal: scope.signal, reduced: () => {} })
    .then(() => setTimeout(hideHint, HINT_MS))
    .catch(err => console.error("Shape dial hint failed:", err));
}
