// The weekly loop (redesign R4): the Weekly Review's screens, an aspect page's
// trend list, and the Goals catalog. Rendered into the DOM stub and read back
// as HTML; the motion is covered by tests/moments-e2e.mjs.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

const MAIN = "main-view";
let dom;
beforeEach(() => { dom = installDom(); });

installDom();
const { stateManager } = await import("../state.js");
const { renderReview, REVIEW_STEPS, REVIEW_FIELDS } = await import("../views/review.js");
const { renderAspectPage } = await import("../views/aspect.js");
const { renderQuests } = await import("../views/quests.js");
const { GOAL_TEMPLATES, PLEDGE_LIMIT } = await import("../goals.js");
const { CHAPTERS } = await import("../views/journey.js");

const STATE = {
  ...DEFAULT_STATE,
  onboarded: true,
  profile: { ...DEFAULT_STATE.profile, name: "Fixture", age: 34, income: 30000, savingsRate: 10 },
  baseline: { ...DEFAULT_STATE.baseline, date: "2026-08-01T00:00:00.000Z", cfpb: 10, jss: 12, st5: 5, who5: 15, lsns: 15, ucla: 5 },
  reviews: [],
  goals: []
};
const html = () => dom.html[MAIN] || "";

// --- the Weekly Review ------------------------------------------------------

test("every review field is asked on exactly one screen", () => {
  const asked = REVIEW_STEPS.flatMap(s => s.fields);
  assert.deepEqual([...asked].sort(), [...REVIEW_FIELDS].sort());
  assert.equal(new Set(asked).size, asked.length, "a field is asked twice");
});

test("one region per screen, in the journey's order, with the Body split in two", () => {
  const order = REVIEW_STEPS.map(s => CHAPTERS.findIndex(c => c.aspect === s.aspect));
  assert.ok(order.every(i => i >= 0), "a screen names no region");
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "the screens are out of the journey's order");
  const body = REVIEW_STEPS.filter(s => s.aspect === "physical");
  assert.equal(body.length, 2, "the owner split the Body screen in two (2026-09-25)");
  assert.ok(body[1].title, "the second Body screen needs its own heading, not a repeat");
});

