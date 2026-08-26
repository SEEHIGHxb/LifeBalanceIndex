// tests/draft.test.mjs - the form-draft store added in v75.
//
// WHY A FAKE FORM RATHER THAN dom-stub.mjs. draft.js touches a form through
// exactly two methods, `querySelectorAll("input, select, textarea")` and
// `querySelector(selector)`. The shared stub's querySelector returns null for
// everything, because the views it was built for never read their own markup
// back. Rather than teach that stub a selector engine, this file builds a
// controls list and answers the two selectors draft.js actually issues. If
// draft.js ever needs a third, this fake stops being adequate and should be
// replaced rather than extended -- that is the signal to reach for a real DOM.
//
// THE FAILURE THE MODULE EXISTS TO FIX: onboarding is 64 radio groups over six
// steps. A reload used to take all of it.
//
// THE FAILURE THE MODULE COULD CAUSE, which several tests here pin: a restore
// puts answers on screen without firing input or change events. Onboarding
// tracks which instruments were answered by listening for exactly those events,
// so a restore that did not report what it restored would leave a fully
// answered assessment recorded as unanswered, and the aspect pages would label
// real answers "estimated".

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { APP_VERSION } from "../version.js";
import {
  serializeForm, saveDraft, readDraft, clearDraft, applyDraft, instrumentsIn
} from "../draft.js";

const KEY = "lifequest_draft_onboarding";

function installStorage({ failWrites = false } = {}) {
  const store = {};
  globalThis.localStorage = {
    store,
    getItem(k) { return Object.hasOwn(store, k) ? store[k] : null; },
    setItem(k, v) {
      if (failWrites) throw new Error("QuotaExceededError");
      store[k] = String(v);
    },
    removeItem(k) { delete store[k]; }
  };
  return store;
}

// A control the fake form can hold. Radios carry name+value+checked; numeric
// and select controls carry id+value, exactly as the real markup does.
const radio = (name, value, checked = false) => ({ type: "radio", name, value, checked });
const field = (id, value = "") => ({ type: "text", id, value });

