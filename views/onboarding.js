// views/onboarding.js - the six-step baseline assessment (onboarding) view.
//
// Blank-first policy (v2.3.0): every field starts empty, every mandatory field
// carries a red "*", and the user cannot advance a step or finish until each
// visible required control is answered. This deliberately removes the old
// "Optional" steps and the "See my results now" express shortcut — a first
// baseline must be filled in full, so no aspect is scored from a silent default.

import { stateManager } from "../state.js";
import { buildProvidedFlags, buildAnsweredFlags } from "../validation.js";
import {
  numberField, instrumentBlock, collectInstrument, validateScope
} from "./instrument-forms.js";
import { scrollIntoViewGently } from "./helpers.js";
import { savingsRateFrom } from "../scoring.js";
import { t, tp } from "../i18n.js";

// Maps each validated numeric field (validation.js FIELD_CONSTRAINTS keys) to
// its onboarding input id — used for reading and coverage tracking. The inputs
// also carry data-field so validateScope range-checks them per step.
const ONB_NUMERIC_IDS = {
  income: "onb-income", monthlySavings: "onb-savings",
  liquidSavings: "onb-liquid", committedOutflow: "onb-outflow", digitalLiteracy: "onb-digital",
  weeklyLearningHours: "onb-learning", weeklyVigorousDays: "onb-vig-days",
  weeklyVigorousMins: "onb-vig-mins", weeklyModerateDays: "onb-mod-days",
  weeklyModerateMins: "onb-mod-mins", weeklyWalkingDays: "onb-walk-days",
  weeklyWalkingMins: "onb-walk-mins", weight: "onb-weight", height: "onb-height",
  sleepHours: "onb-sleep", vegetablePortions: "onb-veg", waterLiters: "onb-water",
  singleUsePlastics: "onb-plastics", monthlyDonations: "onb-donations",
  volunteeringHours: "onb-volunteer"
};

// A red required marker, matching instrument-forms.js.
const REQ = `<span class="req" aria-hidden="true">*</span>`;

// A mandatory dropdown: starts on a disabled blank "— Select —", so the user
// must make a conscious choice (gender keeps "Prefer not to say" as a real
// option). Carries data-required + an inline error span for validateScope, and
// aria-required so the "*" — which is aria-hidden — is not the only signal.
function selectField(id, label, options) {
  return `
    <div class="form-group">
      <label for="${id}">${label} ${REQ}</label>
      <select id="${id}" class="form-control" data-required="1" aria-required="true">
        <option value="" disabled selected>${t("— Select —")}</option>
        ${options.map(o => `<option value="${o.v}">${t(o.l)}</option>`).join("")}
      </select>
      <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
    </div>`;
}

