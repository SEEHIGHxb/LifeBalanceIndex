// criteria.js - Published guideline checks, the app's CRITERION-referenced layer.
//
// benchmarks.js answers "where do you rank among a population?" That question
// needs a norming sample, and a 2026-07 literature sweep across three research
// rounds established that no representative Thai general-adult norm is
// published for any instrument this app uses. Pooling foreign samples does not
// fix it: cross-country self-report comparison is INVALID, not merely
// unavailable (reference-group effect, response-style differences, no
// measurement invariance).
//
// This module asks a different question that needs no sample at all:
//
//     "Do you meet the published guideline?"
//
// A WHO recommendation is a criterion, not a norm. It does not describe what
// people do; it states what a body needs. That makes it applicable to a Thai
// user without the cross-cultural problems above, and it makes the checks
// COMMENSURABLE with each other in a way eight percentiles against six
// different populations never were.
//
// THE ADDITIVE CONTRACT — the load-bearing constraint of this module:
//
//   Nothing here feeds scoring, percentiles, grades, or the Balance Index.
//   grades.js:54-63 derives every grade from a percentile and documents why
//   mixing bases is refused: "falling back to the raw score would grade three
//   aspects on a different basis from the other five". "Meets the WHO activity
//   guideline" and "top 30% of Thai earners" are not the same kind of claim,
//   so a criterion must never become a grade. These are a SEPARATE reading,
//   shown beside the percentile, and tests/criteria.test.mjs pins that.
//
// The pattern is not new here: relationshipsBenchmark in benchmarks.js already
// uses the LSNS-6 < 12 cutoff precisely because it is the instrument's own
// validated threshold rather than something derived from a sample. This
// generalizes that move.
//
// Citations come from the SOURCES registry in benchmarks.js so a study cannot
// drift into two different labels. Canonical English lives here and the UI
// localizes with t(), same convention as PERCENTILE_BANDS.

import { t, tp } from "./i18n.js";
import { SOURCES } from "./benchmarks.js";

// A criterion's three outcomes. `unmeasured` is FIRST-CLASS, never a blank:
// the app not having asked something is different information from the user
// falling short of it, and collapsing the two would invent a verdict. Same
// rule the shipped UNRANKED state follows (views/helpers.js:96-113).
export const CRITERION_STATUS = Object.freeze({
  MET: "met",
  UNMET: "unmet",
  UNMEASURED: "unmeasured"
});

// Canonical English status labels, as a map of LITERAL t() calls. A t(variable)
// would be invisible to tests/i18n-coverage.test.mjs and would silently ship
// untranslated — the same reason methodology.js builds RANK_LABELS this way.
export const CRITERION_STATUS_LABELS = () => ({
  met: t("Meets guideline"),
  unmet: t("Below guideline"),
  unmeasured: t("Not measured")
});

// --- Thresholds, each verified verbatim at its source on 2026-07-30 ---

// WHO 2020: "at least 150-300 minutes of moderate-intensity aerobic physical
// activity; or at least 75-150 minutes of vigorous-intensity". The lower bound
// of each range is the guideline floor.
const AEROBIC_MODERATE_MIN = 150;
const AEROBIC_VIGOROUS_MIN = 75;
// WHO also allows "an equivalent combination" without printing the ratio in
// that sentence. 2:1 is the conventional equivalence, and it is already implicit
// in this app's own MET table (vigorous 8.0 vs moderate 4.0 - exactly 2:1), so
// using it here keeps the criterion consistent with the score beside it.
const VIGOROUS_EQUIVALENCE = 2;

// WHO 2020: muscle-strengthening "on 2 or more days a week".
const STRENGTH_DAYS_MIN = 2;

// WHO Western Pacific / Asia-Pacific classification: overweight begins at 23.0
// for Asian populations, NOT the global 25.0, because cardiometabolic risk
// rises at a lower BMI. This is the line that applies to this app's users.
const BMI_OVERWEIGHT_ASIA = 23.0;

// National Sleep Foundation (Hirshkowitz et al. 2015): 7-9 h for adults,
// 7-8 h for older adults. A RANGE, not a floor - more is also outside it.
const SLEEP_MIN = 7;
const SLEEP_MAX_ADULT = 9;
const SLEEP_MAX_OLDER = 8;
const OLDER_ADULT_AGE = 65;

// WHO: "at least 400 grams of fruits and vegetables per day". A WHO portion is
// 80 g, so 400 g is 5 portions.
const VEG_PORTIONS_MIN = 5;

// Topp et al. 2015: below 50/100 on the WHO-5 indicates likely depression.
const WHO5_CUTOFF = 50;

