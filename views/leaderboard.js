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
// so focus can be put back where the reader was. Compact since 2026-09-26
// (the owner's map): a short top, the shared star first, the eight aspects as
// one table, and the codes last and folded once someone is added.

import { stateManager } from "../state.js";
import { encodeComparisonCode, decodeComparisonCode } from "../comparison-code.js";
import { ASPECT_KEYS } from "../aspects.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { t, tp } from "../i18n.js";
import { escapeHtml, aspectLabel, noteBook, footnoteList, bindFootnotes } from "./helpers.js";
import { CHAPTERS } from "./journey.js";
import { topMarkup, label, renderStagePage } from "./stage-page.js";
import { shapeFigure, shapeDial, shapeSwitchMarkup, bindShapeSwitch, adoptShape, morphShape, readShapeView } from "./shape.js";
import { aspectName } from "./news.js";

const COPIED_MS = 1500;

const scoresOf = (aspects) => CHAPTERS.map(c => Number((aspects || {})[c.aspect]) || 0);
const AVERAGES = CHAPTERS.map(c => AVERAGE_ASPECT_SCORES[c.aspect]);
const clearsAverage = (aspects, key) => Number((aspects || {})[key]) >= AVERAGE_ASPECT_SCORES[key];

// Two snapshots are the same person at the same moment: the name as the roster
// matches it (ignoring case) and every aspect score.
const sameSnapshot = (a, b) => a.name.toLowerCase() === b.name.toLowerCase()
  && ASPECT_KEYS.every(key => Number((a.aspects || {})[key]) === Number((b.aspects || {})[key]));

// The one genuinely useful thing a peer tells you that the population cannot:
// which aspects they have cleared that you have not. Framed as something to
// learn from, never as a deficit — no "they beat you", no count, no total.
function complementLine(person, myAspects) {
  const gaps = ASPECT_KEYS.filter(key => clearsAverage(person.aspects, key) && !clearsAverage(myAspects, key));
  if (gaps.length === 0) return "";
  return `<p>${tp("{name} is above average in {aspects}, where you are not yet.", {
    name: escapeHtml(person.name),
    aspects: gaps.map(aspectLabel).join(", ")
  })}</p>`;
}

// With no one added the codes are the whole point, so they lead, open. Once
// someone is added they are needed far less than the comparison, so they go
// last and fold away (the owner's map, 2026-09-26).
// What a code carries, and how to update someone, is a note (v148).
function codesSection(myCode, folded, book) {
  const ref = book.ref("codes", `<p>${escapeHtml(t("A code carries only a name and the eight aspect scores: no age, no points, nothing else. Paste a newer code any time to update someone."))}</p>`);
  const inner = `
        <p>${t("Send your code to someone, and paste theirs below.")}${ref}</p>
        <div class="code-field">
          <label for="my-comparison-code">${t("Your code")}</label>
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
        </form>`;
  return `
    <section class="panel statement codes"><div class="wrap split">
      ${label(t("Comparison Codes"))}
      <div>${folded ? `<details class="codes-fold"><summary>${t("Share or add a code")}</summary>${inner}</details>` : inner}</div>
    </div></section>`;
}

// One figure shared by two (views/shape.js): in the star each ray is split
// down its middle, your side in gold and theirs in ink; in the radar and the
// asterism the two shapes lie over each other. The population average is
// dashed in every view, and the eight regions' dots mark the rim.
function duoFigure(state, them, view) {
  const dots = CHAPTERS.map((c, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    return `<circle cx="${(50 + 49 * Math.cos(a)).toFixed(2)}" cy="${(50 + 49 * Math.sin(a)).toFixed(2)}" r="1.3" fill="${c.hue}"/>`;
  }).join("");
  return `<div class="duo-fig">${shapeDial(shapeFigure({ view, you: scoresOf(state.aspects), them: scoresOf(them.aspects), avg: AVERAGES, extra: dots }), view)}</div>`;
}

