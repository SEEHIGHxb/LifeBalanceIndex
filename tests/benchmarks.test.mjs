// Tests for population benchmark percentiles (node --test)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { normalCdf, ordinal, getAllBenchmarks, collectSources, percentileRange, percentileBand, incomePercentile, clsAgeRow } from "../benchmarks.js";
import { gradeForBenchmark } from "../grades.js";
import { GameStateManager } from "../state.js";

function installMockStorage(initial = {}) {
  globalThis.localStorage = {
    store: { ...initial },
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
}

beforeEach(() => installMockStorage());

const ALL_ASPECTS = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

const PROFILE = {
  income: 15000,
  region: "Provinces",
  gender: "male",
  weight: 60,
  height: 170,
  weeklyVigorousDays: 0,
  weeklyVigorousMins: 0,
  weeklyModerateDays: 0,
  weeklyModerateMins: 0,
  weeklyWalkingDays: 3,
  weeklyWalkingMins: 20,
  monthlyDonations: 100,
  volunteeringHours: 0,
  singleUsePlastics: 3,
  longTermInvestments: false
};

const BASELINE = {
  date: "2026-07-03T00:00:00.000Z",
  who5: 17, // 68/100, right at the published mean
  st5: 3,
  lsns: 17,
  ucla: 4,
  gse: 18, // per-item 3.0 vs norm 2.955
  grit: 14
};

function makeState(profileOverrides = {}, baseline = BASELINE) {
  return { profile: { ...PROFILE, ...profileOverrides }, baseline };
}

// --- MATH HELPERS ---

test("normalCdf is 0.5 at the mean and monotonically increasing", () => {
  assert.ok(Math.abs(normalCdf(67.56, 67.56, 22.96) - 0.5) < 1e-6);
  assert.ok(normalCdf(90, 67.56, 22.96) > normalCdf(50, 67.56, 22.96));
  assert.ok(normalCdf(-100, 0, 1) < 0.001 && normalCdf(100, 0, 1) > 0.999);
});

test("normalCdf is symmetric around the mean", () => {
  const below = normalCdf(-1.5, 0, 1);
  const above = normalCdf(1.5, 0, 1);
  assert.ok(Math.abs(below + above - 1) < 1e-6);
});

test("ordinal renders English suffixes including the 11-13 exceptions", () => {
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(11), "11th");
  assert.equal(ordinal(13), "13th");
  assert.equal(ordinal(21), "21st");
  assert.equal(ordinal(99), "99th");
});

// --- STRUCTURE ---

// Two aspects are measured but deliberately unranked, and carry no percentile.
// `relationships` because its instruments are normed on older adults;
// `humanityFuture` because no Thai norm for purpose or generativity is
// published at all, and the pension checkbox it used to rank on was an income
// proxy (v64). Every OTHER aspect must still produce a percentile.
const UNRANKED_ASPECTS = ["relationships", "humanityFuture"];
const RANKED_ASPECTS = ALL_ASPECTS.filter(k => !UNRANKED_ASPECTS.includes(k));

