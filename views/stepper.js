// views/stepper.js - a form's screens as a list down the side (v166 for the
// Weekly Review, v167 for the Re-assessment; the owner's plans). Each screen
// shows its region's emblem, a second screen in the same region a dot. The
// screens already answered are buttons back to themselves (.rv-jump, with
// data-to); the ones ahead are only shown. A phone shows the emblems in a row
// (css/weekly.css).

import { chapterOf } from "./news.js";
import { escapeHtml } from "./helpers.js";

// `aspects`: each screen's aspect, in order. `i`: the screen open.
export function stepperMarkup(aspects, i) {
  const items = aspects.map((aspect, k) => {
    const c = chapterOf(aspect);
    const repeat = k > 0 && aspects[k - 1] === aspect;
    const art = repeat
      ? `<i class="rv-dot" aria-hidden="true"></i>`
      : `<img src="./assets/emblems/${c.art}.webp" alt="" width="32" height="32" loading="lazy" decoding="async">`;
    const inner = `${art}<span>${escapeHtml(c.region)}</span>`;
    if (k < i) return `<li class="is-done"><button type="button" class="rv-jump" data-to="${k}">${inner}</button></li>`;
    if (k === i) return `<li class="is-now" aria-current="step"><span class="rv-stop">${inner}</span></li>`;
    return `<li><span class="rv-stop">${inner}</span></li>`;
  }).join("");
  return `<ol class="rv-steps">${items}</ol>`;
}
