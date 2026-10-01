// The learning question and the painted week (the owner, 2026-09-27: "a vague
// question that people doesn't measure these kind of number"). They replace
// number boxes, so what they must never do is change the numbers stored: the
// same fields, the same ids, the same values for the same answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.mjs";

installDom();
const {
  LEARNING_STEPS, LENGTHS, summarizeWeek, withCurrent, daysFor, learningMarkup, weekMarkup
} = await import("../views/activity-fields.js");
const { allScreens } = await import("../views/journey.js");

const none7 = () => Array(7).fill(false);
const week = (over = {}) => ({ vig: none7(), mod: none7(), walk: none7(), ...over });
const IDS = {
  vig: { days: "x-vig-days", mins: "x-vig-mins" },
  mod: { days: "x-mod-days", mins: "x-mod-mins" },
  walk: { days: "x-walk-days", mins: "x-walk-mins" }
};

test("an untouched week is blank, not zero: the blank-first rule still holds", () => {
  const sum = summarizeWeek({ cells: week(), none: false, lengths: {} });
  for (const k of ["vig", "mod", "walk"]) assert.deepEqual(sum[k], { days: "", mins: "" });
});

test("'none of these' answers the week as zero days and zero minutes", () => {
  const sum = summarizeWeek({ cells: week(), none: true, lengths: {} });
  for (const k of ["vig", "mod", "walk"]) assert.deepEqual(sum[k], { days: 0, mins: 0 });
});

test("painted days count per kind, one day can hold several kinds, and a length is waited for", () => {
  const monWed = [true, false, true, false, false, false, false];
  const sum = summarizeWeek({
    cells: week({ vig: monWed, walk: [true, true, true, true, true, false, false] }),
    none: false,
    lengths: { vig: 45, walk: null }
  });
  assert.deepEqual(sum.vig, { days: 2, mins: 45 });
  assert.deepEqual(sum.walk, { days: 5, mins: "" }, "painted but no length yet: still unanswered");
  assert.deepEqual(sum.mod, { days: 0, mins: 0 }, "an unpainted kind in an answered week is none");
});

test("the steps read lowest first, as every answer in the app does", () => {
  const hours = LEARNING_STEPS.map(s => s.hours);
  assert.deepEqual(hours, [...hours].sort((a, b) => a - b));
  assert.deepEqual([...LENGTHS], [...LENGTHS].sort((a, b) => a - b));
  assert.equal(hours[0], 0, "'none' is an answer");
});

