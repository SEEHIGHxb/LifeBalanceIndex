// benchmarks.js - Population reference points for each life aspect.
//
// Every figure below comes from a published source (verified 2026-07).
// Percentiles are honest approximations, never precision theater:
//   method "norms"        - direct lookup in a published percentile table,
//                           no distributional assumption at all
//   method "distribution" - normal approximation of a published mean/SD
//   method "threshold"    - placement against published participation rates
//   method "estimate"     - calibrated curve anchored to published figures
// The UI must always show the method and sources next to the number.
// Source labels stay in English on purpose: they are literature citations.

import { t, tp } from "./i18n.js";

// Exported so criteria.js can cite from the SAME registry. Two registries
// would let the same study drift into two labels, which is exactly the kind of
// divergence the BMI note below already suffered from.
export const SOURCES = {
  nsoIncome: {
    label: "NSO Thailand, Household Socio-Economic Survey 2023 (avg. household income ~29,000 THB/mo national, ~39,100 Bangkok)",
    url: "https://www.nso.go.th/nsoweb/index?set_lang=en"
  },
  botWage: {
    label: "NSO Labour Force Survey via Bank of Thailand (avg. monthly wage ~15,972 THB, Q3 2025)",
    url: "https://app.bot.or.th/BTWS_STAT/statistics/BOTWEBSTAT.aspx?reportID=667&language=ENG"
  },
  thaiSpa: {
    label: "Thailand Surveillance on Physical Activity 2012-2019 (66.6-75.6% of adults meet the WHO activity guideline)",
    url: "https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-021-10736-6"
  },
  nhesBmi: {
    label: "Thai National Health Examination Survey (2014: BMI >= 25 in 37.5% of adults; men 32.9%, women 41.8%)",
    url: "https://pubmed.ncbi.nlm.nih.gov/32493314/"
  },
  who5Norms: {
    label: "WHO-5 community norms, representative German sample (Kliem et al. 2025, Front Psychol 16:1592614, doi:10.3389/fpsyg.2025.1592614, N=2,515). Table 2 publishes cumulative percentiles by age band, which is what this app looks up; the pooled mean 67.6 / SD 23.0 on 0-100 comes from the same paper.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12341540/"
  },
  st5Dmh: {
    label: "Srithanya Stress Test ST-5, Thai Dept. of Mental Health (<= 4 no problem, 5-6 possible problem, >= 7 problem)",
    url: "https://he01.tci-thaijo.org/index.php/jmht/article/view/1296"
  },
  ucla3: {
    label: "UCLA 3-item Loneliness Scale, US Health and Retirement Study sample AGED 57-85 (mean 3.89, SD 1.34) - an older-adult norm, not a working-age one",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2394670/"
  },
  lsns6: {
    label: "LSNS-6 in three European community samples of OLDER ADULTS (means 16.1-17.9, SD ~5.5). The < 12 isolation cutoff is the instrument's own validated threshold and does not depend on the age of the norming sample.",
    url: "https://www.researchgate.net/publication/6867225_Performance_of_an_Abbreviated_Version_of_the_Lubben_Social_Network_Scale_Among_Three_European_Community-Dwelling_Older_Adult_Populations"
  },
  clsLoneliness: {
    label: "Community Life Survey 2024/25, DCMS - England, adults 16+, Oct 2024-Mar 2025, unweighted base 160,755. Annual data tables A3a (indirect loneliness composite, 3-9, in three bands: 58% / 33% / 9%) and A3b (the 8-9 band by age).",
    url: "https://www.gov.uk/government/statistics/community-life-survey-202425-annual-publication"
  },
  gseScholz: {
    label: "General Self-Efficacy Scale, 25-country norms, N=19,120 (mean 29.55/40, SD 5.32; ~2.96 per item)",
    url: "https://userpage.fu-berlin.de/~health/faq_gse.pdf"
  },
  gritDuckworth: {
    label: "Short Grit Scale adult reference point ~3.4/5 (Duckworth & Quinn 2009)",
    url: "https://www.psytoolkit.org/survey-library/grit-short.html"
  },
  cafWgi: {
    label: "CAF World Giving Index 2024 - Thailand (52% donated money, 19% volunteered, 63% helped a stranger)",
    url: "https://www.cafonline.org/docs/default-source/inside-giving/wgi/wgi_2024_report.pdf"
  },
  thaiPlastic: {
    label: "Thai Pollution Control Dept. 2017 (~8 plastic bags/person/day); post-ban studies ~3 single-use pieces/day",
    url: "https://www.mdpi.com/2071-1050/15/16/12135"
  },
  thaiRetirement: {
    label: "ILO / OECD Pensions at a Glance Asia-Pacific 2024: most Thai workers lack adequate retirement savings; ~2 in 3 over-60s ineligible for a social-security annuity",
    url: "https://www.oecd.org/en/publications/pensions-at-a-glance-asia-pacific-2024_d4146d12-en/full-report/thailand_eaeb7aea.html"
  },

  // --- CRITERION sources (used by criteria.js) ---
  //
  // These differ in kind from everything above: they are published GUIDELINES
  // and validated CUT-OFFS, not population samples. A guideline needs no
  // norming sample, which is why it can be applied to a Thai user without the
  // cross-cultural problems that block a pooled questionnaire norm. All five
  // verified verbatim at these URLs on 2026-07-30.
  whoActivity2020: {
    label: "WHO Guidelines on physical activity and sedentary behaviour 2020: adults 150-300 min/week moderate OR 75-150 min/week vigorous aerobic activity, plus muscle-strengthening on 2+ days/week",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK566046/"
  },
  whoWproBmi: {
    label: "WHO Western Pacific Region / Asia-Pacific BMI classification: overweight >= 23.0, obesity >= 25.0 - lower than the global 25/30 lines because Asian populations develop cardiometabolic disease at lower BMI",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4217157/"
  },
  nsfSleep: {
    label: "National Sleep Foundation sleep duration recommendations (Hirshkowitz et al. 2015, Sleep Health 1(1):40-43, doi:10.1016/j.sleh.2014.12.010): 7-9 hours for adults, 7-8 hours for older adults",
    url: "https://pubmed.ncbi.nlm.nih.gov/29073412/"
  },
  whoDiet: {
    label: "WHO healthy diet fact sheet: at least 400 g of fruits and vegetables per day (~5 portions of 80 g)",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
  },
  who5Cutoff: {
    label: "WHO-5 screening cut-off (Topp et al. 2015, Psychother Psychosom 84(3):167-176, doi:10.1159/000376585): a score below 50/100 indicates likely depression, sensitivity 79-88%, specificity 76-88%. A CLINICAL SCREENING threshold, not a population rank; the optimal cut-off shifts by population.",
    url: "https://pubmed.ncbi.nlm.nih.gov/25831962/"
  }
};

