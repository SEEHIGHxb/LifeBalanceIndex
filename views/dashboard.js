// views/dashboard.js - Home (redesign R3; docs/prototype/redesign/proto.js
// homeHTML, with the section-to-content map the owner approved on 2026-09-25).
//
// Top to bottom:
//   notice      the duty-of-care notice, only past the screening cutoff; still
//   hero        your star (the radar shape of your scores) and the Balance Index
//   headline    your strongest region and the one asking for more
//   you         the Balance Index band and standing, name, level and points
//   to do       the prompts you can act on, most urgent first
//   aspects     one card per region: score, average, grade and standing
//   band        three regions' photographs
//   recent      reviews, re-assessments and the journey, newest first
//   start       the recommendations (Lumi's panel takes them over in R5)
//   pledges     your active pledges as stickers
//   deeper      the in-depth offer, below the scores, while it is unfinished
//   check-in    the call to this week's review
//
// Beside the care notice the whole page is still: no hero, no typing, no
// sliding cards (the old ceremony's quiet rule, kept).

import { stateManager } from "../state.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { getAllBenchmarks, collectSources } from "../benchmarks.js";
import { getAspectConfidence, ASPECT_KEYS, isAspectDeepVerified } from "../aspects.js";
import { getTopSuggestions, getMentalHealthNotice } from "../suggestions.js";
import {
  balanceIndex, balanceBand, weakestAspect, gradeAllAspects, aspectsAtOrAboveAverage,
  isBottomGrade, relativeToPopulation
} from "../grades.js";
import { goalTemplate } from "../goals.js";
import { ASPECT_LABELS } from "../chart.js";
import { seasonPace } from "../season.js";
import { openShareSheet } from "./share.js";
import { CHAPTERS } from "./journey.js";
import { SPRITES, onAbort } from "./stage.js";
import { heroMarkup, missionMarkup, bandMarkup, label, renderStagePage } from "./stage-page.js";
import { writeMotionStyle } from "./motion-mount.js";
import { nextReviewDate } from "./review.js";
import { t, tp } from "../i18n.js";
import {
  escapeHtml, aspectLabel, confidenceBadge, benchmarkStanding, estimatedAspects,
  mentalHealthNotice, gradeBadge, balanceIndexBlock, CHECKIN_ASPECTS
} from "./helpers.js";

const BAND_REGIONS = [1, 0, 7];
const RECENT_ROWS = 5;
const WALL_COLUMNS = 6;
const WALL_ROWS = 8;
// Every fourth sticker is the gilt star, as on the prototype's wall.
const STAR_STICKER_EVERY = 4;
// How far a wall column drifts across the wall's pass through the screen, in
// prototype px (1/2545 of the page's width).
const WALL_DRIFT = 420;
const DESKTOP_REF = 2545;

