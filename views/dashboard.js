// views/dashboard.js - Home. First built as the redesign's full-screen stage
// (R3, 2026-09-25); made compact on 2026-09-26 with the map the owner approved
// then, because a page you open every week should read at a glance.
//
// Top to bottom:
//   notice      the duty-of-care notice, only past the screening cutoff; still
//   top         your star beside the Balance Index, its band and standing,
//               your strongest region and the one asking for more, then your
//               name, level and points
//   to do       everything to act on, most urgent first, the in-depth offer
//               while it is unfinished, and when the next review opens
//   aspects     one row per region: score against the average, standing,
//               grade; each opens its aspect page
//   start       the recommendations
//   recent      reviews, re-assessments and the journey, newest first
//   pledges     your active pledges as stickers
//
// Beside the care notice the whole page is still: the star does not burst
// and the wall does not drift (the old ceremony's quiet rule, kept).

import { stateManager } from "../state.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { starOutline, starRay } from "../chart.js";
import { getAllBenchmarks, collectSources } from "../benchmarks.js";
import { getAspectConfidence, ASPECT_KEYS, isAspectDeepVerified } from "../aspects.js";
import { getTopSuggestions, getMentalHealthNotice } from "../suggestions.js";
import {
  balanceIndex, balanceBand, weakestAspect, gradeAllAspects, aspectsAtOrAboveAverage,
  isBottomGrade, relativeToPopulation
} from "../grades.js";
import { goalTemplate } from "../goals.js";
import { seasonPace } from "../season.js";
import { openShareSheet } from "./share.js";
import { CHAPTERS } from "./journey.js";
import { SPRITES, onAbort, burst } from "./stage.js";
import {
  chapterOf, aspectName, dotDate, shiftSummary, motifIcon, motifThumb, starThumb, newsRow
} from "./news.js";
import { EVERY_MOTIF, label, renderStagePage } from "./stage-page.js";
import { writeMotionStyle } from "./motion-mount.js";
import { nextReviewDate } from "./review.js";
import { t, tp } from "../i18n.js";
import {
  escapeHtml, aspectLabel, confidenceBadge, benchmarkStanding, estimatedAspects,
  mentalHealthNotice, gradeBadge, balanceIndexBlock, CHECKIN_ASPECTS
} from "./helpers.js";

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
// The symmetric star (chart.js starOutline/starRay) in a 100x100 box: the
// outline in the gilt star's line, each ray filled in gold to its score over
// a pale ground. Rays follow CHAPTERS order, which is RADAR_KEYS order.
const STAR_R = 47;
export const STAR_INK = { ground: "#FBF3E2", fill: "#E2B866", line: "#A88752" };
const attr = (pts) => pts.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

export const starOutlineAttr = () => attr(starOutline(50, 50, STAR_R));
export const starRayAttr = (i, score, half = "both") => attr(starRay(i, score, 50, 50, STAR_R, half));

