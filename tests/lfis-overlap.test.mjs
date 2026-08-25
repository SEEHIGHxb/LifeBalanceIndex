// tests/lfis-overlap.test.mjs - the guard round 13 left behind.
//
// Round 13 (docs/research/round-13-lfis-overlap-audit.md) checked all six LFIS
// items against every other scored input in the app and found exactly one
// double-count: item 3 asked about donating, and giving is already worth 0.4 of
// Social Contribution through PTM item 1 and `monthlyDonations`. v74 reworded
// it to measure restraint toward an unborn beneficiary instead.
//
// The failure this file exists to prevent is REGRESSION BY GOOD INTENTIONS.
// Nothing about "I support or donate to causes addressing future generations'
// well-being" looks wrong on its own — it reads like a perfectly sensible
// question for this aspect, which is why it survived two previous cleanups of
// this exact instrument (v64, v67). The overlap is only visible from the other
// aspect's scorer, so a reader editing surveys.js cannot see it at all.
//
// Hence a vocabulary guard rather than a value assertion. It is deliberately
// narrow: it fails on the constructs Social Contribution and Environment
// already score, and says which one, so the message explains the rule instead
// of just breaking.

import { test } from "node:test";
import assert from "node:assert/strict";

import { INSTRUMENTS } from "../surveys.js";
import { calculateHumanityFutureScore } from "../scoring.js";

const LFIS = INSTRUMENTS.lfis.items.map(i => i.text.toLowerCase());

// Each entry: the construct, where it is ALREADY scored, and the words that
// would signal it has been re-introduced here.
const ALREADY_SCORED_ELSEWHERE = [
  { construct: "giving money", where: "Social Contribution (PTM item 1 + monthlyDonations, 0.4 of the aspect)", words: ["donate", "donation", "charity", "give money", "giving money"] },
  { construct: "volunteering time", where: "Social Contribution (volunteerFactor, 0.24 of the aspect)", words: ["volunteer", "volunteering"] },
  { construct: "civic participation", where: "Social Contribution (PTM items 4 and 5, 0.2 of the aspect)", words: ["civic", "voting", "neighborhood activities"] },
  { construct: "green consumption", where: "Environment (GEB items 1-6)", words: ["recycl", "single-use", "public transit"] }
];

test("no LFIS item measures something another aspect already scores", () => {
  for (const { construct, where, words } of ALREADY_SCORED_ELSEWHERE) {
    for (const word of words) {
      const hit = LFIS.findIndex(text => text.includes(word));
      assert.equal(
        hit,
        -1,
        `LFIS item ${hit + 1} contains "${word}", which measures ${construct} — already scored in ${where}. ` +
        "See docs/research/round-13-lfis-overlap-audit.md before changing this item."
      );
    }
  }
});

test("item 3 still asks about the future, not just about using less", () => {
  // The reword had two jobs and this pins the second one. Dropping the
  // beneficiary would leave a plain frugality question, which belongs to
  // Environment rather than to an aspect about what outlasts you.
  const item3 = LFIS[2];
  assert.ok(/less/.test(item3), "item 3 measures restraint");
  assert.ok(/after me|come after|future|later/.test(item3), "item 3 must name the beneficiary who comes later");
});

test("the instrument is still six items, so the maintaining term survives", () => {
  // calculateHumanityFutureScore infers the presence of the v65 maintaining
  // term from `lfisAnswers.length >= 6`. Round 13 considered DROPPING item 3
  // and rejected it partly because a five-item instrument would be read as a
  // pre-v65 save and silently lose that term. If a future edit shortens this
  // instrument, that inference has to be replaced first.
  assert.equal(INSTRUMENTS.lfis.items.length, 6);
});

test("v74 moved no weights: the aspect scores exactly as it did before", () => {
  // Every term at 2 of 4, so each S_* is 50 except Skills, which blends item 1
  // with futureStudyScore(2h/4h = 50) and also lands on 50. Five terms at 0.2.
  const profile = { weeklyLearningHours: 2 };
  assert.equal(calculateHumanityFutureScore(profile, [2, 2, 2, 2, 2, 2]), 50);

  // And the pre-v65 five-item path still renormalizes over four terms at 0.25.
  assert.equal(calculateHumanityFutureScore(profile, [2, 2, 2, 2, 2]), 50);
});
