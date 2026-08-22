// scoring.js - Pure scoring: instrument normalizers and the aspect calculators.
//
// Single source of truth (finding #13). Before this module the same formulas
// lived in three places — the onboarding calculators in state.js, the monthly
// check-in targets in submitCheckin, and the component breakdowns in aspects.js
// — with the ST-5 stress bands copied into all three. Any tweak had to be made
// three times or the score on the card would silently disagree with the formula
// behind it. Everything here is a pure function of (profile, answers): no
// storage, no DOM, no i18n.

import { incomeStandingScore } from "./benchmarks.js";

// Sum of an instrument's raw answer values ("" and null count as 0).
export function rawSum(answers) {
  return (answers || []).reduce((sum, val) => sum + parseInt(val || 0), 0);
}

export function clamp100(v) {
  return Math.round(Math.max(0, Math.min(100, v)));
}

// The app never awards a perfect score. Not a rounding detail — a stance: a
// finished person is not a thing this app believes in, and 100 would read as
// "nothing left to do" on an instrument that exists to point at the next step.
// The math is allowed to reach 100; the display is not.
//
// This is the SCORE ceiling. clamp100 above stays at 100 on purpose, because
// it normalizes sub-components that are INPUTS to the weighted formulas —
// shaving those to 99 would quietly change the arithmetic rather than the
// presentation, which is not what the cap is for.
export const SCORE_MAX = 99;

export function clampScore(v) {
  return Math.round(Math.max(0, Math.min(SCORE_MAX, v)));
}

// --- SHORT-INSTRUMENT NORMALIZERS (raw sum -> 0-100, higher = healthier) ---

// WHO-5 well-being (5 items, each 0-5, raw 0-25).
export function who5Score(raw) {
  return raw * 4;
}

// DMH Thailand ST-5 (5 items, each 0-3, raw 0-15) -> stress resilience
// (higher = calmer). Bands follow the DMH cutoffs: <=4 fine, 5-7 watch,
// 8-9 problem, 10+ severe.
export function st5Resilience(raw) {
  if (raw <= 4) return 100 - raw * 10;
  if (raw <= 7) return 60 - (raw - 4) * 10;
  if (raw <= 9) return 30 - (raw - 7) * 10;
  return 0;
}

// CFPB financial well-being, scored with the OFFICIAL conversion tables from
// the CFPB scoring worksheets ("Measuring financial well-being: A guide to
// using the CFPB Financial Well-Being Scale", Dec 2015, pp. 28 & 31):
// raw total -> IRT-scaled score, self-administered mode, by age band
// (18-61 vs 62+). Replaces the earlier linear approximation (finding #8).
// The official score does not span 0-100: the 5-item self-administered range
// is 19-82 (18-61) / 20-90 (62+), centred near the US mean of ~50.
const CFPB5_SELF = {
  younger: [19, 25, 29, 32, 36, 38, 41, 43, 46, 48, 50, 53, 55, 57, 60, 63, 65, 68, 72, 76, 82],
  older: [20, 26, 31, 34, 37, 40, 43, 46, 48, 51, 53, 55, 58, 61, 63, 66, 69, 73, 76, 81, 90]
};
const CFPB10_SELF = {
  younger: [14, 19, 22, 25, 27, 29, 31, 32, 34, 35, 37, 38, 40, 41, 42, 44, 45, 46, 47, 49, 50, 51, 52, 54, 55, 56, 58, 59, 60, 62, 63, 65, 66, 68, 69, 71, 73, 75, 78, 81, 86],
  older: [14, 20, 24, 26, 29, 31, 33, 35, 36, 38, 39, 41, 42, 44, 45, 46, 48, 49, 50, 52, 53, 54, 56, 57, 58, 60, 61, 63, 64, 66, 67, 69, 71, 73, 75, 77, 79, 82, 84, 88, 95]
};

function cfpbLookup(table, raw, age) {
  const band = parseFloat(age || 0) >= 62 ? table.older : table.younger;
  const idx = Math.max(0, Math.min(band.length - 1, Math.round(raw || 0)));
  return band[idx];
}

// CFPB-5 (5 items, each 0-4, raw 0-20) -> official Financial Well-Being score.
export function cfpbScore(raw, age) {
  return cfpbLookup(CFPB5_SELF, raw, age);
}

// CFPB-10 (10 items, each 0-4, raw 0-40) -> official Financial Well-Being score.
export function cfpb10Score(raw, age) {
  return cfpbLookup(CFPB10_SELF, raw, age);
}

// Sleep-quality issues (JSS, 4 items, each 0-5, raw 0-20), inverted.
export function sleepQualityScore(raw) {
  return 100 - raw * 5;
}

