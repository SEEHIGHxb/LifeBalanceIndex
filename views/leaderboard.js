// views/leaderboard.js - the Side by Side tab: comparison codes and an
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
// NO composite figure for anyone. What it has is the eight aspects laid out in
// parallel columns, each marked against the population average — the same
// yardstick the rest of the app uses. Difference is visible; ordering is not.
//
// The sample/NPC profiles are gone too. A board that invents opponents to look
// populated is a board nobody was filling.

import { stateManager } from "../state.js";
import { encodeComparisonCode, decodeComparisonCode } from "../comparison-code.js";
import { ASPECT_KEYS } from "../aspects.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { t, tp } from "../i18n.js";
import { escapeHtml, aspectLabel } from "./helpers.js";

// One cell: the score, plus whether it clears the population average for that
// aspect. Same test as the dashboard headline (aspectsAtOrAboveAverage), so a
// person reads the same verdict on both screens.
function scoreCell(score, aspectKey) {
  const value = Number.isFinite(score) ? Math.round(score) : 0;
  const above = value >= AVERAGE_ASPECT_SCORES[aspectKey];
  const title = above
    ? t("At or above the population average")
    : t("Below the population average");
  return `
    <td class="sbs-cell">
      <span class="sbs-score">${escapeHtml(value)}</span>
      <span class="sbs-mark ${above ? "sbs-above" : "sbs-below"}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${above ? "▲" : "▽"}</span>
    </td>`;
}

// The one genuinely useful thing a peer tells you that the population cannot:
// which aspects they have cleared that you have not. Framed as something to
// learn from, never as a deficit — no "they beat you", no count, no total.
function complementLine(person, myAspects) {
  const gaps = ASPECT_KEYS.filter(key =>
    (person.aspects || {})[key] >= AVERAGE_ASPECT_SCORES[key] &&
    !((myAspects || {})[key] >= AVERAGE_ASPECT_SCORES[key])
  );
  if (gaps.length === 0) return "";
  return `<li>${tp("{name} clears the population average in {aspects}, where you do not yet.", {
    name: escapeHtml(person.name),
    aspects: gaps.map(aspectLabel).join(", ")
  })}</li>`;
}

export function renderLeaderboard(containerId, state, onRefresh) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const friends = state.friends || [];
  const myCode = encodeComparisonCode(state);
  // Column order is fixed and meaningless on purpose: the population, then
  // you, then everyone in the order they were added. Never sorted by score.
  const people = [
    { name: tp("{name} (You)", { name: state.profile.name }), aspects: state.aspects, isUser: true },
    ...friends
  ];

  container.innerHTML = `
    <div style="max-width: 720px; margin: 0 auto;">
      <div class="card">
        <h3 class="card-header">${t("Comparison Codes")}</h3>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 12px;">
          ${t("Share your code with others over LINE or Discord, and paste theirs below. A code carries only a name and the eight aspect scores — no age, no points, nothing else. Re-paste a newer code any time to update someone.")}
        </p>
        <div class="form-group">
          <label for="my-comparison-code">${t("Your Comparison Code")}</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="my-comparison-code" class="form-control" value="${myCode}" readonly style="font-family: var(--font-mono); font-size: 0.75rem;">
            <button type="button" id="btn-copy-code" class="btn btn-primary" style="white-space: nowrap;">${t("Copy")}</button>
          </div>
        </div>
        <form id="add-friend-form">
          <div class="form-group">
            <label for="friend-code">${t("Add someone's code")}</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="friend-code" class="form-control" placeholder="LQ1-..." style="font-family: var(--font-mono); font-size: 0.75rem;" required>
              <button type="submit" class="btn btn-primary" style="white-space: nowrap;">${t("Add")}</button>
            </div>
          </div>
        </form>
        <p id="friend-error" class="d-none" style="color: var(--color-crimson); font-size: 0.85rem; font-weight: 600;"></p>
      </div>

      <div class="card">
        <h3 class="card-header">${t("Side by Side")}</h3>
        <p class="sbs-intro">
          ${t("Not a ranking. Each column is one person's eight aspects, marked against the population average — so you can see where you differ, not who is ahead.")}
        </p>
        ${friends.length === 0 ? `
          <p class="sbs-empty">${t("No one added yet. Paste someone's comparison code above to see their eight aspects beside yours.")}</p>` : `
        <div class="table-scroll">
          <table class="sbs-table">
            <thead>
              <tr>
                <th scope="col">${t("Aspect")}</th>
                <th scope="col" class="sbs-avg-head">${t("Population average")}</th>
                ${people.map(p => `
                  <th scope="col"${p.isUser ? ' class="sbs-you"' : ""}>
                    ${escapeHtml(p.name)}
                    ${p.isUser ? "" : `<button type="button" class="friend-remove" data-friend-id="${escapeHtml(p.id)}" aria-label="${tp("Remove {name}", { name: escapeHtml(p.name) })}" title="${t("Remove participant")}">✕</button>`}
                  </th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${ASPECT_KEYS.map(key => `
                <tr>
                  <th scope="row" class="sbs-aspect">${aspectLabel(key)}</th>
                  <td class="sbs-cell sbs-avg">${escapeHtml(AVERAGE_ASPECT_SCORES[key])}</td>
                  ${people.map(p => scoreCell((p.aspects || {})[key], key)).join("")}
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${(() => {
          const lines = friends.map(f => complementLine(f, state.aspects)).join("");
          return lines ? `<ul class="sbs-notes">${lines}</ul>` : "";
        })()}`}
      </div>
    </div>
  `;

  // Copy own code (clipboard API with select-fallback for older browsers).
  document.getElementById("btn-copy-code").addEventListener("click", async () => {
    const input = document.getElementById("my-comparison-code");
    input.select();
    try {
      await navigator.clipboard.writeText(myCode);
    } catch {
      document.execCommand("copy");
    }
    const btn = document.getElementById("btn-copy-code");
    btn.textContent = t("Copied!");
    setTimeout(() => { btn.textContent = t("Copy"); }, 1500);
  });

  document.getElementById("add-friend-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("friend-error");
    errorEl.classList.add("d-none");
    try {
      const friend = decodeComparisonCode(document.getElementById("friend-code").value);
      const result = stateManager.addFriend(friend);
      if (!result.ok) throw new Error(result.reason);
      if (onRefresh) onRefresh();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("d-none");
    }
  });

  container.querySelectorAll(".friend-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      stateManager.removeFriend(btn.getAttribute("data-friend-id"));
      if (onRefresh) onRefresh();
    });
  });
}
