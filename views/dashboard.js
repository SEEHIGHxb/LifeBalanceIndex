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
// Beside the care notice the page is calm: nothing types and the wall does
// not drift (the old ceremony's quiet rule), but your star still warps to its
// own page and back (v140).

import { stateManager } from "../state.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { starOutline, starRay } from "../chart.js";
import { getAllBenchmarks, collectSources } from "../benchmarks.js";
import { ASPECT_KEYS, isAspectDeepVerified } from "../aspects.js";
import { getTopSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { characterFor } from "../characters.js";
import {
  balanceIndex, weakestAspect, gradeAllAspects, isBottomGrade, relativeToPopulation
} from "../grades.js";
import { goalTemplate } from "../goals.js";
import { openShareSheet } from "./share.js";
import { shapeFigure, shapeSwitchMarkup, bindShapeSwitch, adoptShape, readShapeView } from "./shape.js";
import { CHAPTERS } from "./journey.js";
import { SPRITES, onAbort } from "./stage.js";
import {
  chapterOf, aspectName, dotDate, shiftSummary, motifThumb, starThumb, newsRow
} from "./news.js";
import { label, renderStagePage } from "./stage-page.js";
import { markZoom, takeZoom, zoomFrom } from "./star-zoom.js";
import { writeMotionStyle } from "./motion-mount.js";
import { nextReviewDate } from "./review.js";
import { t, tp } from "../i18n.js";
import {
  escapeHtml, aspectLabel, estimatedAspects, mentalHealthNotice, isCareNoticeClosed, closeCareNotice,
  footnoteRef, footnoteList, bindFootnotes, CHECKIN_ASPECTS
} from "./helpers.js";

const RECENT_ROWS = 5;
// The night sky under the pledges (v127, the owner chose it over the sticker
// wall): six drifting columns of stars, three each. Where each star sits in
// its column, as [left %, top %, size in prototype px]; fixed, not random, so
// the sky is the same on every visit and in the tests.
const SKY = [
  [[22, 18, 46], [70, 52, 22], [34, 84, 30]],
  [[64, 10, 26], [26, 44, 54], [72, 78, 20]],
  [[40, 24, 20], [78, 58, 38], [18, 88, 26]],
  [[70, 16, 34], [30, 50, 22], [62, 82, 50]],
  [[28, 12, 24], [66, 40, 48], [36, 76, 20]],
  [[58, 22, 50], [22, 60, 26], [74, 90, 22]]
];
const SKY_STARS = SKY.flat().length;
// How far a wall column drifts across the wall's pass through the screen, in
// prototype px (1/2545 of the page's width). Kept under the columns' head
// start above the strip (.wall-col's margin in css/home.css).
const WALL_DRIFT = 120;
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
export function readHome(state) {
  const p = state.profile;
  const benchmarks = getAllBenchmarks(state);
  const index = balanceIndex(state.aspects);
  const rel = (k) => relativeToPopulation(state.aspects[k], AVERAGE_ASPECT_SCORES[k]);
  return {
    state,
    profile: p,
    careNotice: isCareNoticeClosed() ? null : getMentalHealthNotice(state),
    benchmarks,
    sources: collectSources(benchmarks),
    // state.aspects is passed because finance grades off its composite score,
    // not off its income percentile (see gradeForFinance).
    grades: gradeAllAspects(benchmarks, state.aspects),
    index,
    weakest: weakestAspect(state.aspects),
    // Measured the same way as the weakest: against the population average.
    strongest: ASPECT_KEYS.reduce((a, b) => (rel(b) > rel(a) ? b : a)),
    // Scored from default answers so far: marked † and explained in the notes.
    estimated: estimatedAspects(state),
    scores: CHAPTERS.map(c => state.aspects[c.aspect]),
    // Star, radar or asterism (views/shape.js): the reader's last choice.
    view: readShapeView(),
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
  return `<section class="panel notice-panel"><div class="wrap">${mentalHealthNotice(h.careNotice, { closable: true })}</div></section>`;
}

// Your star beside what it adds up to: the Balance Index, where you are
// strongest and what asks for more, then your name and level. How the index
// is worked out is note 1 (v141, the owner: a first-time reader gets the
// number and the plain reading, the method is one tap away). The star is a
// link to its own page (views/star-page.js), which it zooms into.
function topSection(h) {
  const p = h.profile;
  const strong = chapterOf(h.strongest)?.region || "";
  const weak = chapterOf(h.weakest?.aspect)?.region || "";
  return `
    <section class="panel home-top">
      <div class="wrap home-top-grid">
        <h2 class="sr-only">${escapeHtml(tp("Your star — Balance Index {n}", { n: h.index }))}</h2>
        <div class="home-star-col">
          <div class="home-star">
            <div class="home-star-mark">${shapeFigure({ view: h.view, you: h.scores })}</div>
            <a class="star-hit" href="#/star" aria-label="${escapeHtml(t("Open your star"))}"></a>
          </div>
          ${shapeSwitchMarkup(h.view)}
        </div>
        <div class="home-reading">
          <div class="balance-index">
            <div class="balance-index-figure">
              <span class="balance-index-value">${escapeHtml(h.index)}</span>
              <span class="balance-index-max">/100</span>
            </div>
            <p class="balance-index-title">${t("Balance Index")}${footnoteRef("index", "1")}</p>
          </div>
          <p class="home-headline">${escapeHtml(tp("Strongest in {strong}.", { strong }))} ${escapeHtml(tp("{weak} is asking for more.", { weak }))}</p>
          <div class="home-identity">
            <p class="home-facts"><strong class="home-name">${escapeHtml(p.name)}</strong> · ${t("Lv.")}${escapeHtml(p.level)}</p>
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
      body: t("About two minutes."),
      actions: `<a href="#/review" class="pill">${t("Start Weekly Review")}</a>`
    }));
  }
  if (h.checkinDue) {
    rows.push(todoRow({
      title: t("Monthly re-assessment due."),
      body: t("A few short questions, once a month."),
      actions: `<a href="#/checkin" class="pill">${t("Start Re-assessment")}</a>`
    }));
  }
  if (h.needsBackup) {
    rows.push(todoRow({
      title: t("Back up your data."),
      body: h.daysSinceExport === null
        ? t("Your data lives only in this browser.")
        : tp("Last backup {days} days ago.", { days: h.daysSinceExport }),
      actions: `<button type="button" id="backup-nudge-export" class="pill">${t("Export")}</button>`
    }));
  }
  if (h.askBirthday) {
    rows.push(todoRow({
      title: t("When does your year turn?"),
      body: t("Month and day only."),
      actions: `<a href="#/year" class="pill">${t("Answer")}</a>
                <button type="button" id="birthday-prompt-dismiss" class="pill pill-light">${t("Not now")}</button>`
    }));
  }
  // A quick-start save's estimated scores are marked † on their rows instead.
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
// the population average ticked, and your character there. The standing, the
// band and the grade are on the aspect page the row opens (v141, the owner:
// Overview keeps to what reads at a glance).
function aspectRow(h, chapter, i) {
  const key = chapter.aspect;
  const score = h.scores[i];
  const avg = AVERAGE_ASPECT_SCORES[key];
  // A score from default answers is marked; the notes say what that means.
  // A plain mark, not a footnote link: the whole row is already a link.
  const estimate = h.estimated.includes(key)
    ? `<span class="ar-est" aria-hidden="true">†</span><span class="sr-only"> (${escapeHtml(t("estimate"))})</span>`
    : "";
  // Your character here (characters.js).
  const who = characterFor(h.state, key);
  return `
    <li><a class="aspect-row" href="#/aspect/${key}" aria-label="${escapeHtml(tp("Open {aspect} details", { aspect: aspectName(key) }))}" style="--hue: ${chapter.hue}; --wash: ${chapter.wash};">
      <span class="ar-emblem"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></span>
      <span class="ar-name"><b>${escapeHtml(chapter.region)}</b><small>${escapeHtml(aspectName(key))}</small></span>
      <span class="ar-score">${escapeHtml(score)}${estimate}</span>
      <span class="ar-meter"><span class="meter" aria-hidden="true"><i style="width: ${Number(score) || 0}%;"></i><em style="left: ${Number(avg) || 0}%;"></em></span></span>
      <span class="ar-character">${who ? escapeHtml(who.name) : ""}</span>
    </a></li>`;
}

// The in-depth offer, one line under the scores while it is unfinished.
function deepOffer(h) {
  if (h.deepDone >= ASPECT_KEYS.length) return "";
  return `
    <div class="todo deep-offer">
      <p class="todo-text"><strong class="todo-title">${t("Want sharper scores?")}</strong></p>
      <span class="todo-actions"><a href="#/deep" class="pill pill-light">${h.deepDone > 0 ? t("Continue in-depth") : t("Start in-depth assessment")}</a></span>
    </div>`;
}

// Under the rows, one line saying what the tick is, and what † is when a
// score carries it; each leads to its note.
function aspectsKey(h) {
  const tick = `<span>${t("The tick on each bar is the average.")}${footnoteRef("average", "2")}</span>`;
  const est = h.estimated.length
    ? ` <span>${t("† An estimate for now.")}${footnoteRef("estimate", "†")}</span>`
    : "";
  return `<p class="aspects-key">${tick}${est}</p>`;
}

function aspectsSection(h) {
  return `
    <section class="panel home-aspects"><div class="wrap split">
      ${label(t("Your eight aspects"))}
      <div>
        <ul class="aspect-rows">${CHAPTERS.map((c, i) => aspectRow(h, c, i)).join("")}</ul>
        ${aspectsKey(h)}
        ${deepOffer(h)}
      </div>
    </div></section>`;
}

// Notes and sources, last on the page (v141): the method and the sources the
// page no longer spells out beside the numbers. Note 1 keeps the promise that
// every surface showing the Balance Index says it is the app's own figure.
function notesSection(h) {
  const canDeepen = h.estimated.some(k => CHECKIN_ASPECTS.includes(k));
  const sources = `<ul class="fn-sources">${h.sources.map(src => `<li><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}</ul>`;
  const notes = [
    { id: "index", mark: "1", body: `<p>${t("A harmonic mean of how your eight aspects compare with the population — 50 is the average person, and it rises fastest when your weakest aspect rises. This is this app's own summary figure, not a published measure.")}</p>` },
    { id: "average", mark: "2", body: `<p>${t("Each average is the score of a reference person built from published population statistics and scored the same way as you. Where no statistic exists, a reasonable default stands in.")}</p>${sources}` }
  ];
  if (h.estimated.length) {
    notes.push({
      id: "estimate",
      mark: "†",
      body: `<p>${tp("These are scored from default answers: {aspects}. Re-run your assessment or submit a Weekly Review to confirm them.", { aspects: h.estimated.map(aspectLabel).join(", ") })}${canDeepen ? ` <a href="#/checkin">${t("Deepen my survey scores")}</a>` : ""}</p>`
    });
  }
  return `
    <section class="panel statement home-notes"><div class="wrap split">
      ${label(t("Notes and sources"))}
      ${footnoteList(notes)}
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
      <div class="news-side">${label(t("Where to start"))}</div>
      <ul class="newslist">${h.suggestions.map(s => newsRow({
        kind: s.aspectLabel, thumb: thumbFor(s.aspect, h), title: s.title,
        sub: s.text, href: `#/aspect/${s.aspect}`
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

// Which of the sky's star slots are lit: one per pledge kept at the last
// weekly review, spread across the columns rather than bunched at the start.
export function litSkySlots(kept) {
  const n = Math.max(0, Math.min(SKY_STARS, kept));
  return new Set(Array.from({ length: n }, (_, i) => Math.floor(((i + 0.5) * SKY_STARS) / n)));
}

// The pledges as a night sky: a dark band the cards sit on, with a gilt star
// lit for each pledge kept and the rest drawn dim. It is decoration; the
// caption above it says what it shows in words.
function wallSection(h) {
  const goals = h.state.goals.filter(g => goalTemplate(g.templateId));
  if (!goals.length) return "";
  const reviewed = goals.some(g => g.lastResult);
  const kept = goals.filter(g => g.lastResult?.met).length;
  const lit = litSkySlots(kept);
  const star = ([x, y, size], n) => lit.has(n)
    ? `<i class="sky-star is-lit" style="left: ${x}%; top: ${y}%; --s: ${size};"><svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg></i>`
    : `<i class="sky-star" style="left: ${x}%; top: ${y}%; --s: ${Math.round(size * 0.6)};"><svg viewBox="0 0 24 24"><use href="${SPRITES}#star-line"/></svg></i>`;
  const cols = SKY.map((col, c) => `<div class="wall-col">${col.map((p, k) => star(p, c * col.length + k)).join("")}</div>`).join("");
  const keptLine = reviewed ? ` · ${escapeHtml(tp("{kept} kept at your last review", { kept }))}` : "";
  return `
    <section class="panel home-pledges"><div class="wrap split">
      ${label(t("Your pledges"))}
      <p class="pledge-count"><span>${escapeHtml(tp("{n} active this week", { n: goals.length }))}${keptLine}</span> <a class="pill pill-light" href="#/quests">${escapeHtml(t("Goals"))}</a></p>
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
      ${notesSection(h)}
    </div>`;
}

// A tap on your star notes where it sits, for its page to zoom out of; back
// from that page, the star shrinks home into its place here.
function mountStar(root, scope, from) {
  const mark = root.querySelector(".home-top .home-star-mark");
  const hit = root.querySelector(".home-top .star-hit");
  if (!mark || !hit) return;
  scope.listen(hit, "click", () => markZoom(mark));
  zoomFrom(mark, from, scope);
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
  // Taken before the page draws, so a still page drops it too.
  const zoom = takeZoom();
  // Beside the care notice the page itself stays calm (the notice never
  // moves, and no text types or wall drifts around it), but your star still
  // flies to and from its page (the owner, 2026-09-29: "Full warp always").
  const calm = !!h.careNotice;
  const scope = renderStagePage(container, () => homeMarkup(h), { calm });
  // The switch works on a still page too; there it redraws without moving.
  adoptShape(container.querySelector(".home-star-mark svg.shape"), { view: h.view, you: h.scores });
  bindShapeSwitch(container, scope);
  bindFootnotes(container);
  if (scope) {
    try {
      mountStar(container, scope, zoom);
      if (!calm) mountWall(container, scope);
    } catch (err) {
      console.error("Home motion failed:", err);
    }
  }

  // Closed for this visit; removed in place so the reader keeps their scroll.
  document.getElementById("care-banner-close")?.addEventListener("click", (e) => {
    closeCareNotice();
    e.target.closest(".notice-panel")?.remove();
  });

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
export function shareStar(h) {
  openShareSheet({
    name: h.profile.name,
    date: new Date(),
    aspects: h.state.aspects,
    index: h.index,
    shape: readShapeView(),
    labels: regionLabels(h.state)
  }, { showMentalNote: isBottomGrade(h.grades.mental) });
}

// Each region's name and your character there (null where a side is still
// unanswered), for the labels on your star's page and on the card.
export function regionLabels(state) {
  return Object.fromEntries(CHAPTERS.map(c => [c.aspect, {
    region: c.region,
    hue: c.hue,
    character: characterFor(state, c.aspect)?.name || null
  }]));
}

// The same card from another page (Side by Side), read the way Home reads it.
export const openShareFor = (state) => shareStar(readHome(state));