// LSNS-6 social network (6 items, each 0-5, raw 0-30; under 12 = isolation risk).
export function lsnsScore(raw) {
  return (raw / 30) * 100;
}

// UCLA-3 loneliness (3 items, each 1-3, raw 3-9), inverted so higher = less lonely.
export function uclaLowLoneliness(raw) {
  return 100 - ((raw - 3) / 6) * 100;
}

// RAS-3 romantic satisfaction (3 items, each 1-5, raw 3-15).
export function rasScore(raw) {
  return ((raw - 3) / 12) * 100;
}

// GSE-6 self-efficacy (6 items, each 1-4, raw 6-24).
export function gseScore(raw) {
  return ((raw - 6) / 18) * 100;
}

// Grit-S perseverance facet (4 items, each 1-5, raw 4-20).
export function gritScore(raw) {
  return ((raw - 4) / 16) * 100;
}

// --- PROFILE-DERIVED SUB-SCORES ---

// IPAQ MET-minutes/week from the weekly activity fields.
export function metMinutes(profile) {
  return (8.0 * (profile.weeklyVigorousDays || 0) * (profile.weeklyVigorousMins || 0))
    + (4.0 * (profile.weeklyModerateDays || 0) * (profile.weeklyModerateMins || 0))
    + (3.3 * (profile.weeklyWalkingDays || 0) * (profile.weeklyWalkingMins || 0));
}

// MET-minutes -> 0-100. WHO guideline (600) lands at 40; 3000+ approaches 100.
export function activityScore(met) {
  if (met < 600) return (met / 600) * 40;
  if (met <= 3000) return 40 + ((met - 600) / 2400) * 40;
  return 80 + Math.min(20, ((met - 3000) / 3000) * 20);
}

// Asian BMI bands. Returns null when weight or height is missing so callers
// OMIT the component rather than show a fabricated "average" 50 that looks
// like a real measurement (finding #7).
export function bmiScore(profile) {
  const w = parseFloat(profile.weight || 0);
  const h = parseFloat(profile.height || 0) / 100; // in meters
  if (!(w > 0 && h > 0)) return null;
  const bmi = w / (h * h);
  if (bmi >= 18.5 && bmi <= 22.9) return 100; // Ideal
  if (bmi >= 23.0 && bmi <= 24.9) return 75; // Overweight
  if (bmi >= 25.0 && bmi <= 29.9) return 50; // Obese Class 1
  if (bmi >= 30.0) return 25; // Obese Class 2
  return Math.max(25, (bmi / 18.5) * 100); // Underweight
}

// Reported sleep duration -> 0-100 ladder. Returns null when no duration is on
// file, so callers OMIT it rather than fabricate a floor of 50 (finding #7) —
// the same contract bmiScore uses above.
export function sleepDurationScore(profile) {
  const duration = parseFloat(profile.sleepHours || 0);
  if (!(duration > 0)) return null;
  if (duration >= 7 && duration <= 9) return 100;
  if (duration >= 6 && duration < 7) return 75;
  return 50;
}

// The sleep component: an even blend of the duration ladder and measured
// quality, falling back to quality alone when no duration was reported. A
// genuinely short night (< 6h) still scores low; an ABSENT one does not.
export function sleepScore(profile, qualityScore) {
  const F_duration = sleepDurationScore(profile);
  return F_duration === null ? qualityScore : (0.5 * F_duration) + (0.5 * qualityScore);
}

// Nutrition: vegetable portions (5/day maxes it) and water (2.5L/day), evenly.
export function nutritionScore(profile) {
  const F_veg = Math.min(100, (parseFloat(profile.vegetablePortions || 0) / 5) * 100);
  const F_water = Math.min(100, (parseFloat(profile.waterLiters || 0) / 2.5) * 100);
  return (0.5 * F_veg) + (0.5 * F_water);
}

// Single-use plastic pieces per DAY -> 0-100 (Thai average ~3/day post-ban).
export function plasticScore(profile) {
  const pieces = parseInt(profile.singleUsePlastics || 0);
  if (pieces === 0) return 100;
  if (pieces <= 2) return 80;
  if (pieces <= 5) return 50;
  if (pieces <= 7) return 25;
  return 0;
}

// Active learning: weekly study hours (5h maxes it) blended with self-rated
// digital literacy. Feeds Personal Goals.
export function learningScore(profile) {
  const study = Math.min(100, (parseFloat(profile.weeklyLearningHours || 0) / 5) * 100);
  const digital = Math.min(100, Math.max(0, parseFloat(profile.digitalLiteracy || 0)));
  return 0.5 * study + 0.5 * digital;
}

