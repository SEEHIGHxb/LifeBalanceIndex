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
import { readFileSync } from "node:fs";

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
  // Its questions are drawn only once one is due; the next test's render
  // leans on this too.
  const { stateManager } = await import("../state.js");
  stateManager.isCheckinDue = () => true;
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

// v167, the owner's plan: the Weekly Review's list of screens, its ending in
// place of a toast, and a not-due page with the month's bar and the past ones.
test("v167: the re-assessment's step list, ending, not-due page and toasts", async () => {
  const { renderCheckin } = await import("../views/assessments.js");
  const { stateManager } = await import("../state.js");
  const due = stateManager.isCheckinDue;
  stateManager.isCheckinDue = () => true;
  const form = render(() => renderCheckin(MAIN, STATE, () => {}));
  const screens = form.split('<section class="survey-page assess-panel').slice(1);
  assert.equal(screens.length, 3);
  screens.forEach((sec, i) => {
    assert.equal((sec.match(/<ol class="rv-steps">/g) || []).length, 1, `screen ${i} has one step list`);
    assert.equal((sec.match(/class="rv-jump" data-to="/g) || []).length, i, `screen ${i}: only earlier screens are buttons`);
    assert.match(sec, /class="q-count sr-only"/);
  });
  assert.match(form, /<section class="rv-ending d-none" id="rv-ending"/);

  stateManager.isCheckinDue = () => false;
  const last = stateManager.lastCalibrationDate;
  const next = stateManager.nextCheckinDate;
  stateManager.lastCalibrationDate = () => new Date(Date.now() - 14 * 864e5).toISOString();
  stateManager.nextCheckinDate = () => new Date(Date.now() + 14 * 864e5);
  try {
    const page = render(() => renderCheckin(MAIN, { ...STATE, checkins: [
      { date: "2026-08-01T00:00:00.000Z", sums: {}, shifts: { mental: 2 } },
      { date: "2026-09-01T00:00:00.000Z", sums: {}, shifts: { mental: -3, relationships: 1 } }
    ] }, () => {}));
    assert.match(page, /class="ck-month" aria-hidden="true"><i style="width: 50%;">/);
    const dates = [...page.matchAll(/class="rv-week-date">([^<]*)</g)].map(m => m[1]);
    assert.deepEqual(dates, ["2026.09.01", "2026.08.01"], "newest first");
    const none = render(() => renderCheckin(MAIN, { ...STATE, checkins: [] }, () => {}));
    assert.doesNotMatch(none, /ck-recent/, "nothing to list before the first one");
  } finally {
    stateManager.isCheckinDue = due;
    stateManager.lastCalibrationDate = last;
    stateManager.nextCheckinDate = next;
  }

  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const app = read("app.js");
  assert.doesNotMatch(app, /Re-assessment complete: \{parts\}/, "the ending says what moved, not a toast");
  assert.doesNotMatch(app, /popup\.style\./, "the toast's look is the stylesheet's");
  assert.match(read("css/frame.css"), /\.toast \{[^}]*font-family: var\(--font-sans\)/);
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

// v149, the owner's cut list: plain titles, the questionnaire's official name
// kept as a small note, no "Region n of 8" or theme line, "Finish" to submit,
// and "Select" on the select boxes.
test("onboarding titles are plain words, with the questionnaire named in a note", async () => {
  const { renderOnboarding } = await import("../views/onboarding.js");
  const { INSTRUMENTS } = await import("../surveys.js");
  const html = render(() => renderOnboarding(MAIN, () => {}));

  const titles = [...html.matchAll(/<h2 class="q-title"[^>]*>([\s\S]*?)<\/h2>/g)].map(m => m[1]);
  for (const { title } of Object.values(INSTRUMENTS)) {
    assert.ok(
      html.includes(`Questionnaire: ${title}`.replace(/&/g, "&amp;")),
      `"${title}" is not named in a questionnaire note`
    );
    assert.ok(!titles.some(h => h.includes(title)), `"${title}" is still a screen heading`);
  }
  assert.ok(html.includes("Questionnaire: Weekly Physical Activity (IPAQ)"), "the activity screen lost its IPAQ note");
  assert.doesNotMatch(html, /Region \d+ of \d+|Region complete/, "the side column still counts regions");
  assert.doesNotMatch(html, /class="q-theme"/, "the side column still carries the theme line");
  assert.match(html, /<button type="submit"[^>]*>Finish<\/button>/, "the last button does not read Finish");
  assert.doesNotMatch(html, /Complete Assessment|— Select —/);
  assert.match(html, />Select<\/option>/, "the select placeholder is not Select");
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

// A tester answered every screen of the baseline and then could not press
// "Complete Assessment": the button did nothing at all. Their weight was 65.5.
// A number input with no `step` only accepts whole numbers to the BROWSER, so
// native validation refused the form -- and since that input sat on a screen
// hidden with display:none, the browser could not show its bubble either, and
// dropped the submit with nothing but a console line. validateScope had
// already accepted 65.5 on the weight screen's own Next, so nothing on the
// page said why. The JS validator is the only authority on these forms; a
// form that holds a number box must opt out of the browser's second opinion.
function formsWithNumberInputs(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)]
    .filter(([, , body]) => body.includes('type="number"'))
    .map(([, attrs]) => attrs);
}

test("the baseline form leaves validation to validateScope, so a decimal answer cannot block Complete Assessment", async () => {
  const { renderOnboarding } = await import("../views/onboarding.js");
  const html = render(() => renderOnboarding(MAIN, () => {}));
  const forms = formsWithNumberInputs(html);
  assert.equal(forms.length, 1, "the baseline is expected to be one form holding its number boxes");
  assert.match(forms[0], /\bnovalidate\b/,
    "#onboarding-form must carry novalidate: a native step/min/max failure on a hidden screen silently swallows the submit");
});

test("every assessment form holding a number box leaves validation to validateScope", async () => {
  const { renderDeepAssessment } = await import("../views/assessments.js");
  const html = render(() => renderDeepAssessment(MAIN, STATE, () => {}));
  const forms = formsWithNumberInputs(html);
  for (const attrs of forms) {
    assert.match(attrs, /\bnovalidate\b/, `form${attrs} holds a number box but lets the browser validate it`);
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
  // The Mental page is where the numbers always are: no close button there.
  assert.ok(!mental.includes("care-banner-close"), "the Mental page notice must not be closable");
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
  // `assessmentComplete: false` is the express-onboarding flag: the sections it
  // skipped are unanswered, so their scores rest on defaults. Since v141 each
  // such score is marked † and the notes at the end say what that means.
  const { renderDashboard } = await import("../views/dashboard.js");
  const html = render(() => renderDashboard(MAIN, {
    ...STATE,
    profile: { ...STATE.profile, assessmentComplete: false },
    baseline: { ...STATE.baseline, answered: { cfpb: true, jss: true } }
  }, () => {}));
  assert.ok(html.includes('class="ar-est"'), "an express save marked no score as an estimate");
  assert.ok(html.includes('id="fn-estimate"'), "an express save got no note on its estimates");
});

// --- views/lumi.js ------------------------------------------------------

test("the assistant tip names the weakest aspect, not the first one", async () => {
  const { getLumiTip } = await import("../views/lumi.js");
  // socialContribution is lowest here but appears sixth, so a naive "first key"
  // implementation passes on a sorted fixture and fails on this one.
  const tip = getLumiTip({ ...STATE.aspects, socialContribution: 12 });
  assert.match(tip, /giving|kindness|donation/i);
});

test("the assistant falls back rather than rendering an empty tip", async () => {
  const { getLumiTip } = await import("../views/lumi.js");
  const tip = getLumiTip({ notAnAspect: 5 });
  assert.ok(tip.length > 0, "an unknown aspect produced an empty tip");
});

// --- v77: A SCORE-BASED GRADE MUST NOT SPEAK IN POPULATION TERMS ---------

test("the Finance grade card does not contradict the percentile beside it", async () => {
  // The defect this pins shipped in v77's own second commit. Finance moved onto
  // its composite score, but the grade-explainer card kept the shared copy —
  // "{band} of {population}, from the population comparison below" — so the page
  // printed "Grade B — Top 30% of Thai workers, from the population comparison
  // below" four lines above "Ahead of about 1% of Thai workers". Both from the
  // same render, for a 3,000 THB earner.
  const { renderAspectPage } = await import("../views/aspect.js");
  const state = {
    ...STATE,
    profile: { ...STATE.profile, income: 3000, region: "Provinces", age: 40 },
    aspects: { ...STATE.aspects, finance: 73 }
  };
  const html = render(() => renderAspectPage(MAIN, state, "finance"));
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  assert.match(text, /Grade B/, "the grade still renders");
  assert.match(text, /from your score of 73/, "and says where it came from");
  assert.doesNotMatch(text, /Top 30% of/,
    "a score-based grade must not claim a share of the population");
  assert.doesNotMatch(text, /from the population comparison below/,
    "and must not point at a percentile it was not computed from");
  // The income percentile is still shown — it just is not the grade any more.
  assert.match(text, /1st percentile/, "the income rank is still on the card");
});

// The aspect page tells you your character, the two sides it came from,
// the research, and that it is made up for fun (v122).
test("an aspect page shows your character with its research and the made-up disclaimer", async () => {
  const { renderAspectPage } = await import("../views/aspect.js");
  const html = render(() => renderAspectPage(MAIN, STATE, "finance"));
  assert.match(html, /class="panel statement aspect-character"/);
  assert.match(html, /class="character-name">/);
  assert.match(html, /The four characters in this region: [^<]*<b>/, "the cast is in the note, yours in bold");
  assert.match(html, /made up for fun/);
});
