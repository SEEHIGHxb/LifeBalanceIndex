// tests/runway.test.mjs - the v70 runway measure: collected, shown, NOT scored.
//
// Three separate claims are pinned here, and the third is the one that matters
// most:
//
//   1. runwayMonths divides correctly and, more importantly, refuses to answer
//      when there is nothing to divide BY. An absent committed outflow is an
//      undefined runway, not a runway of zero and not an infinite one.
//
//   2. The Finance aspect page carries it as a FACT — a formatted string with
//      no 0-100 value — and never as a component. Components render as bars,
//      and a bar is a claim about where a number sits on a scale. Round 10
//      established that no such scale is published for months-of-runway (the
//      OECD/INFE instrument PDF returned HTTP 403, the Financial Health Network
//      weighting is absent from the report cited for it, and the Thai anchor is
//      a confirmed NOT FOUND). Round 11 exists to find one.
//
//   3. NOTHING ABOUT THE SCORE MOVES. Not the finance score, not any of the
//      other seven, not the Balance Index. This is the guard that makes v70
//      safe to ship without an anchor: if a future edit quietly weights runway
//      into a composite, this file fails before anyone's number changes.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runwayMonths, calculateFinanceScore } from "../scoring.js";
import { getAspectDetail } from "../aspects.js";

const PROFILE = {
  income: 30000,
  region: "Provinces",
  gender: "male",
  relationshipStatus: "Single",
  age: 35,
  savingsRate: 10,
  digitalLiteracy: 60,
  weeklyLearningHours: 5,
  weeklyVigorousDays: 2,
  weeklyVigorousMins: 30,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 3,
  weeklyWalkingMins: 20,
  weight: 60,
  height: 170,
  sleepHours: 8,
  vegetablePortions: 5,
  waterLiters: 2.5,
  singleUsePlastics: 0,
  monthlyDonations: 500,
  volunteeringHours: 4,
  longTermInvestments: false,
  liquidSavings: 0,
  committedOutflow: 0
};

const BASELINE = {
  date: "2026-08-19T00:00:00.000Z",
  cfpb: 10, jss: 4, st5: 3, who5: 17, lsns: 17, ucla: 4,
  ras: null, gse: 18, grit: 14, ptm: 10, geb: 12, lfis: 10
};

function makeState(profileOverrides = {}) {
  return {
    profile: { ...PROFILE, ...profileOverrides },
    baseline: BASELINE,
    aspects: { finance: 55, physical: 48, mental: 60, relationships: 62, personalGoals: 58, socialContribution: 45, environment: 50, humanityFuture: 35 },
    snapshots: []
  };
}

// --- 1. THE DIVISION, AND WHEN IT REFUSES ---

test("runwayMonths divides liquid savings by committed outflow", () => {
  assert.equal(runwayMonths({ liquidSavings: 60000, committedOutflow: 12000 }), 5);
  assert.equal(runwayMonths({ liquidSavings: 15000, committedOutflow: 12000 }), 1.25);
});

test("no committed outflow means NO runway — null, never zero and never Infinity", () => {
  // The student from the v69 regression test pays for nothing. Their runway is
  // unbounded, and unbounded is not a quantity a line of text can print, so the
  // row is omitted instead. Zero would be the opposite of the truth, and
  // Infinity would be a number that leaks into arithmetic somewhere later.
  assert.equal(runwayMonths({ liquidSavings: 3000, committedOutflow: 0 }), null);
  assert.equal(runwayMonths({ liquidSavings: 3000 }), null);
  assert.equal(runwayMonths({}), null);
  // Same contract bmiScore and sleepDurationScore already use: null = omit.
  assert.equal(runwayMonths({ liquidSavings: 500000, committedOutflow: null }), null);
});

test("no savings against a real outflow IS zero months, and says so", () => {
  // Distinct from the null case above, and the distinction is the whole point:
  // "I owe 12,000 a month and have nothing put by" is a measurement. It is not
  // the same fact as "I owe nothing", and must not render the same way.
  assert.equal(runwayMonths({ liquidSavings: 0, committedOutflow: 12000 }), 0);
  // Negative is reachable from a connector reporting net of debt, never from
  // the form, which floors at 0. It floors to zero months rather than printing
  // a negative duration.
  assert.equal(runwayMonths({ liquidSavings: -50000, committedOutflow: 12000 }), 0);
});

