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

test("a full set of characters gives a code, and nothing else", () => {
  const c = constellationFor(make());
  assert.deepEqual(Object.keys(c).sort(), ["code", "complete", "left"]);
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
