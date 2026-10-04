// views/stepper.js - a form's screens as a list down the side (v166 for the
// Weekly Review, v167 for the Re-assessment; the owner's plans). Each screen
// shows its region's emblem and name. A region with two screens names each
// part (v192: the second used to be a dot under the same name, which read as
// a missing icon). The screens already answered are buttons back to
// themselves (.rv-jump, with data-to); the ones ahead are only shown. A phone
// shows the emblems in a row (css/weekly.css).

import { chapterOf } from "./news.js";
import { escapeHtml } from "./helpers.js";

// `steps`: each screen's aspect, or { aspect, part } where a region has more
// than one screen, in order. `i`: the screen open.
export function stepperMarkup(steps, i) {
  const items = steps.map((step, k) => {
    const { aspect, part = "" } = typeof step === "string" ? { aspect: step } : step;
    const c = chapterOf(aspect);
    const art = `<img src="./assets/emblems/${c.art}.webp" alt="" width="32" height="32" loading="lazy" decoding="async">`;
    const name = part ? `${c.region} · ${part}` : c.region;
    const inner = `${art}<span>${escapeHtml(name)}</span>`;
    if (k < i) return `<li class="is-done"><button type="button" class="rv-jump" data-to="${k}">${inner}</button></li>`;
    if (k === i) return `<li class="is-now" aria-current="step"><span class="rv-stop">${inner}</span></li>`;
    return `<li><span class="rv-stop">${inner}</span></li>`;
  }).join("");
  return `<ol class="rv-steps">${items}</ol>`;
}
