// views/methodology.js - the "How scores are measured" page (#/methodology).
//
// One place a user (or a reviewer) can read WHAT each aspect score is built
// from, WHERE each instrument comes from, HOW the composite weights are set,
// and what the known limitations are — without reading source code. The
// citation labels stay in English on purpose (they are literature citations,
// same rule as benchmarks.js); everything else is translated.

import { t, tp } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

// Instrument provenance. `cite` labels are canonical English citations.
const CITES = {
  cfpb: { label: "CFPB (2015), Measuring financial well-being: A guide to using the CFPB Financial Well-Being Scale", url: "https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/" },
  ipaq: { label: "IPAQ short form — MET-minute scoring protocol", url: "https://sites.google.com/view/ipaq" },
  jss: { label: "Jenkins et al. (1988), A scale for the estimation of sleep problems in clinical research", url: "https://pubmed.ncbi.nlm.nih.gov/3193141/" },
  who5: { label: "WHO-5 Well-Being Index (Psychiatric Research Unit, Region H, Denmark)", url: "https://www.corc.uk.net/outcome-experience-measures/the-world-health-organisation-five-well-being-index-who-5/" },
  st5: { label: "Srithanya Stress Test ST-5, Thai Dept. of Mental Health", url: "https://he01.tci-thaijo.org/index.php/jmht/article/view/1296" },
  pss: { label: "Cohen et al. (1983), Perceived Stress Scale (PSS-10)", url: "https://pubmed.ncbi.nlm.nih.gov/6668417/" },
  lsns: { label: "Lubben et al. (2006), LSNS-6 / LSNS-R social network scales", url: "https://pubmed.ncbi.nlm.nih.gov/16921004/" },
  ucla: { label: "Hughes et al. (2004), UCLA 3-item Loneliness Scale", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2394670/" },
  ras: { label: "Hendrick (1988), Relationship Assessment Scale", url: "https://doi.org/10.2307/352430" },
  gse: { label: "Schwarzer & Jerusalem (1995), General Self-Efficacy Scale", url: "https://userpage.fu-berlin.de/~health/faq_gse.pdf" },
  citacc: { label: "Su, Tay & Diener (2014), Comprehensive Inventory of Thriving — Accomplishment subscale", url: "https://doi.org/10.1111/aphw.12027" },
  citlearn: { label: "Su, Tay & Diener (2014), Comprehensive Inventory of Thriving — Learning subscale", url: "https://doi.org/10.1111/aphw.12027" },
  grit: { label: "Duckworth & Quinn (2009), Short Grit Scale (Grit-S)", url: "https://pubmed.ncbi.nlm.nih.gov/19205937/" },
  rses: { label: "Rosenberg (1965), Rosenberg Self-Esteem Scale", url: "https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale" },
  cfc: { label: "Strathman et al. (1994), Consideration of Future Consequences scale", url: "https://doi.org/10.1037/0022-3514.66.4.742" }
};

function citeLinks(keys) {
  return keys.map(k => `<a href="${CITES[k].url}" target="_blank" rel="noopener noreferrer">${escapeHtml(CITES[k].label)}</a>`).join(" · ");
}

// Average absolute score shift per re-assessed aspect across the check-in
// history — a plain-language test-retest stability readout.
export function scoreStability(state) {
  const checkins = (state && state.checkins) || [];
  const shifts = checkins.flatMap(c => Object.values(c.shifts || {}));
  if (shifts.length === 0) return null;
  const avg = shifts.reduce((sum, v) => sum + Math.abs(v), 0) / shifts.length;
  return { count: checkins.length, avg: Math.round(avg * 10) / 10 };
}

// WHERE EACH COMPARISON COMES FROM.
//
// A percentile is only as honest as the sample behind it, and a 2026-07
// literature sweep established that no representative Thai general-adult norm
// is published for ANY of the questionnaires this app uses. Rather than bury
// that, the page states each aspect's reference sample outright — including the
// one aspect where the sample is so wrong that no rank is printed at all.
//
// `rank` is the promise the app makes about that row:
//   "ranked" - a percentile against a named published distribution
//   "band"   - placement against published participation rates, not a curve
//   "none"   - measured, but deliberately not ranked
// `sample` stays in English: it names a published dataset, the same rule the
// CITES labels above follow. `where` and `rank` are keys into the label maps
// below rather than raw strings, so every translatable string in this table is
// a LITERAL t() call the i18n coverage test can see — a t(variable) would be
// invisible to it and would silently ship untranslated.
// Exported for the copy-vs-code guard in tests/methodology.test.mjs: a row
// claiming a rank the benchmark no longer produces is exactly the defect v77
// shipped twice (this table, and the two-stage paragraph below).
export const COMPARISON_SAMPLES = [
  { aspect: "Finance", sample: "Thai worker wages (Labour Force Survey via Bank of Thailand)", where: "thWorking", rank: "ranked" },
  { aspect: "Physical", sample: "Thai adults meeting the WHO activity guideline; Thai NHES for BMI", where: "thAdults", rank: "ranked" },
  // The one row read straight out of a published percentile table rather than
  // approximated from a mean/SD — and the one stratified by the user's own age.
  { aspect: "Mental", sample: "WHO-5 community norms, representative German sample (Kliem et al. 2025, Table 2 — cumulative percentiles by age band)", where: "deAdultsAge", rank: "table" },
  // Two references in one row on purpose: the norms that CANNOT be ranked
  // against, and the all-ages survey that supports a band placement but still
  // no rank.
  { aspect: "Relationships", sample: "UCLA-3: US Health and Retirement Study, ages 57-85. LSNS-6: European over-65s. Band placement only: Community Life Survey 2024/25 (DCMS), England, adults 16+, base 160,755 — Tables A3a and A3b.", where: "wrongAgePlusEngland", rank: "noneBanded" },
  { aspect: "Personal Goals", sample: "General Self-Efficacy Scale, 25-country pooled norms (N=19,120)", where: "multi", rank: "ranked" },
  { aspect: "Social Contribution", sample: "CAF World Giving Index — Thai donating and volunteering rates", where: "thAdults", rank: "band" },
  // v77: was `band` on the ~3/day Thai plastic average. `band` means "placed
  // AND ranked inside the band" (see RANK_LABELS), and that second half rested
  // on a 2-99 ladder derived from that single average with no per-person
  // distribution behind it. The placement is real and stays; the rank is gone.
  { aspect: "Environment", sample: "Thai single-use plastic use per person per day — placement only, no published distribution", where: "thAdults", rank: "noneBanded" },
  // v64: was `band` on Thai retirement-savings coverage. That statistic is real
  // but it measures financial security, and banding this aspect on it ranked
  // income rather than contribution. No Thai norm for purpose or generativity
  // is published, so there is nothing to re-band on and the rank is gone.
  { aspect: "Humanity's Future", sample: "No published Thai norm for purpose, legacy or generativity", where: "noThaiNorm", rank: "none" }
];

const RANK_LABELS = () => ({
  ranked: t("Ranked"),
  table: t("Ranked from a published table"),
  band: t("Band placement"),
  none: t("Not ranked"),
  // Distinct from `band`: those aspects place you in a band AND rank you inside
  // it. This one places you and stops.
  noneBanded: t("Not ranked — band placement only")
});

const WHERE_LABELS = () => ({
  thWorking: t("Thailand · working age"),
  thAdults: t("Thailand · adults"),
  thWorkers: t("Thailand · workers"),
  deAdults: t("Germany · adults"),
  deAdultsAge: t("Germany · adults, by age band"),
  multi: t("25 countries · adults"),
  wrongAgePlusEngland: t("Norms: wrong age band. Band placement: England · adults 16+"),
  noThaiNorm: t("None published — measured, not ranked")
});

// GUIDELINE CHECKS — the criterion-referenced table.
//
// Same rules as COMPARISON_SAMPLES above: `source` names a published document
// and stays in English, while every translatable cell is a LITERAL t() call so
// tests/i18n-coverage.test.mjs can see it. Built as a function (not a const)
// because t() must run at render time, after the language is known.
//
// The thresholds here MUST match the constants in criteria.js. They are
// restated rather than imported because this table also documents the
// exclusions and the "not measured" cases, which are prose, not constants —
// tests/criteria.test.mjs pins the numeric side.
const CRITERION_ROWS = () => [
  { aspect: t("Physical"), check: t("Aerobic activity"), rule: t("150 min moderate or 75 min vigorous per week, or an equivalent mix"), source: "WHO Guidelines on physical activity and sedentary behaviour, 2020" },
  { aspect: t("Physical"), check: t("Muscle strengthening"), rule: t("2 or more days per week"), source: "WHO Guidelines on physical activity and sedentary behaviour, 2020" },
  { aspect: t("Physical"), check: t("Body mass index"), rule: t("Under 23.0 — the Asia-Pacific overweight line, not the global 25"), source: "WHO Western Pacific / Asia-Pacific BMI classification" },
  { aspect: t("Physical"), check: t("Sleep duration"), rule: t("7-9 hours a night, or 7-8 from age 65"), source: "National Sleep Foundation (Hirshkowitz et al. 2015, Sleep Health)" },
  { aspect: t("Physical"), check: t("Fruit and vegetables"), rule: t("400 g a day, about 5 portions"), source: "WHO healthy diet fact sheet" },
  { aspect: t("Mental"), check: t("Well-being screening"), rule: t("Above 50 of 100 on the WHO-5 — a screening threshold, not a rank"), source: "Topp et al. 2015, Psychother Psychosom 84(3):167-176" }
];

function criterionRows() {
  return CRITERION_ROWS().map(row => `
    <tr>
      <th scope="row">${escapeHtml(row.aspect)}</th>
      <td>${escapeHtml(row.check)}</td>
      <td>${escapeHtml(row.rule)}</td>
      <td>${escapeHtml(row.source)}</td>
    </tr>`).join("");
}

function comparisonRows() {
  const ranks = RANK_LABELS();
  const wheres = WHERE_LABELS();
  return COMPARISON_SAMPLES.map(row => `
    <tr${row.rank.startsWith("none") ? ' class="provenance-unranked"' : ""}>
      <th scope="row">${escapeHtml(t(row.aspect))}</th>
      <td>${escapeHtml(row.sample)}</td>
      <td>${escapeHtml(wheres[row.where])}</td>
      <td>${escapeHtml(ranks[row.rank])}</td>
    </tr>`).join("");
}

// `cites` empty means the aspect uses app-authored items — that is disclosed
// instead of dressed up with a borrowed citation.
function aspectSection(title, formula, rationale, cites) {
  const provenance = cites.length
    ? citeLinks(cites)
    : escapeHtml(t("App-authored behavioral items — not a standardized instrument. Read this aspect as a habits index, not a validated psychological measure."));
  return `
    <div class="component-row">
      <div class="component-head"><span>${escapeHtml(title)}</span></div>
      <div class="component-detail">${escapeHtml(formula)}</div>
      <div class="component-detail">${escapeHtml(rationale)}</div>
      <div class="component-detail benchmark-sources">${provenance}</div>
    </div>`;
}

export function renderMethodology(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stability = scoreStability(state);

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>

    <div class="card">
      <h2 class="aspect-title">${t("How scores are measured")}</h2>
      <p class="aspect-blurb">${t("Each aspect score (0-100) combines published, validated questionnaires with facts you report about your life. This page shows every instrument, how it is scored, how the parts are weighted, and the known limitations — so no number is a black box.")}</p>
      <p class="aspect-blurb">${t("This is a self-reflection tool, not a medical or psychological diagnosis. If a score worries you, treat it as a prompt to talk to a professional, not as a verdict.")}</p>
      <p class="aspect-blurb methodology-nongoal">${t("One thing this app does not measure: your worth as a person. Every number here is built from behavior you reported and circumstances you were handed — what you earn, how you slept, who is near you, how much time you have — and all of those move. Read a low score as a description of a situation, never as a judgment on the person living in it.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("The eight aspects")}</h4>
      ${aspectSection(
        t("Finance"),
        t("15% income standing + 85% CFPB Financial Well-Being score (official age-banded table). Those two weights are the whole score. Income standing is a magnitude, not a rank: the published average wage (15,972 THB/mo) scores 50 and the Revenue Department's top tax band (333,333 THB/mo) scores full marks, on a log scale so each doubling of income is worth the same. It is deliberately NOT the income percentile shown on the Finance card — a percentile has to flatten out at the top, because almost everyone really is below a top earner, which used to make every income above about 70,000 score identically. Savings is entered as an amount in baht and converted to a rate for you, and is shown on the Finance page without being scored: until v76 it added up to 10 points on top, which double-counted the CFPB question about having money left over at the end of the month and used a 20% target that came from a budgeting book rather than any published research."),
        t("Income was weighted 60% until v69, and that was wrong: no validated financial well-being instrument scores raw income at all, and the CFPB's own published figures move only about 14 points from the lowest income band to the highest. So how you are coping now carries the score, and your salary informs it rather than deciding it. The 15% is this app's own reading of that 14-point spread, not a published weight. Since v70 the app also asks for your liquid savings and your committed monthly outflow, and shows the runway between them on the Finance page — how many months you could cover the unskippable if income stopped. It is reported, never scored: two salaries of the same size can be entirely spoken for or entirely free, which is the gap the score cannot see, but no published distribution says what three months is worth against nine, and until one is found a weight here would be invented rather than measured."),
        ["cfpb"]
      )}
      ${aspectSection(
        t("Physical"),
        t("40% activity (IPAQ MET-minutes vs the WHO 600 guideline) + 20% Asian-BMI band + 20% sleep (Jenkins Sleep Scale + reported duration) + 20% nutrition (vegetables + water). Missing measurements are omitted and the weights renormalized — never faked."),
        t("Activity carries the most weight because it has the strongest evidence base and is the component your weekly review re-measures most directly."),
        ["ipaq", "jss"]
      )}
      ${aspectSection(
        t("Mental"),
        t("50% WHO-5 well-being + 50% ST-5 stress resilience (Thai DMH cutoffs, inverted so calmer scores higher). The in-depth PSS-10 refines the stress half when completed."),
        t("An equal split of positive well-being and stress keeps one bad week from dominating the score."),
        ["who5", "st5", "pss"]
      )}
      ${aspectSection(
        t("Relationships"),
        t("40% social network (LSNS-6) + 30% low loneliness (UCLA-3) + 30% relationship satisfaction (RAS, couples only). Singles reweight to 50/50 — being single is never penalized."),
        t("Network size and felt loneliness measure different things; both matter, so neither dominates."),
        ["lsns", "ucla", "ras"]
      )}
      ${aspectSection(
        t("Personal Goals"),
        t("An equal third each: goal progress (CIT Accomplishment), self-efficacy (GSE), and active learning — half your weekly study hours, half the CIT Learning subscale. The in-depth section adds the full GSE-10 and Rosenberg self-esteem; both CIT subscales are re-asked at every monthly check-in instead. Grit is still asked and still shown, but is no longer scored."),
        t("Until recently this aspect measured how capable you feel and how much you study — not whether you are getting anywhere. Goal progress is the missing third, and it is the only part named after what the aspect is called. Three things to know about it. The equal weighting is our choice, not the instrument's: its authors publish no rule for combining their subscales, so we follow what they did when they built their own short form and weight the parts equally. It is a self-appraisal, not a record of what you did — your weekly pledges still earn XP and still change no score, because nothing published licenses scoring wellbeing from attainment you set yourself. And it is deliberately not ranked against a norm: the only published norms are American, and the instrument's own cross-national study found this subscale's wording shifts between countries. It also overlaps with life satisfaction more than most, so a low reading here and a low Mental score are not two independent findings. The learning half was a 0-100 slider where you rated your own digital skills — no instrument, no norm, nothing to check it against. It is now the same inventory's Learning subscale, which is also not ranked, for the same reason. Its authors describe learning as possibly peripheral to wellbeing rather than central, and we have kept your study hours as the other half rather than let a three-question appraisal carry the whole term. One limitation across the whole aspect: its three parts correlate moderately with each other in the source research, so they are related readings rather than three independent ones. Grit left the score in 2017 for a different reason: a meta-analysis of 66,807 people found it nearly identical to ordinary conscientiousness, making it a personality trait rather than a life domain."),
        ["citacc", "citlearn", "gse", "grit", "rses"]
      )}
      ${aspectSection(
        t("Social Contribution"),
        t("40% donations (frequency + amount vs income) + 40% action (volunteering hours + helping behavior) + 20% civic participation."),
        t("Giving money and giving time are weighted equally; civic habits count but are the hardest to self-report accurately. Money you send to your family is shown on this page and is deliberately not part of the score. Until v78 the app did not ask about it separately at all: it was one of the examples under “committed monthly outflow”, so for a reader supporting their parents the largest transfer they make to another household counted as a bill in the finance section and as nothing whatsoever in the section about giving. It is now asked for on its own. It is still not scored, and that is not an oversight — the two published participation rates that fix the band for this percentile measure donating money to an organisation and formal volunteering, and neither asks about supporting parents. Adding it to a score whose band those rates decide would move you up a ranking whose population was never asked the question. So it is reported, named as giving, and left unranked, the same way this app treats every other measurement it has no honest population for."),
        []
      )}
      ${aspectSection(
        t("Environment"),
        t("40% waste (daily single-use plastics vs the ~3/day Thai average + recycling habits) + 40% transit choices + 20% conservation habits."),
        t("Plastics and transport dominate the part of an individual Thai footprint that daily habits can actually change."),
        []
      )}
      ${aspectSection(
        t("Humanity's Future"),
        t("20% future skills + 20% legacy actions + 20% offering (giving toward future generations and passing skills on) + 20% long-horizon planning + 20% maintaining (keeping a home, tools, land, animals or something shared in good order). The in-depth CFC-12 adds a validated future-orientation reading."),
        t("Five equal parts because there is no published evidence for ranking them — an honest uniform prior. This aspect is measured but NOT ranked against a population, because no Thai norm for purpose, legacy or generativity is published. It used to be ranked on whether you hold a retirement product, which ranked your income rather than your contribution: a farmer who had taught three children a trade could not reach a pension-holder's band no matter what they answered. Holding retirement investments is still shown here, and now counts only in Finance. The maintaining question was added in v65: psychology describes contributing to the future as creating, maintaining and offering, and until then this aspect asked only about the first and the third — so work that sustains rather than originates scored nowhere at all. If you answered before v65, your reading stays on the earlier five-question scale and is labelled with it, because restating an old answer against a question you were never asked would be a guess rather than a measurement."),
        ["cfc"]
      )}
    </div>

    <div class="card">
      <h4 class="card-header">${t("Who you are actually compared with")}</h4>
      <p class="aspect-blurb">${t("A percentile is a claim about where you sit among a group of people — so the group matters as much as the number. A literature search in July 2026 found no representative Thai general-adult norm published for any of the questionnaires here. Every reference sample is therefore either foreign or non-representative, and this table says which is which instead of leaving you to assume the comparison is with Thai people your age.")}</p>
      <div class="provenance-scroll">
        <table class="provenance-table">
          <thead>
            <tr>
              <th scope="col">${t("Aspect")}</th>
              <th scope="col">${t("Compared with")}</th>
              <th scope="col">${t("Sample")}</th>
              <th scope="col">${t("What is claimed")}</th>
            </tr>
          </thead>
          <tbody>${comparisonRows()}</tbody>
        </table>
      </div>
      <p class="aspect-blurb">${t("Relationships is the one aspect with no rank at all. Its two questionnaires are normed on people a generation older — UCLA-3 on US adults aged 57-85, LSNS-6 on European over-65s — and the size of that error is unknown and differs between the two scales. Your scores and the social-isolation cutoff are still shown, because those are real measurements; the rank is withheld, because it would be a guess wearing a number's clothes.")}</p>
      <p class="aspect-blurb">${t("It does now carry one real population reference. A national survey in England asks the same three loneliness questions on the same three-point scale and publishes the combined 3-9 score in three bands — 58% of adults score 3 or 4, 33% score 5 to 7, and 9% score 8 or 9, out of 160,755 people of every adult age. Your score is shown against those bands. It stops there deliberately: three bands are two dividing lines, and turning two lines into a percentile would mean guessing where inside a band you sit. That guess is the thing this aspect refuses to make.")}</p>
      <p class="aspect-blurb">${t("That survey is also the clearest evidence that withholding the rank is right rather than merely cautious. It reports the loneliest band by age: 12% of 16-24s score 8 or 9, falling to 5% of 65-74s before ticking back up to 7% at 75 and over. Younger adults are the lonelier group across almost the whole range. So a norm built on 57-to-85-year-olds is not just the wrong sample for a working-age user — it leans the wrong way, and ranking against it would quietly flatter you.")}</p>
      <p class="aspect-blurb">${t("Where a comparison is foreign but the age range fits — the German WHO-5 sample, the 25-country self-efficacy norms — the rank is shown and the sample is named next to it, on the aspect page as well as here. Read those as indicative rather than as your standing among Thai adults.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("Guideline checks, and why they are separate")}</h4>
      <p class="aspect-blurb">${t("Because no representative Thai norm exists for these questionnaires, some aspects also carry a second kind of comparison that needs no sample at all: a published guideline. A norm describes what people do; a guideline states what a body needs. That difference is why a WHO recommendation can be applied to a Thai user without the cross-country problems above — and why these checks are readable side by side in a way eight percentiles against six different populations never were.")}</p>
      <p class="aspect-blurb">${t("They are kept strictly separate from your scores. A guideline check never changes an aspect score, a letter grade, or the Balance Index. A grade is a rank; a guideline check is a yes or no against a published recommendation, and mixing the two would make a grade mean different things on different aspects.")}</p>
      <div class="provenance-scroll">
        <table class="provenance-table">
          <thead>
            <tr>
              <th scope="col">${t("Aspect")}</th>
              <th scope="col">${t("Check")}</th>
              <th scope="col">${t("Guideline")}</th>
              <th scope="col">${t("Source")}</th>
            </tr>
          </thead>
          <tbody>${criterionRows()}</tbody>
        </table>
      </div>
      <p class="aspect-blurb">${t("A check reads “Not measured” when the app has never asked for the input it needs — strength-training days, for instance, are not yet part of the weekly review. That is shown as missing rather than as a failure, because not being asked is not the same as falling short.")}</p>
      <p class="aspect-blurb">${t("Two things deliberately have no guideline check. Drinking water: the often-quoted 2 litres a day comes from EFSA's adequate intake, which counts total water including the moisture in food, while this app asks only what you drink — so citing it here would compare two different quantities. The 2 litre pledge is a useful convention, not a guideline. Sitting time: WHO says only to limit it, without naming a number, so there is nothing to pass or fail.")}</p>
      <p class="aspect-blurb">${t("Finance, social contribution, environment and humanity's future have no guideline checks either, for a simpler reason: no institution publishes a per-person threshold for them. What counts as enough income or enough giving depends on where you live and what things cost, so those aspects stay compared with Thai figures rather than a global rule.")}</p>
      <p class="aspect-blurb">${t("One limitation worth naming: the fruit-and-vegetable guideline covers both, while the weekly review asks only about vegetables. The check is therefore stricter than WHO intends — if you also eat fruit, you are closer to the guideline than it shows.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("Confidence, benchmarks, and answer quality")}</h4>
      <p class="aspect-blurb">${t("Every score carries a confidence tier: High (you answered everything), Partial, Estimated (defaults stood in), or Verified (you completed the full-length in-depth instruments).")}</p>
      <p class="aspect-blurb">${t("Society percentiles are honest approximations against cited published statistics — each benchmark names its method and sources, and the band around it is an indicative range, not a statistical confidence interval.")}</p>
      <p class="aspect-blurb">${t("Mental well-being is ranked differently from the rest, and better. Its study publishes a full percentile table broken down by age band, so your standing is looked up in that table directly rather than estimated from an average and a spread — and it is read from the row for people your own age, because the same well-being score is common at 70 and uncommon at 30. Nothing is interpolated: every score this app can produce is a printed row. The sample is still German, and being compared with Germans your age is more precise but no more relevant to life in Thailand — that limitation has not gone away.")}</p>
      <p class="aspect-blurb">${t("Social contribution has no published distribution to sit on, because its source publishes participation rates (“67% of Thais donated money”) rather than a curve. Its percentile is therefore built in two stages: the published rate fixes which band you are in, and your own answers position you inside that band and can never move you out of it. Environment and humanity's future used to be described here too. Neither is ranked any more — their sources publish a single average and nothing at all respectively, and one number cannot say what share of people you are ahead of, so those two aspects show their measurements and withhold the rank.")}</p>
      <p class="aspect-blurb">${t("The dashed outline on the dashboard radar is a derived population average: a reference person assembled from the same cited statistics (median income, typical activity levels, published questionnaire means) is scored through the exact formulas that score you.")}</p>
      <p class="aspect-blurb">${t("Behavior-driven aspects are re-measured by the weekly review: the quantities you report replace last week's values inside the same formulas, so a score moves exactly as much as the measured change implies — never by flat per-log bonuses.")}</p>
      <p class="aspect-blurb">${t("Answer quality is checked: a questionnaire answered with the same option on every row (despite reverse-worded questions) is not counted as a confirmed measurement until re-answered.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("Grades and the Balance Index")}</h4>
      <p class="aspect-blurb">${t("No score in this app reaches 100 — not an aspect, not the Balance Index. The arithmetic is allowed to, and then the displayed figure stops at 99. That is a stance rather than a rounding rule: a perfect score would read as “nothing left to do” on an instrument whose whole purpose is to point at the next step.")}</p>
      <p class="aspect-blurb">${t("A letter grade (A-F) comes from an aspect's population percentile rather than its 0-100 score: A is the top 10%, B the top 30%, C the typical middle (30th-69th), D below typical, and F the bottom 10%. The percentile is the part of an aspect that compares you with published data, so it is normally the only part worth grading. Finance is the one exception: its percentile is your income standing and nothing else, so grading on it would grade your income alone — a person on a small income with no debt and no money worry was being shown an F. Finance is therefore graded on its whole score, which weights the financial well-being questions far more heavily than income. Your income percentile is still shown on the card. An aspect whose questionnaires you have not answered is shown as “not graded” — never as an F, because missing data is not a failing result.")}</p>
      <p class="aspect-blurb">${t("The Balance Index is this app's own summary figure, not a published or validated measure — unlike the eight aspect scores and their percentiles, no research proposes it and nothing outside this app uses it. Before they are combined, each aspect is rescaled against its population average so that being typical scores 50, whether that aspect's average sits at 32 or 70 — the same population comparison the grades use. That way an aspect the whole population scores low on (like social contribution) no longer anchors your balance down for being merely average. The index is then the harmonic mean of those eight relative standings, so your weakest one pulls it down hardest: eight standings of 50 give an index of 50, while seven near 57 with one collapsed give a far lower number, even though both average 50. That is deliberate — a single number that rewarded a high average would reward neglecting an aspect entirely, and this app is about balance.")}</p>
      <p class="aspect-blurb">${t("Because the index is dominated by your weakest aspect, raising a below-average score moves it far more than raising an already-strong one. The dashed population-average line on your dashboard radar is the 50 mark: sit on it on every aspect and your index is 50. Treat it as a prompt about where attention is missing, not as a verdict on your life.")}</p>
      <p class="aspect-blurb">${t("Grades also steer suggestions: when you add a weekly pledge, the ones tied to your lowest-graded aspects are listed first, so the easiest win to act on is already at the top.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("Measurement stability")}</h4>
      <p class="aspect-blurb">${
        stability
          ? tp("Across your {count} re-assessment(s), survey-based scores shifted by an average of {avg} points (each shift is capped at ±15). Smaller average shifts mean the measurement is stable for you.", { count: stability.count, avg: stability.avg })
          : t("Complete a monthly re-assessment to start tracking how stable your scores are over time.")
      }</p>
    </div>
  `;
}
