// tests/finance-scale.test.mjs - the v46 finance rescale and the score ceiling.
//
// Two changes are guarded here, and they are independent:
//
//   1. The finance SCORE stopped being a percentile and became a magnitude.
//      A percentile has to saturate in a long right tail, so scoring by rank
//      meant 50,000 and 300,000 both read as 99 — the defect that started this
//      release. The rank itself was never wrong and is still what the
//      benchmark card and the grade use; only the score moved.
//
//   2. No score anywhere in the app may print 100.
//
// The anchors are deliberately asserted against their PUBLISHED values rather
// than against whatever the code currently computes, so a silent retune of
// either constant fails here instead of quietly moving everyone's score.

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { incomeStandingScore, incomePercentile } from "../benchmarks.js";
import {
  SCORE_MAX, clampScore, savingsRateFrom, savingsAmountFrom,
  calculateFinanceScore
} from "../scoring.js";
import { balanceIndex } from "../grades.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// NSO Labour Force Survey average wage via BOT (SOURCES.botWage).
const LFS_MEAN = 15972;
// Revenue Department top 35% band: 4,000,000 THB/yr (SOURCES.rdTaxBands).
const TOP_BAND = 333333;

// --- 1. THE MAGNITUDE SCALE ---

test("the published average wage scores exactly 50", () => {
  // The whole point of the centre anchor: an average earner is average.
  assert.equal(Math.round(incomeStandingScore(LFS_MEAN, "Provinces")), 50);
});

test("the Revenue Department top band reaches the top of the scale", () => {
  // Reaches 100 before clamping — the 99 cap lives in clampScore, not here,
  // so the two rules stay separable.
  assert.equal(Math.round(incomeStandingScore(TOP_BAND, "Provinces")), 100);
});

test("the top band is a real ceiling — income above it buys nothing", () => {
  // Not a cosmetic clamp. This term carries 0.6 of the finance score, so an
  // unclamped 1,000,000 (which computes to 118) would go on adding points
  // above the anchor and defeat the anchor's purpose.
  const atBand = incomeStandingScore(TOP_BAND, "Provinces");
  assert.equal(Math.round(atBand), 100);
  for (const above of [500000, 1000000, 5000000, 100000000]) {
    assert.equal(incomeStandingScore(above, "Provinces"), 100, `income ${above}`);
  }
  // And the finished score still stops at 99 rather than 100.
  assert.equal(clampScore(incomeStandingScore(5000000, "Provinces")), SCORE_MAX);
});

test("THE REGRESSION: high incomes are no longer indistinguishable", () => {
  // Before v46 both of these were percentile 99 and scored identically. The
  // rank still saturates — that is correct behaviour for a rank — but the
  // score must now separate them.
  const rankSpread = incomePercentile(300000, "Provinces") - incomePercentile(50000, "Provinces");
  assert.ok(rankSpread <= 2,
    `the RANK is still expected to saturate — that was never the bug — got ${rankSpread}`);

  const mid = incomeStandingScore(50000, "Provinces");
  const high = incomeStandingScore(300000, "Provinces");
  assert.ok(high - mid > 25,
    `50k and 300k must be far apart on the score, got ${mid} and ${high}`);
});

test("the scale is strictly increasing across the whole realistic range", () => {
  const rungs = [3000, 5000, 10400, 12900, 15972, 20000, 30000, 50000, 100000, 200000, 333333];
  for (let i = 1; i < rungs.length; i++) {
    assert.ok(
      incomeStandingScore(rungs[i], "Provinces") > incomeStandingScore(rungs[i - 1], "Provinces"),
      `${rungs[i]} must score above ${rungs[i - 1]}`
    );
  }
});

test("equal steps in MULTIPLE are equal steps in score", () => {
  // The defence of the log form: doubling is worth the same everywhere, so a
  // rise from 16k to 32k counts like 100k to 200k rather than vanishing.
  const step = (a, b) => incomeStandingScore(b, "Provinces") - incomeStandingScore(a, "Provinces");
  assert.ok(Math.abs(step(16000, 32000) - step(100000, 200000)) < 0.001);
});

