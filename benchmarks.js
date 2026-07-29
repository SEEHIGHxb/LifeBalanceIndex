// benchmarks.js - Population reference points for each life aspect.
//
// Every figure below comes from a published source (verified 2026-07).
// Percentiles are honest approximations, never precision theater:
//   method "distribution" - normal approximation of a published mean/SD
//   method "threshold"    - placement against published participation rates
//   method "estimate"     - calibrated curve anchored to published figures
// The UI must always show the method and sources next to the number.
// Source labels stay in English on purpose: they are literature citations.

import { t, tp } from "./i18n.js";

const SOURCES = {
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
    label: "WHO-5 community norms, representative German sample 2025 (mean 67.6, SD 23.0 on 0-100)",
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

function toPercentile(p01) {
  return Math.min(99, Math.max(1, Math.round(p01 * 100)));
}

// Indicative percentile range — a margin reflecting each method's precision,
// NOT a statistical confidence interval (we lack per-norm sample sizes, and a
// fake CI would be the precision theater this module avoids). Widths:
//   distribution = real published mean/SD  -> tightest
//   estimate     = calibrated curve        -> medium
//   threshold    = participation-band placement -> coarsest
// A completed deep (long-form) section raises reliability, so its band is
// roughly half as wide as the short-form one.
const PERCENTILE_MARGIN = { distribution: 6, estimate: 10, threshold: 12 };
const PERCENTILE_MARGIN_VERIFIED = { distribution: 3, estimate: 5, threshold: 8 };

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
    const overweightShare = profile.gender === "male" ? 32.9 : profile.gender === "female" ? 41.8 : 37.5;
    notes.push(tp(bmi < 25
      ? "BMI {bmi} — below the BMI-25 line that {share}% of Thai adults are over."
      : "BMI {bmi} — in the {share}% of Thai adults at BMI 25+.", { bmi: bmi.toFixed(1), share: overweightShare }));
  }

  return {
    percentile: toPercentile(p01),
    method: "estimate",
    population: t("Thai adults"),
    summary: tp("{met} MET-min/week vs Thai adults (WHO guideline = 600)", { met: Math.round(met) }),
    notes,
    sources: [SOURCES.thaiSpa, SOURCES.nhesBmi]
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
//        - WHO-5: representative German adults (mean 67.6/100, SD 23.0).
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
// open research brief lives in docs/research/.

// --- MENTAL: WHO-5 vs community norms ---
function mentalBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.who5)) return null;
  const score100 = baseline.who5 * 4; // raw 0-25 -> 0-100
  const notes = [];
  if (Number.isFinite(baseline.st5)) {
    const band = baseline.st5 <= 4 ? "no stress problem" : baseline.st5 <= 6 ? "possible stress problem" : "stress problem";
    notes.push(tp('ST-5 stress score {n}/15 — "{band}" band on the Thai DMH scale.', { n: baseline.st5, band: t(band) }));
  }
  notes.push(t("Percentile is against a German WHO-5 community sample — no representative Thai WHO-5 norm is published, so read it as indicative."));
  return {
    percentile: toPercentile(normalCdf(score100, 67.56, 22.96)),
    method: "distribution",
    population: t("adults in a German community sample"),
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
// approximation — the direction of the error is not even known. Loneliness is
// U-shaped across the lifespan, so the UCLA norm probably makes users look
// LONELIER than they are, while working-age people carry workplace ties the
// LSNS norm never counted, which probably makes them look BETTER connected.
// Two unquantified biases pointing opposite ways is not a percentile.
//
// What survives is everything that does not depend on a norming sample:
//   - the raw instrument readings, which the user answered and can act on;
//   - the LSNS-6 < 12 isolation cutoff, which is the instrument's OWN validated
//     threshold, published with the scale rather than derived from a sample.
// So the aspect still says something true and useful; it just stops claiming a
// rank it cannot support. `unranked` carries the reason, and every consumer
// surface renders it as an explicit disclosure, never as missing data.
function relationshipsBenchmark(baseline) {
  if (!baseline || !Number.isFinite(baseline.ucla) || !Number.isFinite(baseline.lsns)) return null;
  const notes = [
    tp("Loneliness (UCLA-3) {ucla}/9 — lower is better. Social network (LSNS-6) {lsns}/30 — higher is better.",
      { ucla: baseline.ucla, lsns: baseline.lsns }),
    tp(baseline.lsns < 12
      ? "LSNS-6 score {n}/30 is under the social-isolation cutoff of 12."
      : "LSNS-6 score {n}/30 is above the social-isolation cutoff of 12.", { n: baseline.lsns })
  ];
  return {
    percentile: null,
    unranked: t("Both scales are normed on older adults — UCLA-3 on US adults aged 57-85, LSNS-6 on European over-65s. No Thai working-age norm is published for either, so this app will not pretend to rank you on it. Your scores and the isolation cutoff below are still real measurements."),
    method: "estimate",
    population: null,
    summary: t("Loneliness (UCLA-3) and social network (LSNS-6) — measured, not ranked"),
    notes,
    sources: [SOURCES.ucla3, SOURCES.lsns6]
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
    ? t("Scored from your full 10-item GSE — a direct match to the 25-country norm, no short-form approximation.")
    : t("Your 6-item GSE is compared per-item against 10-item GSE norms — a short-form approximation, not an exact match."));
  return {
    // Per-item comparison against the GSE-10 norm (29.55/10 items = 2.96,
    // SD 5.32/10 = 0.53). With the deep GSE-10 this is exact; the GSE-6 short
    // form is an approximation.
    percentile: toPercentile(normalCdf(perItem, 2.955, 0.532)),
    method: deepGse ? "distribution" : "estimate",
    population: t("adults in the 25-country GSE norms"),
    summary: t("Self-efficacy (GSE) vs 25-country norms, N=19,120"),
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
    mental: mentalBenchmark(baseline),
    relationships: relationshipsBenchmark(baseline),
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