// Abramowitz & Stegun 7.1.26 erf approximation (max error ~1.5e-7),
// good far beyond the precision these percentiles claim.
export function normalCdf(x, mean, sd) {
  const z = (x - mean) / (sd * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = (z >= 0 ? 1 : -1) * (1 - poly * Math.exp(-z * z));
  return 0.5 * (1 + erf);
}

function clampPercentile(p) {
  return Math.min(99, Math.max(1, Math.round(p)));
}

function toPercentile(p01) {
  return clampPercentile(p01 * 100);
}

// Indicative percentile range — a margin reflecting each method's precision,
// NOT a statistical confidence interval (we lack per-norm sample sizes, and a
// fake CI would be the precision theater this module avoids). Widths:
//   norms        = published percentile table -> same as distribution, see below
//   distribution = real published mean/SD  -> tightest
//   estimate     = calibrated curve        -> medium
//   threshold    = participation-band placement -> coarsest
// A completed deep (long-form) section raises reliability, so its band is
// roughly half as wide as the short-form one.
//
// `norms` gets the SAME widths as `distribution` even though it is strictly
// more accurate (it removes the normal-approximation error entirely, ~8
// percentile points at the mode for WHO-5). Narrowing it would be precision
// theater about the wrong quantity: once the distributional assumption is gone,
// the dominant error is that the norming sample is German and the user is Thai,
// and no margin captures a population mismatch. The band must not shrink just
// because the arithmetic improved.
const PERCENTILE_MARGIN = { norms: 6, distribution: 6, estimate: 10, threshold: 12 };
const PERCENTILE_MARGIN_VERIFIED = { norms: 3, distribution: 3, estimate: 5, threshold: 8 };

export function percentileRange(percentile, method, verified = false) {
  const table = verified ? PERCENTILE_MARGIN_VERIFIED : PERCENTILE_MARGIN;
  const margin = table[method] ?? (verified ? 5 : 10);
  return {
    low: Math.max(1, percentile - margin),
    high: Math.min(99, percentile + margin)
  };
}

// Coarse plain-language band for a percentile, for a friendlier presentation
// than a bare number. `label` is the canonical English string (the UI localizes
// it with t()). Kept here (not in the UI) so it is unit-testable without a DOM.
export const PERCENTILE_BANDS = [
  { min: 90, key: "top10", label: "Top 10%" },
  { min: 75, key: "top25", label: "Top 25%" },
  { min: 60, key: "above", label: "Above average" },
  { min: 40, key: "around", label: "Around average" },
  { min: 25, key: "below", label: "Below average" },
  { min: 0, key: "bottom", label: "Bottom 25%" }
];

export function percentileBand(percentile) {
  return PERCENTILE_BANDS.find(b => percentile >= b.min) || PERCENTILE_BANDS[PERCENTILE_BANDS.length - 1];
}

// --- TWO-STAGE, BAND-LOCKED PERCENTILES ---
//
// Three aspects have no published DISTRIBUTION to sit on — CAF, the Pollution
// Control Dept and OECD publish participation RATES and averages ("52% of
// Thais donated"), not a curve. Anchoring on a single cited rate made those
// percentiles nearly constant: humanityFuture could only ever return 30 or 70,
// because it was a two-valued function of one checkbox, and socialContribution
// could never reach an A no matter what someone actually did.
//
// So the percentile is built in two stages:
//   1. the CITED rate decides which BAND you are in — this is the published
//      claim, and it is the only thing that can move you across a boundary;
//   2. the MEASURED intensity (the app's own instrument composite) decides
//      where inside that band you sit.
//
// BAND-LOCKED means stage 2 can never cross a boundary stage 1 set: a
// non-donor at maximum prosocial intensity still lands below the floor of the
// donor band. The cited claim survives intact; only the resolution inside it
// improves. Every consumer surface says so — the notes line below and the
// methodology page both state that the band is cited and the position within
// it is this app's composite.
//
// `intensity` is 0-1, or null when the instrument was never answered (older
// saves, express onboarding). Null returns `fallback` — the exact fixed
// percentile this benchmark returned before the two-stage design — rather than
// the band midpoint. Using the midpoint would have moved some people's grade
// purely because the band geometry changed (a volunteer with no answers went
// 82 -> 90, i.e. B -> A, having done nothing). A grade must only move when the
// person's own answers move it.
function positionInBand(floor, ceil, intensity, fallback) {
  if (!Number.isFinite(intensity)) return fallback;
  const at = Math.max(0, Math.min(1, intensity));
  return Math.round(floor + at * (ceil - floor));
}

// Normalized 0-1 reading of a raw instrument sum, or null when absent.
function intensityOf(raw, max) {
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw / max)) : null;
}

// The honesty disclosure that makes the two-stage design legible rather than a
// hidden fudge. Shown on every aspect that uses it.
const TWO_STAGE_NOTE = () => t("The band comes from published participation data; where you sit inside it is this app's own composite of your answers, and can never move you into a different band.");

export function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

// --- FINANCE: income vs Thai worker earnings ---
// Lognormal approximation calibrated so the mean matches the LFS average
// wage (~15,972 THB/mo); Bangkok median scaled up by the SES household
// income ratio (39,100 / 29,000 ~ 1.35). sigma 0.65 is a typical wage
// dispersion; this is an estimate, not published decile data.
const INCOME_MEDIAN_NATIONAL = 12900;
const INCOME_MEDIAN_BANGKOK = 17400;
const INCOME_LOG_SIGMA = 0.65;

// Single source of truth for income -> population percentile (finding #9).
// The finance SCORE (state.js) and this benchmark card both read this one
// cited lognormal model, so a given income can no longer read two different
// ways on the same screen.
export function incomePercentile(income, region) {
  const inc = parseFloat(income || 0);
  if (!(inc > 0)) return 1;
  const median = region === "Bangkok" ? INCOME_MEDIAN_BANGKOK : INCOME_MEDIAN_NATIONAL;
  return toPercentile(normalCdf(Math.log(inc), Math.log(median), INCOME_LOG_SIGMA));
}

