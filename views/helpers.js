// views/helpers.js - presentation glue shared by two or more view modules:
// HTML escaping, aspect labels, confidence badges, benchmark standing lines,
// and the accessible dialog scaffold.

import { percentileBand } from "../benchmarks.js";
import { getAspectConfidence, ASPECT_KEYS } from "../aspects.js";
import { t, tp, percentileLabel, dateLocale } from "../i18n.js";

// Escape user-provided strings before inserting into innerHTML.
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

export const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

// Localized aspect label (falls back to the raw key).
// Escaped: an unknown key (e.g. from an imported save) falls through to `key`
// itself, which would otherwise be echoed raw into innerHTML.
export const aspectLabel = key => escapeHtml(t(ASPECT_LABELS[key] || key));

// --- BIRTHDAY FIELDS ---

// The month/day pair, shared by onboarding and the year-review screen so the
// two can never phrase or bound the same question differently.
//
// Month names come from Intl rather than a translated list: twelve hand-written
// keys per language is twelve chances to drift, and the browser already knows
// the Thai names. The year 2001 is an arbitrary non-leap year — only the month
// name is read off it.
//
// Deliberately month + day with NO year field. The year is what would make this
// a date of birth; without it this is only "when does your year turn".
export function birthdayFields({ idPrefix, month = null, day = null }) {
  const options = Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2001, i, 1).toLocaleDateString(dateLocale(), { month: "long" });
    return `<option value="${i + 1}"${month === i + 1 ? " selected" : ""}>${escapeHtml(name)}</option>`;
  }).join("");
  return `
    <div class="grid-2">
      <div class="form-group">
        <label for="${idPrefix}-month">${t("Birth month")}</label>
        <select id="${idPrefix}-month" class="form-control">
          <option value="">${t("Prefer not to say")}</option>
          ${options}
        </select>
      </div>
      <div class="form-group">
        <label for="${idPrefix}-day">${t("Day of month")}</label>
        <input type="number" id="${idPrefix}-day" class="form-control" min="1" max="31"
          inputmode="numeric" value="${day === null ? "" : escapeHtml(day)}">
      </div>
    </div>`;
}

// --- CONFIDENCE UI (Phase 2) ---

export const CONFIDENCE_LABELS = () => ({ verified: t("In-depth"), high: t("High"), partial: t("Partial"), estimated: t("Estimated") });

// Aspects whose survey inputs the monthly re-assessment (#/checkin) re-runs, so
// an estimated one there gets an actionable link rather than text-only guidance.
export const CHECKIN_ASPECTS = ["mental", "relationships", "personalGoals"];

// Small tier badge for an aspect (dashboard rows + aspect header). Empty string
// when confidence is unknown (older saves with no captured coverage).
export function confidenceBadge(conf) {
  if (!conf || !conf.tier) return "";
  const title = conf.tier === "verified"
    ? t("Measured with the full long-form instruments (deep assessment complete)")
    : tp("Score confidence: {answered} of {total} inputs answered", { answered: conf.answered, total: conf.total });
  return `<span class="confidence-badge confidence-${conf.tier}" title="${escapeHtml(title)}">${CONFIDENCE_LABELS()[conf.tier]}</span>`;
}

// Component-row chip: shown for partial/estimated (to flag low confidence) and
// for verified (to credit deep-assessment rows); high stays uncluttered.
export function componentConfidenceChip(tier) {
  if (tier !== "partial" && tier !== "estimated" && tier !== "verified") return "";
  return `<span class="component-confidence confidence-${tier}">${CONFIDENCE_LABELS()[tier]}</span>`;
}

// --- GRADES (Phase L1) ---