test("Bangkok scores a given salary slightly lower, and tops out at the same baht", () => {
  // The centre scales with the SES regional income ratio; the ceiling does not,
  // because the tax band is national law.
  assert.ok(incomeStandingScore(30000, "Bangkok") < incomeStandingScore(30000, "Provinces"),
    "the same salary should be worth less against a higher regional centre");
  assert.equal(Math.round(incomeStandingScore(TOP_BAND, "Bangkok")), 100);
});

test("no income is out of range rather than a low score", () => {
  // Zero income scores zero on THIS scale, which is honest: the scale measures
  // salary. A retiree living on savings is a real case the scale cannot see,
  // and it is the runway measure — not a fudged income — that will answer it.
  for (const bad of [0, -5000, null, undefined, "", "abc"]) {
    assert.equal(incomeStandingScore(bad, "Provinces"), 0, `input ${bad}`);
  }
});

// --- 2. THE SCORE CEILING ---

test("clampScore never returns 100, and never returns below 0", () => {
  assert.equal(clampScore(100), SCORE_MAX);
  assert.equal(clampScore(99.6), SCORE_MAX);
  assert.equal(clampScore(1e9), SCORE_MAX);
  assert.equal(clampScore(-1), 0);
  assert.equal(clampScore(0), 0);
  assert.equal(SCORE_MAX, 99);
});

test("a maximal finance profile still cannot reach 100", () => {
  const rich = { income: 10000000, region: "Bangkok", savingsRate: 100, age: 40 };
  assert.equal(calculateFinanceScore(rich, [4, 4, 4, 4, 4]), SCORE_MAX);
});

test("the Balance Index is capped too", () => {
  const perfect = Object.fromEntries([
    "finance", "physical", "mental", "relationships",
    "personalGoals", "socialContribution", "environment", "humanityFuture"
  ].map(k => [k, 100]));
  assert.equal(balanceIndex(perfect), SCORE_MAX);
});

test("EVERY aspect calculator returns through clampScore", () => {
  // A structural guard rather than eight fabricated max-profiles: building a
  // "perfect" input for each instrument would encode assumptions that rot, and
  // would silently stop testing the ceiling the day a calculator gained a new
  // component. What must hold is that no calculator returns raw.
  const src = readFileSync(join(ROOT, "scoring.js"), "utf8");
  const names = [...src.matchAll(/export function (calculate\w+Score)\b/g)].map(m => m[1]);
  assert.equal(names.length, 8, `expected 8 aspect calculators, found ${names.length}`);

  for (const name of names) {
    const start = src.indexOf(`export function ${name}`);
    const next = src.indexOf("\nexport function ", start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    assert.ok(/return clampScore\(/.test(body),
      `${name} must return through clampScore, or it can print 100`);
    assert.ok(!/return Math\.round\(/.test(body),
      `${name} still has a bare Math.round return — that path bypasses the cap`);
  }
});

// --- 3. SAVINGS IN BAHT ---

test("a baht amount converts to the rate the score expects", () => {
  assert.equal(savingsRateFrom(3000, 30000), 10);
  assert.equal(savingsRateFrom(5000, 20000), 25);
});

test("amount and rate round-trip", () => {
  assert.equal(savingsAmountFrom(savingsRateFrom(4500, 30000), 30000), 4500);
  assert.equal(savingsRateFrom(savingsAmountFrom(10, 30000), 30000), 10);
});

test("saving more than you earn is capped, not recorded as impossible", () => {
  assert.equal(savingsRateFrom(50000, 30000), 100);
});

test("no income means no rate — never a fabricated one", () => {
  // Dividing by zero here would either throw or produce Infinity, and both
  // would end up in a stored score. The guard is the reason the retiree case
  // is a known gap rather than a silent wrong answer.
  for (const income of [0, null, undefined, "", -100]) {
    assert.equal(savingsRateFrom(5000, income), 0, `income ${income}`);
    assert.equal(savingsAmountFrom(10, income), 0, `income ${income}`);
  }
});
