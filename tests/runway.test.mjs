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
//      and a bar is a claim about where a number sits on a scale. Round 11
//      (closed 2026-08-22) found that such a scale IS published — the FinHealth
//      Score Toolkit scores this question at 1/8 weight with explicit point
//      values — but it divides by TOTAL spending where committedOutflow is the
//      unskippable subset, it is licensed for software use, and it carries no
//      psychometric validation. Runway therefore stays a fact PERMANENTLY,
//      decided 2026-08-22. This file is the guard on that decision.
//
//   3. NOTHING ABOUT THE SCORE MOVES. Not the finance score, not any of the
//      other seven, not the Balance Index. This is the guard that makes v70
//      safe to ship without an anchor: if a future edit quietly weights runway
//      into a composite, this file fails before anyone's number changes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  // Two facts since v76: saving joined runway here when round 14 removed the
  // term that scored it. Found by key rather than by position, so adding a
  // third never silently re-points this test at the wrong row.
  const runway = detail.facts.find(f => f.key === "runway");
  assert.ok(runway, "runway is missing from the facts list");
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
  assert.equal(detail.facts.find(f => f.key === "runway"), undefined);
});

test("v76: the savings fact is omitted rather than shown as 0% with no income", () => {
  // Same contract as runway, and as bmiScore before it: an undefined figure is
  // left out, never printed as a zero the user could mistake for a measurement.
  const noIncome = getAspectDetail(makeState({ income: 0, savingsRate: 10 }), "finance");
  assert.equal(noIncome.facts.find(f => f.key === "savings"), undefined);
  const noSaving = getAspectDetail(makeState({ income: 30000, savingsRate: 0 }), "finance");
  assert.equal(noSaving.facts.find(f => f.key === "savings"), undefined);
});

test("only Finance has facts; the other seven aspects carry an empty list", () => {
  // Not an accident of the current data — the bundle always has the key, so a
  // view can render it unconditionally without a presence check.
  const state = makeState({ liquidSavings: 60000, committedOutflow: 12000 });
  assert.ok(getAspectDetail(state, "finance").facts.length >= 1, "finance has facts");
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

// --- v79: THE TWO INPUTS ARE OPTIONAL, AND SILENCE IS NOT A ZERO -----------
//
// Making onboarding's two runway boxes optional gave `liquidSavings: 0` a
// second meaning. It had been one fact ("I have nothing I can reach"); it is
// now also "I did not answer that". runwayMonths sees 0 either way and returns
// 0 months, so without a guard the page would print "0 months" -- a statement
// about this reader's finances that the reader never made -- to everyone who
// skipped the box. These tests pin the distinction and the invitation that
// takes the row's place.

test("v79: a skipped input is not a zero \u2014 the runway row is omitted, not printed as 0", () => {
  const state = makeState({
    liquidSavings: 0, committedOutflow: 12000,
    provided: { liquidSavings: false, committedOutflow: true }
  });
  const facts = getAspectDetail(state, "finance").facts;
  assert.equal(facts.find(f => f.key === "runway"), undefined,
    "a runway was printed from a number the reader never gave");
});

test("v79: an OVERSTATING runway is refused too, not just an understating one", () => {
  // Skipping the outflow box while filling in family support leaves a
  // denominator that is only part of what cannot be skipped. A denominator
  // that is too small makes the runway too LONG, which is the direction that
  // tells someone they are safer than they are.
  const state = makeState({
    liquidSavings: 120000, committedOutflow: 0, familySupport: 5000,
    provided: { liquidSavings: true, committedOutflow: false }
  });
  assert.equal(runwayMonths(state.profile), 24, "the raw arithmetic still divides");
  assert.equal(getAspectDetail(state, "finance").facts.find(f => f.key === "runway"), undefined,
    "but the page must not print 24 months off half a denominator");
});

test("v79: a save from before coverage was captured still shows its runway", () => {
  // The back-compat case, and the one a careless implementation breaks. On
  // these saves the fields were REQUIRED, so their owners did answer; an
  // absent `provided` map means unknown, never missing.
  const state = makeState({ liquidSavings: 60000, committedOutflow: 12000 });
  delete state.profile.provided;
  const runway = getAspectDetail(state, "finance").facts.find(f => f.key === "runway");
  assert.ok(runway, "an older save lost the row it had already earned");
  assert.equal(runway.display, "5 months");
});

test("v79: both inputs given means the row is back and the invitation is gone", () => {
  const state = makeState({
    liquidSavings: 60000, committedOutflow: 12000,
    provided: { liquidSavings: true, committedOutflow: true }
  });
  const detail = getAspectDetail(state, "finance");
  assert.ok(detail.facts.find(f => f.key === "runway"), "the row must render");
  assert.equal(detail.invite, null, "and must not be asked for twice");
});

test("v79: the invitation appears exactly when the row does not", () => {
  // The two must never disagree: an invitation beside a printed runway reads
  // as a bug, and a missing row with no explanation reads as one too. Both
  // answers come from runwayInputsMissing, and this is the guard on that.
  const cases = [
    { liquidSavings: false, committedOutflow: false },
    { liquidSavings: true, committedOutflow: false },
    { liquidSavings: false, committedOutflow: true },
    { liquidSavings: true, committedOutflow: true }
  ];
  for (const provided of cases) {
    const state = makeState({ liquidSavings: 60000, committedOutflow: 12000, provided });
    const detail = getAspectDetail(state, "finance");
    const hasRow = Boolean(detail.facts.find(f => f.key === "runway"));
    const hasInvite = Boolean(detail.invite);
    assert.equal(hasRow, !hasInvite,
      `row and invitation disagree for ${JSON.stringify(provided)}`);
  }
});

test("v79: the invitation is finance-only and never carries a score", () => {
  const state = makeState({ provided: { liquidSavings: false, committedOutflow: false } });
  for (const key of ["physical", "mental", "relationships", "personalGoals",
                     "socialContribution", "environment", "humanityFuture"]) {
    assert.equal(getAspectDetail(state, key).invite, null, key + " grew an invitation");
  }
  const invite = getAspectDetail(state, "finance").invite;
  assert.equal(invite.value, undefined, "an invitation must never carry a bar value");
  assert.equal(invite.href, "#/profile");
});

test("v80: onboarding does not ask for the runway figures at all", () => {
  // v79 made these optional and left them on step 1. That fixed the gate and
  // not the confusion -- a tester still met three questions about a
  // household's cash position on the step whose header promises the answers
  // will be "compared against real population benchmarks", and none of the
  // three is compared against anything. v80 removes them; #/deep and the
  // Profile page ask instead.
  //
  // Source-level, because this suite has no DOM harness to submit the form
  // through. It fails on the defect: putting either the field or its reader
  // back trips it.
  // TWO FILES SINCE v81. The chapter rewrite split onboarding into an engine
  // (views/onboarding.js, which reads the form and submits) and a content model
  // (views/journey.js, which declares the fields). A runway field could be
  // reintroduced in either, so both are read and the absence is asserted across
  // the pair -- checking only the engine would have let the field back in
  // through the chapter that declares it.
  const engine = readFileSync(
    new URL("../views/onboarding.js", import.meta.url), "utf8");
  const content = readFileSync(
    new URL("../views/journey.js", import.meta.url), "utf8");
  const onboarding = engine + content;
  for (const id of ["onb-liquid", "onb-outflow", "onb-family"]) {
    assert.ok(!new RegExp(`numberField\\("${id}"`).test(onboarding),
      id + " is back on the onboarding form \u2014 the runway is being asked for "
      + "inside the mandatory gate again");
  }
  for (const field of ["liquidSavings", "committedOutflow", "familySupport"]) {
    assert.ok(!new RegExp(`${field}: val\\(`).test(onboarding),
      field + " is being read out of the onboarding form again");
  }
  // And the flow is still a real form asking for real numbers, so this cannot
  // pass by onboarding having been emptied or renamed out from under it.
  const savings = content.match(/numberField\("onb-savings"[\s\S]*?\}\)\}/);
  assert.ok(savings, "onboarding no longer asks for monthly savings either");
  assert.match(savings[0], /required:\s*true/,
    "monthly savings must still be required \u2014 it sets the goal target");
});

