// Guideline checks — boundaries, the "not measured" states, and above all the
// ADDITIVE CONTRACT.
//
// criteria.js exists to add a criterion-referenced reading WITHOUT touching the
// norm-referenced one. The last tests in this file are the ones that matter
// most: they pin AVERAGE_ASPECT_SCORES and a fixed-profile Balance Index to the
// values they had at v39, so if anyone ever wires a criterion into scoring, the
// failure is loud and immediate rather than a silently shifted grade for every
// user.
//
// Every threshold asserted here is tested AT ITS BOUNDARY, because an off-by-one
// on a published guideline is exactly the class of bug that reads as plausible
// forever. The numbers come from the sources cited in criteria.js.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CRITERION_STATUS, evaluateCriteria, criteriaForAspect, criteriaTally
} from "../criteria.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { balanceIndex, aspectsAtOrAboveAverage, gradeAllAspects } from "../grades.js";
import { getAllBenchmarks } from "../benchmarks.js";
import { GOAL_TEMPLATES } from "../goals.js";

const { MET, UNMET, UNMEASURED } = CRITERION_STATUS;

// A synthetic profile that meets nothing, so each test can move exactly one
// field and attribute the result to it.
const BASE = {
  age: 35,
  weeklyVigorousDays: 0, weeklyVigorousMins: 0,
  weeklyModerateDays: 0, weeklyModerateMins: 0,
  weeklyWalkingDays: 0, weeklyWalkingMins: 0,
  weight: 80, height: 170, // BMI 27.7
  sleepHours: 5,
  vegetablePortions: 1
};

function statusOf(profile, id, baseline = null) {
  return evaluateCriteria(profile, baseline).find(c => c.id === id).status;
}

// --- AEROBIC ACTIVITY: 150 min moderate OR 75 min vigorous, or a 2:1 mix ---

test("aerobic activity turns over at 150 moderate minutes, not 149", () => {
  const under = { ...BASE, weeklyModerateDays: 1, weeklyModerateMins: 149 };
  const exact = { ...BASE, weeklyModerateDays: 1, weeklyModerateMins: 150 };
  assert.equal(statusOf(under, "activityAerobic"), UNMET);
  assert.equal(statusOf(exact, "activityAerobic"), MET);
});

test("aerobic activity turns over at 75 vigorous minutes, not 74", () => {
  const under = { ...BASE, weeklyVigorousDays: 1, weeklyVigorousMins: 74 };
  const exact = { ...BASE, weeklyVigorousDays: 1, weeklyVigorousMins: 75 };
  assert.equal(statusOf(under, "activityAerobic"), UNMET);
  assert.equal(statusOf(exact, "activityAerobic"), MET);
});

test("moderate and vigorous combine at the 2:1 equivalence WHO allows", () => {
  // 90 moderate + 30 vigorous = 90 + 60 = 150. Neither half qualifies alone.
  const mixed = {
    ...BASE,
    weeklyModerateDays: 1, weeklyModerateMins: 90,
    weeklyVigorousDays: 1, weeklyVigorousMins: 30
  };
  assert.equal(statusOf(mixed, "activityAerobic"), MET);
  // One minute less of vigorous and the mix falls short — proves the
  // equivalence is doing the work, not a lenient threshold somewhere.
  assert.equal(statusOf({ ...mixed, weeklyVigorousMins: 29 }, "activityAerobic"), UNMET);
});

test("walking counts toward the moderate total, matching the 3.3 MET the score uses", () => {
  const walker = { ...BASE, weeklyWalkingDays: 5, weeklyWalkingMins: 30 }; // 150
  assert.equal(statusOf(walker, "activityAerobic"), MET);
});

// --- MUSCLE STRENGTHENING: unmeasured until the review asks ---

test("muscle strengthening is unmeasured while the review has no field for it", () => {
  // Absent, null and empty string all mean "never asked", NOT "did zero days".
  assert.equal(statusOf(BASE, "activityStrength"), UNMEASURED);
  assert.equal(statusOf({ ...BASE, weeklyStrengthDays: null }, "activityStrength"), UNMEASURED);
  assert.equal(statusOf({ ...BASE, weeklyStrengthDays: "" }, "activityStrength"), UNMEASURED);
});

