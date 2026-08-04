// connections.js - reading facts exported by the sibling apps on this origin.
//
// Midori (the ledger) and Runaway (the run tracker) are hosted on the SAME
// origin as this app, so they can hand data over through localStorage without
// this app making a single network request. That is the whole design: LBI keeps
// `default-src 'self'`, keeps no account, and tests/smoke.mjs keeps proving no
// off-origin request exists. A source app writes; LBI only ever reads.
//
// This module is pure by intent — it reads a string, and everything else is
// arithmetic. No DOM, no network, and the only thing it writes is the single
// preference key at the bottom of the file, which records whether a source may
// be read at all. Every rule here is testable without a browser.
//
// The payload is UNTRUSTED. Any page on the origin can write these keys, so
// nothing is taken on faith: shape, version, source name, timestamp, and every
// number are checked before a value can reach a score. Two consequences worth
// stating outright:
//
//   1. No string from a payload is ever returned for rendering. Failures come
//      back as fixed reason CODES that the UI looks up in its own dictionary,
//      and dates come back as Date objects the UI formats itself. The XSS
//      surface is not escaped, it does not exist. (`window.isoWeek` is the one
//      string that survives, and only after matching /^\d{4}-W\d{1,2}$/.)
//   2. A payload carries FACTS, never scores. Scoring rules live in this repo
//      and get recalibrated — v46 moved every finance score — so a source app
//      shipping a score would freeze an old calibration into another codebase
//      and the two would drift apart with nothing to notice it.

import { FIELD_CONSTRAINTS } from "./validation.js";
import { savingsRateFrom, savingsAmountFrom } from "./scoring.js";

export const BRIDGE_VERSION = 1;

export const BRIDGE_KEYS = {
  midori: "lbi_bridge_midori",
  runaway: "lbi_bridge_runaway"
};

export const CONNECTION_SOURCES = ["midori", "runaway"];

// The app names, as this app writes them. Proper nouns, so they are identical in
// every language and deliberately absent from th.js. They live here rather than
// in a view because two views name them now — the Profile page and the weekly
// review — and a second copy is how the same app ends up called two things.
// Note this is NOT a string from a payload: rule 4 of the handoff is that no
// payload string is ever rendered, and naming the source from our own dictionary
// is exactly how that rule is kept.
export const SOURCE_NAMES = { midori: "Midori", runaway: "Runaway" };

// Midori reports a rolling multi-month window, so it does not expire weekly the
// way a run log does. Beyond this it is surfaced as stale rather than silently
// used — scoring last quarter's salary as this week's is exactly the
// "out-of-date" failure this feature exists to remove.
export const MIDORI_MAX_AGE_DAYS = 35;

const DAY_MS = 86400000;

