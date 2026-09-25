// views/quests.js - Goals (#/quests): weekly quantity pledges ("average at
// least 2 L of water a day"), graded automatically by the weekly review.
// Everything user-facing on a pledge derives from its template — nothing
// stored is user-authored — but every stored value is still escaped at the
// sink (tests/views-xss.test.mjs).
//
// THE REDESIGN (R4, v99; docs/prototype/redesign/weekly.js goalsHTML). A stage
// page: the hero, your pledges as die-cut stickers that stick on the first
// time the list comes into view, and every pledge type as a card with its own
// target box, the ones for your lowest-graded aspects first. Removing a
// pledge asks on the page, not in a browser pop-up. The page redraws itself
// after a change, so focus can be put back where the reader was.

import { stateManager } from "../state.js";
import { t, tp } from "../i18n.js";
import { GOAL_TEMPLATES, goalTemplate, PLEDGE_LIMIT, clampPledgeTarget } from "../goals.js";
import { getAllBenchmarks } from "../benchmarks.js";
import { gradeAllAspects } from "../grades.js";
import { rankPledgesByGrade, isPriorityPledge } from "../suggestions.js";
import { escapeHtml, aspectLabel } from "./helpers.js";
import { SPRITES, onAbort } from "./stage.js";
import { heroMarkup, label, renderStagePage } from "./stage-page.js";
import { chapterOf, motifIcon } from "./news.js";
import { writeMotionStyle } from "./motion-mount.js";
import { animate, spring } from "../motion.js";

// A sticker sticks on: it drops in large and turned, and springs flat. Its
// resting tilt comes from its place in the list, never from what it says.
const STICK = { scale: 1.35, turn: -30, stiffness: 420, damping: 16, fadeMs: 150, staggerMs: 90 };
const STICK_THRESHOLD = 0.3;
const tiltOf = (k) => ((k * 37) % 13) - 6;