// Future-skills study time (4h/week maxes it — a stricter divisor than
// learningScore's 5h, deliberately: future-proofing expects more).
// NOTE: `weeklyLearningHours` intentionally feeds both this and learningScore —
// learning time is genuinely evidence for personal growth AND future-proofing.
// The reuse is surfaced to the user on the component detail line.
export function futureStudyScore(profile) {
  return Math.min(100, (parseFloat(profile.weeklyLearningHours || 0) / 4) * 100);
}

// Savings habit as a 0-100 component (a 20% rate maxes it). This is what the
// aspect page's "Savings habit" bar shows.
export function savingsHabitScore(profile) {
  return Math.min(100, (parseFloat(profile.savingsRate || 0) / 20) * 100);
}

// The same curve scaled to its contribution on the finance score (max +10), so
// the bar and the bonus cannot drift apart.
export function savingsBonus(profile) {
  return savingsHabitScore(profile) / 10;
}

// The forms ASK for a baht amount and store a RATE. Asking for a percentage
// made the user do the division, and people who do not know their rate off the
// top of their head guess it — which quietly made the one objective figure in
// this aspect the least reliable one. The amount is a number they can look up.
//
// The rate stays the stored field, so this is a UI-and-derivation change with
// no schema bump: savingsRate keeps its sanitizer range, its pledge template
// and its component row.
export function savingsRateFrom(amount, income) {
  const amt = parseFloat(amount || 0);
  const inc = parseFloat(income || 0);
  // No income means no rate to compute — NOT a rate of zero. The forms guard
  // this before calling, so reaching here means hand-edited or hostile input.
  // Saving with no salary is a real situation and it is what the runway
  // measure is for; until then it is honestly out of this scale's range.
  if (!(inc > 0) || !(amt > 0)) return 0;
  return Math.min(100, (amt / inc) * 100);
}

// The inverse, for pre-filling the amount box from a stored rate.
export function savingsAmountFrom(rate, income) {
  const r = parseFloat(rate || 0);
  const inc = parseFloat(income || 0);
  if (!(inc > 0) || !(r > 0)) return 0;
  return Math.round((r / 100) * inc);
}

// --- RUNWAY: MEASURED, DELIBERATELY NOT SCORED (v70) ---
//
// Months of committed outflow covered by liquid savings. This is the number
// round 10 concluded the finance aspect was missing: a 75,000 salary that is
// entirely spoken for and a 75,000 salary that is not are the same number to
// `income` and to `savingsRate`, and the CFPB items only capture how that
// difference FEELS. Runway is the fact underneath the feeling.
//
// IT RETURNS MONTHS, NOT A 0-100 SCORE, AND NOTHING WEIGHTS IT.
//
// Round 11 closed 2026-08-22 and found that a normalizer DOES exist, correcting
// round 10: the Financial Health Network's FinHealth Score Toolkit scores this
// exact question as 1 of 8 equally-weighted indicators, with published point
// values (6mo+ = 100, 3-5mo = 75, 1-2mo = 50, 1-3wk = 25, <1wk = 0). Round 10
// looked in the Pulse report; the weighting is in the Toolkit.
//
// It is still not applied here, for two reasons that are decisions rather than
// research gaps. First, BOTH published instruments divide by TOTAL spending,
// while committedOutflow is deliberately the unskippable subset — so our months
// are always larger than the months those bands describe, and borrowing the
// table would overstate everyone. Second, the Toolkit is "all rights reserved"
// and its own publisher requires a licence for use of the Score in software.
//
// See docs/research/round-11-runway-normalizer.md. Until those two are settled,
// inventing a divisor here would repeat the mistake v69 spent a release fixing.
//
// NULL means "no runway is defined", and it is returned when committed outflow
// is zero or absent — not zero months. Someone who genuinely owes nothing each
// month (the student from the v69 regression test pays for nothing) has an
// unbounded runway, and unbounded is not a quantity this can print. Callers
// OMIT the row, the same contract bmiScore and sleepDurationScore already use.
//
// Zero or negative savings against a real outflow IS zero months, and says so.
// Negative is reachable from a connector reporting net of debt, never from the
// form, which floors at 0.
export function runwayMonths(profile) {
  const outflow = parseFloat(profile.committedOutflow || 0);
  if (!(outflow > 0)) return null;
  const savings = parseFloat(profile.liquidSavings || 0);
  // NaN floors to zero months rather than propagating: `parseFloat("abc")` is
  // NaN, and NaN survives Math.max, so an unguarded version printed the literal
  // string "NaN months" on the Finance page. The outflow side above is already
  // safe because NaN > 0 is false, which returns null and omits the row.
  if (!(savings > 0)) return 0;
  return savings / outflow;
}

