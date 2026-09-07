// Layout guards for the phone fold.
//
// These pin three facts that were each invisible to every other kind of test:
// the CSS parsed, the JS ran, the markup was valid, the strings were
// translated — and the first screen of a wellbeing dashboard still contained no
// wellbeing data. Measured at 375x812 before v78:
//
//   care banner   y=  87  h=271
//   deep-banner   y= 376  h=161   <- the "answer 80 more questions" upsell
//   identity      y= 537  h=186
//   Balance Index y= 762           <- the first score, ON the fold line
//   radar         y= 861           <- below it
//   first aspect  y=2113
//
// Two separate causes, fixed separately and guarded separately below.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const MAIN = "main-view";

beforeEach(() => installDom());

// --- CAUSE 1: the mobile reordering never ran ------------------------------
//
// index.css dissolves the two desktop columns on a phone and reorders the
// cards so the radar leads. It had one fallback rule and six specific ones:
//
//   .dashboard-grid .card { order: 90; }   <- specificity (0,2,0)
//   .dash-radar           { order: 1;  }   <- specificity (0,1,0)
//
// The fallback out-specified every one of them, so all six cards resolved to
// order 90, tied, and flex fell back to DOM order. A stylesheet cannot fail;
// it just quietly does nothing.

test("the dashboard order rules out-specify their own fallback", () => {
  const css = read("index.css");
  const fallback = css.match(/(\S[^{}\n]*)\{\s*order:\s*90;\s*\}/);
  assert.ok(fallback, "index.css must keep a default order for unclassed cards");

  // Count the class selectors on each side. The fallback may never carry more
  // than the specific rules do, or it silently wins and nothing reorders.
  const classes = (sel) => (sel.match(/\./g) || []).length;
  const fallbackWeight = classes(fallback[1]);

  const specific = [...css.matchAll(/(\S[^{}\n]*?)\{\s*order:\s*([1-9]);\s*\}/g)];
  assert.ok(specific.length >= 6, `expected the six ordered dashboard cards, found ${specific.length}`);

  for (const [, sel, ord] of specific) {
    assert.ok(
      classes(sel) >= fallbackWeight,
      `"${sel.trim()}" (order ${ord}) is less specific than the fallback ` +
      `"${fallback[1].trim()}", so every card ties at order 90 and the phone ` +
      `renders in DOM order instead`
    );
  }
});

test("the radar is ordered ahead of the identity card on a phone", () => {
  // The intent, stated as an assertion rather than left in a comment: the
  // reader's scores come before the reader's name.
  const css = read("index.css");
  const orderOf = (cls) => {
    const m = css.match(new RegExp(`\\.${cls}\\s*\\{\\s*order:\\s*(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  const radar = orderOf("dash-radar");
  const index = orderOf("dash-index");
  const identity = orderOf("dash-identity");
  assert.ok(radar !== null && index !== null && identity !== null);
  assert.ok(radar < identity, "the radar must precede the identity card");
  assert.ok(index < identity, "the Balance Index must precede the identity card");
});

// --- CAUSE 2: the upsell sat above the scores ------------------------------

test("the in-depth offer renders below the scores, not in the top prompt stack", async () => {
  const { renderDashboard } = await import("../views/dashboard.js");
  const dom = installDom();
  renderDashboard(MAIN, STATE, () => {});
  const html = dom.html[MAIN] || "";

  const deep = html.indexOf("deep-banner");
  const grid = html.indexOf("dashboard-grid");
  const scores = html.indexOf("dash-scores");
  assert.ok(deep > -1, "the in-depth offer should render for a non-verified save");
  assert.ok(grid > -1 && scores > -1);
  assert.ok(
    deep > scores,
    "the in-depth offer must come AFTER the aspect scores in the document. " +
    "It asks the reader to answer eighty more questions for 'more accurate " +
    "scores'; above the scores, that is an argument about numbers they have " +
    "not been shown yet."
  );
});

test("the offer still disappears once every aspect is deep-verified", () => {
  // The move must not turn a conditional card into a permanent one.
  const css = read("views/dashboard.js");
  assert.match(css, /if \(deepDone >= deepTotal\) return "";/);
});

// --- The floating assistant's fixed bubble ---------------------------------

test("the assistant's phone breakpoint matches the stylesheet's", () => {
  // The bubble is position:fixed and full-width on a phone, so it sits on top
  // of whatever is scrolled under it — measured at y=645..734, covering the
  // level badge outright. app.js folds it away after a dwell, but only on the
  // viewport the stylesheet treats as a phone. If these two numbers drift the
  // bubble simply stops folding, on exactly the screens where it does harm.
  const js = read("app.js").match(/LUMI_PHONE_MAX_PX\s*=\s*(\d+)/);
  assert.ok(js, "app.js must name the phone breakpoint as a constant");
  const css = read("index.css");
  // .assistant-wrapper is declared twice: once at the top level and once inside
  // the phone media query that repositions it. Walk the braces backwards from
  // the second declaration to find the block that actually encloses it — a
  // lazy regex would happily span from the first @media in the file.
  const at = css.lastIndexOf(".assistant-wrapper {");
  assert.ok(at > -1, "index.css must style .assistant-wrapper");
  let depth = 0;
  let openedAt = -1;
  for (let i = at; i >= 0; i--) {
    if (css[i] === "}") depth++;
    else if (css[i] === "{") {
      if (depth === 0) { openedAt = i; break; }
      depth--;
    }
  }
  const enclosing = openedAt > -1
    ? css.slice(css.lastIndexOf("@media", openedAt), openedAt).match(/max-width:\s*(\d+)px/)
    : null;
  assert.ok(enclosing, "index.css must reposition .assistant-wrapper inside a phone media query");
  assert.equal(
    js[1], enclosing[1],
    `app.js folds the bubble below ${js[1]}px but the stylesheet repositions ` +
    `it below ${enclosing[1]}px`
  );
});

test("tapping the avatar brings a folded bubble back", () => {
  // Folding it away is only acceptable because it is one tap from returning.
  const js = read("app.js");
  assert.match(js, /const activate = \(\) => \{\s*\n\s*showBubble\(\);/,
    "avatar activation must un-fold the bubble before writing to it");
  assert.match(js, /function showBubble\(\)[\s\S]*?classList\.remove\("d-none"\)/);
});

test("the dwell starts only once the tip has finished arriving", () => {
  // Starting it at trigger time would spend the reading window on the
  // typewriter animation and fold the bubble mid-sentence.
  const js = read("app.js");
  const typed = js.match(/lumiTypewriterInterval = null;\s*\n\s*\/\/[\s\S]{0,200}?dismissBubbleLater\(\);/);
  assert.ok(typed, "the typewriter's completion branch must start the dwell");
  const reduced = js.match(/prefersReducedMotion\(\)\) \{\s*\n\s*bubble\.textContent = message;\s*\n\s*dismissBubbleLater\(\);/);
  assert.ok(reduced, "the reduced-motion branch prints at once, so it must start the dwell too");
});

// A fully-onboarded save, same shape as views-render.test.mjs.
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
  reviews: []
};