function financeBenchmark(profile) {
  const income = parseFloat(profile.income || 0);
  const percentile = incomePercentile(income, profile.region);
  return {
    percentile,
    method: "estimate",
    population: profile.region === "Bangkok" ? t("Bangkok workers") : t("Thai workers"),
    summary: tp(profile.region === "Bangkok"
      ? "Income of {income} THB/mo vs Bangkok workers"
      : "Income of {income} THB/mo vs Thai workers", { income: Math.round(income).toLocaleString() }),
    notes: [
      t("Lognormal curve calibrated to the Labour Force Survey average wage; NSO does not publish worker-level deciles openly."),
      t("The income spread (log-sigma 0.65) is an assumed wage dispersion, not published decile data — the rank is approximate.")
    ],
    sources: [SOURCES.botWage, SOURCES.nsoIncome]
  };
}

// --- PHYSICAL: weekly MET-minutes vs Thai adults ---
// Anchor: ~71% of Thai adults meet the WHO guideline (600 MET-min/week),
// the midpoint of the 66.6-75.6% range across SPA 2012-2019 rounds.
const MET_GUIDELINE = 600;
const SHARE_BELOW_GUIDELINE = 0.29;

function metMinutes(profile) {
  return (8.0 * (profile.weeklyVigorousDays || 0) * (profile.weeklyVigorousMins || 0))
    + (4.0 * (profile.weeklyModerateDays || 0) * (profile.weeklyModerateMins || 0))
    + (3.3 * (profile.weeklyWalkingDays || 0) * (profile.weeklyWalkingMins || 0));
}

function physicalBenchmark(profile) {
  const met = metMinutes(profile);
  let p01;
  if (met < MET_GUIDELINE) {
    // Below the guideline you sit somewhere in the inactive 29%.
    p01 = (met / MET_GUIDELINE) * SHARE_BELOW_GUIDELINE;
  } else {
    // 600 MET-min = 29th percentile anchor; the curve above it is an
    // estimate (Thai MVPA is work-dominated and high volume).
    p01 = SHARE_BELOW_GUIDELINE + Math.min(0.66, ((met - MET_GUIDELINE) / 5400) * 0.66);
  }

  const notes = [];
  const w = parseFloat(profile.weight || 0);
  const h = parseFloat(profile.height || 0) / 100;
  if (w > 0 && h > 0) {
    const bmi = w / (h * h);
    // The line reported here is the WHO WESTERN PACIFIC one (overweight >= 23),
    // not the global 25. Asian populations develop cardiometabolic disease at a
    // lower BMI, so 23 is the threshold that applies to this app's users — and
    // averages.js:45 was already reasoning on the Asian band while this note
    // told users about the 25 line, so the two files disagreed. A Thai user at
    // BMI 24 was being told they were below the line.
    //
    // The Thai NHES share stays pinned to the >= 25 figure it actually
    // measures, on a separate clause, because no verified Thai share at >= 23
    // is in hand and interpolating one would be inventing data. Two true
    // statements beat one convenient number.
    const overweightShare = profile.gender === "male" ? 32.9 : profile.gender === "female" ? 41.8 : 37.5;
    notes.push(tp(bmi < 23
      ? "BMI {bmi} — below the WHO Asia-Pacific overweight line of 23.0. For reference, {share}% of Thai adults are at BMI 25 or above."
      : "BMI {bmi} — at or above the WHO Asia-Pacific overweight line of 23.0, which is lower than the global 25 because risk rises earlier in Asian populations. For reference, {share}% of Thai adults are at BMI 25 or above.", { bmi: bmi.toFixed(1), share: overweightShare }));
  }

  return {
    percentile: toPercentile(p01),
    method: "estimate",
    population: t("Thai adults"),
    summary: tp("{met} MET-min/week vs Thai adults (WHO guideline = 600)", { met: Math.round(met) }),
    notes,
    // whoWproBmi is cited because the BMI note above now reports the
    // Asia-Pacific line; nhesBmi still backs the Thai >= 25 share beside it.
    sources: [SOURCES.thaiSpa, SOURCES.nhesBmi, SOURCES.whoWproBmi]
  };
}

// --- Thai norm sourcing (researched 2026-07, re-audited 2026-07-29) ---
//
// The profile-based benchmarks above (income, activity, BMI, giving, plastics,
// retirement) use Thai sources. The survey-instrument benchmarks below do not,
// and a literature sweep confirmed why: NO representative Thai general-adult
// community norm is published for ANY of the twelve instruments this app uses.
// Every Thai figure that exists is a non-representative proxy — hospital
// outpatients, university students, or older adults.
//
// So each survey benchmark falls into one of three cases, and the case decides
// whether it may claim a percentile at all:
//
//   1. FOREIGN NORM, COMPARABLE AGE — a rank is defensible; the UI must name
//      the sample rather than imply it is Thai or "people like you".
//        - WHO-5: representative German adults, ranked against the SOURCE'S OWN
//          published percentile table BY AGE BAND (Kliem et al. 2025, Table 2),
//          not against a pooled mean/SD. See WHO5_PERCENTILE_TABLE below.
//          The Thai alternative is primary-care outpatients at Ramathibodi
//          (mean 14.32/25, SD 5.26, N=274, mean age 44.6; Saipanish 2009,
//          doi:10.1111/j.1440-1819.2009.01933.x — verified at source). That
//          trades a country mismatch for a clinical sampling bias, so the
//          representative foreign norm is kept.
//        - GSE: 25-country pooled adult norms, N=19,120. There is no Thai GSE
//          norm at all; a widely-circulated "Thai" figure traces to a study of
//          135 head nurses in Yunnan, CHINA (Zhang et al. 2021, Nursing Journal
//          CMU 48(3)) and is not usable.
//
//   2. WRONG POPULATION ENTIRELY — no rank may be claimed. UCLA-3 is normed on
//      US adults aged 57-85 and LSNS-6 on European older adults, so ranking a
//      28-year-old against either is not an approximation, it is a category
//      error. `relationships` therefore returns NO percentile (see below).
//
//   3. THAI INSTRUMENT, BANDS ONLY — ST-5 has official Thai DMH cut-off bands
//      but no published national mean/SD, so it informs a note, never a rank.
//
// Revisit when a representative Thai general-adult dataset is published; the
// research briefs live in docs/research/.
//
// For `relationships` specifically, that revisit has now been searched and
// closed once: docs/research/round-4-social-connection-norms.md asked whether
// ANY general-population score DISTRIBUTION exists for UCLA-3 or LSNS-6 (or for
// a swappable instrument with a validated Thai adult version), and every one of
// its four questions came back NOT FOUND — no PERCENTILE is available. ONS
// publishes item-level responses and associations but no combined-score
// distribution, and advises using the UCLA module alongside the direct question
// rather than as a composite.
//
// A follow-up search did find the closest thing that exists, and as of v43 the
// app uses it: DCMS's Community Life Survey (England, adults 16+, Oct 2024-Mar
// 2025, unweighted base 160,755) publishes the 3-9 composite in THREE BANDS —
// 3-4: 58%, 5-7: 33%, 8-9: 9% (Table A3a), with the 8-9 band broken out by age
// (Table A3b). Same three items, same 3-9 coding as surveys.js. That is enough
// for a banded comparison against a correctly-aged population; it is NOT enough
// for a percentile, because getting one would mean interpolating inside a band.
// So `relationships` gains a BAND PLACEMENT note and keeps `percentile: null`.
// See CLS_BANDS below; figures and caveats:
// docs/research/round-4-social-connection-norms.md.
//
// Note the age gradient in A3b: 12% of 16-24s score 8-9, falling to 5% of
// 65-74s. Younger adults are lonelier, so an older-adult norm is not merely the
// wrong sample for a 28-year-old — it slopes the wrong way. That is the
// empirical case for this aspect staying unranked.
//
// --- Why only WHO-5 is age-banded (researched 2026-07-30) ---
//
// Age stratification must come from the SOURCE, never from this project. Only
// one aspect has an age-banded table published with the norm it already cites,
// so only one is age-banded. Recorded so the research is not re-run:
//   - PHYSICAL: Thai activity by age IS published (Katewongsa 2021, 5 survey
//     waves), but the 2019 spread across bands is 70.8-76.0% — a 5-point
//     gradient. Not worth a mechanism. WHO-5's spread is ~40 points.
//   - RELATIONSHIPS: cannot be age-banded FOR A RANK, and still cannot be
//     ranked at all. (v43 does quote one age-stratified row — CLS Table A3b,
//     the 8-9 band by age — but as a population fact beside a band placement,
//     never as a percentile. The paragraph below is about ranking.)
//     The only age-stratified loneliness prevalence found (Meta-Gallup 2023,
//     142 countries) is a SINGLE ITEM, not UCLA-3, with unpublished question
//     wording, and no Thailand break-out. The 2022 seven-country pilot does use
//     this app's three UCLA items verbatim but on a 4-point scale where the app
//     uses 3 (scoring.js:82), and reports country means as a chart, not a
//     distribution. Banding a UCLA-3 score against either is the cross-measure
//     conversion the research brief prohibits.
//   - FINANCE / BMI / FRUIT-VEG: no Thai age-stratified data exists. Thai
//     income by age was searched for specifically: NSO SES is household-level
//     and the LFS age tables carry participation, not earnings.

