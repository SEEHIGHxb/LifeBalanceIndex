// aspects.js - Per-aspect detail: sub-score components and trend series.
//
// Components use the SAME normalizers from scoring.js that onboarding scoring
// uses (single source of truth, finding #13) but are computed from what the
// save actually stores (profile fields + baseline raw instrument sums), so
// they stay correct after re-loads. Components that need a survey baseline
// are omitted for saves made before it existed.
//
// EVERY component value here must be a CALL into scoring.js, never arithmetic
// written out again. The #13 dedup originally only caught formulas that already
// had a name; five rows were inline object-literal expressions, invisible to it,
// and two of those (giving, sleep) had silently drifted from the scorer by the
// time they were found. tests/aspect-parity.test.mjs now pins each row to its
// scoring.js counterpart, so a re-inlined formula fails the build.

import { getAllBenchmarks } from "./benchmarks.js";
import { t, tp } from "./i18n.js";
import {
  clamp100,
  cfpbScore,
  who5Score,
  st5Resilience,
  lsnsScore,
  uclaLowLoneliness,
  rasScore,
  gseScore,
  citAccScore,
  gritScore,
  metMinutes,
  activityScore,
  bmiScore,
  sleepQualityScore,
  sleepDurationScore,
  sleepScore,
  nutritionScore,
  plasticScore,
  learningScore,
  futureStudyScore,
  savingsAmountFrom,
  runwayMonths,
  totalCommittedOutflow,
  donationVolumeFactor,
  volunteerFactor,
  DEEP_NORM
} from "./scoring.js";
import { DEEP_SECTIONS } from "./surveys.js";

export const ASPECT_KEYS = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

export const ASPECT_META = {
  finance: { label: "Finance", blurb: "Income standing, financial well-being, and savings habits." },
  physical: { label: "Physical", blurb: "Weekly activity, body composition, sleep, and nutrition." },
  mental: { label: "Mental", blurb: "Well-being (WHO-5) and stress resilience (Thai DMH ST-5)." },
  relationships: { label: "Relationships", blurb: "Social network strength, loneliness, and romantic satisfaction." },
  personalGoals: { label: "Personal Goals", blurb: "Goal progress, self-efficacy, and active learning habits." },
  socialContribution: { label: "Social Contribution", blurb: "Giving, volunteering, and prosocial habits." },
  environment: { label: "Environment", blurb: "Plastic footprint and everyday green behavior." },
  humanityFuture: { label: "Humanity's Future", blurb: "Future skills, future orientation, and maintaining what lasts." }
};

// --- CONFIDENCE (Phase 2a) ---
//
// Each component maps to the Phase-1 coverage keys it depends on: `fields`
// read profile.provided, `instruments` read baseline.answered. A component is
// "high" when every input was answered, "estimated" when none were (pure
// defaults), "partial" in between, and null when coverage was never captured
// (older saves) or the input isn't tracked. Aspect confidence is the same
// ratio over the union of its components' inputs — "answered / total".
export const COMPONENT_COVERAGE = {
  finance: {
    income: { fields: ["income"] },
    cfpb: { instruments: ["cfpb"] },
    // The user types an amount; savingsRate is derived from it (scoring.js
    // savingsRateFrom). Coverage has to follow the field they actually touch.
    savings: { fields: ["monthlySavings"] }
  },
  physical: {
    activity: { fields: ["weeklyVigorousDays", "weeklyVigorousMins", "weeklyModerateDays", "weeklyModerateMins", "weeklyWalkingDays", "weeklyWalkingMins"] },
    body: { fields: ["weight", "height"] },
    sleep: { fields: ["sleepHours"], instruments: ["jss"] },
    nutrition: { fields: ["vegetablePortions", "waterLiters"] }
  },
  mental: {
    who5: { instruments: ["who5"] },
    st5: { instruments: ["st5"] }
  },
  relationships: {
    lsns: { instruments: ["lsns"] },
    ucla: { instruments: ["ucla"] },
    ras: { instruments: ["ras"] }
  },
  personalGoals: {
    gse: { instruments: ["gse"] },
    accomplishment: { instruments: ["citacc"] },
    grit: { instruments: ["grit"] },
    learning: { fields: ["weeklyLearningHours"], instruments: ["citlearn"] }
  },
  socialContribution: {
    giving: { fields: ["monthlyDonations"] },
    volunteering: { fields: ["volunteeringHours"] },
    ptm: { instruments: ["ptm"] }
  },
  environment: {
    plastic: { fields: ["singleUsePlastics"] },
    geb: { instruments: ["geb"] }
  },
  humanityFuture: {
    skills: { fields: ["weeklyLearningHours"] },
    lfis: { instruments: ["lfis"] }
  }
};

