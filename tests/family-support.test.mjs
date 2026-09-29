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
// v78 asks for it separately and reports it on Social Contribution as
// giving (the runway it also fed left in v143). It is
// deliberately NOT added to that score — see socialContributionFacts() in
// aspects.js for why, which is the same reason Environment lost its percentile
// in v77 rather than the convenient one.
//
// These tests pin the silence: reported, never scored.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { calculateSocialContributionScore } from "../scoring.js";
import { getAspectDetail } from "../aspects.js";
import { DEFAULT_STATE } from "../defaults.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

const profile = (over = {}) => ({ ...DEFAULT_STATE.profile, ...over });

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
    profile: profile({ income: 30000 }),
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

test("the field survives a round trip through the profile editor", async () => {
  // An earlier version of this test was named for a round trip and consisted
  // entirely of regexes over source text — it would have passed if
  // updateProfile silently dropped the value. An independent review called it
  // out. This one actually drives the mutator.
  const { GameStateManager } = await import("../state.js");
  const mgr = new GameStateManager();
  mgr.state = structuredClone({
    ...DEFAULT_STATE, onboarded: true,
    profile: profile({ income: 30000 })
  });

  mgr.updateProfile({ familySupport: "5000" });
  assert.equal(mgr.state.profile.familySupport, 5000, "the edit must be stored");

  // Blank means ZERO for this field, not "leave unchanged". It is the app's
  // only optional money field and its own placeholder says "leave blank if
  // none", so someone who stops sending money home has to be able to say so.
  // Without this Social Contribution would keep reporting money they no
  // longer send.
  mgr.updateProfile({ familySupport: "" });
  assert.equal(mgr.state.profile.familySupport, 0, "an emptied box must clear the field");

  // Blank still means "unchanged" for the fields that have no meaningful zero.
  mgr.updateProfile({ income: "" });
  assert.equal(mgr.state.profile.income, 30000, "a blank income must not zero someone's income");
});

test("editing family support reports no score change, because nothing scores it", async () => {
  // A "your scores shifted" toast on an edit that cannot move a score would be
  // the app contradicting its own model on screen.
  const { GameStateManager } = await import("../state.js");
  const mgr = new GameStateManager();
  mgr.state = structuredClone({
    ...DEFAULT_STATE, onboarded: true,
    profile: profile({ income: 30000 })
  });
  const before = { ...mgr.state.aspects };
  const result = mgr.updateProfile({ familySupport: "9000" });
  const shifts = (result && result.shifts) || {};
  assert.deepEqual(shifts, {}, "reporting family support must shift no aspect");
  assert.deepEqual(mgr.state.aspects, before, "and must move no aspect score");
});

test("the field is range-checked on import as well as on entry", () => {
  // The form floors at 0; a backup file does not. Both paths are guarded.
  assert.match(read("sanitize.js"), /familySupport: \[0, \d+\]/);
  assert.match(read("validation.js"), /familySupport: \{ min: 0, max: \d+ \}/);
});