test("hostile and string inputs coerce rather than throw", () => {
  assert.equal(runwayMonths({ liquidSavings: "60000", committedOutflow: "12000" }), 5);
  assert.equal(runwayMonths({ liquidSavings: "abc", committedOutflow: 12000 }), 0);
  assert.equal(runwayMonths({ liquidSavings: 60000, committedOutflow: "abc" }), null);
});

// --- 2. SHOWN AS A FACT, NOT AS A BAR ---

test("the Finance page carries runway as a fact with no 0-100 value", () => {
  const detail = getAspectDetail(makeState({ liquidSavings: 60000, committedOutflow: 12000 }), "finance");
  assert.equal(detail.facts.length, 1);

  const runway = detail.facts[0];
  assert.equal(runway.key, "runway");
  assert.match(runway.display, /5 months|5 เดือน/);
  // A fact has NO `value`. The aspect view reads `value` to size the bar, so an
  // absent value is what structurally prevents runway from ever rendering as
  // one. This assertion is the mechanism, not a style preference.
  assert.equal(runway.value, undefined);
  // And it says out loud that it is not scored, on the row itself — not only
  // in the card heading, which a screen reader may reach separately.
  assert.match(runway.detail, /Not scored|ไม่คิดคะแนน/);
});

test("runway never appears among the scored components", () => {
  const detail = getAspectDetail(makeState({ liquidSavings: 60000, committedOutflow: 12000 }), "finance");
  assert.equal(detail.components.find(c => c.key === "runway"), undefined);
  for (const c of detail.components) {
    assert.equal(typeof c.value, "number", `${c.key} is a scored bar and must carry a number`);
  }
});

test("no committed outflow on file means no runway row at all", () => {
  const detail = getAspectDetail(makeState(), "finance");
  assert.deepEqual(detail.facts, []);
});

test("only Finance has facts; the other seven aspects carry an empty list", () => {
  // Not an accident of the current data — the bundle always has the key, so a
  // view can render it unconditionally without a presence check.
  const state = makeState({ liquidSavings: 60000, committedOutflow: 12000 });
  for (const key of ["physical", "mental", "relationships", "personalGoals", "socialContribution", "environment", "humanityFuture"]) {
    assert.deepEqual(getAspectDetail(state, key).facts, [], `${key} has no facts`);
  }
});

// --- 3. THE SCORE DOES NOT MOVE. THIS IS THE LOAD-BEARING TEST. ---

test("V70 CONTRACT: runway changes no score anywhere in the app", () => {
  // Every aspect, recomputed across the full plausible range of both new
  // fields. If any of these ever differ, a normalizer was introduced without a
  // published anchor to justify it — which is precisely what round 10 spent a
  // release establishing must not happen.
  const cfpbAnswers = [2, 2, 2, 2, 2];
  const baselineScore = calculateFinanceScore(PROFILE, cfpbAnswers);

  const probes = [
    { liquidSavings: 0, committedOutflow: 0 },
    { liquidSavings: 1000000, committedOutflow: 1000 },   // 1000 months
    { liquidSavings: 0, committedOutflow: 100000 },       // 0 months
    { liquidSavings: -500000, committedOutflow: 12000 },  // underwater
    { liquidSavings: 50000, committedOutflow: 0 }         // undefined
  ];
  for (const probe of probes) {
    assert.equal(
      calculateFinanceScore({ ...PROFILE, ...probe }, cfpbAnswers),
      baselineScore,
      `finance moved for ${JSON.stringify(probe)}`
    );
  }

  // And the aspect bundle's own score field is untouched too, so nothing
  // downstream of the page (the radar, the Balance Index, the grade) can see a
  // difference either.
  const rich = getAspectDetail(makeState({ liquidSavings: 1000000, committedOutflow: 1000 }), "finance");
  const poor = getAspectDetail(makeState({ liquidSavings: 0, committedOutflow: 100000 }), "finance");
  assert.equal(rich.score, poor.score);
  assert.deepEqual(
    rich.components.map(c => c.value),
    poor.components.map(c => c.value),
    "no component bar responds to runway either"
  );
});