// 1. RENDER ONBOARDING SURVEY
export function renderOnboarding(containerId, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pages = [
    {
      title: t("Step 1: Profile & Finance"),
      why: t("We start with income and demographics so your scores can be compared against real population benchmarks."),
      body: `
        <div class="form-group">
          <label for="onb-name">${t("Name")}</label>
          <input type="text" id="onb-name" class="form-control" value="" maxlength="40">
        </div>
        <div class="grid-2">
          ${numberField("onb-age", t("Age"), "", 'min="15" max="100"', { required: true, placeholder: "15–100" })}
          ${selectField("onb-gender", t("Gender (for benchmark norms)"), [
            { v: "unspecified", l: "Prefer not to say" },
            { v: "male", l: "Male" },
            { v: "female", l: "Female" }
          ])}
        </div>
        ${selectField("onb-region", t("Primary Region (Cost of Living Mapping)"), [
          { v: "Provinces", l: "Provinces / Upcountry Thailand" },
          { v: "Bangkok", l: "Bangkok & Vicinity" }
        ])}
        ${selectField("onb-employment", t("Employment Status"), [
          { v: "Office Worker", l: "Office Worker / Salary Employee" },
          { v: "Freelancer", l: "Freelancer / Independent" },
          { v: "Business Owner", l: "Business Owner / Entrepreneur" },
          { v: "Unemployed", l: "Unemployed / Looking for Work" },
          { v: "Student", l: "Student" }
        ])}
        ${selectField("onb-relationship", t("Relationship Status"), [
          { v: "Single", l: "Single" },
          { v: "Coupled", l: "In a Relationship / Married" }
        ])}
        ${numberField("onb-income", t("Monthly Individual Income (Net THB)"), "", 'min="0"', { required: true, field: "income" })}
        ${numberField("onb-savings", t("Monthly Savings (THB)"), "", 'min="0"', { required: true, field: "monthlySavings", placeholder: t("e.g. 3,000") })}
        <div class="grid-2">
          ${numberField("onb-liquid", t("Liquid Savings You Could Reach This Week (THB)"), "", 'min="0"', { required: true, field: "liquidSavings", placeholder: t("e.g. 50,000") })}
          ${numberField("onb-outflow", t("Committed Monthly Outflow (THB)"), "", 'min="0"', { required: true, field: "committedOutflow", placeholder: t("e.g. 12,000") })}
        </div>
        <p class="onb-why">${t("The second box is what you cannot skip in a month — rent, loan repayments, family support, bills. Together these two give your runway: how long you could cover the unskippable if income stopped. It is shown on your Finance page and is deliberately not scored, because no published distribution says what a given number of months is worth.")}</p>
        ${instrumentBlock("cfpb")}`
    },
    {
      title: t("Step 2: Physical Baseline"),
      why: t("A few body and activity numbers place your physical health against national norms."),
      body: `
        <div class="grid-2">
          ${numberField("onb-height", t("Height (cm)"), "", 'min="100" max="250"', { required: true, field: "height", placeholder: "100–250" })}
          ${numberField("onb-weight", t("Weight (kg)"), "", 'min="25" max="300"', { required: true, field: "weight", placeholder: "25–300" })}
        </div>
        <div class="grid-2">
          ${numberField("onb-sleep", t("Average Nightly Sleep (Hours)"), "", 'min="0" max="16" step="0.5"', { required: true, field: "sleepHours", placeholder: "0–16" })}
          ${numberField("onb-veg", t("Vegetable/Fruit Portions per Day"), "", 'min="0" max="15"', { required: true, field: "vegetablePortions", placeholder: "0–15" })}
        </div>
        ${numberField("onb-water", t("Water Intake per Day (Liters)"), "", 'min="0" max="10" step="0.1"', { required: true, field: "waterLiters", placeholder: "0–10" })}
        <p class="instrument-title">${t("Weekly Physical Activity (IPAQ)")}</p>
        <div class="grid-2">
          ${numberField("onb-vig-days", t("Vigorous Exercise (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyVigorousDays", placeholder: "0–7" })}
          ${numberField("onb-vig-mins", t("Vigorous Minutes per Day"), "", 'min="0" max="600"', { required: true, field: "weeklyVigorousMins", placeholder: "0–600" })}
        </div>
        <div class="grid-2">
          ${numberField("onb-mod-days", t("Moderate Exercise (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyModerateDays", placeholder: "0–7" })}
          ${numberField("onb-mod-mins", t("Moderate Minutes per Day"), "", 'min="0" max="600"', { required: true, field: "weeklyModerateMins", placeholder: "0–600" })}
        </div>
        <div class="grid-2">
          ${numberField("onb-walk-days", t("Walking (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyWalkingDays", placeholder: "0–7" })}
          ${numberField("onb-walk-mins", t("Walking Minutes per Day"), "", 'min="0" max="600"', { required: true, field: "weeklyWalkingMins", placeholder: "0–600" })}
        </div>
        ${instrumentBlock("jss")}`
    },
    {
      title: t("Step 3: Mental Well-Being"),
      why: t("Two validated screens (ST-5, WHO-5) estimate stress and well-being. This is a self-check, not a diagnosis."),
      body: `
        ${instrumentBlock("st5")}
        ${instrumentBlock("who5")}`
    },
    {
      title: t("Step 4: Relationships"),
      why: t("Score your social connection and loneliness."),
      body: `
        ${instrumentBlock("lsns")}
        ${instrumentBlock("ucla")}
        <div id="ras-block" class="d-none">
          ${instrumentBlock("ras")}
        </div>`
    },
    {
      title: t("Step 5: Goals & Learning"),
      why: t("Self-efficacy and perseverance, plus your weekly learning habits."),
      body: `
        ${instrumentBlock("gse")}
        ${instrumentBlock("grit")}
        <div class="grid-2">
          ${numberField("onb-learning", t("Weekly Learning / Study Hours"), "", 'min="0" max="80" step="0.5"', { required: true, field: "weeklyLearningHours", placeholder: "0–80" })}
          ${numberField("onb-digital", t("Digital Literacy Self-Rating (0-100)"), "", 'min="0" max="100"', { required: true, field: "digitalLiteracy", placeholder: "0–100" })}
        </div>`
    },
    {
      title: t("Step 6: Contribution, Environment & Future"),
      why: t("Prosocial habits, everyday environmental behavior, and your long-term outlook."),
      body: `
        ${instrumentBlock("ptm")}
        <div class="grid-2">
          ${numberField("onb-donations", t("Monthly Donations (THB)"), "", 'min="0"', { required: true, field: "monthlyDonations" })}
          ${numberField("onb-volunteer", t("Volunteering Hours per Month"), "", 'min="0" max="168"', { required: true, field: "volunteeringHours", placeholder: "0–168" })}
        </div>
        ${instrumentBlock("geb")}
        ${numberField("onb-plastics", t("Single-Use Plastic Items per Day"), "", 'min="0" max="100"', { required: true, field: "singleUsePlastics", placeholder: "0–100" })}
        ${instrumentBlock("lfis")}`
    }
  ];

  const totalSteps = pages.length;

  container.innerHTML = `
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 18px;">
        <h1>${t("PERSONAL WELLBEING ASSESSMENT")}</h1>
        <p>${t("Baseline Assessment")}</p>
      </div>
      <div class="onb-progress">
        <div class="onb-progress-head">
          <span id="onb-step-label"></span>
          <span id="onb-step-time"></span>
        </div>
        <div class="onb-progress-track"><div class="onb-progress-fill" id="onb-progress-fill"></div></div>
      </div>
      <form id="onboarding-form">
        ${pages.map((page, i) => `
          <div class="survey-page ${i === 0 ? "" : "d-none"}" id="onb-page-${i}">
            <h3 class="card-header">${page.title}</h3>
            <p class="onb-why">${page.why}</p>
            ${page.body}
            <div class="onb-nav">
              ${i > 0 ? `<button type="button" class="btn btn-onb-prev" data-page="${i}">${t("Back")}</button>` : `<span></span>`}
              <div class="onb-nav-right">
                ${i < totalSteps - 1
                  ? `<button type="button" class="btn btn-primary btn-onb-next" data-page="${i}">${t("Next")}</button>`
                  : `<button type="submit" class="btn btn-primary">${t("Complete Assessment")}</button>`}
              </div>
            </div>
          </div>`).join("")}
      </form>
      <p id="onboarding-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  const errorEl = () => document.getElementById("onboarding-error");
  const showError = (msg) => { const el = errorEl(); el.textContent = msg; el.classList.remove("d-none"); };
  const hideError = () => errorEl().classList.add("d-none");

  const updateProgress = (idx) => {
    const fill = document.getElementById("onb-progress-fill");
    const label = document.getElementById("onb-step-label");
    const time = document.getElementById("onb-step-time");
    if (fill) fill.style.width = `${Math.round(((idx + 1) / totalSteps) * 100)}%`;
    if (label) label.textContent = tp("Step {n} of {total}", { n: idx + 1, total: totalSteps });
    if (time) time.textContent = t("About 5 minutes total");
  };

  const showPage = (idx) => {
    pages.forEach((_, i) => {
      document.getElementById(`onb-page-${i}`).classList.toggle("d-none", i !== idx);
    });
    updateProgress(idx);
    scrollIntoViewGently(container, { block: "start" });
  };

  // Next advances only when the current step is complete and in range.
  container.querySelectorAll(".btn-onb-next").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.page);
      const invalid = validateScope(document.getElementById(`onb-page-${idx}`));
      if (invalid) {
        showError(t("Please answer every question on this step."));
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
      hideError();
      showPage(idx + 1);
    });
  });
  container.querySelectorAll(".btn-onb-prev").forEach(btn => {
    btn.addEventListener("click", () => { hideError(); showPage(parseInt(btn.dataset.page) - 1); });
  });

  // Couple-only questions appear only once "Coupled" is chosen (blank/Single
  // keep the RAS block hidden, so validateScope skips it).
  const relationshipSelect = document.getElementById("onb-relationship");
  relationshipSelect.addEventListener("change", () => {
    document.getElementById("ras-block").classList.toggle("d-none", relationshipSelect.value !== "Coupled");
  });

  updateProgress(0);

  // Coverage capture: the user must now answer everything, so these sets end up
  // fully populated — but they still record interaction honestly (e.g. the RAS
  // instrument stays unanswered, hence answered=false, for single users).
  const touchedFields = new Set();
  const touchedInstruments = new Set();
  const idToField = Object.fromEntries(
    Object.entries(ONB_NUMERIC_IDS).map(([field, id]) => [id, field])
  );
  const clearControlError = (el) => {
    const group = el.closest(".form-group") || el.closest("fieldset.survey-question");
    const errEl = group && group.querySelector(".field-error");
    if (errEl) { errEl.textContent = ""; errEl.classList.add("d-none"); }
    el.classList.remove("input-invalid");
    if (group && group.tagName === "FIELDSET") group.classList.remove("survey-question-invalid");
  };
  const form = document.getElementById("onboarding-form");
  form.addEventListener("input", (e) => {
    const field = idToField[e.target.id];
    if (field) touchedFields.add(field);
    clearControlError(e.target);
  });
  form.addEventListener("change", (e) => {
    const match = (e.target.name || "").match(/^([a-z0-9]+)-q\d+$/i);
    if (match) touchedInstruments.add(match[1]);
    clearControlError(e.target);
  });

  // Build the survey payload from the DOM and submit. By the time this runs
  // every step has passed validateScope, so no field is blank or out of range.
  const doSubmit = () => {
    hideError();
    // Final full-form sweep: validate every step, jump to the first offender.
    for (let i = 0; i < totalSteps; i++) {
      const invalid = validateScope(document.getElementById(`onb-page-${i}`));
      if (invalid) {
        showPage(i);
        showError(t("Please answer every question before submitting."));
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
    }
    try {
      const val = (id) => document.getElementById(id).value;

      const surveyData = {
        name: val("onb-name"),
        age: val("onb-age"),
        // No birthday here on purpose. It is not asked during first-run: month
        // and day only matter once someone has used the app long enough for a
        // level-year to turn, and submitOnboarding leaves both null when the
        // keys are absent (sanitizeBirthday rejects non-integers). The Year
        // screen asks for it when it is still missing (yearreview.js:163) and
        // the Profile page carries it permanently (profile.js:193).
        gender: val("onb-gender"),
        region: val("onb-region"),
        employment: val("onb-employment"),
        relationshipStatus: val("onb-relationship"),
        income: val("onb-income"),
        // Asked in baht, stored as a rate — the user does no arithmetic and
        // the stored shape (and therefore the schema) does not move. The
        // amount itself is deliberately NOT stored: one savings number in the
        // state means an income edit cannot leave two of them disagreeing.
        savingsRate: savingsRateFrom(val("onb-savings"), val("onb-income")),
        // Kept in baht, unlike savings above: there is no rate to derive, and a
        // stock over an outflow is a ratio the app prints rather than stores.
        liquidSavings: val("onb-liquid"),
        committedOutflow: val("onb-outflow"),
        height: val("onb-height"),
        weight: val("onb-weight"),
        sleepHours: val("onb-sleep"),
        vegetablePortions: val("onb-veg"),
        waterLiters: val("onb-water"),
        weeklyVigorousDays: val("onb-vig-days"),
        weeklyVigorousMins: val("onb-vig-mins"),
        weeklyModerateDays: val("onb-mod-days"),
        weeklyModerateMins: val("onb-mod-mins"),
        weeklyWalkingDays: val("onb-walk-days"),
        weeklyWalkingMins: val("onb-walk-mins"),
        weeklyLearningHours: val("onb-learning"),
        digitalLiteracy: val("onb-digital"),
        monthlyDonations: val("onb-donations"),
        volunteeringHours: val("onb-volunteer"),
        singleUsePlastics: val("onb-plastics"),
        cfpb: collectInstrument("cfpb"),
        jss: collectInstrument("jss"),
        st5: collectInstrument("st5"),
        who5: collectInstrument("who5"),
        lsns: collectInstrument("lsns"),
        ucla: collectInstrument("ucla"),
        ras: collectInstrument("ras"),
        gse: collectInstrument("gse"),
        grit: collectInstrument("grit"),
        ptm: collectInstrument("ptm"),
        geb: collectInstrument("geb"),
        lfis: collectInstrument("lfis")
      };

      const coverage = {
        provided: buildProvidedFlags(touchedFields),
        answered: buildAnsweredFlags(touchedInstruments)
      };
      // express is always false now: a baseline is always completed in full.
      stateManager.submitOnboarding(surveyData, false, coverage);
      onComplete();
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      showError(t("Assessment Error: ") + err.message);
    }
  };

  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doSubmit();
  });
}