// One input's coverage: true/false when known, null when the relevant map is
// absent (a save that never captured coverage → "unknown").
function inputAnswered(key, map) {
  if (!map || typeof map !== "object") return null;
  return map[key] === true;
}

function tierFrom(yes, total) {
  if (total === 0) return null;
  if (yes === total) return "high";
  if (yes === 0) return "estimated";
  return "partial";
}

// Known (non-null) coverage results for one component's inputs.
function componentCoverageResults(cov, provided, answered) {
  const results = [];
  for (const f of cov.fields || []) results.push(inputAnswered(f, provided));
  for (const i of cov.instruments || []) results.push(inputAnswered(i, answered));
  return results.filter(r => r !== null);
}

function componentConfidence(aspectKey, compKey, provided, answered) {
  const cov = (COMPONENT_COVERAGE[aspectKey] || {})[compKey];
  if (!cov) return null;
  const known = componentCoverageResults(cov, provided, answered);
  if (known.length === 0) return null;
  return tierFrom(known.filter(Boolean).length, known.length);
}

// Aspect-level tier: answered inputs / total inputs, deduped across components.
// RAS is skipped for single users (its component is never rendered for them).
export function getAspectConfidence(state, aspectKey) {
  const p = (state && state.profile) || {};
  const b = (state && state.baseline) || null;
  const provided = p.provided;
  const answered = b ? b.answered : null;
  const cov = COMPONENT_COVERAGE[aspectKey] || {};
  const seen = new Map(); // key -> answered? (dedupes inputs shared across components)
  for (const [compKey, entry] of Object.entries(cov)) {
    if (compKey === "ras" && p.relationshipStatus === "Single") continue;
    for (const f of entry.fields || []) {
      const r = inputAnswered(f, provided);
      if (r !== null) seen.set("f:" + f, r);
    }
    for (const i of entry.instruments || []) {
      const r = inputAnswered(i, answered);
      if (r !== null) seen.set("i:" + i, r);
    }
  }
  const yes = [...seen.values()].filter(Boolean).length;
  const result = { tier: tierFrom(yes, seen.size), answered: yes, total: seen.size };
  // A completed deep (long-form) section outranks every short-form tier: the
  // aspect has been measured with full validated instruments.
  if (isAspectDeepVerified(state, aspectKey)) {
    return { ...result, tier: "verified", verified: true };
  }
  return result;
}

// True once the user has completed this aspect's optional deep section.
export function isAspectDeepVerified(state, aspectKey) {
  return Boolean(state && state.baseline && state.baseline.deepDone && state.baseline.deepDone[aspectKey]);
}

