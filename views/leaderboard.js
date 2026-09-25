// views/leaderboard.js - Side by Side (#/leaderboard): comparison codes and an
// aspect-by-aspect comparison with the people you have added.
//
// DELIBERATELY NOT A LEADERBOARD (despite the module name, kept so the route
// id `leaderboard` and every cached path stay stable). This app's purpose is to
// tell one person whether they are at least the average of the POPULATION —
// a non-rivalrous comparison, since everyone can be above average on
// volunteering and nothing breaks. Ranking the same scores against five
// friends asks a different and worse question: who is winning. It converts
// "I could give more" into "I'm fine, better than Ken", and there is no
// version of that which helps someone lift anything.
//
// So this screen has NO rank column, NO ordering by score, NO tier badge, and
// NO composite figure for anyone. What it has is the eight aspects laid out
// in parallel, each marked against the population average — the same
// yardstick the rest of the app uses. Difference is visible; ordering is not.
//
// THE REDESIGN (R5, v100; docs/prototype/redesign/social.js). A stage page:
// your star, the codes, then your star and one other person's laid over each
// other with the population average dashed behind. Picking someone slides
// their star into the new shape in the same time whoever is picked. Removing
// someone asks on the page first, and the page redraws itself after a change
// so focus can be put back where the reader was.

import { stateManager } from "../state.js";
import { encodeComparisonCode, decodeComparisonCode } from "../comparison-code.js";
import { ASPECT_KEYS } from "../aspects.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { t, tp } from "../i18n.js";
import { escapeHtml, aspectLabel } from "./helpers.js";
import { CHAPTERS } from "./journey.js";
import { heroMarkup, missionMarkup, label, renderStagePage } from "./stage-page.js";
import { yourStarSvg, starOutlineAttr, starRayAttr, starLevelPath, openShareFor } from "./dashboard.js";
import { aspectName } from "./news.js";
import { animate, easeStar } from "../motion.js";

// The other person's side of each ray slides to its new level in this long,
// whoever is picked.
const MORPH_MS = 480;
const COPIED_MS = 1500;

const scoresOf = (aspects) => CHAPTERS.map(c => Number((aspects || {})[c.aspect]) || 0);
const AVERAGES = CHAPTERS.map(c => AVERAGE_ASPECT_SCORES[c.aspect]);
const clearsAverage = (aspects, key) => Number((aspects || {})[key]) >= AVERAGE_ASPECT_SCORES[key];

// The one genuinely useful thing a peer tells you that the population cannot:
// which aspects they have cleared that you have not. Framed as something to
// learn from, never as a deficit — no "they beat you", no count, no total.
function complementLine(person, myAspects) {
  const gaps = ASPECT_KEYS.filter(key => clearsAverage(person.aspects, key) && !clearsAverage(myAspects, key));
  if (gaps.length === 0) return "";
  return `<p>${tp("{name} clears the population average in {aspects}, where you do not yet.", {
    name: escapeHtml(person.name),
    aspects: gaps.map(aspectLabel).join(", ")
  })}</p>`;
}

function codesSection(myCode) {
  return `
    <section class="panel statement codes"><div class="wrap split">
      ${label(t("Comparison Codes"))}
      <div>
        <p>${t("Share your code with others over LINE or Discord, and paste theirs below. A code carries only a name and the eight aspect scores — no age, no points, nothing else. Re-paste a newer code any time to update someone.")}</p>
        <div class="code-field">
          <label for="my-comparison-code">${t("Your Comparison Code")}</label>
          <div class="code-row">
            <input type="text" id="my-comparison-code" class="form-control code-input" value="${escapeHtml(myCode)}" readonly>
            <button type="button" id="btn-copy-code" class="pill">${t("Copy")}</button>
          </div>
        </div>
        <form id="add-friend-form" class="code-field" novalidate>
          <label for="friend-code">${t("Add someone's code")}</label>
          <div class="code-row">
            <input type="text" id="friend-code" class="form-control code-input" placeholder="LQ1-..." autocomplete="off" spellcheck="false">
            <button type="submit" class="pill">${t("Add")}</button>
          </div>
          <p id="friend-error" class="code-error d-none" role="alert"></p>
        </form>
      </div>
    </div></section>`;
}

