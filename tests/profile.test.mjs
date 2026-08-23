// Tests for the Profile page: the pure profileEditShifts delta function and the
// GameStateManager.updateProfile mutator (node --test).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GameStateManager } from "../state.js";
import { profileEditShifts } from "../scoring.js";

// Minimal localStorage mock so the manager can be constructed in Node.
function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}
beforeEach(() => installMockStorage());

const BASE_PROFILE = {
  name: "Alex", age: 30, gender: "unspecified", region: "Provinces",
  employment: "Office Worker", relationshipStatus: "Single",
  income: 15000, savingsRate: 10, digitalLiteracy: 50, weeklyLearningHours: 2,
  weeklyVigorousDays: 0, weeklyVigorousMins: 0, weeklyModerateDays: 0, weeklyModerateMins: 0,
  weeklyWalkingDays: 3, weeklyWalkingMins: 20, weight: 60, height: 170, sleepHours: 7,
  vegetablePortions: 2, waterLiters: 1.5, singleUsePlastics: 5,
  monthlyDonations: 100, volunteeringHours: 0, longTermInvestments: false,
  level: 30, lifetimeXp: 0
};
// Stored instrument raw sums the delta functions read via the [sum] idiom.
const BASELINE = { date: "2026-01-01T00:00:00.000Z", cfpb: 10, jss: 12 };

// --- profileEditShifts (pure) ---

test("a higher income lifts finance", () => {
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, income: 80000 }, BASELINE);
  assert.ok(shifts.finance > 0, "raising income should raise finance");
});

test("moving Provinces -> Bangkok changes finance", () => {
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, region: "Bangkok" }, BASELINE);
  assert.ok(Object.hasOwn(shifts, "finance"), "region drives the income percentile inside finance");
});

test("a weight change moves physical through BMI", () => {
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, weight: 95 }, BASELINE);
  assert.ok(Object.hasOwn(shifts, "physical"), "BMI feeds the physical score");
});

test("digital literacy still moves personalGoals on the LEGACY path", () => {
  // learningScore = 0.5*study + 0.5*digital; study(2h)=40. 50->100 gives +25;
  // aspect delta = (0.3/0.7) * 25 = 10.71 -> 11. The weight is 0.3/0.7 rather
  // than a flat 0.3 because grit left the composite in v64 and the two
  // surviving weights were renormalized over 0.7 rather than re-picked.
  //
  // v73 note: BASELINE has no Accomplishment and no Learning sum, i.e. a save
  // written before v72. Reaching this branch through the UI is no longer
  // possible — the Profile page stopped offering the slider — but the
  // calculator must keep honouring it, because an old save's stored
  // digitalLiteracy is still the second half of its learning score.
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, digitalLiteracy: 100 }, BASELINE);
  assert.equal(shifts.personalGoals, 11);
});

test("a Learning sum takes over from the slider, so slider edits stop moving the score", () => {
  // The same edit against a v73 baseline: digitalLiteracy is no longer read at
  // all, so the delta is zero and the shift is dropped rather than reported.
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, digitalLiteracy: 100 }, { ...BASELINE, citacc: 9, citlearn: 9 });
  assert.equal(Object.hasOwn(shifts, "personalGoals"), false);
});

// INVERTED IN v64. This used to assert that ticking the pension box lifted
// humanityFuture by 13 points. A pension is a financial fact, Finance already
// scores the financial facts, and paying for it again here charged one
// circumstance to two aspects — plus a third time through the percentile band
// it used to gate.
test("enabling long-term investments no longer moves humanityFuture", () => {
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, longTermInvestments: true }, BASELINE);
  assert.ok(!Object.hasOwn(shifts, "humanityFuture"), "a pension must not move an aspect about contribution");
});

test("a lower income raises socialContribution via the donation-to-income ratio", () => {
  // donation 100/mo: at 15,000 the ratio is <2% (factor 20); at 3,000 it clears
  // 2% (factor 100). Social delta = 0.4*0.5*(100-20) = 16.
  const shifts = profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE, income: 3000 }, BASELINE);
  assert.equal(shifts.socialContribution, 16);
});

test("no change yields no shifts", () => {
  assert.deepEqual(profileEditShifts(BASE_PROFILE, { ...BASE_PROFILE }, BASELINE), {});
});

test("mental and relationships are never auto-shifted, even on a status flip", () => {
  const shifts = profileEditShifts(
    BASE_PROFILE,
    { ...BASE_PROFILE, income: 90000, weight: 100, relationshipStatus: "Coupled" },
    BASELINE
  );
  assert.ok(!Object.hasOwn(shifts, "mental"), "mental has no profile-driven term");
  assert.ok(!Object.hasOwn(shifts, "relationships"), "a status flip refines at check-in, not here");
});

// --- updateProfile (state) ---

function seededManager() {
  const m = new GameStateManager();
  m.state = {
    ...m.state,
    onboarded: true,
    profile: { ...m.state.profile, ...BASE_PROFILE, provided: {} },
    aspects: {
      finance: 50, physical: 60, mental: 55, relationships: 50,
      personalGoals: 50, socialContribution: 40, environment: 50, humanityFuture: 44
    },
    baseline: { ...BASELINE },
    snapshots: []
  };
  return m;
}

test("editing age re-syncs level to the new age", () => {
  const m = seededManager();
  m.updateProfile({ age: "65" });
  assert.equal(m.state.profile.age, 65);
  assert.equal(m.state.profile.level, 65, "level IS age when the user edits age");
});

test("editing income moves finance and marks it provided", () => {
  const m = seededManager();
  const before = m.state.aspects.finance;
  m.updateProfile({ income: "90000" });
  assert.ok(m.state.aspects.finance > before, "a big raise lifts the finance score");
  assert.equal(m.state.profile.income, 90000);
  assert.equal(m.state.profile.provided.income, true);
});

test("an edit that leaves age alone never disturbs a birthday-driven level", () => {
  const m = seededManager();
  m.state.profile.level = 33; // e.g. birthdays advanced it past the stale onboarding age
  m.updateProfile({ income: "20000" });
  assert.equal(m.state.profile.level, 33, "untouched age leaves the level intact");
});

test("an unknown enum snaps back to the default", () => {
  const m = seededManager();
  m.updateProfile({ region: "Atlantis" });
  assert.equal(m.state.profile.region, "Provinces", "invalid enum -> DEFAULT_STATE value");
});

test("a blank name falls back to Guest", () => {
  const m = seededManager();
  m.updateProfile({ name: "   " });
  assert.equal(m.state.profile.name, "Guest");
});

test("editing profile facts awards no XP", () => {
  const m = seededManager();
  const before = m.state.profile.lifetimeXp;
  m.updateProfile({ income: "50000", weight: "80" });
  assert.equal(m.state.profile.lifetimeXp, before, "editing your own facts is not an achievement");
});

test("aspect deltas are applied and clamped to 0-100", () => {
  // Uses income rather than digital literacy, which stopped being an editable
  // field in v73 when the CIT Learning subscale replaced it (and rather than
  // the pension, which stopped shifting any aspect in v64). A large raise lifts
  // finance well past the 5 points left below the ceiling, so a start of 95
  // must clamp rather than overshoot.
  const m = seededManager();
  m.state.aspects.finance = 95;
  m.updateProfile({ income: "200000" });
  assert.ok(m.state.aspects.finance > 95 && m.state.aspects.finance <= 100);
});