// --- your star ------------------------------------------------------------
// The radar shape of the eight scores, drawn in the gilt star's inks: a tip
// per aspect in CHAPTERS order (the radar's order), valleys between them. A
// score near zero still keeps a small tip, so the shape never collapses.
const STAR_VALLEY = 13 / 46; // story-card.js's valley
const ANG = (i) => -Math.PI / 2 + i * Math.PI / 4;
const pt = (r, a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;

export function yourStarSvg(scores) {
  const tips = scores.map(s => 47 * Math.max(STAR_VALLEY * 1.35, (Number(s) || 0) / 100));
  const points = tips.flatMap((r, i) => [pt(r, ANG(i)), pt(47 * STAR_VALLEY, ANG(i) + Math.PI / 8)]).join(" ");
  const spokes = tips.map((r, i) => `M50 50L${pt(r, ANG(i))}`).join("");
  return `<svg viewBox="0 0 100 100" aria-hidden="true">` +
    `<polygon points="${points}" fill="#F0D8A8" stroke="#A88752" stroke-width="3.2" stroke-linejoin="round"/>` +
    `<path d="${spokes}" stroke="#A88752" stroke-width="1.6" stroke-opacity=".5" stroke-linecap="round"/>` +
    `<circle cx="50" cy="50" r="6" fill="#FBF8F1" stroke="#6F7D64" stroke-width="2.4"/></svg>`;
}

const motifIcon = (aspect) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="${SPRITES}#motif-${aspect}"/></svg>`;
const chapterOf = (aspect) => CHAPTERS.find(c => c.aspect === aspect);
// The aspect's name as plain text, for places that escape it themselves
// (helpers.js's aspectLabel returns it already escaped, for raw HTML sinks).
const aspectName = (key) => t(ASPECT_LABELS[key] || key);
// "2026.09.21", the prototype's news-list date, the same in both languages.
const dotDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}`;
};
const shiftSummary = (shifts) => {
  const parts = Object.entries(shifts || {})
    .map(([key, v]) => `${aspectName(key)} ${v > 0 ? "+" : ""}${v}`);
  return parts.length ? parts.join(" · ") : t("scores steady");
};
// The aspect a record moved most, for its thumbnail; null when none moved.
const biggestShift = (shifts) => {
  const moved = Object.entries(shifts || {}).filter(([k, v]) => v && chapterOf(k));
  if (!moved.length) return null;
  return moved.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a))[0];
};

// --- the reading ------------------------------------------------------------
// Everything the page says, computed once, so the markup and the share card
// cannot disagree.
function readHome(state) {
  const p = state.profile;
  const benchmarks = getAllBenchmarks(state);
  const index = balanceIndex(state.aspects);
  const rel = (k) => relativeToPopulation(state.aspects[k], AVERAGE_ASPECT_SCORES[k]);
  return {
    state,
    profile: p,
    pace: seasonPace(p.season),
    careNotice: getMentalHealthNotice(state),
    benchmarks,
    sources: collectSources(benchmarks),
    // state.aspects is passed because finance grades off its composite score,
    // not off its income percentile (see gradeForFinance).
    grades: gradeAllAspects(benchmarks, state.aspects),
    index,
    band: balanceBand(index),
    weakest: weakestAspect(state.aspects),
    // Measured the same way as the weakest: against the population average.
    strongest: ASPECT_KEYS.reduce((a, b) => (rel(b) > rel(a) ? b : a)),
    standing: aspectsAtOrAboveAverage(state.aspects),
    scores: CHAPTERS.map(c => state.aspects[c.aspect]),
    suggestions: getTopSuggestions(state, 3),
    reviewDue: stateManager.isWeeklyReviewDue(),
    checkinDue: stateManager.isCheckinDue(),
    // A soft ask, shown once until it is answered or waved off, and held back
    // until a first weekly review is on record: month and day cannot matter
    // until a level-year turns, which takes months of use. The Profile page
    // carries the fields the whole time.
    askBirthday: state.reviews.length > 0 && !p.birthMonth && !p.birthdayPromptDismissed,
    needsBackup: stateManager.needsBackupNudge(),
    daysSinceExport: stateManager.daysSinceLastExport(),
    deepDone: ASPECT_KEYS.filter(k => isAspectDeepVerified(state, k)).length
  };
}

// --- sections ---------------------------------------------------------------

function noticeSection(h) {
  if (!h.careNotice) return "";
  return `<section class="panel notice-panel"><div class="wrap">${mentalHealthNotice(h.careNotice)}</div></section>`;
}

