// views/aspect.js - an aspect's own page (#/aspect/<key>), redesign R4: a
// stage page on its region's wash (docs/prototype/redesign/weekly.js
// aspectHTML, with the section-to-content map the owner approved on
// 2026-09-25).
//
// Top to bottom:
//   notice      the Mental page's duty-of-care notice, past the cutoff; still
//   hero        the region's emblem and name, your score
//   standing    "{n} out of 100." and where that stands, typed
//   measures    what the aspect covers, the grade and where it came from,
//               confidence, the guideline checks and the estimate notes
//   society     the percentile gauge, its range, notes and sources
//   parts       one card per component, and the facts measured but not scored
//   band        the region's photograph
//   trend       the weekly snapshots, newest first
//   focus       the suggestions for this aspect
//   measured    how the aspect is re-measured, and the call to do it
//
// The Still Water and The Commons are quiet regions, and a page beside the
// care notice is quiet too: nothing types, bursts or slides there.

import { stateManager } from "../state.js";
import { getAspectDetail } from "../aspects.js";
import { getAspectSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { t, tp, percentileLabel } from "../i18n.js";
import { gradeForAspect } from "../grades.js";
import { criteriaForAspect } from "../criteria.js";
import { CHAPTERS } from "./journey.js";
import { isQuietChapter } from "./stage.js";
import { heroMarkup, missionMarkup, bandMarkup, label, renderStagePage } from "./stage-page.js";
import { dotDate, motifThumb, newsRow } from "./news.js";
import {
  escapeHtml, confidenceBadge, componentConfidenceChip, gradeBadge, percentilePhrase,
  benchmarkStanding, methodTag, mentalHealthNotice, criteriaCard, CHECKIN_ASPECTS
} from "./helpers.js";

// The weekly-review inputs that re-measure each aspect. Mental and
// relationships are survey-measured (monthly re-assessment), not weekly —
// they are absent here on purpose.
const WEEKLY_MEASURED = {
  finance: "Savings rate",
  physical: "Exercise days and minutes, sleep, water, vegetables",
  personalGoals: "Learning hours",
  socialContribution: "Donations and volunteering hours",
  environment: "Single-use plastic items",
  humanityFuture: "Learning hours"
};

const TREND_ROWS = 8;
const MINUS = "−";
const signed = (d) => (d > 0 ? `+${d}` : d < 0 ? `${MINUS}${Math.abs(d)}` : "0");

// --- the reading ------------------------------------------------------------
function readAspect(state, key) {
  const detail = getAspectDetail(state, key);
  if (!detail) return null;
  const index = CHAPTERS.findIndex(c => c.aspect === key);
  const b = detail.benchmark;
  // gradeForAspect, not gradeForBenchmark: finance grades off its composite
  // score rather than its income-only percentile (see gradeForFinance).
  const grade = gradeForAspect(key, b, (state.aspects || {})[key]);
  return {
    state,
    key,
    detail,
    chapter: CHAPTERS[index],
    index,
    b,
    grade,
    // Set only when the aspect HAS a benchmark but that benchmark declines to
    // rank it (no defensible population). Distinct from `!b`, which means the
    // questionnaires were never answered.
    unranked: b && !grade ? b.unranked || null : null,
    suggestions: getAspectSuggestions(state, key),
    // Published-guideline checks. Empty for the five aspects with no
    // institutional criterion, and criteriaCard() renders "" for those.
    criteria: criteriaForAspect(state.profile, state.baseline, key),
    notice: key === "mental" ? getMentalHealthNotice(state) : null,
    canReassess: CHECKIN_ASPECTS.includes(key) && !!state.baseline
  };
}

// The typed line under "(STANDING)": where the score stands, in words.
function standingLine(a) {
  if (a.b && Number.isFinite(a.b.percentile)) return percentilePhrase(a.b.percentile, a.b.population);
  if (a.b) return t("Not ranked — on purpose.");
  return t("Not graded yet.");
}

// --- sections ---------------------------------------------------------------

function noticeSection(a) {
  if (!a.notice) return "";
  return `<section class="panel notice-panel"><div class="wrap">${mentalHealthNotice(a.notice)}</div></section>`;
}

// Grade first, score second. The letter is read off the cited percentile (or,
// for finance, off the score, which the note below says in as many words); the
// 0-100 figure is this app's own composite. Aspects with no grade keep the
// chip, because there is no letter to set and a placeholder glyph would invent
// one.
function gradeBlock(a) {
  const { grade, unranked, detail } = a;
  return `
    <div class="aspect-score-badge">
      ${grade ? `
        <span class="aspect-grade-glyph grade-${grade.grade.toLowerCase()}">${escapeHtml(grade.grade)}</span>
        <span class="aspect-grade-band">${t(grade.label)}</span>
      ` : gradeBadge(grade, unranked)}
      <div>
        <span class="aspect-score-value">${detail.score}</span>
        <span class="aspect-score-max">/100</span>
      </div>
    </div>`;
}

function gradeNote(a) {
  const { grade, unranked, b } = a;
  const reassess = a.canReassess ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>` : "";
  if (grade && grade.basis === "score") {
    return `
      <p><strong>${tp("Grade {letter}", { letter: grade.grade })}</strong> — ${tp("{band} for this aspect, from your score of {score}.", { band: t(grade.label), score: grade.score })}</p>
      <p class="grade-explainer-note">${t("This grade comes from the aspect score, not from the percentile below. The percentile here ranks your income alone, and grading on it would grade your income rather than your financial life — someone on a small income with no debt and no money worry was being shown an F. The letters describe where this score sits against a typical one, not what share of people you are ahead of.")}</p>`;
  }
  if (grade) {
    return `
      <p><strong>${tp("Grade {letter}", { letter: grade.grade })}</strong> — ${tp("{band} of {population}, from the population comparison below.", { band: t(grade.label), population: b.population || t("people like you") })}</p>
      <p class="grade-explainer-note">${t("Grades come from the cited percentile, not from the 0-100 score — the score is this app's own composite, while the percentile is the part that compares you with real published data.")}</p>`;
  }
  if (unranked) {
    return `
      <p><strong>${t("Not ranked — on purpose.")}</strong> ${escapeHtml(unranked)}</p>
      <p class="grade-explainer-note">${t("A grade is a rank against a population. Where there is no population this app can honestly rank you against — because the published norms describe the wrong people, or because the source publishes a single average rather than a distribution — it shows your measurements and withholds the rank rather than printing one it cannot stand behind.")}</p>`;
  }
  return `<p><strong>${t("Not graded yet.")}</strong> ${t("This aspect is graded from its population comparison, which needs its questionnaires answered first.")}${reassess}</p>`;
}

function measuresSection(a) {
  const { detail, chapter } = a;
  const reassess = a.canReassess ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>` : "";
  const conf = detail.confidence && detail.confidence.tier ? `
    <p class="aspect-confidence-line">
      ${confidenceBadge(detail.confidence)}
      <span class="confidence-caption">${tp("{answered}/{total} inputs answered", { answered: detail.confidence.answered, total: detail.confidence.total })}</span>
    </p>` : "";
  const estimated = detail.confidence && detail.confidence.tier === "estimated" ? `
    <p class="aspect-note"><strong>${t("Estimated score.")}</strong> ${tp("This score comes from default answers. Answer the {aspect} questions or submit a Weekly Review to confirm it.", { aspect: detail.label })}${reassess}</p>` : "";
  const uniform = detail.flaggedInstruments && detail.flaggedInstruments.length > 0 ? `
    <p class="aspect-note"><strong>${t("Uniform answers detected.")}</strong> ${t("Some questionnaire answers all sat on the same option, so they are not counted as a confirmed measurement. Re-answer them honestly to confirm this score.")}</p>` : "";
  return `
    <section class="panel statement aspect-measures"><div class="wrap split">
      ${label(t("What it measures"))}
      <div>
        <div class="aspect-lead">
          ${gradeBlock(a)}
          <div class="aspect-lead-text">
            <h2 class="aspect-title">${escapeHtml(detail.label)}</h2>
            <p class="aspect-blurb">${escapeHtml(detail.blurb)}</p>
            <p class="aspect-theme">${escapeHtml(chapter.theme)}</p>
            ${conf}
          </div>
        </div>
        <div class="grade-explainer">${gradeNote(a)}</div>
        ${isQuietChapter(chapter) ? `<p class="aspect-note aspect-quiet">${t("This region is kept still on purpose.")}</p>` : ""}
        ${estimated}${uniform}
        ${criteriaCard(a.criteria)}
      </div>
    </div></section>`;
}

function societySection(a) {
  const { b } = a;
  const body = b ? `
    ${Number.isFinite(b.percentile) ? `
      <div class="gauge-track" role="progressbar" aria-label="${t("Percentile vs society")}" aria-valuenow="${b.percentile}" aria-valuemin="1" aria-valuemax="99"
           aria-valuetext="${tp("{pct} percentile, typical range {low} to {high}", {
             // Through percentileLabel like every other percentile in the app:
             // it supplies the English ordinal (93rd, not 93) and, in Thai, the
             // "ที่ " prefix the template is written to sit flush against.
             pct: percentileLabel(b.percentile),
             low: percentileLabel(b.range.low),
             high: percentileLabel(b.range.high)
           })}">
        <div class="gauge-range" style="left: ${b.range.low}%; width: ${Math.max(0, b.range.high - b.range.low)}%;"></div>
        <div class="gauge-fill" style="width: ${b.percentile}%;"></div>
        <div class="gauge-marker" style="left: ${b.percentile}%;"></div>
      </div>` : ""}
    <div class="gauge-caption">
      ${benchmarkStanding(b)}
      ${Number.isFinite(b.percentile) ? `<p class="benchmark-method benchmark-method-line">(${methodTag(b.method)})</p>` : ""}
    </div>
    <p class="gauge-summary">${escapeHtml(b.summary)}</p>
    ${b.notes.map(n => `<p class="gauge-note">${escapeHtml(n)}</p>`).join("")}
    <details class="aspect-sources">
      <summary>${t("Sources")}</summary>
      <ul>
        ${b.sources.map(src => `<li><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}
      </ul>
    </details>
  ` : `<p class="aspect-note">${t("No baseline data for this comparison yet — re-run the onboarding sync to unlock it.")}</p>`;
  return `
    <section class="panel statement aspect-society"><div class="wrap split">
      ${label(t("Standing vs Society"))}
      <div>${body}</div>
    </div></section>`;
}

function partCard(c, chapter) {
  const value = Number(c.value) || 0;
  return `
    <div class="region-card part-card"><div class="lcard aspect-part">
      <div class="part-head"><h3 class="card-title">${escapeHtml(c.label)}</h3>${componentConfidenceChip(c.confidence)}</div>
      <p class="score-figure"><b>${escapeHtml(c.value)}</b><small>${escapeHtml(t("out of 100"))}</small></p>
      <span class="meter" aria-hidden="true"><i style="width: ${value}%; background: ${chapter.hue};"></i></span>
      <p class="card-desc">${escapeHtml(c.detail)}</p>
    </div></div>`;
}

// "Measured, not scored": facts on file, and the runway row that asks for its
// inputs when they are not. Same row for both, deliberately: the ask sits with
// the thing being asked for. No value in the invite's slot, because there is
// none; a dash there would read as a measured result.
function factsCard(detail) {
  if (!detail.facts.length && !detail.invite) return "";
  const facts = detail.facts.map(f => `
    <li class="fact-row">
      <span class="fact-label">${escapeHtml(f.label)}</span>
      <b class="fact-value">${escapeHtml(f.display)}</b>
      <small class="fact-detail">${escapeHtml(f.detail)}</small>
    </li>`).join("");
  const invite = detail.invite ? `
    <li class="fact-row">
      <span class="fact-label">${escapeHtml(detail.invite.label)}</span>
      <small class="fact-detail">${escapeHtml(detail.invite.text)} <a href="${escapeHtml(detail.invite.href)}">${escapeHtml(detail.invite.linkLabel)}</a></small>
    </li>` : "";
  return `
    <div class="region-card part-card"><div class="lcard aspect-part facts">
      <h3 class="card-title">${t("Measured, Not Scored")}</h3>
      <ul class="fact-list">${facts}${invite}</ul>
    </div></div>`;
}

function partsSection(a) {
  const { detail, chapter } = a;
  const cards = detail.components.length
    ? detail.components.map(c => partCard(c, chapter)).join("")
    : `<p class="aspect-note">${t("Baseline survey data needed for this breakdown.")}</p>`;
  return `
    <section class="projects aspect-parts">
      <div class="inner">
        ${label(t("Component Breakdown"))}
        <div class="cardblock">${cards}${factsCard(detail)}</div>
      </div>
    </section>`;
}

// The weekly snapshots, newest first, each against the week before it.
function trendSection(a) {
  const series = a.detail.trend.slice(-(TREND_ROWS + 1));
  const rows = series.map((s, k) => {
    const prev = series[k - 1];
    const sub = !prev ? "" : prev.value === s.value
      ? t("Same as the week before")
      : tp("{d} on the week before", { d: signed(s.value - prev.value) });
    return { date: dotDate(s.date), title: tp("Score {n}", { n: s.value }), sub };
  }).reverse().slice(0, TREND_ROWS);
  const list = rows.length
    ? rows.map(r => newsRow({ ...r, kind: t("Weekly snapshot"), thumb: motifThumb(a.key) })).join("")
    : `<li class="newsrow newsrow-empty">${escapeHtml(t("No snapshots yet — trends appear after your first weekly sync."))}</li>`;
  return `
    <section class="panel news aspect-trend">
      <div class="wrap split news-block">
        <div class="news-side">${label(t("Trend"))}</div>
        <ul class="newslist">${list}</ul>
      </div>
    </section>`;
}

function focusSection(a) {
  if (!a.suggestions.length) return "";
  return `
    <section class="panel statement aspect-focus"><div class="wrap split">
      ${label(t("Suggested Focus"))}
      <ul class="focus-list">
        ${a.suggestions.map(s => `
          <li class="focus-row">
            <p class="focus-title">${escapeHtml(s.title)}</p>
            <p class="focus-text">${escapeHtml(s.text)}</p>
            <p class="focus-meta">${escapeHtml(s.componentLabel)}: ${escapeHtml(s.componentValue)}/100</p>
          </li>`).join("")}
      </ul>
    </div></section>`;
}

function measuredSection(a) {
  const weekly = WEEKLY_MEASURED[a.key];
  const due = stateManager.isWeeklyReviewDue();
  let head;
  let action = "";
  if (weekly) {
    head = tp("Your weekly review re-measures this aspect from: {fields}.", { fields: t(weekly) });
    action = due
      ? `<a href="#/review" class="pill">${t("Start Weekly Review")}</a>`
      : `<p class="careers-note">${t("Reviewed this week — the next review opens next week.")}</p>`;
  } else {
    head = t("This aspect is measured by its questionnaires rather than weekly quantities — update it at the monthly re-assessment.");
    if (a.state.baseline) action = `<a href="#/checkin" class="pill">${t("Start Re-assessment")}</a>`;
  }
  return `
    <section class="panel careers aspect-measured"><div class="wrap split">
      ${label(t("Measured Weekly"))}
      <div class="careers-row">
        <p class="careers-head">${escapeHtml(head)}</p>
        ${action}
      </div>
    </div></section>`;
}

export function aspectMarkup(a) {
  const { detail, chapter } = a;
  const scoreLine = tp("{n} out of 100.", { n: detail.score });
  return `
    <div class="stage-page aspect-page" data-aspect="${escapeHtml(a.key)}">
      ${noticeSection(a)}
      ${heroMarkup({
        mark: `<img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" decoding="async">`,
        word: chapter.region.toUpperCase(),
        inc: String(detail.score),
        srTitle: `${chapter.region} — ${detail.label}. ${scoreLine}`,
        tapLabel: t("Play with the star"),
        wash: chapter.wash
      })}
      ${missionMarkup(t("Standing"), [scoreLine, standingLine(a)])}
      ${measuresSection(a)}
      ${societySection(a)}
      ${partsSection(a)}
      ${bandMarkup([a.index])}
      ${trendSection(a)}
      ${focusSection(a)}
      ${measuredSection(a)}
    </div>`;
}

// 2b. RENDER A DEDICATED ASPECT PAGE (#/aspect/<key>)
export function renderAspectPage(containerId, state, aspectKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const a = readAspect(state, aspectKey);
  if (!a || !a.chapter) return;
  renderStagePage(container, () => aspectMarkup(a), {
    motifs: [{ motif: a.key, hue: a.chapter.hue }],
    still: isQuietChapter(a.chapter) || !!a.notice
  });
}