test("muscle strengthening grades at 2 days once the field exists", () => {
  // Forward-compatibility: adding weeklyStrengthDays to the weekly review must
  // need no edit in criteria.js. An explicit 0 is a real answer, so it is UNMET.
  assert.equal(statusOf({ ...BASE, weeklyStrengthDays: 0 }, "activityStrength"), UNMET);
  assert.equal(statusOf({ ...BASE, weeklyStrengthDays: 1 }, "activityStrength"), UNMET);
  assert.equal(statusOf({ ...BASE, weeklyStrengthDays: 2 }, "activityStrength"), MET);
});

// --- BMI: the Asia-Pacific line at 23.0, not the global 25 ---

test("BMI turns over at 23.0, the WHO Asia-Pacific line", () => {
  // At 1.70 m: 66.4 kg -> 22.98, 66.5 kg -> 23.01.
  assert.equal(statusOf({ ...BASE, weight: 66.4, height: 170 }, "bmiAsiaPacific"), MET);
  assert.equal(statusOf({ ...BASE, weight: 66.5, height: 170 }, "bmiAsiaPacific"), UNMET);
});

test("a BMI between 23 and 25 is below guideline — the defect this release fixed", () => {
  // 69.4 kg at 1.70 m is BMI 24.0. Under the old global-25 line this read as
  // fine; the Asia-Pacific line is the one that applies to this app's users.
  assert.equal(statusOf({ ...BASE, weight: 69.4, height: 170 }, "bmiAsiaPacific"), UNMET);
});

test("BMI is unmeasured without both height and weight", () => {
  assert.equal(statusOf({ ...BASE, weight: 0 }, "bmiAsiaPacific"), UNMEASURED);
  assert.equal(statusOf({ ...BASE, height: 0 }, "bmiAsiaPacific"), UNMEASURED);
  assert.equal(statusOf({ ...BASE, weight: undefined, height: undefined }, "bmiAsiaPacific"), UNMEASURED);
});

// --- SLEEP: a BAND (7-9, or 7-8 from 65), so too much is outside it too ---

test("sleep is a range, not a floor: 6.9 and 9.1 both fall outside", () => {
  assert.equal(statusOf({ ...BASE, sleepHours: 6.9 }, "sleepDuration"), UNMET);
  assert.equal(statusOf({ ...BASE, sleepHours: 7 }, "sleepDuration"), MET);
  assert.equal(statusOf({ ...BASE, sleepHours: 9 }, "sleepDuration"), MET);
  assert.equal(statusOf({ ...BASE, sleepHours: 9.1 }, "sleepDuration"), UNMET);
});

test("the older-adult band narrows to 7-8 from age 65", () => {
  assert.equal(statusOf({ ...BASE, age: 64, sleepHours: 8.5 }, "sleepDuration"), MET);
  assert.equal(statusOf({ ...BASE, age: 65, sleepHours: 8.5 }, "sleepDuration"), UNMET);
  assert.equal(statusOf({ ...BASE, age: 65, sleepHours: 8 }, "sleepDuration"), MET);
});

test("sleep is unmeasured when the field is absent", () => {
  assert.equal(statusOf({ ...BASE, sleepHours: 0 }, "sleepDuration"), UNMEASURED);
});

// --- FRUIT AND VEGETABLES: 400 g = 5 portions ---

test("vegetables turn over at 5 portions, the WHO 400 g equivalent", () => {
  assert.equal(statusOf({ ...BASE, vegetablePortions: 4.9 }, "fruitVeg"), UNMET);
  assert.equal(statusOf({ ...BASE, vegetablePortions: 5 }, "fruitVeg"), MET);
});

test("the vegetable detail line discloses that fruit is not counted", () => {
  // The app measures vegetables only, so this check is stricter than WHO
  // intends. That limitation must be stated, not buried.
  const c = criteriaForAspect({ ...BASE, vegetablePortions: 5 }, null, "physical")
    .find(x => x.id === "fruitVeg");
  assert.match(c.detail, /only about vegetables/);
});

test("vegetables are unmeasured when the field is absent", () => {
  assert.equal(statusOf({ ...BASE, vegetablePortions: 0 }, "fruitVeg"), UNMEASURED);
});

// --- WHO-5: the screening threshold at 50/100 ---

