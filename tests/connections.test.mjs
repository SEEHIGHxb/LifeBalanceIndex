// tests/connections.test.mjs - the same-origin bridge reader (Phase 1).
//
// Everything here runs against SYNTHETIC payloads. That is the point of
// building the reader first: a payload is just JSON, so the rules can be pinned
// before either exporter exists.
//
// Two classes of test, and they are guarding different risks:
//
//   1. VALIDATION. The bridge keys are writable by any page on this origin, so
//      the reader is treated as a boundary. Every rejection below is a number
//      that would otherwise have reached a score.
//   2. UNITS AND DEFINITIONS. The per-day/per-week mismatch is the defect this
//      data path can most plausibly ship. It gets a named test rather than
//      being implied by a happy path.

import { test } from "node:test";
import assert from "node:assert";

import {
  BRIDGE_VERSION, BRIDGE_KEYS, MIDORI_MAX_AGE_DAYS, CONNECTION_PREFS_KEY,
  parseBridgePayload, payloadFreshness, midoriFields, runawayFields, readConnection,
  readConnectionPrefs, setConnectionPref, connectionStatus
} from "../connections.js";

const NOW = new Date("2026-08-01T09:00:00.000Z");

function midoriPayload(over = {}) {
  return JSON.stringify({
    v: 1,
    source: "midori",
    writtenAt: "2026-08-01T08:00:00.000Z",
    currency: "THB",
    window: { from: "2026-05-01", to: "2026-07-31", months: 3 },
    facts: {
      monthlyIncome: 42000,
      monthlyExpenses: 28500,
      liquidSavings: 310000,
      hasLongTermInvestments: true
    },
    ...over
  });
}

function runawayPayload(over = {}) {
  return JSON.stringify({
    v: 1,
    source: "runaway",
    writtenAt: "2026-08-01T08:00:00.000Z",
    window: { isoWeek: "2026-W31", from: "2026-07-27", to: "2026-08-02" },
    facts: { activeDays: 3, totalMinutes: 102, minutesPerActiveDay: 34, runsWithoutDuration: 1 },
    ...over
  });
}

// A localStorage stand-in. Injecting it is what keeps this suite browser-free.
function fakeStorage(entries = {}) {
  return { getItem: key => (Object.hasOwn(entries, key) ? entries[key] : null) };
}

// --- 1. THE HAPPY PATH ---

test("a well-formed Midori payload parses into dates, not strings", () => {
  const { ok, payload } = parseBridgePayload("midori", midoriPayload());
  assert.equal(ok, true);
  assert.equal(payload.source, "midori");
  assert.ok(payload.writtenAt instanceof Date);
  // The window comes back as Date objects so the UI formats them in its own
  // locale and never renders a string the payload chose.
  assert.ok(payload.window.from instanceof Date);
  assert.ok(payload.window.to instanceof Date);
  assert.equal(payload.window.months, 3);
  assert.equal(payload.facts.monthlyIncome, 42000);
});

test("a well-formed Runaway payload keeps its ISO week", () => {
  const { ok, payload } = parseBridgePayload("runaway", runawayPayload());
  assert.equal(ok, true);
  assert.equal(payload.window.isoWeek, "2026-W31");
  assert.equal(payload.facts.activeDays, 3);
});

// --- 2. THE BOUNDARY ---

test("a payload from the wrong version is refused, not guessed at", () => {
  // The reason a version field exists: a changed shape must fail loudly rather
  // than be misread field-by-field.
  assert.equal(parseBridgePayload("midori", midoriPayload({ v: 2 })).reason, "unsupported-version");
  assert.equal(parseBridgePayload("midori", midoriPayload({ v: "1" })).reason, "unsupported-version");
  assert.equal(BRIDGE_VERSION, 1);
});

