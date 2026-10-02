// views/aspect.js - an aspect's own page (#/aspect/<key>), redesign R4: a
// stage page on its region's wash (docs/prototype/redesign/weekly.js
// aspectHTML, with the section-to-content map the owner approved on
// 2026-09-25). Compact since 2026-09-26, with the map the owner approved then:
// the page is opened from Home's aspect rows every week, so it reads at a
// glance and keeps the long explanations one click away.
//
// Shorter again on phones since the owner's map of 2026-09-26 (a page nobody
// scrolls to the bottom of hides what is down there): the emblem sits on the
// region's photograph, and nothing is said twice.
//
// v142 (the owner's cut list, 2026-09-29, as on Overview in v141): the page
// keeps what a first-time reader needs, and the method, the research and the
// sources are numbered notes at its end, reached by their marks.
//
// v160 (the owner's cut list, 2026-10-01): the top is one line; the gauge
// keeps no figure; each guideline check is one line; the four characters are
// a note.
//
// v161 (the owner's layout rules, 2026-10-01, after fastwork.com): every
// section is a rounded sheet the next one slides over; the parts are a
// stepper with their details back; the suggestions are a sideways rail; no
// region is quiet any more (views/aspect-sheets.js, css/weekly.css).
//
// v170 (the owner, 2026-10-02): "How you compare" repeated "What it's made
// of", so the comparison and the guideline checks are a note, marked at the
// foot of the parts; what changes how to read the score (an estimate, uniform
// answers, a grade not given yet) stays open under the top line. Laptops
// read the sections as static cards; nothing bursts on a region page.
//
// Top to bottom:
//   notice      the Mental page's duty-of-care notice, past the cutoff; still
//   top         the emblem and the name on the region's photograph, then the
//               grade, the score and where it stands
//   character   your character in this region
//   parts       one row per component, the facts measured but not scored,
//               and the mark to how you compare
//   trend       the last few weekly snapshots, once there are two
//   start       the suggestions for this aspect, then how it is updated
//   notes       what the marks above point to: the grade's reasoning, the
//               research, the comparison and the sources
//

import { getAspectDetail, ASPECT_META } from "../aspects.js";
import { getAspectSuggestions, getMentalHealthNotice } from "../suggestions.js";
import { characterFor, characterDisclaimer } from "../characters.js";
import { t, tp, percentileLabel } from "../i18n.js";
import { gradeForAspect } from "../grades.js";
import { criteriaForAspect } from "../criteria.js";
import { CHAPTERS } from "./journey.js";
import { bindAspectSheets, disposeAspectSheets } from "./aspect-sheets.js";
import { onRouteEnd } from "./motion-mount.js";
import { topMarkup, label, renderStagePage } from "./stage-page.js";
import { dotDate } from "./news.js";
import {
  escapeHtml, percentilePhrase, methodTag, mentalHealthNotice,
  criteriaCard, criteriaNote, sourceList, noteBook, footnoteList, bindFootnotes,
  CHECKIN_ASPECTS
} from "./helpers.js";

// Four weeks fit across a phone; the trend is the direction, not the archive.
const TREND_CELLS = 4;
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
    character: characterFor(state, key),
    canReassess: CHECKIN_ASPECTS.includes(key) && !!state.baseline
  };
}

const ranked = (b) => !!b && Number.isFinite(b.percentile);

// Where the score stands, in words.
function standingLine(a) {
  if (ranked(a.b)) return percentilePhrase(a.b.percentile, a.b.population);
  if (a.b) return t("Not ranked");
  return t("Not graded yet.");
}

// --- notes ------------------------------------------------------------------

