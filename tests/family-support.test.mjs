// กตัญญู, and what the model used to do with it.
//
// Until v78 this app asked one question — "Committed Monthly Outflow (THB)" —
// and its help text read:
//
//   "what you cannot skip in a month — rent, loan repayments, family support,
//    bills"
//
// So money sent to a reader's parents entered the model in exactly ONE place:
// as part of a denominator that shortens a runway. At the same time Social
// Contribution scored donations to charity and volunteering hours. For a reader
// practising กตัญญู, the largest transfer they make to another household was a
// bill in the finance section and did not exist at all in the section about
// giving.
//
// v78 asks for it separately, keeps it in the runway (it does not stop when
// income stops), and reports it on Social Contribution as giving. It is
// deliberately NOT added to that score — see socialContributionFacts() in
// aspects.js for why, which is the same reason Environment lost its percentile
// in v77 rather than the convenient one.
//
// These tests pin all three halves of that: the arithmetic, the silence, and
// the wording that caused it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runwayMonths, totalCommittedOutflow, calculateSocialContributionScore } from "../scoring.js";
import { getAspectDetail } from "../aspects.js";
import { DEFAULT_STATE } from "../defaults.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

const profile = (over = {}) => ({ ...DEFAULT_STATE.profile, ...over });

// --- The arithmetic --------------------------------------------------------

test("family support is part of the runway denominator", () => {
  // It is in the sum because the runway question is "how long could I cover
  // what I cannot stop paying", and for someone supporting their parents that
  // money does not stop.
  const p = profile({ liquidSavings: 120000, committedOutflow: 15000, familySupport: 5000 });
  assert.equal(totalCommittedOutflow(p), 20000);
  assert.equal(runwayMonths(p), 6);
});

test("a save written before the split keeps the runway it had", () => {
  // familySupport defaults to 0 and the old single field already carried the
  // total, so the split is additive with no migration and no schema bump.
  const before = profile({ liquidSavings: 120000, committedOutflow: 20000 });
  delete before.familySupport;
  assert.equal(runwayMonths(before), 6);
  assert.equal(totalCommittedOutflow(before), 20000);
});

test("family support alone still defines a runway", () => {
  // Someone whose only unskippable outgoing is what they send home has a
  // runway, and before v78 they would have had to file it under "bills" to see
  // one at all.
  const p = profile({ liquidSavings: 30000, committedOutflow: 0, familySupport: 10000 });
  assert.equal(runwayMonths(p), 3);
});

test("no outflow of either kind still means no runway, not zero months", () => {
  // The existing contract: unbounded is not a quantity this can print, so the
  // row is omitted. Adding a second field must not turn null into 0.
  const p = profile({ liquidSavings: 50000, committedOutflow: 0, familySupport: 0 });
  assert.equal(runwayMonths(p), null);
});

test("a negative or garbage value cannot drag the denominator down", () => {
  // Reachable from a connector, never from the form, which floors at 0. A
  // negative family support must not lengthen someone's runway.
  const p = profile({ liquidSavings: 60000, committedOutflow: 10000, familySupport: -5000 });
  assert.equal(totalCommittedOutflow(p), 10000);
  assert.equal(runwayMonths(p), 6);
  assert.equal(totalCommittedOutflow(profile({ committedOutflow: 10000, familySupport: "abc" })), 10000);
});

// --- The silence -----------------------------------------------------------

test("family support does not move the Social Contribution score", () => {
  // THE POINT OF THE WHOLE ROUND, stated as an assertion. It is reported on
  // that page, and it is not scored there. If a later release folds it into the
  // score, this fails and the release has to say so out loud.
  const giver = profile({ income: 30000, monthlyDonations: 300, volunteeringHours: 2, familySupport: 8000 });
  const notGiver = { ...giver, familySupport: 0 };
  // PTM Behavior, 5 items on 0-4. Held identical across the two profiles so the
  // only thing that differs is the family support.
  const ptm = [2, 2, 2, 2, 2];
  assert.equal(
    calculateSocialContributionScore(giver, ptm),
    calculateSocialContributionScore(notGiver, ptm),
    "family support must not enter the Social Contribution score: the published " +
    "giving rates behind that percentile never asked the population about it"
  );
});

test("family support does not move any aspect score", () => {
  const base = { ...DEFAULT_STATE, onboarded: true,
    profile: profile({ income: 30000, liquidSavings: 120000, committedOutflow: 15000 }),
    aspects: { ...DEFAULT_STATE.aspects } };
  const withFamily = { ...base, profile: { ...base.profile, familySupport: 9000 } };
  for (const key of Object.keys(base.aspects)) {
    assert.equal(
      getAspectDetail(base, key).score,
      getAspectDetail(withFamily, key).score,
      `${key} moved when family support was reported; nothing scores it`
    );
  }
});

test("it is reported as a FACT on Social Contribution, never as a component", () => {
  // A component carries a 0-100 value and renders as a bar, and a bar can
  // silently acquire a weight later. A fact carries a formatted string and
  // cannot.
  const state = { ...DEFAULT_STATE, onboarded: true,
    profile: profile({ income: 30000, familySupport: 8000 }) };
  const detail = getAspectDetail(state, "socialContribution");
  const fact = detail.facts.find(f => f.key === "familySupport");
  assert.ok(fact, "Social Contribution must report family support when there is any");
  assert.match(fact.display, /8,000/);
  assert.ok(!("value" in fact), "a fact must not carry a 0-100 value");
  assert.ok(
    !detail.components.some(c => c.key === "familySupport"),
    "family support must not appear as a scored component"
  );
});

test("nothing is reported when nothing is sent", () => {
  const state = { ...DEFAULT_STATE, onboarded: true, profile: profile({ familySupport: 0 }) };
  const detail = getAspectDetail(state, "socialContribution");
  assert.equal(detail.facts.filter(f => f.key === "familySupport").length, 0);
});

// --- The wording that caused it -------------------------------------------

test("the committed-outflow question no longer files family support as a bill", () => {
  // This is the drift guard. Putting "family support" back into that list of
  // examples would silently undo the whole round: the new field would still
  // exist, and readers would still enter the money in the box that only ever
  // shortens a runway.
  const onboarding = read("views/onboarding.js");
  const outflowCopy = onboarding.match(/The second box is what you cannot skip in a month[^"]*/);
  assert.ok(outflowCopy, "the committed-outflow help text must still be there");
  assert.ok(
    !/family support/i.test(outflowCopy[0]),
    `the committed-outflow question lists family support as an example again: ` +
    `"${outflowCopy[0]}"`
  );
  assert.match(onboarding, /field: "familySupport"/,
    "onboarding must ask for family support on its own");
});

test("the field survives a round trip through the profile editor", () => {
  const state = read("state.js");
  assert.match(state, /PROFILE_EDIT_NUMERIC = \[[^\]]*"familySupport"/);
  assert.match(state, /PROFILE_EDIT_PROVIDED = \[[^\]]*"familySupport"/);
  assert.match(state, /p\.familySupport = parseFloat\(surveyData\.familySupport \|\| 0\)/);
  assert.match(read("views/profile.js"), /familySupport: val\("pf-family"\)/);
  // Range-checked like every other imported number, so a garbage value cannot
  // reach the runway line.
  assert.match(read("sanitize.js"), /familySupport: \[0, \d+\]/);
  assert.match(read("validation.js"), /familySupport: \{ min: 0, max: \d+ \}/);
});
