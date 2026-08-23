// tests/personal-goals.test.mjs - the v72 composite: GSE, CIT Accomplishment,
// and learning at EQUAL THIRDS, plus the fallback that keeps old saves honest.
//
// Round 12 (closed 2026-08-22) found that the Comprehensive Inventory of
// Thriving publishes a three-item Accomplishment subscale usable on its own,
// free, for non-commercial purposes, and the source-retrieval addendum settled
// the two questions the round left open. Four claims are pinned here:
//
//   1. citAccScore normalises raw 3-15 to 0-100 on exactly the gseScore shape.
//      Three items, 1-5 each, so 3 is the floor and 15 the ceiling - NOT 0.
//
//   2. The composite is an unweighted mean of the three terms. There is no
//      published CIT aggregation rule - the addendum searched for one and
//      recorded its absence - so equal thirds rests on the authors' own unit
//      weighting of the BIT across ten facets. That is an INFERRED precedent.
//      This test is what makes the inference explicit rather than incidental:
//      if someone re-weights the aspect, they have to come here and say so.
//
//   3. An ABSENT Accomplishment sum falls back to the pre-v72 two-term
//      weighting and reproduces the old score EXACTLY. Every baseline written
//      before v72 lacks this instrument, and the alternative - substituting a
//      neutral 50 - is the same fabrication the sleep-duration branch was
//      written to remove. No migration, no invented data.
//
//   4. The delta coefficient in weeklyAspectShifts/profileEditShifts TRACKS the
//      composite, on both sides of that fallback. This is the drift that the
//      v64 grit removal already caused once: a weight chain that lives as a
//      bare literal in two functions and quietly stops matching the formula it
//      was copied from.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  citAccScore,
  citLearnScore,
  gseScore,
  learningScore,
  personalGoalsComposite,
  weeklyAspectShifts,
  profileEditShifts
} from "../scoring.js";

const PROFILE = {
  income: 30000,
  region: "Provinces",
  gender: "male",
  relationshipStatus: "Single",
  age: 35,
  savingsRate: 10,
  digitalLiteracy: 60,
  weeklyLearningHours: 3
};

// GSE-6 raw 18 of 24, CIT Accomplishment raw 9 of 15 (the exact scale midpoint).
const GSE_RAW = 18;
const CIT_RAW = 9;

test("citAccScore normalises the three-item 1-5 subscale to 0-100", () => {
  assert.equal(citAccScore(3), 0, "raw 3 is the FLOOR, not zero items answered");
  assert.equal(citAccScore(15), 100);
  assert.equal(citAccScore(9), 50);
});

test("citAccScore uses the same normaliser shape as gseScore", () => {
  // ((raw - min) / range) * 100 in both cases; the only difference is the
  // instrument's floor and range. Pinned so a future edit cannot quietly give
  // Accomplishment a curve that GSE does not have.
  assert.equal(citAccScore(6), ((6 - 3) / 12) * 100);
  assert.equal(gseScore(12), ((12 - 6) / 18) * 100);
});

test("the composite is an unweighted mean of the three terms", () => {
  const expected = (gseScore(GSE_RAW) + citAccScore(CIT_RAW) + learningScore(PROFILE)) / 3;
  assert.equal(personalGoalsComposite(PROFILE, GSE_RAW, CIT_RAW), expected);
});

test("each term carries exactly one third, measured rather than asserted", () => {
  const base = personalGoalsComposite(PROFILE, GSE_RAW, CIT_RAW);
  // Move Accomplishment from the midpoint to the ceiling: +50 points of
  // component, which must arrive as +50/3 of aspect.
  const lifted = personalGoalsComposite(PROFILE, GSE_RAW, 15);
  assert.ok(Math.abs((lifted - base) - (50 / 3)) < 1e-9);
});

test("an ABSENT Accomplishment sum reproduces the pre-v72 score exactly", () => {
  const legacy = ((0.4 * gseScore(GSE_RAW)) + (0.3 * learningScore(PROFILE))) / 0.7;
  for (const missing of [undefined, null, NaN, ""]) {
    assert.equal(
      personalGoalsComposite(PROFILE, GSE_RAW, missing),
      legacy,
      `baselines written before v72 must not move (${String(missing)})`
    );
  }
});

test("an absent Accomplishment sum is not silently treated as the scale floor", () => {
  // The failure this guards: `rawSum` of nothing is 0, and 0 through the
  // normaliser clamps to a 0 component - a fabricated worst-possible reading
  // for a question the user was never asked.
  assert.notEqual(
    personalGoalsComposite(PROFILE, GSE_RAW, null),
    personalGoalsComposite(PROFILE, GSE_RAW, 3)
  );
});

