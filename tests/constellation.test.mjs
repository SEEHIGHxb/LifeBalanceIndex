// Your constellation (constellation.js, v171). The owner, 2026-10-02: name
// every one of the 4^8 = 65,536 character combinations, as "code + 16 types",
// shown on Overview and the share card. These pin that every combination has
// its own code, that all 16 types can be reached, how the two groups are
// counted, and that no type is drawn before all eight regions have a character.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_STATE } from "../defaults.js";
import { RADAR_KEYS } from "../chart.js";
import {
  CODE_LETTERS, POSSIBLE, constellationCode, typeLevels, typeName, constellationFor
} from "../constellation.js";

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

test("outside counts 10 sides, inside 6, each cut into four levels", () => {
  assert.deepEqual(typeLevels([0, 0, 0, 0, 0, 0, 0, 0]), { outside: 4, inside: 4 });
  assert.deepEqual(typeLevels([3, 3, 3, 3, 3, 3, 3, 3]), { outside: 1, inside: 1 });
  // Mental is all inside: both of its sides met, nothing else.
  assert.deepEqual(typeLevels([3, 3, 0, 3, 3, 3, 3, 3]), { outside: 1, inside: 2 });
  // Workshop, Wildwood and Lookout are all outside: 6 of 10 is level 3.
  assert.deepEqual(typeLevels([3, 3, 3, 3, 0, 3, 0, 0]), { outside: 3, inside: 1 });
  // Every first side met, no second one: 6 outside, 1 inside (mood).
  assert.deepEqual(typeLevels([1, 1, 1, 1, 1, 1, 1, 1]), { outside: 3, inside: 1 });
});

test("all 16 types can be reached, and their names are all different", () => {
  const seen = new Map();
  for (const indices of everyCombination()) {
    const { outside, inside } = typeLevels(indices);
    seen.set(`${outside},${inside}`, typeName(outside, inside).name);
  }
  assert.equal(seen.size, 16);
  assert.equal(new Set(seen.values()).size, 16);
});

test("every type name and line has its Thai, and none uses an em-dash", () => {
  const th = readFileSync(new URL("../th.js", import.meta.url), "utf8");
  for (let o = 1; o <= 4; o += 1) {
    for (let i = 1; i <= 4; i += 1) {
      const { name, line } = typeName(o, i);
      for (const s of [name, line]) {
        assert.ok(th.includes(`"${s}":`), `no Thai for "${s}"`);
        assert.ok(!s.includes("—"), `"${s}" uses an em-dash`);
      }
    }
  }
});

test("a full set of characters gives a code and a type", () => {
  const c = constellationFor(make());
  assert.equal(c.complete, true);
  assert.match(c.code, /^[A-Z]{4}-[A-Z]{4}$/);
  assert.ok(c.name && c.line);
  assert.equal(c.left, 0);
});

test("no type is drawn while a region has no character: it counts the regions left", () => {
  const c = constellationFor({ ...make(), baseline: null });
  assert.equal(c.complete, false);
  assert.equal(c.code, null);
  assert.ok(c.left > 0 && c.left <= 8);
  assert.equal(constellationFor(null), null);
});