test("getAllBenchmarks returns an entry per aspect with percentile, method, sources", () => {
  const all = getAllBenchmarks(makeState());
  assert.deepEqual(Object.keys(all).sort(), [...ALL_ASPECTS].sort());
  for (const key of ALL_ASPECTS) {
    const b = all[key];
    assert.ok(b, `${key} should be computable with a full baseline`);
    assert.ok(["norms", "distribution", "threshold", "estimate"].includes(b.method));
    assert.ok(Array.isArray(b.sources) && b.sources.length > 0, `${key} must cite sources`);
    b.sources.forEach(src => assert.match(src.url, /^https:\/\//));
  }
  for (const key of RANKED_ASPECTS) {
    assert.ok(all[key].percentile >= 1 && all[key].percentile <= 99, `${key} percentile in 1-99`);
    assert.ok(all[key].population, `${key} must name the population it ranks against`);
  }
});

// The point of the unranked state: the app HAS the answers and still refuses to
// print a rank, because both norms come from people a generation older. This
// must never quietly become a number again.
test("relationships is measured but carries no percentile, no range and no grade", () => {
  const b = getAllBenchmarks(makeState()).relationships;
  assert.ok(b, "the aspect still produces a benchmark — it is measured, just not ranked");
  assert.equal(b.percentile, null, "no percentile");
  assert.equal(b.range, null, "no margin around a number that does not exist");
  assert.equal(b.population, null, "no population is claimed");
  assert.match(b.unranked, /57-85|older adults/, "the reason names the wrong-population problem");
  assert.equal(gradeForBenchmark(b), null, "and therefore no letter grade");
});

test("relationships still reports both raw readings and the LSNS isolation cutoff", () => {
  const isolated = getAllBenchmarks(makeState({}, { ...BASELINE, ucla: 9, lsns: 8 })).relationships;
  const connected = getAllBenchmarks(makeState({}, { ...BASELINE, ucla: 3, lsns: 25 })).relationships;
  assert.ok(isolated.notes.some(n => n.includes("under the social-isolation cutoff")));
  assert.ok(connected.notes.some(n => n.includes("above the social-isolation cutoff")));
  // The user's own numbers survive the loss of the rank — that is the whole
  // point of "measured, not ranked".
  assert.ok(isolated.notes.some(n => n.includes("9/9") && n.includes("8/30")));
});

// --- CLS BAND PLACEMENT (v43) ---
//
// The Community Life Survey publishes the same 3-9 composite in three bands, so
// the app places a score in one. The tests below exist to keep that a PLACEMENT:
// the moment a percentile appears here, the aspect has started guessing.

const rel = (ucla, extra = {}, profile = {}) =>
  getAllBenchmarks(makeState(profile, { ...BASELINE, ucla, ...extra })).relationships;

test("CLS band placement follows the published boundaries at 4/5 and 7/8", () => {
  for (const n of [3, 4]) {
    assert.ok(rel(n).notes.some(x => x.includes("least-lonely band") && x.includes("58%")), `ucla ${n} -> 3-4 band`);
  }
  for (const n of [5, 6, 7]) {
    assert.ok(rel(n).notes.some(x => x.includes("middle band") && x.includes("33%")), `ucla ${n} -> 5-7 band`);
  }
  for (const n of [8, 9]) {
    assert.ok(rel(n).notes.some(x => x.includes("loneliest band") && x.includes("9%")), `ucla ${n} -> 8-9 band`);
  }
});

test("band placement never becomes a rank", () => {
  for (const n of [3, 4, 5, 6, 7, 8, 9]) {
    const b = rel(n);
    assert.equal(b.percentile, null, `ucla ${n} must stay unranked`);
    assert.equal(b.population, null, `ucla ${n} must claim no population`);
    assert.equal(gradeForBenchmark(b), null, `ucla ${n} must stay ungraded`);
  }
  assert.ok(rel(6).notes.some(x => x.includes("cannot say where you rank")),
    "the placement says out loud that it is not a rank");
});

test("the CLS source is cited whenever its bands are shown, and not when they are not", () => {
  const shown = rel(6);
  assert.ok(shown.sources.some(s => /Community Life Survey/.test(s.label)), "cited when placed");
  shown.sources.forEach(s => assert.match(s.url, /^https:\/\//));
  const hidden = rel(6, { answered: { ucla: false } });
  assert.ok(!hidden.sources.some(s => /Community Life Survey/.test(s.label)), "not cited when withheld");
});

// Table A3b publishes the age breakdown for the 8-9 band ONLY, so the age line
// appears only for users in that band. Showing it to someone scoring 4 would
// invite them to read a population fact as their own standing.
test("the age line appears only in the 8-9 band, and only when age is known", () => {
  const ageLine = notes => notes.some(x => x.includes("adults aged"));
  assert.ok(ageLine(rel(9, {}, { age: 28 }).notes), "8-9 band with a known age");
  assert.ok(!ageLine(rel(4, {}, { age: 28 }).notes), "least-lonely band gets no age line");
  assert.ok(!ageLine(rel(7, {}, { age: 28 }).notes), "middle band gets no age line");
  assert.ok(!ageLine(rel(9).notes), "no age on the profile, no age line");
  assert.ok(!ageLine(rel(9, {}, { age: 14 }).notes), "below the survey's own 16+ floor, no row to quote");
});

test("clsAgeRow returns the published rows at their boundaries", () => {
  assert.equal(clsAgeRow(16).share, 12);
  assert.equal(clsAgeRow(24).share, 12);
  assert.equal(clsAgeRow(25).share, 11);
  assert.equal(clsAgeRow(34).share, 11);
  assert.equal(clsAgeRow(35).share, 10);
  assert.equal(clsAgeRow(49).share, 10);
  assert.equal(clsAgeRow(50).share, 8);
  assert.equal(clsAgeRow(64).share, 8);
  assert.equal(clsAgeRow(65).share, 5);
  assert.equal(clsAgeRow(74).share, 5);
  assert.equal(clsAgeRow(75).share, 7);
  assert.equal(clsAgeRow(120).share, 7);
  assert.equal(clsAgeRow(15), null, "below the survey's floor");
  assert.equal(clsAgeRow(undefined), null);
  assert.equal(clsAgeRow("nonsense"), null);
});

// A UCLA left at its midpoint default is demoted to answered=false by state.js.
// Placing that invented 6 in a published band would dress a default as a
// measurement. Absent flags mean "unknown" on older saves, not "false".
test("band placement is withheld for a UCLA known not to have been answered", () => {
  const banded = notes => notes.some(x => x.includes("three bands"));
  assert.ok(!banded(rel(6, { answered: { ucla: false } }).notes), "known unanswered: withheld");
  assert.ok(banded(rel(6, { answered: { ucla: true } }).notes), "answered: placed");
  assert.ok(banded(rel(6, { answered: { who5: true } }).notes), "flag absent for ucla: unknown, still placed");
  assert.ok(banded(rel(6).notes), "no coverage flags at all: unknown, still placed");
  // The raw reading survives either way — withholding the band must not
  // withhold the measurement.
  assert.ok(rel(6, { answered: { ucla: false } }).notes.some(x => x.includes("6/9")));
});

test("survey-based aspects return null without a stored baseline (pre-benchmark saves)", () => {
  const all = getAllBenchmarks(makeState({}, null));
  assert.equal(all.mental, null);
  assert.equal(all.relationships, null);
  assert.equal(all.personalGoals, null);
  assert.ok(all.finance && all.physical && all.socialContribution && all.environment && all.humanityFuture);
  // humanityFuture survives a pre-baseline save because its reason for being
  // unranked does not depend on the instrument — only the raw reading does.
  assert.equal(all.humanityFuture.percentile, null);
  assert.ok(!all.humanityFuture.notes.some(n => /\/20/.test(n)), "no reading is invented without a baseline");
});

test("collectSources dedupes by URL", () => {
  const sources = collectSources(getAllBenchmarks(makeState()));
  const urls = sources.map(s => s.url);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.length >= 8, "a full benchmark set cites many distinct sources");
});

// --- FINANCE ---

test("finance percentile rises with income and adjusts for Bangkok", () => {
  const poor = getAllBenchmarks(makeState({ income: 6000 })).finance;
  const median = getAllBenchmarks(makeState({ income: 12900 })).finance;
  const rich = getAllBenchmarks(makeState({ income: 80000 })).finance;
  assert.ok(poor.percentile < median.percentile && median.percentile < rich.percentile);
  assert.ok(Math.abs(median.percentile - 50) <= 2, "median income sits near the 50th percentile");

  const bkk = getAllBenchmarks(makeState({ income: 15000, region: "Bangkok" })).finance;
  const prov = getAllBenchmarks(makeState({ income: 15000, region: "Provinces" })).finance;
  assert.ok(bkk.percentile < prov.percentile, "same income ranks lower against Bangkok earnings");

  assert.equal(getAllBenchmarks(makeState({ income: 0 })).finance.percentile, 1);
});

// --- PHYSICAL ---

test("physical percentile anchors the WHO guideline at ~29 and grows with MET-minutes", () => {
  const sedentary = getAllBenchmarks(makeState({ weeklyWalkingDays: 0, weeklyWalkingMins: 0 })).physical;
  assert.equal(sedentary.percentile, 1);

  // 3 x 61 min walking ~ 604 MET-min, just over the guideline
  const atGuideline = getAllBenchmarks(makeState({ weeklyWalkingDays: 3, weeklyWalkingMins: 61 })).physical;
  assert.ok(Math.abs(atGuideline.percentile - 29) <= 1, "guideline = ~29th percentile (71% of Thais meet it)");

  const athlete = getAllBenchmarks(makeState({ weeklyVigorousDays: 6, weeklyVigorousMins: 120 })).physical;
  assert.ok(athlete.percentile > 80);
});

test("physical benchmark includes a gender-specific BMI note", () => {
  const male = getAllBenchmarks(makeState({ gender: "male" })).physical;
  assert.ok(male.notes.some(n => n.includes("32.9%")), "male BMI note uses the male prevalence");
  const unspecified = getAllBenchmarks(makeState({ gender: "unspecified" })).physical;
  assert.ok(unspecified.notes.some(n => n.includes("37.5%")), "unspecified falls back to combined prevalence");
});

// --- MENTAL / RELATIONSHIPS / PERSONAL GOALS ---

test("mental percentile tracks WHO-5 and flags the ST-5 stress band", () => {
  const atMean = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 17 })).mental;
  // v41: was ~50, from normalCdf(68, 67.56, 22.96). The WHO-5 distribution is
  // left-skewed (Skew = -0.90 in the same paper), so the normal approximation
  // was ~8 points high here. 42.4 is the source's own pooled cell at score 68.
  // PROFILE carries no age, so this is the `total` column by design.
  assert.equal(atMean.percentile, 42, "WHO-5 68/100 reads straight off the published table");
  const flourishing = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 25 })).mental;
  const struggling = getAllBenchmarks(makeState({}, { ...BASELINE, who5: 5 })).mental;
  assert.ok(flourishing.percentile > atMean.percentile && struggling.percentile < atMean.percentile);

  const stressed = getAllBenchmarks(makeState({}, { ...BASELINE, st5: 9 })).mental;
  assert.ok(stressed.notes.some(n => n.includes("stress problem")));
});

