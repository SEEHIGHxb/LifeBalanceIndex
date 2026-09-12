// views/journey-ring.js - the ring of eight regions that replaces onboarding's
// progress bar.
//
// WHY A RING AND NOT A BAR. chart.js fixes the eight aspects in a clockwise
// order (RADAR_KEYS) and the radar is eight spokes around a centre. Lay the
// regions on a ring in that same order and finishing the circuit IS finishing
// the assessment, while the shape being built is the shape the dashboard will
// show afterwards. The bar measured how much form was left; this measures how
// much world is lit.
//
// WHAT IT MUST NOT BECOME. Segment length here is progress -- how many screens
// are done -- and never score. A ring whose arcs grew with the reader's results
// would be a radar chart drawn mid-assessment, which is the one thing
// docs/onboarding-flow-redesign.md rules out: it would teach a reader how the
// scoring works before they have answered chapters 2 to 8.

import { t } from "../i18n.js";

const CX = 50;
const CY = 50;
const R = 38;
const SEG = 8;
// A gap between segments so eight regions read as eight places rather than one
// unbroken loop. In degrees, taken off the end of each arc.
const GAP = 4;

function polar(angleDeg, radius = R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

// An arc path from `from` to `to` degrees, clockwise, measured from the top.
function arcPath(from, to) {
  const [x1, y1] = polar(from);
  const [x2, y2] = polar(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// The static skeleton. Every segment is drawn twice: a dim track that is always
// present, and a lit overlay whose dash offset moves from empty to full as the
// chapter is answered. Painting is then pure attribute updates -- no innerHTML
// rewriting on a keystroke, which would drop focus out of the input the reader
// is typing into.
export function ringMarkup(chapters) {
  const step = 360 / SEG;
  const segs = chapters.map((chapter, i) => {
    const from = i * step;
    const to = from + step - GAP;
    const d = arcPath(from, to);
    return `
      <path class="ring-track" d="${d}" />
      <path class="ring-lit" id="ring-lit-${i}" d="${d}"
        stroke="${chapter.hue}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" />`;
  }).join("");

  return `
    <div class="journey-ring">
      <svg viewBox="0 0 100 100" class="journey-ring-svg" aria-hidden="true" focusable="false">
        ${segs}
        <circle class="ring-marker" id="ring-marker" cx="${CX}" cy="${CY - R}" r="3.2" />
      </svg>
      <div class="journey-ring-centre">
        <span class="journey-ring-region" id="ring-region"></span>
        <span class="journey-ring-count" id="ring-count"></span>
      </div>
      <p class="sr-only" id="ring-status" role="status" aria-live="polite"></p>
    </div>`;
}

// `chapter` is the index in progress (-1 during the prologue, 8 once every
// region is lit), `within` a 0..1 fraction of that chapter's screens completed.
//
// The live region is what carries this to a screen reader. The SVG is
// aria-hidden precisely because eight coloured arcs announce as nothing useful;
// the sentence below is the accessible equivalent of the picture, and the
// replacement for the "Step {n} of {total}" the old bar announced.
export function paintRing(root, { chapter, within, chapters }) {
  if (!root) return;
  const frac = Math.max(0, Math.min(1, within));

  for (let i = 0; i < chapters.length; i++) {
    const lit = root.querySelector(`#ring-lit-${i}`);
    if (!lit) continue;
    const filled = i < chapter ? 1 : i === chapter ? frac : 0;
    lit.setAttribute("stroke-dashoffset", String(1 - filled));
  }

  const step = 360 / SEG;
  const travelled = chapter < 0 ? 0 : Math.min(chapter + frac, chapters.length);
  const [mx, my] = polar(travelled * step);
  const marker = root.querySelector("#ring-marker");
  if (marker) {
    const hueIndex = Math.min(Math.max(chapter, 0), chapters.length - 1);
    marker.setAttribute("cx", mx.toFixed(2));
    marker.setAttribute("cy", my.toFixed(2));
    marker.setAttribute("fill", chapters[hueIndex].hue);
  }

  const current = chapters[chapter];
  const regionName = chapter < 0
    ? t("Setting out")
    : current ? current.region : t("Journey complete");
  // Deliberately "n of 8 regions" and not a percentage or a time estimate. The
  // old bar promised "About 5 minutes total" on every one of six steps, which
  // was the same claim whether the reader was four seconds in or four minutes.
  const complete = Math.max(0, chapter);

  const region = root.querySelector("#ring-region");
  const count = root.querySelector("#ring-count");
  const status = root.querySelector("#ring-status");
  if (region) region.textContent = regionName;
  if (count) count.textContent = `${complete} / ${chapters.length}`;
  if (status) status.textContent = `${regionName} — ${complete} / ${chapters.length}`;
}