// Letter-grade chip for one aspect. `null` means the aspect has no benchmark
// yet (the survey instruments were never answered) and renders as an explicit
// "not graded" chip — NOT as an F. An unanswered questionnaire is missing
// data, and showing it as a failing grade would be the app inventing a verdict
// it has no measurement for.
// `unrankedReason` distinguishes the two very different ways a grade can be
// absent. "Not graded" means the user has not answered yet and CAN unlock it;
// "Not ranked" means the app has the answers but no defensible population to
// rank them against, and no amount of answering will change that. Collapsing
// the two would tell people to go and complete a questionnaire they already
// completed.
export function gradeBadge(grade, unrankedReason = null) {
  if (!grade && unrankedReason) {
    return `<span class="grade-badge grade-unranked" title="${escapeHtml(unrankedReason)}">${t("Not ranked")}</span>`;
  }
  if (!grade) {
    return `<span class="grade-badge grade-none" title="${escapeHtml(t("Answer this aspect's questionnaires to unlock its grade."))}">${t("Not graded")}</span>`;
  }
  const title = tp("Grade {letter} — {band} of people like you (percentile {pct}).", {
    letter: grade.grade, band: t(grade.label), pct: grade.percentile
  });
  return `<span class="grade-badge grade-${grade.grade.toLowerCase()}" title="${escapeHtml(title)}">${escapeHtml(grade.grade)}</span>`;
}

// The Balance Index headline block for a personal page. `index` is the
// harmonic mean from grades.js; `weakest` is its {aspect, score} drag point;
// `standing` is the {count, total} from aspectsAtOrAboveAverage().
//
// The standing sentence sits ABOVE the caption on purpose. "Am I at least the
// average of the population?" is the question this app exists to answer, and
// until now the answer was only ever implied — spread across eight percentiles
// and folded into one composite number. It is stated first; the caption
// explaining how the composite is built is fine print underneath it.
//
// The caption is deliberate: this number is the app's own aggregate, not a
// published measure, and every surface that shows it says so. Removing that
// line would put an uncited construct next to eight cited ones with nothing
// to tell them apart.
export function balanceIndexBlock(index, band, weakest, standing = null) {
  return `
    <div class="balance-index">
      <div class="balance-index-figure">
        <span class="balance-index-value">${index}</span>
        <span class="balance-index-max">/100</span>
      </div>
      <div class="balance-index-body">
        <p class="balance-index-title">${t("Balance Index")} <span class="balance-band band-${band.key}">${t(band.label)}</span></p>
        ${standing ? `<p class="balance-index-standing">${tp("You are at or above the population average in {count} of {total} aspects.", { count: standing.count, total: standing.total })}</p>` : ""}
        <p class="balance-index-caption">${t("A harmonic mean of how your eight aspects compare with the population — 50 is the average person, and it rises fastest when your weakest aspect rises. This is this app's own summary figure, not a published measure.")}</p>
        ${weakest ? `<p class="balance-index-weakest">${tp("Lifting {aspect} would move it most.", { aspect: aspectLabel(weakest.aspect) })}</p>` : ""}
      </div>
    </div>`;
}

// --- FRIENDLIER PERCENTILE PRESENTATION ---
//
// A percentile is jargon; most people read "ahead of ~62% of people like you"
// far more easily. These helpers turn the raw percentile into a plain-language
// phrase and a one-line definition; the coarse band label comes from
// percentileBand() in benchmarks.js. The exact number and its indicative range
// stay available as secondary detail.

// The headline sentence a non-technical reader understands at a glance.
//
// `population` NAMES the group the percentile is actually against. The old
// wording said "people like you" for every aspect, which was true only for the
// Thai-sourced ones — the WHO-5 comparison is a German community sample and the
// GSE comparison is a 25-country pooled norm, and calling either "people like
// you" to a Thai user was the app overstating what it knows. Falls back to the
// generic phrasing only when a benchmark has not declared its population.
export function percentilePhrase(percentile, population = null) {
  return population
    ? tp("Ahead of about {pct}% of {population}", { pct: percentile, population })
    : tp("Ahead of about {pct}% of people like you", { pct: percentile });
}