// Extra component rows sourced from the deep (long-form) instruments, shown only
// once a deep section is completed. Each is flagged "verified" so the UI can
// mark it. Values are the deep instrument's normalized 0-100 sub-score.
function deepComponents(aspectKey, b, p) {
  const d = (b && b.deep) || null;
  if (!d) return [];
  const has = k => Number.isFinite(d[k]);
  const row = (key, label, value, detail) => ({ key, label, value: clamp100(value), detail, confidence: "verified" });
  switch (aspectKey) {
    case "finance":
      return has("cfpb10") ? [row("cfpb10", t("Financial well-being (CFPB-10)"), DEEP_NORM.cfpb10(d.cfpb10, p && p.age), tp("Full 10-item scale — raw {n}/40, converted with the CFPB's official scoring table", { n: d.cfpb10 }))] : [];
    case "physical":
      return has("sedentary") ? [row("sedentary", t("Sedentary time & sleep hygiene"), DEEP_NORM.sedentary(d.sedentary), tp("Sitting time + sleep habits — raw {n}/12", { n: d.sedentary }))] : [];
    case "mental":
      return has("pss10") ? [row("pss10", t("Perceived stress (PSS-10)"), DEEP_NORM.pss10(d.pss10), tp("Stress {n}/40, inverted (lower stress scores higher)", { n: d.pss10 }))] : [];
    case "relationships": {
      const rows = [];
      if (has("lsnsR")) rows.push(row("lsnsR", t("Social network (LSNS-R)"), DEEP_NORM.lsnsR(d.lsnsR), tp("Full 12-item network scale — raw {n}/60", { n: d.lsnsR })));
      if (has("ras7")) rows.push(row("ras7", t("Relationship quality (RAS-7)"), DEEP_NORM.ras7(d.ras7), tp("Full 7-item scale — raw {n}/35", { n: d.ras7 })));
      return rows;
    }
    case "personalGoals": {
      const rows = [];
      if (has("gse10")) rows.push(row("gse10", t("Self-efficacy (GSE-10)"), DEEP_NORM.gse10(d.gse10), tp("Full 10-item scale — raw {n}/40", { n: d.gse10 })));
      if (has("grit12")) rows.push(row("grit12", t("Grit (12-item)"), DEEP_NORM.grit12(d.grit12), tp("Full 12-item scale — raw {n}/60", { n: d.grit12 })));
      if (has("rses")) rows.push(row("rses", t("Self-esteem (Rosenberg)"), DEEP_NORM.rses(d.rses), tp("Rosenberg scale — raw {n}/30", { n: d.rses })));
      return rows;
    }
    case "socialContribution":
      return has("civicplus") ? [row("civicplus", t("Giving & civic habits"), DEEP_NORM.civicplus(d.civicplus), tp("Additional habits — raw {n}/16", { n: d.civicplus }))] : [];
    case "environment":
      return has("greenplus") ? [row("greenplus", t("Green habits (extended)"), DEEP_NORM.greenplus(d.greenplus), tp("Additional habits — raw {n}/16", { n: d.greenplus }))] : [];
    case "humanityFuture":
      return has("cfc12") ? [row("cfc12", t("Future orientation (CFC-12)"), DEEP_NORM.cfc12(d.cfc12), tp("Full 12-item scale — raw {n}/60", { n: d.cfc12 }))] : [];
    default:
      return [];
  }
}

function financeComponents(p, b, benchmark) {
  const items = [];
  if (benchmark) {
    items.push({ key: "income", label: t("Income standing"), value: benchmark.percentile, detail: t("Percentile vs Thai worker earnings (estimate)") });
  }
  if (b && Number.isFinite(b.cfpb)) {
    items.push({ key: "cfpb", label: t("Financial well-being (CFPB)"), value: clamp100(cfpbScore(b.cfpb, p.age)), detail: tp("Raw {n}/20 — converted with the CFPB's official scoring table (self-administered)", { n: b.cfpb }) });
  }
  // Saving used to occupy a bar here. It moved to aspectFacts in v76, when
  // round 14 removed the term that scored it -- a bar that looks exactly like
  // the two above it and counts for nothing is the failure mode the grit row
  // documents, and unlike grit this one had no published divisor to rank
  // against either.
  return items;
}