// Donation volume vs income, 0-100: 2% of income or 500 THB/mo maxes it.
export function donationVolumeFactor(profile) {
  const donRate = parseFloat(profile.monthlyDonations || 0);
  const donIncRatio = profile.income > 0 ? (donRate / profile.income) * 100 : 0;
  return donIncRatio >= 2 || donRate >= 500 ? 100 : Math.min(100, (donRate / 500) * 100);
}

// Volunteering hours per month, 0-100 (4h maxes it).
export function volunteerFactor(profile) {
  return Math.min(100, (parseFloat(profile.volunteeringHours || 0) / 4) * 100);
}

// --- COMPOSITES (unrounded, shared by onboarding scoring and the monthly
// check-in recalibration so the two can never drift apart) ---

// Mental: equal parts WHO-5 well-being and ST-5 stress resilience.
export function mentalComposite(who5Raw, st5Raw) {
  return 0.5 * who5Score(who5Raw) + 0.5 * st5Resilience(st5Raw);
}

// Relationships: rasRaw === null means "no romantic term" (single) and
// reweights to 0.5/0.5; otherwise 0.4 network / 0.3 loneliness / 0.3 romantic.
export function relationshipsComposite(lsnsRaw, uclaRaw, rasRaw) {
  const network = lsnsScore(lsnsRaw);
  const lowLoneliness = uclaLowLoneliness(uclaRaw);
  if (rasRaw === null || rasRaw === undefined) {
    return 0.5 * network + 0.5 * lowLoneliness;
  }
  return 0.4 * network + 0.3 * lowLoneliness + 0.3 * rasScore(rasRaw);
}

// Personal goals: self-efficacy and active learning habits.
//
// GRIT LEFT THE SCORE IN v64, and deliberately did NOT leave the app.
// Credé, Tynan & Harms 2017 (JPSP 113(3):492-511, doi:10.1037/pspp0000102) meta-
// analysed 88 samples covering 66,807 people: grit correlates with ordinary
// conscientiousness at rho ~= .84, its higher-order structure is not confirmed,
// and it adds under half a percent of incremental variance over the Big Five.
// Scoring it here meant scoring a personality trait as though it were a life
// domain — it cannot move between yearly retests, and a low number reads as a
// verdict on who someone is rather than on how their life is going.
//
// Grit is still asked, still stored, and still SHOWN: as a component bar on the
// aspect page and as a note on the benchmark card. It informs, it no longer
// ranks. That is why gritScore() is still exported.
//
// The two surviving weights are the old 0.4 and 0.3 RENORMALIZED over 0.7,
// not re-picked. So this change is grit's removal and nothing else — the
// relative emphasis of self-efficacy against learning is exactly as it was.
export function personalGoalsComposite(profile, gseRaw) {
  return ((0.4 * gseScore(gseRaw)) + (0.3 * learningScore(profile))) / 0.7;
}

// --- THE EIGHT ASPECT CALCULATORS (onboarding: answers -> 0-100 score) ---

export function calculateFinanceScore(profile, cfpbAnswers) {
  // 1. Subjective CFPB Well-Being Score (5 items, each 0-4, raw 0-20),
  //    converted with the official age-banded table.
  const S_wellbeing = cfpbScore(rawSum(cfpbAnswers), profile.age);

  // 2. Objective income standing, as a MAGNITUDE on the published wage-to-top-
  //    tax-band range — deliberately NOT the percentile the benchmark card
  //    shows. A percentile has to saturate in a long right tail, so scoring by
  //    rank made every income above ~70,000 read as 99; and finance was the
  //    only aspect in the app scored by rank at all. The card still ranks.
  //    Score and rank now answer different questions, and the aspect page says
  //    so rather than leaving the reader to reconcile them.
  const S_income = incomeStandingScore(profile.income, profile.region);

  // THE WEIGHTS CHANGED IN v69, from 0.6/0.4 to 0.15/0.85.
  //
  // Round 10 (docs/research/round-10-finance-composition.md) went looking for a
  // published composite that weights an objective income term at or above 0.5,
  // and found something stronger than a lower number: NO validated instrument
  // scores raw income at any weight. CFPB scores ten subjective items. The
  // Financial Health Network scores eight behavioural indicators across
  // Spend/Save/Borrow/Plan. Netemeyer et al. 2018 (J. Consumer Research 45(1),
  // doi:10.1093/jcr/ucx109) treat income explicitly as an ANTECEDENT of
  // financial well-being rather than a component of it.
  //
  // At 0.6 this term was not supporting the measurement, it was overruling it.
  // Two real people whose CFPB answers put them 36 points apart came out of
  // this function 16 points apart in the OPPOSITE order — the salary decided
  // the score and the five questions about how they are actually coping lost.
  //
  // WHERE 0.15 COMES FROM, and how much of it is inference. CFPB, Making Ends
  // Meet Wave 2, Table 3 (p.11): mean financial well-being runs 44.75 for
  // households at or below $40,000/yr to 58.62 for households above $100,000 —
  // 13.9 points on this same 0-100 scale, across the ENTIRE income
  // distribution. A term whose full range is worth about 14 points of the
  // finished score is a weight near 0.15.
  //
  // That last step is MINE, not the CFPB's. They publish band means, not a
  // weighting, and the sample is American. So 0.15 is an inference from a real
  // published table rather than a published weight — which is still more than
  // 0.6 ever had, and it is recorded here so the next reader can argue with the
  // inference instead of mistaking it for a citation.
  //
  // Income did not leave the app and did not leave the score. It is still
  // asked, still ranked on the benchmark card, still shown on the aspect page,
  // and still the denominator of the savings rate. It stopped being four times
  // louder than the evidence supports.
  //
  // Savings rate modifier (max 10 bonus points) is unchanged.
  return clampScore((0.15 * S_income) + (0.85 * S_wellbeing) + savingsBonus(profile));
}