// Tolerant numeric read: hostile or absent profile values must coerce to 0
// rather than throw or poison the arithmetic (mirrors sanitize.js).
function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// True only when a field was actually supplied with a usable positive value —
// the difference between `unmet` and `unmeasured`.
function has(value) {
  return num(value) > 0;
}

function criterion(id, aspect, status, summary, detail, source) {
  return { id, aspect, status, summary, detail, source };
}

// --- PHYSICAL: aerobic activity ---
//
// Walking minutes count toward the moderate total. WHO puts moderate intensity
// at 3.0-5.9 MET and this app already scores walking at 3.3 MET, inside that
// band, so excluding it here would contradict the score shown beside it. The
// detail line says walking is included so nobody has to guess.
function aerobicCriterion(profile) {
  const vigorous = num(profile.weeklyVigorousDays) * num(profile.weeklyVigorousMins);
  const moderate = num(profile.weeklyModerateDays) * num(profile.weeklyModerateMins)
    + num(profile.weeklyWalkingDays) * num(profile.weeklyWalkingMins);
  const equivalent = moderate + VIGOROUS_EQUIVALENCE * vigorous;
  const met = equivalent >= AEROBIC_MODERATE_MIN;
  return criterion(
    "activityAerobic",
    "physical",
    met ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Aerobic activity"),
    tp("{moderate} min moderate (walking included) and {vigorous} min vigorous per week. The guideline is {modTarget} min moderate, or {vigTarget} min vigorous, or an equivalent mix.", {
      moderate: Math.round(moderate),
      vigorous: Math.round(vigorous),
      modTarget: AEROBIC_MODERATE_MIN,
      vigTarget: AEROBIC_VIGOROUS_MIN
    }),
    SOURCES.whoActivity2020
  );
}

// --- PHYSICAL: muscle strengthening ---
//
// The weekly review does not collect strength-training days yet, so this
// reports `unmeasured` rather than quietly failing everyone on a question they
// were never asked. Reading the field defensively means adding
// `weeklyStrengthDays` to the review is a one-field change with no edit here.
function strengthCriterion(profile) {
  const raw = profile.weeklyStrengthDays;
  if (raw === undefined || raw === null || raw === "") {
    return criterion(
      "activityStrength", "physical", CRITERION_STATUS.UNMEASURED,
      t("Muscle strengthening"),
      t("The weekly review does not ask about strength training yet, so this cannot be checked."),
      SOURCES.whoActivity2020
    );
  }
  const days = num(raw);
  return criterion(
    "activityStrength", "physical",
    days >= STRENGTH_DAYS_MIN ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Muscle strengthening"),
    tp("{days} days per week of strength work. The guideline is {target} or more.", {
      days: Math.round(days), target: STRENGTH_DAYS_MIN
    }),
    SOURCES.whoActivity2020
  );
}

// --- PHYSICAL: BMI against the Asia-Pacific line ---
function bmiCriterion(profile) {
  const weight = num(profile.weight);
  const heightM = num(profile.height) / 100;
  if (!has(weight) || !has(heightM)) {
    return criterion(
      "bmiAsiaPacific", "physical", CRITERION_STATUS.UNMEASURED,
      t("Body mass index"),
      t("Add your height and weight to check this."),
      SOURCES.whoWproBmi
    );
  }
  const bmi = weight / (heightM * heightM);
  return criterion(
    "bmiAsiaPacific", "physical",
    bmi < BMI_OVERWEIGHT_ASIA ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Body mass index"),
    tp("BMI {bmi}. The WHO Asia-Pacific overweight line is {line}, lower than the global 25 because risk rises earlier in Asian populations.", {
      bmi: bmi.toFixed(1), line: BMI_OVERWEIGHT_ASIA.toFixed(1)
    }),
    SOURCES.whoWproBmi
  );
}

// --- PHYSICAL: sleep duration ---
//
// A BAND check. Sleeping well past the range is outside the recommendation too,
// and the wording stays neutral about it: long sleep is a signal worth noticing,
// not a failure to scold.
function sleepCriterion(profile) {
  if (!has(profile.sleepHours)) {
    return criterion(
      "sleepDuration", "physical", CRITERION_STATUS.UNMEASURED,
      t("Sleep duration"),
      t("Add your typical sleep hours to check this."),
      SOURCES.nsfSleep
    );
  }
  const hours = num(profile.sleepHours);
  const older = num(profile.age) >= OLDER_ADULT_AGE;
  const max = older ? SLEEP_MAX_OLDER : SLEEP_MAX_ADULT;
  const withinRange = hours >= SLEEP_MIN && hours <= max;
  return criterion(
    "sleepDuration", "physical",
    withinRange ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Sleep duration"),
    tp("{hours} hours a night. The recommended range for your age is {low}-{high} hours.", {
      hours, low: SLEEP_MIN, high: max
    }),
    SOURCES.nsfSleep
  );
}