function physicalComponents(p, b) {
  const met = metMinutes(p);
  const items = [
    { key: "activity", label: t("Activity"), value: clamp100(activityScore(met)), detail: tp("{met} MET-min/week (WHO guideline 600)", { met: Math.round(met) }) }
  ];
  // Omit body composition entirely when weight/height are missing, rather than
  // reporting a made-up average that reads like a genuine measurement.
  const bmi = bmiScore(p);
  if (bmi !== null) {
    items.push({ key: "body", label: t("Body composition"), value: clamp100(bmi), detail: t("Asian BMI bands (18.5-22.9 ideal)") });
  }
  // Sleep, on the same terms as calculatePhysicalScore: an unreported duration
  // is omitted rather than floored at 50, so the label and the caption say
  // which halves were actually measured. Neither half measured = no row.
  const durationScore = sleepDurationScore(p);
  if (b && Number.isFinite(b.jss)) {
    const quality = sleepQualityScore(b.jss);
    if (durationScore === null) {
      items.push({ key: "sleep", label: t("Sleep quality"), value: clamp100(sleepScore(p, quality)), detail: tp("Baseline quality {jss}/20 issues — no sleep duration recorded", { jss: b.jss }) });
    } else {
      items.push({ key: "sleep", label: t("Sleep"), value: clamp100(sleepScore(p, quality)), detail: tp("{h}h/night + baseline quality {jss}/20 issues", { h: p.sleepHours, jss: b.jss }) });
    }
  } else if (durationScore !== null) {
    items.push({ key: "sleep", label: t("Sleep duration"), value: clamp100(durationScore), detail: tp("{h}h/night (7-9h ideal)", { h: p.sleepHours }) });
  }
  items.push({ key: "nutrition", label: t("Nutrition"), value: clamp100(nutritionScore(p)), detail: tp("{veg} veg portions, {water}L water/day", { veg: p.vegetablePortions || 0, water: p.waterLiters || 0 }) });
  return items;
}

function mentalComponents(b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.who5)) {
    items.push({ key: "who5", label: t("Well-being (WHO-5)"), value: clamp100(who5Score(b.who5)), detail: tp("Raw {n}/25 at baseline (scores under 50/100 suggest low mood)", { n: b.who5 }) });
  }
  if (Number.isFinite(b.st5)) {
    items.push({ key: "st5", label: t("Stress resilience (ST-5)"), value: clamp100(st5Resilience(b.st5)), detail: tp("Stress {n}/15 — DMH bands: 0-4 fine, 5-6 watch, 7+ problem", { n: b.st5 }) });
  }
  return items;
}

function relationshipsComponents(p, b) {
  if (!b) return [];
  const items = [];
  if (Number.isFinite(b.lsns)) {
    items.push({ key: "lsns", label: t("Social network (LSNS-6)"), value: clamp100(lsnsScore(b.lsns)), detail: tp("Raw {n}/30 (under 12 = isolation risk)", { n: b.lsns }) });
  }
  if (Number.isFinite(b.ucla)) {
    items.push({ key: "ucla", label: t("Low loneliness (UCLA-3)"), value: clamp100(uclaLowLoneliness(b.ucla)), detail: tp("Loneliness {n}/9, inverted (higher bar = less lonely)", { n: b.ucla }) });
  }
  if (p.relationshipStatus !== "Single" && Number.isFinite(b.ras) && b.ras !== null) {
    items.push({ key: "ras", label: t("Romantic satisfaction (RAS)"), value: clamp100(rasScore(b.ras)), detail: tp("Raw {n}/15 at baseline", { n: b.ras }) });
  }
  return items;
}