function makeForm(controls) {
  return {
    controls,
    querySelectorAll() { return controls; },
    querySelector(sel) {
      // Two shapes only, matching what draft.js issues.
      const named = sel.match(/^\[name="(.+)"\]\[value="(.+)"\]$/);
      if (named) {
        return controls.find(c => c.name === named[1] && c.value === named[2]) || null;
      }
      const byId = sel.match(/^#(.+)$/);
      if (byId) return controls.find(c => c.id === byId[1]) || null;
      throw new Error(`the fake form was asked for an unsupported selector: ${sel}`);
    }
  };
}

beforeEach(() => installStorage());

// --- serialization -------------------------------------------------------

test("only checked radios are recorded, because that is how the form is read back", () => {
  // collectInstrument reads `[name="who5-q0"]:checked`. If the draft recorded
  // unchecked radios too, the last option of every group would win on restore
  // and the user would find answers they never gave.
  const form = makeForm([
    radio("who5-q0", "0"), radio("who5-q0", "3", true), radio("who5-q0", "5"),
    radio("st5-q0", "1")
  ]);
  const { named } = serializeForm(form);
  assert.deepEqual(named, { "who5-q0": "3" });
  assert.equal(Object.hasOwn(named, "st5-q0"), false, "an untouched group was recorded");
});

test("empty fields are skipped so a blank form is not mistaken for a draft", () => {
  const form = makeForm([field("onb-name", ""), field("onb-income", "30000")]);
  assert.deepEqual(serializeForm(form).ids, { "onb-income": "30000" });
});

// --- writing -------------------------------------------------------------

test("a form with nothing answered writes no draft at all", () => {
  // Otherwise the resume notice would appear over an untouched form, which
  // reads as a bug to the user and offers them nothing.
  const store = installStorage();
  assert.equal(saveDraft("onboarding", makeForm([radio("who5-q0", "3")])), false);
  assert.equal(Object.hasOwn(store, KEY), false);
});

test("a blocked storage quota does not throw, so the form stays usable", () => {
  installStorage({ failWrites: true });
  const form = makeForm([radio("who5-q0", "3", true)]);
  assert.equal(saveDraft("onboarding", form), false, "a failed write reported success");
});

test("extra data rides along, so onboarding can restore the step too", () => {
  const form = makeForm([radio("who5-q0", "3", true)]);
  saveDraft("onboarding", form, { step: 4 });
  assert.equal(readDraft("onboarding").step, 4);
});

// --- the discard rules ---------------------------------------------------

test("a draft written by a different app version is discarded, not repaired", () => {
  // THE CONCRETE CASE: v73 added the CIT Learning block to onboarding. A v72
  // draft restored into the v73 form would fill every block except that one,
  // and the user would be looking at a form that appears complete and is not.
  // Silently. Discarding costs them a retake; restoring costs them a wrong
  // Personal Goals score they cannot see the cause of.
  const store = installStorage();
  store[KEY] = JSON.stringify({
    v: "an older version", at: new Date().toISOString(),
    named: { "who5-q0": "3" }, ids: {}
  });
  assert.equal(readDraft("onboarding"), null);
});

test("a draft older than a week is discarded", () => {
  const store = installStorage();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  store[KEY] = JSON.stringify({ v: APP_VERSION, at: eightDaysAgo, named: { "who5-q0": "3" }, ids: {} });
  assert.equal(readDraft("onboarding"), null, "a week-old half-answered mood scale was offered");

  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  store[KEY] = JSON.stringify({ v: APP_VERSION, at: sixDaysAgo, named: { "who5-q0": "3" }, ids: {} });
  assert.ok(readDraft("onboarding"), "a six-day-old draft was wrongly discarded");
});

test("corrupt or truncated storage is discarded rather than thrown", () => {
  const store = installStorage();
  for (const junk of ["{not json", "null", "[]", `{"v":"${APP_VERSION}"}`]) {
    store[KEY] = junk;
    assert.equal(readDraft("onboarding"), null, `survived: ${junk}`);
  }
});

test("clearDraft removes it", () => {
  const store = installStorage();
  saveDraft("onboarding", makeForm([radio("who5-q0", "3", true)]));
  assert.ok(store[KEY]);
  clearDraft("onboarding");
  assert.equal(Object.hasOwn(store, KEY), false);
});

// --- restoring -----------------------------------------------------------

test("a round trip puts every answer back on the right control", () => {
  const saved = makeForm([
    radio("who5-q0", "0"), radio("who5-q0", "3", true),
    radio("st5-q1", "2", true),
    field("onb-income", "30000")
  ]);
  saveDraft("onboarding", saved, { step: 2 });

  const fresh = makeForm([
    radio("who5-q0", "0"), radio("who5-q0", "3"),
    radio("st5-q1", "2"),
    field("onb-income", "")
  ]);
  const result = applyDraft("onboarding", fresh);

  assert.ok(result, "nothing was restored");
  assert.equal(fresh.controls.find(c => c.name === "who5-q0" && c.value === "3").checked, true);
  assert.equal(fresh.controls.find(c => c.name === "who5-q0" && c.value === "0").checked, false);
  assert.equal(fresh.controls.find(c => c.id === "onb-income").value, "30000");
  assert.equal(result.step, 2);
});

test("applyDraft reports what it restored, which is what keeps coverage honest", () => {
  // THE BUG THIS PREVENTS. Setting .checked from script fires no change event,
  // so onboarding's `touchedInstruments` listener never runs. It seeds that set
  // from these return values instead. If applyDraft stopped reporting, a fully
  // restored assessment would be recorded as never answered and every aspect
  // page would show "estimated" confidence over real answers.
  const saved = makeForm([
    radio("who5-q0", "3", true), radio("citlearn-q2", "4", true), field("onb-income", "30000")
  ]);
  saveDraft("onboarding", saved);

  const fresh = makeForm([
    radio("who5-q0", "3"), radio("citlearn-q2", "4"), field("onb-income", "")
  ]);
  const { restoredNames, restoredIds } = applyDraft("onboarding", fresh);

  assert.deepEqual([...restoredNames].sort(), ["citlearn-q2", "who5-q0"]);
  assert.deepEqual([...restoredIds], ["onb-income"]);
  assert.deepEqual([...instrumentsIn(restoredNames)].sort(), ["citlearn", "who5"]);
});

test("a control the form no longer shows is skipped instead of throwing", () => {
  // The live case is the RAS block: it is hidden for a single user, so a draft
  // saved while "Coupled" was selected names controls that are not in the form
  // once the answer changes back.
  const saved = makeForm([radio("who5-q0", "3", true), radio("ras-q0", "4", true)]);
  saveDraft("onboarding", saved);

  const fresh = makeForm([radio("who5-q0", "3")]);
  const { restoredNames } = applyDraft("onboarding", fresh);
  assert.deepEqual([...restoredNames], ["who5-q0"]);
});

test("a draft matching nothing in the form restores nothing rather than an empty notice", () => {
  const saved = makeForm([radio("gone-q0", "3", true)]);
  saveDraft("onboarding", saved);
  assert.equal(applyDraft("onboarding", makeForm([radio("who5-q0", "3")])), null);
});

test("drafts are namespaced, so the check-in cannot overwrite onboarding", () => {
  // The deep assessment keys one draft per aspect for the same reason:
  // submitting Mental must not discard a half-finished Finance section.
  saveDraft("onboarding", makeForm([radio("who5-q0", "3", true)]));
  saveDraft("checkin", makeForm([radio("who5-q0", "1", true)]));

  assert.equal(readDraft("onboarding").named["who5-q0"], "3");
  assert.equal(readDraft("checkin").named["who5-q0"], "1");
});

test("instrumentsIn ignores names that are not instrument answers", () => {
  assert.deepEqual([...instrumentsIn(new Set(["who5-q0", "onb-name", "st5-q10"]))].sort(), ["st5", "who5"]);
});

// --- no storage at all ---------------------------------------------------

test("everything is inert when localStorage is unavailable", () => {
  // Private-mode and locked-down contexts. The form must still work.
  delete globalThis.localStorage;
  const form = makeForm([radio("who5-q0", "3", true)]);
  assert.equal(saveDraft("onboarding", form), false);
  assert.equal(readDraft("onboarding"), null);
  assert.equal(applyDraft("onboarding", form), null);
  assert.doesNotThrow(() => clearDraft("onboarding"));
});
