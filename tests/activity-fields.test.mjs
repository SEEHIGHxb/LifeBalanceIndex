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
