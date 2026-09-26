// views/magnet.js - the pills lean toward the pointer, as on humanmade.co.jp
// (the owner, 2026-09-26). Ported from the prototype's magnetic pills
// (docs/prototype/redesign/proto.js; V5_REVIEW obs. 4 / V6_REVIEW #8), with its
// tuning unchanged.
//
// On a laptop, a pill under the pointer slides and tilts toward it and grows a
// little, its label lagging a step behind; when the pointer leaves, it springs
// home. Never on touch, never under reduced motion, and never on a choice: an
// answer or a picker must not lean toward the pointer (the still selector).
//
// One listener on the page element, bound once: the page lives as long as the
// app, so nothing is added to window or document (motion guard 3).

import { loop, isReduced } from "../motion.js";
import { writeMotionStyle, STILL_SELECTOR } from "./motion-mount.js";

export const MAG = Object.freeze({
  pullX: 0.30, pullY: 0.23, maxX: 0.2, maxY: 0.35, maxTilt: 7.2, tiltPow: 2.4,
  scale: 1.095, tau: 0.06, tauS: 0.03, inner: 0.15, spring: { k: 490, c: 12 }
});
const KEYS = ["x", "y", "r", "s", "ix"];
const REST = Object.freeze({ x: 0, y: 0, r: 0, s: 1, ix: 0 });
const STILL = Object.freeze({ x: 0, y: 0, r: 0, s: 0, ix: 0 });
const SPRING_STEP_S = 1 / 240;
const MAX_DT_S = 0.05;
const SETTLE = 0.002;
const SETTLE_SPEED = 0.02;
const NO_LEAN = `${STILL_SELECTOR}, .answers`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Where a pill w x h wants to be with the pointer (dx, dy) from its centre.
export function magnetTarget(dx, dy, w, h) {
  return {
    x: clamp(MAG.pullX * dx, -MAG.maxX * w, MAG.maxX * w),
    y: clamp(MAG.pullY * dy, -MAG.maxY * h, MAG.maxY * h),
    r: MAG.maxTilt * Math.sign(dx) * Math.min(1, Math.abs(dx) / (w / 2)) ** MAG.tiltPow,
    s: MAG.scale,
    ix: MAG.inner * dx
  };
}

// The pill under the pointer, if it is one that may lean.
export function magneticPill(target) {
  const pill = target?.closest?.(".pill");
  if (!pill || pill.disabled || pill.getAttribute("aria-disabled") === "true") return null;
  return pill.closest(NO_LEAN) ? null : pill;
}

// The label moves inside the pill, so it is wrapped on the first hover; the
// markup a view renders stays as written.
function innerOf(pill) {
  const found = pill.querySelector(":scope > .pill__in");
  if (found) return found;
  const inner = document.createElement("span");
  inner.className = "pill__in";
  inner.append(...pill.childNodes);
  pill.append(inner);
  return inner;
}

const states = new WeakMap();
const active = new Set();
let hover = null;
let running = false;
let life = null;

function stateOf(pill) {
  let o = states.get(pill);
  if (!o) {
    o = { el: pill, hover: false, t: { ...REST }, v: { ...STILL }, ...REST };
    states.set(pill, o);
  }
  return o;
}

function paint(o) {
  const moved = o.x || o.y || o.r || o.s !== 1;
  writeMotionStyle(o.el, {
    transform: moved ? `translate(${o.x.toFixed(2)}px,${o.y.toFixed(2)}px) rotate(${o.r.toFixed(3)}deg) scale(${o.s.toFixed(4)})` : ""
  });
  const inner = o.el.querySelector(":scope > .pill__in");
  if (inner) writeMotionStyle(inner, { transform: o.ix ? `translateX(${o.ix.toFixed(2)}px)` : "" });
}

// Chases the target while hovered; springs home once let go. True while moving.
function stepOne(o, dt) {
  const a = 1 - Math.exp(-dt / MAG.tau);
  const as = 1 - Math.exp(-dt / MAG.tauS);
  let moving = false;
  for (const k of KEYS) {
    if (o.hover) {
      o[k] += (o.t[k] - o[k]) * (k === "s" ? as : a);
      o.v[k] = 0;
      if (Math.abs(o.t[k] - o[k]) > SETTLE) moving = true;
      continue;
    }
    const n = Math.ceil(dt / SPRING_STEP_S);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      o.v[k] += (-MAG.spring.k * (o[k] - REST[k]) - MAG.spring.c * o.v[k]) * h;
      o[k] += o.v[k] * h;
    }
    if (Math.abs(o[k] - REST[k]) > SETTLE || Math.abs(o.v[k]) > SETTLE_SPEED) moving = true;
  }
  if (!moving && !o.hover) Object.assign(o, REST, { v: { ...STILL } });
  return moving;
}

function step(_now, dtMs) {
  const dt = clamp(dtMs / 1000, 0.001, MAX_DT_S);
  for (const o of [...active]) {
    if (!o.el.isConnected) {
      active.delete(o);
      continue;
    }
    if (!stepOne(o, dt)) active.delete(o);
    paint(o);
  }
  running = active.size > 0;
  return running;
}

function wake(o) {
  active.add(o);
  if (running) return;
  running = true;
  loop({ step, signal: life.signal, reduced: "end" })
    .catch(err => console.error("Pill magnet failed:", err))
    .finally(() => {
      running = false;
      // Reduced motion switched on mid-lean: put every pill straight home.
      if (!isReduced()) return;
      for (const p of active) paint(Object.assign(p, REST, { hover: false, v: { ...STILL } }));
      active.clear();
    });
}

function release() {
  if (!hover) return;
  hover.hover = false;
  wake(hover);
  hover = null;
}

function onMove(e) {
  if (e.pointerType === "touch" || isReduced()) return;
  const pill = magneticPill(e.target);
  if (hover && hover.el !== pill) release();
  if (!pill) return;
  if (!hover) {
    const o = stateOf(pill);
    innerOf(pill);
    const b = pill.getBoundingClientRect();
    Object.assign(o, {
      cx: b.left + b.width / 2 - o.x, cy: b.top + b.height / 2 - o.y,
      w: pill.offsetWidth, h: pill.offsetHeight, hover: true
    });
    hover = o;
  }
  hover.t = magnetTarget(e.clientX - hover.cx, e.clientY - hover.cy, hover.w, hover.h);
  wake(hover);
}

// Binds once, on the element that holds every page.
export function bindMagnet(page) {
  if (life || !page) return;
  life = new AbortController();
  page.addEventListener("pointermove", onMove, { passive: true, signal: life.signal });
  page.addEventListener("pointerleave", release, { signal: life.signal });
}