// One shared "Standing vs society" block, used on the dashboard row and the
// aspect gauge. `compact` trims it to a single line for the dashboard list.
//
// A benchmark with no finite percentile is UNRANKED: measured, but with no
// defensible population to rank against (see relationshipsBenchmark). It states
// that plainly instead of a number — never a silent blank, and never a 0.
//
// Only the one-line statement, not the full reason: the reason is a paragraph,
// and both callers already surface it within the same screen — the aspect page
// in its grade-explainer card, the dashboard in the grade chip's tooltip.
// Printing it here too put the identical paragraph twice a few hundred pixels
// apart, which reads as a stutter rather than as emphasis.
export function benchmarkStanding(b, { compact = false } = {}) {
  if (!Number.isFinite(b.percentile)) {
    return `<p class="benchmark-plain-lead benchmark-unranked-lead">${t("Not ranked against a population")}</p>`;
  }
  const band = percentileBand(b.percentile);
  const chip = `<span class="percentile-band band-${band.key}">${t(band.label)}</span>`;
  const detail = tp("{pct} percentile · typical range {low}–{high}", {
    pct: percentileLabel(b.percentile),
    low: percentileLabel(b.range.low),
    high: percentileLabel(b.range.high)
  });
  if (compact) {
    // Two lines: the plain-language standing + band chip, then the exact
    // percentile detail on its own line so it never crowds the sentence (and
    // does not wrap mid-phrase in Thai, which runs longer).
    return `
      <p class="benchmark-plain-lead">${percentilePhrase(b.percentile, b.population)} ${chip}</p>
      <p class="benchmark-detail">${detail} <span class="benchmark-method">(${methodTag(b.method)})</span></p>`;
  }
  return `
    <p class="benchmark-plain-lead">${percentilePhrase(b.percentile, b.population)} ${chip}</p>
    <p class="benchmark-detail">${detail}${b.verified ? ` · <span class="benchmark-verified">${t("in-depth verified")}</span>` : ""}</p>
    <p class="gauge-note percentile-definition">${t("“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.")}</p>`;
}

// Localized method tag for a benchmark ("vs published norms", …). Was a
// METHOD_TAGS object duplicated in the dashboard and aspect views.
export function methodTag(method) {
  const tags = {
    distribution: t("vs published norms"),
    threshold: t("vs participation rates"),
    estimate: t("estimate")
  };
  return tags[method] || method;
}

// Aspect keys currently scored purely from defaults (tier === "estimated").
export function estimatedAspects(state) {
  return ASPECT_KEYS.filter(k => getAspectConfidence(state, k).tier === "estimated");
}

// Duty-of-care banner (finding #4). Renders the mental-health support notice
// from getMentalHealthNotice(): static app copy plus Thailand hotline numbers,
// escaped defensively to match the other innerHTML sinks. Returns "" when
// there is nothing to show.
export function mentalHealthNotice(notice) {
  if (!notice) return "";
  return `
    <div class="care-banner" role="note" aria-label="${escapeHtml(t("Mental health support"))}">
      <p class="care-banner-title">${escapeHtml(notice.title)}</p>
      <p class="care-banner-text">${escapeHtml(notice.body)}</p>
      <ul class="care-resources">
        ${notice.resources.map(r => `
          <li>
            <span class="care-resource-label">${escapeHtml(r.label)}</span>
            <a class="care-resource-tel" href="tel:${escapeHtml(String(r.tel).replace(/[^0-9+]/g, ""))}">${escapeHtml(r.tel)}</a>
          </li>`).join("")}
      </ul>
    </div>`;
}

// Accessible modal scaffold shared by every popup (level-up, reset flow).
// Implements the WCAG dialog pattern the individual popups were
// missing: role="dialog" + aria-modal, a Tab/Shift-Tab focus trap, Escape to
// close, and focus restored to the triggering element on close.
// `html` must be a single .popup-card element of trusted/escaped markup.
export function openDialog({ label, html, closeOnBackdrop = true }) {
  const previouslyFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.innerHTML = html;
  const card = overlay.firstElementChild || overlay;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  if (label) card.setAttribute("aria-label", label);

  const focusables = () => [...overlay.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.disabled);

  const onKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const close = () => {
    document.removeEventListener("keydown", onKeydown, true);
    overlay.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };

  document.addEventListener("keydown", onKeydown, true);
  if (closeOnBackdrop) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  document.body.appendChild(overlay);
  const els = focusables();
  if (els.length) els[0].focus();

  return { overlay, close };
}
