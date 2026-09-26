// The screens the prototype never drew (redesign R6): the Re-assessment and
// the in-depth assessment in the journey's mission panels, privacy.html in the
// frame, and the old frame's styles gone.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

const MAIN = "main-view";
const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");
let dom;
beforeEach(() => { dom = installDom(); });

installDom();
const { renderCheckin, renderDeepAssessment } = await import("../views/assessments.js");
const { DEEP_SECTIONS } = await import("../surveys.js");
const { stateManager } = await import("../state.js");
// The Re-assessment's questions are drawn only once one is due.
stateManager.isCheckinDue = () => true;

const STATE = { ...DEFAULT_STATE, onboarded: true, profile: { ...DEFAULT_STATE.profile, relationshipStatus: "Single" } };
const html = () => dom.html[MAIN] || "";
const panels = (out) => out.split('class="survey-page assess-panel"').slice(1);
const between = (out, from, to) => out.slice(out.indexOf(`id="${from}"`), out.indexOf(`id="${to}"`));

// --- the Re-assessment --------------------------------------------------------

test("the Re-assessment asks each aspect's questionnaires in that region's panel", () => {
  renderCheckin(MAIN, STATE, () => {});
  const out = html();
  assert.match(out, /class="stage-page textpage assess checkin-view"/);
  assert.doesNotMatch(out, /aspect-back|onboarding-container/, "the old frame's back link and card are gone");
  // Each option of a question repeats its name, so keep the first of each.
  const found = panels(out).map(p => [...new Set([...p.matchAll(/name="(\w+)-q0"/g)].map(m => m[1]))]);
  assert.deepEqual(found, [["who5", "st5"], ["ucla"], ["gse", "citacc", "citlearn"]]);
  // One form around every panel, so a single submit still collects all seven.
  assert.equal((out.match(/<form /g) || []).length, 1);
  assert.equal((out.match(/type="submit"/g) || []).length, 1);
  assert.match(out, /id="checkin-error" class="onboarding-error d-none" role="alert"/);
});

test("no panel on the assessments moves", () => {
  renderCheckin(MAIN, STATE, () => {});
  const checkin = panels(html());
  renderDeepAssessment(MAIN, STATE, () => {});
  const deep = panels(html());
  for (const p of [...checkin, ...deep]) {
    assert.match(p, /^\s*data-quiet/, "every panel is data-quiet, so the answer pills do not rise");
    assert.doesNotMatch(p, /class="typed"/, "no typed headings");
  }
});

// --- the in-depth assessment ----------------------------------------------------

test("the in-depth assessment is one panel per aspect, each saved on its own", () => {
  renderDeepAssessment(MAIN, STATE, () => {});
  const out = html();
  for (const s of DEEP_SECTIONS) {
    assert.match(out, new RegExp(`id="deep-section-${s.aspect}"`), `${s.aspect}'s panel is missing`);
    assert.match(out, new RegExp(`class="deep-form" data-aspect="${s.aspect}"`));
  }
  assert.equal(panels(out).length, DEEP_SECTIONS.length);
  assert.doesNotMatch(out, /class="assess-done"/, "nothing is marked in-depth before it is done");
  // The runway figures stay in the finance panel, as their own form.
  assert.match(between(out, "deep-section-finance", "deep-section-physical"), /<form id="deep-runway-form"[\s>]/);
});

test("a finished section is marked In-depth beside its region", () => {
  const done = { ...STATE, baseline: { ...STATE.baseline, deepDone: { mental: true } } };
  renderDeepAssessment(MAIN, done, () => {});
  const out = html();
  const mental = between(out, "deep-section-mental", "deep-section-relationships");
  assert.match(mental, /class="assess-done"/);
  assert.match(mental, /Update this section/);
  assert.equal((out.match(/class="assess-done"/g) || []).length, 1, "only the finished section is marked");
});

// --- Privacy and the frame -------------------------------------------------------

test("privacy.html is the text page in the frame, still without a script", () => {
  const page = read("privacy.html");
  assert.match(page, /script-src 'none'/);
  assert.doesNotMatch(page, /<script/);
  assert.match(page, /href="\.\/css\/frame\.css\?v=\d+"/);
  assert.match(page, /class="stage-page textpage privacy-page"/);
  assert.match(page, /class="site-header"/);
  assert.doesNotMatch(page, /class="card/, "no old cards left");
  // Every section of the statement survived the move.
  for (const heading of ["What data the app holds", "Where it is stored", "When data leaves your device",
    "Connected apps", "Third parties", "Deleting your data", "Thailand PDPA note", "Not medical advice"]) {
    assert.match(page, new RegExp(`<h2 class="label">\\(${heading}\\)</h2>`), `${heading} is missing`);
  }
});

test("every screen is full-bleed and the old frame's styles are gone", () => {
  assert.doesNotMatch(read("app.js"), /classList\.(toggle|add)\("bleed"/);
  const css = read("index.css");
  for (const dead of ["body.bleed", ".onboarding-container", ".aspect-back", ".radar-legend", ".sbs-table", ".deep-section-head"]) {
    assert.ok(!css.includes(dead), `index.css still styles ${dead}`);
  }
});

test("a Re-assessment opened before one is due says when it opens and asks nothing", () => {
  stateManager.isCheckinDue = () => false;
  const nextCheckinDate = stateManager.nextCheckinDate;
  stateManager.nextCheckinDate = () => new Date("2026-10-24T00:00:00.000Z");
  try {
    renderCheckin(MAIN, STATE, () => {});
  } finally {
    stateManager.isCheckinDue = () => true;
    stateManager.nextCheckinDate = nextCheckinDate;
  }
  const out = html();
  // The date is in the reader's locale ("24 Oct" or "Oct 24").
  assert.match(out, /The next re-assessment opens on [^<]*24[^<]*\./);
  assert.doesNotMatch(out, /<form|name="who5-q0"/, "no questions to answer for nothing");
  assert.match(out, /href="#\/dashboard"/);
});
