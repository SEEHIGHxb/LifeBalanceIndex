// motion.js - the app's motion core: a clock, four ways to move, and the
// reduced-motion switch. docs/interactive-web-plan.md §6, Phase 2.
//
// Rewritten from the approved Phase 1 prototype (docs/prototype/phase1), with
// the independent review's findings built in:
//   * anySignal() combines abort signals correctly on engines without
//     AbortSignal.any, instead of quietly keeping only one of them;
//   * every entry point that moves something over time REQUIRES a `reduced`
//     path and throws without one, so "every animation has a reduced path" is
//     enforced where animations are made, not hoped for in review.
//
// Nothing here touches the DOM. Callers get numbers through `update` and decide
// what to write; views/motion-mount.js is where writes are limited to
// transform and opacity.

// --- Clock -----------------------------------------------------------------
// Injected so tests and the Playwright harness can drive time by hand:
// setClock() for node tests, globalThis.__lbiClock for a page, where an
// addInitScript can set it before any module loads (the CSP blocks inline
// scripts, so that is the only way in).
const realClock = {
  now: () => performance.now(),
  frame: cb => requestAnimationFrame(cb)
};
let injectedClock = null;

export function setClock(clock) {
  injectedClock = clock || null;
}

export function clock() {
  return injectedClock ?? globalThis.__lbiClock ?? realClock;
}

// --- Reduced motion --------------------------------------------------------
// Two sources, OR-ed: the device setting and the in-app toggle on Profile.
// The toggle can only ADD reduction (plan decision 7): with the device asking
// for less motion, nothing in the app can turn it back on. The toggle is a
// device preference like the language, so it lives in its own key and not in
// the synced state: a backup restored onto a phone should not carry over a
// setting that was about another screen.
export const REDUCE_MOTION_KEY = "lbi_reduce_motion";
export const REDUCE_MOTION_ATTR = "data-reduce-motion";

const storage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // blocked storage throws on access in some private modes
  }
};

export function deviceReducesMotion() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getReduceMotionPref() {
  try {
    return storage()?.getItem(REDUCE_MOTION_KEY) === "1";
  } catch {
    return false;
  }
}

// Mirrors the choice onto <html> so the sheet's reduced block can match it
// too: a media query cannot see an app setting.
export function syncReduceMotionAttr() {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root || typeof root.toggleAttribute !== "function") return;
  root.toggleAttribute(REDUCE_MOTION_ATTR, getReduceMotionPref());
}

export function setReduceMotionPref(on) {
  try {
    const s = storage();
    if (on) s?.setItem(REDUCE_MOTION_KEY, "1");
    else s?.removeItem(REDUCE_MOTION_KEY);
  } catch {
    // Unsaved is still honoured for this page through the attribute below.
  }
  syncReduceMotionAttr();
}

// Asked live, never cached: either source can change while the PWA is open.
export function isReduced() {
  return deviceReducesMotion() || getReduceMotionPref();
}

// --- Signals ---------------------------------------------------------------
// Aborts when any of the given signals does. The prototype's version fell back
// to ONE signal where AbortSignal.any is missing (Safari before 17.4), so a
// spring outlived its scene. The fallback here listens to all of them.
export function anySignalFallback(signals) {
  const ctl = new AbortController();
  const already = signals.find(s => s.aborted);
  if (already) {
    ctl.abort(already.reason);
    return ctl.signal;
  }
  const onAbort = (event) => {
    for (const s of signals) s.removeEventListener("abort", onAbort);
    ctl.abort(event.target.reason);
  };
  for (const s of signals) s.addEventListener("abort", onAbort);
  return ctl.signal;
}

export function anySignal(signals) {
  const list = signals.filter(Boolean);
  if (list.length === 0) return new AbortController().signal;
  if (list.length === 1) return list[0];
  return typeof AbortSignal.any === "function"
    ? AbortSignal.any(list)
    : anySignalFallback(list);
}

// --- Easing ----------------------------------------------------------------
export const linear = t => t;

const NEWTON_STEPS = 6;
const BISECT_STEPS = 24;
const SOLVE_EPSILON = 1e-6;

// CSS cubic-bezier(x1, y1, x2, y2) as a function of progress.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = s => ((ax * s + bx) * s + cx) * s;
  const sampleY = s => ((ay * s + by) * s + cy) * s;
  const slopeX = s => (3 * ax * s + 2 * bx) * s + cx;

  const solve = (x) => {
    let s = x;
    for (let i = 0; i < NEWTON_STEPS; i++) {
      const err = sampleX(s) - x;
      if (Math.abs(err) < SOLVE_EPSILON) return s;
      const d = slopeX(s);
      if (Math.abs(d) < SOLVE_EPSILON) break;
      s -= err / d;
    }
    let lo = 0, hi = 1;
    s = x;
    for (let i = 0; i < BISECT_STEPS; i++) {
      const v = sampleX(s);
      if (Math.abs(v - x) < SOLVE_EPSILON) return s;
      if (v < x) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solve(t));
  };
}

// The house curve (symbols.md S1): a fast start that settles softly.
export const easeStar = cubicBezier(0.2, 0.9, 0.25, 1);

// --- The reduced-path contract ---------------------------------------------
// `reduced` is either "end" (jump to the final state) or a function run
// INSTEAD of the motion (a short cross-fade, say). Never a blink: "end" still
// lands the element in its final state, it just does not travel there.
function requireReduced(name, reduced) {
  if (reduced === "end" || typeof reduced === "function") return;
  throw new TypeError(`motion.${name}: every animation needs a reduced path ("end" or a function)`);
}