test("personal goals percentile tracks GSE per-item score against the 25-country norm", () => {
  const atNorm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18 })).personalGoals; // 3.0/item vs 2.955
  assert.ok(Math.abs(atNorm.percentile - 53) <= 3);
  const high = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 24 })).personalGoals;
  const low = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 6 })).personalGoals;
  assert.ok(low.percentile < atNorm.percentile && atNorm.percentile < high.percentile);
});

// --- PARTICIPATION-BAND ASPECTS ---

test("social contribution bands follow CAF participation rates", () => {
  const neither = getAllBenchmarks(makeState({ monthlyDonations: 0, volunteeringHours: 0 })).socialContribution;
  const donor = getAllBenchmarks(makeState({ monthlyDonations: 200, volunteeringHours: 0 })).socialContribution;
  const volunteer = getAllBenchmarks(makeState({ monthlyDonations: 0, volunteeringHours: 2 })).socialContribution;
  const both = getAllBenchmarks(makeState({ monthlyDonations: 200, volunteeringHours: 2 })).socialContribution;
  assert.ok(neither.percentile < donor.percentile);
  assert.ok(donor.percentile < volunteer.percentile);
  assert.ok(volunteer.percentile < both.percentile);
});

// The test above pins only the ORDER of the bands, and BASELINE carries no ptm,
// so it exercises the fallback path and never touches a band edge at all. Any
// three rates keep that order — which is how a swapped CAF column (the helped-a-
// stranger rate filed as "donated money") and a stale edition both survived
// several releases with every test green.
//
// These pin the EDGES to the rates named in the citation itself. A rate that
// moves without its band, or a band that moves without its rate, now fails here
// instead of on someone's screen.
test("each social band floor is the complement of its cited CAF rate", () => {
  // ptm 0 plus a donation that is a rounding error against income drives the
  // stage-2 intensity to 0, which lands the percentile exactly on the floor.
  const at = (overrides, ptm) =>
    getAllBenchmarks(makeState(overrides, { ...BASELINE, ptm })).socialContribution;

  const neither = at({ monthlyDonations: 0, volunteeringHours: 0 }, 0);
  const donor = at({ income: 1000000, monthlyDonations: 1, volunteeringHours: 0 }, 0);
  const volunteer = at({ monthlyDonations: 0, volunteeringHours: 2 }, 0);

  const label = donor.sources[0].label;
  const donated = Number(label.match(/(\d+)% donated money/)[1]);
  const volunteered = Number(label.match(/(\d+)% volunteered/)[1]);

  assert.equal(donor.percentile, 100 - donated, `donor floor must be 100 - ${donated}`);
  assert.equal(volunteer.percentile, 100 - volunteered, `volunteer floor must be 100 - ${volunteered}`);
  assert.equal(neither.percentile, 2, "the bottom band starts at 2, not 0");

  // A donor giving the full 5% share with a maximal ptm sits at the donor
  // ceiling, which must be exactly one below the volunteer floor: the bands
  // partition the scale with no gap and no overlap.
  const donorTop = at({ income: 1000000, monthlyDonations: 50000, volunteeringHours: 0 }, 20);
  assert.equal(donorTop.percentile, volunteer.percentile - 1, "donor ceiling abuts the volunteer floor");
});

