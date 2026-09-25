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
});

// --- an aspect page ---------------------------------------------------------

test("the trend lists the snapshots newest first, each against the week before", () => {
  const snapshots = [60, 62, 62, 59].map((v, i) => ({
    date: `2026-09-0${i + 1}T00:00:00.000Z`, aspects: { ...STATE.aspects, physical: v }
  }));
  renderAspectPage(MAIN, { ...STATE, snapshots }, "physical");
  const out = html();
  const dates = [...out.matchAll(/class="newsrow-date">([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(dates, ["2026.09.04", "2026.09.03", "2026.09.02", "2026.09.01"]);
  assert.match(out, /Score 59<small>−3 on the week before<\/small>/);
  assert.match(out, /Score 62<small>Same as the week before<\/small>/);
});

test("a quiet region's page says it is still on purpose, and a loud one does not", () => {
  renderAspectPage(MAIN, STATE, "relationships");
  assert.match(html(), /kept still on purpose/);
  renderAspectPage(MAIN, STATE, "physical");
  assert.doesNotMatch(html(), /kept still on purpose/);
});

// --- Goals --------------------------------------------------------------------

test("the catalog offers every pledge type, and one already taken is disabled", () => {
  renderQuests(MAIN, { ...STATE, goals: [{ id: "g1", templateId: "water", target: 2, streak: 0, lastResult: null }] });
  const out = html();
  for (const id of Object.keys(GOAL_TEMPLATES)) assert.match(out, new RegExp(`data-add="${id}"`));
  assert.match(out, /<button type="button" class="pill" data-add="water" disabled>Added<\/button>/);
  assert.match(out, /<button type="button" class="pill" data-add="sleep">Add Pledge<\/button>/);
});

test("a full pledge list says so and disables every card", () => {
  const ids = Object.keys(GOAL_TEMPLATES).slice(0, PLEDGE_LIMIT);
  renderQuests(MAIN, { ...STATE, goals: ids.map((id, i) => ({ id: `g${i}`, templateId: id, target: 1, streak: 0, lastResult: null })) });
  const out = html();
  assert.match(out, /Pledge list is full/);
  assert.doesNotMatch(out, /data-add="[^"]+">/, "an Add button stayed live on a full list");
});

test("removing a pledge asks on the page first", () => {
  const goals = [{ id: "g1", templateId: "water", target: 2, streak: 3, lastResult: null }];
  renderQuests(MAIN, { ...STATE, goals }, { confirm: "g1" });
  assert.match(html(), /data-confirm-remove="g1"/);
  assert.match(html(), /data-cancel-remove="g1"/);
});
