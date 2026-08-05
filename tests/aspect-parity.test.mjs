// Aspect-page components must BE the scoring.js formulas, not copies of them.
//
// The finding #13 dedup ("single source of truth") only reached formulas that
// already had a NAME. Five aspects.js rows were inline object-literal
// expressions — giving, volunteering, sleep, nutrition, savings — and the
// refactor could not see them. Two then drifted from the scorer in the ordinary
// course of work:
//
//   giving  — born wrong (07-03). scoring.js maxes the factor at 2% of income
//             OR 500 THB/mo; the row only ever knew the 500 branch, so anyone
//             under ~25,000 THB/mo saw a bar contradicting their own score.
//   sleep   — drifted (07-14). The commit that stopped an ABSENT duration from
//             fabricating a floor of 50 said it was "matching aspects.js". It
//             wasn't: aspects.js had no null path, so the fabricated 50 the fix
//             existed to remove stayed live on the page it was removed for.
//
// Neither had a test that could fail. This is that test. It pins every
// profile-derived component row to the scoring.js function behind it, across
// profiles chosen to separate the formulas that used to be confused — so
// re-inlining an expression, or changing one side of a pair, breaks the build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getAspectDetail } from "../aspects.js";
import {
  clamp100,
  savingsHabitScore,
  activityScore,
  metMinutes,
  bmiScore,
  sleepQualityScore,
  sleepScore,
  nutritionScore,
  plasticScore,
  learningScore,
  futureStudyScore,
  donationVolumeFactor,
  volunteerFactor
} from "../scoring.js";

const BASE_PROFILE = {
  income: 15000,
  region: "Provinces",
  gender: "male",
  age: 30,
  relationshipStatus: "Single",
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
  longTermInvestments: true
};

const BASELINE = {
  date: "2026-07-03T00:00:00.000Z",
  cfpb: 10, jss: 4, st5: 3, who5: 17, lsns: 17, ucla: 4,
  ras: null, gse: 18, grit: 14, ptm: 10, geb: 12, lfis: 10
};

// Each case names a profile that makes at least one formula's edge cases
// reachable. The regression profiles come first: they are the exact inputs the
// two shipped bugs produced wrong numbers for.
const PROFILES = {
  "baseline (all fields present)": {},

  // --- giving: the 2%-of-income branch, which the old row did not implement.
  // 200/8,000 = 2.5% -> the scorer says 100, the old row said 40.
  "low income, small donation (2% branch)": { income: 8000, monthlyDonations: 200 },
  "low income, donation just under 2%": { income: 8000, monthlyDonations: 150 },
  "high income, 500 THB (flat branch only)": { income: 200000, monthlyDonations: 500 },
  "no donations": { monthlyDonations: 0 },
  "no income at all": { income: 0, monthlyDonations: 300 },

  // --- sleep: absent duration must NOT fabricate a 50-point floor.
  "sleep duration absent": { sleepHours: 0 },
  "sleep duration absent, perfect quality": { sleepHours: 0 },
  "short night (5h)": { sleepHours: 5 },
  "borderline night (6.5h)": { sleepHours: 6.5 },
  "long night (10h)": { sleepHours: 10 },

  // --- the three rows that had not yet drifted, held to the same rule.
  "no savings": { savingsRate: 0 },
  "savings above the 20% cap": { savingsRate: 45 },
  "no volunteering": { volunteeringHours: 0 },
  "volunteering above the 4h cap": { volunteeringHours: 12 },
  "nutrition above both caps": { vegetablePortions: 9, waterLiters: 6 },
  "nutrition at zero": { vegetablePortions: 0, waterLiters: 0 },

  // --- omission contracts (a missing input drops its row, never fakes one).
  "no body measurements": { weight: 0, height: 0 },
  "empty profile": Object.fromEntries(Object.keys(BASE_PROFILE).map(k => [k, ""]))
};

// component key -> the scoring.js expression it must equal, given (profile,
// baseline). A formula returning null means "this row must be absent".
const EXPECTED = {
  finance: {
    savings: p => savingsHabitScore(p)
  },
  physical: {
    activity: p => activityScore(metMinutes(p)),
    body: p => bmiScore(p),
    sleep: (p, b) => (b && Number.isFinite(b.jss) ? sleepScore(p, sleepQualityScore(b.jss)) : null),
    nutrition: p => nutritionScore(p)
  },
  personalGoals: {
    learning: p => learningScore(p)
  },
  socialContribution: {
    giving: p => donationVolumeFactor(p),
    volunteering: p => volunteerFactor(p)
  },
  environment: {
    plastic: p => plasticScore(p)
  },
  humanityFuture: {
    skills: p => futureStudyScore(p)
  }
};

function makeState(profile, baseline) {
  return {
    profile,
    baseline,
    aspects: { finance: 55, physical: 48, mental: 60, relationships: 62, personalGoals: 58, socialContribution: 45, environment: 50, humanityFuture: 35 },
    snapshots: []
  };
}

test("every profile-derived aspect component equals its scoring.js counterpart", () => {
  for (const [name, overrides] of Object.entries(PROFILES)) {
    const profile = { ...BASE_PROFILE, ...overrides };
    // "perfect quality" needs a jss of 0; every other case uses the shared one.
    const baseline = name.endsWith("perfect quality") ? { ...BASELINE, jss: 0 } : BASELINE;
    const state = makeState(profile, baseline);

    for (const [aspectKey, components] of Object.entries(EXPECTED)) {
      const rows = getAspectDetail(state, aspectKey).components;
      for (const [compKey, formula] of Object.entries(components)) {
        const row = rows.find(c => c.key === compKey);
        const expected = formula(profile, baseline);
        const where = `${name} / ${aspectKey}.${compKey}`;
        if (expected === null) {
          assert.equal(row, undefined, `${where}: row must be omitted, not fabricated`);
          continue;
        }
        assert.ok(row, `${where}: row is missing`);
        assert.equal(row.value, clamp100(expected), `${where}: page shows ${row && row.value}, scoring.js says ${clamp100(expected)}`);
      }
    }
  }
});

// The two shipped bugs, pinned as explicit regressions. If the parity sweep
// above is ever weakened, these still name the exact numbers that were wrong.
test("regression: giving honours the 2%-of-income cap (was 40, scorer said 100)", () => {
  const profile = { ...BASE_PROFILE, income: 8000, monthlyDonations: 200 };
  const row = getAspectDetail(makeState(profile, BASELINE), "socialContribution")
    .components.find(c => c.key === "giving");
  assert.equal(row.value, 100);
});

test("regression: an absent sleep duration does not fabricate a floor of 50", () => {
  const profile = { ...BASE_PROFILE, sleepHours: 0 };
  const baseline = { ...BASELINE, jss: 0 }; // perfect measured quality -> 100
  const row = getAspectDetail(makeState(profile, baseline), "physical")
    .components.find(c => c.key === "sleep");
  // The old row computed 0.5*50 + 0.5*100 = 75 from a duration nobody reported.
  assert.equal(row.value, 100);
  assert.equal(row.label, "Sleep quality");
});

test("sleep is omitted entirely when neither duration nor quality was measured", () => {
  const profile = { ...BASE_PROFILE, sleepHours: 0 };
  const rows = getAspectDetail(makeState(profile, null), "physical").components;
  assert.equal(rows.find(c => c.key === "sleep"), undefined);
  assert.ok(rows.some(c => c.key === "activity"), "the rest of the aspect still renders");
});
