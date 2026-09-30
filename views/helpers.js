// views/helpers.js - presentation glue shared by two or more view modules:
// HTML escaping, aspect labels, confidence badges, benchmark standing lines,
// and the accessible dialog scaffold.

import { percentileBand } from "../benchmarks.js";
import { CRITERION_STATUS_LABELS } from "../criteria.js";
import { getAspectConfidence, ASPECT_KEYS } from "../aspects.js";
import { t, tp, percentileLabel, dateLocale } from "../i18n.js";
import { isReduced } from "../motion.js";

// Escape user-provided strings before inserting into innerHTML.
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

// --- Reduced motion -------------------------------------------------------
// This has to be asked in JS, not only in the sheet. index.css already carries
// a @media (prefers-reduced-motion: reduce) block, but a media query cannot
// reach either kind of motion this app drives from script:
//   - element.animate() (WAAPI) runs off a keyframe list the sheet never sees;
//   - scrollIntoView({behavior:"smooth"}) takes its behaviour from the option
//     object, which beats the sheet's scroll-behavior outright.
// So the sheet was covering 2 of 13 motion sites and silently missing the
// toast and all five smooth scrolls.
// Queried live rather than cached at module load: the OS setting can change
// while the page is open, and this is a long-lived PWA. The typeof guards are
// for `node --test`, which imports this module with no window at all — see the
// preamble in tests/views-xss.test.mjs about installing globals first.
// Since Phase 2 this is the device setting OR the in-app Reduce motion switch
// on Profile; motion.js owns both, so every motion site asks the same question.
export const prefersReducedMotion = () => isReduced();

