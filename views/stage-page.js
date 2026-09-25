// views/stage-page.js - the sections the redesign's long pages share (redesign
// R3; docs/prototype/redesign/proto.js heroHTML, missionHTML, bandHTML and
// their mounts). The Landing (views/landing.js), Home (views/dashboard.js),
// the aspect pages (views/aspect.js) and Goals (views/quests.js) are built
// from them.
//
// A stage page is a finished HTML string first. The motion here only animates
// toward it: reduced motion leaves it exactly so, and every piece of motion
// ends with the mount (views/motion-mount.js), which the next route disposes.
//
//   hero      a lockup (a mark over a word and a smaller line) that follows
//             the pointer on a laptop and bursts when it lets go or is tapped
//   mission   a label and a headline that types itself once it is well in view
//   cards     region cards that slide in from the right as they come up
//   band      three region photographs that wipe over each other on scroll

import { CHAPTERS } from "./journey.js";
import { mountMotion, writeMotionStyle } from "./motion-mount.js";
import { typedMarkup, typeIn, burst, onAbort } from "./stage.js";
import { loop, isReduced } from "../motion.js";
import { escapeHtml } from "./helpers.js";

// The prototype's reference widths: laptop geometry is written at 2545px wide
// and phone geometry at 820px, both scaled to the real width.
const DESKTOP_REF = 2545;
const MOBILE_REF = 820;
const MOBILE_MAX_PX = 900;

// V5/V6_REVIEW hero constants, unchanged: the parts follow the pointer offset
// from (cx, cy); leaving the field snaps the tether, the motifs burst from the
// mark and the parts spring home.
const HERO = {
  cx: 1272.5, cy: 644, field: { x0: 395, x1: 2150, y0: 120, y1: 1250 },
  tauS: 0.055, maxRot: 12, maxScale: 1.2, markTurn: 0.6,
  pivots: {
    desktop: { turn: { x: 1272, y: 735 }, scale: { x: 1272, y: 462 } },
    mobile: { turn: { x: 410, y: 560 }, scale: { x: 410, y: 370 } }
  },
  spring: { k: 480, c: 17 }, kick: -8, cooldownMs: 800,
  tapSpin: 90, tapGrow: 1.4, tapLift: -600
};
const SPRING_STEP_S = 1 / 240;
const MAX_DT_S = 0.05;

// V5_REVIEW slab entry: a card starts SLAB.x to the right and eases home as it
// rises SLAB.span up the screen.
const SLAB = { from: 18, span: 525, pow: 3.5, x: 158, alpha: 0.2 };
// V5_REVIEW #16: where the band's second and third photographs wipe in.
const WIPES = [{ from: 167, to: -320 }, { from: -327, to: -565 }];
const TYPE_MS_PER_CHAR = 55;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isPhone = () => typeof matchMedia === "function" && matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;

export const EVERY_MOTIF = CHAPTERS.map(c => ({ motif: c.aspect, hue: c.hue }));

// "(WHY)": the prototype's section label, in brackets.
export const label = (text) => `<h2 class="label">(${escapeHtml(text)})</h2>`;

// The hero. `mark` is trusted markup built by the caller, and `wash` a
// chapter's own colour (an aspect page sits on its region's wash); every other
// value is text and is escaped here.
export function heroMarkup({ mark, word, inc, srTitle, tapLabel, wash = "" }) {
  return `
    <section class="hero"${wash ? ` style="background: ${wash};"` : ""}>
      <div class="hero-stage">
        <h2 class="sr-only">${escapeHtml(srTitle)}</h2>
        <div class="burst-layer" aria-hidden="true"></div>
        <div class="lockup" aria-hidden="true">
          <div class="part part-mark" data-part="mark"><div class="mark">${mark}</div></div>
          <div class="part" data-part="word"><div class="word">${escapeHtml(word)}</div></div>
          <div class="part" data-part="inc"><div class="inc">${escapeHtml(inc)}</div></div>
        </div>
        <button class="mark-hit" type="button" aria-label="${escapeHtml(tapLabel)}"></button>
      </div>
    </section>`;
}

// The typed headline under its label. `lines` are text.
export function missionMarkup(labelText, lines) {
  return `
    <section class="panel mission"><div class="wrap split">
      ${label(labelText)}
      <p class="headline mission-head">${typedMarkup(lines)}</p>
    </div></section>`;
}

// Three regions' photographs, by chapter index; decoration, so hidden.
export function bandMarkup(indices) {
  return `
    <section class="photoband" aria-hidden="true">
      ${indices.map(i => `<i><b style="background-image: url('./assets/regions/${CHAPTERS[i].art}.jpg');"><span>${escapeHtml(CHAPTERS[i].region)}</span></b></i>`).join("")}
    </section>`;
}