test("a payload cannot claim to be from a source it was not read as", () => {
  // Reading the Runaway key must not accept a Midori body, or a page could feed
  // finance facts into the physical mapper.
  assert.equal(parseBridgePayload("runaway", midoriPayload()).reason, "wrong-source");
  assert.equal(parseBridgePayload("midori", runawayPayload()).reason, "wrong-source");
  assert.equal(parseBridgePayload("humanity", midoriPayload()).reason, "wrong-source");
});

test("absent, empty and unparseable input are distinguishable, and none throw", () => {
  assert.equal(parseBridgePayload("midori", null).reason, "absent");
  assert.equal(parseBridgePayload("midori", "   ").reason, "absent");
  assert.equal(parseBridgePayload("midori", "{not json").reason, "unparseable");
  assert.equal(parseBridgePayload("midori", "[]").reason, "malformed");
  assert.equal(parseBridgePayload("midori", '"a string"').reason, "malformed");
});

test("a payload with no window is refused", () => {
  // Without a window a number cannot be dated, and the app could neither report
  // which period it covers nor reject one for the wrong week.
  assert.equal(parseBridgePayload("midori", midoriPayload({ window: undefined })).reason, "bad-window");
  assert.equal(parseBridgePayload("midori", midoriPayload({ window: {} })).reason, "bad-window");
  assert.equal(
    parseBridgePayload("midori", midoriPayload({ window: { from: "2026-05-01", to: "2026-07-31" } })).reason,
    "bad-window",
    "months is required on a Midori window"
  );
  assert.equal(
    parseBridgePayload("midori", midoriPayload({ window: { from: "2026-07-31", to: "2026-05-01", months: 3 } })).reason,
    "bad-window",
    "a window that ends before it starts is not a window"
  );
  assert.equal(
    parseBridgePayload("midori", midoriPayload({ window: { from: "2026-02-31", to: "2026-07-31", months: 3 } })).reason,
    "bad-window",
    "Date would roll 2026-02-31 into March rather than reject it"
  );
});

test("a Runaway window without a valid ISO week is refused", () => {
  const bad = w => parseBridgePayload("runaway", runawayPayload({
    window: { from: "2026-07-27", to: "2026-08-02", isoWeek: w }
  })).reason;
  assert.equal(bad(undefined), "bad-window");
  assert.equal(bad("this week"), "bad-window");
  assert.equal(bad("<img src=x onerror=alert(1)>"), "bad-window");
  // Unpadded, matching isoWeekKey in season.js — a padded key would silently
  // fail to match every stored week from 1 to 9.
  assert.equal(parseBridgePayload("runaway", runawayPayload({
    window: { from: "2026-01-05", to: "2026-01-11", isoWeek: "2026-W2" }
  })).ok, true);
});

test("non-numbers are refused rather than coerced into a confident zero", () => {
  // Number("") and Number(null) are both 0. Coercing here would turn missing
  // data into a reported income of zero, which scores.
  for (const bad of ["42000", "", null, true, [], {}, NaN]) {
    const text = midoriPayload({
      facts: { monthlyIncome: bad, monthlyExpenses: 28500 }
    });
    assert.equal(parseBridgePayload("midori", text).reason, "bad-facts", `income ${JSON.stringify(bad)}`);
  }
});

test("a known fact outside its range is refused", () => {
  const out = facts => parseBridgePayload("midori", midoriPayload({ facts })).reason;
  assert.equal(out({ monthlyIncome: -1, monthlyExpenses: 100 }), "bad-facts");
  assert.equal(out({ monthlyIncome: 1e12, monthlyExpenses: 100 }), "bad-facts");
  assert.equal(
    parseBridgePayload("runaway", runawayPayload({ facts: { activeDays: 9, totalMinutes: 60 } })).reason,
    "bad-facts",
    "a week cannot have nine days"
  );
});

test("a required fact cannot be missing", () => {
  assert.equal(parseBridgePayload("midori", midoriPayload({ facts: { monthlyIncome: 42000 } })).reason, "bad-facts");
  assert.equal(parseBridgePayload("runaway", runawayPayload({ facts: { activeDays: 3 } })).reason, "bad-facts");
});