// Guards the direction of the v63 correction. The old rates put the donor floor
// at 48; the corrected ones put it at 33, because more Thais give than this file
// used to claim, so giving distinguishes a person LESS. If anyone reverts to a
// rate that flatters donors, this fails.
test("the cited CAF rates are the 2024 edition, read in the right columns", () => {
  const label = getAllBenchmarks(makeState()).socialContribution.sources[0].label;
  assert.match(label, /World Giving Index 2024/, "the 2024 edition is the last one CAF published");
  assert.match(label, /67% donated money/, "donated money is 67%, not the 52% helped-a-stranger rate");
  assert.match(label, /24% volunteered/);
  assert.match(label, /64% helped a stranger/);
  assert.match(label, /2023 data/, "the collection year is part of the claim, not just the edition");
});

test("environment percentile puts the ~3/day Thai average at the 50th", () => {
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 3 })).environment.percentile, 50);
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 0 })).environment.percentile, 90);
  assert.equal(getAllBenchmarks(makeState({ singleUsePlastics: 12 })).environment.percentile, 10);
});

// THE INVERSE OF THE TEST THIS REPLACES. Until v64 this asserted that holding a
// retirement product RAISED the humanity's-future standing — the app's clearest
// case of ranking income and calling it contribution. A farmer with no pension
// could not reach a pension-holder's band no matter what they answered, because
// the two-stage design is band-locked.
test("humanity future is not ranked, and a pension cannot move it", () => {
  const invested = getAllBenchmarks(makeState({ longTermInvestments: true })).humanityFuture;
  const not = getAllBenchmarks(makeState({ longTermInvestments: false })).humanityFuture;
  assert.equal(invested.percentile, null, "no percentile");
  assert.equal(not.percentile, null, "no percentile");
  assert.equal(invested.population, null, "no population is claimed");
  assert.deepEqual(invested.notes, not.notes, "the pension must not change a single word shown");
  assert.match(invested.unranked, /income/i, "the reason names what the old rank actually measured");
  assert.equal(gradeForBenchmark(invested), null, "and therefore no letter grade");
});