// Each ray's fill level as an open chevron (valley, tip, valley): Side by
// Side dashes the population average this way.
export function starLevelPath(scores) {
  return scores.map((s, i) => {
    const [, a, tip, b] = starRay(i, s, 50, 50, STAR_R);
    return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${tip.x.toFixed(2)} ${tip.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }).join("");
}

export function yourStarSvg(scores) {
  const outline = starOutlineAttr();
  const rays = scores.map((s, i) => `<polygon points="${starRayAttr(i, s)}"/>`).join("");
  return `<svg viewBox="0 0 100 100" aria-hidden="true">` +
    `<polygon points="${outline}" fill="${STAR_INK.ground}"/>` +
    `<g class="star-rays" fill="${STAR_INK.fill}">${rays}</g>` +
    `<polygon points="${outline}" fill="none" stroke="${STAR_INK.line}" stroke-width="2.8" stroke-linejoin="round"/>` +
    `<circle cx="50" cy="50" r="6" fill="#FBF8F1" stroke="#6F7D64" stroke-width="2.4"/></svg>`;
}

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

// Your star beside what it adds up to: the Balance Index and its band, where
// you are strongest and what asks for more, then who you are this year. The
// star is a button: a tap bursts it (beside the care notice it stays still).
function topSection(h) {
  const p = h.profile;
  const strong = chapterOf(h.strongest)?.region || "";
  const weak = chapterOf(h.weakest?.aspect)?.region || "";
  const points = h.pace.ratio === null
    ? tp("{xp} points this year", { xp: escapeHtml(h.pace.earned) })
    : tp("Points: {xp} / {possible}", { xp: escapeHtml(h.pace.earned), possible: h.pace.possible });
  return `
    <section class="panel home-top">
      <div class="burst-layer" aria-hidden="true"></div>
      <div class="wrap home-top-grid">
        <h2 class="sr-only">${escapeHtml(tp("Your star — Balance Index {n}", { n: h.index }))}</h2>
        <div class="home-star">
          <div class="home-star-mark">${yourStarSvg(h.scores)}</div>
          <button class="star-hit" type="button" aria-label="${escapeHtml(t("Play with your star"))}"></button>
        </div>
        <div class="home-reading">
          ${balanceIndexBlock(h.index, h.band, h.weakest, h.standing)}
          <p class="home-headline">${escapeHtml(tp("Strongest in {strong}.", { strong }))} ${escapeHtml(tp("{weak} is asking for more.", { weak }))}</p>
          <div class="home-identity">
            <p class="home-facts"><strong class="home-name">${escapeHtml(p.name)}</strong> · ${escapeHtml(t(p.employment))} (${escapeHtml(t(p.region))}) · ${t("Lv.")}${escapeHtml(p.level)} · ${points}</p>
            <p class="level-note">${t("Your level is your age, not points earned")}</p>
            <p class="home-links">
              <a class="pill" href="#/year">${escapeHtml(t("Your year"))}</a>
              <button type="button" id="btn-share-radar" class="pill pill-light">${escapeHtml(t("Share your star"))}</button>
            </p>
          </div>
        </div>
      </div>
    </section>`;
}

// One thing to do: a headline, why, and the controls that do it.
function todoRow({ title, body, actions, cls = "" }) {
  return `
    <li class="todo${cls ? ` ${cls}` : ""}">
      <p class="todo-text"><strong class="todo-title">${title}</strong> <span class="todo-body">${body}</span></p>
      ${actions ? `<span class="todo-actions">${actions}</span>` : ""}
    </li>`;
}

// Everything to act on, most urgent first: the weekly review is the app's
// loop, a due re-assessment is stale scores, and an un-backed-up browser is
// the only one that can lose data. Once the week's review is done the list
// ends by saying when the next one opens, so it is never empty. The in-depth
// offer is not here: it argues for more accurate scores, so it sits under
// them (tests/layout.test.mjs).
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
  if (!h.reviewDue) {
    rows.push(todoRow({
      cls: "todo-done",
      title: t("Done for this week."),
      body: escapeHtml(tp("The next one opens {date}.", { date: nextReviewDate() })),
      actions: ""
    }));
  }
  return `
    <section class="panel statement home-todo"><div class="wrap split">
      ${label(t("To do"))}
      <ul class="todo-list">${rows.join("")}</ul>
    </div></section>`;
}

// One aspect as a row: its emblem, region and aspect, the score on a bar with
// the population average ticked, the standing, and the grade. The row opens
// the aspect page, which keeps the full card.
function aspectRow(h, chapter, i) {
  const key = chapter.aspect;
  const score = h.scores[i];
  const avg = AVERAGE_ASPECT_SCORES[key];
  const b = h.benchmarks[key];
  return `
    <li><a class="aspect-row" href="#/aspect/${key}" aria-label="${escapeHtml(tp("Open {aspect} details", { aspect: aspectName(key) }))}" style="--hue: ${chapter.hue}; --wash: ${chapter.wash};">
      <span class="ar-emblem"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></span>
      <span class="ar-name"><b>${escapeHtml(chapter.region)}</b><small>${escapeHtml(aspectName(key))}</small></span>
      <span class="ar-score">${escapeHtml(score)}</span>
      <span class="ar-meter">
        <span class="meter" aria-hidden="true"><i style="width: ${Number(score) || 0}%;"></i><em style="left: ${Number(avg) || 0}%;"></em></span>
        <small class="score-average">${escapeHtml(tp("Average {n}", { n: avg }))}</small>
      </span>
      <span class="ar-standing">${b ? benchmarkStanding(b, { compact: true }) : ""}</span>
      <span class="ar-badges">
        ${gradeBadge(h.grades[key], b && !h.grades[key] ? b.unranked : null)}
        ${confidenceBadge(getAspectConfidence(h.state, key))}
      </span>
    </a></li>`;
}

