// Layout guards for the phone fold.
//
// These pin facts that were each invisible to every other kind of test: the
// CSS parsed, the JS ran, the markup was valid, the strings were translated,
// and the first screen of a wellbeing dashboard still contained no wellbeing
// data. Measured at 375x812 before v78, the old dashboard put a crisis notice,
// the in-depth upsell and the reader's name above the first score (y=762, on
// the fold line) and the first aspect at y=2113.
//
// Home (redesign R3, views/dashboard.js) is one column in a fixed order, so
// the guard is now on the order of the markup itself.
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

// --- Home reads your star before your name --------------------------------

test("Home shows your star and your index before your name", async () => {
  // The scores are the point of the page. The hero is the radar shape of
  // them with the Balance Index under it; the name comes after.
  const { renderDashboard } = await import("../views/dashboard.js");
  const dom = installDom();
  renderDashboard(MAIN, STATE, () => {});
  const html = dom.html[MAIN] || "";
  const at = (needle) => {
    const i = html.indexOf(needle);
    assert.ok(i > -1, `Home no longer renders ${needle}`);
    return i;
  };
  assert.ok(at('class="hero"') < at("balance-index"), "the hero must lead the page");
  assert.ok(at("balance-index") < at("home-name"), "the Balance Index must precede the name");
  assert.ok(at('class="hero"') < at("home-aspects"), "the star must come before the cards");
});

// --- The upsell sits below the scores ---------------------------------------

test("the in-depth offer renders below the scores, not in the top prompt stack", async () => {
  const { renderDashboard } = await import("../views/dashboard.js");
  const dom = installDom();
  renderDashboard(MAIN, STATE, () => {});
  const html = dom.html[MAIN] || "";

  const deep = html.indexOf("deep-offer");
  const scores = html.indexOf("home-aspects");
  const todo = html.indexOf("home-todo");
  assert.ok(deep > -1, "the in-depth offer should render for a non-verified save");
  assert.ok(scores > -1);
  assert.ok(
    deep > scores,
    "the in-depth offer must come AFTER the aspect scores in the document. " +
    "It asks the reader to answer eighty more questions for 'more accurate " +
    "scores'; above the scores, that is an argument about numbers they have " +
    "not been shown yet."
  );
  assert.ok(todo === -1 || !html.slice(todo, scores).includes("#/deep"), "the offer must not sit in the to-do list");
});

test("the offer still disappears once every aspect is deep-verified", async () => {
  // Rendered, not grepped: an earlier version of this test asserted that
  // dashboard.js contained the line that had just been written into it, which
  // would pass however the function behaved.
  const { renderDashboard } = await import("../views/dashboard.js");
  const { ASPECT_KEYS, isAspectDeepVerified } = await import("../aspects.js");
  const verified = {
    ...STATE,
    baseline: {
      ...STATE.baseline,
      deepDone: Object.fromEntries(ASPECT_KEYS.map(k => [k, true]))
    }
  };
  // Guard the guard: if this fixture does not actually reach deep-verified,
  // the assertion below would pass for the wrong reason.
  assert.ok(
    ASPECT_KEYS.every(k => isAspectDeepVerified(verified, k)),
    "fixture must be deep-verified on every aspect or this test proves nothing"
  );
  const dom = installDom();
  renderDashboard(MAIN, verified, () => {});
  const html = dom.html[MAIN] || "";
  assert.ok(!html.includes("deep-offer"), "the offer must not render once there is nothing left to deepen");
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

// The three tests above this line and the two below it were, in their first
// version, regexes over app.js source: one of them pinned a brace-and-newline
// arrangement and another REQUIRED A COMMENT to be present — the `\/\/` was
// load-bearing. An independent review called them out, correctly. A guard that
// asserts on its author's formatting proves the author did not change their
// formatting.
//
// These are structural facts about the module graph instead, which is as far
// as a node test can honestly reach into a browser-only file: app.js imports
// from the DOM at load, so it cannot be imported here. The BEHAVIOUR is
// covered where it can actually be observed — tests/e2e.mjs drives the fold,
// the dwell and the tap in a real browser.

test("folding the bubble is paired with a way to get it back", () => {
  // Folding it away is only acceptable because it is one tap from returning,
  // so the two must exist together. Asserted as a relationship between
  // functions, not as a formatting pattern.
  const js = read("app.js");
  assert.match(js, /function showBubble\(\)[\s\S]*?classList\.remove\("d-none"\)/,
    "showBubble must actually un-hide the bubble");
  assert.match(js, /function dismissBubbleLater\(\)[\s\S]*?classList\.add\("d-none"\)/,
    "dismissBubbleLater must actually hide it");
  // Every hide has to be reachable by a show: the avatar handler is the one
  // route back, so it must call showBubble.
  const activate = js.match(/const activate = \(\) =>[\s\S]{0,300}?\};/);
  assert.ok(activate, "the avatar must still have an activation handler");
  assert.ok(activate[0].includes("showBubble()"),
    "avatar activation must un-fold the bubble, or a folded bubble is unreachable");
});

test("a wide viewport can never be left holding a folded bubble", () => {
  // The gate on folding is phone-only; the folded STATE is global. Widening
  // the window after a fold used to leave the bubble hidden for the rest of
  // the session, with every later tip typed into a display:none element.
  const js = read("app.js");
  assert.match(js, /if \(!isPhoneViewport\(\)\) showBubble\(\);/,
    "triggerLumiMessage must un-fold on any viewport that would not fold it");
  // And the fold itself must stay gated, or it starts happening on desktop.
  assert.match(js, /function dismissBubbleLater\(\)[\s\S]*?if \(!isPhoneViewport\(\)\) return;/,
    "the dwell must not arm on a viewport wider than the phone breakpoint");
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

test("every 100vh is followed by a dvh override in the same rule", () => {
  // On iOS Safari and Chrome for Android, 100vh is the viewport with the
  // browser toolbar HIDDEN. While the toolbar shows, a 100vh box is taller than
  // the screen, so a full-height overlay's bottom edge (and anything pinned to
  // it) sits under the toolbar. dvh tracks the toolbar. vh stays as the
  // fallback line for browsers without dvh.
  const css = read("index.css");
  const rules = css.split("}");
  for (const rule of rules) {
    const vh = rule.match(/^\s*(min-height|height):\s*100vh;/m);
    if (!vh) continue;
    assert.match(
      rule, new RegExp(`${vh[1]}:\\s*100dvh;`),
      `a ${vh[1]}: 100vh rule has no ${vh[1]}: 100dvh after it:\n${rule.trim().slice(0, 120)}`
    );
  }
});
