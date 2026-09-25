// Fixes from the R1-R6 review: field errors wired to their fields, the
// language button's spoken name, heading order, and leftovers removed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { installDom } from "./dom-stub.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");

installDom();
const { markField } = await import("../views/instrument-forms.js");

// Just enough of an element for markField.
function fakeEl(id, attrs = {}) {
  const a = { ...attrs };
  const classes = new Set(["d-none"]);
  return {
    id, textContent: "",
    getAttribute: (k) => (k in a ? a[k] : null),
    setAttribute: (k, v) => { a[k] = String(v); },
    removeAttribute: (k) => { delete a[k]; },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    attrs: a, classes
  };
}

test("a field error is read with its field, and cleared without losing the caption", () => {
  const ctrl = fakeEl("rev-income", { "aria-describedby": "rev-income-note" });
  const err = fakeEl("rev-income-err");
  markField(ctrl, err, "Enter a value between 0 and 10.");
  assert.equal(ctrl.attrs["aria-invalid"], "true");
  assert.equal(ctrl.attrs["aria-describedby"], "rev-income-note rev-income-err");
  assert.equal(err.textContent, "Enter a value between 0 and 10.");
  assert.ok(!err.classes.has("d-none"));

  markField(ctrl, err, "");
  assert.ok(!("aria-invalid" in ctrl.attrs));
  assert.equal(ctrl.attrs["aria-describedby"], "rev-income-note");
  assert.ok(err.classes.has("d-none"));

  const bare = fakeEl("pf-age");
  markField(bare, fakeEl("pf-age-err"), "x");
  markField(bare, fakeEl("pf-age-err"), "");
  assert.ok(!("aria-describedby" in bare.attrs), "no empty describedby left behind");
});

test("Weekly Review, Profile and Quests wire their errors to the field", () => {
  assert.match(read("views/review.js"), /markField\(input, span, message\)/);
  assert.match(read("views/profile.js"), /markField\(document\.getElementById\(id\), errEl, message\)/);
  assert.match(read("views/quests.js"), /setAttribute\("aria-describedby", err\.id\)/);
});

test("the friend-code error is shown before it is written, so it is announced", () => {
  const src = read("views/leaderboard.js");
  assert.ok(src.indexOf('errorEl.classList.remove("d-none");') < src.indexOf("errorEl.textContent = err.message;"));
});

test("the language button's spoken name contains the word it shows", () => {
  const button = read("index.html").match(/<button id="btn-lang"[^>]*>.*?<\/button>/)[0];
  assert.doesNotMatch(button, /aria-label/);
  assert.match(button, /<span class="sr-only">Switch language: <\/span><span lang="th">ไทย<\/span>/);
  assert.match(read("app.js"), /<span lang="en">EN<\/span>/);
});

test("journey screens and menu groups are headings in order", () => {
  assert.doesNotMatch(read("views/onboarding.js"), /<h3 class="(q-title|ending-region)"/);
  assert.doesNotMatch(read("views/menu.js"), /<p class="menu-top">/);
  assert.equal((read("views/menu.js").match(/<h2 class="menu-top">/g) || []).length, 2);
});

test("the old header rule and the radar leftovers are gone", () => {
  const css = read("index.css");
  assert.doesNotMatch(css, /^header \{/m);
  assert.doesNotMatch(css, /Radar chart \+ legend/);
  assert.doesNotMatch(read("README.md"), /Radar chart|radar chart renderer/i);
});
