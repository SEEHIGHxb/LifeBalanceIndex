// The header's language button, pressed mid-questionnaire (node --test).
//
// The owner's report: switching language during the journey left the questions
// in the old language. The journey's content (views/journey.js) was built once
// at import, so every re-render drew the same already-translated strings. And a
// re-render rebuilds forms from saved state, so what was typed but not yet saved
// had to be carried across too (views/lang-carry.js).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setLang, onLangChange, t } from "../i18n.js";
import { TH } from "../th.js";
import { INSTRUMENTS } from "../surveys.js";
import * as journey from "../views/journey.js";
import {
  captureScreen, restoreScreen, withCarriedScreen, carriedStep, isCarrying
} from "../views/lang-carry.js";

globalThis.localStorage = {
  store: {},
  getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

beforeEach(() => setLang("en"));

test("onLangChange fires on a real change only, and can be unsubscribed", () => {
  const heard = [];
  const off = onLangChange(lang => heard.push(lang));
  setLang("en"); // already English: nothing changed
  setLang("th");
  setLang("th");
  setLang("xx"); // unsupported: refused, nothing changed
  off();
  setLang("en");
  assert.deepEqual(heard, ["th"]);
});

test("the journey's questions follow a language switch made after import", () => {
  const firstItem = INSTRUMENTS.cfpb.items[0].text;
  assert.ok(TH[firstItem], "fixture: the first CFPB item has a Thai entry");
  const cfpbBody = () => journey.allScreens().find(s => s.instrument === "cfpb").body;

  assert.ok(cfpbBody().includes(firstItem));
  const englishFact = journey.CHAPTERS[0].fact.text;
  assert.ok(TH[englishFact], "fixture: the first chapter fact has a Thai entry");
  setLang("th");
  assert.ok(cfpbBody().includes(TH[firstItem]), "the question stayed in English after switching to Thai");
  assert.ok(!cfpbBody().includes(firstItem));
  assert.equal(journey.CHAPTERS[0].region, t("The Market"));
  assert.equal(journey.PROLOGUE.title, TH["Before you set out"]);
  assert.equal(journey.CHAPTERS[0].fact.text, TH[englishFact], "the chapter fact stayed in English");

  setLang("en");
  assert.ok(cfpbBody().includes(firstItem), "the question stayed in Thai after switching back");
  assert.equal(journey.CHAPTERS[0].region, "The Market");
});

// Inert stand-ins for form controls: enough for the carry, which reads and
// writes value/checked and fires events, and nothing more.
function control(props) {
  const el = { type: "text", id: "", name: "", value: "", checked: false, events: [], ...props };
  el.dispatchEvent = (e) => el.events.push(e.type);
  return el;
}
function root(controls, forms = []) {
  return {
    querySelectorAll(sel) { return sel === "form[id]" ? forms : controls; }
  };
}

test("a restore writes back only what the fresh render shows differently, as typing would", () => {
  const before = root([
    control({ id: "rev-water", value: "2.5" }),
    control({ id: "rev-sleep", value: "7" }),
    control({ type: "radio", name: "who5-q0", value: "1", checked: false }),
    control({ type: "radio", name: "who5-q0", value: "3", checked: true }),
    control({ type: "checkbox", id: "conn-x", checked: true }),
    control({ type: "file", id: "import-file-input", value: "C:\\fakepath\\a.json" })
  ], [{ id: "weekly-review-form", dataset: { step: "3" } }]);
  const snapshot = captureScreen(before);
  assert.equal(snapshot.steps["weekly-review-form"], 3);

  const water = control({ id: "rev-water", value: "2" });
  const sleep = control({ id: "rev-sleep", value: "7" });
  const q1 = control({ type: "radio", name: "who5-q0", value: "1", checked: false });
  const q3 = control({ type: "radio", name: "who5-q0", value: "3", checked: false });
  const box = control({ type: "checkbox", id: "conn-x", checked: true });
  const file = control({ type: "file", id: "import-file-input", value: "" });
  const restored = restoreScreen(root([water, sleep, q1, q3, box, file]), snapshot);

  assert.equal(restored, 2);
  assert.equal(water.value, "2.5");
  assert.deepEqual(water.events, ["input", "change"]);
  assert.equal(q3.checked, true);
  assert.deepEqual(q3.events, ["input", "change"]);
  // Unchanged controls stay untouched: no event, so no listener runs for nothing.
  assert.deepEqual(sleep.events, []);
  assert.deepEqual(box.events, []);
  assert.equal(file.value, "", "a file input is never written to");
});

test("the carried step is readable during the re-render, and only then", () => {
  const form = { id: "onboarding-form", dataset: { step: "7" } };
  const typed = control({ id: "onb-name", value: "Ploy" });
  const main = root([typed], [form]);
  const seen = [];
  const restored = withCarriedScreen(main, () => {
    seen.push(isCarrying(), carriedStep("onboarding-form"), carriedStep("weekly-review-form"));
    typed.value = ""; // the re-render drew a blank box
  });
  assert.deepEqual(seen, [true, 7, null]);
  assert.equal(restored, 1);
  assert.equal(typed.value, "Ploy");
  assert.equal(isCarrying(), false);
  assert.equal(carriedStep("onboarding-form"), null);
});

test("a re-render that throws still ends the carry", () => {
  assert.throws(() => withCarriedScreen(root([]), () => { throw new Error("boom"); }), /boom/);
  assert.equal(isCarrying(), false);
});

test("capture and restore tolerate a missing root", () => {
  const snapshot = captureScreen(null);
  assert.equal(snapshot.controls.size, 0);
  assert.equal(restoreScreen(null, snapshot), 0);
});