// Both shift calculators round to whole points and drop zeros, so these assert
// the ROUNDED contract the callers actually see. The two branches are chosen to
// land on different integers - 10 against 13 - so a coefficient that silently
// reverted could not pass by rounding into agreement.
test("the weekly learning delta tracks the composite on both sides of the fallback", () => {
  const older = { ...PROFILE, weeklyLearningHours: 1 };
  const newer = { ...PROFILE, weeklyLearningHours: 4 };
  const change = learningScore(newer) - learningScore(older);
  assert.equal(change, 30, "fixture guard: the two branches must differ once rounded");

  const withCit = weeklyAspectShifts(older, newer, { jss: 4, gse: GSE_RAW, citacc: CIT_RAW });
  assert.equal(withCit.personalGoals, Math.round((1 / 3) * change));
  assert.equal(withCit.personalGoals, 10);

  const withoutCit = weeklyAspectShifts(older, newer, { jss: 4, gse: GSE_RAW });
  assert.equal(withoutCit.personalGoals, Math.round((0.3 / 0.7) * change));
  assert.equal(withoutCit.personalGoals, 13);
});

test("the profile-edit learning delta tracks the composite on both sides too", () => {
  const older = { ...PROFILE, digitalLiteracy: 20 };
  const newer = { ...PROFILE, digitalLiteracy: 80 };
  const change = learningScore(newer) - learningScore(older);
  assert.equal(change, 30);

  const withCit = profileEditShifts(older, newer, { cfpb: 10, jss: 4, gse: GSE_RAW, citacc: CIT_RAW });
  assert.equal(withCit.personalGoals, 10);

  const withoutCit = profileEditShifts(older, newer, { cfpb: 10, jss: 4, gse: GSE_RAW });
  assert.equal(withoutCit.personalGoals, 13);
});

// --- v73: CIT Learning replaces the digital-literacy slider -----------------
//
// learningScore was 0.5 x study hours + 0.5 x a 0-100 self-rated slider with no
// instrument behind it. The slider half is now the CIT Learning subscale (same
// paper, same licence as citacc). Four claims are pinned:
//
//   1. citLearnScore has the same shape and the same floor-of-3 as citAccScore.
//   2. When a Learning sum exists it REPLACES the slider outright - a stored
//      digitalLiteracy value must stop affecting the score entirely, or old
//      saves would be scored on two answers to the same question.
//   3. When it does not exist, the slider still runs and reproduces the
//      pre-v73 score EXACTLY. Same no-migration rule as v72.
//   4. Learning carries one SIXTH of the aspect - half of the learning third.
//      That is the decision the release was built on, and the number nothing
//      else in the codebase states out loud.

const CIT_LEARN_RAW = 9;

test("citLearnScore normalises the three-item 1-5 subscale to 0-100", () => {
  assert.equal(citLearnScore(3), 0, "raw 3 is the FLOOR, not zero items answered");
  assert.equal(citLearnScore(15), 100);
  assert.equal(citLearnScore(9), 50);
  assert.equal(citLearnScore(6), citAccScore(6), "same paper, same shape, same floor");
});

test("a Learning sum replaces the digital-literacy slider outright", () => {
  const slid = { ...PROFILE, digitalLiteracy: 0 };
  const unslid = { ...PROFILE, digitalLiteracy: 100 };
  assert.equal(
    learningScore(slid, CIT_LEARN_RAW),
    learningScore(unslid, CIT_LEARN_RAW),
    "the retired slider must not still be scoring alongside the instrument"
  );
  // 3h/5h study = 60, Learning at the midpoint = 50.
  assert.equal(learningScore(PROFILE, CIT_LEARN_RAW), 0.5 * 60 + 0.5 * 50);
});

test("the behavioural half survives the swap", () => {
  // The reason Learning takes a sixth and not a third: study hours are the only
  // term in the whole aspect that is not a self-appraisal, so they must still
  // move the score on their own.
  const more = { ...PROFILE, weeklyLearningHours: 5 };
  assert.equal(learningScore(more, CIT_LEARN_RAW) - learningScore(PROFILE, CIT_LEARN_RAW), 20);
});

test("without a Learning sum the slider still runs, reproducing the pre-v73 score", () => {
  for (const missing of [undefined, null, NaN, ""]) {
    assert.equal(
      learningScore(PROFILE, missing),
      0.5 * 60 + 0.5 * 60,
      `pre-v73 saves must not move (${String(missing)})`
    );
  }
});

test("an absent Learning sum is not silently treated as the scale floor", () => {
  assert.notEqual(learningScore(PROFILE, null), learningScore(PROFILE, 3));
});

test("CIT Learning carries exactly one sixth of the aspect, measured", () => {
  const base = personalGoalsComposite(PROFILE, GSE_RAW, CIT_RAW, CIT_LEARN_RAW);
  // Midpoint to ceiling: +50 points of subscale, half of a third of the aspect.
  const lifted = personalGoalsComposite(PROFILE, GSE_RAW, CIT_RAW, 15);
  assert.ok(Math.abs((lifted - base) - (50 / 6)) < 1e-9);
});