// One star shared by two: each ray is split down its middle, your side filled
// in gold to your score and theirs in ink to theirs, with the population
// average dashed across every ray. The outline is the same symmetric star as
// Home's, so only the fills differ.
const raySides = (scores, half) => scores.map((s, i) => `<polygon points="${starRayAttr(i, s, half)}"/>`).join("");

function duoFigure(state, them) {
  const dots = CHAPTERS.map((c, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    return `<circle cx="${(50 + 49 * Math.cos(a)).toFixed(2)}" cy="${(50 + 49 * Math.sin(a)).toFixed(2)}" r="1.3" fill="${c.hue}"/>`;
  }).join("");
  return `
    <div class="duo-fig"><svg viewBox="0 0 100 100" aria-hidden="true">
      <polygon class="duo-ground" points="${starOutlineAttr()}"/>
      <g class="duo-you">${raySides(scoresOf(state.aspects), "start")}</g>
      <g class="duo-them">${raySides(scoresOf(them.aspects), "end")}</g>
      <path class="duo-avg" d="${starLevelPath(AVERAGES)}"/>
      <polygon class="duo-edge" points="${starOutlineAttr()}"/>
      ${dots}
    </svg></div>`;
}

// Everyone added, in the order they were added. Each can be picked to lie over
// your star, and removed (which asks first).
function peopleMarkup(friends, pick, confirm) {
  const pills = friends.map((f, k) => {
    const on = k === pick;
    return `<button type="button" class="pill pill-light" role="radio" data-pick="${k}" aria-checked="${on}" tabindex="${on ? 0 : -1}">${escapeHtml(f.name)}</button>`;
  }).join("");
  const removes = friends.map(f => {
    const id = escapeHtml(f.id);
    const name = escapeHtml(f.name);
    if (confirm === f.id) {
      return `
        <div class="people-ask" role="group" aria-label="${tp("Remove {name}", { name })}">
          <p>${tp("Remove {name}? You can paste their code again any time.", { name })}</p>
          <button type="button" class="pill" data-confirm-remove="${id}">${tp("Remove {name}", { name })}</button>
          <button type="button" class="pill pill-light" data-cancel-remove="${id}">${t("Cancel")}</button>
        </div>`;
    }
    return `<button type="button" class="linkbtn friend-remove" data-friend-id="${id}">${tp("Remove {name}", { name })}</button>`;
  }).join("");
  return `
    <div class="people" role="radiogroup" aria-label="${escapeHtml(t("Whose star shares yours"))}">${pills}</div>
    <div class="people-rm">${removes}</div>`;
}

function duoSection(state, friends, pick, confirm) {
  const you = tp("{name} (You)", { name: escapeHtml(state.profile.name) });
  const them = friends[pick];
  const body = !them
    ? `<p class="duo-none">${t("No one added yet. Paste someone's comparison code above to see their eight aspects beside yours.")}</p>`
    : `
      <ul class="duo-legend">
        <li><i class="lg-you"></i>${you}</li>
        <li><i class="lg-them"></i><span id="duo-them-name">${escapeHtml(them.name)}</span></li>
        <li><i class="lg-avg"></i>${t("Population average")}</li>
      </ul>
      ${peopleMarkup(friends, pick, confirm)}
      ${duoFigure(state, them)}`;
  return `
    <section class="panel statement duo"><div class="wrap split">
      <div>
        ${label(t("Ray by ray"))}
        <p class="duo-note">${them ? t("Pick whose star shares yours: in each ray your side is gold and theirs is dark. The dashed line is the population average.") : t("Not a ranking. Each column is one person's eight aspects, marked against the population average — so you can see where you differ, not who is ahead.")}</p>
        <p class="duo-share"><button type="button" id="btn-share-radar" class="pill pill-light">${escapeHtml(t("Share your star"))}</button></p>
      </div>
      <div>${body}</div>
    </div></section>`;
}