// Everyone added, in the order they were added. Each can be picked to lie over
// your star, and removed (which asks first). With one person there is nothing
// to pick, so there is no picker (v148).
function peopleMarkup(friends, pick, confirm) {
  const pills = friends.length < 2 ? "" : friends.map((f, k) => {
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
    ${pills ? `<div class="people" role="radiogroup" aria-label="${escapeHtml(t("Whose star shares yours"))}">${pills}</div>` : ""}
    <div class="people-rm">${removes}</div>`;
}

// Your star with the picked person's laid over it. With no one added there is
// nothing to show: the codes above already say what to do (v148). The legend
// says which colour is whose, so the page does not say it again.
function duoSection(state, friends, pick, confirm, view) {
  const them = friends[pick];
  if (!them) return "";
  const you = tp("{name} (You)", { name: escapeHtml(state.profile.name) });
  const body = `
      <ul class="duo-legend">
        <li><i class="lg-you"></i>${you}</li>
        <li><i class="lg-them"></i><span id="duo-them-name">${escapeHtml(them.name)}</span></li>
        <li><i class="lg-avg"></i>${t("Population average")}</li>
      </ul>
      ${peopleMarkup(friends, pick, confirm)}
      ${duoFigure(state, them, view)}
      <p class="duo-switch">${shapeSwitchMarkup(view)}</p>`;
  return `
    <section class="panel statement duo"><div class="wrap split">
      <h2 class="label" id="duo-label" tabindex="-1">(${escapeHtml(t("Ray by ray"))})</h2>
      <div>${body}</div>
    </div></section>`;
}

// One cell of the table: a score and whether it clears the average there.
function scoreCell(value, key, isYou) {
  const v = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  const above = v >= AVERAGE_ASPECT_SCORES[key];
  return `<td${isYou ? ' class="is-you"' : ""}><b>${escapeHtml(v)}</b><span class="sbs-mark" aria-hidden="true">${above ? "▲" : "▽"}</span><span class="sr-only">${above ? t("At or above the population average") : t("Below the population average")}</span></td>`;
}

// One table, a row per aspect (the owner's map, 2026-09-26; it was a card
// each). The columns are fixed and meaningless on purpose: the population,
// then you, then everyone in the order they were added. Never sorted by score.
function aspectTable(state, friends) {
  const you = tp("{name} (You)", { name: escapeHtml(state.profile.name) });
  const head = [t("Population average"), you, ...friends.map(f => escapeHtml(f.name))]
    .map(name => `<th scope="col">${name}</th>`).join("");
  const rows = CHAPTERS.map(chapter => {
    const key = chapter.aspect;
    return `
      <tr>
        <th scope="row"><a href="#/aspect/${key}"><span class="sbs-emblem" style="background: ${chapter.wash};"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></span><span class="sbs-name">${escapeHtml(chapter.region)}<small>${escapeHtml(aspectName(key))}</small></span></a></th>
        <td class="sbs-avg"><b>${escapeHtml(AVERAGE_ASPECT_SCORES[key])}</b></td>
        ${scoreCell((state.aspects || {})[key], key, true)}
        ${friends.map(f => scoreCell((f.aspects || {})[key], key, false)).join("")}
      </tr>`;
  }).join("");
  return `
    <div class="sbs-scroll"><table class="sbs-table">
      <thead><tr><th scope="col"><span class="sr-only">${t("Aspect")}</span></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

export function compareMarkup(state, { pick = 0, confirm = null } = {}) {
  const friends = state.friends || [];
  const myCode = encodeComparisonCode(state);
  const learn = friends.map(f => complementLine(f, state.aspects)).join("");
  const anyone = friends.length > 0;
  // "You + 0" said nothing (v148): the count shows once someone is added.
  const count = anyone ? tp("You + {n}", { n: friends.length }) : "";
  const view = readShapeView();
  // Sections are built in reading order, so the notes number the way the page
  // reads. The page's promise (not a ranking) and what the ▲ ▽ marks mean are
  // one note on the table (v148), where they apply.
  const book = noteBook();
  const codesFirst = anyone ? "" : codesSection(myCode, false, book);
  const duo = duoSection(state, friends, Math.min(pick, Math.max(0, friends.length - 1)), confirm, view);
  const table = anyone ? `
      <section class="panel statement compare-aspects"><div class="wrap">
        <h2 class="label">(${escapeHtml(t("Eight aspects, side by side"))})${book.ref("reading", `<p>${t("Not a ranking.")} ${t("Where you differ, not who is ahead.")}</p><p>${escapeHtml(t("▲ marks a score at or above the population average, ▽ one below it."))}</p>`)}</h2>
        ${aspectTable(state, friends)}
      </div></section>` : "";
  const codesLast = anyone ? codesSection(myCode, true, book) : "";
  return `
    <div class="stage-page compare">
      ${topMarkup({
        mark: shapeFigure({ view, you: scoresOf(state.aspects) }),
        word: t("Side by Side"),
        inc: count,
        tapLabel: t("Play with the star")
      })}
      ${codesFirst}
      ${duo}
      ${table}
      ${learn ? `
      <section class="panel statement compare-learn"><div class="wrap split">
        ${label(t("What they have cleared"))}
        <div>${learn}</div>
      </div></section>` : ""}
      ${codesLast}
      ${book.notes.length ? `
      <section class="panel statement compare-notes"><div class="wrap split">
        ${label(t("Notes and sources"))}
        <div>${footnoteList(book.notes)}</div>
      </div></section>` : ""}
    </div>`;
}

// --- the view -----------------------------------------------------------------


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

  // Every figure knows what it shows, so the switch and a new pick can morph it.
  root?.querySelectorAll("svg.shape").forEach(svg => adoptShape(svg, {
    view: svg.dataset.view,
    you: scoresOf(state.aspects),
    them: svg.classList.contains("shape-duo") && friends[pick] ? scoresOf(friends[pick].aspects) : null
  }));
  bindShapeSwitch(root, scope);
  if (root) bindFootnotes(root);
  // Focus after a change goes to the picker, or with one person (no picker)
  // to the star's own heading.
  const duoFocus = (n) => (n >= 2 ? '.people [aria-checked="true"]' : "#duo-label");

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
      // Your own code would put you beside yourself, and a friend's code that
      // is already on the list, unchanged, would do nothing: both used to pass
      // without a word. A newer code from a friend still updates them.
      const own = decodeComparisonCode(encodeComparisonCode(state));
      if (sameSnapshot(friend, own)) throw new Error(t("That's your own code. Paste the code a friend sent you."));
      const listed = (stateManager.state.friends || []).find(f => sameSnapshot(f, friend));
      if (listed) throw new Error(tp("{name} is already on your list with these scores.", { name: friend.name }));
      const result = stateManager.addFriend(friend);
      if (!result.ok) throw new Error(result.reason);
      const at = stateManager.state.friends.findIndex(f => f.id === result.friend.id);
      const live = result.updated ? tp("{name} updated.", { name: friend.name }) : tp("{name} added.", { name: friend.name });
      redraw({ pick: at, focus: duoFocus(stateManager.state.friends.length), live });
    } catch (err) {
      errorEl.classList.remove("d-none");
      errorEl.textContent = err.message;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "friend-error");
      input.focus();
    }
  });

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
      focus: rest.length ? duoFocus(rest.length) : "#friend-code",
      live: gone ? tp("{name} removed.", { name: gone.name }) : ""
    });
  };

  const pickTo = (k) => {
    if (k === pick || !friends[k]) return;
    pick = k;
    root.querySelectorAll(".people [data-pick]").forEach((b, j) => {
      b.setAttribute("aria-checked", String(j === k));
      b.tabIndex = j === k ? 0 : -1;
    });
    const name = root.querySelector("#duo-them-name");
    if (name) name.textContent = friends[k].name;
    morphShape(root.querySelector(".duo-fig svg.shape"), { them: scoresOf(friends[k].aspects) }, scope);
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
