// Tests for the derived population-average radar overlay (node --test).
//
// AVERAGE_ASPECT_SCORES is computed by running a cited reference person
// through the real aspect calculators, so these tests pin its SHAPE exactly
// but its VALUES only within a band: a deliberate formula change may move an
// average a little, and that's fine — but a change that wrecks an average
// (e.g. a broken normalizer pushing "average mental" to 5/100) must fail
// loudly here rather than quietly mislead everyone's radar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { gradeForFinance } from "../grades.js";

// Hand-computed from the reference inputs documented in averages.js. Re-synced
// in v64: personalGoals 59 -> 57 (grit left the composite) and humanityFuture
// 44 -> 50 (the pension left the security term). finance had also been reading
// 55 since v46's income-magnitude change — the ±15 tolerance hid all three, so
// they are corrected here rather than left as three wrong numbers under a
// comment claiming they were hand-computed.
const EXPECTED = {
  finance: 49,
  physical: 62,
  mental: 69,
  relationships: 70,
  personalGoals: 57,
  socialContribution: 32,
  environment: 50,
  humanityFuture: 50
};
const TOLERANCE = 15;

test("average table covers exactly the eight aspects", () => {
  assert.deepEqual(
    Object.keys(AVERAGE_ASPECT_SCORES).sort(),
    Object.keys(EXPECTED).sort()
  );
});

test("every average is an integer within 0-100", () => {
  for (const [aspect, value] of Object.entries(AVERAGE_ASPECT_SCORES)) {
    assert.ok(Number.isInteger(value), `${aspect}: expected integer, got ${value}`);
    assert.ok(value >= 0 && value <= 100, `${aspect}: ${value} out of 0-100`);
  }
});

test("every average stays near its documented reference value", () => {
  for (const [aspect, expected] of Object.entries(EXPECTED)) {
    const actual = AVERAGE_ASPECT_SCORES[aspect];
    assert.ok(
      Math.abs(actual - expected) <= TOLERANCE,
      `${aspect}: ${actual} drifted more than ±${TOLERANCE} from the documented ${expected} — ` +
      "a calculator change moved the population average; re-derive and update averages.js"
    );
  }
});

test("the average table is frozen", () => {
  assert.ok(Object.isFrozen(AVERAGE_ASPECT_SCORES));
});

test("v77: the finance reference average is grade-bearing and must be pinned tightly", () => {
  // Since v77 AVERAGE_ASPECT_SCORES.finance is the axis the Finance LETTER
  // GRADE is computed against (gradeForFinance), not just a radar outline. The
  // suite's general TOLERANCE of ±15 is far too loose for that: a drift of 15
  // moves a score-73 user from B to C with no test failing.
  //
  // Pinned to ±2 here, deliberately separate from the loose radar tolerance.
  // If this fails, a scoring change moved the reference person — decide whether
  // the grade boundary should move with it, then update this number on purpose.
  assert.ok(Math.abs(AVERAGE_ASPECT_SCORES.finance - 49) <= 2,
    `finance reference average is ${AVERAGE_ASPECT_SCORES.finance}, expected ~49`);

  // The grade boundaries this actually produces, so a shift is visible as a
  // behaviour change rather than as a number.
  assert.equal(gradeForFinance(73).grade, "B");
  assert.equal(gradeForFinance(49).grade, "C");
  assert.equal(gradeForFinance(22).grade, "D");
});