test("an unknown fact key is ignored, so a newer exporter does not break an older reader", () => {
  const { ok, payload } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 42000, monthlyExpenses: 28500, somethingAddedLater: 7 }
  }));
  assert.equal(ok, true);
  assert.equal(payload.facts.somethingAddedLater, undefined);
});

test("a poisoned prototype resolves to nothing, not to something inherited", () => {
  // Own-property lookup throughout: `{"constructor": …}` must not read back as
  // Object.prototype.constructor.
  const text = JSON.stringify({
    v: 1, source: "midori", writtenAt: "2026-08-01T08:00:00.000Z",
    window: { from: "2026-05-01", to: "2026-07-31", months: 3 },
    facts: JSON.parse('{"__proto__":{"monthlyIncome":999999},"monthlyExpenses":100}')
  });
  assert.equal(parseBridgePayload("midori", text).reason, "bad-facts");
});

test("no attacker-supplied string survives parsing", () => {
  // Rule 4 of the contract: the payload carries no free text, so the reader
  // returns none. What comes back is Dates, numbers, booleans, a pinned ISO
  // week and a three-letter currency code — there is nothing to escape because
  // there is nothing to render.
  const hostile = "<img src=x onerror=alert(1)>";
  const { payload } = parseBridgePayload("midori", midoriPayload({
    currency: hostile,
    note: hostile,
    facts: { monthlyIncome: 42000, monthlyExpenses: 28500, label: hostile }
  }));
  assert.equal(payload.currency, null, "a currency that is not a 3-letter code is dropped");
  const strings = JSON.stringify(payload);
  assert.ok(!strings.includes("onerror"), `hostile string reached the payload: ${strings}`);
});

test("a valid three-letter currency code is kept", () => {
  assert.equal(parseBridgePayload("midori", midoriPayload()).payload.currency, "THB");
});

test("a timestamp that is not a date is refused", () => {
  assert.equal(parseBridgePayload("midori", midoriPayload({ writtenAt: "yesterday" })).reason, "bad-timestamp");
  assert.equal(parseBridgePayload("midori", midoriPayload({ writtenAt: 1754035200000 })).reason, "bad-timestamp");
});

// --- 3. STALENESS ---

test("Runaway data is used only for the week being reviewed", () => {
  const { payload } = parseBridgePayload("runaway", runawayPayload());
  assert.equal(payloadFreshness(payload, { now: NOW, isoWeek: "2026-W31" }).state, "fresh");
  // Last week's runs are not this week's exercise. A run log describes one
  // specific week and cannot stand in for another.
  assert.equal(payloadFreshness(payload, { now: NOW, isoWeek: "2026-W32" }).state, "stale");
  assert.equal(payloadFreshness(payload, { now: NOW, isoWeek: null }).state, "stale");
});

test("Midori data goes stale after the documented window, not on a week boundary", () => {
  const at = days => parseBridgePayload("midori", midoriPayload({
    writtenAt: new Date(NOW.getTime() - days * 86400000).toISOString()
  })).payload;
  assert.equal(payloadFreshness(at(0), { now: NOW }).state, "fresh");
  assert.equal(payloadFreshness(at(MIDORI_MAX_AGE_DAYS), { now: NOW }).state, "fresh");
  assert.equal(payloadFreshness(at(MIDORI_MAX_AGE_DAYS + 1), { now: NOW }).state, "stale");
  assert.equal(payloadFreshness(at(90), { now: NOW }).ageDays, 90);
});

test("a payload written in the future is surfaced, not trusted", () => {
  // Two clocks disagree and there is no way to tell which is wrong. A day of
  // slack absorbs ordinary drift between two apps on one device.
  const ahead = h => parseBridgePayload("midori", midoriPayload({
    writtenAt: new Date(NOW.getTime() + h * 3600000).toISOString()
  })).payload;
  assert.equal(payloadFreshness(ahead(6), { now: NOW }).state, "fresh");
  assert.equal(payloadFreshness(ahead(72), { now: NOW }).state, "future");
});

