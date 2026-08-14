// Tests for the WHO-5 age-banded percentile table (node --test).
//
// The table is transcribed from Kliem et al. 2025, Front Psychol 16:1592614,
// Table 2. These tests exist mainly to catch a transcription typo, which is the
// one failure mode a lookup table has that a formula does not.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WHO5_PERCENTILE_TABLE,
  who5AgeBand,
  normalCdf,
  percentileRange,
  getAllBenchmarks
} from "../benchmarks.js";
import { AVERAGE_ASPECT_SCORES } from "../averages.js";
import { balanceIndex, aspectsAtOrAboveAverage } from "../grades.js";
import { encodeComparisonCode, decodeComparisonCode } from "../comparison-code.js";

const BANDS = ["total", "a16", "a25", "a35", "a45", "a55", "a65", "a75"];
const SCORES = Array.from({ length: 26 }, (_, i) => i * 4);

const PROFILE = { income: 15000, region: "Provinces", gender: "male" };
const BASELINE = { date: "2026-07-03T00:00:00.000Z", who5: 17, st5: 3, lsns: 17, ucla: 4, gse: 18, grit: 14 };

function mental(profileOverrides = {}, baselineOverrides = {}) {
  return getAllBenchmarks({
    profile: { ...PROFILE, ...profileOverrides },
    baseline: { ...BASELINE, ...baselineOverrides }
  }).mental;
}

// --- TABLE INTEGRITY ---

test("the table has exactly 26 rows, scores 0..100 in steps of 4", () => {
  const keys = Object.keys(WHO5_PERCENTILE_TABLE).map(Number).sort((a, b) => a - b);
  assert.equal(keys.length, 26);
  assert.deepEqual(keys, SCORES);
});

test("every row carries all 8 columns, each within 0-100", () => {
  for (const score of SCORES) {
    const row = WHO5_PERCENTILE_TABLE[score];
    assert.deepEqual(Object.keys(row).sort(), [...BANDS].sort(), `row ${score}`);
    for (const band of BANDS) {
      const v = row[band];
      assert.ok(Number.isFinite(v), `${score}/${band} must be a number`);
      assert.ok(v >= 0 && v <= 100, `${score}/${band} = ${v} is outside 0-100`);
    }
  }
});

test("every column is non-decreasing down the table", () => {
  // NON-decreasing, not strictly increasing. These are unsmoothed empirical
  // ECDFs, so a small band with zero respondents at a score legitimately ties
  // (a16 is 1.8 at both 12 and 16; the censored 0.1 floor repeats). What is NOT
  // legitimate is a tie at a high-frequency score, which is how the three
  // errata repaired in benchmarks.js were found.
  for (const band of BANDS) {
    for (let i = 1; i < SCORES.length; i++) {
      const prev = WHO5_PERCENTILE_TABLE[SCORES[i - 1]][band];
      const cur = WHO5_PERCENTILE_TABLE[SCORES[i]][band];
      assert.ok(cur >= prev, `${band} decreases from ${prev} at ${SCORES[i - 1]} to ${cur} at ${SCORES[i]}`);
    }
  }
});

test("pinned cells match the published table at both ends and the middle", () => {
  // Independently transcribed from the source; a later "tidy-up" of the
  // literal must fail loudly here.
  assert.equal(WHO5_PERCENTILE_TABLE[0].total, 0.3);
  assert.equal(WHO5_PERCENTILE_TABLE[0].a16, 0.1); // printed "<0.1"
  assert.equal(WHO5_PERCENTILE_TABLE[48].a45, 17.3);
  assert.equal(WHO5_PERCENTILE_TABLE[68].total, 42.4);
  assert.equal(WHO5_PERCENTILE_TABLE[60].a25, 20.3);
  assert.equal(WHO5_PERCENTILE_TABLE[60].a75, 59.7);
  assert.equal(WHO5_PERCENTILE_TABLE[100].total, 99.9); // printed ">99.9"
});

