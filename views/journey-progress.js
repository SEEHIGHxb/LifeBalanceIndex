// views/journey-progress.js - the journey's progress star in the header's nav
// pill (redesign R2; replaced the ring of views/journey-ring.js).
//
// Eight points, one per region in journey order, each lit in its region's hue
// once that region is FINISHED, plus the count "n / 8". Progress is how many
// regions are done and never score: a star whose points grew with the reader's
// answers would be the radar drawn mid-assessment, which
// docs/onboarding-flow-redesign.md rules out.
//
// The star is aria-hidden; the sentence in #journey-status (a polite live
// region in the journey itself) is its accessible equivalent.

import { t } from "../i18n.js";

const ANG = (i) => -Math.PI / 2 + (i * Math.PI) / 4;
const pt = (r, a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
const VALLEY_R = 15;
const TIP_R = 47;

// How many regions the reader has actually FINISHED. `chapter` is the index in
// progress, so the ending screen of chapter c counts c + 1: the count reaches
// 1 / 8 on the screen that says The Market is complete, and 8 / 8 on the last.
export function regionsComplete({ chapter, endsChapter, total }) {
  const done = Math.max(0, chapter) + (endsChapter ? 1 : 0);
  return Math.min(total, done);
}

// One kite per region: centre, valley, tip, valley.
export function progressMarkup(chapters) {
  const kites = chapters.map((_, i) => {
    const d = `M50 50L${pt(VALLEY_R, ANG(i) - Math.PI / 8)}L${pt(TIP_R, ANG(i))}L${pt(VALLEY_R, ANG(i) + Math.PI / 8)}Z`;
    return `<path class="pt" id="progress-pt-${i}" d="${d}"/>`;
  }).join("");
  return `<svg class="progress-star" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${kites}</svg>` +
    `<span class="progress-count" id="progress-count"></span>`;
}

// Lights the finished regions and writes the count, in the header pill (when
// it is on the page) and in the journey's live status line.
export function paintProgress({ chapter, endsChapter = false, chapters, pill, status }) {
  const total = chapters.length;
  const complete = regionsComplete({ chapter, endsChapter, total });
  if (pill) {
    chapters.forEach((c, i) => {
      const kite = pill.querySelector(`#progress-pt-${i}`);
      if (!kite) return;
      if (i < complete) kite.setAttribute("fill", c.hue);
      else kite.removeAttribute("fill");
      kite.classList.toggle("lit", i < complete);
    });
    const count = pill.querySelector("#progress-count");
    if (count) count.textContent = `${complete} / ${total}`;
  }
  if (status) {
    const current = chapters[chapter];
    const region = chapter < 0 ? t("Setting out") : current ? current.region : t("Journey complete");
    status.textContent = `${region} — ${complete} / ${total}`;
  }
  return complete;
}