export function calculatePhysicalScore(profile, jssAnswers) {
  // 1. IPAQ MET-minutes -> activity curve
  const S_activity = activityScore(metMinutes(profile));

  // 2. Asian BMI Standard — OMITTED (not faked at 50) when weight/height are
  // missing. A fabricated "average" silently inflates or deflates the score;
  // instead its 0.2 weight is redistributed across the measured components.
  const S_bmi = bmiScore(profile);

  // 3. Sleep: quality (4 items, each 0-5, raw 0-20) blended with duration,
  // which folds in only when reported (see sleepScore).
  const S_sleep = sleepScore(profile, sleepQualityScore(rawSum(jssAnswers)));

  // 4. Nutrition
  const S_nutrition = nutritionScore(profile);

  // Weighted aggregate. A null component (BMI without measurements) drops out
  // and the surviving weights are renormalized, so nothing is ever imputed.
  const parts = [
    [0.4, S_activity],
    [0.2, S_bmi],
    [0.2, S_sleep],
    [0.2, S_nutrition]
  ].filter(([, value]) => value !== null);
  const totalWeight = parts.reduce((sum, [weight]) => sum + weight, 0);
  const weighted = parts.reduce((sum, [weight, value]) => sum + (weight * value), 0);
  return clampScore(weighted / totalWeight);
}

export function calculateMentalScore(profile, st5Answers, who5Answers) {
  return clampScore(mentalComposite(rawSum(who5Answers), rawSum(st5Answers)));
}

export function calculateRelationshipsScore(profile, lsnsAnswers, uclaAnswers, rasAnswers) {
  const lsnsRaw = rawSum(lsnsAnswers);
  const uclaRaw = rawSum(uclaAnswers);
  if (profile.relationshipStatus === "Single") {
    return clampScore(relationshipsComposite(lsnsRaw, uclaRaw, null));
  }
  // Coupled without RAS answers keeps the coupled weights with a zero romantic
  // term (raw 3 is the RAS scale floor, normalizing to 0) — the onboarding UI
  // always supplies RAS defaults for coupled users, so this path only guards
  // hostile or hand-edited input.
  return clampScore(relationshipsComposite(lsnsRaw, uclaRaw, rasAnswers ? rawSum(rasAnswers) : 3));
}

// `gritAnswers` is no longer a parameter: grit is collected and displayed but
// not scored (see personalGoalsComposite).
export function calculatePersonalGoalsScore(profile, gseAnswers) {
  return clampScore(personalGoalsComposite(profile, rawSum(gseAnswers)));
}

export function calculateSocialContributionScore(profile, ptmAnswers) {
  // PTM Behavior (5 items, each 0-4)
  const qValues = ptmAnswers.map(v => parseInt(v || 0));

  // Donation Score
  const frequencyFactor = qValues[0] * 25; // max 100
  const S_donation = (0.5 * frequencyFactor) + (0.5 * donationVolumeFactor(profile));

  // Volunteering & Prosocial. Both PTM helping items count toward prosocial
  // behavior: Q2 "help friends/family in need" (previously collected but never
  // scored) and Q3 "help strangers".
  const prosocialFactor = ((qValues[1] + qValues[2]) / 8) * 100; // Q2 + Q3
  const S_action = (0.6 * volunteerFactor(profile)) + (0.4 * prosocialFactor);

  // Civic & Local (Q4 & Q5)
  const S_civic = ((qValues[3] + qValues[4]) / 8) * 100;

  return clampScore((0.4 * S_donation) + (0.4 * S_action) + (0.2 * S_civic));
}

