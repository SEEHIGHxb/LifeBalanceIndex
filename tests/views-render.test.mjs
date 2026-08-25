// tests/views-render.test.mjs - behavioural cover for the four view modules no
// test imported at all.
//
// WHY THIS FILE EXISTS, stated plainly because the coverage number was lying.
//
// The repo's gate is 80% lines / 70% functions and the report read 91.42% /
// 90.37% — comfortably green. It was green by EXCLUSION: `node --test` only
// instruments modules something imports, and nothing imported views/aspect.js,
// views/dashboard.js, views/assessments.js or views/assistant.js, so ~700 lines
// were not failing the gate, they were invisible to it.
//
// tests/e2e.mjs does drive these pages in a real browser, but it runs under
// Playwright in a separate CI job and is deliberately kept out of the
// `tests/*.test.mjs` glob, so it contributes nothing to the gate either.
//
// The concrete failure this guards: v72 and v73 added instrument blocks to the
// monthly check-in by hand, and every check on them was a manual browser
// walkthrough. If a future edit dropped `instrumentBlock("citlearn")` from that
// form, the aspect would quietly fall back to its pre-v73 weighting and keep
// producing plausible-looking scores. Nothing in CI would have noticed.
//
// Same harness as views-xss.test.mjs: these render functions only ever call
// document.getElementById(id) and assign .innerHTML, so a small stub captures
// the exact string handed to the parser. No happy-dom, no new dependency.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

// The container every view under test writes its page into.
const MAIN = "main-view";

// Returns the markup written to the MAIN container specifically. Views that
// also write a secondary panel (renderAspectPage writes its trend chart into a
// second id) must not have those writes counted as the page.
function render(fn) {
  const dom = installDom();
  fn();
  return dom.html[MAIN] || "";
}

beforeEach(() => installDom());

// A fully-onboarded save. Deliberately built from DEFAULT_STATE rather than
// hand-written, so a future field with no default here still arrives with the
// shape the app expects instead of undefined.
const STATE = {
  ...DEFAULT_STATE,
  onboarded: true,
  profile: {
    ...DEFAULT_STATE.profile,
    name: "Fixture", level: 34, age: 34,
    gender: "female", region: "Provinces", employment: "Office Worker",
    relationshipStatus: "Single",
    income: 30000, savingsRate: 10, weight: 60, height: 170,
    weeklyLearningHours: 3, digitalLiteracy: 50,
    sleepHours: 7, waterLiters: 2, vegetablePortions: 3,
    weeklyVigorousDays: 2, weeklyVigorousMins: 30,
    weeklyModerateDays: 3, weeklyModerateMins: 30,
    weeklyWalkingDays: 5, weeklyWalkingMins: 20,
    monthlyDonations: 300, volunteeringHours: 2, singleUsePlastics: 3
  },
  aspects: {
    finance: 55, physical: 62, mental: 71, relationships: 48,
    personalGoals: 70, socialContribution: 44, environment: 58, humanityFuture: 51
  },
  baseline: {
    date: "2026-08-01T00:00:00.000Z",
    cfpb: 10, jss: 12, st5: 5, who5: 15, lsns: 15, ucla: 5, ras: null,
    gse: 18, citacc: 12, citlearn: 12, grit: 12, ptm: 10, geb: 12,
    lfis: 12, lfisItems: 6,
    answered: {
      cfpb: true, jss: true, st5: true, who5: true, lsns: true, ucla: true,
      ras: true, gse: true, citacc: true, citlearn: true, grit: true,
      ptm: true, geb: true, lfis: true
    }
  },
  reviews: [],
  checkins: [],
  goals: []
};

const ASPECT_KEYS = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

// --- views/assessments.js ------------------------------------------------
//
// The monthly check-in is the form that re-measures Mental, Relationships and
// Personal Goals. Which instruments it carries is a SCORING fact, not a layout
// one: state.js re-reads every sum this form collects, so an instrument missing
// here is an instrument that silently stops being re-measured.

// Every instrument renderCheckin must collect, and why it is in the list.
const CHECKIN_INSTRUMENTS = [
  { key: "who5", feeds: "Mental" },
  { key: "st5", feeds: "Mental" },
  { key: "ucla", feeds: "Relationships" },
  { key: "gse", feeds: "Personal Goals" },
  { key: "citacc", feeds: "Personal Goals (v72)" },
  { key: "citlearn", feeds: "Personal Goals (v73)" }
];

test("the monthly check-in carries every instrument it re-scores", async () => {
  const { renderCheckin } = await import("../views/assessments.js");
  const html = render(() => renderCheckin(MAIN, STATE, () => {}));

  for (const { key, feeds } of CHECKIN_INSTRUMENTS) {
    assert.ok(
      html.includes(`name="${key}-q0"`),
      `the check-in form is missing ${key}, which feeds ${feeds}. ` +
      "state.js still reads its sum, so the aspect would fall back to an older weighting and keep looking plausible."
    );
  }
});

test("the check-in asks a coupled user about their relationship and a single user not at all", async () => {
  const { renderCheckin } = await import("../views/assessments.js");

  const single = render(() => renderCheckin(MAIN, STATE, () => {}));
  assert.ok(!single.includes('name="ras-q0"'), "RAS asked of a single user");

  const coupled = render(() => renderCheckin(MAIN, { ...STATE, profile: { ...STATE.profile, relationshipStatus: "Married" } }, () => {}));
  assert.ok(coupled.includes('name="ras-q0"'), "RAS not asked of a coupled user");
});