async function runReduced(reduced, finish, signal) {
  if (reduced === "end") finish();
  else await reduced({ signal });
  return !signal?.aborted;
}

// Calls step(now, dtMs) once per frame until it returns false or the signal
// aborts. Resolves true when the step finished, false when aborted: an
// interrupted animation is normal, not an error. It REJECTS only when the
// step itself throws (a caller's update writing to a still element, say), so
// the bug surfaces at the await instead of the promise hanging for ever with
// no frame left to settle it.
function frames(step, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve(false);
    const c = clock();
    let last = c.now();
    const tick = () => {
      if (signal?.aborted) return resolve(false);
      const now = c.now();
      let keepGoing;
      try {
        keepGoing = step(now, now - last);
      } catch (err) {
        return reject(err);
      }
      last = now;
      if (keepGoing === false) resolve(true);
      else c.frame(tick);
    };
    c.frame(tick);
  });
}

// --- 1. loop: a raw per-frame callback, for things with no fixed length ----
export function loop({ step, signal, reduced }) {
  requireReduced("loop", reduced);
  if (isReduced()) return runReduced(reduced, () => {}, signal);
  return frames(step, signal);
}

// --- 2. animate: progress 0 -> 1 over a fixed duration ---------------------
export function animate({ duration, delay = 0, ease = linear, update, signal, reduced }) {
  requireReduced("animate", reduced);
  if (signal?.aborted) return Promise.resolve(false);
  if (isReduced()) return runReduced(reduced, () => update(1), signal);
  const start = clock().now() + delay;
  return frames((now) => {
    const t = duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1;
    if (now < start) return true; // still inside the delay: keep waiting
    update(ease(t));
    return t < 1;
  }, signal);
}

// --- 3. spring: damped pull from `from` to `to` ------------------------------
// Integrated at a fixed step so the result is the same at 30 fps and 120 fps,
// and under a manual clock. The accumulator is clamped so one long frame (a tab
// coming back from the background) cannot run thousands of steps.
export const SPRING_STEP_S = 1 / 240;
const SPRING_MAX_FRAME_S = 0.1;
// At rest when within a tenth of a unit and moving under one unit a second.
// In pixels both are invisible, and they let the house spring (260 / 16) come
// to rest inside a second; a 0.01 threshold kept it running for over 1.1 s.
const SPRING_REST_DELTA = 0.1;
const SPRING_REST_SPEED = 1;

export function spring({
  from, to, stiffness = 260, damping = 16,
  restDelta = SPRING_REST_DELTA, restSpeed = SPRING_REST_SPEED,
  update, signal, reduced
}) {
  requireReduced("spring", reduced);
  const target = to ?? from.map(() => 0);
  if (signal?.aborted) return Promise.resolve(false);
  if (isReduced()) return runReduced(reduced, () => update([...target]), signal);

  let pos = [...from];
  let vel = from.map(() => 0);
  let carry = 0;
  const settled = () => pos.every((p, i) =>
    Math.abs(p - target[i]) < restDelta && Math.abs(vel[i]) < restSpeed);

  return frames((_now, dtMs) => {
    carry = Math.min(carry + dtMs / 1000, SPRING_MAX_FRAME_S);
    while (carry >= SPRING_STEP_S) {
      const acc = pos.map((p, i) => -stiffness * (p - target[i]) - damping * vel[i]);
      vel = vel.map((v, i) => v + acc[i] * SPRING_STEP_S);
      pos = pos.map((p, i) => p + vel[i] * SPRING_STEP_S);
      carry -= SPRING_STEP_S;
    }
    if (settled()) {
      update([...target]);
      return false;
    }
    update([...pos]);
    return true;
  }, signal);
}

// --- 4. follow: chase a target that moves (a dragged ring) ------------------
// Returns { set(target), done }. Each frame closes a fixed share of the gap per
// time constant, so it lags the finger the same amount at any frame rate.
// Reduced: set() does the reduced path instead ("end" jumps to the target).
export function follow({ from, tauMs = 60, update, signal, reduced }) {
  requireReduced("follow", reduced);
  let pos = [...from];
  let target = [...from];

  if (isReduced()) {
    return {
      set(next) {
        target = [...next];
        if (reduced === "end") update([...target]);
        else reduced({ signal, target: [...target] });
      },
      done: Promise.resolve(!signal?.aborted)
    };
  }

  const done = frames((_now, dtMs) => {
    const k = 1 - Math.exp(-dtMs / tauMs);
    pos = pos.map((p, i) => p + (target[i] - p) * k);
    update([...pos]);
    return true;
  }, signal);

  return { set(next) { target = [...next]; }, done };
}

// A rubber band: follows 1:1 at first and never passes `max`.
export function rubberBand(distance, max) {
  const sign = distance < 0 ? -1 : 1;
  return sign * max * (1 - Math.exp(-Math.abs(distance) / max));
}

// --- scrub: a value at a point on a timeline ---------------------------------
// Pure: stops are [t, value] pairs with t ascending, value a number or an array
// of numbers. Lets a slider or a Skip button put a scene at any moment without
// running time.
export function scrub(t, stops, ease = linear) {
  if (!stops.length) throw new RangeError("motion.scrub: needs at least one stop");
  const first = stops[0], last = stops[stops.length - 1];
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  const i = stops.findIndex(([at]) => at > t);
  const [t0, v0] = stops[i - 1];
  const [t1, v1] = stops[i];
  const k = ease((t - t0) / (t1 - t0));
  const mix = (a, b) => a + (b - a) * k;
  return Array.isArray(v0) ? v0.map((a, j) => mix(a, v1[j])) : mix(v0, v1);
}