function youSection(h) {
  const p = h.profile;
  const points = h.pace.ratio === null
    ? tp("{xp} points this year", { xp: escapeHtml(h.pace.earned) })
    : tp("Points: {xp} / {possible}", { xp: escapeHtml(h.pace.earned), possible: h.pace.possible });
  return `
    <section class="panel statement home-you"><div class="wrap split">
      ${label(t("You"))}
      <div>
        ${balanceIndexBlock(h.index, h.band, h.weakest, h.standing)}
        <div class="home-identity">
          <p class="home-name">${escapeHtml(p.name)}</p>
          <p class="home-facts">${escapeHtml(t(p.employment))} (${escapeHtml(t(p.region))}) · ${t("Lv.")}${escapeHtml(p.level)} · ${points}</p>
          <p class="level-note">${t("Your level is your age, not points earned")}</p>
          <p class="home-links">
            <a class="pill" href="#/year">${escapeHtml(t("Your year"))}</a>
            <button type="button" id="btn-share-radar" class="pill pill-light">${escapeHtml(t("Share your star"))}</button>
          </p>
        </div>
      </div>
    </div></section>`;
}

// One thing to do: a headline, why, and the controls that do it.
function todoRow({ title, body, actions, cls = "" }) {
  return `
    <li class="todo${cls ? ` ${cls}` : ""}">
      <p class="todo-text"><strong class="todo-title">${title}</strong> <span class="todo-body">${body}</span></p>
      ${actions ? `<span class="todo-actions">${actions}</span>` : ""}
    </li>`;
}

// The prompts a user can act on, most urgent first: the weekly review is the
// app's loop, a due re-assessment is stale scores, and an un-backed-up browser
// is the only one that can lose data.
function todoSection(h) {
  const rows = [];
  if (h.reviewDue) {
    rows.push(todoRow({
      title: t("Weekly review open."),
      body: t("Two minutes of rough weekly numbers keep every score measured — no daily logging."),
      actions: `<a href="#/review" class="pill">${t("Start Weekly Review")}</a>`
    }));
  }
  if (h.checkinDue) {
    rows.push(todoRow({
      title: t("Monthly re-assessment due."),
      body: t("Re-run the short well-being instruments so your scores track your real standing, not last month's."),
      actions: `<a href="#/checkin" class="pill">${t("Start Re-assessment")}</a>`
    }));
  }
  if (h.needsBackup) {
    rows.push(todoRow({
      title: t("Back up your data."),
      body: h.daysSinceExport === null
        ? t("Everything here is stored only in this browser. Clearing site data, or the browser reclaiming space, would erase it with no way back.")
        : tp("Your last backup was {days} days ago. Everything here is stored only in this browser, so a cleared cache would erase it.", { days: h.daysSinceExport }),
      actions: `<button type="button" id="backup-nudge-export" class="pill">${t("Export")}</button>`
    }));
  }
  if (h.askBirthday) {
    rows.push(todoRow({
      title: t("When does your year turn?"),
      body: t("Your level is your age. Tell the app the day and it can close each year and open the next — month and day only."),
      actions: `<a href="#/year" class="pill">${t("Answer")}</a>
                <button type="button" id="birthday-prompt-dismiss" class="pill pill-light">${t("Not now")}</button>`
    }));
  }
  if (h.profile.assessmentComplete === false) {
    rows.push(todoRow({
      cls: "quickstart-note",
      title: t("Quick-start results."),
      body: t("Aspects beyond your first sections use baseline estimates. Submit a Weekly Review to shape them, and monthly re-assessments refine your survey scores over time."),
      actions: ""
    }));
  }
  if (!rows.length) return "";
  return `
    <section class="panel statement home-todo"><div class="wrap split">
      ${label(t("To do"))}
      <ul class="todo-list">${rows.join("")}</ul>
    </div></section>`;
}

