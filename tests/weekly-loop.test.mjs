// The weekly loop (redesign R4): the Weekly Review's screens, an aspect page's
// trend list, and the Goals catalog. Rendered into the DOM stub and read back
// as HTML; the motion is covered by tests/moments-e2e.mjs.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

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
  const dates = [...html().matchAll(/class="newsrow-date">([^<]*)</g)].map(m => m[1]);
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
  assert.match(out, /class="aspect-score-badge"/, "the grade and score sit in the top");
  assert.ok(out.indexOf("page-top") < out.indexOf("aspect-society"));
  // Where it stands is said once, in the top, not again under the gauge.
  assert.equal((out.match(/Ahead of about/g) || []).length, 1);
  assert.match(out, /class="part-row"/);
  // v143: the facts sit under the components with no heading, their note
  // marked on the first; the runway is gone.
  assert.match(out, /<ul class="fact-list facts">\s*<li class="fact-row">\s*<span class="fact-label">Monthly saving<sup class="fn-ref"><a id="fnref-facts"/);
  assert.doesNotMatch(out, /Measured, Not Scored|Runway/);
  assert.match(out, /class="careers-row aspect-measured"/);
});

// v142, the owner's cut list: the page keeps what a first-time reader needs;
// the reasoning, the research and the sources are numbered notes at its end.
test("an aspect page's explanations are numbered notes at its end, in reading order", () => {
  renderAspectPage(MAIN, STATE, "physical");
  const out = html();
  for (const gone of ["<details", "percentile-band", "focus-meta", "How this is worked out", "· typical range", "Standing vs Society", "Component Breakdown", "Suggested Focus", "re-measures this aspect from"]) {
    assert.ok(!out.split('class="panel statement aspect-notes"')[0].includes(gone), `${gone} is still in the page's main view`);
  }
  for (const heading of ["How you compare", "What it(&#39;|')s made of", "Where to start", "Notes and sources"]) assert.match(out, new RegExp(heading));
  const marks = [...out.matchAll(/<a id="fnref-([a-z]+)" href="#fn-\1" data-jump="fn-\1" aria-label="Note (\d)">\2<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(marks, [["grade", "1"], ["character", "2"], ["compare", "3"], ["guidelines", "4"]]);
  // The character's mark ends its line, not its name (the owner, v143).
  assert.match(out, /class="character-line">[^<]+<sup class="fn-ref"><a id="fnref-character"/);
  const notes = out.slice(out.indexOf('class="panel statement aspect-notes"'));
  assert.deepEqual([...notes.matchAll(/<li id="fn-([a-z]+)"/g)].map(m => m[1]), ["grade", "character", "compare", "guidelines"]);
  assert.match(notes, /made up for fun/, "the character's disclaimer is kept");
  assert.match(notes, /“Percentile” = the share of people you're ahead of/);
  assert.match(notes, /class="fn-sources"><li><a href="https:/, "the sources are listed");
  assert.ok(out.lastIndexOf("aspect-focus") < out.indexOf("aspect-notes"), "the notes come last");
});

test("the guideline checks show open, their explanation a note", () => {
  renderAspectPage(MAIN, STATE, "mental");
  const out = html();
  assert.match(out, /<div class="criteria-card">\s*<p class="criteria-head"><span class="card-header">Guideline checks<\/span><sup class="fn-ref"><a id="fnref-guidelines"/);
  // The note's number is the way back; no "↑" (the owner, v143).
  assert.match(out, /<li id="fn-guidelines"[^>]*><a class="fn-mark" href="#fnref-guidelines" data-jump="fnref-guidelines"[^>]*>\d<\/a><div class="fn-body"><p>These compare you with published health guidelines/);
  assert.doesNotMatch(out, /fn-back|↑/);
});

// v143 (the owner): an unranked aspect has no comparison section; "Not ranked"
// in the top carries the note that says why.
test("an unranked aspect says so in the top, and why in a note", () => {
  renderAspectPage(MAIN, STATE, "relationships");
  const out = html();
  assert.match(out, /class="page-top-lead aspect-standing">Not ranked<sup class="fn-ref"><a id="fnref-grade"/);
  assert.doesNotMatch(out, /aspect-society|on purpose/);
  assert.match(out, /<li id="fn-grade"[^>]*>[\s\S]*A grade is a rank against a population/);
});

test("the trend waits for a second week rather than repeat the score", () => {
  const snap = (v, d) => ({ date: `2026-09-0${d}T00:00:00.000Z`, aspects: { ...STATE.aspects, physical: v } });
  renderAspectPage(MAIN, { ...STATE, snapshots: [snap(60, 1)] }, "physical");
  assert.doesNotMatch(html(), /aspect-trend/);
  renderAspectPage(MAIN, { ...STATE, snapshots: [snap(60, 1), snap(62, 8)] }, "physical");
  assert.match(html(), /class="trend-strip"/);
});

test("a quiet region's page says it is still on purpose, and a loud one does not", () => {
  renderAspectPage(MAIN, STATE, "mental");
  assert.match(html(), /kept still on purpose/);
  renderAspectPage(MAIN, STATE, "physical");
  assert.doesNotMatch(html(), /kept still on purpose/);
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