// --- WHO-5 population norms, by age band ---
//
// Kliem et al. 2025, "Psychometric evaluation and updated community norms of
// the WHO-5 well-being index, based on a representative German sample",
// Frontiers in Psychology 16:1592614, doi:10.3389/fpsyg.2025.1592614.
// N=2,515, ADM random-route representative sample, fielded June-October 2021.
//
// Table 2 verbatim. Caption: "Population based norms (cumulative percentiles)
// of the WHO-5 scores (total sample)." Table note: "All raw scores were
// multiplied by 4 in order to transform the original WHO-5 score range from 0
// to 25 to a standardized scale of 0-100, as recommended in the scoring
// guidelines; Values in square brackets indicate the 95% confidence interval
// based on 1,000 bootstrap samples." The published CIs are not stored: this
// module shows an indicative range by method, not per-cell statistics.
//
// These are RAW EMPIRICAL cumulative percentiles. No smoothing, shape-
// constrained or monotone model is claimed anywhere in the paper — so a tie
// between adjacent rows means literally zero respondents at that score, which
// is what made the errata below detectable.
//
// Rows are the score on the 0-100 scale, in steps of 4. `baseline.who5` is an
// integer 0-25 and score100 = who5 * 4, so EVERY reachable user score is an
// exact row. No interpolation, no curve fitting, no inference of any kind:
// this is the only benchmark in the file that reads a published number
// straight out and does no math on it.
//
// Printed bounds "<0.1" and ">99.9" are stored as 0.1 and 99.9 (toPercentile
// clamps to [1,99] regardless).
//
// TABLE_2_ERRATA — three cells are wrong in the published table and are stored
// REPAIRED. Because the values are unsmoothed, Table 2's columns must equal the
// n-weighted mix of Supplementary Table S11 (male) and S12 (female) using the
// age x gender counts in Table 1 — an exact identity for ECDFs. All 182 cells
// were checked: 179 reconcile to within 0.30 (mean 0.041). Three do not, and
// all three are exact duplicates of the cell directly above them in their own
// column, i.e. a cell-duplication error in production, at 7x/29x/62x the worst
// legitimate residual:
//     score 80, band 55-64: printed 63.2 -> reconciled 81.9  (off by 18.7)
//     score 76, band 65-74: printed 56.9 -> reconciled 65.7  (off by  8.8)
//     score 32, band 65-74: printed 10.4 -> reconciled 12.5  (off by  2.1)
// Score 80 (raw 20) is the modal score at 20.2% of the sample, so "zero of 487
// people aged 55-64" is arithmetically impossible. No erratum or corrigendum
// has been published. Storing the printed values would misreport the single
// most-populated cell in the table by 18.7 percentile points — a grade error.
// This is not modelling: it is the paper's own supplementary tables recombined
// by the paper's own Table 1 counts. Do NOT "correct" these three back to the
// printed values; tests/who5-norms.test.mjs pins them.
export const WHO5_PERCENTILE_TABLE = Object.freeze({
  0: { total: 0.3, a16: 0.1, a25: 0.1, a35: 0.3, a45: 0.2, a55: 0.6, a65: 0.1, a75: 0.8 },
  4: { total: 0.7, a16: 0.1, a25: 0.1, a35: 1.1, a45: 0.5, a55: 0.8, a65: 0.3, a75: 2.5 },
  8: { total: 1.4, a16: 0.1, a25: 0.5, a35: 1.6, a45: 0.5, a55: 1.6, a65: 1.3, a75: 4.6 },
  12: { total: 2.7, a16: 1.8, a25: 1.5, a35: 1.9, a45: 2.1, a55: 2.5, a65: 2.7, a75: 8.4 },
  16: { total: 3.9, a16: 1.8, a25: 2.8, a35: 2.7, a45: 3.2, a55: 3.5, a65: 4.3, a75: 10.5 },
  20: { total: 6.8, a16: 3.6, a25: 4.4, a35: 6.3, a45: 5.3, a55: 5.7, a65: 9.3, a75: 16.0 },
  24: { total: 8.0, a16: 3.6, a25: 5.1, a35: 7.4, a45: 6.7, a55: 7.0, a65: 10.1, a75: 18.9 },
  28: { total: 9.5, a16: 4.0, a25: 6.2, a35: 7.9, a45: 7.6, a55: 10.5, a65: 10.4, a75: 22.7 },
  32: { total: 11.3, a16: 5.8, a25: 7.7, a35: 9.5, a45: 9.0, a55: 11.3, a65: 12.5, a75: 27.7 }, // a65 repaired: see TABLE_2_ERRATA
  36: { total: 12.9, a16: 6.7, a25: 8.5, a35: 10.9, a45: 9.5, a55: 12.7, a65: 16.0, a75: 31.1 },
  40: { total: 15.7, a16: 9.3, a25: 9.8, a35: 12.5, a45: 12.0, a55: 15.6, a65: 20.2, a75: 36.1 },
  44: { total: 18.4, a16: 12.0, a25: 11.3, a35: 14.7, a45: 14.8, a55: 18.7, a65: 23.1, a75: 40.3 },
  48: { total: 21.3, a16: 15.6, a25: 14.1, a35: 18.0, a45: 17.3, a55: 20.7, a65: 27.4, a75: 42.4 },
  52: { total: 24.0, a16: 17.3, a25: 15.4, a35: 21.5, a45: 19.6, a55: 23.4, a65: 29.3, a75: 48.7 },
  56: { total: 27.2, a16: 22.2, a25: 17.5, a35: 24.0, a45: 24.0, a55: 26.7, a65: 31.4, a75: 52.5 },
  60: { total: 32.4, a16: 28.0, a25: 20.3, a35: 28.6, a45: 29.8, a55: 32.4, a65: 37.0, a75: 59.7 },
  64: { total: 36.0, a16: 30.2, a25: 22.9, a35: 33.0, a45: 32.6, a55: 36.6, a65: 41.0, a75: 64.7 },
  68: { total: 42.4, a16: 34.2, a25: 28.5, a35: 38.4, a45: 39.3, a55: 44.4, a65: 48.4, a75: 71.4 },
  72: { total: 49.5, a16: 40.4, a25: 33.9, a35: 46.3, a45: 46.0, a55: 53.0, a65: 56.9, a75: 75.6 },
  76: { total: 57.5, a16: 47.1, a25: 41.6, a35: 52.3, a45: 56.1, a55: 63.2, a65: 65.7, a75: 78.6 }, // a65 repaired: see TABLE_2_ERRATA
  80: { total: 77.7, a16: 63.1, a25: 68.1, a35: 76.3, a45: 79.7, a55: 81.9, a65: 81.6, a75: 91.2 }, // a55 repaired: see TABLE_2_ERRATA
  84: { total: 82.1, a16: 71.6, a25: 73.5, a35: 80.9, a45: 83.1, a55: 86.4, a65: 85.6, a75: 91.6 },
  88: { total: 86.9, a16: 81.8, a25: 79.2, a35: 84.7, a45: 87.5, a55: 90.8, a65: 89.4, a75: 94.5 },
  92: { total: 90.5, a16: 86.2, a25: 86.6, a35: 88.6, a45: 91.5, a55: 93.4, a65: 91.5, a75: 95.0 },
  96: { total: 92.0, a16: 87.1, a25: 87.4, a35: 90.5, a45: 93.3, a55: 95.1, a65: 93.6, a75: 95.8 },
  100: { total: 99.9, a16: 99.9, a25: 99.9, a35: 99.9, a45: 99.9, a55: 99.9, a65: 99.9, a75: 99.9 }
});