function aspectCard(h, chapter, i) {
  const key = chapter.aspect;
  const score = h.scores[i];
  const b = h.benchmarks[key];
  return `
    <a class="region-card home-card" href="#/aspect/${key}" aria-label="${escapeHtml(tp("Open {aspect} details", { aspect: aspectName(key) }))}">
      <div class="lcard brand-visual">
        <div class="brand-logo" style="background: ${chapter.wash};"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></div>
        <div class="brand-score">
          <p class="score-figure"><b>${escapeHtml(score)}</b><small>${escapeHtml(t("out of 100"))}</small></p>
          <span class="meter" aria-hidden="true"><i style="width: ${Number(score) || 0}%; background: ${chapter.hue};"></i></span>
          <p class="score-average">${escapeHtml(tp("Average {n}", { n: AVERAGE_ASPECT_SCORES[key] }))}</p>
        </div>
      </div>
      <div class="lcard info">
        <h3 class="card-title">${escapeHtml(chapter.region)}</h3>
        <div class="card-desc">${b ? benchmarkStanding(b, { compact: true }) : ""}</div>
        <p class="info-links">
          <span class="tag" style="border-color: ${chapter.hue};">${escapeHtml(aspectName(key))}</span>
          ${gradeBadge(h.grades[key], b && !h.grades[key] ? b.unranked : null)}
          ${confidenceBadge(getAspectConfidence(h.state, key))}
        </p>
      </div>
    </a>`;
}