// --- PHYSICAL: fruit and vegetables ---
//
// DISCLOSED LIMITATION: the WHO figure covers fruit AND vegetables, while the
// weekly review asks only about vegetables. So this check is STRICTER than the
// guideline - someone eating 3 portions of veg plus 2 of fruit meets WHO but
// reads as below here. Stated in the detail line rather than papered over,
// because silently comparing a narrower measure against a wider guideline is
// the same class of error as the plastics per-day/per-week mismatch.
function fruitVegCriterion(profile) {
  if (!has(profile.vegetablePortions)) {
    return criterion(
      "fruitVeg", "physical", CRITERION_STATUS.UNMEASURED,
      t("Fruit and vegetables"),
      t("Add your daily vegetable portions to check this."),
      SOURCES.whoDiet
    );
  }
  const portions = num(profile.vegetablePortions);
  return criterion(
    "fruitVeg", "physical",
    portions >= VEG_PORTIONS_MIN ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Fruit and vegetables"),
    tp("{portions} vegetable portions a day. The guideline is 400 g of fruit and vegetables, about {target} portions — this app asks only about vegetables, so the check is a strict one.", {
      portions, target: VEG_PORTIONS_MIN
    }),
    SOURCES.whoDiet
  );
}

// --- MENTAL: WHO-5 screening threshold ---
//
// A CLINICAL SCREENING threshold, not a rank and not a diagnosis. Below the
// cutoff means "worth talking to someone", never "below average" — and the
// optimal cutoff does shift by population (raw 9-13 across validation
// studies), so the wording claims only what the instrument claims.
//
// The unmet wording is deliberately supportive, matching the duty-of-care
// handling isBottomGrade() already triggers for a bottom-grade mental aspect
// (grades.js:74-79). It sits BESIDE the German-norm percentile in
// mentalBenchmark; it does not replace it.
function who5Criterion(baseline) {
  if (!baseline || !Number.isFinite(baseline.who5)) {
    return criterion(
      "who5Threshold", "mental", CRITERION_STATUS.UNMEASURED,
      t("Well-being screening"),
      t("Answer the well-being questionnaire to check this."),
      SOURCES.who5Cutoff
    );
  }
  const score100 = baseline.who5 * 4; // raw 0-25 -> 0-100
  const above = score100 > WHO5_CUTOFF;
  return criterion(
    "who5Threshold", "mental",
    above ? CRITERION_STATUS.MET : CRITERION_STATUS.UNMET,
    t("Well-being screening"),
    above
      ? tp("WHO-5 well-being {score}/100, above the {cutoff} screening threshold.", { score: score100, cutoff: WHO5_CUTOFF })
      : tp("WHO-5 well-being {score}/100, at or below the {cutoff} screening threshold. That is a prompt to talk to someone, not a diagnosis or a ranking.", { score: score100, cutoff: WHO5_CUTOFF }),
    SOURCES.who5Cutoff
  );
}

// Every criterion, in aspect order. Aspects with no institutional per-person
// criterion — finance, social contribution, environment, humanity's future —
// are absent on purpose and keep their local Thai norms; the methodology page
// states why. Two further exclusions are recorded there too:
//
//   WATER      EFSA's adequate intake (2.0 L women / 2.5 L men) is TOTAL water
//              including moisture from food, while this app measures drinking
//              water. Citing it here would be a unit error of exactly the kind
//              already fixed once in this codebase. The 2 L pledge is a
//              convention, not a guideline, and is labelled as one.
//   SEDENTARY  WHO says only "limit the amount of time spent being sedentary" —
//              no number, so there is nothing to pass or fail.
export function evaluateCriteria(profile, baseline) {
  const p = profile || {};
  return [
    aerobicCriterion(p),
    strengthCriterion(p),
    bmiCriterion(p),
    sleepCriterion(p),
    fruitVegCriterion(p),
    who5Criterion(baseline)
  ];
}

// Criteria for one aspect, for the per-aspect card. Empty array (never null)
// when an aspect has no criteria, so callers can render unconditionally.
export function criteriaForAspect(profile, baseline, aspectKey) {
  return evaluateCriteria(profile, baseline).filter(c => c.aspect === aspectKey);
}

// {met, total} across the checks that are actually measurable right now.
// `unmeasured` is excluded from BOTH halves: counting it as a miss would
// penalize the user for a question the app never asked, and counting it as a
// pass would invent a result. So "3 of 5" always means five real checks.
export function criteriaTally(profile, baseline) {
  const measured = evaluateCriteria(profile, baseline)
    .filter(c => c.status !== CRITERION_STATUS.UNMEASURED);
  return {
    met: measured.filter(c => c.status === CRITERION_STATUS.MET).length,
    total: measured.length
  };
}
