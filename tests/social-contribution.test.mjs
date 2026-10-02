// v177, the owner: testers who help friends, family and colleagues every week
// but rarely donate or log volunteering hours scored low on Social
// Contribution, because everyday helping was 16% of it. Now 40% everyday
// helping, 30% giving money, 30% volunteering and community, with a new
// question about colleagues, classmates and neighbours.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculateSocialContributionScore, ptmMax,
  SOCIAL_HELP_WEIGHT, SOCIAL_GIVING_WEIGHT, SOCIAL_COMMUNITY_WEIGHT
} from "../scoring.js";
import { INSTRUMENTS } from "../surveys.js";

const NONE = { monthlyDonations: 0, volunteeringHours: 0, income: 15000 };

test("the three parts weigh 40/30/30", () => {
  assert.equal(SOCIAL_HELP_WEIGHT + SOCIAL_GIVING_WEIGHT + SOCIAL_COMMUNITY_WEIGHT, 1);
  assert.deepEqual([SOCIAL_HELP_WEIGHT, SOCIAL_GIVING_WEIGHT, SOCIAL_COMMUNITY_WEIGHT], [0.4, 0.3, 0.3]);
});

test("someone who helps the people around them very often scores 40 with no money or hours", () => {
  // Often helping friends or family, colleagues, and strangers; never giving,
  // never a community event. Before v177 the same answers scored 16.
  assert.equal(calculateSocialContributionScore(NONE, [0, 4, 4, 4, 0, 0]), 40);
});

test("the colleagues and neighbours item is asked third, beside the other helping items", () => {
  const items = INSTRUMENTS.ptm.items.map(i => i.text);
  assert.equal(items.length, 6);
  assert.match(items[1], /friends or family/);
  assert.match(items[2], /colleagues, classmates or neighbours/);
  assert.match(items[3], /strangers/);
  // It counts as helping: moving it alone moves the score by a third of 40%.
  const low = calculateSocialContributionScore(NONE, [0, 0, 0, 0, 0, 0]);
  const high = calculateSocialContributionScore(NONE, [0, 0, 4, 0, 0, 0]);
  assert.equal(Math.round(high - low), 13);
});

test("a five-answer set (before v177) still scores, helping from its two items", () => {
  assert.equal(calculateSocialContributionScore(NONE, [0, 4, 4, 0, 0]), 40);
  assert.equal(calculateSocialContributionScore(NONE, [0, 0, 0, 4, 4]), 20, "community and civic are its last two");
});

test("the extremes still reach 0 and the ceiling (SCORE_MAX, 99)", () => {
  const most = { monthlyDonations: 5000, volunteeringHours: 24, income: 15000 };
  assert.equal(calculateSocialContributionScore(NONE, [0, 0, 0, 0, 0, 0]), 0);
  assert.equal(calculateSocialContributionScore(most, [4, 4, 4, 4, 4, 4]), 99);
});

test("a stored PTM sum is out of 24 with six items, 20 without the count", () => {
  assert.equal(ptmMax(6), 24);
  assert.equal(ptmMax(5), 20);
  assert.equal(ptmMax(undefined), 20, "a baseline from before v177 was measured on five items");
});