// --- 4. THE UNIT TRAP ---

test("THE UNIT: vigorous minutes are PER ACTIVE DAY, not per week", () => {
  // The form label reads "Vigorous Minutes per Day". Handing it a weekly total
  // would triple a three-day week's activity score. Same class of defect as the
  // old plastics per-week/per-day mismatch.
  const { payload } = parseBridgePayload("runaway", runawayPayload());
  const fields = runawayFields(payload);
  assert.equal(fields.weeklyVigorousDays, 3);
  assert.equal(fields.weeklyVigorousMins, 34, "102 minutes over 3 days is 34/day, not 102");
});

test("the per-day figure is recomputed here, not taken from the exporter", () => {
  // The unit belongs to the app that defines it. A future exporter that got
  // minutesPerActiveDay wrong must not be able to move a score through it.
  const { payload } = parseBridgePayload("runaway", runawayPayload({
    facts: { activeDays: 3, totalMinutes: 102, minutesPerActiveDay: 999 }
  }));
  assert.equal(runawayFields(payload).weeklyVigorousMins, 34);
});

test("a week with no runs maps to zero without dividing by zero", () => {
  const { payload } = parseBridgePayload("runaway", runawayPayload({
    facts: { activeDays: 0, totalMinutes: 0 }
  }));
  assert.deepEqual(runawayFields(payload), { weeklyVigorousDays: 0, weeklyVigorousMins: 0 });
});

test("the running bridge never touches the moderate or walking fields", () => {
  // Running is vigorous by definition. Someone who also swims or walks keeps
  // their own answer instead of having it clobbered.
  const { payload } = parseBridgePayload("runaway", runawayPayload());
  assert.deepEqual(Object.keys(runawayFields(payload)).sort(), ["weeklyVigorousDays", "weeklyVigorousMins"]);
});

// --- 5. THE FINANCE MAPPING ---

test("savings rate is derived from income minus expenses, not sent", () => {
  // The state stores exactly one savings number, so the rate is computed where
  // its definition lives. 42000 - 28500 = 13500, which is 32.1% of 42000.
  const { payload } = parseBridgePayload("midori", midoriPayload());
  const fields = midoriFields(payload);
  assert.equal(fields.income, 42000);
  assert.equal(fields.savingsRate, 32.1);
  assert.equal(fields.monthlyExpenses, 28500);
});

test("spending more than you earn is a zero rate, never a negative one", () => {
  const { payload } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 20000, monthlyExpenses: 26000 }
  }));
  assert.equal(midoriFields(payload).savingsRate, 0);
});

test("no income yields no rate rather than a fabricated one", () => {
  // The retiree-on-savings case. It is honestly out of the income scale's range
  // and is what the deferred runway measure is for — not a fudged rate.
  const { payload } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 0, monthlyExpenses: 18000, liquidSavings: 900000 }
  }));
  assert.equal(midoriFields(payload).savingsRate, 0);
  assert.equal(midoriFields(payload).income, 0);
});

test("an absent investments flag does not clear one the user set", () => {
  // "Midori did not report" is not "you have no investments". Omitting the key
  // must leave the field alone.
  const { payload } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 42000, monthlyExpenses: 28500 }
  }));
  assert.equal(Object.hasOwn(midoriFields(payload), "longTermInvestments"), false);

  const { payload: off } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 42000, monthlyExpenses: 28500, hasLongTermInvestments: false }
  }));
  assert.equal(midoriFields(off).longTermInvestments, false);
});

test("a non-boolean investments flag is refused rather than made truthy", () => {
  assert.equal(parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 42000, monthlyExpenses: 28500, hasLongTermInvestments: "yes" }
  })).reason, "bad-facts");
});

test("mapped values are clamped to the same ranges the forms enforce", () => {
  // A bridge is not a way around validation. income tops out at 10,000,000 in
  // FIELD_CONSTRAINTS, and the payload range matches, so the clamp is a floor
  // under future drift between the two.
  const { payload } = parseBridgePayload("midori", midoriPayload({
    facts: { monthlyIncome: 10000000, monthlyExpenses: 0 }
  }));
  assert.equal(midoriFields(payload).income, 10000000);
  assert.equal(midoriFields(payload).savingsRate, 100);
});