// Maps an age onto the SOURCE'S OWN band keys. `total` is the paper's own
// pooled column and is a first-class honest fallback, not a blank — same rule
// as the `unmeasured` status in criteria.js. Under-16 cannot occur (the app's
// minimum age is 18) but is handled rather than assumed away.
export function who5AgeBand(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 16) return "total";
  if (n < 25) return "a16";
  if (n < 35) return "a25";
  if (n < 45) return "a35";
  if (n < 55) return "a45";
  if (n < 65) return "a55";
  if (n < 75) return "a65";
  return "a75";
}

// Population labels as a map of LITERAL t() calls. A t(variable) is invisible
// to tests/i18n-coverage.test.mjs and would ship untranslated — the same rule
// views/methodology.js:60-69 follows.
//
// These say "the reference sample", not "German adults" (v42). Naming Germany
// at the point of the claim was noise: a Thai reader cannot act on it, and it
// was the loudest word on the card. It is NOT replaced with "general adults" —
// that would assert a universality this sample does not have, a stronger claim
// than the one being removed. "The reference sample" is true, neutral, and
// points at the methodology page, which still names Kliem et al., the German
// sample and the 25-country GSE pool exactly, under test. Thai-sourced
// populations stay named ("Thai adults", "Thai workers"): naming Thailand is
// informative to this app's reader in a way naming Germany is not.
const WHO5_POPULATION_LABELS = () => ({
  total: t("adults in the reference sample"),
  a16: t("adults aged 16-24 in the reference sample"),
  a25: t("adults aged 25-34 in the reference sample"),
  a35: t("adults aged 35-44 in the reference sample"),
  a45: t("adults aged 45-54 in the reference sample"),
  a55: t("adults aged 55-64 in the reference sample"),
  a65: t("adults aged 65-74 in the reference sample"),
  a75: t("adults aged 75 and over in the reference sample")
});

// --- MENTAL: WHO-5 vs community norms ---
//
// Takes `profile` for the user's age. Until v41 this ranked the score with
// normalCdf(score100, 67.56, 22.96), which assumed a normal distribution the
// WHO-5 does not have (the same paper reports Skew = -0.90). At score 68 that
// returned the ~51st percentile where the source's own pooled column says 42.4
// — an ~8-point error in the middle of the range, where most users sit. The
// table lookup removes that error and adds the age band on top of it.
function mentalBenchmark(profile, baseline) {
  if (!baseline || !Number.isFinite(baseline.who5)) return null;
  // Snap to the instrument's own range before indexing. A WHO-5 sum is an
  // integer 0-25 by construction, so this is a no-op for every score the app
  // can produce — but a hand-edited import carrying 17.5 or 99 would otherwise
  // miss the table and throw, taking the whole dashboard down with it. A
  // formula degraded quietly here; a lookup does not, so it is guarded.
  const raw = Math.min(25, Math.max(0, Math.round(baseline.who5)));
  const score100 = raw * 4; // 0-25 -> 0-100, an exact table row
  const band = who5AgeBand((profile || {}).age);
  const row = WHO5_PERCENTILE_TABLE[score100];
  const notes = [];
  if (Number.isFinite(baseline.st5)) {
    const stress = baseline.st5 <= 4 ? "no stress problem" : baseline.st5 <= 6 ? "possible stress problem" : "stress problem";
    notes.push(tp('ST-5 stress score {n}/15 — "{band}" band on the Thai DMH scale.', { n: baseline.st5, band: t(stress) }));
  }
  notes.push(band === "total"
    ? t("Percentile is read straight from a published WHO-5 percentile table — no representative Thai WHO-5 norm is published, so read it as indicative. The methodology page names the sample.")
    : t("Percentile is read straight from a published WHO-5 percentile table, from the row for your own age band — no representative Thai WHO-5 norm is published, so read it as indicative. The methodology page names the sample."));
  return {
    // Take the cell verbatim. Do not convert it to a mid-percentile rank, do
    // not average adjacent rows, do not adjust for the cumulative-vs-rank
    // convention: any such adjustment would make this project the source.
    // clampPercentile, not toPercentile: the cell is already on 0-100, and a
    // /100 * 100 round-trip loses the half (28.5 -> 28.4999… -> 28).
    percentile: clampPercentile(row[band]),
    method: "norms",
    population: WHO5_POPULATION_LABELS()[band],
    summary: tp("WHO-5 well-being {score}/100 vs general-population norms", { score: score100 }),
    notes,
    sources: [SOURCES.who5Norms, SOURCES.st5Dmh]
  };
}

