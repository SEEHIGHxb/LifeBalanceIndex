// Tests for the blank-first form builders in views/instrument-forms.js.
// These are pure string builders (no DOM), so they assert directly on markup:
// required fields render blank with a "*" and data-required; instrument radios
// are never pre-checked. i18n falls back to English keys in Node, so no DOM or
// localStorage mock is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { numberField, instrumentBlock } from "../views/instrument-forms.js";

test("numberField without opts stays pre-filled and optional (Profile/Review path)", () => {
  const html = numberField("x", "Age", 25, 'min="0"');
  assert.match(html, /value="25"/, "keeps the supplied value");
  assert.doesNotMatch(html, /data-required/, "no required flag");
  assert.doesNotMatch(html, /class="req"/, "no asterisk marker");
});

test("numberField with required renders blank, a * marker, and data-required", () => {
  const html = numberField("x", "Age", "", 'min="15" max="100"', {
    required: true, field: "age", placeholder: "15–100"
  });
  assert.match(html, /value=""/, "starts blank");
  assert.match(html, /data-required="1"/, "marked required for validateScope");
  assert.match(html, /class="req"/, "shows the * marker");
  assert.match(html, /placeholder="15–100"/, "carries the hint");
  assert.match(html, /data-field="age"/, "ties back to a validation key");
});

test("instrument questions render blank (nothing pre-checked) and required", () => {
  const html = instrumentBlock("who5");
  assert.doesNotMatch(html, /checked/, "no radio may be pre-selected");
  assert.match(html, /data-required="1"/, "each question is required");
  assert.match(html, /class="req"/, "each question shows a * marker");
});

test("every instrument question gets its own inline error slot", () => {
  const html = instrumentBlock("who5");
  const questions = (html.match(/class="survey-question"/g) || []).length;
  const errorSlots = (html.match(/class="field-error/g) || []).length;
  assert.ok(questions > 0, "who5 has questions");
  assert.equal(errorSlots, questions, "one error slot per question");
});