test("the three repaired errata cells hold their reconciled values", () => {
  // These deliberately DIFFER from the printed table. Each printed cell is an
  // exact duplicate of the cell above it in its own column, and each fails the
  // ECDF identity Table 2 = n-weighted mix of Supplementary S11 (male) and S12
  // (female), which 179 of the other 182 cells satisfy to within 0.30. Do not
  // "correct" these back by comparing against the published PDF.
  assert.equal(WHO5_PERCENTILE_TABLE[80].a55, 81.9); // printed 63.2, off by 18.7
  assert.equal(WHO5_PERCENTILE_TABLE[76].a65, 65.7); // printed 56.9, off by  8.8
  assert.equal(WHO5_PERCENTILE_TABLE[32].a65, 12.5); // printed 10.4, off by  2.1
});

// --- AGE ROUTING ---

test("who5AgeBand selects the source's own band at every boundary", () => {
  assert.equal(who5AgeBand(16), "a16");
  assert.equal(who5AgeBand(24), "a16");
  assert.equal(who5AgeBand(25), "a25");
  assert.equal(who5AgeBand(34), "a25");
  assert.equal(who5AgeBand(35), "a35");
  assert.equal(who5AgeBand(44), "a35");
  assert.equal(who5AgeBand(45), "a45");
  assert.equal(who5AgeBand(54), "a45");
  assert.equal(who5AgeBand(55), "a55");
  assert.equal(who5AgeBand(64), "a55");
  assert.equal(who5AgeBand(65), "a65");
  assert.equal(who5AgeBand(74), "a65");
  assert.equal(who5AgeBand(75), "a75");
  assert.equal(who5AgeBand(103), "a75");
});

test("who5AgeBand falls back to the pooled column rather than guessing", () => {
  for (const bad of [undefined, null, NaN, "", "abc", -5, 0, 15, Infinity, {}, []]) {
    assert.equal(who5AgeBand(bad), "total", `${String(bad)} should fall back to total`);
  }
  // Numeric strings are still ages — the profile form stores text inputs.
  assert.equal(who5AgeBand("47"), "a45");
});

// --- THE BENCHMARK ITSELF ---

test("the age effect is real: the same score ranks differently by age", () => {
  // Guards against the lookup silently always returning the `total` column.
  const young = mental({ age: 28 }, { who5: 15 }); // score 60, a25 = 20.3
  const old = mental({ age: 78 }, { who5: 15 });   // score 60, a75 = 59.7
  assert.equal(young.percentile, 20);
  assert.equal(old.percentile, 60);
  assert.ok(old.percentile - young.percentile > 30, "the published age gradient is ~40 points");
});

test("the percentile is the table cell, unadjusted", () => {
  // No mid-percentile conversion, no averaging of adjacent rows, no
  // cumulative-vs-rank adjustment. Any of those would make this app the source.
  for (const [age, band] of [[20, "a16"], [30, "a25"], [40, "a35"], [50, "a45"], [60, "a55"], [70, "a65"], [80, "a75"]]) {
    const b = mental({ age }, { who5: 18 }); // score 72
    assert.equal(b.percentile, Math.round(WHO5_PERCENTILE_TABLE[72][band]), `age ${age}`);
  }
});

test("the normal approximation this replaced was wrong by ~8 points", () => {
  // Documents the defect being fixed. Fails if someone reinstates normalCdf:
  // the WHO-5 is left-skewed (Skew = -0.90), so a normal fit overstates the
  // rank across the middle of the range.
  const published = WHO5_PERCENTILE_TABLE[68].total;      // 42.4
  const approximated = normalCdf(68, 67.56, 22.96) * 100; // ~50.8
  assert.ok(approximated - published > 7, "the old method ran high at the mode");
  assert.equal(mental({}, { who5: 17 }).percentile, 42);
});

test("mental uses the norms method and it resolves in both margin tables", () => {
  assert.equal(mental({ age: 40 }).method, "norms");
  // Deliberately the same widths as `distribution`: the dominant error is now
  // the German-vs-Thai population mismatch, which no margin captures.
  assert.deepEqual(percentileRange(50, "norms"), { low: 44, high: 56 });
  assert.deepEqual(percentileRange(50, "norms", true), { low: 47, high: 53 });
});

test("population names the age band, and the pooled sample when age is absent", () => {
  assert.match(mental({ age: 50 }).population, /45-54/);
  assert.match(mental({ age: 80 }).population, /75/);
  assert.match(mental({}).population, /reference sample/);
});

