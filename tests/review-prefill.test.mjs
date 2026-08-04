// Weekly Review pre-fill from a connected sibling app (node --test).
//
// Two layers are tested here, deliberately separately:
//
//   1. connectionPrefills / incomeDrifted — the RULES, pure, no DOM. Which
//      boxes a source may fill, and when a fill is refused.
//   2. renderReview — the SURFACE. That a filled box actually carries the
//      imported number, says where it came from, and that a user with no
//      connected apps sees the form they always saw.
//
// The second matters as much as the first: the whole design rests on "pre-fill,
// never apply", and a value that reached the form without visibly saying where
// it came from would break that promise while every unit test still passed.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { readConnection, connectionPrefills, incomeDrifted } from "../connections.js";
import { isoWeekKey } from "../season.js";

// The week the app is scoring right now. A run log is only fresh for its own
// week, so a fixture pinned to a hardcoded week would start failing on the
// Monday after it was written.
const THIS_WEEK = isoWeekKey(new Date());

// 50,000 in, 38,000 out -> a 12,000 surplus and a 24% rate. Every expectation
// below is derived from those two numbers, so a mapper change cannot be
// absorbed by a fixture quietly edited to match.
const MIDORI = {
  v: 1,
  source: "midori",
  writtenAt: new Date().toISOString(),
  currency: "THB",
  window: { from: "2026-05-01", to: "2026-07-31", months: 3 },
  facts: { monthlyIncome: 50000, monthlyExpenses: 38000, hasLongTermInvestments: true }
};

// 102 minutes over 3 days is 34 per day, NOT 102. The unit trap, pinned.
const RUNAWAY = {
  v: 1,
  source: "runaway",
  writtenAt: new Date().toISOString(),
  window: { isoWeek: THIS_WEEK, from: "2026-07-27", to: "2026-08-02" },
  facts: { activeDays: 3, totalMinutes: 102, minutesPerActiveDay: 34, runsWithoutDuration: 1 }
};

function fakeStore(entries = {}) {
  const map = {};
  for (const [key, value] of Object.entries(entries)) map[key] = JSON.stringify(value);
  return { getItem: key => (Object.hasOwn(map, key) ? map[key] : null) };
}

function readBoth(entries) {
  const storage = fakeStore(entries);
  return {
    midori: readConnection("midori", { storage, isoWeek: THIS_WEEK }),
    runaway: readConnection("runaway", { storage, isoWeek: THIS_WEEK })
  };
}

const BOTH_ON = { midori: true, runaway: true };

// --- 1. WHICH BOXES GET FILLED ---

test("a connected source fills exactly the boxes it owns", () => {
  const prefills = connectionPrefills(
    readBoth({ lbi_bridge_midori: MIDORI, lbi_bridge_runaway: RUNAWAY }),
    BOTH_ON
  );

  assert.deepEqual(
    Object.keys(prefills).sort(),
    ["monthlySavings", "weeklyVigorousDays", "weeklyVigorousMins"]
  );
  assert.equal(prefills.monthlySavings.source, "midori");
  assert.equal(prefills.weeklyVigorousDays.source, "runaway");
});

test("the savings box carries the surplus Midori measured, in baht", () => {
  const prefills = connectionPrefills(readBoth({ lbi_bridge_midori: MIDORI }), BOTH_ON);
  // 50000 - 38000. Not the rate (24), and not a figure rebased on some other
  // income: the box asks for baht, and this is the baht.
  assert.equal(prefills.monthlySavings.value, 12000);
});

test("vigorous minutes are per ACTIVE DAY, not the weekly total", () => {
  const prefills = connectionPrefills(readBoth({ lbi_bridge_runaway: RUNAWAY }), BOTH_ON);
  assert.equal(prefills.weeklyVigorousDays.value, 3);
  assert.equal(prefills.weeklyVigorousMins.value, 34, "102 minutes over 3 days is 34/day");
});