test("WHO-5 turns over above 50 of 100 — raw 12 is below, raw 13 is above", () => {
  // Raw is 0-25 and scales by 4: raw 12 -> 48, raw 13 -> 52.
  assert.equal(statusOf(BASE, "who5Threshold", { who5: 12 }), UNMET);
  assert.equal(statusOf(BASE, "who5Threshold", { who5: 13 }), MET);
});

test("a WHO-5 of exactly 50 is not above the threshold", () => {
  // Raw 12.5 is not reachable from integer items, but the boundary is asserted
  // so the comparison can never drift from strictly-greater-than.
  assert.equal(statusOf(BASE, "who5Threshold", { who5: 12.5 }), UNMET);
});

test("the WHO-5 shortfall wording is a prompt, never a diagnosis or a rank", () => {
  // Duty of care: this is a clinical SCREENING threshold. The wording must not
  // imply a diagnosis or a population standing.
  const c = evaluateCriteria(BASE, { who5: 8 }).find(x => x.id === "who5Threshold");
  assert.equal(c.status, UNMET);
  assert.match(c.detail, /not a diagnosis or a ranking/);
  assert.doesNotMatch(c.detail, /average|percentile/i);
});

test("WHO-5 is unmeasured until the questionnaire is answered", () => {
  assert.equal(statusOf(BASE, "who5Threshold", null), UNMEASURED);
  assert.equal(statusOf(BASE, "who5Threshold", {}), UNMEASURED);
  assert.equal(statusOf(BASE, "who5Threshold", { who5: "abc" }), UNMEASURED);
});

// --- SHAPE, SOURCING AND ROBUSTNESS ---

