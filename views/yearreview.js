// views/yearreview.js - the level-year screen (#/year).
//
// Two jobs, one route. When the birthday is unknown it asks the single question
// that makes level-ups possible; once known it reports where the current year
// stands. Both live here so dismissing the dashboard prompt is never a dead end
// — this page always carries the question.
//
// The tone is fixed by the plan: FORWARD-LOOKING, never punitive. This screen
// reports what has been earned and how much runway is left, and it does not
// render a verdict on either. There is deliberately no use of seasonPace's
// `onPace` flag here; a number the user can interpret beats a grade the app
// hands down.
//
// THE REDESIGN (R5, v100; docs/prototype/redesign/you.js yearHTML). A stage
// page: YEAR and your level in the hero, when the year closes typed in, this
// year's points, then what moved and the years filed as news lists, and the
// day your year turns at the end.

import { stateManager } from "../state.js";
import { seasonPace, nextBirthday, daysUntil, weeksBetween } from "../season.js";
import { t, tp, dateLocale } from "../i18n.js";
import { escapeHtml, birthdayFields } from "./helpers.js";
import { SPRITES } from "./stage.js";
import { heroMarkup, missionMarkup, label, renderStagePage } from "./stage-page.js";
import { aspectName, chapterOf, motifThumb, starThumb } from "./news.js";

