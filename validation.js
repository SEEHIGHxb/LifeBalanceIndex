// validation.js - Onboarding input validation + coverage capture (Phase 1).
//
// Two jobs, both pure (no DOM), so they unit-test without a browser:
//   1. validateProfile(raw) rejects present-but-out-of-range numeric input
//      BEFORE it degrades silently into a plausible-looking score.
//   2. buildProvidedFlags / buildAnsweredFlags turn a set of user-touched
//      field/instrument keys into the coverage maps persisted alongside the
//      baseline (the linchpin for later confidence signalling). Numeric inputs
//      are pre-filled and instrument radios are pre-checked at their defaults,
//      so "did the user actually answer?" can only be known from interaction,
//      never from the submitted values.

import { tp } from "./i18n.js";

// Per-field numeric constraints. Keys match the surveyData field names built
// in ui.js doSubmit, so validateProfile reads the payload directly.
export const FIELD_CONSTRAINTS = {
  income: { min: 0, max: 10000000 },
  // What the forms ASK for (baht). savingsRate below is what gets STORED, and
  // is derived from this — see savingsRateFrom in scoring.js. Both are
  // validated: the amount because the user types it, the rate because a
  // hand-edited import can still carry one.
  monthlySavings: { min: 0, max: 10000000 },
  savingsRate: { min: 0, max: 100 },
  // Runway inputs (v70). Both are asked in baht and stored in baht — unlike
  // savings there is nothing to derive, so what the user types is what is kept.
  // liquidSavings shares income's ceiling rather than monthlySavings's because
  // it is a STOCK: a lifetime of saving is legitimately larger than a month of
  // earning. Neither is scored; they are range-checked anyway, because a
  // garbage number reaching the runway line would be a wrong number on screen.
  liquidSavings: { min: 0, max: 10000000 },
  committedOutflow: { min: 0, max: 10000000 },
  familySupport: { min: 0, max: 10000000 },
  digitalLiteracy: { min: 0, max: 100 },
  // From here down the ranges are the ones the forms print beside each box.
  // They used to be looser here than on the page (sleep 24 against the page's
  // 16, height 80 against 100); the owner chose the page's, 2026-09-26, so the
  // hint and the check can no longer disagree. sanitize.js keeps its wider
  // bounds on purpose: it cleans stored and imported data, it does not ask.
  weeklyLearningHours: { min: 0, max: 80 },
  weeklyVigorousDays: { min: 0, max: 7 },
  weeklyVigorousMins: { min: 0, max: 600 },
  weeklyModerateDays: { min: 0, max: 7 },
  weeklyModerateMins: { min: 0, max: 600 },
  weeklyWalkingDays: { min: 0, max: 7 },
  weeklyWalkingMins: { min: 0, max: 600 },
  weight: { min: 25, max: 300 },
  height: { min: 100, max: 250 },
  sleepHours: { min: 0, max: 16 },
  vegetablePortions: { min: 0, max: 15 },
  waterLiters: { min: 0, max: 10 },
  singleUsePlastics: { min: 0, max: 100 },
  monthlyDonations: { min: 0, max: 10000000 },
  volunteeringHours: { min: 0, max: 168 }
};

// The 12 onboarding instruments, in the order state.js stores their sums.
export const INSTRUMENT_KEYS = [
  "cfpb", "jss", "st5", "who5", "lsns", "ucla",
  "ras", "gse", "citacc", "citlearn", "grit", "ptm", "geb", "lfis"
];

export const NUMERIC_FIELD_KEYS = Object.keys(FIELD_CONSTRAINTS);

// A blank/absent value is allowed: it falls back to a documented default for a
// genuinely-untouched optional field. Only present values are checked.
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

// Validate the raw onboarding payload. Returns { ok, errors } where errors maps
// a field name to a user-facing (translated) message. Never throws.
//
// `required` names fields that may NOT be blank. The Weekly Review passes its
// own: every one of its boxes is a measurement, and a blank one used to be
// saved as 0 (Number("") is 0), so clearing the sleep box recorded no sleep.
// A browser also hands over "" for letters typed into a number box, so this
// catches those too.
export function validateProfile(raw = {}, { required = [] } = {}) {
  const errors = {};
  for (const [field, { min, max }] of Object.entries(FIELD_CONSTRAINTS)) {
    const value = raw[field];
    if (isBlank(value)) {
      if (required.includes(field)) errors[field] = tp("Enter a number.", {});
      continue; // untouched optional field -> default later
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      errors[field] = tp("Enter a number.", {});
    } else if (num < min || num > max) {
      errors[field] = tp("Enter a value between {min} and {max}.", { min, max });
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// Coverage: map each known key to whether the user touched it. `touched` may be
// a Set or any array-like of key strings. Unknown/untouched -> false.
function flagsFrom(keys, touched) {
  const has = touched instanceof Set ? k => touched.has(k) : k => Array.from(touched || []).includes(k);
  const flags = {};
  for (const key of keys) flags[key] = has(key);
  return flags;
}

export function buildProvidedFlags(touched) {
  return flagsFrom(NUMERIC_FIELD_KEYS, touched);
}

export function buildAnsweredFlags(touched) {
  return flagsFrom(INSTRUMENT_KEYS, touched);
}

// --- RESPONSE QUALITY (G3): straight-line detection ---
//
// An instrument is judged only when it is MIXED-KEYED (its items don't all
// share one option order — reverse-keyed items flip which end is healthy) and
// long enough to make a uniform pattern implausible. On such an instrument an
// honest respondent cannot land on the same option POSITION for every item
// without contradicting themselves, so an all-same-position submission reads
// as careless and must not be treated as a reliable measurement. Pure: takes
// the instrument definition and the answer array, touches nothing else.
const STRAIGHT_LINE_MIN_ITEMS = 4;

export function isStraightLined(instrument, answers) {
  const items = (instrument && instrument.items) || [];
  if (items.length < STRAIGHT_LINE_MIN_ITEMS) return false;
  if (!Array.isArray(answers) || answers.length !== items.length) return false;

  // Uniformly-keyed instruments (every item shares one option order) are
  // never judged: answering the same position on all of them is coherent.
  const orders = new Set(items.map(it => it.options.map(o => o.v).join(",")));
  if (orders.size < 2) return false;

  const positions = items.map((it, i) => it.options.findIndex(o => o.v === parseInt(answers[i])));
  if (positions.some(pos => pos < 0)) return false; // unknown value: don't judge
  return new Set(positions).size === 1;
}