test("running never touches the moderate or walking boxes", () => {
  const prefills = connectionPrefills(readBoth({ lbi_bridge_runaway: RUNAWAY }), BOTH_ON);
  // The swimmer problem: someone who also swims raises the vigorous number
  // themselves. Nothing here may overwrite the other two pairs.
  for (const field of ["weeklyModerateDays", "weeklyModerateMins", "weeklyWalkingDays", "weeklyWalkingMins"]) {
    assert.equal(prefills[field], undefined, `${field} must never be pre-filled`);
  }
});

test("income and the investments flag are reported but never pre-filled here", () => {
  const prefills = connectionPrefills(readBoth({ lbi_bridge_midori: MIDORI }), BOTH_ON);
  // Both are real Midori facts, and both are slow-moving profile facts the
  // weekly review does not ask for — submitWeeklyReview would drop them anyway.
  assert.equal(prefills.income, undefined);
  assert.equal(prefills.longTermInvestments, undefined);
});

// --- 2. WHEN A FILL IS REFUSED ---

test("a source switched off fills nothing, however good its payload is", () => {
  const prefills = connectionPrefills(
    readBoth({ lbi_bridge_midori: MIDORI, lbi_bridge_runaway: RUNAWAY }),
    { midori: false, runaway: false }
  );
  assert.deepEqual(prefills, {});
});

test("a missing preference is off, not on", () => {
  const prefills = connectionPrefills(readBoth({ lbi_bridge_midori: MIDORI }), {});
  assert.deepEqual(prefills, {});
});

test("last week's run log fills nothing this week", () => {
  const stale = { ...RUNAWAY, window: { ...RUNAWAY.window, isoWeek: "2020-W1" } };
  const prefills = connectionPrefills(readBoth({ lbi_bridge_runaway: stale }), BOTH_ON);
  assert.deepEqual(prefills, {}, "a run log describes one week and cannot stand in for another");
});

test("a ledger older than the staleness window fills nothing", () => {
  const old = { ...MIDORI, writtenAt: new Date(Date.now() - 61 * 86400000).toISOString() };
  const prefills = connectionPrefills(readBoth({ lbi_bridge_midori: old }), BOTH_ON);
  assert.deepEqual(prefills, {}, "last quarter's salary is not this week's");
});

test("a broken payload fills nothing rather than filling zeroes", () => {
  const broken = { ...MIDORI, facts: { monthlyIncome: 50000 } }; // monthlyExpenses missing
  const prefills = connectionPrefills(readBoth({ lbi_bridge_midori: broken }), BOTH_ON);
  assert.deepEqual(prefills, {}, "a rejected payload must not become a confident 0");
});

test("no reads at all is empty, not a crash", () => {
  assert.deepEqual(connectionPrefills(), {});
  assert.deepEqual(connectionPrefills({}, BOTH_ON), {});
});

// --- 3. INCOME DRIFT ---
//
// The savings box holds baht, the state holds a rate, and the rate is derived
// on submit against the PROFILE's income — which this form cannot edit. If the
// two incomes disagree, a correct baht figure still yields a wrong rate.

test("drift is flagged only once it exceeds the derived rate's tolerance", () => {
  assert.equal(incomeDrifted(50000, 15000), true);
  assert.equal(incomeDrifted(16600, 15000), true, "over 10% is over the line");
  assert.equal(incomeDrifted(16500, 15100), false, "just under 10% is not worth interrupting for");
  assert.equal(incomeDrifted(15000, 15000), false);
  assert.equal(incomeDrifted(13000, 15000), true, "drift is flagged in both directions");
});

test("drift says nothing when there is no rate to derive", () => {
  // No profile income means savingsRateFrom returns 0 regardless — a different
  // problem, and not the one this notice describes.
  assert.equal(incomeDrifted(50000, 0), false);
  assert.equal(incomeDrifted(50000, null), false);
  assert.equal(incomeDrifted(null, 15000), false);
  assert.equal(incomeDrifted("50000", 15000), false, "a string is not a measured income");
  assert.equal(incomeDrifted(NaN, 15000), false);
});