const FILED_ROWS = 12;
const MINUS = "−";
const signed = (d) => (d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "0");
const STAR_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="${SPRITES}#star"/></svg>`;

// The recorded snapshot closest to the season's start, on either side.
//
// The list labels its deltas with THIS snapshot's own date rather than with
// the birthday, so the figure is exactly true regardless of where the nearest
// weekly snapshot happened to land. Claiming "since your birthday" while
// measuring from eleven days later would be a small, avoidable lie.
function anchorSnapshot(snapshots, startIso) {
  const start = new Date(startIso).getTime();
  if (!Array.isArray(snapshots) || snapshots.length < 2 || !Number.isFinite(start)) return null;
  let best = null;
  let bestGap = Infinity;
  for (const snap of snapshots) {
    const at = new Date(snap && snap.date).getTime();
    if (!Number.isFinite(at) || !snap.aspects) continue;
    const gap = Math.abs(at - start);
    if (gap < bestGap) { best = snap; bestGap = gap; }
  }
  // The newest snapshot as anchor means there is nothing to compare it against.
  return best === snapshots[snapshots.length - 1] ? null : best;
}

function shortDate(value) {
  return new Date(value).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

function birthdaySection(profile, known) {
  return `
    <section class="panel statement year-turn"><div class="wrap split">
      ${label(t("The day your year turns"))}
      <div>
        <p>${t("Your level is simply your age — a fact about you, not a score you earned. Tell the app which day your year turns and it can close each year and open the next one for you.")}</p>
        <form id="year-birthday-form" class="year-form">
          ${known ? `<p class="year-form-head">${t("Change the day your year turns")}</p>` : ""}
          ${birthdayFields({ idPrefix: "year-birthday", month: profile.birthMonth, day: profile.birthDay })}
          <button type="submit" class="pill">${t("Save")}</button>
          <p id="year-birthday-error" class="year-error d-none" role="alert"></p>
        </form>
      </div>
    </div></section>`;
}

function pointsSection(pace) {
  return `
    <section class="panel statement year-points"><div class="wrap split">
      ${label(t("This year's points"))}
      <div>
        <p class="ypoints"><b>${escapeHtml(pace.earned)}</b> / ${escapeHtml(pace.possible)}</p>
        <div class="meter ymeter" role="progressbar" aria-label="${t("This year's points")}"
          aria-valuenow="${pace.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width: ${pace.percent}%;"></i></div>
        <p>${pace.ratio === null
          ? t("This year has only just opened — there is nothing to measure yet.")
          : tp("{xp} points earned of the {possible} your pledges have offered so far.", {
              xp: escapeHtml(pace.earned), possible: escapeHtml(pace.possible)
            })}</p>
      </div>
    </div></section>`;
}

// A news list: the label, an optional note, the rows.
function newsSection(cls, labelText, note, rows) {
  return `
    <section class="panel news ${cls}"><div class="wrap split">
      <div class="news-side">${label(labelText)}${note ? `<p class="news-note">${note}</p>` : ""}</div>
      <ul class="newslist">${rows}</ul>
    </div></section>`;
}

// What moved since the snapshot nearest the year's start, largest first.
function movementSection(state) {
  const anchor = anchorSnapshot(state.snapshots, state.profile.season && state.profile.season.startDate);
  if (!anchor) return "";
  const rows = Object.entries(state.aspects)
    .map(([key, value]) => ({ key, delta: Math.round(value - (Number(anchor.aspects[key]) || 0)) }))
    .filter(row => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const note = tp("Measured against your closest recorded snapshot, {date}.", { date: escapeHtml(shortDate(anchor.date)) });
  const list = rows.length === 0
    ? `<li class="newsrow-empty">${t("Your scores have held steady so far.")}</li>`
    : rows.map(({ key, delta }) => `
      <li class="newsrow">
        <span class="newsrow-meta"><span class="newsrow-delta">${escapeHtml(signed(delta))}</span><span class="newsrow-kind">${escapeHtml(aspectName(key))}</span></span>
        ${motifThumb(key)}
        <span class="newsrow-title">${escapeHtml(chapterOf(key)?.region || aspectName(key))}</span>
      </li>`).join("");
  return newsSection("year-move", t("Movement this year"), note, list);
}

// The archive is the whole reason a season reset is survivable: a year does
// not vanish at the birthday, it moves here. Newest first.
function filedSection(levelYears) {
  const years = (levelYears || []).slice(-FILED_ROWS).reverse();
  const list = years.length === 0
    ? `<li class="newsrow-empty">${t("Nothing filed yet — your first year closes on your next birthday.")}</li>`
    : years.map(year => {
      const percent = Math.round(Math.max(0, Math.min(1, Number(year.ratio) || 0)) * 100);
      const title = tp("Year {level}", { level: escapeHtml(year.level) });
      return `
      <li class="newsrow">
        <span class="newsrow-meta"><span class="newsrow-kind">${title}</span></span>
        ${starThumb(STAR_SVG)}
        <span class="newsrow-title">${tp("{xp} / {possible} points", { xp: escapeHtml(year.xp), possible: escapeHtml(year.possible) })}
          <span class="meter" role="progressbar" aria-label="${title}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width: ${percent}%;"></i></span>
        </span>
      </li>`;
    }).join("");
  return newsSection("year-filed", t("Years filed"), "", list);
}

export function yearMarkup(state, now = new Date()) {
  const profile = state.profile;
  const known = Boolean(profile.birthMonth && profile.birthDay);
  const title = tp("Year {level}", { level: profile.level });
  let lines = [t("Your level is your age, not points earned")];
  if (known) {
    const closes = nextBirthday(now, profile.birthMonth, profile.birthDay);
    const days = daysUntil(now, closes);
    lines = [
      days === 0 ? t("This year closes today.") : tp("Closes on {date} — {days} days from now.", { date: shortDate(closes), days }),
      tp("{weeks} weeks still to run.", { weeks: weeksBetween(now, closes) })
    ];
  }
  return `
    <div class="stage-page year-page">
      ${heroMarkup({
        mark: STAR_SVG,
        word: t("Year").toUpperCase(),
        inc: String(profile.level),
        srTitle: title,
        tapLabel: t("Play with the star")
      })}
      ${missionMarkup(t("Your year"), lines)}
      ${known ? pointsSection(seasonPace(profile.season)) : ""}
      ${known ? movementSection(state) : ""}
      ${filedSection(state.levelYears)}
      ${birthdaySection(profile, known)}
    </div>`;
}

export function renderYearReview(containerId, state, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  renderStagePage(container, () => yearMarkup(state));

  const form = document.getElementById("year-birthday-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorEl = document.getElementById("year-birthday-error");
    errorEl.classList.add("d-none");
    const month = document.getElementById("year-birthday-month").value;
    const day = document.getElementById("year-birthday-day").value;

    // An empty month is "prefer not to say", not an error: the question is
    // optional and refusing it has to stay free of a scolding red message.
    if (!month) {
      stateManager.dismissBirthdayPrompt();
      if (typeof onChange === "function") onChange();
      return;
    }
    // setBirthday rejects rather than clamps, so 31 February lands here instead
    // of quietly becoming 1 March and levelling the user up on the wrong day.
    if (!stateManager.setBirthday(month, day)) {
      errorEl.textContent = t("That date doesn't exist — check the day of the month.");
      errorEl.classList.remove("d-none");
      return;
    }
    if (typeof onChange === "function") onChange();
  });
}
