// Carry-over guards: the in-depth assessment must never re-ask a question the
// baseline assessment already answered, and reconstructing the full-length raw
// sum from (stored short-form sum + newly asked items) must be EXACT.
//
// The reconstruction is what makes carry-over safe: each published scale is
// still scored over its whole item set, so DEEP_NORM's ranges and the official
// CFPB table keep applying unchanged. That holds only while three invariants
// do, and all three are asserted here:
//   1. a carried deep item has the same TEXT as the short item it reuses
//   2. it has the same option VALUES (so the carried number means the same)
//   3. the carried items cover the short form completely and exactly once
// Break any one and the sum silently double-counts or drops items — a wrong
// score with no error, which is why these are tests and not comments.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INSTRUMENTS, DEEP_INSTRUMENTS, DEEP_CARRY, deepAskIndices
} from "../surveys.js";
import { GameStateManager } from "../state.js";

const optionValues = item => item.options.map(o => o.v).join(",");
const rangeOf = items => items.reduce(([lo, hi], it) => {
  const v = it.options.map(o => o.v);
  return [lo + Math.min(...v), hi + Math.max(...v)];
}, [0, 0]);

test("every carried item matches its onboarding item in text and option values", () => {
  for (const [deepKey, { from, pairs }] of Object.entries(DEEP_CARRY)) {
    for (const [deepIdx, shortIdx] of pairs) {
      const d = DEEP_INSTRUMENTS[deepKey].items[deepIdx];
      const s = INSTRUMENTS[from].items[shortIdx];
      assert.ok(d, `${deepKey}[${deepIdx}] does not exist`);
      assert.ok(s, `${from}[${shortIdx}] does not exist`);
      assert.equal(
        d.text, s.text,
        `${deepKey}[${deepIdx}] and ${from}[${shortIdx}] are mapped as the same question but their text differs — the user would be asked one of them twice, or a different question would be silently skipped`
      );
      assert.equal(
        optionValues(d), optionValues(s),
        `${deepKey}[${deepIdx}] and ${from}[${shortIdx}] score on different option values, so the carried number does not mean the same thing`
      );
    }
  }
});

test("carried items cover each onboarding short form completely and exactly once", () => {
  // baseline[from] is a sum over ALL the short form's items, so it can only be
  // substituted for the carried slots if those slots are exactly that set.
  for (const [deepKey, { from, pairs }] of Object.entries(DEEP_CARRY)) {
    const used = pairs.map(p => p[1]).sort((a, b) => a - b);
    const expected = INSTRUMENTS[from].items.map((_, i) => i);
    assert.deepEqual(
      used, expected,
      `${deepKey} carries from ${from} but does not map every short item exactly once — the reconstructed sum would double-count or drop items`
    );
  }
});

test("short-form range plus remaining-item range equals the full scale range", () => {
  for (const [deepKey, { from, pairs }] of Object.entries(DEEP_CARRY)) {
    const items = DEEP_INSTRUMENTS[deepKey].items;
    const carried = new Set(pairs.map(p => p[0]));
    const [fLo, fHi] = rangeOf(items);
    const [sLo, sHi] = rangeOf(INSTRUMENTS[from].items);
    const [rLo, rHi] = rangeOf(items.filter((_, i) => !carried.has(i)));
    assert.equal(sLo + rLo, fLo, `${deepKey}: reconstructed minimum drifts from the scale minimum`);
    assert.equal(sHi + rHi, fHi, `${deepKey}: reconstructed maximum drifts from the scale maximum`);
  }
});

test("deepAskIndices skips carried items, and asks everything without a baseline sum", () => {
  const baseline = { cfpb: 10, gse: 15, grit: 12, lsns: 18, ras: 9 };
  assert.deepEqual(deepAskIndices("cfpb10", baseline), [0, 1, 3, 6, 8]);
  assert.deepEqual(deepAskIndices("gse10", baseline), [2, 6, 7, 8]);
  assert.deepEqual(deepAskIndices("ras7", baseline), [3, 4, 5, 6]);

  // A deep instrument with no short form is always asked in full.
  assert.equal(deepAskIndices("pss10", baseline).length, 10);

  // Single at onboarding -> baseline.ras is null -> RAS-7 must be asked whole,
  // otherwise three of its items would never be answered by anyone.
  assert.equal(deepAskIndices("ras7", { ...baseline, ras: null }).length, 7);
  // Same for a baseline that predates a key, or no baseline at all.
  assert.equal(deepAskIndices("cfpb10", {}).length, 10);
  assert.equal(deepAskIndices("cfpb10", null).length, 10);
});

// --- end-to-end through the real submit path -------------------------------