// --- RELATIONSHIPS: measured, but deliberately NOT ranked ---
//
// This aspect returns a benchmark with NO percentile. Both of its instruments
// are normed on people a generation older than this app's users: UCLA-3 on the
// US Health and Retirement Study (ages 57-85) and LSNS-6 on European older
// adults. Ranking a working-age Thai adult against either is not a rough
// approximation — the population and the response scale are both wrong, and
// that objection stands on its own.
//
// An earlier version of this comment argued the DIRECTION of the UCLA bias from
// loneliness being "U-shaped across the lifespan". That claim is false and was
// removed in v41. Two independent Meta-Gallup datasets contradict it: the 2022
// seven-country pilot (Brazil, Egypt, France, India, Indonesia, Mexico, US;
// UCLA-3 on a 4-point scale) found NO notable age relationship in Egypt,
// France, India or Mexico, and where an effect existed — Brazil, Indonesia, US
// — the 65+ group was LESS lonely; the 2023 global release (142 countries,
// single item) reports very/fairly lonely at 27% for ages 19-29 against 17% for
// 65+. Nothing shows loneliness rising again in old age. The honest statement
// is that the UCLA norm's direction of error is UNKNOWN, not U-shaped — while
// working-age people carry workplace ties the LSNS norm never counted, which
// probably makes them look BETTER connected. An unquantified bias plus an
// unknown-direction one is not a percentile.
//
// What survives is everything that does not depend on a norming sample:
//   - the raw instrument readings, which the user answered and can act on;
//   - the LSNS-6 < 12 isolation cutoff, which is the instrument's OWN validated
//     threshold, published with the scale rather than derived from a sample.
// So the aspect still says something true and useful; it just stops claiming a
// rank it cannot support. `unranked` carries the reason, and every consumer
// surface renders it as an explicit disclosure, never as missing data.
// --- The one correctly-aged reference that exists: CLS band placement ---
//
// DCMS Community Life Survey 2024/25 annual data tables, Table A3a. England,
// adults 16+, Oct 2024-Mar 2025, unweighted base 160,755 — a general-population
// sample, not an older-adult one, which is the whole reason it is usable here.
//
// It asks THIS APP'S three UCLA items on THIS APP'S three-point coding
// (surveys.js UCLA_FREQ, 1-3) and sums them to the same 3-9 composite, so a
// user's raw score lands in a published band with no conversion. `below` is the
// cumulative share scoring strictly lower, obtained by adding the bands below
// it — addition only, never interpolation inside one.
//
// Three bands are exactly two cumulative points. That places a score; it cannot
// rank one. Turning this into a percentile would mean guessing where inside a
// band the user sits, which is the fabrication this whole aspect exists to
// refuse. `percentile` therefore stays null.
const CLS_BANDS = [
  { max: 4, share: 58, below: 0 },
  { max: 7, share: 33, below: 58 },
  { max: 9, share: 9, below: 91 }
];

// Table A3b, published for the 8-9 band ONLY. There is no age breakdown of the
// other two bands to be had, so the app shows this line only to users who are
// in the 8-9 band, where it answers "is that unusual for someone my age?" with
// a printed number. Showing "11% of 25-34s score 8-9" to someone scoring 4
// would invite them to read a population fact as their own rank.
//
// The gradient is also the empirical case for this aspect staying unranked:
// 12% at 16-24 down to 5% at 65-74, then back up to 7% at 75+. Not monotonic,
// but younger adults are the lonelier group across almost the whole range, so
// the older-adult UCLA norm does not merely use the wrong sample — it slopes
// the wrong way. Note this does NOT resurrect the U-shape claim removed in v41
// (see below): one 7-vs-5 uptick in the oldest band of one country's survey is
// not loneliness rising again in old age, and it is not enough to rank on.
const CLS_LONELIEST_BY_AGE = [
  { max: 24, label: "16-24", share: 12 },
  { max: 34, label: "25-34", share: 11 },
  { max: 49, label: "35-49", share: 10 },
  { max: 64, label: "50-64", share: 8 },
  { max: 74, label: "65-74", share: 5 },
  { max: Infinity, label: "75 and over", share: 7 }
];

// Below the survey's own floor there is no row to quote, so nothing is quoted.
export function clsAgeRow(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 16) return null;
  return CLS_LONELIEST_BY_AGE.find(row => n <= row.max) || null;
}

// Each branch passes a LITERAL to tp() rather than a ternary, so
// tests/i18n-coverage.test.mjs can see all three strings.
function clsBandNote(ucla) {
  if (ucla <= CLS_BANDS[0].max) {
    return tp("A national survey of 160,755 adults in England publishes this same 3-9 score in three bands. Yours, {n}, is in the least-lonely band, where 58% of them sit; 42% score higher.", { n: ucla });
  }
  if (ucla <= CLS_BANDS[1].max) {
    return tp("A national survey of 160,755 adults in England publishes this same 3-9 score in three bands. Yours, {n}, is in the middle band, where 33% of them sit; 58% score lower and 9% score higher.", { n: ucla });
  }
  return tp("A national survey of 160,755 adults in England publishes this same 3-9 score in three bands. Yours, {n}, is in the loneliest band, where 9% of them sit; 91% score lower.", { n: ucla });
}