// The grade in one line, and the reasoning behind it.
function gradeNote(a) {
  const { grade, unranked, b } = a;
  const reassess = a.canReassess ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>` : "";
  if (grade && grade.basis === "score") {
    return {
      line: `<p><strong>${tp("Grade {letter}", { letter: grade.grade })}</strong> · ${tp("{band} for this aspect, from your score of {score}.", { band: t(grade.label), score: grade.score })}</p>`,
      why: `<p>${t("This grade comes from the aspect score, not from the percentile below. The percentile here ranks your income alone, and grading on it would grade your income rather than your financial life — someone on a small income with no debt and no money worry was being shown an F. The letters describe where this score sits against a typical one, not what share of people you are ahead of.")}</p>`
    };
  }
  if (grade) {
    return {
      line: `<p><strong>${tp("Grade {letter}", { letter: grade.grade })}</strong> · ${tp("{band} of {population}, from the population comparison below.", { band: t(grade.label), population: b.population || t("people like you") })}</p>`,
      why: `<p>${t("Grades come from the cited percentile, not from the 0-100 score — the score is this app's own composite, while the percentile is the part that compares you with real published data.")}</p>`
    };
  }
  if (unranked) {
    return {
      line: `<p><strong>${t("Not ranked")}</strong> · ${escapeHtml(unranked)}</p>`,
      why: `<p>${t("A grade is a rank against a population. Where there is no population this app can honestly rank you against — because the published norms describe the wrong people, or because the source publishes a single average rather than a distribution — it shows your measurements and withholds the rank rather than printing one it cannot stand behind.")}</p>`
    };
  }
  return {
    line: `<p><strong>${t("Not graded yet.")}</strong> ${t("This aspect is graded from its population comparison, which needs its questionnaires answered first.")}${reassess}</p>`,
    why: ""
  };
}

// What the aspect covers, in a line and its theme.
const blurb = (a) => `<p>${escapeHtml(a.detail.blurb)} <em class="aspect-theme">${escapeHtml(a.chapter.theme)}</em></p>`;

// What the comparison is: the percentile's meaning and precision, how it was
// made, and from what.
function comparisonNote(b) {
  if (!b) return "";
  const figure = ranked(b) ? `
    <p>${t("“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.")}</p>
    <p>${tp("{pct} percentile · typical range {low}–{high}", {
      pct: percentileLabel(b.percentile),
      low: percentileLabel(b.range.low),
      high: percentileLabel(b.range.high)
    })} (${methodTag(b.method)})${b.verified ? ` · ${t("in-depth verified")}` : ""}</p>` : "";
  return `${figure}
    <p>${escapeHtml(b.summary)}</p>
    ${b.notes.map(n => `<p>${escapeHtml(n)}</p>`).join("")}
    ${sourceList(b.sources)}`;
}

// The region's four characters left the page for this note (v160), yours
// in bold.
function characterNote(c) {
  const cast = c.cast.map((name, i) => (i === c.index ? `<b>${escapeHtml(name)}</b>` : escapeHtml(name))).join(" · ");
  return `<p>${escapeHtml(t("The four characters in this region"))}: ${cast}</p>
    <p><strong>${t("What the research says")}</strong></p>
    <ul class="fn-points">${c.research.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
    <p>${escapeHtml(characterDisclaimer())}</p>`;
}

function factsNote(detail) {
  if (!detail.facts.length) return "";
  return `<ul class="fn-points">${detail.facts.map(f => `<li><strong>${escapeHtml(f.label)}</strong> · ${escapeHtml(f.detail)}</li>`).join("")}</ul>`;
}

// --- sections ---------------------------------------------------------------

function noticeSection(a) {
  if (!a.notice) return "";
  return `<section class="panel notice-panel"><div class="wrap">${mentalHealthNotice(a.notice)}</div></section>`;
}

// Under the photograph, one line (v160): the grade, the score and where they
// stand, "D · 62/100 · Ahead of about 16% of Thai adults". The letter is read
// off the cited percentile (or, for finance, off the score, which its note
// says in as many words) and is set larger than the 0-100 figure, this app's
// own composite. The band ("Below typical") is in the note and said to a
// screen reader. With no letter the line starts at the score: "Not ranked" or
// "Not graded yet." is already its last part.
//
// The reasoning is the note marked at the line's end, for a letter grade and
// an unranked aspect alike (the owner, v143: the page says why no further up
// than that). One never graded says why in the open, below.
function topBody(a, book) {
  const { grade, detail } = a;
  let ref = "";
  if (grade) {
    const note = gradeNote(a);
    ref = book.ref("grade", `${blurb(a)}${note.line}${note.why}`);
  } else if (a.unranked) {
    const note = gradeNote(a);
    ref = book.ref("grade", `${blurb(a)}${note.line}${note.why}${comparisonNote(a.b)}`);
  }
  const sep = '<span class="aspect-top-sep" aria-hidden="true">·</span>';
  const letter = grade ? `
      <span class="aspect-grade-glyph grade-${grade.grade.toLowerCase()}">${escapeHtml(grade.grade)}</span>
      <span class="sr-only">${t(grade.label)}</span>${sep}` : "";
  return `
    <div class="aspect-top-read">${letter}
      <span class="aspect-score"><span class="aspect-score-value">${detail.score}</span><span class="aspect-score-max">/100</span></span>${sep}
      <p class="page-top-lead aspect-standing">${escapeHtml(standingLine(a))}${ref}</p>
    </div>${readingNotes(a, book)}`;
}

// Your character in this region (characters.js): the name, the two sides it
// was drawn from and a tip; the region's four characters and the research the
// lines rest on are its note. Nothing when a side has no answer yet.
function characterSection(a, book) {
  const c = a.character;
  if (!c) return "";
  return `
    <section class="panel statement aspect-character"><div class="wrap split">
      ${label(t("Your character"))}
      <div>
        <p class="character-name">${escapeHtml(c.name)}</p>
        <p class="character-line">${escapeHtml(c.line)}${book.ref("character", characterNote(c))}</p>
        <ul class="character-sides">
          ${c.sides.map(s => `<li><span>${escapeHtml(s.label)}</span> <b>${escapeHtml(s.value)}</b></li>`).join("")}
        </ul>
        <p class="character-tip"><strong>${t("Try this:")}</strong> ${escapeHtml(c.tip)}</p>
      </div>
    </div></section>`;
}

function gauge(b) {
  if (!ranked(b)) return "";
  return `
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
    </div>`;
}

// What changes how to read the score stays open under the top line: no
// baseline yet, a grade not given (its sentence is the reason and the way to
// fix it), an estimate, uniform answers.
function readingNotes(a, book) {
  const { b, detail, grade } = a;
  const reassess = a.canReassess ? ` <a href="#/checkin">${t("Start Re-assessment")}</a>` : "";
  let missing = "";
  if (!grade && !a.unranked) {
    const note = gradeNote(a);
    const ref = book.ref("grade", `${blurb(a)}${note.why}${ranked(b) ? "" : comparisonNote(b)}`);
    missing = `<div class="grade-explainer">${note.line.replace("</strong>", `</strong>${ref}`)}</div>`;
  }
  const noData = b ? "" : `<p class="aspect-note">${t("No baseline data for this comparison yet — re-run the onboarding sync to unlock it.")}</p>`;
  const estimated = detail.confidence && detail.confidence.tier === "estimated" ? `
    <p class="aspect-note"><strong>${t("Estimated score.")}</strong> ${tp("This score comes from default answers. Answer the {aspect} questions or submit a Weekly Review to confirm it.", { aspect: detail.label })}${reassess}</p>` : "";
  const uniform = detail.flaggedInstruments && detail.flaggedInstruments.length > 0 ? `
    <p class="aspect-note"><strong>${t("Uniform answers detected.")}</strong> ${t("Some questionnaire answers all sat on the same option, so they are not counted as a confirmed measurement. Re-answer them honestly to confirm this score.")}</p>` : "";
  const body = `${noData}${missing}${estimated}${uniform}`;
  return body.trim() ? `<div class="aspect-reading">${body}</div>` : "";
}

// How you compare, as a note (v170): the gauge, what the percentile is and
// where it comes from, and the guideline checks. An unranked aspect's
// comparison is already in its grade note, so only its checks come here.
function compareNote(a) {
  const { b } = a;
  const figure = ranked(b) ? `${gauge(b)}${comparisonNote(b)}` : "";
  const checks = a.criteria && a.criteria.length ? `${criteriaCard(a.criteria)}${criteriaNote(a.criteria)}` : "";
  return `${figure}${checks}`;
}

// "What it's made of" as a stepper (v161, the owner: "bring the details"):
// the parts as tabs, each with its score, and one card at a time with the
// score, a meter in the region's hue and what it is made of. A tap on a tab
// shows its card (since v170 on a laptop too; the scroll no longer picks it);
// on a phone the tabs run sideways as chips.
function partTab(c, i) {
  return `
        <button type="button" class="ps-tab" role="tab" id="ps-tab-${i}" aria-controls="ps-card-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
          <span class="ps-tab-name">${escapeHtml(c.label)}</span><b class="ps-tab-score">${escapeHtml(c.value)}</b>
        </button>`;
}

function partCard(c, i, chapter) {
  const value = Number(c.value) || 0;
  return `
        <article class="ps-card" role="tabpanel" id="ps-card-${i}" aria-labelledby="ps-tab-${i}"${i ? " hidden" : ""}>
          <h3 class="card-title">${escapeHtml(c.label)}</h3>
          <p class="pr-score"><b>${escapeHtml(c.value)}</b><span class="sr-only"> ${escapeHtml(t("out of 100"))}</span></p>
          <span class="meter" aria-hidden="true"><i style="width: ${value}%; background: ${chapter.hue};"></i></span>
          <p class="pr-desc">${escapeHtml(c.detail)}</p>
        </article>`;
}

function partsStepper(components, chapter) {
  return `
    <div class="parts-stepper" data-step="0">
      <div class="ps-pin">
        <div class="ps-tabs" role="tablist" aria-label="${escapeHtml(t("What it's made of"))}">${components.map(partTab).join("")}
        </div>
        <div class="ps-cards">${components.map((c, i) => partCard(c, i, chapter)).join("")}
        </div>
      </div>
    </div>`;
}

// The facts measured but not scored, under the components with no heading of
// their own (the owner, v143). Why they are not scored is their note, marked
// on the first.
function factsBlock(detail, book) {
  if (!detail.facts.length) return "";
  const ref = book.ref("facts", factsNote(detail));
  const facts = detail.facts.map((f, i) => `
    <li class="fact-row">
      <span class="fact-label">${escapeHtml(f.label)}${i === 0 ? ref : ""}</span>
      <b class="fact-value">${escapeHtml(f.display)}</b>
    </li>`).join("");
  return `<ul class="fact-list facts">${facts}</ul>`;
}

function partsSection(a, book) {
  const { detail, chapter } = a;
  const rows = detail.components.length
    ? partsStepper(detail.components, chapter)
    : `<p class="aspect-note">${t("Baseline survey data needed for this breakdown.")}</p>`;
  const facts = factsBlock(detail, book);
  const compare = compareNote(a);
  const link = compare ? `<p class="aspect-compare-link">${t("How you compare")}${book.ref("compare", compare)}</p>` : "";
  return `
    <section class="panel statement aspect-parts"><div class="wrap split">
      ${label(t("What it's made of"))}
      <div>${rows}${facts}${link}</div>
    </div></section>`;
}

// The last few weekly snapshots as one strip, oldest to newest, each with its
// change on the week before. The change reads as a sign and a number; a screen
// reader hears the whole sentence.
function trendCell(s, prev) {
  const d = prev ? s.value - prev.value : null;
  const said = d === null ? "" : d === 0
    ? t("Same as the week before")
    : tp("{d} on the week before", { d: signed(d) });
  const dir = d === null || d === 0 ? "flat" : d > 0 ? "up" : "down";
  return `
    <li class="trend-cell trend-${dir}">
      <span class="trend-date">${escapeHtml(dotDate(s.date))}</span>
      <b class="trend-score" aria-hidden="true">${escapeHtml(s.value)}</b>
      <small class="trend-delta" aria-hidden="true">${d === null ? "" : escapeHtml(signed(d))}</small>
      <span class="sr-only">${escapeHtml(tp("Score {n}", { n: s.value }))}${said ? `, ${escapeHtml(said)}` : ""}</span>
    </li>`;
}

// Not until there are two weeks: one would only repeat the score at the top.
function trendSection(a) {
  // One snapshot more than is shown, so the first cell has a week before it.
  const series = a.detail.trend.slice(-(TREND_CELLS + 1));
  if (series.length < 2) return "";
  const offset = series.length > TREND_CELLS ? 1 : 0;
  return `
    <section class="panel statement aspect-trend"><div class="wrap split">
      ${label(t("Trend"))}
      <div><ol class="trend-strip">${series.slice(offset).map((s, k) => trendCell(s, series[k + offset - 1])).join("")}</ol></div>
    </div></section>`;
}

// The suggestions as a sideways rail of cards (v161, the owner's layout
// rules: a rail, as YouTube Music does, rather than a column to read down).
function focusCard(s) {
  return `
        <li class="focus-row">
          <p class="focus-title">${escapeHtml(s.title)}</p>
          <p class="focus-text">${escapeHtml(s.text)}</p>
        </li>`;
}

// No row says how the aspect is updated, and none offers the review or the
// re-assessment (v173-v174, the owner: unnecessary here; the menu and
// Overview carry both). With no suggestions there is no section.
function focusSection(a) {
  if (!a.suggestions.length) return "";
  return `
    <section class="panel statement aspect-focus"><div class="wrap split">
      ${label(t("Where to start"))}
      <div>
        <ul class="focus-list focus-rail">${a.suggestions.map(focusCard).join("")}
        </ul>
      </div>
    </div></section>`;
}

function notesSection(notes) {
  if (!notes.length) return "";
  return `
    <section class="panel statement aspect-notes"><div class="wrap split">
      ${label(t("Notes and sources"))}
      <div>${footnoteList(notes)}</div>
    </div></section>`;
}

// The next region's sheet at the foot of the page (v162, the owner: "a way to
// go to the next aspect page", by pulling rather than a button). Its top edge
// peeks up with the emblem in a ring; pulling further fills the ring, and a
// full ring opens that region (views/aspect-sheets.js). A tap does the same.
// Overview's order, the last wrapping round to the first.
export function nextChapter(key) {
  const at = CHAPTERS.findIndex(c => c.aspect === key);
  return at < 0 ? null : CHAPTERS[(at + 1) % CHAPTERS.length];
}

function nextSection(a) {
  const next = nextChapter(a.key);
  if (!next) return "";
  const name = t(ASPECT_META[next.aspect].label);
  return `
    <section class="panel next-aspect" style="background: ${next.wash}; --next-hue: ${next.hue};" data-next="${escapeHtml(next.aspect)}">
      <a class="next-pull" href="#/aspect/${escapeHtml(next.aspect)}" aria-label="${escapeHtml(tp("Next: {region}, {aspect}", { region: next.region, aspect: name }))}">
        <span class="next-name" aria-hidden="true">${escapeHtml(next.region)} <small>${escapeHtml(name)}</small></span>
        <span class="next-chev" aria-hidden="true"><i></i><i></i></span>
        <span class="next-mark">
          <svg class="next-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" pathLength="100"/></svg>
          <img src="./assets/emblems/${next.art}.webp" alt="" width="224" height="224" decoding="async">
        </span>
      </a>
      <div class="next-plate" style="background-image: url('./assets/regions/${next.art}.jpg');" aria-hidden="true"></div>
    </section>`;
}

// "You are here" (v163, the owner: "a ribbon for the current aspect page",
// so a reader pulled from region to region knows where they are). It stands
// in for the wordmark once the page's top has gone by (views/aspect-ribbon.js
// moves it into the header); the dots are the eight regions, this one filled.
function ribbonMarkup(a) {
  const { chapter } = a;
  const at = CHAPTERS.indexOf(chapter);
  const dots = CHAPTERS.map((c, i) => `<i${i === at ? ' class="on"' : ""}></i>`).join("");
  return `
      <button type="button" class="aspect-ribbon" hidden style="--hue: ${chapter.hue};" aria-label="${escapeHtml(tp("Back to the top of {region}", { region: chapter.region }))}">
        <img class="ribbon-mark" src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" decoding="async">
        <span class="ribbon-name" aria-hidden="true">${escapeHtml(chapter.region)}</span>
        <span class="ribbon-dots" aria-hidden="true">${dots}</span>
      </button>`;
}

export function aspectMarkup(a) {
  const { detail, chapter } = a;
  const book = noteBook();
  // Written in reading order, so the notes number in reading order.
  const top = topBody(a, book);
  const character = characterSection(a, book);
  const parts = partsSection(a, book);
  const focus = focusSection(a);
  return `
    <div class="stage-page aspect-page" data-aspect="${escapeHtml(a.key)}" data-hue="${chapter.hue}">
      ${ribbonMarkup(a)}
      ${noticeSection(a)}
      ${topMarkup({
        mark: `<img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" decoding="async">`,
        word: chapter.region,
        inc: detail.label,
        wash: chapter.wash,
        plate: `./assets/regions/${chapter.art}.jpg`,
        body: top
      })}
      ${character}
      ${parts}
      ${trendSection(a)}
      ${focus}
      ${notesSection(book.notes)}
      ${nextSection(a)}
    </div>`;
}

// 2b. RENDER A DEDICATED ASPECT PAGE (#/aspect/<key>)
export function renderAspectPage(containerId, state, aspectKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const a = readAspect(state, aspectKey);
  if (!a || !a.chapter) return;
  renderStagePage(container, () => aspectMarkup(a), { still: !!a.notice });
  // Folded on a laptop too (the owner, v162), as on a phone.
  bindFootnotes(container, { fold: "always" });
  bindAspectSheets(container);
  onRouteEnd(disposeAspectSheets);
  // Opened from a row halfway down Overview, the page starts at its top
  // (the owner, v143), as the star page does.
  globalThis.scrollTo?.(0, 0);
}
