// views/motion-mount.js - the lifecycle every animated view goes through.
// docs/interactive-web-plan.md §6, Phase 2.
//
// One mount is live at a time. renderActiveTab() disposes it before drawing
// the next route, so nothing a view started -- a spring, a frame loop, a
// listener on window -- survives the view that started it.
//
// It also owns the three rules the prototype only kept by hand:
//   * FINAL STATE FIRST (non-negotiable 8): runScene() renders the finished
//     markup, then parks the pieces in the same task, then plays. If park or
//     play throws, the finished markup is rendered again; if play never
//     runs, it was never replaced.
//   * TRANSFORM AND OPACITY ONLY: writeMotionStyle() is the one style-write
//     path for motion and refuses any other property at runtime (the Phase 1
//     review: a source grep misses style["left"] and cssText).
//   * ITEMS AND QUIET ZONES NEVER MOVE (non-negotiables 1, 4 and 5):
//     writeMotionStyle() refuses any element inside an instrument item or the
//     mental-health notice.

import { anySignal, isReduced } from "../motion.js";

export const MOTION_STYLE_PROPS = Object.freeze(["transform", "opacity"]);

// An answer group, a question, or the duty-of-care banner and its hotlines.
export const STILL_SELECTOR = '[role="radiogroup"], fieldset.survey-question, .care-banner';

let current = null;

function makeScope(signal) {
  return Object.freeze({
    signal,
    // Listeners, including on window or document, go through here so the
    // mount's abort removes them. This is the only sanctioned way for a view
    // to listen globally.
    listen(target, type, handler, options = {}) {
      target.addEventListener(type, handler, { ...options, signal });
    },
    // A sub-lifetime (one burst, one Play press) that also ends with the mount.
    child() {
      const ctl = new AbortController();
      return { signal: anySignal([signal, ctl.signal]), abort: () => ctl.abort() };
    }
  });
}

// Ends whatever the previous view started. Safe to call when nothing is live.
export function disposeMotion() {
  if (!current) return;
  current.abort();
  current = null;
}

// Starts a fresh lifetime, ending the previous one first.
export function mountMotion() {
  disposeMotion();
  current = new AbortController();
  return makeScope(current.signal);
}

export function isMotionLive() {
  return current !== null && !current.signal.aborted;
}

export function assertMayMove(el) {
  if (el && typeof el.closest === "function" && el.closest(STILL_SELECTOR)) {
    throw new Error("motion-mount: instrument items and the mental-health notice never move");
  }
}

export function writeMotionStyle(el, props) {
  assertMayMove(el);
  for (const [prop, value] of Object.entries(props)) {
    if (!MOTION_STYLE_PROPS.includes(prop)) {
      throw new TypeError(`motion-mount: "${prop}" is not transform or opacity`);
    }
    el.style[prop] = String(value);
  }
}

// render -> park -> play, as three separate steps (the Phase 1 review found
// scene functions of ~95 lines doing all three at once).
//   render(): writes the FINISHED markup. Runs always, reduced or not.
//   park(scope): moves the pieces to their start pose, synchronously.
//   play(scope): animates toward the markup; resolves when done or aborted.
//   reduced: "end" (the rendered markup IS the end state, so nothing more) or
//            a function run instead of park and play, e.g. a short cross-fade.
// Resolves true when the scene finished, false when it was cut short.
// If park or play throws, the scene is rendered again before the error goes
// on up: a half-parked or half-played scene would otherwise stay on screen,
// which is exactly what final-state-first promises cannot happen.
export async function runScene({ render, park, play, reduced }) {
  if (reduced !== "end" && typeof reduced !== "function") {
    throw new TypeError('motion-mount.runScene: a scene needs a reduced path ("end" or a function)');
  }
  render();
  const scope = mountMotion();
  if (isReduced()) {
    if (reduced !== "end") await reduced(scope);
    return !scope.signal.aborted;
  }
  try {
    park(scope);
    const finished = await play(scope);
    return finished !== false && !scope.signal.aborted;
  } catch (err) {
    // Only if this scene still owns the screen: an aborted scope means a
    // newer view has mounted, and re-rendering would draw over it.
    if (!scope.signal.aborted) {
      disposeMotion();
      render();
    }
    throw err;
  }
}