function personalGoalsComponents(p, b) {
  const items = [];
  if (b && Number.isFinite(b.gse)) {
    items.push({ key: "gse", label: t("Self-efficacy (GSE)"), value: clamp100(gseScore(b.gse)), detail: tp("Raw {n}/24 at baseline", { n: b.gse }) });
  }
  // Goal progress, the only term that measures the thing the aspect is named
  // after (v72). Scored, but never ranked -- see the citacc note in surveys.js.
  if (b && Number.isFinite(b.citacc)) {
    items.push({ key: "accomplishment", label: t("Goal progress"), value: clamp100(citAccScore(b.citacc)), detail: tp("CIT Accomplishment, raw {n}/15 — not ranked against a norm", { n: b.citacc }) });
  }
  // Shown but NOT scored since v64. The bar deliberately stays: grit is worth
  // knowing about yourself, it just isn't a life domain (see
  // personalGoalsComposite). The detail line says so, because a bar that looks
  // exactly like the scored ones and quietly counts for nothing would be worse
  // than removing it outright.
  if (b && Number.isFinite(b.grit)) {
    items.push({ key: "grit", scored: false, label: t("Grit (perseverance)"), value: clamp100(gritScore(b.grit)), detail: tp("Not scored — shown for information. Perseverance facet only, {g}/5 vs the ~3.4 full-scale reference.", { g: (b.grit / 4).toFixed(1) }) });
  }
  // v73: the second half of this bar is the CIT Learning subscale. A baseline
  // written before v73 has no sum, and the bar then reads the retired
  // digital-literacy slider exactly as it did before — same detail line, so an
  // old save is never described in terms of a question it was not asked.
  if (b && Number.isFinite(b.citlearn)) {
    items.push({ key: "learning", label: t("Active learning"), value: clamp100(learningScore(p, b.citlearn)), detail: tp("{h}h/week study + CIT Learning {n}/15 — not ranked against a norm", { h: p.weeklyLearningHours || 0, n: b.citlearn }) });
  } else {
    const digital = Math.max(0, Math.min(100, parseFloat(p.digitalLiteracy || 0)));
    items.push({ key: "learning", label: t("Active learning"), value: clamp100(learningScore(p)), detail: tp("{h}h/week study + digital skills {d}/100", { h: p.weeklyLearningHours || 0, d: digital }) });
  }
  return items;
}

function socialContributionComponents(p, b) {
  const don = parseFloat(p.monthlyDonations || 0);
  const items = [
    // Both caps are named, because the score honours both: 500 THB/mo is the
    // flat one, 2% of income the proportional one, whichever comes first.
    { key: "giving", label: t("Giving"), value: clamp100(donationVolumeFactor(p)), detail: tp("{thb} THB/month (500+/mo, or 2% of income, maxes this)", { thb: Math.round(don).toLocaleString() }) },
    { key: "volunteering", label: t("Volunteering"), value: clamp100(volunteerFactor(p)), detail: tp("{h}h/month (4h+ maxes this)", { h: p.volunteeringHours || 0 }) }
  ];
  if (b && Number.isFinite(b.ptm)) {
    items.push({ key: "ptm", label: t("Prosocial habits (PTM)"), value: clamp100((b.ptm / 20) * 100), detail: tp("Raw {n}/20 at baseline", { n: b.ptm }) });
  }
  return items;
}

function environmentComponents(p, b) {
  const items = [
    { key: "plastic", label: t("Plastic reduction"), value: clamp100(plasticScore(p)), detail: tp("{n} single-use pieces/day (Thai avg ~3)", { n: p.singleUsePlastics || 0 }) }
  ];
  if (b && Number.isFinite(b.geb)) {
    items.push({ key: "geb", label: t("Green habits (GEB)"), value: clamp100((b.geb / 24) * 100), detail: tp("Raw {n}/24 at baseline", { n: b.geb }) });
  }
  return items;
}