// The score still moves on the instrument — unranked must not mean unmeasured.
test("humanity future still responds to its own LFIS answers", () => {
  const low = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 0 })).humanityFuture;
  const high = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 20 })).humanityFuture;
  assert.ok(low.notes.some(n => /0\/20/.test(n)), "the raw reading is shown");
  assert.ok(high.notes.some(n => /20\/20/.test(n)), "the raw reading is shown");
});

// v65 added a sixth LFIS item, so this note's denominator stopped being a
// constant. A save predating the change carries no `lfisItems` and must keep
// reading /20 — restating an old baseline against six items would show the user
// a fifth of a drop they never experienced.
test("the LFIS note denominator follows the baseline, not the current instrument", () => {
  const old = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 15 })).humanityFuture;
  const now = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 15, lfisItems: 6 })).humanityFuture;
  assert.ok(old.notes.some(n => /15\/20/.test(n)), "a pre-v65 baseline stays on its own scale");
  assert.ok(now.notes.some(n => /15\/24/.test(n)), "a v65 baseline reads out of 24 — 6 items x 4");
  assert.equal(old.percentile, null, "still unranked either way");
  assert.equal(now.percentile, null, "still unranked either way");
});

// The note NAMES the things the number contains. On a pre-v65 baseline the
// sixth was never asked, so the prose has to shorten along with the
// denominator. The v65 tests above missed this because they only ever read the
// digits — found instead by loading the deployed site with a v64-shaped save.
test("the LFIS note does not claim maintaining is inside a five-item baseline", () => {
  const old = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 15 })).humanityFuture;
  const now = getAllBenchmarks(makeState({}, { ...BASELINE, lfis: 15, lfisItems: 6 })).humanityFuture;
  const noteOf = b => b.notes.find(n => /Long-Term Future Index/.test(n));
  assert.doesNotMatch(noteOf(old), /maintaining what lasts/, "a 5-item sum must not list a facet it never measured");
  assert.match(noteOf(old), /not counted in this total/, "and it says so, rather than quietly dropping the clause");
  assert.match(noteOf(now), /maintaining what lasts/, "a 6-item sum does contain it");
});

// --- STATE INTEGRATION ---