const STAR_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="${SPRITES}#star"/></svg>`;

function sticker(aspect, k) {
  const chapter = chapterOf(aspect);
  const hue = chapter ? chapter.hue : "var(--frame-ink)";
  return `<span class="pledge-sticker diecut" style="--hue: ${hue}; transform: rotate(${tiltOf(k)}deg);" aria-hidden="true"><i>${motifIcon(aspect)}</i></span>`;
}

function resultLine(goal, tmpl) {
  const last = goal.lastResult;
  if (!last) return `<p class="pledge-result">${t("Graded at your next weekly review.")}</p>`;
  const words = { value: escapeHtml(last.value), unit: t(tmpl.unit) };
  return last.met
    ? `<p class="pledge-result pledge-met">✓ ${tp("Met last week ({value} {unit})", words)}</p>`
    : `<p class="pledge-result pledge-missed">✗ ${tp("Missed last week ({value} {unit})", words)}</p>`;
}

function pledgeCard(goal, k, confirming) {
  const tmpl = goalTemplate(goal.templateId);
  if (!tmpl) return "";
  const id = escapeHtml(goal.id);
  const title = t(tmpl.title);
  const actions = confirming
    ? `<div class="pledge-ask" role="group" aria-label="${escapeHtml(t("Remove this pledge? Its streak will be lost."))}">
        <p>${t("Remove this pledge? Its streak will be lost.")}</p>
        <button type="button" class="pill" data-confirm-remove="${id}">${t("Remove")}</button>
        <button type="button" class="pill pill-light" data-cancel-remove="${id}">${t("Cancel")}</button>
      </div>`
    : `<button type="button" class="pill pill-light pledge-remove" data-pledge-id="${id}" aria-label="${escapeHtml(`${t("Remove")} — ${title}`)}">${t("Remove")}</button>`;
  return `
    <article class="pledge" data-pledge="${id}">
      ${sticker(tmpl.aspect, k)}
      <div class="pledge-body">
        <p class="pledge-aspect">${aspectLabel(tmpl.aspect)}</p>
        <h3 class="card-title" tabindex="-1">${title}</h3>
        <p class="pledge-desc">${tp(tmpl.desc, { target: escapeHtml(goal.target) })}</p>
        ${resultLine(goal, tmpl)}
        <p class="pledge-meta">${goal.streak >= 2 ? `${tp("{n}-week streak", { n: escapeHtml(goal.streak) })} · ` : ""}${tp("+{xp} points each week it's met", { xp: tmpl.xp })}</p>
        <div class="pledge-actions">${actions}</div>
      </div>
    </article>`;
}

function catalogCard(id, k, { taken, full }) {
  const tmpl = goalTemplate(id);
  const off = taken || full ? " disabled" : "";
  return `
    <div class="region-card cat-card"><div class="lcard cat" data-template="${id}">
      ${sticker(tmpl.aspect, k)}
      <div class="cat-text">
        <p class="pledge-aspect">${aspectLabel(tmpl.aspect)}</p>
        <h3 class="card-title">${t(tmpl.title)}</h3>
        <p class="card-desc" id="cat-desc-${id}">${tp(tmpl.desc, { target: tmpl.def })}</p>
      </div>
      <div class="cat-form">
        <div class="form-group">
          <label for="cat-${id}">${t("Weekly target")} (${t(tmpl.unit)})</label>
          <input type="number" id="cat-${id}" class="form-control" min="${tmpl.min}" max="${tmpl.max}" step="${tmpl.step}" value="${tmpl.def}"${off}>
        </div>
        <button type="button" class="pill" data-add="${id}"${off}>${taken ? t("Added") : t("Add Pledge")}</button>
        <p class="cat-error d-none" id="cat-err-${id}" role="alert"></p>
      </div>
    </div></div>`;
}

export function goalsMarkup(state, { confirm = null } = {}) {
  const pledges = state.goals || [];
  // Order the catalog so pledges for the lowest-graded aspects lead. Grades
  // come from the same benchmarks Home grades on. A bare state (no profile,
  // e.g. hostile-input tests) grades nothing, so the order is the catalog's.
  const grades = state.profile ? gradeAllAspects(getAllBenchmarks(state), state.aspects) : {};
  const taken = new Set(pledges.map(g => g.templateId));
  const ids = rankPledgesByGrade(Object.keys(GOAL_TEMPLATES), grades);
  const full = pledges.length >= PLEDGE_LIMIT;
  const hasPriority = !full && ids.some(id => !taken.has(id) && isPriorityPledge(id, grades));
  const active = tp("{n} active", { n: pledges.length });
  const catalogNote = full
    ? tp("Pledge list is full (max {max}).", { max: PLEDGE_LIMIT })
    : hasPriority ? t("Pledges for the aspects you're graded lowest on are listed first.") : "";
  const due = stateManager.isWeeklyReviewDue();
  return `
    <div class="stage-page goals">
      ${heroMarkup({
        mark: STAR_SVG,
        word: t("Weekly Pledges").toUpperCase(),
        inc: active.toUpperCase(),
        srTitle: `${t("Weekly Pledges")} — ${active}`,
        tapLabel: t("Play with the star")
      })}
      <section class="panel statement goals-mine"><div class="wrap split">
        <h2 class="label" id="pledges-label" tabindex="-1">(${escapeHtml(t("Your pledges"))})</h2>
        <div>
          <p class="goals-intro">${t("A pledge is a weekly quantity target. Your weekly review grades every pledge automatically — nothing to log day to day.")}</p>
          <div class="pledge-list">
            ${pledges.length
              ? pledges.map((g, k) => pledgeCard(g, k, confirm === g.id)).join("")
              : `<p class="goals-none">${t("No pledges yet — add one from the catalog.")}</p>`}
          </div>
          <p class="sr-only" id="goals-live" aria-live="polite"></p>
        </div>
      </div></section>
      <section class="projects goals-catalog">
        <div class="inner">
          ${label(t("Add a Pledge"))}
          <div class="cardblock">
            ${catalogNote ? `<p class="goals-note">${catalogNote}</p>` : ""}
            ${ids.map((id, k) => catalogCard(id, k, { taken: taken.has(id), full })).join("")}
          </div>
        </div>
      </section>
      <section class="panel careers goals-graded"><div class="wrap split">
        ${label(t("Graded weekly"))}
        <div class="careers-row">
          <p class="careers-head">${t("Graded at your next weekly review.")}</p>
          <a class="pill" href="#/review">${due ? t("Start Weekly Review") : t("Weekly Review")}</a>
        </div>
      </div></section>
    </div>`;
}

// --- motion -------------------------------------------------------------------

function stickOn(el, delay, signal) {
  const pose = ([s, r]) => writeMotionStyle(el, {
    transform: s === 1 && r === 0 ? "" : `rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`
  });
  onAbort(signal, () => { pose([1, 0]); writeMotionStyle(el, { opacity: "" }); });
  pose([STICK.scale, STICK.turn]);
  writeMotionStyle(el, { opacity: 0 });
  return animate({ duration: 1, delay, update: () => {}, signal, reduced: "end" }).then(go => {
    if (!go) return false;
    animate({
      duration: STICK.fadeMs, signal, reduced: "end",
      update: (p) => writeMotionStyle(el, { opacity: p >= 1 ? "" : p.toFixed(3) })
    });
    return spring({
      from: [STICK.scale, STICK.turn], to: [1, 0], stiffness: STICK.stiffness, damping: STICK.damping,
      restDelta: 0.001, restSpeed: 0.01, update: pose, signal, reduced: "end"
    });
  });
}

// Every sticker sticks on the first time the list is well in view; after a
// pledge is added, only that one does.
function mountStickers(root, scope, fresh) {
  const list = root.querySelector(".pledge-list");
  if (!list) return;
  const report = (err) => console.error("Sticker motion failed:", err);
  if (fresh) {
    const el = list.querySelector(`[data-pledge="${CSS.escape(fresh)}"] .pledge-sticker i`);
    if (el) stickOn(el, 0, scope.signal).catch(report);
    return;
  }
  const stickers = [...list.querySelectorAll(".pledge-sticker i")];
  if (!stickers.length || typeof IntersectionObserver !== "function") return;
  stickers.forEach(el => writeMotionStyle(el, { opacity: 0 }));
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    stickers.forEach((el, k) => stickOn(el, k * STICK.staggerMs, scope.signal).catch(report));
  }, { threshold: STICK_THRESHOLD });
  onAbort(scope.signal, () => {
    io.disconnect();
    stickers.forEach(el => writeMotionStyle(el, { opacity: "" }));
  });
  io.observe(list);
}

// --- the view -----------------------------------------------------------------

// 4. RENDER GOALS (weekly pledges). `view` is the page's own redraw: which
// pledge is asking to be removed, which was just added, where focus goes and
// what to say about it.
export function renderQuests(containerId, state, view = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { confirm = null, fresh = null, focus = null, live = "" } = view;
  const scope = renderStagePage(container, () => goalsMarkup(state, { confirm }));
  // Listeners go on the page, not the container: the container outlives every
  // view, and a redraw would stack a second set on it.
  const root = container.querySelector(".goals");
  if (!root) return;
  if (scope) {
    try {
      mountStickers(root, scope, fresh);
    } catch (err) {
      console.error("Goals motion failed:", err);
    }
  }
  if (focus) root.querySelector(focus)?.focus();
  const liveEl = root.querySelector("#goals-live");
  if (live && liveEl) liveEl.textContent = live;

  const redraw = (next) => renderQuests(containerId, state, next);
  const pledgeFocus = (id, what) => `[data-pledge="${CSS.escape(id)}"] ${what}`;

  root.addEventListener("input", (e) => {
    const input = e.target.closest(".cat input");
    if (!input) return;
    const id = input.closest(".cat").dataset.template;
    const desc = root.querySelector(`#cat-desc-${id}`);
    if (desc) desc.textContent = tp(goalTemplate(id).desc, { target: clampPledgeTarget(id, input.value) });
  });

  root.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    const { add, pledgeId, confirmRemove, cancelRemove } = button.dataset;
    if (add) {
      const input = root.querySelector(`#cat-${add}`);
      const result = stateManager.addPledge(add, parseFloat(input.value));
      if (!result.ok) {
        const err = root.querySelector(`#cat-err-${add}`);
        err.classList.remove("d-none");
        err.textContent = result.reason;
        return;
      }
      const id = result.pledge.id;
      redraw({ fresh: id, focus: pledgeFocus(id, ".card-title"), live: `${t(goalTemplate(add).title)} — ${t("Added")}` });
    } else if (pledgeId) {
      redraw({ confirm: pledgeId, focus: pledgeFocus(pledgeId, "[data-cancel-remove]") });
    } else if (cancelRemove) {
      redraw({ focus: pledgeFocus(cancelRemove, ".pledge-remove") });
    } else if (confirmRemove) {
      const goal = (state.goals || []).find(g => g.id === confirmRemove);
      const title = goal ? t(goalTemplate(goal.templateId)?.title || "") : "";
      stateManager.removePledge(confirmRemove);
      redraw({ focus: "#pledges-label", live: `${title} — ${t("Removed")}` });
    }
  });
}
