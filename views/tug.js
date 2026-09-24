// views/tug.js - tug-the-ring, Phase 3 third release.
// docs/interactive-web-plan.md §4: drag the ring and it follows like a rubber
// band; past 90 px of finger travel it lets go, bursts eight glints and
// springs home. A tap, Enter or Space bursts too (non-negotiable 6: every
// pointer idea has a tap form).
//
// WHERE: only on the landing (the prologue, before any region) and after
// completion (the last chapter's ending). Never on a screen with instrument
// items: the ring sits above them, and a toy beside the answers is exactly
// what §2 rules out.
//
// The toy is offered only while motion is allowed. With reduced motion there
// is nothing for it to do, and a button that does nothing is worse for a
// screen-reader or keyboard user than no button.
//
// Listeners go on the button itself, never on window or document: pointer
// capture keeps the drag on the button even when the finger leaves it.

import { isReduced, rubberBand } from "../motion.js";
import { poseTug, releaseTug, tapTug } from "./moments.js";

export const TUG_SNAP_PX = 90;
const TUG_TAP_PX = 8;
const TUG_REACH_PX = 60;

// button: the transparent control over the ring. body: what moves. layer:
// where the burst's particles go. Returns { setEnabled(on) }.
export function bindTug({ button, body, layer, onError = () => {} }) {
  // No ring on the page (or no body to move): nothing to offer.
  if (!button || !body) return { setEnabled() {} };
  let enabled = false;
  let drag = null;
  let pos = [0, 0];
  // A drag ends in a click on the same element; that click is not a tap.
  let swallowClick = false;

  const letGo = (withBurst) => {
    drag = null;
    swallowClick = true;
    const from = pos;
    pos = [0, 0];
    releaseTug({ body, from, layer, burst: withBurst }).catch(onError);
  };

  button.addEventListener("pointerdown", (e) => {
    swallowClick = false;
    if (!enabled || drag) return;
    button.setPointerCapture?.(e.pointerId);
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, max: 0 };
  });

  button.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    const d = Math.hypot(dx, dy);
    drag.max = Math.max(drag.max, d);
    if (d > 0) {
      const k = rubberBand(d, TUG_REACH_PX) / d;
      pos = [dx * k, dy * k];
      poseTug(body, pos);
    }
    if (d < TUG_SNAP_PX) return;
    button.releasePointerCapture?.(e.pointerId);
    letGo(true);
  });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.max < TUG_TAP_PX) {
      drag = null; // a tap: the click that follows does the burst
      return;
    }
    letGo(false); // let go short of the line: home, no burst
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);

  // Tap, Enter and Space all arrive here. A keyboard click has detail 0, so a
  // drag that snapped away from the button (no click followed) can never eat
  // the next Enter.
  button.addEventListener("click", (e) => {
    const fromPointer = e.detail > 0;
    const swallow = swallowClick && fromPointer;
    swallowClick = false;
    if (swallow || !enabled) return;
    tapTug({ body, layer }).catch(onError);
  });

  return {
    // Switching off mid-drag (the screen changed under a second finger) sends
    // the ring home like a cancelled drag, so it is never left stretched.
    setEnabled(on) {
      const next = !!on && !isReduced();
      if (!next && drag) {
        button.releasePointerCapture?.(drag.id);
        letGo(false);
      }
      enabled = next;
      button.hidden = !enabled;
    }
  };
}
