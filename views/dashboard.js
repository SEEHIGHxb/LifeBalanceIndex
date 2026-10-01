// views/dashboard.js - Home. First built as the redesign's full-screen stage
// (R3, 2026-09-25); made compact on 2026-09-26 with the map the owner approved
// then, because a page you open every week should read at a glance.
//
// Since v157 (the owner, 2026-10-01) the page's job is to show the effort you
// have put in, so it feels like a reward, and then invite you to explore. What
// is due is a dot on the Weekly Review link (app.js), your level and year are
// on Profile, and your recent records are on Your year.
//
// Top to bottom:
//   notice      the duty-of-care notice, only past the screening cutoff; still
//   top         your star beside the Balance Index, the view switch and share
//               under the star, your strongest region and the one asking for more
//   effort      what you have done: regions explored, questions answered,
//               weekly reviews, pledges kept
//   aspects     one row per region: score against the average, your
//               character; each opens its aspect page; the in-depth offer
//   start       the recommendations
//   pledges     your active pledges over the night sky
//
// Beside the care notice the page is calm: nothing types, counts or drifts
// (the old ceremony's quiet rule), but your star still warps to its own page
// and back (v140).

import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { INSTRUMENTS, deepAskIndices } from "../surveys.js";
import { animate, easeStar } from "../motion.js";
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
import { chapterOf, aspectName, motifThumb, starThumb } from "./news.js";
import { label, renderStagePage } from "./stage-page.js";
import { markZoom, takeZoom, zoomFrom } from "./star-zoom.js";
import { writeMotionStyle, onRouteEnd } from "./motion-mount.js";
import { tightenLoneWords } from "./lone-words.js";
import { t, tp } from "../i18n.js";
import {
  escapeHtml, aspectLabel, estimatedAspects, mentalHealthNotice, isCareNoticeClosed, closeCareNotice,
  footnoteRef, footnoteList, bindFootnotes, sourceList, CHECKIN_ASPECTS
} from "./helpers.js";

// The effort row counts up once as the page opens, unless the page is calm.
const COUNT_MS = 900;
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

// --- your effort ------------------------------------------------------------
// What the reader has done, counted from what the app already keeps: regions
// answered rather than left at defaults, every question asked of them (the
// journey's questionnaires, each re-assessment, the in-depth items actually
// asked), weekly reviews, and pledges kept at them.
export function effortCounts(state, estimated = estimatedAspects(state)) {
  const b = state.baseline || {};
  const size = (key) => INSTRUMENTS[key]?.items.length || 0;
  // An older save carries no coverage flags: its questionnaires were answered whole.
  const answered = b.answered || Object.fromEntries(Object.keys(INSTRUMENTS).filter(k => Number.isFinite(b[k])).map(k => [k, true]));
  const journey = Object.keys(INSTRUMENTS).filter(k => answered[k] === true).reduce((n, k) => n + size(k), 0);
  const checkins = (state.checkins || []).reduce((n, c) =>
    n + Object.entries(c.sums || {}).filter(([, v]) => v !== null && v !== undefined).reduce((m, [k]) => m + size(k), 0), 0);
  const deep = Object.keys(b.deepAnswered || {}).filter(k => b.deepAnswered[k])
    .reduce((n, k) => { try { return n + deepAskIndices(k, b).length; } catch { return n; } }, 0);
  const reviews = state.reviews || [];
  return {
    regions: state.baseline ? Math.max(0, CHAPTERS.length - estimated.length) : 0,
    questions: journey + checkins + deep,
    reviews: reviews.length,
    kept: reviews.reduce((n, r) => n + (r.goals || []).filter(g => g.met).length, 0)
  };
}

// --- the reading ------------------------------------------------------------
// Everything the page says, computed once, so the markup and the share card
// cannot disagree.
export function readHome(state) {
  const p = state.profile;
  const benchmarks = getAllBenchmarks(state);
  const index = balanceIndex(state.aspects);
  const rel = (k) => relativeToPopulation(state.aspects[k], AVERAGE_ASPECT_SCORES[k]);
  const estimated = estimatedAspects(state);
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
    estimated,
    effort: effortCounts(state, estimated),
    scores: CHAPTERS.map(c => state.aspects[c.aspect]),
    // Star, radar or asterism (views/shape.js): the reader's last choice.
    view: readShapeView(),
    suggestions: getTopSuggestions(state, 3),
    deepDone: ASPECT_KEYS.filter(k => isAspectDeepVerified(state, k)).length
  };
}

// --- sections ---------------------------------------------------------------