// The in-depth offer, one row under the scores while it is unfinished.
function deepOffer(h) {
  const total = ASPECT_KEYS.length;
  if (h.deepDone >= total) return "";
  const progress = h.deepDone > 0
    ? ` <span class="deep-progress">${tp("In-depth sections completed: {done}/{total}", { done: h.deepDone, total })}</span>`
    : "";
  return `
    <div class="todo deep-offer">
      <p class="todo-text"><strong class="todo-title">${t("Go deeper for more accurate scores.")}</strong> <span class="todo-body">${t("An optional in-depth assessment uses the full-length validated questionnaires to sharpen your estimates and tighten each percentile band.")}${progress}</span></p>
      <span class="todo-actions"><a href="#/deep" class="pill pill-light">${h.deepDone > 0 ? t("Continue in-depth") : t("Start in-depth assessment")}</a></span>
    </div>`;
}

function aspectsSection(h) {
  const estimated = estimatedAspects(h.state);
  const canDeepen = estimated.some(k => CHECKIN_ASPECTS.includes(k));
  const estimateNote = estimated.length === 0 ? "" : `
    <p class="home-note completeness-note"><strong>${t("Some scores are estimates.")}</strong> ${tp("These are scored from default answers: {aspects}. Re-run your assessment or submit a Weekly Review to confirm them.", { aspects: estimated.map(aspectLabel).join(", ") })}${canDeepen ? ` <a href="#/checkin">${t("Deepen my survey scores")}</a>` : ""}</p>`;
  return `
    <section class="panel home-aspects"><div class="wrap split">
      ${label(t("Your eight aspects"))}
      <div>
        <ul class="aspect-rows">${CHAPTERS.map((c, i) => aspectRow(h, c, i)).join("")}</ul>
        ${estimateNote}
        ${deepOffer(h)}
        <details class="home-sources">
          <summary>${t("Benchmark sources & methodology")}</summary>
          <p>${t('Percentiles compare your baseline answers with published population statistics — they are honest approximations, not exact ranks. "Estimate" marks curves calibrated to a published anchor point.')}</p>
          <ul>
            ${h.sources.map(src => `<li><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}
          </ul>
        </details>
      </div>
    </div></section>`;
}

// A record's thumbnail: the region it moved most, or your star.
const thumbFor = (aspect, h) => (aspect && chapterOf(aspect) ? motifThumb(aspect) : starThumb(yourStarSvg(h.scores)));

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

// Where to start, then what happened recently: two compact lists.
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
    <section class="panel news home-news">
      ${start}
      <div class="wrap split news-block">
        <div class="news-side">${label(t("Recent"))}</div>
        <ul class="newslist">${recentList}</ul>
      </div>
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

export function homeMarkup(h) {
  return `
    <div class="stage-page home">
      ${noticeSection(h)}
      ${topSection(h)}
      ${todoSection(h)}
      ${aspectsSection(h)}
      ${newsSection(h)}
      ${wallSection(h)}
    </div>`;
}

// A tap on your star bursts the eight regions' motifs out of it.
function mountStar(root, scope) {
  const hit = root.querySelector(".home-top .star-hit");
  if (!hit) return;
  const layer = root.querySelector(".home-top .burst-layer");
  const mark = root.querySelector(".home-top .home-star-mark");
  scope.listen(hit, "click", () => burst(layer, mark, { motifs: EVERY_MOTIF, signal: scope.signal })
    .catch(err => console.error("Home star burst failed:", err)));
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
      mountStar(container, scope);
      mountWall(container, scope);
    } catch (err) {
      console.error("Home motion failed:", err);
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

  document.getElementById("btn-share-radar")?.addEventListener("click", () => shareStar(h));
}

// The share card is handed the readings this render already computed, so it
// cannot disagree with the page behind it. A bottom-decile mental grade adds
// one informational line to the sheet; it never blocks the share.
function shareStar(h) {
  openShareSheet({
    name: h.profile.name,
    date: new Date(),
    aspects: h.state.aspects,
    average: AVERAGE_ASPECT_SCORES,
    index: h.index,
    bandLabel: h.band.label,
    standing: h.standing,
    grades: h.grades
  }, { showMentalNote: isBottomGrade(h.grades.mental) });
}

// The same card from another page (Side by Side), read the way Home reads it.
export const openShareFor = (state) => shareStar(readHome(state));