test("an earlier answer that is not a step is offered as its own step, so confirming it changes nothing", () => {
  assert.deepEqual(withCurrent([10, 20, 30], 25), [10, 20, 25, 30]);
  assert.deepEqual(withCurrent([10, 20, 30], 20), [10, 20, 30]);
  assert.deepEqual(withCurrent([10, 20, 30], ""), [10, 20, 30]);

  const learning = learningMarkup("rev-weeklyLearningHours", 2.5);
  assert.match(learning, /value="2\.5" checked/);
  assert.match(learning, /id="rev-weeklyLearningHours" hidden step="any" value="2\.5"/);

  const painted = weekMarkup("rev", IDS, { vig: { days: 3, mins: 37 }, mod: { days: 0, mins: 0 }, walk: { days: 7, mins: 20 } });
  assert.match(painted, /name="x-vig-mins-len" value="37" checked/);
  assert.match(painted, /id="x-vig-days" hidden step="any" data-kind="vig" min="0" max="7" data-required="1" value="3"/);
  assert.match(painted, /id="x-vig-mins" hidden step="any" value="37"/);
  assert.match(painted, /id="x-mod-mins" hidden step="any" value="0"/);
  assert.equal((painted.match(/name="x-walk-days-d\d" value="1" aria-label="[^"]+" checked/g) || []).length, 7);
  assert.equal((painted.match(/name="x-vig-days-d\d" value="1" aria-label="[^"]+" checked/g) || []).length, 3);
});

test("a fresh week and a fresh learning question start with nothing chosen", () => {
  const fresh = weekMarkup("onb", IDS) + learningMarkup("onb-learning");
  assert.doesNotMatch(fresh, /\bchecked\b/);
  assert.doesNotMatch(fresh, /hidden step="any"[^>]*value=/, "no hidden box starts with a value");
});

test("carried-over days go back where they were painted, when they still add up", () => {
  const saved = { vig: [false, true, false, true, false, false, false] };
  assert.deepEqual(daysFor("vig", 2, saved), saved.vig);
  assert.deepEqual(daysFor("vig", 3, saved), [true, true, true, false, false, false, false], "a different count starts from Monday");
  assert.deepEqual(daysFor("mod", 1, null), [true, false, false, false, false, false, false]);
});

test("the journey still writes every old field under its old id", () => {
  const html = allScreens().map(s => s.body || "").join("");
  for (const id of ["onb-vig-days", "onb-vig-mins", "onb-mod-days", "onb-mod-mins", "onb-walk-days", "onb-walk-mins", "onb-learning"]) {
    assert.match(html, new RegExp(`<input type="number" id="${id}" hidden`), `${id} is gone`);
  }
});

// --- v120: donations, volunteering, and the plastic tally -------------------

const more = await import("../views/activity-fields.js");
const { plasticScore, donationVolumeFactor, volunteerFactor } = await import("../scoring.js");

test("the plastic tally is blank until answered, then counts ticks plus a kept answer", () => {
  const items = Array(8).fill(false);
  assert.equal(more.summarizeTally({ items, none: false, carried: 0 }), "");
  assert.equal(more.summarizeTally({ items, none: true, carried: 0 }), 0);
  assert.equal(more.summarizeTally({ items: items.map((_, i) => i < 3), none: false, carried: 0 }), 3);
  assert.equal(more.summarizeTally({ items, none: false, carried: 5 }), 5, "last week's 5 kept whole");
});

test("every plastic band in the scoring has a tally that lands in it", () => {
  const bands = new Set();
  for (let n = 0; n <= more.PLASTIC_ITEMS.length; n++) bands.add(plasticScore({ singleUsePlastics: n }));
  assert.deepEqual([...bands].sort((a, b) => a - b), [0, 25, 50, 80, 100]);
});

test("the giving steps reach both sides of the scoring's maximum", () => {
  const don = more.DONATION_STEPS.map(s => donationVolumeFactor({ monthlyDonations: s.value, income: 0 }));
  assert.equal(don[0], 0);
  assert.ok(don.some(v => v > 0 && v < 100) && don.includes(100));
  const vol = more.VOLUNTEER_STEPS.map(s => volunteerFactor({ volunteeringHours: s.value }));
  assert.equal(vol[0], 0);
  assert.ok(vol.some(v => v > 0 && v < 100) && vol.includes(100));
});

test("the review keeps an off-step earlier answer as its own chosen step", () => {
  const html = more.donationMarkup("rev-monthlyDonations", 300);
  assert.match(html, /value="300" checked/);
  assert.match(html, /id="rev-monthlyDonations" hidden step="any" value="300"/);
  const vol = more.volunteerMarkup("rev-volunteeringHours", 0.5);
  assert.match(vol, /value="0.5" checked/);
});

test("the review's tally keeps last week's count whole when the ticks are unknown", () => {
  globalThis.localStorage?.removeItem?.("lifequest_plastic_items");
  const html = more.tallyMarkup("rev-singleUsePlastics", 4);
  assert.match(html, /name="rev-singleUsePlastics-last" value="4" checked/);
  assert.match(html, /id="rev-singleUsePlastics" hidden step="any" min="0" max="100" data-required="1" value="4"/);
  assert.match(more.tallyMarkup("rev-singleUsePlastics", 0), /name="rev-singleUsePlastics-none" value="1" checked/);
});

test("the journey asks all three with the old ids, so submit and scoring are unchanged", () => {
  const html = allScreens().map(s => s.body ?? s.html ?? "").join("");
  for (const id of ["onb-donations", "onb-volunteer", "onb-plastics"]) {
    assert.match(html, new RegExp(`id="${id}" hidden`), `${id} carries the stored value`);
  }
});

// v158: the review folds a monthly habit to last week's answer. Only with an
// answer to show, and never in the journey, which has none.
test("an everyday question folds only when asked to and there is an answer", async () => {
  const { learningMarkup, donationMarkup, tallyMarkup } = await import("../views/activity-fields.js");
  assert.doesNotMatch(learningMarkup("j"), /data-folded|easy-change/, "the journey never folds");
  assert.doesNotMatch(learningMarkup("r", 3), /data-folded/, "folding is the caller's choice");
  assert.doesNotMatch(donationMarkup("r", null, { fold: true }), /data-folded/, "nothing to show, nothing folded");
  assert.match(learningMarkup("r", 3, { fold: true }), /data-out="r" data-folded/);
  assert.match(tallyMarkup("p", 0, { fold: true }), /data-folded[\s\S]*class="easy-change"/, "none-of-these is an answer too");
});