// --- 6. THE READ PATH ---

test("readConnection maps a fresh payload and refuses a stale one", () => {
  const storage = fakeStorage({
    [BRIDGE_KEYS.midori]: midoriPayload(),
    [BRIDGE_KEYS.runaway]: runawayPayload()
  });

  const midori = readConnection("midori", { storage, now: NOW });
  assert.equal(midori.ok, true);
  assert.equal(midori.freshness.state, "fresh");
  assert.equal(midori.fields.income, 42000);

  const thisWeek = readConnection("runaway", { storage, now: NOW, isoWeek: "2026-W31" });
  assert.equal(thisWeek.fields.weeklyVigorousMins, 34);

  // Valid but for the wrong week: reported, and NOT handed back as usable
  // values. Silently pre-filling a stale number is the exact failure this
  // feature exists to remove.
  const nextWeek = readConnection("runaway", { storage, now: NOW, isoWeek: "2026-W32" });
  assert.equal(nextWeek.ok, true);
  assert.equal(nextWeek.freshness.state, "stale");
  assert.equal(nextWeek.fields, null);
});

test("no payload reads as an honest empty state, not an error", () => {
  // What a user on a different host, or with no exporter installed, sees.
  const empty = readConnection("midori", { storage: fakeStorage(), now: NOW });
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "absent");
  assert.equal(empty.fields, null);
});

test("a blocked or missing localStorage degrades instead of throwing", () => {
  // Private mode and sandboxed frames throw on access. This module is imported
  // by pages that have nothing to do with the bridge.
  const hostile = { getItem() { throw new Error("SecurityError"); } };
  assert.equal(readConnection("midori", { storage: hostile, now: NOW }).reason, "unavailable");
  assert.equal(readConnection("nope", { storage: fakeStorage(), now: NOW }).reason, "wrong-source");
});

test("the bridge keys are namespaced so ownership is obvious", () => {
  assert.equal(BRIDGE_KEYS.midori, "lbi_bridge_midori");
  assert.equal(BRIDGE_KEYS.runaway, "lbi_bridge_runaway");
});

// --- 7. THE PREFERENCE (Phase 2) ---
//
// Whether a source may be read at all. The risk being guarded is a connection
// that is ON while the user believes it is off, so every ambiguous input has to
// resolve to off.

// A writable stand-in, so the preference round-trips without a browser.
function fakeStore(entries = {}) {
  const map = { ...entries };
  return {
    getItem: key => (Object.hasOwn(map, key) ? map[key] : null),
    setItem: (key, value) => { map[key] = String(value); },
    raw: () => map
  };
}

test("both sources are off until they are switched on", () => {
  assert.deepEqual(readConnectionPrefs(fakeStore()), { midori: false, runaway: false });
});

test("a preference round-trips through its own key, outside the app's schema", () => {
  const store = fakeStore();
  assert.deepEqual(setConnectionPref("midori", true, store), { midori: true, runaway: false });
  // Its own key, not the app's save: an erase of game data cannot clear it and
  // adding it needed no schema migration.
  assert.equal(CONNECTION_PREFS_KEY, "lifequest_connections");
  assert.equal(store.raw()[CONNECTION_PREFS_KEY], '{"midori":true,"runaway":false}');
  assert.deepEqual(readConnectionPrefs(store), { midori: true, runaway: false });
});

test("switching one source off leaves the other alone", () => {
  const store = fakeStore();
  setConnectionPref("midori", true, store);
  setConnectionPref("runaway", true, store);
  assert.deepEqual(setConnectionPref("midori", false, store), { midori: false, runaway: true });
});