// `profile` is taken for the age row, mirroring mentalBenchmark above.
function relationshipsBenchmark(profile, baseline) {
  if (!baseline || !Number.isFinite(baseline.ucla) || !Number.isFinite(baseline.lsns)) return null;
  const notes = [
    tp("Loneliness (UCLA-3) {ucla}/9 — lower is better. Social network (LSNS-6) {lsns}/30 — higher is better.",
      { ucla: baseline.ucla, lsns: baseline.lsns }),
    tp(baseline.lsns < 12
      ? "LSNS-6 score {n}/30 is under the social-isolation cutoff of 12."
      : "LSNS-6 score {n}/30 is above the social-isolation cutoff of 12.", { n: baseline.lsns })
  ];

  // Shown unless the instrument is KNOWN not to have been answered — a
  // straight-lined or untouched UCLA is demoted to answered=false by
  // state.js, and a band built on the midpoint default would be invented.
  // Absent coverage flags mean "unknown" on pre-v25 saves, not "false"; those
  // saves already print the raw score in the note above, so placing that same
  // number in its published band claims nothing further.
  const uclaAnswered = !baseline.answered || baseline.answered.ucla !== false;
  if (uclaAnswered) {
    notes.push(clsBandNote(baseline.ucla));
    const ageRow = baseline.ucla > CLS_BANDS[1].max ? clsAgeRow((profile || {}).age) : null;
    if (ageRow) {
      notes.push(tp("In that survey {pct}% of adults aged {band} scored in this band.", { pct: ageRow.share, band: ageRow.label }));
    }
    notes.push(t("Three bands can say which band you are in. They cannot say where you rank, because that would mean guessing your position inside a band."));
  }

  return {
    percentile: null,
    unranked: t("Both scales are normed on older adults — UCLA-3 on US adults aged 57-85, LSNS-6 on European over-65s. No Thai working-age norm is published for either, so this app will not pretend to rank you on it. The closest all-ages reference, a national survey in England, publishes only three broad bands — enough to place your loneliness score, not to rank it. Your scores, that band and the isolation cutoff below are all real measurements."),
    method: "estimate",
    population: null,
    summary: t("Loneliness (UCLA-3) and social network (LSNS-6) — measured, not ranked"),
    notes,
    sources: uclaAnswered ? [SOURCES.ucla3, SOURCES.lsns6, SOURCES.clsLoneliness] : [SOURCES.ucla3, SOURCES.lsns6]
  };
}

// --- PERSONAL GOALS: self-efficacy vs 25-country norms ---
function personalGoalsBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.gse)) return null;
  // The deep section captures the full GSE-10, which matches the 25-country
  // norm exactly; without it we per-item-approximate from the GSE-6 short form.
  const deepGse = baseline.deep && Number.isFinite(baseline.deep.gse10);
  const perItem = deepGse ? baseline.deep.gse10 / 10 : baseline.gse / 6;
  const notes = [];
  if (Number.isFinite(baseline.grit)) {
    const deepGrit = baseline.deep && Number.isFinite(baseline.deep.grit12);
    notes.push(deepGrit
      ? tp("Grit {g}/5 from your full 12-item scale vs the ~3.4 adult reference point.", { g: (baseline.deep.grit12 / 12).toFixed(1) })
      : tp("Grit {g}/5 — the onboarding measure is the perseverance facet only (4 of the 8 Grit-S items), so this is indicative, not an exact match to the ~3.4 reference.", { g: (baseline.grit / 4).toFixed(1) }));
  }
  notes.push(deepGse
    ? t("Scored from your full 10-item GSE — a direct match to the published norm, no short-form approximation.")
    : t("Your 6-item GSE is compared per-item against 10-item GSE norms — a short-form approximation, not an exact match."));
  return {
    // Per-item comparison against the GSE-10 norm (29.55/10 items = 2.96,
    // SD 5.32/10 = 0.53). With the deep GSE-10 this is exact; the GSE-6 short
    // form is an approximation.
    percentile: toPercentile(normalCdf(perItem, 2.955, 0.532)),
    method: deepGse ? "distribution" : "estimate",
    // See the v42 note on WHO5_POPULATION_LABELS: the board says "the reference
    // sample", the methodology page still names the 25-country pool and N.
    population: t("adults in the reference sample"),
    summary: t("Self-efficacy (GSE) vs published adult norms, N=19,120"),
    notes,
    sources: [SOURCES.gseScholz, SOURCES.gritDuckworth]
  };
}

// --- SOCIAL CONTRIBUTION: giving participation vs CAF Thailand rates ---
//
// STAGE 1 (cited). CAF Thailand 2024: 52% donated money, 19% volunteered.
// Those two rates carve the population into three non-overlapping bands, and
// nothing a person answers can move them between bands:
//   volunteers      -> the top 19%                      [81, 99]
//   donates only    -> above the 48% who gave nothing,
//                      below the 19% who volunteer      [48, 80]
//   neither         -> the bottom 48%                   [ 2, 47]
// Giving as a share of income is capped at 5% — well under a tithe, and the
// point at which "gives regularly" stops being the interesting variable. That
// cap is the app's own choice, and it only positions WITHIN a band.
const SOCIAL_BANDS = {
  volunteers: [81, 99],
  donates: [48, 80],
  neither: [2, 47]
};
const GENEROUS_GIVING_SHARE = 0.05;

function socialContributionBenchmark(profile, baseline) {
  const donations = parseFloat(profile.monthlyDonations || 0);
  const income = parseFloat(profile.monthlyIncome || 0);
  const donates = donations > 0;
  const volunteers = parseFloat(profile.volunteeringHours || 0) > 0;

  const key = volunteers ? "volunteers" : donates ? "donates" : "neither";
  const [floor, ceil] = SOCIAL_BANDS[key];
  // Pre-two-stage fixed values, used only when PTM was never answered.
  const fallback = volunteers ? (donates ? 88 : 82) : donates ? 62 : 24;

  // STAGE 2 (this app's own). The five PTM items carry helping, civic and
  // local behaviour; giving share carries magnitude, which the participation
  // rate deliberately ignores. Falls back to PTM alone when income is unknown,
  // and to the band midpoint when the instrument was never answered.
  const ptm = intensityOf((baseline || {}).ptm, 20);
  const share = income > 0 ? Math.min(1, (donations / income) / GENEROUS_GIVING_SHARE) : null;
  const intensity = ptm === null ? null
    : share === null ? ptm
    : (0.6 * ptm) + (0.4 * share);

  const band = key === "volunteers"
    ? (donates
      ? "donates and volunteers — inside the 19% of Thais who volunteer"
      : "volunteers — inside the 19% of Thais who volunteer")
    : key === "donates"
      ? "donates — inside the 52% of Thais who gave money"
      : "no regular giving yet — 52% of Thais donated last year";

  return {
    percentile: positionInBand(floor, ceil, intensity, fallback),
    method: "threshold",
    population: t("Thai adults"),
    summary: tp("Giving participation: {band}", { band: t(band) }),
    notes: [
      t("Participation-rate placement, not an exact rank — CAF publishes yes/no rates, not amounts."),
      TWO_STAGE_NOTE()
    ],
    sources: [SOURCES.cafWgi]
  };
}