// --- 4. THE FORM ITSELF ---
//
// Same stub-DOM approach as views-xss.test.mjs: renderReview only ever calls
// getElementById and assigns innerHTML, so capturing that string is exactly
// what we want to assert on — no browser, no dependency.

function installGlobals() {
  globalThis.localStorage = {
    store: {},
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
  const captured = { html: "" };
  globalThis.document = {
    getElementById: () => ({
      set innerHTML(v) { captured.html = v; },
      get innerHTML() { return captured.html; },
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {}
    })
  };
  return captured;
}

installGlobals();

const { stateManager } = await import("../state.js");
const { renderReview } = await import("../views/review.js");

// The review only renders its form when one is due. Set directly rather than
// seeding a whole save file: what is under test is the pre-fill, not the
// due-date rule (weekly.test.mjs owns that).
stateManager.state.onboarded = true;
stateManager.state.baseline = { date: "2020-01-01T00:00:00.000Z" };
stateManager.state.reviews = [];

// Deliberately different from every bridge number, so any value appearing in
// the form can be traced to exactly one origin.
const PROFILE = {
  name: "Alex", age: 30, income: 15000, savingsRate: 10,
  weeklyVigorousDays: 1, weeklyVigorousMins: 20, weeklyModerateDays: 2,
  weeklyModerateMins: 25, weeklyWalkingDays: 4, weeklyWalkingMins: 15,
  sleepHours: 7, waterLiters: 2, vegetablePortions: 3,
  weeklyLearningHours: 5, singleUsePlastics: 6, monthlyDonations: 200,
  volunteeringHours: 1
};

function render(entries = {}, prefs = null) {
  const captured = installGlobals();
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  if (prefs) localStorage.setItem("lifequest_connections", JSON.stringify(prefs));
  renderReview("main-view", { profile: PROFILE, reviews: [] });
  return captured.html;
}

// The value a specific input actually rendered, so an assertion cannot be
// satisfied by the same number appearing somewhere else in the markup.
function fieldValue(html, id) {
  const match = new RegExp(`id="${id}"[^>]*value="([^"]*)"`).exec(html);
  return match ? match[1] : null;
}

beforeEach(() => installGlobals());

test("a connected app's numbers arrive in the boxes", () => {
  const html = render(
    { lbi_bridge_midori: MIDORI, lbi_bridge_runaway: RUNAWAY },
    { midori: true, runaway: true }
  );

  assert.equal(fieldValue(html, "rev-weeklyVigorousDays"), "3");
  assert.equal(fieldValue(html, "rev-weeklyVigorousMins"), "34");
  assert.equal(fieldValue(html, "rev-monthlySavings"), "12000");
});

test("every pre-filled box says which app filled it, and over what dates", () => {
  const html = render(
    { lbi_bridge_midori: MIDORI, lbi_bridge_runaway: RUNAWAY },
    { midori: true, runaway: true }
  );

  // The chip names the source in the label, before the number is read.
  assert.equal((html.match(/class="prefill-chip"/g) || []).length, 3);
  assert.ok(html.includes(">Midori</span>"));
  assert.ok(html.includes(">Runaway</span>"));

  // The caption names the window, and is wired to its input for a screen
  // reader rather than being decoration only.
  assert.ok(html.includes('aria-describedby="rev-monthlySavings-note"'));
  assert.ok(html.includes('id="rev-monthlySavings-note"'));
  assert.ok(html.includes("From Midori — a typical month"));
  assert.ok(html.includes("From Runaway — your runs for"));
  assert.ok(/Jul/.test(html) && /Aug/.test(html), "the window dates are named");

  // And the standing instruction that this is a draft, not a verdict.
  assert.ok(html.includes("the answer you send is still yours"));
});

test("a box no app fills keeps the user's own last answer, unchipped", () => {
  const html = render(
    { lbi_bridge_midori: MIDORI, lbi_bridge_runaway: RUNAWAY },
    { midori: true, runaway: true }
  );

  assert.equal(fieldValue(html, "rev-weeklyModerateMins"), "25");
  assert.equal(fieldValue(html, "rev-sleepHours"), "7");
  assert.equal(fieldValue(html, "rev-monthlyDonations"), "200");
});

test("with nothing connected the form is exactly the form it always was", () => {
  const html = render();

  assert.ok(!html.includes("prefill-chip"), "no chip may appear");
  assert.ok(!html.includes("field-note"), "no caption may appear");
  assert.ok(!html.includes("conn-banner"), "no banner may appear");
  // savingsRate 10 of 15000 income = 1500, derived exactly as before.
  assert.equal(fieldValue(html, "rev-monthlySavings"), "1500");
  assert.equal(fieldValue(html, "rev-weeklyVigorousDays"), "1");
});

test("a switched-on app with nothing current says so, and changes no box", () => {
  const stale = { ...RUNAWAY, window: { ...RUNAWAY.window, isoWeek: "2020-W1" } };
  const html = render({ lbi_bridge_runaway: stale }, { runaway: true });

  assert.ok(
    html.includes("Runaway has nothing current to share"),
    "an empty-handed connection must explain itself rather than look broken"
  );
  assert.equal(fieldValue(html, "rev-weeklyVigorousDays"), "1", "the user's own answer stands");
  assert.ok(!html.includes("prefill-chip"));
});

test("a ledger that disagrees with the profile about income says so", () => {
  const html = render({ lbi_bridge_midori: MIDORI }, { midori: true });

  // 50,000 measured against 15,000 recorded: the baht is right, the rate this
  // form derives from it would not be.
  assert.ok(html.includes("50,000"), "the measured income is named");
  assert.ok(html.includes("15,000"), "the recorded income is named");
  assert.ok(html.includes("the savings rate derived here will be off"));
  assert.ok(html.includes('href="#/profile"'), "and points at the page that can fix it");
});

test("no drift notice when the two incomes agree", () => {
  const agreed = { ...MIDORI, facts: { ...MIDORI.facts, monthlyIncome: 15000, monthlyExpenses: 12000 } };
  const html = render({ lbi_bridge_midori: agreed }, { midori: true });

  assert.ok(!html.includes("will be off"), "an agreeing ledger must not nag");
  assert.equal(fieldValue(html, "rev-monthlySavings"), "3000");
});

// --- 5. THE FORM RENDERS NO PAYLOAD TEXT ---
//
// The bridge keys are writable by any page on this origin, so a payload is
// attacker-controlled by design. The defence is not escaping — it is that no
// string from a payload is carried out of connections.js at all. The review is
// the second surface to render connection state, and the chip it draws is the
// obvious place for a future "shared by {name}" to creep in.

const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';
const XSS_BREAKOUT = '"><script>alert(1)</script>';

test("hostile strings in a VALID payload reach neither the chip nor the caption", () => {
  // Valid in every checked position, so parsing succeeds and the boxes really
  // do fill — the deepest path, and the only one where an implementation that
  // echoed a payload string would actually run.
  const html = render(
    {
      lbi_bridge_midori: { ...MIDORI, currency: XSS_PAYLOAD, label: XSS_BREAKOUT },
      lbi_bridge_runaway: { ...RUNAWAY, label: XSS_PAYLOAD }
    },
    { midori: true, runaway: true }
  );

  assert.ok(!html.includes(XSS_PAYLOAD), "a payload string reached innerHTML verbatim");
  assert.ok(!html.includes(XSS_BREAKOUT), "a payload string reached innerHTML verbatim");
  assert.ok(!/onerror|<script/i.test(html), "a payload string reached innerHTML at all");
  // Present AND filled, so this cannot pass because the pre-fill silently failed.
  assert.equal(fieldValue(html, "rev-monthlySavings"), "12000");
  assert.ok(html.includes(">Midori</span>"), "the chip is drawn from our own dictionary");
});