test("anything short of a literal true reads as off", () => {
  const stored = [
    '{"midori":"yes"}', '{"midori":1}', '{"midori":"true"}',
    "[]", "null", "not json at all", "",
    // JSON.parse gives this an OWN "__proto__" key rather than walking the
    // prototype, but the own-property lookup ignores it either way.
    '{"__proto__":{"midori":true}}'
  ];
  for (const text of stored) {
    const store = fakeStore({ [CONNECTION_PREFS_KEY]: text });
    assert.deepEqual(
      readConnectionPrefs(store), { midori: false, runaway: false },
      `stored: ${text}`
    );
  }
});

test("an unknown source name cannot create a preference", () => {
  const store = fakeStore();
  assert.deepEqual(setConnectionPref("constructor", true, store), { midori: false, runaway: false });
  assert.deepEqual(setConnectionPref("__proto__", true, store), { midori: false, runaway: false });
});

test("storage that throws leaves both off rather than taking the page down", () => {
  const hostile = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("QuotaExceeded"); }
  };
  assert.deepEqual(readConnectionPrefs(hostile), { midori: false, runaway: false });
  // The write is lost, but the caller still gets the state the click implied —
  // the toggle reflects what was clicked, it just will not survive a reload.
  assert.deepEqual(setConnectionPref("midori", true, hostile), { midori: true, runaway: false });
});

// --- 8. THE STATUS CODE ---
//
// One code per situation, so the Profile page holds the wording and this module
// holds the rule.

test("a source that is switched off reports off, whatever is stored", () => {
  const read = readConnection("midori", {
    storage: fakeStorage({ [BRIDGE_KEYS.midori]: midoriPayload() }), now: NOW
  });
  assert.equal(read.ok, true, "a valid payload is present");
  assert.equal(connectionStatus(false, read), "off");
});

test("nothing written yet is 'waiting', not an error", () => {
  const read = readConnection("midori", { storage: fakeStorage(), now: NOW });
  assert.equal(read.reason, "absent");
  assert.equal(connectionStatus(true, read), "waiting");
});

test("blocked storage is 'waiting' too — nobody can act on 'unavailable'", () => {
  const hostile = { getItem() { throw new Error("SecurityError"); } };
  assert.equal(connectionStatus(true, readConnection("midori", { storage: hostile, now: NOW })), "waiting");
});

test("a payload the contract does not cover is 'unreadable', not empty", () => {
  const broken = [
    "{oops",
    JSON.stringify({ v: 99, source: "midori" }),
    midoriPayload({ facts: { monthlyIncome: 42000, monthlyExpenses: -5 } })
  ];
  for (const text of broken) {
    const read = readConnection("midori", {
      storage: fakeStorage({ [BRIDGE_KEYS.midori]: text }), now: NOW
    });
    // "Nothing here" and "the two apps disagree about the contract" are
    // different problems and must not share a message.
    assert.equal(connectionStatus(true, read), "unreadable", text.slice(0, 40));
  }
});

test("fresh, too old, and ahead of the clock are three distinct codes", () => {
  const at = writtenAt => readConnection("midori", {
    storage: fakeStorage({ [BRIDGE_KEYS.midori]: midoriPayload({ writtenAt }) }), now: NOW
  });
  assert.equal(connectionStatus(true, at("2026-08-01T08:00:00.000Z")), "connected");
  // 61 days old, well past MIDORI_MAX_AGE_DAYS.
  assert.equal(connectionStatus(true, at("2026-06-01T08:00:00.000Z")), "stale");
  assert.equal(connectionStatus(true, at("2026-09-01T08:00:00.000Z")), "future");
});

test("last week's run log is stale even when it was written minutes ago", () => {
  const storage = fakeStorage({ [BRIDGE_KEYS.runaway]: runawayPayload() });
  const week = isoWeek => connectionStatus(true, readConnection("runaway", { storage, now: NOW, isoWeek }));
  assert.equal(week("2026-W31"), "connected");
  // Same payload, same age — a run log describes one specific week and cannot
  // stand in for another.
  assert.equal(week("2026-W32"), "stale");
});