function humanityFutureComponents(p, b) {
  // NOTE: `weeklyLearningHours` intentionally feeds both this "Future skills"
  // component and Personal Growth's "Active learning" — learning time is
  // genuinely evidence for both future-proofing and personal development. The
  // reuse is surfaced to the user in the detail line below so it is not silent.
  const items = [
    { key: "skills", label: t("Future skills"), value: clamp100(futureStudyScore(p)), detail: tp("{h}h/week toward future-proof skills — reuses your weekly learning hours", { h: p.weeklyLearningHours || 0 }) },
    // NO "security" COMPONENT. v64 stopped scoring it, round 9 (v67) confirmed
    // it should never be scored, and v68 stopped asking the question — so
    // displaying a row that reads 0 for everyone who was never asked is worse
    // than displaying nothing. `profile.longTermInvestments` still exists and
    // is still settable by the Midori connector, whose FACT_SPECS contract
    // publishes `hasLongTermInvestments`; it is now a stored fact with no UI
    // and no score. `liquidSavings` left that held-for-later state in v70,
    // where it became a profile field feeding the runway fact above; the
    // Midori FACT of the same name is still unconsumed, because that connector
    // reports TOTAL spending and runway needs committed outflow.
    // See docs/research/round-9-retirement-assets-in-finance.md.
  ];
  if (b && Number.isFinite(b.lfis)) {
    // 4 points per item, and the item count changed from 5 to 6 in v65. A save
    // from before that carries no `lfisItems` and is on the 0-20 scale, so the
    // fallback is 5 and deliberately NOT the current instrument length —
    // reading the live length here would silently restate every old baseline
    // as a fifth lower than it was measured.
    const lfisMax = (b.lfisItems || 5) * 4;
    items.push({ key: "lfis", label: t("Future orientation (LFIS)"), value: clamp100((b.lfis / lfisMax) * 100), detail: tp("Raw {n}/{max} at baseline", { n: b.lfis, max: lfisMax }) });
  }
  return items;
}

// --- THE TWO RUNWAY INPUTS (v79) ---
//
// The runway is the only figure in this app assembled from numbers the reader
// may decline to give. Both were `required: true` in onboarding until v79,
// which meant the mandatory gate in front of the whole app asked for a
// household's cash position to produce a figure that is, by round 11's
// permanent decision, never scored and never ranked.
//
// The cost of making them optional is that `liquidSavings: 0` stops being one
// fact. It is now either "I have nothing I could reach this week" or "I did
// not answer that", and only the coverage map can tell them apart. These two
// helpers are the single place that distinction is drawn, so the row and the
// invitation to fill it can never disagree about which inputs are missing.
const RUNWAY_INPUTS = ["liquidSavings", "committedOutflow"];

// Which runway inputs the reader is KNOWN not to have given. Empty when the
// coverage map is absent: that is "unknown", not "missing" (inputAnswered
// above draws the same line), and on such a save the fields were required, so
// treating silence as a skip would blank a row its owner did answer.
export function runwayInputsMissing(p = {}) {
  const provided = p.provided;
  if (!provided || typeof provided !== "object") return [];
  return RUNWAY_INPUTS.filter(k => provided[k] !== true);
}

// The Finance page's invitation to supply them, shown exactly when they are
// the reason no runway is printed. Returned as DATA, not markup, so the rule
// for when it appears is testable without a DOM — and so it can never drift
// from runwayInputsMissing, which decides whether the row is there at all.
export function runwayInvite(p = {}) {
  if (runwayInputsMissing(p).length === 0) return null;
  return {
    label: t("Runway"),
    text: t("Not shown yet. It needs two numbers: the savings you could reach this week, and what you cannot skip in a month. Give both and this page will show how long you could cover the unskippable if income stopped. Like everything in this section it is reported to you, not scored — no published distribution says what a given number of months is worth, so there is no ranking to gain or lose by answering."),
    href: "#/profile",
    linkLabel: t("Add them on the Profile page")
  };
}

