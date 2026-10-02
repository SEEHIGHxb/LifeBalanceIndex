// constellation.js - your constellation: all eight characters as one code and
// one of 16 types (v171).
//
// The owner, 2026-10-02: the eight regions' characters combine 4^8 = 65,536
// ways, and every combination should have a name. Hand-naming 65,536 is not
// possible, so the owner chose "code + 16 types":
//
//   code   one letter per region, from your character there, in Overview's
//          order and read four and four (TGPE-AWRC). The letters stay Latin
//          in Thai too, as an MBTI code does. Each combination has its own.
//   type   the 16 two-way sides behind the characters fall in two groups:
//          outside, what you do or have (10 sides), and inside, how it feels
//          (6 sides). The share of each group you meet is cut into four
//          levels, and the two levels pick one of 16 sky names.
//
// Made up for fun, like the characters: no type claims to be rare, and none
// reads as a verdict. With a region still lacking a character there is no
// code and no type, only how many regions are left.

import { t } from "./i18n.js";
import { RADAR_KEYS } from "./chart.js";
import { characterFor } from "./characters.js";

export const POSSIBLE = 4 ** RADAR_KEYS.length;

// Each region's letters in cast order [both, first only, second only,
// neither], unique within the region (the owner approved them, 2026-10-02).
export const CODE_LETTERS = {
  finance: ["T", "M", "S", "V"],             // Treasurer, Merchant, Sage, Vendor
  physical: ["G", "C", "H", "P"],            // Guide, Climber, Herder, Pilgrim
  mental: ["P", "B", "F", "W"],              // Poet, Boatman, Fisher, Wayfarer
  relationships: ["E", "H", "K", "N"],       // Elder, Host, Hearthkeeper, Newcomer
  personalGoals: ["A", "B", "P", "T"],       // Artisan, Blacksmith, Apprentice, Tinkerer
  socialContribution: ["W", "A", "H", "T"],  // Wayfinder, Almsgiver, Helper, Traveller
  environment: ["R", "G", "H", "S"],         // Ranger, Gardener, Hermit, Scout
  humanityFuture: ["C", "F", "V", "S"]       // Captain, Farmer, Voyager, Stargazer
};

// Which group each region's [first, second] side counts in: "o" outside,
// "i" inside. Outside: earning, moving, circle, finishing, growing, giving,
// green habits, plastic, safety net, skills. Inside: money control, rest,
// mood, pressure, bonds, the urge to help.
const GROUPS = {
  finance: ["o", "i"],
  physical: ["o", "i"],
  mental: ["i", "i"],
  relationships: ["o", "i"],
  personalGoals: ["o", "o"],
  socialContribution: ["o", "i"],
  environment: ["o", "o"],
  humanityFuture: ["o", "o"]
};
const LEVELS = 4;

// A cast index back to its two sides (characters.js castIndex).
const sidesOf = (index) => [index < 2, index % 2 === 0];

// The code for eight cast indices in region order.
export function constellationCode(indices) {
  const letters = RADAR_KEYS.map((key, i) => CODE_LETTERS[key][indices[i]]).join("");
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

// The share of each group met, cut into levels 1-4: under a quarter is 1,
// three quarters or more is 4.
export function typeLevels(indices) {
  const met = { o: 0, i: 0 };
  const all = { o: 0, i: 0 };
  RADAR_KEYS.forEach((key, k) => {
    sidesOf(indices[k]).forEach((yes, s) => {
      const group = GROUPS[key][s];
      all[group] += 1;
      if (yes) met[group] += 1;
    });
  });
  const level = (g) => Math.min(LEVELS, 1 + Math.floor((LEVELS * met[g]) / all[g]));
  return { outside: level("o"), inside: level("i") };
}

// The 16 types as rows of inside level 1-4, each running outside level 1-4.
// Built on call so the words follow the language switch.
const buildTypes = () => [
  [
    { name: t("New Moon"), line: t("A quiet sky for now, with every phase still ahead.") },
    { name: t("Spark"), line: t("Things are catching outside; the inside can catch up.") },
    { name: t("Meteor"), line: t("Moving fast outside, and burning a lot inside.") },
    { name: t("Wildfire"), line: t("Strong outside; the inside could use some rain.") }
  ],
  [
    { name: t("Dawn"), line: t("The light is coming from the inside first.") },
    { name: t("Kite"), line: t("Lifting off, and still finding the wind.") },
    { name: t("Trailblazer"), line: t("Clearing a path outside, finding your feet inside.") },
    { name: t("Comet"), line: t("A bright trail outside, still settling inside.") }
  ],
  [
    { name: t("Moonlit Lake"), line: t("Calm inside, with room to grow outside.") },
    { name: t("Lantern"), line: t("A steady light inside, carried a little further each week.") },
    { name: t("Navigator"), line: t("Steady inside and out, plotting the next course.") },
    { name: t("Lighthouse"), line: t("Strong outside, steady inside.") }
  ],
  [
    { name: t("Quiet Star"), line: t("At peace inside, shining in its own quiet way.") },
    { name: t("Harbour"), line: t("Settled inside, a safe place for others too.") },
    { name: t("North Star"), line: t("Settled inside, and others steer by you.") },
    { name: t("Full Sun"), line: t("Bright outside and in.") }
  ]
];

export function typeName(outside, inside) {
  return buildTypes()[inside - 1][outside - 1];
}

// Your constellation, or null with no state. Until every region has a
// character: { complete: false, code: null, left }.
export function constellationFor(state) {
  if (!state) return null;
  const indices = RADAR_KEYS.map(key => characterFor(state, key)?.index ?? null);
  const left = indices.filter(i => i === null).length;
  if (left) return { complete: false, code: null, left };
  const { outside, inside } = typeLevels(indices);
  return { complete: true, code: constellationCode(indices), left: 0, outside, inside, ...typeName(outside, inside) };
}
