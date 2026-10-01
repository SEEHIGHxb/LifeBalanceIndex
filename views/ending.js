// views/ending.js - the screen a form ends on (the Weekly Review since R4, the
// Re-assessment since v167): dark, the star, what moved, the points and the
// way on. A curtain lifts off it, then each region asked about bursts from
// the star in turn, the same whatever the numbers were: motion never rewards
// or scolds an answer.

import { writeMotionStyle } from "./motion-mount.js";
import { burst, onAbort, SPRITES, isQuietChapter } from "./stage.js";
import { chapterOf } from "./news.js";
import { escapeHtml } from "./helpers.js";
import { tp, t } from "../i18n.js";
import { animate, easeStar } from "../motion.js";

const ENDING_MS = 700;
const BURST_STAGGER_MS = 140;

// `title` and `lines` are text, escaped here.
export function endingMarkup({ title, lines, xp }) {
  return `
    <i class="rv-ending-curtain" aria-hidden="true"></i>
    <div class="burst-layer" aria-hidden="true"></div>
    <div class="rv-ending-in">
      <span class="rv-ending-star" aria-hidden="true"><svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg></span>
      <h2 id="rv-ending-title" tabindex="-1">${escapeHtml(title)}</h2>
      ${lines.filter(Boolean).map(line => `<p>${escapeHtml(line)}</p>`).join("")}
      <p class="rv-ending-xp">${escapeHtml(tp("+{xp} points", { xp }))}</p>
      <button type="button" class="rv-continue">${t("Continue")}</button>
    </div>`;
}

// `aspects`: the regions the form asked about, each bursting once.
export function playEnding(ending, aspects, signal) {
  const curtain = ending.querySelector(".rv-ending-curtain");
  const layer = ending.querySelector(".burst-layer");
  const star = ending.querySelector(".rv-ending-star");
  onAbort(signal, () => writeMotionStyle(curtain, { transform: "" }));
  writeMotionStyle(curtain, { transform: "scaleY(1)" });
  const regions = [...new Set(aspects)].map(chapterOf).filter(c => c && !isQuietChapter(c));
  return animate({
    duration: ENDING_MS, ease: easeStar, signal, reduced: "end",
    update: (p) => writeMotionStyle(curtain, { transform: p >= 1 ? "" : `scaleY(${(1 - p).toFixed(4)})` })
  }).then(done => done && Promise.all(regions.map((c, k) => animate({
    duration: 1, delay: k * BURST_STAGGER_MS, update: () => {}, signal, reduced: "end"
  }).then(go => go && burst(layer, star, { motifs: [{ motif: c.aspect, hue: c.hue }], signal })))));
}