// One row of an aspect card: a score and whether it clears the average there.
function scoreRow(name, value, key, isYou) {
  const v = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  const above = v >= AVERAGE_ASPECT_SCORES[key];
  return `
    <div class="duo-row${isYou ? " is-you" : ""}">
      <dt>${name}</dt>
      <dd><b>${escapeHtml(v)}</b><span class="sbs-mark" aria-hidden="true">${above ? "▲" : "▽"}</span><span class="sr-only">${above ? t("At or above the population average") : t("Below the population average")}</span></dd>
    </div>`;
}

// One card per aspect. The order inside is fixed and meaningless on purpose:
// the population, then you, then everyone in the order they were added. Never
// sorted by score.
function aspectCard(state, friends, chapter) {
  const key = chapter.aspect;
  const you = tp("{name} (You)", { name: escapeHtml(state.profile.name) });
  return `
    <div class="region-card duo-card"><div class="lcard duocard">
      <div class="duocard-head">
        <div class="brand-logo" style="background: ${chapter.wash};"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></div>
        <h3 class="card-title"><a href="#/aspect/${key}">${escapeHtml(chapter.region)}</a></h3>
        <span class="tag" style="border-color: ${chapter.hue};">${escapeHtml(aspectName(key))}</span>
      </div>
      <dl class="duo-rows">
        <div class="duo-row duo-row-avg"><dt>${t("Population average")}</dt><dd><b>${escapeHtml(AVERAGE_ASPECT_SCORES[key])}</b></dd></div>
        ${scoreRow(you, (state.aspects || {})[key], key, true)}
        ${friends.map(f => scoreRow(escapeHtml(f.name), (f.aspects || {})[key], key, false)).join("")}
      </dl>
    </div></div>`;
}

export function compareMarkup(state, { pick = 0, confirm = null } = {}) {
  const friends = state.friends || [];
  const myCode = encodeComparisonCode(state);
  const learn = friends.map(f => complementLine(f, state.aspects)).join("");
  const count = tp("You + {n}", { n: friends.length });
  return `
    <div class="stage-page compare">
      ${heroMarkup({
        mark: yourStarSvg(scoresOf(state.aspects)),
        word: t("Side by Side").toUpperCase(),
        inc: count.toUpperCase(),
        srTitle: `${t("Side by Side")} — ${count}`,
        tapLabel: t("Play with the star")
      })}
      ${missionMarkup(t("Side by Side"), [t("Not a ranking."), t("Where you differ, not who is ahead.")])}
      ${codesSection(myCode)}
      ${duoSection(state, friends, Math.min(pick, Math.max(0, friends.length - 1)), confirm)}
      ${friends.length ? `
      <section class="projects compare-aspects">
        <div class="inner">
          ${label(t("Eight aspects, side by side"))}
          <div class="cardblock">${CHAPTERS.map(c => aspectCard(state, friends, c)).join("")}</div>
        </div>
      </section>` : ""}
      ${learn ? `
      <section class="panel statement compare-learn"><div class="wrap split">
        ${label(t("What they have cleared"))}
        <div>${learn}</div>
      </div></section>` : ""}
    </div>`;
}

// --- the view -----------------------------------------------------------------

// Slides the picked person's side of every ray to its new level. Without
// motion it is simply redrawn at the new levels.
function morphTo(group, from, to, scope) {
  const sides = group ? [...group.querySelectorAll("polygon")] : [];
  if (!sides.length) return;
  const draw = (p) => sides.forEach((side, i) => side.setAttribute("points", starRayAttr(i, from[i] + (to[i] - from[i]) * p, "end")));
  if (!scope) {
    draw(1);
    return;
  }
  animate({ duration: MORPH_MS, ease: easeStar, update: draw, signal: scope.signal, reduced: "end" })
    .catch(err => console.error("Side by Side morph failed:", err));
}