function seeded() {
  const gs = new GameStateManager();
  gs.submitOnboarding({
    name: "T", age: 30, gender: "male", region: "Bangkok",
    employment: "Office Worker", relationshipStatus: "Coupled",
    income: 30000, savingsRate: 10, height: 170, weight: 65,
    sleepHours: 7, vegetablePortions: 3, waterLiters: 2,
    weeklyVigorousDays: 1, weeklyVigorousMins: 30,
    weeklyModerateDays: 2, weeklyModerateMins: 30,
    weeklyWalkingDays: 3, weeklyWalkingMins: 30,
    weeklyLearningHours: 2, digitalLiteracy: 70,
    monthlyDonations: 100, volunteeringHours: 2, singleUsePlastics: 3,
    longTermInvestments: "false",
    cfpb: [2, 2, 2, 2, 2], jss: [1, 1, 1, 1], st5: [1, 1, 1, 1, 1],
    who5: [3, 3, 3, 3, 3], lsns: [3, 3, 3, 3, 3, 3], ucla: [2, 2, 2],
    ras: [3, 3, 3], gse: [3, 3, 3, 3, 3, 3], grit: [4, 3, 4, 4],
    ptm: [2, 1, 2, 2, 3], geb: [2, 2, 3, 3, 2, 2], lfis: [3, 2, 2, 3, 2]
  }, false);
  return gs;
}

test("a deep submission reconstructs the full-length sum from the baseline", () => {
  const gs = seeded();
  const b = gs.state.baseline;
  assert.equal(b.cfpb, 10, "onboarding CFPB-5 sum");

  // Answer only the 5 items CFPB-10 adds. Varied values so the straight-line
  // guard does not fire.
  const answers = [4, 3, 2, 1, 0];
  gs.submitDeepAssessment("finance", { cfpb10: answers });

  const expected = b.cfpb + answers.reduce((a, v) => a + v, 0);
  assert.equal(gs.state.baseline.deep.cfpb10, expected);
  // ...and it lands inside the canonical CFPB-10 range the normalizer assumes.
  assert.ok(gs.state.baseline.deep.cfpb10 >= 0 && gs.state.baseline.deep.cfpb10 <= 40);
});

test("the reconstructed sum equals answering the full scale outright", () => {
  // Two users give the SAME answers to the same ten CFPB items; one had five of
  // them carried over. Their stored full-scale sums must be identical.
  const full = [4, 3, 2, 1, 0, 1, 2, 3, 4, 0]; // by canonical item index
  const { pairs } = DEEP_CARRY.cfpb10;
  const shortAnswers = [];
  for (const [deepIdx, shortIdx] of pairs) shortAnswers[shortIdx] = full[deepIdx];
  const asked = deepAskIndices("cfpb10", { cfpb: 1 }).map(i => full[i]);

  const gs = seeded();
  gs.state.baseline.cfpb = shortAnswers.reduce((a, v) => a + v, 0);
  gs.submitDeepAssessment("finance", { cfpb10: asked });

  assert.equal(
    gs.state.baseline.deep.cfpb10,
    full.reduce((a, v) => a + v, 0),
    "carry-over must produce the same raw sum as administering all ten items"
  );
});

test("straight-lining the asked items is still rejected", () => {
  const gs = seeded();
  // CFPB-10's remaining items are mixed-keyed, so one option POSITION across
  // all of them is incoherent and must not be accepted or rewarded. Take each
  // asked item's first option — the values differ (4 vs 0) precisely because
  // the keying differs, which is what makes the pattern careless.
  const asked = deepAskIndices("cfpb10", gs.state.baseline);
  const firstPosition = asked.map(i => DEEP_INSTRUMENTS.cfpb10.items[i].options[0].v);
  assert.deepEqual(firstPosition, [4, 4, 4, 0, 0]);

  const before = gs.state.profile.lifetimeXp;
  const result = gs.submitDeepAssessment("finance", { cfpb10: firstPosition });
  assert.equal(result.flagged, true);
  assert.equal(gs.state.baseline.deepDone.finance, undefined);
  assert.equal(gs.state.profile.lifetimeXp, before, "a flagged submission must not award points");
});

test("a user who was single at onboarding answers all seven RAS items", () => {
  const gs = seeded();
  gs.state.baseline.ras = null; // no stored short-form sum to carry
  const ask = deepAskIndices("ras7", gs.state.baseline);
  assert.equal(ask.length, 7);
  gs.submitDeepAssessment("relationships", { ras7: [5, 4, 3, 5, 4, 5, 2] });
  assert.equal(gs.state.baseline.deep.ras7, 28, "sum of all seven, nothing carried");
});
