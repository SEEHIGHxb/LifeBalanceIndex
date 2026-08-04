// views/review.js - the Weekly Review tab (#/review): ONE measured
// self-report per ISO week replaces the old daily activity logging. The form
// asks for rough weekly quantities ("about 2 L of water a day"), prefilled
// with the current profile values so an unchanged week takes seconds; the
// submission re-measures the behavior-driven aspects through the shared
// scoring formulas and grades every pledge at once.
//
// A connected sibling app (see connections.js) can PRE-FILL some of those boxes:
// Midori fills monthly savings, Runaway fills the two vigorous-exercise boxes.
// Pre-fill, never apply — every imported number lands in a visible box the user
// can change, and it reaches a score only by being submitted through the same
// validateProfile + submitWeeklyReview path as a hand-typed one. That is what
// keeps the `provided` confidence flags honest: the answer sent is still the
// user's answer, and a mis-categorised transaction cannot move a score without
// a moment where it was on screen.

import { stateManager } from "../state.js";
import { validateProfile, FIELD_CONSTRAINTS } from "../validation.js";
import { t, tp, dateLocale } from "../i18n.js";
import { numberField } from "./instrument-forms.js";
import { aspectLabel } from "./helpers.js";
import { savingsAmountFrom, savingsRateFrom } from "../scoring.js";
import {
  CONNECTION_SOURCES, SOURCE_NAMES, readConnection, readConnectionPrefs,
  connectionStatus, connectionPrefills, incomeDrifted
} from "../connections.js";
import { isoWeekKey } from "../season.js";

// Form ids are "rev-<profileField>" so errors from validateProfile (keyed by
// field name) map straight onto the numberField error spans.
const FIELD_IDS = {
  weeklyVigorousDays: "rev-weeklyVigorousDays",
  weeklyVigorousMins: "rev-weeklyVigorousMins",
  weeklyModerateDays: "rev-weeklyModerateDays",
  weeklyModerateMins: "rev-weeklyModerateMins",
  weeklyWalkingDays: "rev-weeklyWalkingDays",
  weeklyWalkingMins: "rev-weeklyWalkingMins",
  sleepHours: "rev-sleepHours",
  waterLiters: "rev-waterLiters",
  vegetablePortions: "rev-vegetablePortions",
  weeklyLearningHours: "rev-weeklyLearningHours",
  singleUsePlastics: "rev-singleUsePlastics",
  monthlySavings: "rev-monthlySavings",
  monthlyDonations: "rev-monthlyDonations",
  volunteeringHours: "rev-volunteeringHours"
};

// The onboarding label strings are reused verbatim so the review form needs no
// new translations and the two forms can never phrase the same field two ways.
const FIELD_LABELS = {
  weeklyVigorousDays: "Vigorous Exercise (Days/Week)",
  weeklyVigorousMins: "Vigorous Minutes per Day",
  weeklyModerateDays: "Moderate Exercise (Days/Week)",
  weeklyModerateMins: "Moderate Minutes per Day",
  weeklyWalkingDays: "Walking (Days/Week)",
  weeklyWalkingMins: "Walking Minutes per Day",
  sleepHours: "Average Nightly Sleep (Hours)",
  waterLiters: "Water Intake per Day (Liters)",
  vegetablePortions: "Vegetable/Fruit Portions per Day",
  weeklyLearningHours: "Weekly Learning / Study Hours",
  singleUsePlastics: "Single-Use Plastic Items per Day",
  monthlySavings: "Monthly Savings (THB)",
  monthlyDonations: "Monthly Donations (THB)",
  volunteeringHours: "Volunteering Hours per Month"
};

const FIELD_STEPS = { sleepHours: 0.5, waterLiters: 0.1, weeklyLearningHours: 0.5, volunteeringHours: 0.5 };

// --- CONNECTED APPS ---