// --- FACTS: MEASURED, NOT SCORED (v70) ---
//
// A second, separate list from `components`, and separate on purpose. Every
// component carries a 0-100 value and renders as a bar; a fact carries a
// FORMATTED STRING and renders as a line. Grit is the precedent for showing an
// unscored number, but grit had a published normalizer and so could honestly
// occupy a bar with `scored: false` on it. Runway has no normalizer at all —
// that is the open question round 11 exists to answer — so giving it a bar
// would mean inventing the very divisor the app is refusing to invent. A fact
// with no bar cannot silently acquire a weight.
function aspectFacts(aspectKey, p) {
  if (aspectKey === "socialContribution") return socialContributionFacts(p);
  if (aspectKey !== "finance") return [];
  const facts = [];

  // Saving, reported since v76. Both figures the user can check: the baht they
  // entered and the share of income it works out to. No bar and no target,
  // because round 14 found the 20% the old bar divided by was a trade-paperback
  // budgeting rule rather than a published threshold. Omitted rather than shown
  // as 0% when there is no income to divide by — same contract as runway.
  const rate = parseFloat(p.savingsRate || 0);
  if (rate > 0 && parseFloat(p.income || 0) > 0) {
    facts.push({
      key: "savings",
      label: t("Monthly saving"),
      display: tp("{thb} THB/mo", {
        thb: savingsAmountFrom(p.savingsRate, p.income).toLocaleString()
      }),
      detail: tp("{rate}% of your income. Not scored — the CFPB questions already ask whether you have money left over at the end of the month, and no published source says what savings rate is good enough to count.", {
        rate: Math.round(rate * 10) / 10
      })
    });
  }

  // Since v79 both runway inputs are optional in onboarding, which gives a
  // stored 0 two meanings it did not have before: someone who has none, and
  // someone who skipped the box. runwayMonths cannot tell them apart — it
  // sees 0 either way and returns "0 months", which would put a sentence about
  // this reader's finances on screen that the reader never said. So the check
  // is made HERE, against the coverage flags, before the row is built.
  //
  // Both inputs are required, not just the numerator: skipping the outflow box
  // while filling in family support leaves a denominator that is only part of
  // what cannot be skipped, and an understated denominator OVERSTATES the
  // runway — the more dangerous direction of the two.
  //
  // An absent `provided` map reads as unknown rather than as missing, the same
  // convention inputAnswered uses above: those saves predate coverage capture,
  // and on them the field was required, so their owners did answer and their
  // row must keep rendering.
  const months = runwayInputsMissing(p).length > 0 ? null : runwayMonths(p);
  // null = no committed outflow on file, so no runway is defined. Omitted
  // rather than printed as zero or as infinity — same contract as bmiScore.
  if (months === null) return facts;
  facts.push({
    key: "runway",
    label: t("Runway"),
    // One decimal: the inputs are self-reported round numbers, and a second
    // decimal would claim a precision neither of them has.
    display: tp("{n} months", { n: Math.round(months * 10) / 10 }),
    detail: tp("{savings} THB you could reach this week ÷ {outflow} THB/mo you cannot skip. Not scored — no published distribution says what a given number of months is worth, so this is reported to you rather than ranked.", {
      savings: Math.round(parseFloat(p.liquidSavings || 0)).toLocaleString(),
      // The denominator is committed outflow PLUS family support (v78). Both
      // halves are named in the line below when the second one is non-zero, so
      // the arithmetic on screen adds up to the number printed here.
      outflow: Math.round(totalCommittedOutflow(p)).toLocaleString()
    })
  });
  const family = Math.round(parseFloat(p.familySupport || 0));
  if (family > 0) {
    facts.push({
      key: "familySupport",
      label: t("Of which, family support"),
      display: tp("{thb} THB/mo", { thb: family.toLocaleString() }),
      detail: t("Counted in the runway above, because it does not stop when income does. It is also reported on your Social Contribution page, where it is giving rather than a bill.")
    });
  }
  return facts;
}