test("the in-depth assessment renders its sections", async () => {
  const { renderDeepAssessment } = await import("../views/assessments.js");
  const html = render(() => renderDeepAssessment(MAIN, STATE, () => {}));
  assert.ok(html.length > 500, "deep assessment rendered nothing substantial");
  assert.ok(!/undefined|NaN/.test(html), "a missing value reached the page");
});

// --- views/onboarding.js -------------------------------------------------
//
// The same completeness argument as the check-in, and a stronger one: this form
// is the ONLY place several instruments are ever asked. An instrument missing
// here is never collected at all, and its aspect scores from defaults forever.

test("onboarding asks every instrument the app scores", async () => {
  const { renderOnboarding } = await import("../views/onboarding.js");
  const { INSTRUMENTS } = await import("../surveys.js");
  const html = render(() => renderOnboarding(MAIN, () => {}));

  for (const key of Object.keys(INSTRUMENTS)) {
    assert.ok(
      html.includes(`name="${key}-q0"`),
      `onboarding never asks ${key}, so its baseline sum would be 0 forever. ` +
      "Every instrument in surveys.js must be collected somewhere, and this is the only form that collects them all."
    );
  }
});

test("onboarding asks every question of every instrument, not just the first", async () => {
  // A truncated block is the quieter failure: the form still looks right, the
  // sum is just short, and the score is wrong by a defensible-looking amount.
  const { renderOnboarding } = await import("../views/onboarding.js");
  const { INSTRUMENTS } = await import("../surveys.js");
  const html = render(() => renderOnboarding(MAIN, () => {}));

  for (const [key, instrument] of Object.entries(INSTRUMENTS)) {
    for (let i = 0; i < instrument.items.length; i++) {
      assert.ok(
        html.includes(`name="${key}-q${i}"`),
        `onboarding is missing ${key} item ${i + 1} of ${instrument.items.length}`
      );
    }
  }
});

// --- views/aspect.js -----------------------------------------------------

test("every aspect page renders, for all eight aspects", async () => {
  const { renderAspectPage } = await import("../views/aspect.js");
  for (const key of ASPECT_KEYS) {
    const html = render(() => renderAspectPage(MAIN, STATE, key));
    assert.ok(html.length > 500, `${key}: rendered nothing substantial`);
    assert.ok(
      !/undefined|NaN/.test(html),
      `${key}: an undefined or NaN value reached the page`
    );
  }
});

test("an unknown aspect key renders nothing rather than a broken page", async () => {
  const { renderAspectPage } = await import("../views/aspect.js");
  const html = render(() => renderAspectPage(MAIN, STATE, "notAnAspect"));
  assert.equal(html, "", "an unknown aspect key produced markup");
});

test("the Mental page carries the help notice and the others do not", async () => {
  // The notice is a duty-of-care feature, not decoration: it is the one place
  // the app points at real help. It must not go missing from the page it
  // belongs to, and it must not leak onto pages where it would be noise.
  //
  // Note the lever: the notice keys off the RAW WHO-5 and ST-5 sums, not off
  // the finished Mental score. Lowering `aspects.mental` does not trigger it,
  // which is correct — a composite that fell for an unrelated reason is not
  // evidence about anyone's wellbeing.
  const { renderAspectPage } = await import("../views/aspect.js");

  const low = { ...STATE, baseline: { ...STATE.baseline, who5: 5 } };
  const mental = render(() => renderAspectPage(MAIN, low, "mental"));
  const finance = render(() => renderAspectPage(MAIN, low, "finance"));

  assert.ok(mental.includes("care-banner"), "the Mental page lost its help notice");
  assert.ok(!finance.includes("care-banner"), "the help notice leaked onto Finance");
});

// --- views/dashboard.js --------------------------------------------------

test("the dashboard renders every aspect card", async () => {
  const { renderDashboard } = await import("../views/dashboard.js");
  const html = render(() => renderDashboard(MAIN, STATE, () => {}));
  for (const key of ASPECT_KEYS) {
    assert.ok(html.includes(key), `the dashboard is missing ${key}`);
  }
  assert.ok(!/undefined|NaN/.test(html), "a missing value reached the dashboard");
});

test("a quick-start save is told its baseline is partial", async () => {
  // `assessmentComplete: false` is the express-onboarding flag. The note is the
  // only thing telling that user their scores rest on defaults.
  const { renderDashboard } = await import("../views/dashboard.js");
  const html = render(() => renderDashboard(MAIN, {
    ...STATE,
    profile: { ...STATE.profile, assessmentComplete: false }
  }, () => {}));
  assert.ok(html.includes("quickstart-note"), "an express save got no partial-baseline note");
});

// --- views/assistant.js --------------------------------------------------

test("the assistant tip names the weakest aspect, not the first one", async () => {
  const { getLumiTip } = await import("../views/assistant.js");
  // socialContribution is lowest here but appears sixth, so a naive "first key"
  // implementation passes on a sorted fixture and fails on this one.
  const tip = getLumiTip({ ...STATE.aspects, socialContribution: 12 });
  assert.match(tip, /giving|kindness|donation/i);
});

test("the assistant falls back rather than rendering an empty tip", async () => {
  const { getLumiTip } = await import("../views/assistant.js");
  const tip = getLumiTip({ notAnAspect: 5 });
  assert.ok(tip.length > 0, "an unknown aspect produced an empty tip");
});