// scrollIntoView with the animation dropped when the reader asked for less
// motion. Every call site wants the same outcome — put this element on screen,
// in practice the first invalid field — and differs only in whether it may
// animate getting there. Jumping is the right fallback, not staying put: the
// field still has to be visible for the error message to mean anything.
export function scrollIntoViewGently(el, options = {}) {
  if (!el || typeof el.scrollIntoView !== "function") return;
  el.scrollIntoView({ ...options, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

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

// Aspects whose survey inputs the monthly re-assessment (#/checkin) re-runs, so
// an estimated one there gets an actionable link rather than text-only guidance.
export const CHECKIN_ASPECTS = ["mental", "relationships", "personalGoals"];

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
  // A score-based grade (finance) has no percentile, and printing its
  // `standing` in that slot would state a population share nothing supports.
  const title = grade.basis === "score"
    ? tp("Grade {letter} — {band} for this aspect (score {score} of 100).", {
        letter: grade.grade, band: t(grade.label), score: grade.score
      })
    : tp("Grade {letter} — {band} of people like you (percentile {pct}).", {
        letter: grade.grade, band: t(grade.label), pct: grade.percentile
      });
  return `<span class="grade-badge grade-${grade.grade.toLowerCase()}" title="${escapeHtml(title)}">${escapeHtml(grade.grade)}</span>`;
}

// --- Footnotes (v141) ---------------------------------------------------------
// The owner, 2026-09-29: the page keeps to what a first-time reader needs, and
// the method and the sources sit in a Notes and sources section at its end,
// reached like a Wikipedia footnote. `mark` is what the reader sees ("1",
// "†"); `id` names the note. Each mark and note links to the other; where one
// note has several marks, only the first (`anchor`) is where "↑" returns to.
//
// The links jump by script, not by their href: the router reads the hash, so
// following "#fn-index" would send the reader to Overview's default route
// (the skip link in app.js does the same for the same reason).
// A page's notes, numbered in the order their marks are written, which is
// the order the page reads in. A note with no body gets no mark.
export function noteBook() {
  const notes = [];
  return {
    notes,
    ref(id, body) {
      if (!body) return "";
      const mark = String(notes.length + 1);
      notes.push({ id, mark, body });
      return footnoteRef(id, mark);
    }
  };
}

export function footnoteRef(id, mark, anchor = true) {
  return `<sup class="fn-ref"><a${anchor ? ` id="fnref-${id}"` : ""} href="#fn-${id}" data-jump="fn-${id}" aria-label="${escapeHtml(tp("Note {n}", { n: mark }))}">${escapeHtml(mark)}</a></sup>`;
}

// `notes` is [{ id, mark, body }], body being trusted markup. The note's own
// number is the way back up (the owner, v143: an "↑" after each note cost a
// line apiece).
export function footnoteList(notes) {
  return `<ol class="fn-list">${notes.map(n => `
    <li id="fn-${n.id}" tabindex="-1"><a class="fn-mark" href="#fnref-${n.id}" data-jump="fnref-${n.id}" aria-label="${escapeHtml(tp("Note {n}", { n: n.mark }))}, ${escapeHtml(t("Back to the text"))}">${escapeHtml(n.mark)}</a><div class="fn-body">${n.body}</div></li>`).join("")}</ol>`;
}

// On a phone the notes fold into one row, "Notes and sources (N)", opened
// on a tap (the owner, v155); the fold stands in for the section's label
// (css/phone.css). A mark jumping into it opens it (below).
const PHONE = "(max-width: 900px)";
function foldNotes(root) {
  if (typeof matchMedia !== "function" || !matchMedia(PHONE).matches) return;
  root.querySelectorAll(".fn-list").forEach(list => {
    if (list.closest("details")) return;
    const fold = document.createElement("details");
    fold.className = "notes-fold";
    const row = document.createElement("summary");
    row.textContent = tp("Notes and sources ({n})", { n: list.children.length });
    list.replaceWith(fold);
    fold.append(row, list);
    fold.closest("section")?.classList.add("has-notes-fold");
  });
}

export function bindFootnotes(root) {
  foldNotes(root);
  root.querySelectorAll("a[data-jump]").forEach(link => link.addEventListener("click", (e) => {
    const target = document.getElementById(link.dataset.jump);
    if (!target) return;
    e.preventDefault();
    // A mark inside a folded section (Side by Side's codes) opens its fold,
    // or there is nothing to scroll to.
    const fold = target.closest("details:not([open])");
    if (fold) fold.open = true;
    target.scrollIntoView({ block: "center", behavior: isReduced() ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  }));
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
    //
    // The phrase carries a .benchmark-phrase span so the phone stylesheet can
    // drop it and keep the chip. At 375px these two paragraphs wrap to two
    // lines each and cost 83 of the row's 133px; the sentence and the exact
    // percentile are detail-page altitude, and the aspect page one tap away
    // prints them alongside the range and the definition they need to be read
    // correctly. The chip survives because it is the whole claim in two words.
    // Wrapped rather than rebuilt as a separate mobile string: splitting the
    // interpolated detail would cost two new i18n keys plus a th.js entry each,
    // to show a number whose range would be hidden right beside it.
    return `
      <p class="benchmark-plain-lead"><span class="benchmark-phrase">${percentilePhrase(b.percentile, b.population)}</span> ${chip}</p>
      <p class="benchmark-detail">${detail} <span class="benchmark-method">(${methodTag(b.method)})</span></p>`;
  }
  return `
    <p class="benchmark-plain-lead">${percentilePhrase(b.percentile, b.population)} ${chip}</p>
    <p class="benchmark-detail">${detail}${b.verified ? ` · <span class="benchmark-verified">${t("in-depth verified")}</span>` : ""}</p>
    <p class="gauge-note percentile-definition">${t("“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.")}</p>`;
}

// --- GUIDELINE CHECKS (criterion-referenced) ---
//
// The card for one aspect's published-guideline checks. This is a DIFFERENT
// KIND of statement from everything above it: a percentile says where you rank
// among a sampled population, a criterion says whether you meet a published
// recommendation. The card says so in its own caption, because putting the two
// side by side without distinguishing them would invite reading "below
// guideline" as "below average" — and those are not the same claim.
//
// Returns "" for aspects with no criteria, so callers can drop it in
// unconditionally. Nothing here feeds a grade; see the additive contract at the
// top of criteria.js.
//
// Open since v142 (the owner, 2026-09-29): the checks show, and what they are
// and where they come from is a note at the page's end (criteriaNote), reached
// by `ref`, the footnote mark beside the heading.
export function criteriaCard(criteria, ref = "") {
  if (!criteria || criteria.length === 0) return "";
  const labels = CRITERION_STATUS_LABELS();
  const rows = criteria.map(c => `
    <li class="criterion-row criterion-${escapeHtml(c.status)}">
      <span class="criterion-chip criterion-chip-${escapeHtml(c.status)}">${escapeHtml(labels[c.status] || c.status)}</span>
      <span class="criterion-body">
        <span class="criterion-name">${escapeHtml(c.summary)}</span>
        <span class="criterion-detail">${escapeHtml(c.detail)}</span>
      </span>
    </li>`).join("");
  return `
    <div class="criteria-card">
      <p class="criteria-head"><span class="card-header">${t("Guideline checks")}</span>${ref}</p>
      <ul class="criteria-list">${rows}</ul>
    </div>`;
}

// The note behind the checks: that they are guidelines, not a rank, and the
// guidelines they cite. Unique sources, in first-appearance order: several
// criteria share the WHO 2020 activity guideline, and listing it three times
// would read as padding.
export function criteriaNote(criteria) {
  if (!criteria || criteria.length === 0) return "";
  const seen = new Set();
  const sources = criteria
    .map(c => c.source)
    .filter(src => src && !seen.has(src.url) && seen.add(src.url));
  return `<p>${t("These compare you with published health guidelines, not with a population. A guideline states what a body needs, so it applies regardless of country — which is why these checks exist for aspects where no representative Thai norm does. They do not affect your score, grade or Balance Index.")}</p>
    ${sourceList(sources)}`;
}

// Links to sources, for a note.
export function sourceList(sources) {
  if (!sources || !sources.length) return "";
  return `<ul class="fn-sources">${sources.map(src => `<li><a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}</ul>`;
}

// Localized method tag for a benchmark ("vs published norms", …). Was a
// METHOD_TAGS object duplicated in the dashboard and aspect views.
export function methodTag(method) {
  const tags = {
    // `norms` is not a synonym for `distribution`: it reads a percentile
    // straight out of a published table, with no distributional assumption.
    // Keep the two tags distinct so the user can tell which one they got.
    norms: t("vs a published percentile table"),
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
//
// A slim strip since v121 (the owner, 2026-09-27: "make this smaller, like
// temporary banner that can be close"). `closable` adds the close button;
// Home passes it, the Mental page does not, so the numbers always have a
// place that cannot be closed.
export function mentalHealthNotice(notice, { closable = false } = {}) {
  if (!notice) return "";
  const close = closable
    ? `<button type="button" class="care-banner-close" id="care-banner-close" aria-label="${escapeHtml(t("Close"))}">&times;</button>`
    : "";
  return `
    <div class="care-banner" role="note" aria-label="${escapeHtml(t("Mental health support"))}">
      ${close}
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

// Closing the care strip lasts for this visit only (the tab's session): if
// the answers still cross the cutoff, it is back on the next visit. Storage
// can throw or be missing (private windows, tests); then it simply shows.
const CARE_CLOSED_KEY = "lifequest_care_closed";
export function isCareNoticeClosed() {
  try { return sessionStorage.getItem(CARE_CLOSED_KEY) === "1"; } catch { return false; }
}
export function closeCareNotice() {
  try { sessionStorage.setItem(CARE_CLOSED_KEY, "1"); } catch { /* shows again next render */ }
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