test("the review renders every screen, shows only the first, and submits from the last", () => {
  stateManager.state.onboarded = true;
  stateManager.state.baseline = { date: "2020-01-01T00:00:00.000Z" };
  stateManager.state.reviews = [];
  renderReview(MAIN, STATE, () => {});
  const out = html();
  const screens = [...out.matchAll(/<section class="survey-page rv-step([^"]*)"/g)].map(m => m[1]);
  assert.equal(screens.length, REVIEW_STEPS.length);
  assert.deepEqual(screens.map(c => c.includes("d-none")), REVIEW_STEPS.map((_, i) => i > 0));
  assert.equal((out.match(/type="submit"/g) || []).length, 1);
  assert.ok(out.lastIndexOf("rv-next") < out.indexOf('type="submit"'), "a Next button follows the submit");
  for (const field of REVIEW_FIELDS) assert.match(out, new RegExp(`id="rev-${field}"`));
  // v144, the owner's cut list: a one-line intro, and no section heading
  // under a question that already says it.
  assert.match(out, /Last week(&#39;|')s answers are filled in\. Change only what(&#39;|')s different\./);
  assert.doesNotMatch(out, /Report a rough weekly average|Activity this week|Daily habits \(weekly average\)|Monthly habits \(update/);
});

test("a review done for the week lists the past reviews newest first", () => {
  const isDue = stateManager.isWeeklyReviewDue;
  stateManager.isWeeklyReviewDue = () => false;
  try {
    renderReview(MAIN, {
      ...STATE,
      reviews: [
        { date: "2026-09-01T00:00:00.000Z", goals: [], xp: 50, shifts: {} },
        { date: "2026-09-08T00:00:00.000Z", goals: [{ met: true }], xp: 75, shifts: { physical: 2 } }
      ]
    }, () => {});
  } finally {
    stateManager.isWeeklyReviewDue = isDue;
  }
  const dates = [...html().matchAll(/class="rv-week-date">([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(dates, ["2026.09.08", "2026.09.01"]);
  assert.match(html(), /id="rv-done-head"/);
  // v144: a week with no pledges shows its points alone, not "0/0 pledges met";
  // the next date in one line; the way out is named as the menu names it.
  assert.doesNotMatch(html(), /0\/0 pledges met/);
  assert.match(html(), /1\/1 pledges met · \+75 points/);
  assert.match(html(), /class="rv-done-note">Next review opens [^<]+\.</);
  assert.match(html(), /<a class="pill" href="#\/dashboard">Overview<\/a>/);
  // v158: each row shows the region that moved most; a steady week the star.
  assert.match(html(), /newsrow-thumb" style="[^"]*"><svg[^>]*><use href="[^"]*#motif-physical"/);
  assert.match(html(), /newsrow-thumb newsrow-star/);
  // v166: the past reviews are cards in a sideways row, not tall rows, and
  // no card repeats "Weekly Review".
  assert.match(html(), /<ul class="rv-weeks">/);
  assert.doesNotMatch(html(), /class="newslist"|newsrow-kind/);
});

// v166, the owner's plan for the Weekly Review: the six screens as a list of
// emblems with the answered ones tappable, each screen's pledges under its
// boxes, a strip of the week on the done page, and every page at its top.
test("v166: the review's step list, pledges, week strip, and a route change at the top", () => {
  stateManager.state.onboarded = true;
  stateManager.state.baseline = { date: "2020-01-01T00:00:00.000Z" };
  stateManager.state.reviews = [];
  const goals = [
    { id: "g1", templateId: "water", target: 2.5, lastResult: { met: true } },
    { id: "g2", templateId: "exerciseDays", target: 3 },
    { id: "g3", templateId: "savings", target: 15 }
  ];
  renderReview(MAIN, { ...STATE, goals }, () => {});
  const out = html();
  const sections = out.split('<section class="survey-page rv-step').slice(1);
  assert.equal(sections.length, REVIEW_STEPS.length);
  sections.forEach((sec, i) => {
    assert.equal((sec.match(/<ol class="rv-steps">/g) || []).length, 1, `screen ${i} has one step list`);
    assert.equal((sec.match(/class="rv-jump" data-to="/g) || []).length, i, `screen ${i}: only the screens before it are buttons`);
    assert.match(sec, /<li class="is-now" aria-current="step">/);
  });
  // The second Body screen is a dot, not the emblem again.
  assert.equal((sections[0].match(/class="rv-dot"/g) || []).length, 1);
  assert.match(sections[0], /class="q-count sr-only"/, "the count is still read out");
  // Each pledge on the screen whose answers grade it, and nowhere else.
  const pledgesOn = (sec) => [...sec.matchAll(/<li class="rv-pledge[^"]*">\s*<i[^>]*>[\s\S]*?<b>([^<]+)<\/b>/g)].map(m => m[1]);
  assert.deepEqual(sections.map(pledgesOn), [["Savings"], ["Exercise days"], ["Water"], [], [], []]);
  assert.match(sections[2], /<li class="rv-pledge is-kept">/, "kept last week, starred");
  assert.match(sections[2], /Average at least 2\.5 L of water per day\./);
  assert.doesNotMatch(sections[3], /rv-pledges/, "no pledge, no heading");
  const js = read("views/review.js");
  assert.match(js, /closest\("\.rv-jump"\)/);

  const isDue = stateManager.isWeeklyReviewDue;
  stateManager.isWeeklyReviewDue = () => false;
  try {
    renderReview(MAIN, { ...STATE, reviews: [{ date: new Date().toISOString(), goals: [], xp: 50, shifts: {} }] }, () => {});
  } finally {
    stateManager.isWeeklyReviewDue = isDue;
  }
  const strip = html().match(/<ol class="rv-days" aria-hidden="true">([\s\S]*?)<\/ol>/);
  assert.ok(strip, "the done page shows the week");
  assert.equal((strip[1].match(/<li/g) || []).length, 7, "Monday to Sunday (v174)");
  assert.equal((strip[1].match(/is-today/g) || []).length, 1);
  assert.match(strip[1], /class="is-today is-done"><span>[^<]+<\/span><b>\d+<\/b><svg/, "reviewed today: ringed and starred");
  assert.match(strip[1], /<li class="[^"]*is-next[^"]*"><span>[^<]+<\/span><b>\d+<\/b>(<svg[\s\S]*?<\/svg>)?<\/li>$/, "Sunday, the last day, is review day");

  // A route change starts the next page at its top, before it draws.
  const app = read("app.js");
  assert.match(app, /if \(stateManager\.state\.onboarded\) \{\s*window\.scrollTo\(\{ top: 0, behavior: "instant" \}\);\s*renderActiveTab\(\);/);
});

test("a due re-assessment on the done page is a button, not a bare link", () => {
  const isDue = stateManager.isWeeklyReviewDue;
  const checkin = stateManager.isCheckinDue;
  stateManager.isWeeklyReviewDue = () => false;
  stateManager.isCheckinDue = () => true;
  try {
    renderReview(MAIN, { ...STATE, reviews: [{ date: "2026-09-08T00:00:00.000Z", goals: [], xp: 50, shifts: {} }] }, () => {});
  } finally {
    stateManager.isWeeklyReviewDue = isDue;
    stateManager.isCheckinDue = checkin;
  }
  assert.match(html(), /<a class="pill" href="#\/checkin">Start Re-assessment<\/a>/);
});

// v158, the owner's cut list: a monthly habit shows only last week's answer
// until "Change" opens the list; the numbers and the painted week do not fold.
test("the review folds the monthly habits to last week's answer, each with a Change button", () => {
  stateManager.state.onboarded = true;
  stateManager.state.baseline = { date: "2020-01-01T00:00:00.000Z" };
  stateManager.state.reviews = [];
  renderReview(MAIN, { ...STATE, profile: { ...STATE.profile, weeklyLearningHours: 3, monthlyDonations: 300, volunteeringHours: 2, singleUsePlastics: 3 } }, () => {});
  const out = html();
  for (const field of ["weeklyLearningHours", "monthlyDonations", "volunteeringHours", "singleUsePlastics"]) {
    assert.match(out, new RegExp(`data-out="rev-${field}" data-folded`), `${field} should open folded`);
    assert.match(out, new RegExp(`class="easy-change" aria-expanded="false" aria-controls="rev-${field}-choices">Change<`));
  }
  assert.doesNotMatch(out, /data-easy="week"[^>]*data-folded/, "the painted week never folds");
  // The phone's short submit word, the long one still read out.
  assert.match(out, /<span class="pill-long">Complete Weekly Review<\/span><span class="pill-short" aria-hidden="true">Finish<\/span>/);
  assert.match(out, /class="rv-progress" aria-hidden="true"><i style="width: 17%;">/);
});

// The journey counts as the first week's measurement, so the review is not due
// until next Monday. That page said "Reviewed this week." over an empty list of
// past reviews to someone who had never done one.
test("the week of the journey says when the first review opens", () => {
  const isDue = stateManager.isWeeklyReviewDue;
  stateManager.isWeeklyReviewDue = () => false;
  try {
    renderReview(MAIN, { ...STATE, reviews: [] }, () => {});
  } finally {
    stateManager.isWeeklyReviewDue = isDue;
  }
  const out = html();
  assert.match(out, /id="rv-done-head"[^>]*>Your first review opens on [^<]+\.</);
  assert.doesNotMatch(out, /Reviewed this week|Past Reviews|class="newslist"/);
  assert.match(out, /href="#\/dashboard"/, "the way Home stays");
});

// --- an aspect page ---------------------------------------------------------

test("the trend is one strip of the last four weeks, oldest to newest, each against the week before", () => {
  const snapshots = [60, 62, 62, 59, 61].map((v, i) => ({
    date: `2026-09-0${i + 1}T00:00:00.000Z`, aspects: { ...STATE.aspects, physical: v }
  }));
  renderAspectPage(MAIN, { ...STATE, snapshots }, "physical");
  const out = html();
  const dates = [...out.matchAll(/class="trend-date">([^<]*)</g)].map(m => m[1]);
  // The fifth week back is read only so the first cell has a change to show.
  assert.deepEqual(dates, ["2026.09.02", "2026.09.03", "2026.09.04", "2026.09.05"]);
  assert.match(out, /class="trend-delta" aria-hidden="true">−3</);
  assert.match(out, /class="sr-only">Score 59, −3 on the week before</);
  assert.match(out, /class="sr-only">Score 62, Same as the week before</);
});

test("an aspect page is compact: the emblem on the region's photograph, rows, and the reasoning in notes at the end", () => {
  renderAspectPage(MAIN, STATE, "finance");
  const out = html();
  assert.doesNotMatch(out, /class="hero"|class="panel mission"|region-card/);
  // The emblem and the name sit on the photograph; no second strip of it.
  assert.match(out, /class="page-top-plate" style="background-image: url\('\.\/assets\/regions\/[^']+\.jpg'\);"/);
  assert.doesNotMatch(out, /class="photoband"/);
  assert.match(out, /<h2 class="page-top-word">The Market <small>[^<]+<\/small><\/h2>/);
  assert.match(out, /class="aspect-top-read">/, "the grade and score sit in the top");
  // v170: no "How you compare" section; the comparison is a note.
  assert.doesNotMatch(out, /aspect-society/);
  // Where it stands is said once, in the top, not again under the gauge.
  assert.equal((out.match(/Ahead of about/g) || []).length, 1);
  assert.match(out, /class="parts-stepper"/);
  // v143: the facts sit under the components with no heading, their note
  // marked on the first; the runway is gone.
  assert.match(out, /<ul class="fact-list facts">\s*<li class="fact-row">\s*<span class="fact-label">Monthly saving<sup class="fn-ref"><a id="fnref-facts"/);
  assert.doesNotMatch(out, /Measured, Not Scored|Runway/);
  // v174 (the owner): no row says how the aspect is updated.
  assert.doesNotMatch(out, /aspect-measured|monthly re-assessment|Start Weekly Review/);
});

// v142, the owner's cut list: the page keeps what a first-time reader needs;
// the reasoning, the research and the sources are numbered notes at its end.
test("an aspect page's explanations are numbered notes at its end, in reading order", () => {
  renderAspectPage(MAIN, STATE, "physical");
  const out = html();
  for (const gone of ["<details", "percentile-band", "focus-meta", "How this is worked out", "· typical range", "Standing vs Society", "Component Breakdown", "Suggested Focus", "re-measures this aspect from"]) {
    assert.ok(!out.split('class="panel statement aspect-notes"')[0].includes(gone), `${gone} is still in the page's main view`);
  }
  for (const heading of ["What it(&#39;|')s made of", "Where to start", "Notes and sources"]) assert.match(out, new RegExp(heading));
  const marks = [...out.matchAll(/<a id="fnref-([a-z]+)" href="#fn-\1" data-jump="fn-\1" aria-label="Note (\d)">\2<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(marks, [["grade", "1"], ["character", "2"], ["compare", "3"]]);
  // The character's mark ends its line, not its name (the owner, v143).
  assert.match(out, /class="character-line">[^<]+<sup class="fn-ref"><a id="fnref-character"/);
  const notes = out.slice(out.indexOf('class="panel statement aspect-notes"'));
  assert.deepEqual([...notes.matchAll(/<li id="fn-([a-z]+)"/g)].map(m => m[1]), ["grade", "character", "compare"]);
  assert.match(notes, /made up for fun/, "the character's disclaimer is kept");
  assert.match(notes, /“Percentile” = the share of people you're ahead of/);
  assert.match(notes, /class="fn-sources"><li><a href="https:/, "the sources are listed");
  assert.ok(out.lastIndexOf("aspect-focus") < out.indexOf("aspect-notes"), "the notes come last");
});

// v170 (the owner): "How you compare" repeated "What it's made of", so the
// gauge, the comparison and the guideline checks are one note, marked at the
// foot of the parts.
test("how you compare is a note marked under the parts, with the guideline checks in it", () => {
  renderAspectPage(MAIN, STATE, "mental");
  const out = html();
  const page = out.split('class="panel statement aspect-notes"')[0];
  assert.doesNotMatch(page, /criteria-card|gauge-track/);
  assert.match(page, /<p class="aspect-compare-link">How you compare<sup class="fn-ref"><a id="fnref-compare"/);
  assert.ok(page.indexOf("aspect-compare-link") > page.indexOf("parts-stepper"));
  // The note's number is the way back; no "↑" (the owner, v143).
  assert.match(out, /<li id="fn-compare"[^>]*><a class="fn-mark" href="#fnref-compare" data-jump="fnref-compare"[^>]*>\d<\/a><div class="fn-body">[\s\S]*?class="gauge-track"[\s\S]*?Guideline checks[\s\S]*?These compare you with published health guidelines/);
  assert.doesNotMatch(out, /fn-back|↑/);
});

// v143 (the owner): an unranked aspect has no comparison section; "Not ranked"
// in the top carries the note that says why.
test("an unranked aspect says so in the top, and why in a note", () => {
  renderAspectPage(MAIN, STATE, "relationships");
  const out = html();
  assert.match(out, /class="page-top-lead aspect-standing">Not ranked<sup class="fn-ref"><a id="fnref-grade"/);
  assert.doesNotMatch(out, /aspect-society/);
  assert.match(out, /<li id="fn-grade"[^>]*>[\s\S]*A grade is a rank against a population/);
});

test("the trend waits for a second week rather than repeat the score", () => {
  const snap = (v, d) => ({ date: `2026-09-0${d}T00:00:00.000Z`, aspects: { ...STATE.aspects, physical: v } });
  renderAspectPage(MAIN, { ...STATE, snapshots: [snap(60, 1)] }, "physical");
  assert.doesNotMatch(html(), /aspect-trend/);
  renderAspectPage(MAIN, { ...STATE, snapshots: [snap(60, 1), snap(62, 8)] }, "physical");
  assert.match(html(), /class="trend-strip"/);
});

test("no region is quiet any more, so no page says it is still on purpose", () => {
  for (const key of ["mental", "relationships", "physical"]) {
    renderAspectPage(MAIN, STATE, key);
    assert.doesNotMatch(html(), /kept still on purpose/);
  }
});

// v160, the owner's cut list: the top on one line, no second percentile, one
// line per check, and the rest in notes.
test("an aspect page's top is one line: the letter, the score and where it stands", () => {
  renderAspectPage(MAIN, STATE, "physical");
  const out = html();
  assert.match(out, /<div class="aspect-top-read">\s*<span class="aspect-grade-glyph grade-[a-f]">[A-F]<\/span>\s*<span class="sr-only">[^<]+<\/span><span class="aspect-top-sep" aria-hidden="true">·<\/span>\s*<span class="aspect-score"><span class="aspect-score-value">\d+<\/span><span class="aspect-score-max">\/100<\/span><\/span><span class="aspect-top-sep" aria-hidden="true">·<\/span>\s*<p class="page-top-lead aspect-standing">Ahead of about[^<]*<sup class="fn-ref"><a id="fnref-grade"/);
  assert.doesNotMatch(out, /aspect-score-badge|aspect-grade-band|benchmark-detail/);
  assert.doesNotMatch(out, /\d+(st|nd|rd|th) percentile<sup/);
});

test("an unranked aspect's top starts at the score", () => {
  renderAspectPage(MAIN, STATE, "relationships");
  const out = html();
  assert.doesNotMatch(out, /grade-badge|aspect-grade-glyph/);
  assert.match(out, /<div class="aspect-top-read">\s*<span class="aspect-score">/);
});

test("each guideline check is one line, its figures in the note", () => {
  renderAspectPage(MAIN, STATE, "physical");
  const out = html();
  const page = out.split('class="panel statement aspect-notes"')[0];
  const notes = out.slice(page.length);
  assert.doesNotMatch(page, /criterion-detail|criterion-body|The guideline is 150 min/);
  assert.match(notes, /<span class="criterion-chip criterion-chip-[a-z]+">[^<]+<\/span>\s*<span class="criterion-name">[^<]+<\/span>\s*<\/li>/);
  assert.match(out, /<li id="fn-compare"[\s\S]*<li><strong>[^<]+<\/strong> · [^<]*The guideline is 150 min/);
  assert.match(read("css/weekly.css"), /\.aspect-page \.criterion-name \{ order: -1; \}/);
});

test("the four characters are a note; the parts are a stepper; the suggestions a rail", () => {
  renderAspectPage(MAIN, STATE, "mental");
  const out = html();
  const page = out.split('class="panel statement aspect-notes"')[0];
  assert.doesNotMatch(out, /character-cast|aria-current="true"/);
  assert.match(out, /<li id="fn-character"[^>]*>[\s\S]*?The four characters in this region: [^<]*<b>[^<]+<\/b>/);
  // v161: one tab and one card per part, the first shown, the details back.
  const tabs = [...page.matchAll(/<button type="button" class="ps-tab" role="tab" id="ps-tab-(\d)" aria-controls="ps-card-\1" aria-selected="(true|false)"/g)];
  assert.ok(tabs.length >= 2, "Mental has two parts");
  assert.deepEqual(tabs.map(m => m[2]), ["true", ...tabs.slice(1).map(() => "false")]);
  assert.match(page, /<article class="ps-card" role="tabpanel" id="ps-card-0" aria-labelledby="ps-tab-0">/);
  assert.match(page, /<article class="ps-card" role="tabpanel" id="ps-card-1" aria-labelledby="ps-tab-1" hidden>/);
  assert.match(page, /class="ps-card"[\s\S]*?<p class="pr-desc">[^<]+<\/p>/);
  assert.doesNotMatch(page, /ps-track/, "v170: a tap picks the part, not the scroll");
  assert.doesNotMatch(out, /fnref-parts|fnref-focus/);
  // Every suggestion in full, as cards on a rail.
  assert.match(page, /<ul class="focus-list focus-rail">/);
  const rows = [...page.matchAll(/<li class="focus-row">([\s\S]*?)<\/li>/g)].map(m => m[1]);
  assert.ok(rows.length >= 2);
  for (const r of rows) assert.match(r, /class="focus-text"/);
  const css = read("css/weekly.css");
  // v186 (the owner's pick "B"): nothing pins or slides on a phone any more.
  // The sections are one sheet in numbered chapters, the parts all shown as
  // rows, the suggestions a list; each chapter fades up once, never under
  // reduced motion.
  assert.doesNotMatch(css, /\.aspect-page > \.panel \{\s*position: sticky/);
  assert.match(page, /<h2 class="label chapter-label"><span class="label-paren" aria-hidden="true">\(<\/span>Your character<span class="label-paren" aria-hidden="true">\)<\/span><\/h2>/);
  assert.match(css, /\.chapter-label::before \{\s*content: counter\(chapter, decimal-leading-zero\);/);
  assert.match(css, /\.aspect-page \.ps-tabs \{ display: none; \}/);
  assert.match(css, /\.aspect-page \.focus-rail \{[^}]*grid-auto-flow: row;[^}]*overflow: visible;/);
  assert.match(css, /html\[data-reduce-motion\] \.aspect-page > \.panel\.arrives \{ opacity: 1; transform: none; transition: none; \}/);
  assert.match(read("index.css"), /text-wrap: pretty/);
});

// v170 (the owner): nothing bursts on a region page; the next region lands at its top.
test("a region page has no burst: no tap on its emblem, no burst layer on the next sheet", () => {
  renderAspectPage(MAIN, STATE, "finance");
  const out = html();
  assert.doesNotMatch(out.slice(out.indexOf('class="panel page-top')), /mark-hit/);
  assert.doesNotMatch(out.slice(out.indexOf("next-aspect")), /burst-layer/);
  const sheets = read("views/aspect-sheets.js");
  assert.doesNotMatch(sheets, /burst/);
  assert.match(sheets, /toTop\(\);\n {4}\}\);/, "the landed page always opens at its top");
});

test("v162: the page ends on the next region's sheet, in Overview's order, the last wrapping", async () => {
  const { nextChapter } = await import("../views/aspect.js");
  const { CHAPTERS } = await import("../views/journey.js");
  CHAPTERS.forEach((c, i) => assert.equal(nextChapter(c.aspect).aspect, CHAPTERS[(i + 1) % CHAPTERS.length].aspect));
  assert.equal(nextChapter("humanityFuture").aspect, "finance");
  assert.equal(nextChapter("nope"), null);
  renderAspectPage(MAIN, STATE, "finance");
  const out = html();
  assert.match(out, /<section class="panel next-aspect"[^>]*data-next="physical">[\s\S]*?<a class="next-pull" href="#\/aspect\/physical" aria-label="Next: [^"]+, Physical">/);
  assert.match(out, /class="next-ring"[^>]*><circle[^>]*pathLength="100"\/><\/svg>/);
  // The last section on the page.
  assert.ok(out.lastIndexOf("next-aspect") > out.lastIndexOf("aspect-notes"));
});

test("v163: the pull is 0 at the peek, full after one short pull, and full where the page ends", async () => {
  const { pullProgress } = await import("../views/aspect-sheets.js");
  assert.equal(pullProgress({ shown: 0, pull: 180, left: 900 }), 0);
  assert.equal(pullProgress({ shown: 112, pull: 180, left: 900 }), 0);
  assert.equal(pullProgress({ shown: 112 + 90, pull: 180, left: 900 }), 0.5);
  assert.equal(pullProgress({ shown: 112 + 180, pull: 180, left: 900 }), 1);
  assert.equal(pullProgress({ shown: 112 + 400, pull: 180, left: 900 }), 1);
  assert.equal(pullProgress({ shown: 112 + 40, pull: 260, left: 0 }), 1, "the page has ended");
  assert.equal(pullProgress({ shown: 112 + 10, pull: 260, left: 0 }), 10 / 260, "but not on the peek's own edge");
});

test("v163: the ribbon, the hint on the right, round emblems, and the page's listeners end with the route", () => {
  renderAspectPage(MAIN, STATE, "mental");
  const out = html();
  assert.match(out, /<button type="button" class="aspect-ribbon" hidden style="--hue: #[0-9a-f]{6};" aria-label="Back to the top of [^"]+">/);
  const dots = out.match(/<span class="ribbon-dots" aria-hidden="true">(.*?)<\/span>/)[1];
  assert.equal((dots.match(/<i/g) || []).length, 8);
  assert.equal((dots.match(/class="on"/g) || []).length, 1);
  assert.match(out, /<span class="next-name"[^>]*>[\s\S]*?<span class="next-chev" aria-hidden="true"><i><\/i><i><\/i><\/span>\s*<span class="next-mark">/);
  const css = read("css/weekly.css");
  assert.match(css, /\.aspect-page \.page-top \.mark img \{ border-radius: 50%; \}/);
  assert.match(css, /html\[data-reduce-motion\] \.next-aspect \.next-chev i \{ animation: none; \}/);
  assert.match(css, /::view-transition-group\(lbi-emblem\)/);
  const app = read("app.js");
  assert.equal((app.match(/disposeMotion\(\);\n.*\n  endRoute\(\);/g) || []).length, 2);
  assert.match(read("views/aspect.js"), /onRouteEnd\(disposeAspectSheets\)/);
});

test("v162: notes folded at every width, footer off the aspect pages; v170: the stepper is a plain block", () => {
  const css = read("css/weekly.css");
  assert.match(read("views/aspect.js"), /bindFootnotes\(container, \{ fold: "always" \}\)/);
  assert.match(css, /body:has\(\.aspect-page\) \.site-footer \{ display: none; \}/);
  assert.doesNotMatch(css, /--pin-h|ps-track/);
  assert.match(css, /\.ps-card\[hidden\] \{ display: grid; visibility: hidden; \}/);
});

// --- Goals --------------------------------------------------------------------

test("the catalog offers every pledge type you do not have yet, one row each", () => {
  renderQuests(MAIN, { ...STATE, goals: [{ id: "g1", templateId: "water", target: 2, streak: 0, lastResult: null }] });
  const out = html();
  const rest = Object.keys(GOAL_TEMPLATES).filter(id => id !== "water");
  for (const id of rest) assert.match(out, new RegExp(`<li class="cat" data-template="${id}">`));
  assert.equal((out.match(/<li class="cat"/g) || []).length, rest.length);
  // The one you have is under "Your pledges", not offered again.
  assert.doesNotMatch(out, /data-add="water"/);
  assert.match(out, /data-pledge="g1"/);
  assert.match(out, /<button type="button" class="pill cat-add" data-add="sleep" aria-label="Add · Sleep"><span aria-hidden="true">\+<\/span><\/button>/);
});

test("Goals keeps to the pledge: short words, the unit as the label, the WHO figure as a note", () => {
  const goals = [
    { id: "g1", templateId: "sleep", target: 7, streak: 3, lastResult: { met: true, value: 7.2 } },
    { id: "g2", templateId: "water", target: 2, streak: 0, lastResult: null }
  ];
  renderQuests(MAIN, { ...STATE, goals });
  const out = html();
  assert.match(out, /Your weekly review checks each pledge for you\./);
  assert.match(out, /<h3 class="card-title" tabindex="-1">Sleep<\/h3>/);
  assert.match(out, /✓ Met last week · 7\.2 hours\/night/);
  assert.match(out, /<p class="pledge-meta">3-week streak<\/p>/);
  // An ungraded pledge says nothing about grading yet; no aspect name, no
  // points (the owner, v146).
  assert.doesNotMatch(out, /Graded at your next|listed first|Weekly target| pledge<\/h3>|Add Pledge|pledge-aspect|points a week/);
  assert.match(out, /<label for="cat-veg">Portions a day<\/label>/);
  assert.match(out, /<label for="cat-donations">Baht a month<\/label>/);
  // The WHO figures leave the line and become numbered notes, in page order.
  assert.doesNotMatch(out, /\(WHO:|\(600 meets/);
  assert.match(out, /<span id="cat-desc-veg">Average at least 5 vegetable portions per day\.<\/span><sup class="fn-ref"><a id="fnref-goal-veg"/);
  assert.match(out, /<li id="fn-goal-veg"[^>]*>[\s\S]*WHO recommends at least 400 g[\s\S]*href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/healthy-diet"/);
  assert.match(out, /<li id="fn-goal-metMinutes"[^>]*>[\s\S]*600 MET-minutes a week[\s\S]*NBK566046/);
  // Sleep's suggested 7 hours cites its guideline too; water's 2 L is a
  // convention and plastics has no guideline, so neither gets a note.
  assert.match(out, /<li id="fn-goal-sleep"[^>]*>[\s\S]*7 to 9 hours[\s\S]*pubmed\.ncbi\.nlm\.nih\.gov\/29073412/);
  assert.doesNotMatch(out, /fn-goal-water|fn-goal-plastics/);
  const before = (a, b) => out.indexOf(a) < out.indexOf(b);
  assert.equal(before('id="fn-goal-veg"', 'id="fn-goal-metMinutes"'), before("fnref-goal-veg", "fnref-goal-metMinutes"));
});

test("an empty pledge list says only that", () => {
  renderQuests(MAIN, STATE);
  assert.match(html(), /<p class="goals-none">No pledges yet\.<\/p>/);
});

test("Goals opens on a short top with the review button, not a full-screen hero", () => {
  renderQuests(MAIN, STATE);
  const out = html();
  assert.doesNotMatch(out, /class="hero"|goals-graded/);
  assert.match(out, /<h2 class="page-top-word">Weekly Pledges <small>0 active<\/small><\/h2>/);
  assert.match(out, /class="page-top-actions"><a class="pill" href="#\/review">/);
});

test("a full pledge list says so and disables every card", () => {
  const ids = Object.keys(GOAL_TEMPLATES).slice(0, PLEDGE_LIMIT);
  renderQuests(MAIN, { ...STATE, goals: ids.map((id, i) => ({ id: `g${i}`, templateId: id, target: 1, streak: 0, lastResult: null })) });
  const out = html();
  assert.match(out, /Pledge list is full/);
  assert.doesNotMatch(out, /data-add="[^"]+" aria-label="[^"]*">/, "an Add button stayed live on a full list");
});

test("removing a pledge asks on the page first", () => {
  const goals = [{ id: "g1", templateId: "water", target: 2, streak: 3, lastResult: null }];
  renderQuests(MAIN, { ...STATE, goals }, { confirm: "g1" });
  assert.match(html(), /data-confirm-remove="g1"/);
  assert.match(html(), /data-cancel-remove="g1"/);
});

// v170 (the owner: "the Goals on mobile phone"): Overview's phone rule that
// opens its pledge text into the header grid must not reach the Goals page,
// where it pushed each pledge's title and Remove off the screen.
test("Overview's phone pledge rule stays on Overview", () => {
  const css = read("css/home.css");
  assert.match(css, /\.home-pledges \.pledge-body,\n {2}\.pledge-count \{ display: contents; \}/);
  assert.doesNotMatch(css, /\n {2}\.pledge-body,\n/);
});

// v173, the owner: the weekly line left every aspect page, and Where to start
// stands still on a laptop, as Overview's does.
test("no aspect page says it is updated by the weekly review, and its cards only scroll on a phone", () => {
  for (const key of ["finance", "physical", "mental", "relationships", "personalGoals", "socialContribution", "environment", "humanityFuture"]) {
    renderAspectPage(MAIN, STATE, key);
    assert.doesNotMatch(html(), /Updated by your weekly review|next review opens next week/, key);
  }
  const css = read("css/weekly.css");
  const base = css.match(/\n\.aspect-page \.focus-rail \{[^}]*\}/)[0];
  assert.match(base, /grid-template-columns: repeat\(auto-fill/);
  assert.doesNotMatch(base, /overflow-x/);
});

// v174, the owner: the review happens on Sunday. It opens on Sunday and stays
// open through Saturday; Monday to Saturday keep the ISO week's own key.
test("the review week runs Sunday to Saturday, opening on Sunday", async () => {
  const { reviewWeekKey, isoWeekKey } = await import("../season.js");
  const { nextReviewDate } = await import("../views/review.js");
  const sat = new Date(2026, 9, 3);   // Saturday 3 Oct 2026
  const sun = new Date(2026, 9, 4);   // Sunday 4 Oct
  const mon = new Date(2026, 9, 5);   // Monday 5 Oct
  assert.equal(reviewWeekKey(sat), isoWeekKey(sat), "Saturday keeps its ISO week");
  assert.equal(reviewWeekKey(sun), isoWeekKey(mon), "Sunday opens the next review week");
  assert.equal(reviewWeekKey(mon), reviewWeekKey(sun), "Sunday and the Monday after are one review week");
  assert.match(nextReviewDate(new Date(2026, 9, 2)), /(^|\D)4(\D|$)/, "Friday's next review is that Sunday");
  assert.match(nextReviewDate(sun), /11/, "on a Sunday already reviewed, the next is a week on");
});

// v174: the portions say what an amount looks like, in the journey and the review.
test("the vegetable and water questions say what a portion and a litre look like", () => {
  const journey = read("views/journey.js");
  const review = read("views/review.js");
  assert.match(journey, /note: t\(FIELD_HINTS\.vegetablePortions\)/);
  assert.match(journey, /note: t\(FIELD_HINTS\.waterLiters\)/);
  assert.match(review, /FIELD_HINTS\[field\]/);
  assert.match(read("views/instrument-forms.js"), /80 g/);
});