const SURVEY_DATA = {
  name: "Tester",
  age: "27",
  gender: "male",
  region: "Provinces",
  employment: "Office Worker",
  relationshipStatus: "Single",
  income: "15000",
  savingsRate: "10",
  digitalLiteracy: "60",
  weeklyLearningHours: "3",
  weeklyVigorousDays: "2",
  weeklyVigorousMins: "30",
  weeklyModerateDays: "0",
  weeklyModerateMins: "0",
  weeklyWalkingDays: "3",
  weeklyWalkingMins: "20",
  weight: "60",
  height: "170",
  sleepHours: "7",
  vegetablePortions: "2",
  waterLiters: "1.5",
  singleUsePlastics: "3",
  monthlyDonations: "100",
  volunteeringHours: "0",
  longTermInvestments: "false",
  cfpb: [2, 2, 2, 2, 2],
  jss: [1, 1, 1, 1],
  st5: [1, 0, 1, 0, 1],
  who5: [3, 4, 3, 4, 3],
  lsns: [3, 3, 3, 2, 3, 3],
  ucla: [1, 2, 1],
  ras: [4, 4, 4],
  gse: [3, 3, 3, 3, 3, 3],
  grit: [4, 3, 4, 3],
  ptm: [2, 2, 2, 2, 2],
  geb: [2, 2, 2, 2, 2, 2],
  lfis: [2, 2, 2, 2, 2]
};

test("submitOnboarding stores raw instrument sums as the benchmark baseline", () => {
  const m = new GameStateManager();
  m.submitOnboarding(structuredClone(SURVEY_DATA));
  const b = m.state.baseline;
  assert.ok(b && b.date);
  assert.equal(b.who5, 17);
  assert.equal(b.st5, 3);
  assert.equal(b.lsns, 17);
  assert.equal(b.ucla, 4);
  assert.equal(b.gse, 18);
  assert.equal(b.grit, 14);
  assert.equal(b.ras, null, "RAS is null for singles");

  const all = getAllBenchmarks(m.state);
  for (const key of ALL_ASPECTS) {
    assert.ok(all[key], `${key} benchmark computable after onboarding`);
  }
});

test("baseline survives save/reload and export/import", () => {
  const m = new GameStateManager();
  m.submitOnboarding(structuredClone(SURVEY_DATA));

  const reloaded = new GameStateManager();
  assert.equal(reloaded.state.baseline.who5, 17, "baseline persists through localStorage reload");

  const exported = m.exportState();
  installMockStorage();
  const fresh = new GameStateManager();
  fresh.importState(exported);
  assert.equal(fresh.state.baseline.gse, 18, "baseline persists through export/import");
});

// --- PERCENTILE RANGES (Phase 3c) ---

test("percentileRange widens by method and clamps to 1-99", () => {
  // distribution (real mean/SD) is tightest; threshold (band placement) widest
  assert.deepEqual(percentileRange(50, "distribution"), { low: 44, high: 56 });
  assert.deepEqual(percentileRange(50, "estimate"), { low: 40, high: 60 });
  assert.deepEqual(percentileRange(50, "threshold"), { low: 38, high: 62 });
  // never leaves the 1-99 band at the extremes
  assert.deepEqual(percentileRange(3, "estimate"), { low: 1, high: 13 });
  assert.deepEqual(percentileRange(97, "estimate"), { low: 87, high: 99 });
  // an unknown method falls back to the medium margin of 10
  assert.deepEqual(percentileRange(50, "mystery"), { low: 40, high: 60 });
});

test("getAllBenchmarks attaches a range that brackets each percentile", () => {
  const all = getAllBenchmarks(makeState());
  for (const key of RANKED_ASPECTS) {
    const b = all[key];
    assert.ok(b.range, `${key} carries a range`);
    assert.ok(b.range.low >= 1 && b.range.high <= 99, `${key} range stays within 1-99`);
    assert.ok(b.range.low <= b.percentile && b.percentile <= b.range.high, `${key} range brackets its percentile`);
  }
});

test("null benchmarks carry no range (pre-baseline saves)", () => {
  const all = getAllBenchmarks(makeState({}, null));
  assert.equal(all.mental, null, "survey-only aspects stay null, not a ranged object");
});

// --- DEEP ASSESSMENT + FRIENDLIER PERCENTILES ---

