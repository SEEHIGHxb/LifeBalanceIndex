// views/star-zoom.js - your star flies between Home and its own page (v135;
// the owner, 2026-09-28: a tap on the star should zoom into a page of its
// own, not burst).
//
// The page being left notes where its star sits on screen (markZoom); the
// page being drawn takes that note (takeZoom) and starts its own star there,
// then lets it settle into place while the rest of the page fades in around
// it (zoomFrom). Each page draws its finished layout first, so reduced motion,
// a still page or a missed note simply shows the page as it is.
import { animate, easeStar } from "../motion.js";
import { writeMotionStyle } from "./motion-mount.js";
import { onAbort } from "./stage.js";

const ZOOM_MS = 560;
// A note older than this belongs to some other navigation; it is dropped.
const FRESH_MS = 1500;
let pending = null;

const now = () => (typeof performance === "object" ? performance.now() : Date.now());

export function markZoom(el) {
  const r = el?.getBoundingClientRect?.();
  pending = r && r.width > 0
    ? { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, at: now() }
    : null;
}

export function takeZoom() {
  const from = pending;
  pending = null;
  return from && now() - from.at < FRESH_MS ? from : null;
}

// Starts `el` where the note says, at the note's size, and settles it home;
// `fade` fades in meanwhile. Resolves once everything is back in place.
export function zoomFrom(el, from, scope, fade = []) {
  const to = el?.getBoundingClientRect?.();
  if (!from || !scope || !to || !(to.width > 0)) return Promise.resolve(false);
  const dx = from.x - (to.left + to.width / 2);
  const dy = from.y - (to.top + to.height / 2);
  const s0 = from.width / to.width;
  const paint = (p) => {
    const q = 1 - p;
    writeMotionStyle(el, { transform: `translate(${(dx * q).toFixed(1)}px, ${(dy * q).toFixed(1)}px) scale(${(1 + (s0 - 1) * q).toFixed(4)})` });
    for (const f of fade) writeMotionStyle(f, { opacity: p.toFixed(3) });
  };
  const rest = () => {
    writeMotionStyle(el, { transform: "" });
    for (const f of fade) writeMotionStyle(f, { opacity: "" });
  };
  onAbort(scope.signal, rest);
  paint(0);
  return animate({ duration: ZOOM_MS, ease: easeStar, update: paint, signal: scope.signal, reduced: "end" })
    .then(() => { rest(); return true; }, (err) => {
      console.error("Star zoom failed:", err);
      rest();
      return false;
    });
}
