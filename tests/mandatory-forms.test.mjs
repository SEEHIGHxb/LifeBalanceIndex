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

// --- Requiredness reaches assistive tech (WCAG 3.3.2) ---
//
// The "*" is aria-hidden and data-required is inert to a screen reader, so
// aria-required is the ONLY thing that tells a non-sighted user which fields
// block Next. These assert it exists wherever the visual marker does, and —
// just as importantly — nowhere it doesn't, so the Profile and Weekly Review
// edit screens keep announcing their pre-filled inputs as optional.

test("numberField pairs aria-required with the visual marker, and only then", () => {
  const optional = numberField("x", "Age", 25, 'min="0"');
  assert.doesNotMatch(optional, /aria-required/, "optional fields stay optional");

  const required = numberField("x", "Age", "", "", { required: true });
  assert.match(required, /aria-required="true"/, "required fields announce it");
});

test("instrument questions are a radiogroup, named by their legend, and required", () => {
  const html = instrumentBlock("who5");
  const groups = (html.match(/role="radiogroup"/g) || []).length;
  const questions = (html.match(/class="survey-question"/g) || []).length;
  assert.equal(groups, questions, "every question is an explicit radiogroup");
  // aria-required is not valid on the bare `group` role a <fieldset> maps to,
  // so the role and the attribute have to travel together.
  assert.equal((html.match(/aria-required="true"/g) || []).length, questions);
  // Overriding the role can cost the legend-derived name; the explicit link
  // must therefore point at a legend id that actually exists.
  const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(m => m[1]);
  assert.equal(labelled.length, questions, "each group names itself");
  for (const id of labelled) {
    assert.ok(html.includes(`<legend id="${id}">`), `${id} resolves to a legend`);
  }
});

test("every instrument error slot is addressable, so validateScope can describe it", () => {
  // clearScopeErrors strips describedby tokens by the "-err" suffix, and
  // setError can only wire an error span that has an id at all.
  const html = instrumentBlock("who5");
  const questions = (html.match(/class="survey-question"/g) || []).length;
  const errIds = (html.match(/class="field-error d-none" id="[^"]+-err"/g) || []).length;
  assert.equal(errIds, questions, "one identified error slot per question");
});
