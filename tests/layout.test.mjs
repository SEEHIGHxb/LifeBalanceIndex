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
  assert.ok(at("home-star") < at("balance-index"), "your star must lead the page");
  assert.ok(at("balance-index") < at("home-name"), "the Balance Index must precede the name");
  assert.ok(at("home-star") < at("home-aspects"), "the star must come before the aspects");
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

// --- the eight aspects fit one phone screen --------------------------------

test("on a phone the eight aspects are a two-column grid of tiles, not eight tall rows", () => {
  // The owner, 2026-09-26: a long page loses the reader before the bottom.
  // Eight rows stacked were 1,560px at 390 wide; as tiles two to a line they
  // fit one screen.
  const css = read("css/home.css");
  const phone = css.slice(css.indexOf("@container (max-width: 900px)"));
  assert.match(phone, /\.aspect-rows \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(phone, /\.ar-standing \{ display: none; \}/, "the standing sentence belongs to the aspect page on a phone");
});