export function calculateEnvironmentScore(profile, gebAnswers) {
  // GEB Scale (6 items, each 0-4)
  const qValues = gebAnswers.map(v => parseInt(v || 0));

  // Waste: plastic footprint + recycling (Q1) + single-use avoidance (Q2).
  // Q2 was previously collected but never scored.
  const S_waste = (0.5 * plasticScore(profile)) + (0.25 * (qValues[0] * 25)) + (0.25 * (qValues[1] * 25));

  // Transit (GEB Q3: public transit / walk / cycle frequency)
  const S_transit = qValues[2] * 25;

  // Conservation: energy habits (Q4 & Q5) + eco-product choices (Q6). Q6 was
  // previously collected but never scored.
  const S_conservation = ((qValues[3] + qValues[4] + qValues[5]) / 12) * 100;

  return clampScore((0.4 * S_waste) + (0.4 * S_transit) + (0.2 * S_conservation));
}

export function calculateHumanityFutureScore(profile, lfisAnswers) {
  // LFIS (6 items since v65, 5 before it, each 0-4)
  const qValues = lfisAnswers.map(v => parseInt(v || 0));

  // A save written before v65 holds five answers. `qValues[5]` would then be
  // parseInt(undefined || 0) === 0, scoring every existing user zero on
  // maintaining for a question they were never shown. So the term is only
  // ADDED when its answer exists, and the weights renormalize over the terms
  // actually present: five at 0.20 with maintaining, four at 0.25 without —
  // which is the v64 formula exactly, for a v64 save.
  const hasMaintaining = lfisAnswers.length >= 6;
  const w = hasMaintaining ? 0.2 : 0.25;

  // Future Skills (see the futureStudyScore note on the shared learning hours)
  const Q1_val = qValues[0] * 25;
  const S_skills = (0.5 * futureStudyScore(profile)) + (0.5 * Q1_val);

  // Legacy (Q2)
  const S_legacy = qValues[1] * 25;

  // Offering (Q3 giving to future generations & Q5 passing skills on). Q5 used
  // to ask about global existential-risk causes; since v64 it asks about
  // teaching and handing on what you know, which is the generative act
  // available to someone with no money to give.
  const S_offering = ((qValues[2] + qValues[4]) / 8) * 100;

  // Security (Q4 only). THE PENSION LEFT THIS TERM IN v64. `longTermInvestments`
  // is a financial fact, and Finance already scores the financial facts —
  // income, savings rate and the CFPB well-being items. Counting it here paid
  // one circumstance twice across two aspects, and paid it a third time through
  // the percentile band it used to gate (see humanityFutureBenchmark).
  //
  // The field is still collected and still shown on the aspect page; it simply
  // scores nothing until Finance has a cited basis for scoring it, which is a
  // separate question from this one and is not answered yet.
  const S_security = qValues[3] * 25;

  // Maintaining (Q6, ADDED IN v65). The third facet of McAdams & de St. Aubin's
  // generative action — creating, maintaining, offering — and the one this
  // instrument had no item for. Keeping a home, tools, land, animals or
  // something shared in working order is a contribution to the people who come
  // after you, and it is the contribution available to someone whose work is
  // maintenance rather than creation. See
  // docs/research/round-8-generative-behavior-checklist.md.
  const S_maintaining = (qValues[5] || 0) * 25;

  const base = (w * S_skills) + (w * S_legacy) + (w * S_offering) + (w * S_security);
  return clampScore(hasMaintaining ? base + (w * S_maintaining) : base);
}

// --- WEEKLY REVIEW (measured re-scoring) ---

// The per-aspect score deltas implied by a weekly review changing the measured
// profile fields, computed through the SAME formulas as onboarding so measured
// scores can never drift from the calculators above.
//
// Physical is fully re-measured (activity + sleep duration + nutrition all
// live in the weekly fields), so its delta is a whole-calculator difference —
// which also inherits the null-BMI weight renormalization for free. Every
// other aspect only has ONE OR TWO weekly inputs, so its delta is that
// component's change times its published weight chain. Deltas rather than
// overwrites: check-in and deep-assessment adjustments on the current score
// are preserved. mental/relationships have no weekly-measured inputs and are
// never shifted (sleep feeds physical, not mental).
//
// There is deliberately NO ±cap here: these are re-measurements through the
// same formulas onboarding runs uncapped, the inputs are range-validated, and
// each non-physical delta is structurally bounded by its weight product. The
// ±15 cap belongs to the survey re-assessment, where retake noise is real.
export function weeklyAspectShifts(oldProfile, newProfile, baseline) {
  const jss = [Number(baseline && baseline.jss) || 0];
  const deltas = {
    physical: calculatePhysicalScore(newProfile, jss) - calculatePhysicalScore(oldProfile, jss),
    finance: savingsBonus(newProfile) - savingsBonus(oldProfile),
    personalGoals: (0.3 / 0.7) * (learningScore(newProfile) - learningScore(oldProfile)),
    socialContribution:
      (0.4 * 0.5) * (donationVolumeFactor(newProfile) - donationVolumeFactor(oldProfile))
      + (0.4 * 0.6) * (volunteerFactor(newProfile) - volunteerFactor(oldProfile)),
    environment: (0.4 * 0.5) * (plasticScore(newProfile) - plasticScore(oldProfile)),
    humanityFuture: (0.25 * 0.5) * (futureStudyScore(newProfile) - futureStudyScore(oldProfile))
  };
  const shifts = {};
  for (const [aspect, delta] of Object.entries(deltas)) {
    const rounded = Math.round(delta);
    if (rounded !== 0) shifts[aspect] = rounded;
  }
  return shifts;
}

