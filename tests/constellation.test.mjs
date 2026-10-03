// Your constellation (constellation.js, v171; the code only since v172). The
// owner, 2026-10-02: name every one of the 4^8 = 65,536 character
// combinations, shown on Overview and the share card. These pin that every
// combination has its own code, that the 16 type names are gone, and that no
// code is drawn before all eight regions have a character.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_STATE } from "../defaults.js";
import { RADAR_KEYS } from "../chart.js";
import * as constellation from "../constellation.js";

const { CODE_LETTERS, POSSIBLE, constellationCode, constellationFor } = constellation;

const BASELINE = { cfpb: 10, who5: 15, st5: 3, lsns: 18, ucla: 4, citacc: 12, citlearn: 12, ptm: 14, geb: 14 };
const make = (profile = {}, baseline = {}) => ({
  ...DEFAULT_STATE,
  profile: { ...DEFAULT_STATE.profile, income: 30000, sleepHours: 8, weeklyLearningHours: 3, savingsRate: 15, ...profile },
  baseline: { ...BASELINE, ...baseline }
});

// Every combination of eight cast indices (0-3), in region order.
const everyCombination = function* () {
  for (let n = 0; n < POSSIBLE; n += 1) yield RADAR_KEYS.map((_, i) => Math.floor(n / 4 ** i) % 4);
};

test("4^8 = 65,536 combinations, each with its own code", () => {
  assert.equal(POSSIBLE, 65536);
  const codes = new Set();
  for (const indices of everyCombination()) codes.add(constellationCode(indices));
  assert.equal(codes.size, POSSIBLE);
});

test("the code reads one letter per region in Overview's order, four and four", () => {
  assert.deepEqual(Object.keys(CODE_LETTERS), RADAR_KEYS);
  for (const key of RADAR_KEYS) {
    assert.equal(new Set(CODE_LETTERS[key]).size, 4, `${key} repeats a letter`);
  }
  // Treasurer, Guide, Poet, Elder, Artisan, Wayfinder, Ranger, Captain.
  assert.equal(constellationCode([0, 0, 0, 0, 0, 0, 0, 0]), "TGPE-AWRC");
  // Vendor, Pilgrim, Wayfarer, Newcomer, Tinkerer, Traveller, Scout, Stargazer.
  assert.equal(constellationCode([3, 3, 3, 3, 3, 3, 3, 3]), "VPWN-TTSS");
});

test("v172: the code only, no type names (the owner: the 32 characters already name you)", () => {
  assert.equal(constellation.typeName, undefined);
  assert.equal(constellation.typeLevels, undefined);
  const th = readFileSync(new URL("../th.js", import.meta.url), "utf8");
  for (const name of ["New Moon", "Lighthouse", "North Star", "Full Sun"]) {
    assert.ok(!th.includes(`"${name}":`), `${name} is still translated`);
  }
});

test("a full set of characters gives a code and a name", () => {
  const c = constellationFor(make());
  assert.deepEqual(Object.keys(c).sort(), ["code", "complete", "left", "name"]);
  assert.match(c.name.subtitle, /^The \w+ \w+$/);
  assert.equal(c.complete, true);
  assert.match(c.code, /^[A-Z]{4}-[A-Z]{4}$/);
  assert.equal(c.left, 0);
});

test("no code is drawn while a region has no character: it counts the regions left", () => {
  const c = constellationFor({ ...make(), baseline: null });
  assert.equal(c.complete, false);
  assert.equal(c.code, null);
  assert.ok(c.left > 0 && c.left <= 8);
  assert.equal(constellationFor(null), null);
});

// --- the name (v190) ---------------------------------------------------------
// The owner, 2026-10-03: every word of the name comes from your scores.
const { constellationName, GAP_BANDS } = constellation;
const ZERO = [0, 0, 0, 0, 0, 0, 0, 0];

test("the name comes from the two strongest scores, whatever their order", () => {
  // The Commons 81 and The Crossroads 74 lead: Pleiades.
  const n = constellationName([62, 55, 48, 81, 58, 74, 50, 45], ZERO);
  assert.equal(n.title, "Pleiades");
  assert.deepEqual(n.strongest, ["relationships", "socialContribution"]);
  assert.deepEqual(n.strongestScores, [81, 74]);
  // Raise The Market above both: the family follows the scores.
  assert.equal(constellationName([95, 55, 48, 81, 58, 74, 50, 45], ZERO).title, "The Big Dipper");
  // A tie goes to the region that comes first.
  assert.deepEqual(constellationName([70, 70, 70, 70, 70, 70, 70, 70], ZERO).strongest, ["finance", "physical"]);
});

test("every pair of regions has a name, and no two pairs share one", () => {
  const titles = new Set();
  for (let a = 0; a < 8; a += 1) for (let b = a + 1; b < 8; b += 1) {
    const s = ZERO.map((_, i) => (i === a ? 90 : i === b ? 80 : 40));
    titles.add(constellationName(s, ZERO).title);
  }
  assert.equal(titles.size, 28);
});

test("the word reads the gap between the highest and lowest region", () => {
  const at = (gap) => constellationName([50 + gap, 50, 50, 50, 50, 50, 50, 50], ZERO).word;
  assert.deepEqual(GAP_BANDS, [15, 30, 45, 101]);
  assert.equal(at(0), "Steady");
  assert.equal(at(14), "Steady");
  assert.equal(at(15), "Rising");
  assert.equal(at(30), "Bright");
  assert.equal(at(45), "Bold");
  assert.equal(constellationName([100, 0, 0, 0, 0, 0, 0, 0], ZERO).word, "Bold");
});

test("the thing is your character in your strongest region", () => {
  const commons = [40, 40, 40, 90, 40, 80, 40, 40];
  assert.equal(constellationName(commons, [0, 0, 0, 2, 0, 0, 0, 0]).thing, "Hearth");
  assert.equal(constellationName(commons, [0, 0, 0, 3, 0, 0, 0, 0]).thing, "Doorway");
  // A character elsewhere does not change it.
  assert.equal(constellationName(commons, [3, 3, 3, 2, 3, 3, 3, 3]).thing, "Hearth");
  assert.equal(constellationName(commons, [0, 0, 0, 2, 0, 0, 0, 0]).subtitle, "The Bold Hearth");
});

test("4 words x 32 things: 128 subtitles, each with its reason", () => {
  const subs = new Set();
  for (let r = 0; r < 8; r += 1) for (let k = 0; k < 4; k += 1) for (const gap of [10, 20, 35, 60]) {
    const s = ZERO.map((_, i) => (i === r ? 30 + gap : 30));
    const idx = ZERO.map((_, i) => (i === r ? k : 0));
    const n = constellationName(s, idx);
    assert.ok(n.line && n.wordWhy && n.thingWhy, "a part has no story");
    subs.add(n.subtitle);
  }
  assert.equal(subs.size, 128);
});