test("percentileRange tightens (roughly halves) for deep-verified aspects", () => {
  assert.deepEqual(percentileRange(50, "distribution", true), { low: 47, high: 53 });
  assert.deepEqual(percentileRange(50, "estimate", true), { low: 45, high: 55 });
  assert.deepEqual(percentileRange(50, "threshold", true), { low: 42, high: 58 });
  const short = percentileRange(50, "estimate");
  const deep = percentileRange(50, "estimate", true);
  assert.ok((deep.high - deep.low) < (short.high - short.low), "verified band is narrower");
});

test("percentileBand maps a percentile to a plain-language band", () => {
  assert.equal(percentileBand(95).key, "top10");
  assert.equal(percentileBand(90).key, "top10");
  assert.equal(percentileBand(80).key, "top25");
  assert.equal(percentileBand(65).key, "above");
  assert.equal(percentileBand(50).key, "around");
  assert.equal(percentileBand(30).key, "below");
  assert.equal(percentileBand(10).key, "bottom");
});

test("a deep-verified aspect gets a narrower band and a verified flag", () => {
  const plain = getAllBenchmarks(makeState()).personalGoals;
  const verifiedBaseline = { ...BASELINE, deep: { gse10: 30 }, deepDone: { personalGoals: true } };
  const deep = getAllBenchmarks(makeState({}, verifiedBaseline)).personalGoals;
  assert.equal(deep.verified, true);
  assert.ok(!plain.verified);
  assert.ok((deep.range.high - deep.range.low) < (plain.range.high - plain.range.low));
});

test("the full GSE-10 makes the personal-goals benchmark an exact distribution match", () => {
  const shortForm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18 })).personalGoals;
  assert.equal(shortForm.method, "estimate");
  // GSE-10 raw 30 -> per-item 3.0, same reading as the short form but now exact.
  const deep = getAllBenchmarks(makeState({}, { ...BASELINE, deep: { gse10: 30 }, deepDone: { personalGoals: true } })).personalGoals;
  assert.equal(deep.method, "distribution");
  assert.ok(deep.notes.some(n => n.includes("direct match")));
});

test("grit note discloses the perseverance-only short form and prefers the full 12-item scale (#8)", () => {
  const shortForm = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18, grit: 14 })).personalGoals;
  assert.ok(
    shortForm.notes.some(n => /perseverance facet only/i.test(n)),
    "onboarding grit is disclosed as the perseverance facet only"
  );
  const deep = getAllBenchmarks(makeState({}, { ...BASELINE, gse: 18, grit: 14, deep: { grit12: 48 } })).personalGoals;
  assert.ok(
    deep.notes.some(n => /full 12-item/i.test(n)),
    "with the deep Grit-12 present the note cites the full 12-item scale"
  );
});

// --- TWO-STAGE, BAND-LOCKED PERCENTILES (the outward three) ---
//
// socialContribution, environment and humanityFuture sit on published
// participation RATES, not distributions. Before the two-stage design their
// percentiles were nearly constant — humanityFuture returned 30 or 70 and
// nothing else, so the aspect carrying the app's "lift humanity" thesis could
// only ever grade C or B. These tests pin the three properties that make the
// fix legitimate: it resolves, it never crosses a cited boundary, and it does
// not regrade anyone who has not answered.

const OUTWARD_BASELINE = { ...BASELINE, ptm: 10, geb: 12, lfis: 10 };
const bench = (profileOverrides, instruments) =>
  getAllBenchmarks(makeState(profileOverrides, instruments === null ? null : { ...OUTWARD_BASELINE, ...instruments }));

// Was "the outward three" until v64, when humanityFuture stopped being ranked
// and left the two-stage set. Its instrument sensitivity is covered above.
test("the outward two respond to their instruments, not just to a checkbox", () => {
  // Same profile, opposite instrument answers: the percentile must move.
  const low = bench({ monthlyDonations: 200, longTermInvestments: true, singleUsePlastics: 2 }, { ptm: 0, geb: 0 });
  const high = bench({ monthlyDonations: 200, longTermInvestments: true, singleUsePlastics: 2 }, { ptm: 20, geb: 24 });
  assert.ok(high.socialContribution.percentile > low.socialContribution.percentile,
    "PTM answers must move the social-contribution standing");
  assert.ok(high.environment.percentile > low.environment.percentile,
    "GEB answers must move the environment standing");
});