function noticeSection(h) {
  if (!h.careNotice) return "";
  return `<section class="panel notice-panel"><div class="wrap">${mentalHealthNotice(h.careNotice, { closable: true })}</div></section>`;
}

// Sharing is this icon (Android's share mark) beside the view switch; the
// words stay as its accessible name (css/home.css).
const SHARE_ICON = `<svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4"/></g></svg>`;

// The two regions the headline names, as chips that open their pages (v164:
// on a laptop they fill the room beside the star; a phone hides them).
function regionChips(keys) {
  const chips = [...new Set(keys)].map(chapterOf).filter(Boolean).map(c => `
    <a class="region-chip" href="#/aspect/${c.aspect}" style="--hue: ${c.hue}; --wash: ${c.wash};">
      <img src="./assets/emblems/${c.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"><span>${escapeHtml(c.region)}</span>
    </a>`).join("");
  return chips ? `<p class="home-regions">${chips}</p>` : "";
}

// Your star beside what it adds up to: the Balance Index, then where you are
// strongest and what asks for more. Under the star, the view switch and
// share (v157). How the index is worked out is note 1 (v141, the owner: a
// first-time reader gets the number and the plain reading, the method is one
// tap away). The star is a link to its own page (views/star-page.js), which
// it zooms into.
function topSection(h) {
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
          <div class="home-tools">
            ${shapeSwitchMarkup(h.view)}
            <button type="button" id="btn-share-radar" class="share-btn" title="${escapeHtml(t("Share your star"))}">${SHARE_ICON}<span class="share-text">${escapeHtml(t("Share your star"))}</span></button>
          </div>
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
          ${regionChips([h.strongest, h.weakest?.aspect])}
        </div>
      </div>
    </section>`;
}

// What you have done so far, as four figures (the owner, v157): the page's
// reward, before anything asks for more.
function effortSection(h) {
  const e = h.effort;
  const figure = (value, max, caption) => `
    <li class="effort-item">
      <span class="effort-value"><b data-count="${escapeHtml(value)}">${escapeHtml(value)}</b>${max ? `<small>/${escapeHtml(max)}</small>` : ""}</span>
      <span class="effort-caption">${escapeHtml(caption)}</span>
    </li>`;
  return `
    <section class="panel home-effort"><div class="wrap split">
      ${label(t("Your effort so far"))}
      <ul class="effort-list">
        ${figure(e.regions, CHAPTERS.length, t("regions explored"))}
        ${figure(e.questions, 0, t("questions answered"))}
        ${figure(e.reviews, 0, t("weekly reviews"))}
        ${figure(e.kept, 0, t("pledges kept"))}
      </ul>
    </div></section>`;
}

// A button's label, and the one word it shortens to on a phone, where the
// button trails its row (css/home.css). The full label stays the accessible
// name; the short word is hidden from it, and is its first word.
const shortLabel = (full, short) =>
  `<span class="pill-long">${full}</span><span class="pill-short" aria-hidden="true">${short}</span>`;

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
      <span class="todo-actions"><a href="#/deep" class="pill pill-light">${h.deepDone > 0 ? shortLabel(t("Continue in-depth"), t("Continue")) : shortLabel(t("Start in-depth assessment"), t("Start"))}</a></span>
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
  const sources = sourceList(h.sources);
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

// A suggestion's thumbnail: the region it is for, or your star.
const thumbFor = (aspect, h) => (aspect && chapterOf(aspect) ? motifThumb(aspect) : starThumb(yourStarSvg(h.scores)));

// Where to start: the recommendations, each opening its aspect page. Your
// recent records moved to Your year (v157). Since v164 a sideways rail of
// cards, each with its whole tip (the phone's rows cut it short).
function startCard(s, h) {
  const c = chapterOf(s.aspect);
  const inner = `
    ${thumbFor(s.aspect, h)}
    <span class="start-kind">${escapeHtml(s.aspectLabel)}</span>
    <b class="start-title">${escapeHtml(s.title)}</b>
    <span class="start-text">${escapeHtml(s.text)}</span>`;
  return c
    ? `<li><a class="start-card" href="#/aspect/${c.aspect}" style="--hue: ${c.hue}; --wash: ${c.wash};">${inner}</a></li>`
    : `<li><div class="start-card">${inner}</div></li>`;
}

function newsSection(h) {
  if (!h.suggestions.length) return "";
  return `
    <section class="panel home-news">
      <div class="wrap split">
        ${label(t("Where to start"))}
        <ul class="start-rail">${h.suggestions.map(s => startCard(s, h)).join("")}</ul>
      </div>
    </section>`;
}

// Which of the sky's star slots are lit: one per pledge kept at the last
// weekly review, spread across the columns rather than bunched at the start.
export function litSkySlots(kept) {
  const n = Math.max(0, Math.min(SKY_STARS, kept));
  return new Set(Array.from({ length: n }, (_, i) => Math.floor(((i + 0.5) * SKY_STARS) / n)));
}

// One active pledge as a card on the sky, its star gilt if it was kept at the
// last review. The count line says the same in words.
function pledgeCard(goal) {
  const tmpl = goalTemplate(goal.templateId);
  const kept = goal.lastResult?.met === true;
  const star = kept
    ? `<svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg>`
    : `<svg viewBox="0 0 24 24"><use href="${SPRITES}#star-line"/></svg>`;
  return `
    <li class="pledge-card${kept ? " is-kept" : ""}">
      <i class="pc-star" aria-hidden="true">${star}</i>
      <b>${escapeHtml(t(tmpl.title))}</b>
      <span>${tp(tmpl.desc, { target: escapeHtml(goal.target ?? tmpl.def) })}</span>
    </li>`;
}

// The pledges on the night sky (v164: one dark sheet, where the count and
// the sky used to be a strip and a band apart): the count, the pledges as
// cards, and behind them a gilt star lit for each pledge kept and the rest
// drawn dim. The sky is decoration; the count says what it shows in words.
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
    <section class="panel home-pledges">
      <div class="wall" aria-hidden="true">${cols}</div>
      <div class="wrap split">
        ${label(t("Your pledges"))}
        <div class="pledge-body">
          <p class="pledge-count"><span>${escapeHtml(tp("{n} active this week", { n: goals.length }))}${keptLine}</span> <a class="pill pill-light" href="#/quests">${escapeHtml(t("Goals"))}</a></p>
          <ul class="pledge-cards">${goals.map(pledgeCard).join("")}</ul>
        </div>
      </div>
    </section>`;
}

