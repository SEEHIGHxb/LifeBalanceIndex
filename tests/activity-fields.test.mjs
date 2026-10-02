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

test("the plastic tally is blank until answered, then adds the counts and a kept answer", () => {
  const counts = Array(more.PLASTIC_ITEMS.length).fill(0);
  assert.equal(more.summarizeTally({ counts, none: false, carried: 0 }), "");
  assert.equal(more.summarizeTally({ counts, none: true, carried: 0 }), 0);
  assert.equal(more.summarizeTally({ counts: counts.map((_, i) => i < 3 ? 1 : 0), none: false, carried: 0 }), 3);
  assert.equal(more.summarizeTally({ counts, none: false, carried: 5 }), 5, "last week's 5 kept whole");
});

// v175, the owner: five cups a day are five pieces, not one, and a thing the
// list misses still counts.
test("each thing is counted, and 'Something else' takes what the list misses", () => {
  assert.equal(more.PLASTIC_ITEMS.at(-1), "Something else");
  const counts = Array(more.PLASTIC_ITEMS.length).fill(0);
  counts[3] = 5;
  counts[more.PLASTIC_ITEMS.length - 1] = 2;
  assert.equal(more.summarizeTally({ counts, none: false, carried: 0 }), 7);
  assert.equal(more.summarizeTally({ counts: counts.map(() => 99), none: false, carried: 0 }), 100, "held to the field's maximum");
  assert.equal(more.clampCount("12"), 12);
  assert.equal(more.clampCount(""), 0);
  assert.equal(more.clampCount("-3"), 0);
  assert.equal(more.clampCount(500), 99);
});

test("the tally offers -, a box to type in, and + for every thing, and 'None'", () => {
  const html = more.tallyMarkup("onb-plastics");
  assert.equal((html.match(/class="tally-less"/g) || []).length, more.PLASTIC_ITEMS.length);
  assert.equal((html.match(/class="tally-more"/g) || []).length, more.PLASTIC_ITEMS.length);
  assert.match(html, /<input type="text" id="onb-plastics-i3" inputmode="numeric" maxlength="2"/);
  assert.match(html, /<label class="tally-name" for="onb-plastics-i3">/);
  assert.match(html, /name="onb-plastics-none" value="1">\s*None\s*<\/label>/);
  assert.doesNotMatch(html, /type="checkbox" name="onb-plastics-i/, "no ticks left");
});

test("last week's counts come back when they add up to its total, old ticks too", () => {
  if (!globalThis.localStorage) return;
  globalThis.localStorage.setItem("lifequest_plastic_items", JSON.stringify([0, 0, 0, 5, 0, 0, 0, 0, 2]));
  assert.match(more.tallyMarkup("r", 7), /id="r-i3"[^>]*value="5"/);
  // Until v175: eight ticks, each one piece.
  globalThis.localStorage.setItem("lifequest_plastic_items", JSON.stringify([true, false, true, false, false, false, false, false]));
  const old = more.tallyMarkup("r", 2);
  assert.match(old, /id="r-i0"[^>]*value="1"/);
  assert.doesNotMatch(old, /name="r-last"/);
  globalThis.localStorage.removeItem("lifequest_plastic_items");
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