// The CFPB financial well-being table is age-banded (18-61 vs 62+), so a
// birthday that crosses 62 genuinely changes the finance score.
//
// Returned as a DELTA, never a recompute. The stored score carries every
// check-in and deep-assessment adjustment the user has accumulated; rebuilding
// it from the profile would silently discard all of them, and the user would
// see months of re-assessment vanish on a birthday with no explanation. Same
// reasoning, same shape as weeklyAspectShifts above.
//
// Wrapping the stored sum as [sum] is the established idiom here: rawSum of a
// one-element array is that element, so a stored total feeds a calculator that
// expects raw answers.
export function ageBandShifts(profile, oldAge, newAge, baseline) {
  const cfpb = [Number(baseline && baseline.cfpb) || 0];
  const delta = calculateFinanceScore({ ...profile, age: newAge }, cfpb)
    - calculateFinanceScore({ ...profile, age: oldAge }, cfpb);
  const rounded = Math.round(delta);
  return rounded === 0 ? {} : { finance: rounded };
}

// The per-aspect score deltas implied by a MANUAL profile edit (the Profile
// page: demographics, income, body metrics, digital literacy, investments)
// changing score-affecting fields. Same delta philosophy as weeklyAspectShifts
// and ageBandShifts: recompute through the SAME formulas onboarding uses, apply
// the difference so accumulated check-in/deep/weekly adjustments survive.
//
// finance/physical are whole-calculator diffs over the stored [sum] (those
// calculators rawSum their answers internally, so a one-element array feeds
// them correctly — the established idiom). humanityFuture/personalGoals/
// socialContribution use component-weight diffs because their calculators read
// positional answer arrays that a single stored sum cannot reconstruct; only
// the profile-driven term of each moves, and its published weight chain is
// applied to the change.
//
// Deliberately absent: mental (no profile-driven term) and relationships. A
// Single<->Coupled flip SHOULD change the relationships weighting, but there
// are no romantic-satisfaction (RAS) answers on file for a user who onboarded
// single, so fabricating a delta would invent data — the score refines at the
// next monthly check-in instead, and the Profile page says so.
export function profileEditShifts(oldProfile, newProfile, baseline) {
  const cfpb = [Number(baseline && baseline.cfpb) || 0];
  const jss = [Number(baseline && baseline.jss) || 0];
  const deltas = {
    // income, region, age (CFPB band), savings all live inside this calculator
    finance: calculateFinanceScore(newProfile, cfpb) - calculateFinanceScore(oldProfile, cfpb),
    // weight/height -> BMI (plus any behavioural field, unchanged here)
    physical: calculatePhysicalScore(newProfile, jss) - calculatePhysicalScore(oldProfile, jss),
    // digital literacy (half of learningScore), (0.3/0.7)-weighted since v64
    personalGoals: (0.3 / 0.7) * (learningScore(newProfile) - learningScore(oldProfile)),
    // income moves the donation-to-income ratio, 0.4*0.5 into the aspect
    socialContribution: (0.4 * 0.5) * (donationVolumeFactor(newProfile) - donationVolumeFactor(oldProfile)),
    // Shared learning hours (futureStudy term, 0.25*0.5) are now the only future
    // field on this page: the pension term left the aspect in v64.
    humanityFuture: (0.25 * 0.5) * (futureStudyScore(newProfile) - futureStudyScore(oldProfile))
  };
  const shifts = {};
  for (const [aspect, delta] of Object.entries(deltas)) {
    const rounded = Math.round(delta);
    if (rounded !== 0) shifts[aspect] = rounded;
  }
  return shifts;
}

// --- DEEP (LONG-FORM) INSTRUMENTS ---