export function homeMarkup(h) {
  return `
    <div class="stage-page home">
      ${noticeSection(h)}
      ${topSection(h)}
      ${effortSection(h)}
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

// The effort figures count up from zero, once, as the page opens.
function mountEffort(root, scope) {
  const figures = [...root.querySelectorAll(".effort-value b[data-count]")];
  const ends = figures.map(b => Number(b.dataset.count) || 0);
  animate({
    duration: COUNT_MS,
    ease: easeStar,
    signal: scope.signal,
    reduced: "end",
    update: (u) => figures.forEach((b, i) => { b.textContent = String(Math.round(ends[i] * u)); })
  });
  onAbort(scope.signal, () => figures.forEach((b, i) => { b.textContent = String(ends[i]); }));
}

// No lone last words (views/lone-words.js). Its resize listener outlives the
// page's motion (a calm page has none), so it ends with the route, or with
// the next render of this page. The sections stay flat: v164 tried them as
// stacked sheets and the owner kept the static page.
let homeWords = null;
function bindHomeWords(container) {
  homeWords?.abort();
  const page = container.querySelector(".home");
  if (!page || typeof AbortController !== "function") return;
  const ctl = new AbortController();
  homeWords = ctl;
  onRouteEnd(() => ctl.abort());
  tightenLoneWords(page, ctl.signal);
}

export function renderDashboard(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const h = readHome(state);
  // Taken before the page draws, so a still page drops it too.
  const zoom = takeZoom();
  // Beside the care notice the page itself stays calm (the notice never
  // moves, and nothing types, counts or drifts around it), but your star
  // still flies to and from its page (the owner, 2026-09-29: "Full warp always").
  const calm = !!h.careNotice;
  const scope = renderStagePage(container, () => homeMarkup(h), { calm });
  // The switch works on a still page too; there it redraws without moving.
  adoptShape(container.querySelector(".home-star-mark svg.shape"), { view: h.view, you: h.scores });
  bindShapeSwitch(container, scope);
  // Folded at every width, as on the aspect pages (v164).
  bindFootnotes(container, { fold: "always" });
  bindHomeWords(container);
  if (scope) {
    try {
      mountStar(container, scope, zoom);
      if (!calm) {
        mountEffort(container, scope);
        mountWall(container, scope);
      }
    } catch (err) {
      console.error("Home motion failed:", err);
    }
  }

  // Closed for this visit; removed in place so the reader keeps their scroll.
  document.getElementById("care-banner-close")?.addEventListener("click", (e) => {
    closeCareNotice();
    e.target.closest(".notice-panel")?.remove();
  });

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