// v42. The board says "the reference sample"; the methodology page still names
// Kliem et al., the German sample and the 25-country GSE pool, and
// tests/methodology.test.mjs pins those. This asserts the split holds in the
// direction that is easy to undo by accident — someone "helpfully" putting the
// country back on the aspect card.
test("no benchmark label names the norming country on the aspect board", () => {
  for (const b of [mental({}), mental({ age: 40 })]) {
    for (const s of [b.population, b.summary, ...b.notes]) {
      assert.doesNotMatch(String(s), /German|Germany|25-country/,
        `board string names the norming sample: ${s}`);
    }
  }
});

test("every reachable WHO-5 score is an exact row — no interpolation anywhere", () => {
  for (let raw = 0; raw <= 25; raw++) {
    const b = mental({ age: 33 }, { who5: raw });
    assert.ok(b, `who5 ${raw} must be rankable`);
    assert.equal(b.percentile, Math.min(99, Math.max(1, Math.round(WHO5_PERCENTILE_TABLE[raw * 4].a25))));
  }
});

test("mental stays null when WHO-5 was never answered", () => {
  assert.equal(getAllBenchmarks({ profile: PROFILE, baseline: { ...BASELINE, who5: undefined } }).mental, null);
  assert.equal(getAllBenchmarks({ profile: PROFILE, baseline: null }).mental, null);
});

// --- BLAST RADIUS ---
//
// Age-banding moves the mental PERCENTILE, and therefore can move the mental
// GRADE (grades.js:61 derives grades from percentiles). It must move nothing
// else. These assertions prove the blast-radius table in the plan rather than
// restating it: everything downstream of the eight 0-100 SCORES is untouched.

test("age changes the mental percentile and nothing score-based", () => {
  const aspects = {
    finance: 60, physical: 55, mental: 70, relationships: 65,
    personalGoals: 50, socialContribution: 40, environment: 45, humanityFuture: 35
  };
  const young = { profile: { ...PROFILE, name: "A", age: 28 }, baseline: BASELINE, aspects };
  const old = { profile: { ...PROFILE, name: "A", age: 78 }, baseline: BASELINE, aspects };

  assert.notEqual(
    getAllBenchmarks(young).mental.percentile,
    getAllBenchmarks(old).mental.percentile,
    "the whole point of the release"
  );
  // Still unmoved by AGE, which is what this test is for. The index reads 46
  // rather than v39's 47 because v64 changed two reference averages (grit left
  // personalGoals, the pension left humanityFuture), and balanceIndex scores
  // relative to those averages — so a change there moves it by design. Both
  // ages still produce the same number, which is the actual assertion.
  assert.equal(balanceIndex(aspects), 46);
  assert.deepEqual(aspectsAtOrAboveAverage(aspects), { count: 3, total: 8 });
  // finance re-pinned 55 -> 53 in v46 (income magnitude scale); personalGoals
  // 59 -> 57 and humanityFuture 44 -> 50 in v64 (grit and the pension left
  // their composites). The other five are untouched, which is the point of
  // asserting the whole object here.
  assert.deepEqual({ ...AVERAGE_ASPECT_SCORES }, {
    finance: 53, physical: 62, mental: 69, relationships: 70,
    personalGoals: 57, socialContribution: 32, environment: 50, humanityFuture: 50
  });
  // Comparison codes encode the scores, so v2 codes stay valid across this
  // release and two users of different ages still share an identical code.
  assert.equal(encodeComparisonCode(young), encodeComparisonCode(old));
  assert.deepEqual(decodeComparisonCode(encodeComparisonCode(young)).aspects, aspects);
});

test("hostile profile values coerce rather than throw", () => {
  for (const age of ["forty", -1, 1e9, null, { toString() { return "x"; } }]) {
    const b = mental({ age });
    assert.ok(b && Number.isFinite(b.percentile), `age ${String(age)} must still rank`);
  }
});

test("an out-of-range or fractional WHO-5 snaps to a row instead of throwing", () => {
  // A lookup can miss where a formula could not. A hand-edited import must not
  // take the dashboard down.
  for (const who5 of [-4, 0.4, 17.5, 25.9, 99, 1e9]) {
    const b = mental({ age: 40 }, { who5 });
    assert.ok(b && Number.isFinite(b.percentile), `who5 ${who5} must still rank`);
  }
  assert.equal(mental({ age: 40 }, { who5: 99 }).percentile, mental({ age: 40 }, { who5: 25 }).percentile);
});