test("v80: the in-depth assessment asks instead, without requiring or scoring", () => {
  const deep = readFileSync(
    new URL("../views/assessments.js", import.meta.url), "utf8");

  for (const id of ["deep-liquid", "deep-outflow", "deep-family"]) {
    const call = deep.match(new RegExp(`numberField\\("${id}"[\\s\\S]*?\\}\\)\\}`));
    assert.ok(call, id + " is missing from the in-depth assessment");
    assert.ok(!/required:\s*true/.test(call[0]),
      id + " is required again \u2014 three unscored figures must not gate a "
      + "questionnaire");
  }

  // Its OWN form. This is the whole design of the move: v79 rejected putting
  // these on the deep page because that page is a structure for scored
  // instruments, and the answer is that they are not inside one. Merging them
  // into .deep-form would make three optional money boxes blockable by an
  // unanswered Likert item and would carry them into submitDeepAssessment.
  assert.match(deep, /<form id="deep-runway-form">/,
    "the runway figures must stay a separate form from the deep instrument");

  // Saved through the profile mutator, so blank-means-zero for family support
  // and the provided flags are decided in exactly one place.
  assert.match(
    deep,
    /stateManager\.updateProfile\(\{[\s\S]*?liquidSavings:[\s\S]*?committedOutflow:[\s\S]*?familySupport:[\s\S]*?\}\)/,
    "the runway form must save all three figures through updateProfile");

  // And nothing about them may reach the assessment mutator: no XP, no
  // verified badge, no score movement for typing in a bank balance.
  const handler = deep.slice(deep.indexOf("const runwayForm"));
  const handlerEnd = handler.indexOf("container.querySelectorAll");
  assert.ok(handlerEnd > 0, "the runway submit handler is no longer where this guard reads it");
  assert.ok(!/submitDeepAssessment/.test(handler.slice(0, handlerEnd)),
    "the runway form is submitting through submitDeepAssessment \u2014 unscored "
    + "figures must not verify an aspect or award XP");
});
