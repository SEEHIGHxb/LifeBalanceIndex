// The region characters (characters.js, v122). The owner, 2026-09-27: name
// groups of people "like what the MBTI web do", and "not directly use the
// grade to define". These pin the four-way split, that every character can be
// reached, that no character is drawn from default answers, and that the
// grade plays no part.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STATE } from "../defaults.js";
import { characterFor, castIndex } from "../characters.js";
import { ASPECT_KEYS } from "../aspects.js";

const BASELINE = { cfpb: 10, who5: 15, st5: 3, lsns: 18, ucla: 4, citacc: 12, citlearn: 12, ptm: 14, geb: 14 };
const make = (profile = {}, baseline = {}) => ({
  ...DEFAULT_STATE,
  profile: { ...DEFAULT_STATE.profile, income: 30000, sleepHours: 8, weeklyLearningHours: 3, savingsRate: 15, ...profile },
  baseline: { ...BASELINE, ...baseline }
});

test("the two sides pick one of four: both, the first only, the second only, neither", () => {
  assert.equal(castIndex(true, true), 0);
  assert.equal(castIndex(true, false), 1);
  assert.equal(castIndex(false, true), 2);
  assert.equal(castIndex(false, false), 3);
});

// For each region, a pair of answers either side of each of its two lines:
// [profile or baseline patch on the first-named side, one on the other side].
const EDGES = {
  finance: [[{ p: { income: 60000 } }, { p: { income: 5000 } }], [{ b: { cfpb: 16 } }, { b: { cfpb: 4 } }]],
  physical: [
    [{ p: { weeklyModerateDays: 5, weeklyModerateMins: 40 } }, { p: { weeklyWalkingDays: 0 } }],
    [{ p: { sleepHours: 8 } }, { p: { sleepHours: 5 } }]
  ],
  mental: [[{ b: { who5: 20 } }, { b: { who5: 8 } }], [{ b: { st5: 2 } }, { b: { st5: 9 } }]],
  relationships: [[{ b: { lsns: 20 } }, { b: { lsns: 8 } }], [{ b: { ucla: 3 } }, { b: { ucla: 8 } }]],
  personalGoals: [
    [{ b: { citacc: 13 } }, { b: { citacc: 6 } }],
    [{ p: { weeklyLearningHours: 5 }, b: { citlearn: 14 } }, { p: { weeklyLearningHours: 0 }, b: { citlearn: 3 } }]
  ],
  socialContribution: [[{ p: { monthlyDonations: 500 } }, { p: { monthlyDonations: 0, volunteeringHours: 0 } }], [{ b: { ptm: 16 } }, { b: { ptm: 6 } }]],
  environment: [[{ b: { geb: 18 } }, { b: { geb: 6 } }], [{ p: { singleUsePlastics: 1 } }, { p: { singleUsePlastics: 7 } }]],
  humanityFuture: [[{ p: { savingsRate: 20 } }, { p: { savingsRate: 2 } }], [{ p: { weeklyLearningHours: 3 } }, { p: { weeklyLearningHours: 0 } }]]
};

const expectedIndex = (i, j) => castIndex(i === 0, j === 0);

for (const key of ASPECT_KEYS) {
  test(`${key}: each pair of answers lands on its own character, all four reachable`, () => {
    const [firstLine, secondLine] = EDGES[key];
    const seen = new Set();
    firstLine.forEach((x, i) => secondLine.forEach((y, j) => {
      const c = characterFor(make({ ...x.p, ...y.p }, { ...x.b, ...y.b }), key);
      assert.ok(c, `${key} gave no character`);
      assert.equal(c.index, expectedIndex(i, j), `${key}: sides ${i},${j} landed on ${c.name}`);
      assert.equal(c.cast.length, 4);
      assert.equal(c.sides.length, 2);
      assert.equal(c.research.length, 2);
      seen.add(c.name);
    }));
    assert.equal(seen.size, 4, `${key} reached only ${[...seen].join(", ")}`);
  });
}

test("the 32 names are all different", () => {
  const names = ASPECT_KEYS.flatMap(k => characterFor(make(), k).cast);
  assert.equal(names.length, 32);
  assert.equal(new Set(names).size, 32);
});

test("no character is drawn from answers that were never given", () => {
  const noBaseline = { ...make(), baseline: null };
  for (const key of ["mental", "relationships", "environment", "finance"]) {
    assert.equal(characterFor(noBaseline, key), null, `${key} named someone with no questionnaire answers`);
  }
  assert.equal(characterFor(make({ sleepHours: 0 }), "physical"), null, "no sleep answer, no Highlands character");
});

test("the grade plays no part: the same answers give the same character at any score", () => {
  const low = { ...make(), aspects: Object.fromEntries(ASPECT_KEYS.map(k => [k, 5])) };
  const high = { ...make(), aspects: Object.fromEntries(ASPECT_KEYS.map(k => [k, 95])) };
  for (const key of ASPECT_KEYS) assert.equal(characterFor(low, key).name, characterFor(high, key).name);
});

test("the Still Water's lowest character is the one beside the help numbers", () => {
  const c = characterFor(make({}, { who5: 6, st5: 9 }), "mental");
  assert.equal(c.name, "Wayfarer");
  assert.match(c.tip, /numbers are at the top of this page/);
});