// --- the hero ------------------------------------------------------------
//
// Three parts (the mark, the word, the line under it) chase a target set by
// the pointer, the whole lockup turning and growing with the pointer's product
// offset. Past the field, or on leaving the stage, the mark bursts and
// everything springs home. On a phone there is no pointer to follow, so a tap
// on the mark does the burst and a knock that springs back.
function mountHero(root, scope, motifs) {
  const stage = root.querySelector(".hero-stage");
  if (!stage) return;
  const partEl = (id) => stage.querySelector(`[data-part="${id}"]`);
  const lockup = stage.querySelector(".lockup");
  const markEl = stage.querySelector(".mark");
  const layer = stage.querySelector(".burst-layer");
  const parts = ["mark", "word", "inc"].map(id => ({ id, el: partEl(id), x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
  const group = { r: 0, s: 1, vr: 0, vs: 0, tr: 0, ts: 1 };
  const hero = { mode: "follow", engaged: false, coolUntil: 0, running: false };
  // Read the breakpoint live: a resize or a rotation can cross it mid-mount.
  const px = () => stage.clientWidth / (isPhone() ? MOBILE_REF : DESKTOP_REF);
  const pivot = () => HERO.pivots[isPhone() ? "mobile" : "desktop"];

  const paint = () => {
    const p = px();
    const T = (x, y) => `translate(${(x * p).toFixed(2)}px,${(y * p).toFixed(2)}px)`;
    const { turn, scale } = pivot();
    writeMotionStyle(lockup, {
      transform: `${T(turn.x, turn.y)} rotate(${group.r.toFixed(3)}deg) ${T(scale.x - turn.x, scale.y - turn.y)} scale(${group.s.toFixed(4)}) ${T(-scale.x, -scale.y)}`
    });
    for (const part of parts) {
      const turnMark = part.id === "mark" ? ` rotate(${(HERO.markTurn * group.r).toFixed(3)}deg)` : "";
      writeMotionStyle(part.el, { transform: `${T(part.x, part.y)}${turnMark}` });
    }
  };
  const rest = () => {
    for (const part of parts) Object.assign(part, { x: 0, y: 0, vx: 0, vy: 0 });
    Object.assign(group, { r: 0, s: 1, vr: 0, vs: 0 });
    for (const el of [lockup, ...parts.map(p => p.el)]) writeMotionStyle(el, { transform: "" });
  };
  onAbort(scope.signal, rest);

  // [object, value key, velocity key, target key, rest value] per moving number.
  const channels = [
    ...parts.flatMap(p => [[p, "x", "vx", "tx", 0], [p, "y", "vy", "ty", 0]]),
    [group, "r", "vr", "tr", 0], [group, "s", "vs", "ts", 1]
  ];
  const step = (_now, dtMs) => {
    const dt = clamp(dtMs / 1000, 0.001, MAX_DT_S);
    let moving = false;
    for (const [o, k, vk, tk, home] of channels) {
      if (hero.mode === "follow") {
        const d = o[tk] - o[k];
        o[k] += d * (1 - Math.exp(-dt / HERO.tauS));
        o[vk] = 0;
        if (Math.abs(d) > 0.01) moving = true;
        continue;
      }
      const n = Math.ceil(dt / SPRING_STEP_S);
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        o[vk] += (-HERO.spring.k * (o[k] - home) - HERO.spring.c * o[vk]) * h;
        o[k] += o[vk] * h;
      }
      if (Math.abs(o[k] - home) > 0.002 || Math.abs(o[vk]) > 0.02) moving = true;
    }
    if (!moving && hero.mode === "spring") rest();
    else paint();
    return moving;
  };
  const run = () => {
    if (hero.running || scope.signal.aborted) return;
    hero.running = true;
    loop({ step, signal: scope.signal, reduced: "end" })
      .catch(err => console.error("Hero motion failed:", err))
      .finally(() => { hero.running = false; });
  };
  const springHome = () => {
    if (hero.mode !== "spring") {
      for (const [o, k, vk, , home] of channels) o[vk] = HERO.kick * (o[k] - home);
    }
    hero.engaged = false;
    hero.mode = "spring";
    run();
  };
  const fire = () => burst(layer, markEl, { motifs, signal: scope.signal })
    .catch(err => console.error("Hero burst failed:", err));

  const leave = () => {
    if (!hero.engaged) return;
    fire();
    hero.coolUntil = performance.now() + HERO.cooldownMs;
    springHome();
  };
  const onPointer = (e) => {
    if (e.pointerType === "touch" || isPhone()) return;
    const b = stage.getBoundingClientRect();
    const p = px();
    const x = (e.clientX - b.left) / p;
    const y = (e.clientY - b.top) / p;
    if (performance.now() < hero.coolUntil) return;
    const f = HERO.field;
    if (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1) {
      leave();
      return;
    }
    const dx = x - HERO.cx;
    const dy = y - HERO.cy;
    const [mark, word, inc] = parts;
    Object.assign(mark, { tx: 0.20 * dx, ty: 0.21 * dy });
    Object.assign(word, { tx: 0.20 * dx, ty: 0.20 * dy });
    Object.assign(inc, { tx: 0.12 * dx, ty: 0.12 * dy });
    group.tr = clamp(4.8e-5 * dx * dy, -HERO.maxRot, HERO.maxRot);
    group.ts = Math.min(HERO.maxScale, 1 + 5e-7 * Math.abs(dx * dy));
    hero.engaged = true;
    hero.mode = "follow";
    run();
  };
  const tap = () => {
    fire();
    group.vr = HERO.tapSpin;
    group.vs = HERO.tapGrow;
    parts[0].vy = HERO.tapLift;
    hero.mode = "spring";
    run();
  };

  scope.listen(stage, "pointermove", onPointer, { passive: true });
  scope.listen(stage, "pointerleave", leave);
  scope.listen(stage.querySelector(".mark-hit"), "click", tap);
}

// --- the headline types itself once it is well into view ------------------
function mountMission(root, scope) {
  const typed = root.querySelector(".mission-head .typed");
  if (!typed || typeof IntersectionObserver !== "function") return;
  const cells = typed.querySelectorAll(".tc");
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    typeIn(typed, { msPerChar: TYPE_MS_PER_CHAR, signal: scope.signal })
      .catch(err => console.error("Headline typing failed:", err));
  }, { threshold: 0.6 });
  // Parked hidden until it is seen; the abort shows every letter again.
  cells.forEach(c => c.classList.add("off"));
  onAbort(scope.signal, () => {
    io.disconnect();
    cells.forEach(c => c.classList.remove("off"));
  });
  io.observe(typed.closest(".mission-head"));
}