// Deep raw sum -> 0-100. Shared by deepAspectScore below and the component
// rows in aspects.js, so the recalibration math and the bar on the page are
// the same formula by construction.
export const DEEP_NORM = {
  cfpb10: (v, age) => cfpb10Score(v, age), // CFPB-10, raw 0-40, official table
  sedentary: v => (v / 12) * 100, // sitting time + sleep hygiene, raw 0-12
  pss10: v => 100 - (v / 40) * 100, // PSS-10 stress raw 0-40, inverted
  lsnsR: v => (v / 60) * 100, // LSNS-R 12 items, raw 0-60
  ras7: v => ((v - 7) / 28) * 100, // RAS-7, raw 7-35
  gse10: v => ((v - 10) / 30) * 100, // GSE-10, raw 10-40
  grit12: v => ((v - 12) / 48) * 100, // Grit 12 items, raw 12-60
  rses: v => (v / 30) * 100, // Rosenberg self-esteem, raw 0-30
  civicplus: v => (v / 16) * 100, // extra giving/civic habits, raw 0-16
  greenplus: v => (v / 16) * 100, // extra green habits, raw 0-16
  cfc12: v => ((v - 12) / 48) * 100 // CFC-12 future orientation, raw 12-60
};

// Recompute one aspect from the deep instruments. Uses delta/blend forms that
// adjust the CURRENT score by the change the fuller instrument implies, so any
// logged drift or check-in shift is preserved. Returns null if the aspect's
// deep instruments aren't captured yet.
export function deepAspectScore(aspectKey, profile, baseline, currentScore) {
  const d = (baseline && baseline.deep) || null;
  if (!d) return null;
  const has = k => Number.isFinite(d[k]);
  const num = x => Number(x) || 0;

  switch (aspectKey) {
    case "finance": {
      // Swap CFPB-5 for CFPB-10 in the 0.4-weighted well-being term. Both
      // sides use the official tables so the delta is metric-coherent.
      if (!has("cfpb10")) return null;
      return clampScore(currentScore + 0.4 * (DEEP_NORM.cfpb10(d.cfpb10, profile.age) - cfpbScore(num(baseline.cfpb), profile.age)));
    }
    case "physical": {
      // Blend in sedentary/sleep-hygiene self-report at 15%.
      if (!has("sedentary")) return null;
      return clampScore(0.85 * currentScore + 0.15 * DEEP_NORM.sedentary(d.sedentary));
    }
    case "mental": {
      // Average the PSS-10 stress reading into the ST-5 stress half.
      if (!has("pss10")) return null;
      return clampScore(currentScore + 0.25 * (DEEP_NORM.pss10(d.pss10) - st5Resilience(num(baseline.st5))));
    }
    case "relationships": {
      // Swap LSNS-6 for LSNS-R, and (coupled) RAS-3 for RAS-7.
      let score = currentScore;
      if (has("lsnsR")) {
        const w = profile.relationshipStatus === "Single" ? 0.5 : 0.4;
        score += w * (DEEP_NORM.lsnsR(d.lsnsR) - lsnsScore(num(baseline.lsns)));
      }
      if (has("ras7") && profile.relationshipStatus !== "Single" && Number.isFinite(baseline.ras)) {
        score += 0.3 * (DEEP_NORM.ras7(d.ras7) - rasScore(num(baseline.ras)));
      }
      return clampScore(score);
    }
    case "personalGoals": {
      // Swap GSE-6->GSE-10, then blend in Rosenberg self-esteem at 15%.
      //
      // The GSE weight tracks the composite: 0.4/0.7 after grit's removal in
      // v64, not the old flat 0.4. A deep swap has to be worth what the thing
      // it replaces is worth, or the deep section quietly re-weights the aspect.
      //
      // The Grit-12 line is gone with it. Grit-12 is still offered and still
      // stored — it sharpens the grit READOUT, which is now the only thing grit
      // does. Adjusting the score by a 0.3-weighted grit delta on an aspect
      // that no longer scores grit at all would have been the exact drift the
      // aspect-parity tests exist to catch.
      let score = currentScore;
      if (has("gse10")) score += (0.4 / 0.7) * (DEEP_NORM.gse10(d.gse10) - gseScore(num(baseline.gse)));
      if (has("rses")) score = 0.85 * score + 0.15 * DEEP_NORM.rses(d.rses);
      return clampScore(score);
    }
    case "socialContribution": {
      if (!has("civicplus")) return null;
      return clampScore(0.8 * currentScore + 0.2 * DEEP_NORM.civicplus(d.civicplus));
    }
    case "environment": {
      if (!has("greenplus")) return null;
      return clampScore(0.8 * currentScore + 0.2 * DEEP_NORM.greenplus(d.greenplus));
    }
    case "humanityFuture": {
      // Blend in Consideration of Future Consequences at 20%.
      if (!has("cfc12")) return null;
      return clampScore(0.8 * currentScore + 0.2 * DEEP_NORM.cfc12(d.cfc12));
    }
    default:
      return null;
  }
}