// Unpadded week numbers, matching isoWeekKey in season.js ("2026-W3", not
// "2026-W03"). Padding here would silently fail to match every stored key.
const ISO_WEEK_RE = /^\d{4}-W\d{1,2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// What each source is allowed to send, and the range each number must fall in.
// An unknown fact key is ignored rather than rejected, so a newer exporter that
// adds a field does not break an older reader; a KNOWN key that is out of range
// is a hard failure, because that is a number that would have reached a score.
const FACT_SPECS = {
  midori: {
    numbers: {
      monthlyIncome: { min: 0, max: 10000000 },
      monthlyExpenses: { min: 0, max: 10000000 },
      // Not consumed yet. It is the numerator of the runway measure held back
      // to v48 pending published anchors; validated now so the contract is
      // fixed before anything depends on it.
      liquidSavings: { min: -1000000000, max: 1000000000 }
    },
    booleans: ["hasLongTermInvestments"],
    required: ["monthlyIncome", "monthlyExpenses"]
  },
  runaway: {
    numbers: {
      activeDays: { min: 0, max: 7 },
      totalMinutes: { min: 0, max: 10080 },
      // Sent for reference only — LBI recomputes it. See runawayFields.
      minutesPerActiveDay: { min: 0, max: 1440 },
      runsWithoutDuration: { min: 0, max: 1000 }
    },
    booleans: [],
    required: ["activeDays", "totalMinutes"]
  }
};

function fail(reason) {
  return { ok: false, reason, payload: null };
}

// Own-property lookup only: a payload whose facts object is `{"constructor": …}`
// or that arrives with a poisoned prototype must not resolve to something
// inherited.
function own(obj, key) {
  return obj && Object.hasOwn(obj, key) ? obj[key] : undefined;
}

// Injected first, the browser's own store otherwise, null when there is none.
// Keeping this in one place means the reader and the preference cannot disagree
// about where they are looking.
function resolveStorage(storage) {
  if (storage) return storage;
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Strictly a real number. `Number("")` is 0 and `Number(null)` is 0, both of
// which would turn absent data into a confident zero, so no coercion happens
// here — the value must already be a finite number.
function finiteNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// An ISO calendar date at local midnight. Parsed rather than passed through, so
// what leaves this module is a Date the UI formats in its own locale.
function parseIsoDate(v) {
  if (typeof v !== "string" || !ISO_DATE_RE.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects 2026-02-31, which Date would roll forward to March without complaint.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function parseTimestamp(v) {
  if (typeof v !== "string") return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

// --- WINDOW ---
//
// Every payload states the period it covers. Without it a number is just a
// number, and the app could neither say which dates it describes nor refuse one
// that does not match the week being reviewed.

function parseWindow(source, raw) {
  if (!isPlainObject(raw)) return null;
  const from = parseIsoDate(own(raw, "from"));
  const to = parseIsoDate(own(raw, "to"));
  if (!from || !to || to < from) return null;

  if (source === "runaway") {
    const isoWeek = own(raw, "isoWeek");
    if (typeof isoWeek !== "string" || !ISO_WEEK_RE.test(isoWeek)) return null;
    return { from, to, isoWeek };
  }

  const months = finiteNumber(own(raw, "months"));
  // A median over fewer months is honest on a young ledger; zero months is not
  // a window at all.
  if (months === null || !Number.isInteger(months) || months < 1 || months > 24) return null;
  return { from, to, months };
}

// --- FACTS ---

function parseFacts(spec, raw) {
  if (!isPlainObject(raw)) return null;
  const facts = {};

  for (const [key, range] of Object.entries(spec.numbers)) {
    const value = own(raw, key);
    if (value === undefined) continue;
    const num = finiteNumber(value);
    if (num === null || num < range.min || num > range.max) return null;
    facts[key] = num;
  }
  for (const key of spec.required) {
    if (facts[key] === undefined) return null;
  }
  for (const key of spec.booleans) {
    const value = own(raw, key);
    if (value === undefined) continue;
    if (typeof value !== "boolean") return null;
    facts[key] = value;
  }
  return facts;
}

// --- PARSE ---

// Turn a raw stored string into a validated payload, or a reason code.
// Reason codes are fixed identifiers, never text from the payload:
//   absent | unparseable | malformed | wrong-source | unsupported-version |
//   bad-timestamp | bad-window | bad-facts
export function parseBridgePayload(source, text) {
  const spec = Object.hasOwn(FACT_SPECS, source) ? FACT_SPECS[source] : null;
  if (!spec) return fail("wrong-source");
  if (typeof text !== "string" || text.trim() === "") return fail("absent");

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("unparseable");
  }
  if (!isPlainObject(raw)) return fail("malformed");
  if (own(raw, "v") !== BRIDGE_VERSION) return fail("unsupported-version");
  if (own(raw, "source") !== source) return fail("wrong-source");

  const writtenAt = parseTimestamp(own(raw, "writtenAt"));
  if (!writtenAt) return fail("bad-timestamp");

  const window = parseWindow(source, own(raw, "window"));
  if (!window) return fail("bad-window");

  const facts = parseFacts(spec, own(raw, "facts"));
  if (!facts) return fail("bad-facts");

  // Currency is carried for display honesty, not conversion: Midori has already
  // converted into its own base currency, and LBI's benchmarks are THB. Only a
  // short alphabetic code survives, so nothing renderable is attacker-shaped.
  const currency = own(raw, "currency");
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : null;

  return { ok: true, reason: null, payload: { source, writtenAt, window, facts, currency: code } };
}

// --- FRESHNESS ---
//
// Staleness is not cosmetic. A stale payload is reported and never applied,
// because silently scoring an old number is the failure this whole feature is
// supposed to remove.

// Returns { state, ageDays } where state is "fresh" | "stale" | "future".
// `isoWeek` is required for runaway — the week currently being reviewed.
export function payloadFreshness(payload, { now = new Date(), isoWeek = null } = {}) {
  if (!payload) return { state: "stale", ageDays: null };
  const ageDays = Math.floor((now.getTime() - payload.writtenAt.getTime()) / DAY_MS);

  // A timestamp ahead of the device clock means one of the two clocks is wrong,
  // and there is no way to tell which. Surfaced rather than trusted. One day of
  // slack absorbs ordinary timezone drift between two apps on one device.
  if (ageDays < -1) return { state: "future", ageDays };

  if (payload.source === "runaway") {
    // A run log describes one specific week and cannot stand in for another.
    return { state: payload.window.isoWeek === isoWeek ? "fresh" : "stale", ageDays };
  }
  return { state: ageDays > MIDORI_MAX_AGE_DAYS ? "stale" : "fresh", ageDays };
}

// --- MAPPERS ---

// Final gate before a number can become a profile field. The ranges the forms
// enforce apply identically to an imported number; a bridge is not a way around
// validation.
function clampToField(field, value) {
  const range = Object.hasOwn(FIELD_CONSTRAINTS, field) ? FIELD_CONSTRAINTS[field] : null;
  if (!range) return value;
  return Math.max(range.min, Math.min(range.max, value));
}

// Midori facts -> LBI profile fields.
//
// savingsRate is DERIVED, not sent. The state stores exactly one savings number
// (see defaults.js), and deriving it here from income minus expenses keeps the
// arithmetic in the app that owns the definition. Spending more than you earn
// yields 0 rather than a negative rate — savingsRateFrom guards it.
export function midoriFields(payload) {
  const f = payload.facts;
  const income = clampToField("income", Math.round(f.monthlyIncome));
  const surplus = f.monthlyIncome - f.monthlyExpenses;
  const fields = {
    income,
    savingsRate: Math.round(savingsRateFrom(surplus, f.monthlyIncome) * 10) / 10,
    // Collected and stored from v47, consumed by the runway measure in v48.
    monthlyExpenses: Math.round(f.monthlyExpenses)
  };
  // Absent means "Midori did not report", which is not the same as "no
  // investments" — an absent flag must not clear a true one the user set.
  if (typeof f.hasLongTermInvestments === "boolean") {
    fields.longTermInvestments = f.hasLongTermInvestments;
  }
  return fields;
}

// Runaway facts -> LBI profile fields.
//
// THE UNIT TRAP: weeklyVigorousMins is minutes PER ACTIVE DAY, not per week
// (the form label reads "Vigorous Minutes per Day"). A 102-minute, 3-day week
// is 34, not 102. LBI recomputes this from totalMinutes and activeDays rather
// than reading the exporter's minutesPerActiveDay, so the unit is owned by the
// app that defines it and a future exporter cannot get it wrong on LBI's
// behalf.
//
// Running is vigorous by definition, so the moderate and walking fields are
// never touched — someone who also walks keeps their own answer.
export function runawayFields(payload) {
  const f = payload.facts;
  const activeDays = clampToField("weeklyVigorousDays", Math.round(f.activeDays));
  const perDay = activeDays > 0 ? Math.round(f.totalMinutes / activeDays) : 0;
  return {
    weeklyVigorousDays: activeDays,
    weeklyVigorousMins: clampToField("weeklyVigorousMins", perDay)
  };
}

const MAPPERS = { midori: midoriFields, runaway: runawayFields };

// --- READ ---

// Read, validate, date-check and map one source in a single call.
//
// `storage` is injected so this stays testable without a browser and so a
// missing/blocked localStorage (private mode, a sandboxed frame) degrades to
// "not connected" instead of throwing on a page that has nothing to do with it.
//
// Returns { source, ok, reason, payload, freshness, fields }. `fields` is null
// unless the payload is both valid AND fresh: an unusable payload must not hand
// back values that could be pre-filled by mistake.
export function readConnection(source, { storage, now = new Date(), isoWeek = null } = {}) {
  const base = { source, ok: false, reason: "absent", payload: null, freshness: null, fields: null };
  if (!Object.hasOwn(BRIDGE_KEYS, source)) return { ...base, reason: "wrong-source" };

  let text = null;
  try {
    const store = resolveStorage(storage);
    if (store) text = store.getItem(BRIDGE_KEYS[source]);
  } catch {
    return { ...base, reason: "unavailable" };
  }

  const parsed = parseBridgePayload(source, text);
  if (!parsed.ok) return { ...base, reason: parsed.reason };

  const freshness = payloadFreshness(parsed.payload, { now, isoWeek });
  return {
    source,
    ok: true,
    reason: null,
    payload: parsed.payload,
    freshness,
    fields: freshness.state === "fresh" ? MAPPERS[source](parsed.payload) : null
  };
}

// --- PREFERENCE ---
//
// Whether a source may be read at all. Opt-in per source, off until asked for.
//
// It lives here rather than in the Profile view because the weekly review reads
// the same setting: two copies of a storage key is how two features start
// disagreeing about whether a connection is on.
//
// Its own key, outside the app's state schema, for the same reason
// `lifequest_lang` and `lifequest_share_prefs` are: a preference is not
// assessment data, so it must not force a migration, and it should survive an
// erase.
//
// This governs READING only. Each source app carries its own toggle governing
// whether it writes — exporting your finances should be a deliberate choice at
// both ends, and this app cannot make that choice on Midori's behalf.
export const CONNECTION_PREFS_KEY = "lifequest_connections";

// Always a complete { midori, runaway } object of booleans. Anything missing,
// unparseable, or not exactly `true` reads as off: a connection whose state the
// user cannot see must never be quietly active.
export function readConnectionPrefs(storage) {
  const prefs = {};
  for (const source of CONNECTION_SOURCES) prefs[source] = false;

  let text = null;
  try {
    const store = resolveStorage(storage);
    if (store) text = store.getItem(CONNECTION_PREFS_KEY);
  } catch {
    return prefs;
  }
  if (typeof text !== "string" || text.trim() === "") return prefs;

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return prefs;
  }
  if (!isPlainObject(raw)) return prefs;

  for (const source of CONNECTION_SOURCES) {
    if (own(raw, source) === true) prefs[source] = true;
  }
  return prefs;
}

// Set one source and return the full resulting prefs. A failed write (private
// mode, quota) still returns the intended state: the toggle reflects the click,
// it simply will not survive a reload. Losing a preference must not take down
// the page it was clicked on.
export function setConnectionPref(source, enabled, storage) {
  const prefs = readConnectionPrefs(storage);
  if (!Object.hasOwn(BRIDGE_KEYS, source)) return prefs;
  prefs[source] = enabled === true;
  try {
    const store = resolveStorage(storage);
    if (store) store.setItem(CONNECTION_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* preference lost, app intact */ }
  return prefs;
}

// --- STATUS ---
//
// What the UI has to say about one source, as a code. The wording belongs to
// the view's dictionary; the RULE belongs here, where it is testable without a
// browser.
//
//   off        the user has not switched this source on
//   waiting    on, but nothing has been written on this device yet
//   connected  a valid payload covering the period being scored
//   stale      valid, but too old (Midori) or the wrong week (Runaway)
//   future     dated ahead of this device's clock — one of two clocks is wrong
//   unreadable something is stored, but not a payload this version understands
export function connectionStatus(enabled, read) {
  if (enabled !== true) return "off";
  if (!read || !read.ok) {
    const reason = read ? read.reason : "absent";
    // "Nothing there" and "cannot look" are the same story to a user: no data
    // yet. A payload that IS there but unreadable is a different story, because
    // it means the two apps disagree about the contract.
    return reason === "absent" || reason === "unavailable" ? "waiting" : "unreadable";
  }
  if (read.freshness.state === "future") return "future";
  return read.freshness.state === "fresh" ? "connected" : "stale";
}

// --- PRE-FILL ---
//
// Which weekly-review boxes each source may fill in. Deliberately narrower than
// what the mappers return: Midori also reports income and the investments flag,
// but those are slow-moving profile facts that belong on the Profile page. The
// weekly review does not ask for them, and submitWeeklyReview would drop them
// anyway — it reads only WEEKLY_REVIEW_FIELDS (goals.js).
//
// Running is vigorous by definition, so the moderate and walking boxes are never
// pre-filled. Someone who runs AND swims raises the number themselves rather
// than having their own answer overwritten.
export const PREFILL_FIELDS = {
  midori: ["monthlySavings"],
  runaway: ["weeklyVigorousDays", "weeklyVigorousMins"]
};

// monthlySavings is a FORM unit, not a stored one: the box holds baht and the
// state holds a rate (v46). Converting with the same helper the form uses for
// the profile keeps one conversion path, and feeding it Midori's OWN income
// means the amount shown is the surplus Midori actually measured — not one
// rebased on a profile income that may be months out of date.
//
// The rate is rounded to 0.1 in midoriFields, so the amount can land within
// ~0.05% of the true surplus. That is a rounding error the user can see in the
// box and correct; a silently rebased figure would not be.
function prefillValue(field, fields) {
  const value = field === "monthlySavings"
    ? savingsAmountFrom(fields.savingsRate, fields.income)
    : own(fields, field);
  return finiteNumber(value);
}

// Turn already-performed reads into { field: { source, value, window } } for the
// boxes a connection may pre-fill. Only a CONNECTED source contributes: an off,
// stale, waiting or unreadable one leaves the user's own last answer in place,
// which is the correct fallback in every one of those cases.
//
// Takes reads rather than performing them so the caller reads each source once
// (it also needs the status for its own messaging) and so this stays testable
// without a storage of any kind.
export function connectionPrefills(reads = {}, prefs = {}) {
  const prefills = {};
  for (const source of CONNECTION_SOURCES) {
    const read = own(reads, source) || null;
    if (connectionStatus(own(prefs, source), read) !== "connected") continue;
    for (const field of PREFILL_FIELDS[source]) {
      const value = prefillValue(field, read.fields);
      if (value === null) continue;
      prefills[field] = { source, value, window: read.payload.window };
    }
  }
  return prefills;
}

// --- INCOME DRIFT ---
//
// The weekly review shows savings in baht but stores a RATE, and it derives that
// rate against the income saved in the profile — income is not a weekly-review
// field, so the review cannot update it. If Midori's measured income has moved
// away from the profile's, a correct baht figure therefore produces an incorrect
// rate, and the user has no way to see why.
//
// So the review says so and points at the page that can fix it. 10% is the point
// at which the derived rate is wrong by more than rounding; below it the drift is
// not worth interrupting a two-minute form for.
export const INCOME_DRIFT_RATIO = 0.1;

export function incomeDrifted(bridgeIncome, profileIncome) {
  const bridge = finiteNumber(bridgeIncome);
  const profile = finiteNumber(profileIncome);
  // No profile income means no rate is derivable at all (savingsRateFrom returns
  // 0), which is a different problem and not one this notice describes.
  if (bridge === null || profile === null || profile <= 0 || bridge <= 0) return false;
  return Math.abs(bridge - profile) / profile > INCOME_DRIFT_RATIO;
}