// --- FAMILY SUPPORT: MEASURED, DELIBERATELY NOT RANKED (v78) ---
//
// Until v78 this app asked for "committed monthly outflow — rent, loan
// repayments, family support, bills", and money sent to parents entered the
// model in exactly one place: as a number that shortens a runway. Meanwhile
// Social Contribution scored donations to charity and volunteering hours. So
// for a reader practising กตัญญู, the single largest transfer they make to
// another household counted as an obligation in the finance section and as
// nothing at all in the section about giving.
//
// It is now asked for on its own and reported HERE, on the aspect where giving
// lives. It is deliberately NOT added to the socialContribution SCORE, and the
// reason is the same one that unranked Environment in v77 rather than the one
// that would be convenient: the published giving indices this aspect is
// benchmarked against — the participation rates behind
// socialContributionBenchmark — measure donations to organisations and formal
// volunteering. None of them counts intra-family transfers. Folding family
// support into a score built on those rates would move a reader up a ranking
// whose population was never asked the question, which is the precise error
// this app spends most of its comments avoiding.
//
// So: shown, named as giving, and not ranked. A fact, not a component — no
// bar, no weight, no percentile. If a published Thai distribution of family
// remittances is ever found, this becomes a scoring question and gets its own
// round; it is not one today.
function socialContributionFacts(p) {
  const family = Math.round(parseFloat(p.familySupport || 0));
  if (!(family > 0)) return [];
  return [{
    key: "familySupport",
    label: t("Family support"),
    display: tp("{thb} THB/mo", { thb: family.toLocaleString() }),
    detail: t("Money you send to your family. Not scored — the two published participation rates this page's percentile is built on count donating money to an organisation and formal volunteering, and neither asks about supporting your parents. Ranking you on a measure that population was never asked about would be inventing the comparison. It is shown here because it is giving, whatever those two surveys count.")
  }];
}

// Full detail bundle for one aspect page.
export function getAspectDetail(state, aspectKey) {
  if (!ASPECT_KEYS.includes(aspectKey)) return null;
  const p = state.profile || {};
  const b = state.baseline || null;
  const provided = p.provided;
  const answered = b ? b.answered : null;
  const benchmark = getAllBenchmarks(state)[aspectKey];

  const componentsByAspect = {
    finance: () => financeComponents(p, b, benchmark),
    physical: () => physicalComponents(p, b),
    mental: () => mentalComponents(b),
    relationships: () => relationshipsComponents(p, b),
    personalGoals: () => personalGoalsComponents(p, b),
    socialContribution: () => socialContributionComponents(p, b),
    environment: () => environmentComponents(p, b),
    humanityFuture: () => humanityFutureComponents(p, b)
  };

  // Annotate each component with its confidence tier (new object, no mutation).
  const shortComponents = componentsByAspect[aspectKey]().map(c => ({
    ...c,
    confidence: componentConfidence(aspectKey, c.key, provided, answered)
  }));
  // Deep (long-form) rows already carry their own "verified" confidence.
  const components = [...shortComponents, ...deepComponents(aspectKey, b, p)];

  // Response-quality flags (G3): instruments whose answers straight-lined at
  // submit — short-form flags from onboarding plus this aspect's deep section.
  const flaggedInstruments = [];
  if (b && b.flagged) {
    for (const entry of Object.values(COMPONENT_COVERAGE[aspectKey] || {})) {
      for (const i of entry.instruments || []) {
        if (b.flagged[i]) flaggedInstruments.push(i);
      }
    }
  }
  if (b && b.deepFlagged) {
    const section = DEEP_SECTIONS.find(s => s.aspect === aspectKey);
    for (const { key } of (section ? section.instruments : [])) {
      if (b.deepFlagged[key]) flaggedInstruments.push(key);
    }
  }

  return {
    key: aspectKey,
    label: t(ASPECT_META[aspectKey].label),
    blurb: t(ASPECT_META[aspectKey].blurb),
    score: (state.aspects || {})[aspectKey] ?? 0,
    benchmark,
    confidence: getAspectConfidence(state, aspectKey),
    components,
    facts: aspectFacts(aspectKey, p),
    // null on every aspect but finance, and on finance only once both runway
    // inputs are on file. The view renders the "Measured, Not Scored" card when
    // either this or `facts` has something to say.
    invite: aspectKey === "finance" ? runwayInvite(p) : null,
    flaggedInstruments,
    trend: (state.snapshots || []).map(s => ({
      date: s.date,
      value: clamp100((s.aspects || {})[aspectKey] ?? 0)
    }))
  };
}