test("every criterion carries an id, aspect, status and a resolvable source", () => {
  const all = evaluateCriteria(BASE, { who5: 13 });
  assert.equal(all.length, 6);
  const valid = new Set([MET, UNMET, UNMEASURED]);
  for (const c of all) {
    assert.ok(c.id, "criterion needs an id");
    assert.ok(["physical", "mental"].includes(c.aspect), `unexpected aspect ${c.aspect}`);
    assert.ok(valid.has(c.status), `unexpected status ${c.status}`);
    assert.ok(c.summary && c.detail, `${c.id} needs a summary and a detail`);
    // A criterion without a live citation is exactly the precision theater the
    // whole module refuses.
    assert.ok(c.source && c.source.label && c.source.url, `${c.id} needs a source`);
    assert.match(c.source.url, /^https:\/\//, `${c.id} source must be an https URL`);
  }
  // Every id is unique, so the UI can key rows on it.
  assert.equal(new Set(all.map(c => c.id)).size, 6);
});

test("criteriaForAspect returns an empty array for the six uncovered aspects", () => {
  for (const key of ["finance", "relationships", "personalGoals", "socialContribution", "environment", "humanityFuture"]) {
    assert.deepEqual(criteriaForAspect(BASE, null, key), [], `${key} should have no criteria`);
  }
  assert.equal(criteriaForAspect(BASE, null, "physical").length, 5);
  assert.equal(criteriaForAspect(BASE, null, "mental").length, 1);
});

test("the tally counts only measurable checks, never scoring 'not asked' as a miss", () => {
  // BASE meets nothing measurable; strength is unmeasured and so is WHO-5.
  assert.deepEqual(criteriaTally(BASE, null), { met: 0, total: 4 });
  const healthy = {
    ...BASE,
    weeklyModerateDays: 5, weeklyModerateMins: 40,
    weight: 60, height: 170, sleepHours: 8, vegetablePortions: 5,
    weeklyStrengthDays: 3
  };
  assert.deepEqual(criteriaTally(healthy, { who5: 20 }), { met: 6, total: 6 });
});

test("hostile and garbage profile values coerce instead of throwing", () => {
  const hostile = {
    age: "<script>", weight: "NaN", height: {}, sleepHours: [],
    vegetablePortions: "abc", weeklyModerateDays: Infinity, weeklyModerateMins: "12x",
    weeklyStrengthDays: "two"
  };
  assert.doesNotThrow(() => evaluateCriteria(hostile, { who5: undefined }));
  const all = evaluateCriteria(hostile, { who5: undefined });
  assert.equal(all.length, 6);
  for (const c of all) {
    assert.equal(typeof c.detail, "string");
    assert.ok(!c.detail.includes("NaN"), `${c.id} leaked NaN into its detail`);
    assert.ok(!c.detail.includes("undefined"), `${c.id} leaked undefined into its detail`);
  }
  assert.doesNotThrow(() => evaluateCriteria(null, null));
  assert.doesNotThrow(() => evaluateCriteria(undefined, undefined));
});

// --- REGRESSION GUARDS FOR THE TWO DEFECTS THIS RELEASE FIXED ---

test("the BMI benchmark note reports the Asia-Pacific line, not the global 25", () => {
  // getAllBenchmarks takes a STATE object, not (profile, baseline).
  const b = getAllBenchmarks({
    profile: { ...BASE, weight: 69.4, height: 170, gender: "female", income: 15000, region: "Provinces" },
    baseline: null
  });
  const note = b.physical.notes.join(" ");
  assert.match(note, /23\.0/, "the BMI note must state the Asia-Pacific line");
  assert.doesNotMatch(note, /BMI-25 line/, "the retired global-25 wording must be gone");
  // The Thai NHES share stays pinned to the >= 25 figure it actually measures —
  // no interpolated >= 23 share is invented.
  assert.match(note, /BMI 25 or above/);
});

test("the vegetable pledge default matches the WHO guideline it cites", () => {
  assert.equal(GOAL_TEMPLATES.veg.def, 5);
  assert.match(GOAL_TEMPLATES.veg.desc, /400 g/);
  // min must still admit every previously-valid stored target so no saved
  // pledge is invalidated by the change.
  assert.ok(GOAL_TEMPLATES.veg.min <= 3);
});

// --- THE ADDITIVE CONTRACT ---
//
// The most important tests in this release. Criteria are a SEPARATE reading and
// must not perturb the norm-referenced stack. These values are the v39 numbers;
// a diff here means a criterion leaked into scoring.

test("AVERAGE_ASPECT_SCORES is unchanged from v39", () => {
  assert.deepEqual({ ...AVERAGE_ASPECT_SCORES }, {
    finance: 55, physical: 62, mental: 69, relationships: 70,
    personalGoals: 59, socialContribution: 32, environment: 50, humanityFuture: 44
  });
});

test("the Balance Index and the at-or-above-average standing are unchanged from v39", () => {
  const aspects = {
    finance: 60, physical: 55, mental: 70, relationships: 65,
    personalGoals: 50, socialContribution: 40, environment: 45, humanityFuture: 35
  };
  assert.equal(balanceIndex(aspects), 47);
  assert.deepEqual(aspectsAtOrAboveAverage(aspects), { count: 3, total: 8 });
});

test("evaluating criteria does not mutate the profile or move any grade", () => {
  const profile = {
    ...BASE, weight: 69.4, height: 170, gender: "female",
    income: 15000, region: "Provinces", savingsRate: 10
  };
  const baseline = { who5: 13, st5: 3, lsns: 17, ucla: 4, gse: 18, grit: 14, cfpb: 10 };
  const before = JSON.stringify(profile);
  const gradesBefore = gradeAllAspects(getAllBenchmarks({ profile, baseline }));

  evaluateCriteria(profile, baseline);
  criteriaTally(profile, baseline);

  assert.equal(JSON.stringify(profile), before, "criteria must not mutate the profile");
  assert.deepEqual(
    gradeAllAspects(getAllBenchmarks({ profile, baseline })),
    gradesBefore,
    "no grade may change when criteria are evaluated"
  );
  // The grades must be real, not all-null — otherwise this test would pass
  // vacuously by comparing two empty sets.
  assert.ok(Object.values(gradesBefore).some(g => g && g.grade), "expected at least one real grade");
});

test("no criterion exposes a percentile, score or grade field", () => {
  // Shape-level guard against the mixed-basis mistake grades.js:54-63 refuses:
  // if a criterion ever carried a percentile, something would eventually grade
  // on it.
  for (const c of evaluateCriteria(BASE, { who5: 13 })) {
    for (const banned of ["percentile", "score", "grade", "range", "method"]) {
      assert.ok(!(banned in c), `${c.id} must not carry a "${banned}" field`);
    }
  }
});