// --- ENVIRONMENT: single-use plastics vs Thai daily average ---
//
// STAGE 1 (cited). Plastic use per day, banded around the post-ban Thai
// average of ~3 pieces. The bands are contiguous and ordered, so a heavier
// plastic user can never be placed above a lighter one whatever else they do.
// Each band's midpoint reproduces the single fixed percentile this used to
// return (90, 78, 64, 50, 34, 20, 10), so the calibration is unchanged.
// `fallback` is the fixed percentile each band returned before the two-stage
// design, used when GEB was never answered.
const PLASTIC_BANDS = [
  { max: 0, floor: 86, ceil: 99, fallback: 90 },
  { max: 1, floor: 72, ceil: 85, fallback: 78 },
  { max: 2, floor: 58, ceil: 71, fallback: 64 },
  { max: 3, floor: 44, ceil: 57, fallback: 50 }, // ~ Thai average of ~3/day
  { max: 5, floor: 28, ceil: 43, fallback: 34 },
  { max: 7, floor: 14, ceil: 27, fallback: 20 },
  { max: Infinity, floor: 2, ceil: 13, fallback: 10 }
];

function environmentBenchmark(profile, baseline) {
  const pieces = parseInt(profile.singleUsePlastics || 0);
  const { floor, ceil, fallback } = PLASTIC_BANDS.find(b => pieces <= b.max);
  // STAGE 2 (this app's own): the six GEB items — recycling, single-use
  // avoidance, transit, energy habits, eco-product choice. Plastic count alone
  // said nothing about any of them.
  const intensity = intensityOf((baseline || {}).geb, 24);
  return {
    percentile: positionInBand(floor, ceil, intensity, fallback),
    method: "estimate",
    population: t("Thai adults"),
    summary: tp("{pieces} single-use plastic pieces/day vs the ~3/day Thai average", { pieces }),
    notes: [
      t("Banded around the post-plastic-ban Thai average; per-person distribution data is not published."),
      TWO_STAGE_NOTE()
    ],
    sources: [SOURCES.thaiPlastic]
  };
}

// --- HUMANITY'S FUTURE: long-term security vs Thai retirement coverage ---
//
// STAGE 1 (cited). Most Thai workers lack adequate retirement savings and ~2
// in 3 over-60s are ineligible for a social-security annuity, so holding
// long-term investments places a person above that majority. Two bands,
// non-overlapping — midpoints 71 and 28, matching the 70/30 this used to
// return.
//
// This aspect was the worst offender: a two-valued function of one checkbox,
// which meant the aspect carrying the app's "lift humanity up" thesis could
// only ever grade C or B, and every LFIS answer about legacy, philanthropy and
// long-horizon thinking changed the score but not the standing.
// `fallback` is the fixed 70/30 this returned before the two-stage design.
const FUTURE_BANDS = {
  invested: { floor: 50, ceil: 92, fallback: 70 },
  none: { floor: 8, ceil: 49, fallback: 30 }
};

function humanityFutureBenchmark(profile, baseline) {
  const invested = Boolean(profile.longTermInvestments);
  const { floor, ceil, fallback } = invested ? FUTURE_BANDS.invested : FUTURE_BANDS.none;
  // STAGE 2 (this app's own): the five LFIS items — future skills, legacy,
  // philanthropic intent, long-horizon risk thinking, security planning.
  const intensity = intensityOf((baseline || {}).lfis, 20);
  return {
    percentile: positionInBand(floor, ceil, intensity, fallback),
    method: "threshold",
    population: t("Thai workers"),
    summary: t(invested
      ? "Holds long-term retirement investments — ahead of most Thai workers"
      : "No long-term retirement investments yet — like most Thai workers"),
    notes: [
      t("Most Thai workers lack adequate retirement savings; ~2 in 3 over-60s get no social-security annuity."),
      TWO_STAGE_NOTE()
    ],
    sources: [SOURCES.thaiRetirement]
  };
}

// Returns {aspectKey: benchmark|null}. Survey-based aspects need
// state.baseline (raw instrument sums stored at onboarding) and return
// null for saves made before it existed.
export function getAllBenchmarks(state) {
  const profile = state.profile || {};
  const baseline = state.baseline || null;
  const set = {
    finance: financeBenchmark(profile),
    physical: physicalBenchmark(profile),
    // Takes `profile` for the age band its published percentile table is
    // stratified by, mirroring socialContributionBenchmark below.
    mental: mentalBenchmark(profile, baseline),
    // Takes `profile` for the same reason mental does: the one age-stratified
    // row its cited source publishes (CLS Table A3b).
    relationships: relationshipsBenchmark(profile, baseline),
    personalGoals: personalGoalsBenchmark(baseline),
    // These three take `baseline` too: their cited sources publish
    // participation rates, not distributions, so the instrument sums are what
    // give the percentile any resolution inside the cited band.
    socialContribution: socialContributionBenchmark(profile, baseline),
    environment: environmentBenchmark(profile, baseline),
    humanityFuture: humanityFutureBenchmark(profile, baseline)
  };
  // Attach an indicative percentile range to every computable benchmark in one
  // place (immutably) so each *Benchmark function stays focused on its score.
  // Deep-verified aspects get the narrower band.
  //
  // An UNRANKED benchmark (relationships) has no percentile, so it gets no
  // range: a margin around a number that does not exist would be exactly the
  // precision theater this module refuses. Consumers must branch on the
  // percentile being finite, never assume `range` is present.
  const deepDone = (baseline && baseline.deepDone) || {};
  const withRanges = {};
  for (const [key, b] of Object.entries(set)) {
    if (!b) {
      withRanges[key] = null;
      continue;
    }
    const verified = !!deepDone[key];
    withRanges[key] = Number.isFinite(b.percentile)
      ? { ...b, range: percentileRange(b.percentile, b.method, verified), verified }
      : { ...b, range: null, verified };
  }
  return withRanges;
}

// Unique source list across a benchmark set, for the citations card.
export function collectSources(benchmarks) {
  const seen = new Set();
  const list = [];
  Object.values(benchmarks).forEach(b => {
    if (!b) return;
    b.sources.forEach(src => {
      if (!seen.has(src.url)) {
        seen.add(src.url);
        list.push(src);
      }
    });
  });
  return list;
}
