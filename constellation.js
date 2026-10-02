// constellation.js - your constellation: all eight characters as one code
// (v171; the code only since v172).
//
// The owner, 2026-10-02: the eight regions' characters combine 4^8 = 65,536
// ways, and every combination should have a name. Hand-naming 65,536 is not
// possible, so the code names it: one letter per region, from your character
// there, in Overview's order and read four and four (TGPE-AWRC). The letters
// stay Latin in Thai too, as an MBTI code does. Each combination has its own.
//
// v171 also gave 16 type names; v172 dropped them (the owner: with 32
// characters already, a type is redundant and frames you as less of one).
// No code claims to be rare. With a region still lacking a character there is
// no code, only how many regions are left.

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

// The code for eight cast indices in region order.
export function constellationCode(indices) {
  const letters = RADAR_KEYS.map((key, i) => CODE_LETTERS[key][indices[i]]).join("");
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

// Your constellation, or null with no state. Until every region has a
// character: { complete: false, code: null, left }.
export function constellationFor(state) {
  if (!state) return null;
  const indices = RADAR_KEYS.map(key => characterFor(state, key)?.index ?? null);
  const left = indices.filter(i => i === null).length;
  if (left) return { complete: false, code: null, left };
  return { complete: true, code: constellationCode(indices), left: 0 };
}
