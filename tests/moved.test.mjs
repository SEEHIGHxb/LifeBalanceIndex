// moved.js: bringing a reader's answers from lbi.plainpoint.net to
// asterism.plainpoint.net (v132). The frame and the message are browser work;
// what may be written, and when, is decided here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handoffEntries, writeEntries, shouldBringAnswers, NEW_HOST, MOVED_KEY } from "../moved.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map
  };
}

const message = items => ({ type: "asterism-handoff", v: 1, items });

test("only a first visit to the new address brings answers", () => {
  assert.equal(shouldBringAnswers(NEW_HOST, memoryStorage()), true);
  assert.equal(shouldBringAnswers("lbi.plainpoint.net", memoryStorage()), false);
  assert.equal(shouldBringAnswers("127.0.0.1", memoryStorage()), false);
  assert.equal(shouldBringAnswers(NEW_HOST, memoryStorage({ lifequest_state: "{}" })), false);
  assert.equal(shouldBringAnswers(NEW_HOST, memoryStorage({ [MOVED_KEY]: "2026-09-28T05:00:00.000Z" })), false);
});

test("a handoff keeps only the app's own string keys", () => {
  const entries = handoffEntries(message({
    lifequest_state: "{}",
    lifequest_lang: "th",
    lbi_reduce_motion: "1",
    lbi_bridge_midori: "{}",
    other_site: "x",
    lifequest_levelup: 3,
    [MOVED_KEY]: "old"
  }));
  assert.deepEqual(entries, [["lifequest_state", "{}"], ["lifequest_lang", "th"], ["lbi_reduce_motion", "1"]]);
});

test("anything that is not a handoff message is ignored", () => {
  assert.equal(handoffEntries(null), null);
  assert.equal(handoffEntries("hello"), null);
  assert.equal(handoffEntries({ type: "asterism-handoff", v: 2, items: {} }), null);
  assert.equal(handoffEntries({ type: "other", v: 1, items: {} }), null);
  assert.equal(handoffEntries(message([["lifequest_state", "{}"]])), null);
  assert.equal(handoffEntries(message({ lifequest_state: "x".repeat(5_000_001) })), null);
});

test("answers are written to an empty browser and the page reloads", () => {
  const storage = memoryStorage({ lifequest_lang: "en" });
  const reload = writeEntries([["lifequest_state", "{\"a\":1}"], ["lifequest_lang", "th"]], storage);
  assert.equal(reload, true);
  assert.equal(storage.getItem("lifequest_state"), "{\"a\":1}");
  // A key the reader already set here is theirs.
  assert.equal(storage.getItem("lifequest_lang"), "en");
  assert.ok(storage.getItem(MOVED_KEY));
});

test("a reader who already began here keeps what they began", () => {
  const storage = memoryStorage({ lifequest_state: "{\"new\":1}" });
  assert.equal(writeEntries([["lifequest_state", "{\"old\":1}"]], storage), false);
  assert.equal(storage.getItem("lifequest_state"), "{\"new\":1}");
  assert.ok(storage.getItem(MOVED_KEY));
});

test("an empty old address is remembered, with nothing to reload", () => {
  const storage = memoryStorage();
  assert.equal(writeEntries([], storage), false);
  assert.ok(storage.getItem(MOVED_KEY));
});