function aspectsSection(h) {
  const estimated = estimatedAspects(h.state);
  const canDeepen = estimated.some(k => CHECKIN_ASPECTS.includes(k));
  const estimateNote = estimated.length === 0 ? "" : `
    <p class="home-note completeness-note"><strong>${t("Some scores are estimates.")}</strong> ${tp("These are scored from default answers: {aspects}. Re-run your assessment or submit a Weekly Review to confirm them.", { aspects: estimated.map(aspectLabel).join(", ") })}${canDeepen ? ` <a href="#/checkin">${t("Deepen my survey scores")}</a>` : ""}</p>`;
  return `
    <section class="projects home-aspects">
      <div class="inner">
        ${label(t("Your eight aspects"))}
        <div class="cardblock">
          ${CHAPTERS.map((c, i) => aspectCard(h, c, i)).join("")}
          ${estimateNote}
          <details class="home-sources">
            <summary>${t("Benchmark sources & methodology")}</summary>
            <p>${t('Percentiles compare your baseline answers with published population statistics — they are honest approximations, not exact ranks. "Estimate" marks curves calibrated to a published anchor point.')}</p>
            <ul>
              ${h.sources.map(src => `<li><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}
            </ul>
          </details>
        </div>
      </div>
    </section>`;
}

// One row of a news list. `thumb` is trusted markup; the rest is text.
function newsRow({ date = "", kind, thumb, title, sub = "", href = "" }) {
  const inner = `
    <span class="newsrow-meta">${date ? `<span class="newsrow-date">${escapeHtml(date)}</span>` : ""}<span class="newsrow-kind">${escapeHtml(kind)}</span></span>
    ${thumb}
    <span class="newsrow-title">${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ""}</span>`;
  return href ? `<li><a class="newsrow" href="${href}">${inner}</a></li>` : `<li class="newsrow">${inner}</li>`;
}

function thumbFor(aspect, h) {
  const chapter = aspect && chapterOf(aspect);
  return chapter
    ? `<span class="newsrow-thumb" style="background: ${chapter.wash}; --hue: ${chapter.hue};">${motifIcon(aspect)}</span>`
    : `<span class="newsrow-thumb newsrow-star">${yourStarSvg(h.scores)}</span>`;
}

// Reviews, re-assessments and the journey, newest first. Pledges carry no
// date, so they are on the wall below rather than in this list.
function recentRecords(h) {
  const { state } = h;
  const rows = [
    ...state.reviews.map(r => ({
      date: r.date,
      kind: t("Weekly Review"),
      aspect: biggestShift(r.shifts),
      title: shiftSummary(r.shifts),
      sub: `${tp("{met}/{total} pledges met", { met: r.goals.filter(g => g.met).length, total: r.goals.length })} · ${tp("+{xp} points", { xp: r.xp })}`
    })),
    ...(state.checkins || []).map(c => ({
      date: c.date, kind: t("Re-assessment"), aspect: biggestShift(c.shifts), title: shiftSummary(c.shifts)
    })),
    ...(state.baseline?.date ? [{
      date: state.baseline.date, kind: t("Journey"), aspect: null, title: t("Journey complete"), sub: t("All eight regions")
    }] : [])
  ];
  return rows
    .filter(r => !Number.isNaN(new Date(r.date).getTime()))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, RECENT_ROWS);
}

function newsSection(h) {
  const recent = recentRecords(h);
  const recentList = recent.length
    ? recent.map(r => newsRow({ date: dotDate(r.date), kind: r.kind, thumb: thumbFor(r.aspect, h), title: r.title, sub: r.sub })).join("")
    : `<li class="newsrow newsrow-empty">${escapeHtml(t("No weekly reviews yet — your first one opens the week after onboarding."))}</li>`;
  const start = h.suggestions.length ? `
    <div class="wrap split news-block">
      <div class="news-side">${label(t("Where to start"))}<p class="news-note">${escapeHtml(t("Targeting your weakest measured components — tap one to open that aspect."))}</p></div>
      <ul class="newslist">${h.suggestions.map(s => newsRow({
        kind: s.aspectLabel, thumb: thumbFor(s.aspect, h), title: s.title,
        sub: `${s.text} · ${s.componentLabel}: ${s.componentValue}/100`, href: `#/aspect/${s.aspect}`
      })).join("")}</ul>
    </div>` : "";
  return `
    <section class="panel news">
      <div class="wrap split news-block">
        <div class="news-side">${label(t("Recent"))}</div>
        <ul class="newslist">${recentList}</ul>
      </div>
      ${start}
    </section>`;
}

// The pledges as die-cut stickers in six columns. The wall is decoration; the
// caption above it says what it shows in words.
function wallSection(h) {
  const aspects = h.state.goals.map(g => goalTemplate(g.templateId)?.aspect).filter(a => a && chapterOf(a));
  if (!aspects.length) return "";
  const sticker = (aspect, n) => {
    if (n % STAR_STICKER_EVERY === STAR_STICKER_EVERY - 1) {
      return `<i class="sticker sticker-star"><svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg></i>`;
    }
    return `<i class="sticker" style="--hue: ${chapterOf(aspect).hue};">${motifIcon(aspect)}</i>`;
  };
  const cols = Array.from({ length: WALL_COLUMNS }, (_, c) =>
    `<div class="wall-col">${Array.from({ length: WALL_ROWS }, (_, k) => sticker(aspects[(c + k) % aspects.length], c + k)).join("")}</div>`
  ).join("");
  return `
    <section class="panel home-pledges"><div class="wrap split">
      ${label(t("Your pledges"))}
      <p class="pledge-count">${escapeHtml(tp("{n} active this week", { n: h.state.goals.length }))} <a class="pill pill-light" href="#/quests">${escapeHtml(t("Goals"))}</a></p>
    </div></section>
    <section class="wall" aria-hidden="true">${cols}</section>`;
}

function deeperSection(h) {
  const total = ASPECT_KEYS.length;
  if (h.deepDone >= total) return "";
  return `
    <section class="panel statement deep-offer"><div class="wrap split">
      ${label(t("Go deeper"))}
      <div>
        <p><strong>${t("Go deeper for more accurate scores.")}</strong> ${t("An optional in-depth assessment uses the full-length validated questionnaires to sharpen your estimates and tighten each percentile band.")}</p>
        ${h.deepDone > 0 ? `<p class="deep-progress">${tp("In-depth sections completed: {done}/{total}", { done: h.deepDone, total })}</p>` : ""}
        <p><a href="#/deep" class="pill">${h.deepDone > 0 ? t("Continue in-depth") : t("Start in-depth assessment")}</a></p>
      </div>
    </div></section>`;
}

function checkinSection(h) {
  const head = h.reviewDue
    ? [t("A few questions,"), t("and your star moves.")]
    : [t("Done for this week."), tp("The next one opens {date}.", { date: nextReviewDate() })];
  return `
    <section class="panel careers"><div class="wrap split">
      ${label(t("This week's check-in"))}
      <div class="careers-row">
        <p class="careers-head">${escapeHtml(head[0])}<br>${escapeHtml(head[1])}</p>
        <a class="pill" href="#/review">${escapeHtml(h.reviewDue ? t("Start check-in") : t("Weekly Review"))}</a>
      </div>
    </div></section>`;
}

export function homeMarkup(h) {
  const strong = chapterOf(h.strongest)?.region || "";
  const weak = chapterOf(h.weakest?.aspect)?.region || "";
  return `
    <div class="stage-page home">
      ${noticeSection(h)}
      ${heroMarkup({
        mark: yourStarSvg(h.scores),
        word: "YOUR STAR",
        inc: String(h.index),
        srTitle: tp("Your star — Balance Index {n}", { n: h.index }),
        tapLabel: t("Play with your star")
      })}
      ${missionMarkup(t("This week"), [tp("Strongest in {strong}.", { strong }), tp("{weak} is asking for more.", { weak })])}
      ${youSection(h)}
      ${todoSection(h)}
      ${aspectsSection(h)}
      ${bandMarkup(BAND_REGIONS)}
      ${newsSection(h)}
      ${wallSection(h)}
      ${deeperSection(h)}
      ${checkinSection(h)}
    </div>`;
}

// The wall's columns drift with the scroll, alternate ones up and down. Tied
// to the scroll rather than a clock, so nothing moves while the reader is
// still (WCAG 2.2.2) and there is no loop to leave running.
function mountWall(root, scope) {
  const wall = root.querySelector(".wall");
  if (!wall) return;
  const cols = [...wall.querySelectorAll(".wall-col")];
  const frame = () => {
    const b = wall.getBoundingClientRect();
    const u = Math.max(-1, Math.min(1, (innerHeight / 2 - (b.top + b.height / 2)) / innerHeight));
    const px = wall.clientWidth / DESKTOP_REF;
    cols.forEach((col, i) => {
      const y = (i % 2 ? 1 : -1) * u * WALL_DRIFT * px;
      writeMotionStyle(col, { transform: `translateY(${y.toFixed(1)}px)` });
    });
  };
  onAbort(scope.signal, () => cols.forEach(col => writeMotionStyle(col, { transform: "" })));
  scope.listen(window, "scroll", frame, { passive: true });
  scope.listen(window, "resize", frame, { passive: true });
  frame();
}

export function renderDashboard(containerId, state, onExportBackup) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const h = readHome(state);
  // Beside the care notice nothing moves: the notice never does, and a page
  // bursting with stars around it would be the wrong tone.
  const scope = renderStagePage(container, () => homeMarkup(h), { still: !!h.careNotice });
  if (scope) {
    try {
      mountWall(container, scope);
    } catch (err) {
      console.error("Home wall motion failed:", err);
    }
  }

  // Removing the row rather than re-rendering: the flag is persisted either
  // way, and a full re-render would scroll the reader back to the top as a
  // reward for declining a question.
  document.getElementById("birthday-prompt-dismiss")?.addEventListener("click", (e) => {
    stateManager.dismissBirthdayPrompt();
    const row = e.target.closest(".todo");
    const list = row?.parentElement;
    row?.remove();
    if (list && !list.children.length) list.closest(".home-todo")?.remove();
  });

  if (h.needsBackup && typeof onExportBackup === "function") {
    document.getElementById("backup-nudge-export")?.addEventListener("click", onExportBackup);
  }

  // The share card is handed the readings this render already computed, so it
  // cannot disagree with the page behind it. A bottom-decile mental grade adds
  // one informational line to the sheet; it never blocks the share.
  document.getElementById("btn-share-radar")?.addEventListener("click", () => {
    openShareSheet({
      name: h.profile.name,
      date: new Date(),
      aspects: state.aspects,
      average: AVERAGE_ASPECT_SCORES,
      index: h.index,
      bandLabel: h.band.label,
      standing: h.standing,
      grades: h.grades
    }, { showMentalNote: isBottomGrade(h.grades.mental) });
  });
}