function connectionDate(date) {
  return date.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

// The window a pre-filled number covers, said in the terms of the app it came
// from: a run log describes one week, a ledger describes a typical month. Both
// dates are Date objects formatted here — connections.js never hands out a
// string from a payload.
function prefillNote(pre) {
  const app = SOURCE_NAMES[pre.source];
  const from = connectionDate(pre.window.from);
  const to = connectionDate(pre.window.to);
  return pre.source === "runaway"
    ? tp("From {app} — your runs for {from} – {to}. Add anything it couldn't see.", { app, from, to })
    : tp("From {app} — a typical month, measured over {from} – {to}.", { app, from, to });
}

// Read every source once. The form needs both the values (to pre-fill) and the
// status of a source that is switched ON but has nothing usable, so that it can
// say why nothing was filled in rather than leaving the user guessing.
function readConnections(now) {
  const prefs = readConnectionPrefs();
  const isoWeek = isoWeekKey(now);
  const reads = {};
  const idle = [];
  for (const source of CONNECTION_SOURCES) {
    reads[source] = readConnection(source, { now, isoWeek });
    const status = connectionStatus(prefs[source], reads[source]);
    if (prefs[source] && status !== "connected") idle.push(SOURCE_NAMES[source]);
  }
  return { prefs, reads, idle, prefills: connectionPrefills(reads, prefs) };
}

function connectionBanner(conn, profile) {
  const lines = [];
  if (Object.keys(conn.prefills).length) {
    lines.push(t("Some boxes are filled in from your connected apps. Check them, change whatever is wrong, then submit — the answer you send is still yours."));
  }
  for (const app of conn.idle) {
    lines.push(tp("{app} has nothing current to share, so its boxes keep your last answer.", { app }));
  }

  // The savings box holds baht but the state holds a RATE, derived on submit
  // against the income in the profile — and income is not a weekly-review field,
  // so this form cannot fix it. If the ledger and the profile disagree about
  // income, a correct baht figure still yields a wrong rate, so say so and point
  // at the page that can fix it.
  const midori = conn.reads.midori;
  if (conn.prefills.monthlySavings && midori.fields && incomeDrifted(midori.fields.income, profile.income)) {
    const money = n => Math.round(n).toLocaleString(dateLocale());
    lines.push(
      `${tp("{app} measures your income at about {bridge} THB a month; your profile says {profile} THB, so the savings rate derived here will be off.", {
        app: SOURCE_NAMES.midori, bridge: money(midori.fields.income), profile: money(profile.income)
      })} <a href="#/profile">${t("Update it on the Profile page")}</a>`
    );
  }

  if (!lines.length) return "";
  return `<div class="conn-banner">${lines.map(line => `<p>${line}</p>`).join("")}</div>`;
}

function reviewField(field, profile, prefills = {}) {
  const c = FIELD_CONSTRAINTS[field];
  const step = FIELD_STEPS[field] ? ` step="${FIELD_STEPS[field]}"` : "";
  const pre = Object.hasOwn(prefills, field) ? prefills[field] : null;
  // Savings is the one field asked in different units from the one stored: the
  // box holds baht, the state holds a rate. Deriving the pre-fill (rather than
  // reading a stored amount) is what guarantees the box always agrees with the
  // score, including for saves written before v46.
  const own = field === "monthlySavings"
    ? savingsAmountFrom(profile.savingsRate, profile.income)
    : profile[field] ?? 0;
  // The chip names the app in the label, so the source is visible before the
  // number is read. SOURCE_NAMES are our own literals, never payload text.
  const chip = pre ? ` <span class="prefill-chip">${SOURCE_NAMES[pre.source]}</span>` : "";
  return numberField(
    FIELD_IDS[field],
    `${t(FIELD_LABELS[field])}${chip}`,
    pre ? pre.value : own,
    `min="${c.min}" max="${c.max}"${step}`,
    pre ? { note: prefillNote(pre) } : {}
  );
}

// Next ISO week starts on the coming Monday.
function nextReviewDate() {
  const d = new Date();
  const sinceMonday = (d.getDay() + 6) % 7;
  const next = new Date(d);
  next.setDate(d.getDate() + (7 - sinceMonday));
  return next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

function shiftSummary(shifts) {
  const parts = Object.entries(shifts || {})
    .map(([key, v]) => `${aspectLabel(key)} ${v > 0 ? "+" : ""}${v}`);
  return parts.length ? parts.join(" · ") : t("scores steady");
}

function reviewHistory(reviews) {
  if (!reviews.length) return "";
  const rows = reviews.slice(-8).reverse().map(r => {
    const met = r.goals.filter(g => g.met).length;
    return `
      <div class="terminal-line">
        <span class="terminal-gold">[${new Date(r.date).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })}]</span>
        ${shiftSummary(r.shifts)} · ${tp("{met}/{total} pledges met", { met, total: r.goals.length })} · ${tp("+{xp} points", { xp: r.xp })}
      </div>`;
  }).join("");
  return `
    <div class="card">
      <h4 class="card-header">${t("Past Reviews")}</h4>
      <div class="terminal">${rows}</div>
    </div>`;
}

export function renderReview(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const due = stateManager.isWeeklyReviewDue();

  if (!due) {
    const checkinDue = stateManager.isCheckinDue();
    container.innerHTML = `
      <div class="card">
        <h3 class="card-header">${t("Weekly Review")}</h3>
        <p style="font-size: 0.95rem; margin-bottom: 6px;">✅ <strong>${t("Reviewed this week.")}</strong></p>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
          ${tp("Nothing to do here until {date} — live your week; the app can wait.", { date: nextReviewDate() })}
        </p>
        ${checkinDue ? `
          <p style="font-size: 0.85rem; margin-top: 10px;">
            ${t("One thing while you're here: the monthly re-assessment is due.")}
            <a href="#/checkin">${t("Start Re-assessment")}</a>
          </p>` : ""}
      </div>
      ${reviewHistory(state.reviews)}
    `;
    return;
  }

  // One read of the sibling apps for the whole render: values for the boxes a
  // connection fills, plus the status needed to explain an empty-handed one.
  const conn = readConnections(new Date());
  const box = field => reviewField(field, state.profile, conn.prefills);

  container.innerHTML = `
    <div class="card">
      <h3 class="card-header">${t("Weekly Review")}</h3>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
        ${t("Report a rough weekly average for each habit — no daily logging needed. Every value is prefilled with last week's answer, so only touch what changed. Takes about two minutes.")}
      </p>
      ${connectionBanner(conn, state.profile)}
      <form id="weekly-review-form">
        <h4 class="card-header" style="margin-top: 4px;">${t("Activity this week")}</h4>
        <div class="grid-2">
          ${box("weeklyVigorousDays")}
          ${box("weeklyVigorousMins")}
        </div>
        <div class="grid-2">
          ${box("weeklyModerateDays")}
          ${box("weeklyModerateMins")}
        </div>
        <div class="grid-2">
          ${box("weeklyWalkingDays")}
          ${box("weeklyWalkingMins")}
        </div>

        <h4 class="card-header">${t("Daily habits (weekly average)")}</h4>
        <div class="grid-2">
          ${box("sleepHours")}
          ${box("waterLiters")}
        </div>
        <div class="grid-2">
          ${box("vegetablePortions")}
          ${box("singleUsePlastics")}
        </div>
        <div class="grid-2">
          ${box("weeklyLearningHours")}
          ${box("monthlySavings")}
        </div>

        <details style="margin: 10px 0;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 0.9rem;">${t("Monthly habits (update when they change)")}</summary>
          <div class="grid-2" style="margin-top: 10px;">
            ${box("monthlyDonations")}
            ${box("volunteeringHours")}
          </div>
        </details>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">${t("Complete Weekly Review")}</button>
      </form>
      <p id="review-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
    ${reviewHistory(state.reviews)}
  `;

  document.getElementById("weekly-review-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("review-error");
    errorEl.classList.add("d-none");

    const inputs = {};
    for (const [field, id] of Object.entries(FIELD_IDS)) {
      inputs[field] = document.getElementById(id)?.value;
    }
    // Convert the baht box back to the stored rate BEFORE validation, so
    // validateProfile and submitWeeklyReview see the same savingsRate they
    // always have. Income is not a weekly-review field, so it comes from the
    // saved profile.
    inputs.savingsRate = savingsRateFrom(inputs.monthlySavings, stateManager.state.profile.income);

    // Same inline-error pattern as onboarding: per-field messages + a banner.
    const { ok, errors } = validateProfile(inputs);
    for (const id of Object.values(FIELD_IDS)) {
      const span = document.getElementById(`${id}-err`);
      if (span) { span.textContent = ""; span.classList.add("d-none"); }
    }
    if (!ok) {
      for (const [field, message] of Object.entries(errors)) {
        const span = document.getElementById(`${FIELD_IDS[field]}-err`);
        if (span) { span.textContent = message; span.classList.remove("d-none"); }
      }
      errorEl.textContent = t("Please fix the highlighted fields before continuing.");
      errorEl.classList.remove("d-none");
      return;
    }

    onComplete(stateManager.submitWeeklyReview(inputs));
  });
}