// --- the cards slide in and the band wipes, both driven by scroll ----------
function mountScroll(root, scope) {
  const cards = [...root.querySelectorAll(".region-card .lcard")].map(el => ({ el, x: 0, tx: 0 }));
  const band = root.querySelector(".photoband");
  const layers = band ? [...band.querySelectorAll("i")].slice(1).map(el => ({ el, img: el.firstElementChild })) : [];
  const px = () => (root.clientWidth || 1) / (isPhone() ? MOBILE_REF : DESKTOP_REF);
  let running = false;

  const paintBand = () => {
    if (!band) return;
    const p = px();
    const top = band.getBoundingClientRect().top;
    const h = band.clientHeight;
    WIPES.forEach((w, i) => {
      const layer = layers[i];
      if (!layer) return;
      // 1 = still below the band, 0 = fully over it. The window moves up and
      // the picture inside it moves down by the same amount, so the picture
      // holds still while its edge sweeps up: a wipe in transforms alone.
      const k = 1 - clamp01((w.from * p - top) / ((w.from - w.to) * p));
      writeMotionStyle(layer.el, { transform: k ? `translateY(${(k * h).toFixed(1)}px)` : "" });
      writeMotionStyle(layer.img, { transform: k ? `translateY(${(-k * h).toFixed(1)}px)` : "" });
    });
  };
  const step = (_now, dtMs) => {
    const a = 1 - (1 - SLAB.alpha) ** (dtMs / (1000 / 60));
    const p = px();
    let moving = false;
    for (const c of cards) {
      const d = c.tx - c.x;
      if (Math.abs(d) < 0.05) c.x = c.tx;
      else { c.x += d * a; moving = true; }
      writeMotionStyle(c.el, { transform: c.x ? `translateX(${(c.x * p).toFixed(1)}px)` : "" });
    }
    return moving;
  };
  const frame = () => {
    const p = px();
    const vh = innerHeight / p;
    for (const c of cards) {
      const top = c.el.getBoundingClientRect().top / p;
      const u = clamp01((vh - SLAB.from - top) / SLAB.span);
      c.tx = SLAB.x * (1 - u) ** SLAB.pow;
    }
    paintBand();
    if (running || scope.signal.aborted) return;
    running = true;
    loop({ step, signal: scope.signal, reduced: "end" })
      .catch(err => console.error("Scroll motion failed:", err))
      .finally(() => { running = false; });
  };
  onAbort(scope.signal, () => {
    for (const el of [...cards.map(c => c.el), ...layers.flatMap(l => [l.el, l.img])]) {
      writeMotionStyle(el, { transform: "" });
    }
  });
  scope.listen(window, "scroll", frame, { passive: true });
  scope.listen(window, "resize", frame, { passive: true });
  frame();
}

// Draws a stage page into the container and sets its sections moving.
// `markup` returns the finished page; `still` keeps it exactly so (reduced
// motion always does). Returns the motion scope, for the caller's own moving
// sections, or null when the page is to stay still.
export function renderStagePage(container, markup, { motifs = EVERY_MOTIF, still = false } = {}) {
  container.innerHTML = markup();
  const scope = mountMotion();
  if (still || isReduced()) return null;
  const root = container.querySelector(".stage-page");
  if (!root) return null;
  try {
    mountHero(root, scope, motifs);
    mountMission(root, scope);
    mountScroll(root, scope);
    return scope;
  } catch (err) {
    // The page is already finished without its motion; put it back that way.
    console.error("Stage page motion failed:", err);
    mountMotion();
    container.innerHTML = markup();
    return null;
  }
}