test("band lock: measured intensity can never cross a cited participation boundary", () => {
  // The strongest possible non-participant must still rank below the weakest
  // possible participant. This is what keeps the CITED claim intact.
  const bestNonGiver = bench({ monthlyDonations: 0, volunteeringHours: 0 }, { ptm: 20 }).socialContribution.percentile;
  const worstGiver = bench({ monthlyDonations: 1, volunteeringHours: 0 }, { ptm: 0 }).socialContribution.percentile;
  assert.ok(bestNonGiver < worstGiver,
    `a non-giver (${bestNonGiver}) outranked a giver (${worstGiver}) — the band lock is broken`);

  // The humanityFuture band lock was DELETED in v64, not relaxed. It used to
  // read: the best possible uninvested profile must rank below the worst
  // possible invested one. That assertion was the defect, written down and
  // guarded — it is exactly the farmer-below-every-pension-holder guarantee.
  // Its replacement is "a pension cannot move it" above.

  const bestHeavyPlastic = bench({ singleUsePlastics: 10 }, { geb: 24 }).environment.percentile;
  const worstLightPlastic = bench({ singleUsePlastics: 0 }, { geb: 0 }).environment.percentile;
  assert.ok(bestHeavyPlastic < worstLightPlastic,
    `10 pieces/day (${bestHeavyPlastic}) outranked 0 pieces/day (${worstLightPlastic})`);
});

test("an unanswered instrument returns the exact pre-two-stage percentile", () => {
  // No baseline => no measured intensity => the legacy fixed value. A person's
  // grade must only move when their own answers move it, never because the
  // band geometry changed underneath them.
  // PROFILE already donates, so the non-giver case must zero both fields.
  const noGiving = { monthlyDonations: 0, volunteeringHours: 0 };
  assert.equal(bench(noGiving, null).socialContribution.percentile, 24);
  assert.equal(bench({ ...noGiving, monthlyDonations: 100 }, null).socialContribution.percentile, 62);
  assert.equal(bench({ ...noGiving, volunteeringHours: 5 }, null).socialContribution.percentile, 82);
  assert.equal(bench({ monthlyDonations: 100, volunteeringHours: 5 }, null).socialContribution.percentile, 88);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 6, 10].map(p => bench({ singleUsePlastics: p }, null).environment.percentile),
    [90, 78, 64, 50, 34, 20, 10]
  );
  // humanityFuture had a 70/30 pre-two-stage fallback here, driven by the same
  // pension checkbox. With no baseline it now returns null outright rather than
  // a fabricated standing.
  assert.equal(bench({ longTermInvestments: true }, null).humanityFuture.percentile, null);
  assert.equal(bench({ longTermInvestments: false }, null).humanityFuture.percentile, null);
});

test("giving as a share of income positions within the donor band", () => {
  // Participation alone said a 50 THB donor and a 5,000 THB donor were
  // identical. Magnitude is exactly what CAF's yes/no rate cannot capture.
  const token = bench({ monthlyIncome: 20000, monthlyDonations: 50 }, { ptm: 10 }).socialContribution.percentile;
  const generous = bench({ monthlyIncome: 20000, monthlyDonations: 1500 }, { ptm: 10 }).socialContribution.percentile;
  assert.ok(generous > token, `a 7.5%-of-income donor (${generous}) must outrank a 0.25% donor (${token})`);
});

test("every outward aspect discloses that the band is cited and the position is not", () => {
  const set = bench({ monthlyDonations: 100 }, {});
  for (const key of ["socialContribution", "environment"]) {
    assert.ok(set[key].notes.some(n => /can never move you into a different band/i.test(n)),
      `${key} does not disclose the two-stage design`);
  }
  // humanityFuture must NOT carry that note any more: it has no cited band left
  // to disclose, and saying it did would be a claim about a rank that is gone.
  assert.ok(!set.humanityFuture.notes.some(n => /can never move you into a different band/i.test(n)),
    "an unranked aspect must not advertise a two-stage band");
});

test("income uses one shared cited model — the benchmark card matches incomePercentile (#9)", () => {
  assert.equal(incomePercentile(0, "Provinces"), 1, "zero income floors at the 1st percentile");
  assert.equal(incomePercentile(12900, "Provinces"), 50, "national median reads ~50th");
  assert.equal(incomePercentile(17400, "Bangkok"), 50, "Bangkok median reads ~50th");
  assert.ok(
    incomePercentile(6000, "Provinces") < incomePercentile(40000, "Provinces"),
    "percentile is monotonic in income"
  );
  // the on-page finance card is driven by the same function, not a second model
  const card = getAllBenchmarks(makeState({ income: 25000, region: "Provinces" })).finance;
  assert.equal(card.percentile, incomePercentile(25000, "Provinces"));
});