// `view` is the page's own redraw: who is picked, who is asking to be removed,
// where focus goes and what to say about it.
export function renderLeaderboard(containerId, state, onRefresh, view = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { confirm = null, focus = null, live = "" } = view;
  const friends = state.friends || [];
  let pick = Math.min(view.pick || 0, Math.max(0, friends.length - 1));
  const scope = renderStagePage(container, () => compareMarkup(state, { pick, confirm }));
  const redraw = (next) => renderLeaderboard(containerId, state, onRefresh, { pick, ...next });
  const root = container.querySelector?.(".compare");

  if (root && focus) root.querySelector(focus)?.focus();
  const announcer = document.getElementById("route-announcer");
  if (live && announcer) announcer.textContent = live;

  // Copy own code (clipboard API with select-fallback for older browsers).
  const copy = document.getElementById("btn-copy-code");
  copy?.addEventListener("click", async () => {
    const input = document.getElementById("my-comparison-code");
    input.select();
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      document.execCommand("copy");
    }
    copy.textContent = t("Copied!");
    setTimeout(() => { if (copy.isConnected) copy.textContent = t("Copy"); }, COPIED_MS);
  });

  document.getElementById("add-friend-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("friend-code");
    const errorEl = document.getElementById("friend-error");
    try {
      const friend = decodeComparisonCode(input.value);
      const result = stateManager.addFriend(friend);
      if (!result.ok) throw new Error(result.reason);
      const at = stateManager.state.friends.findIndex(f => f.id === result.friend.id);
      const live = result.updated ? tp("{name} updated.", { name: friend.name }) : tp("{name} added.", { name: friend.name });
      redraw({ pick: at, focus: '.people [aria-checked="true"]', live });
    } catch (err) {
      errorEl.classList.remove("d-none");
      errorEl.textContent = err.message;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "friend-error");
      input.focus();
    }
  });

  document.getElementById("btn-share-radar")?.addEventListener("click", () => openShareFor(state));

  if (!root) return;

  const removeNow = (id) => {
    const gone = friends.find(f => f.id === id);
    const pickedId = friends[pick]?.id;
    stateManager.removeFriend(id);
    const rest = stateManager.state.friends || [];
    // The picked person stays picked when someone else goes; when they are the
    // one removed, the pick falls to whoever now sits in their place.
    const still = rest.findIndex(f => f.id === pickedId);
    redraw({
      pick: still >= 0 ? still : Math.min(pick, Math.max(0, rest.length - 1)),
      focus: rest.length ? '.people [aria-checked="true"]' : "#friend-code",
      live: gone ? tp("{name} removed.", { name: gone.name }) : ""
    });
  };

  const pickTo = (k) => {
    if (k === pick || !friends[k]) return;
    const from = scoresOf(friends[pick].aspects);
    pick = k;
    root.querySelectorAll(".people [data-pick]").forEach((b, j) => {
      b.setAttribute("aria-checked", String(j === k));
      b.tabIndex = j === k ? 0 : -1;
    });
    const name = root.querySelector("#duo-them-name");
    if (name) name.textContent = friends[k].name;
    morphTo(root.querySelector(".duo-them"), from, scoresOf(friends[k].aspects), scope);
  };

  root.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    const { pick: picked, friendId, confirmRemove, cancelRemove } = button.dataset;
    if (picked !== undefined) pickTo(Number(picked));
    else if (friendId) redraw({ confirm: friendId, focus: `[data-cancel-remove="${CSS.escape(friendId)}"]` });
    else if (cancelRemove) redraw({ focus: `[data-friend-id="${CSS.escape(cancelRemove)}"]` });
    else if (confirmRemove) removeNow(confirmRemove);
  });

  // The people are one radio group: the arrows move the pick, as in any
  // radio group.
  root.querySelector(".people")?.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step || !friends.length) return;
    e.preventDefault();
    const k = (pick + step + friends.length) % friends.length;
    pickTo(k);
    root.querySelectorAll(".people [data-pick]")[k]?.focus();
  });
}
