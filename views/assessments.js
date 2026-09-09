// views/assessments.js - the monthly mini re-assessment (#/checkin) and the
// optional in-depth assessment (#/deep). Moved verbatim from the old
// monolithic ui.js; behavior unchanged.

import { stateManager } from "../state.js";
import { DEEP_SECTIONS, deepSectionInstruments, deepAskIndices } from "../surveys.js";
import { isAspectDeepVerified } from "../aspects.js";
import { t } from "../i18n.js";
import {
  instrumentBlock, collectInstrument,
  deepInstrumentBlock, collectDeepInstrument,
  numberField, validateScope
} from "./instrument-forms.js";
import { scrollIntoViewGently } from "./helpers.js";
import { applyDraft, saveDraft, clearDraft } from "../draft.js";

// 2c. RENDER THE MONTHLY MINI RE-ASSESSMENT (#/checkin)
export function renderCheckin(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isCoupled = state.profile.relationshipStatus !== "Single";

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 25px;">
        <h1>${t("MONTHLY RE-ASSESSMENT")}</h1>
        <p>${t("Short instruments only • recalibrates Mental, Relationships & Personal Goals")}</p>
      </div>
      <p style="font-size: var(--text-base); color: var(--color-text-secondary); margin-bottom: 20px;">
        ${t("Answer for the recent weeks, not how you felt at onboarding. Scores shift by at most ±15 points per re-assessment, and consistent weekly reviews since the last one add a small bonus. Reward: +40 points.")}
      </p>
      <div id="checkin-resume" class="onb-resume d-none">
        <span>${t("Picked up where you left off. Your answers were saved on this device.")}</span>
      </div>
      <form id="checkin-form">
        ${instrumentBlock("who5")}
        ${instrumentBlock("st5")}
        ${instrumentBlock("ucla")}
        ${isCoupled ? instrumentBlock("ras") : ""}
        ${instrumentBlock("gse")}
        ${instrumentBlock("citacc")}
        ${instrumentBlock("citlearn")}
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px;">${t("Complete Re-assessment")}</button>
      </form>
      <p id="checkin-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  // Draft persistence, same contract as onboarding. Shorter form, same failure:
  // seven instruments answered on a phone, one interruption, all of it gone.
  //
  // No coverage bookkeeping to seed here -- unlike onboarding, the check-in
  // reads every instrument straight off the DOM at submit time and tracks no
  // "touched" sets, so restoring the controls is the whole job.
  const checkinForm = document.getElementById("checkin-form");
  if (applyDraft("checkin", checkinForm)) {
    document.getElementById("checkin-resume").classList.remove("d-none");
  }
  const saveCheckin = () => saveDraft("checkin", checkinForm, {});
  checkinForm.addEventListener("input", saveCheckin);
  checkinForm.addEventListener("change", saveCheckin);

  document.getElementById("checkin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("checkin-error");
    errorEl.classList.add("d-none");
    const invalid = validateScope(document.getElementById("checkin-form"));
    if (invalid) {
      errorEl.textContent = t("Please answer every question before submitting.");
      errorEl.classList.remove("d-none");
      scrollIntoViewGently(invalid, { block: "center" });
      return;
    }
    try {
      const shifts = stateManager.submitCheckin({
        who5: collectInstrument("who5"),
        st5: collectInstrument("st5"),
        ucla: collectInstrument("ucla"),
        ras: isCoupled ? collectInstrument("ras") : null,
        gse: collectInstrument("gse"),
        citacc: collectInstrument("citacc"),
        citlearn: collectInstrument("citlearn")
      });
      clearDraft("checkin");
      onComplete(shifts);
    } catch (err) {
      console.error("Check-in submission failed:", err);
      errorEl.textContent = t("Re-assessment Error: ") + err.message;
      errorEl.classList.remove("d-none");
    }
  });
}

// 2d. RENDER THE OPTIONAL IN-DEPTH ASSESSMENT (#/deep)
//
// One card per aspect section, each saved independently so a user can progress
// through the long-form instruments a section at a time. Completing a section
// upgrades that aspect to the "verified" confidence tier and tightens its band.
// `onRunwaySaved` is the Profile page's own save handler, passed in by app.js.
// The runway figures below are profile facts, not assessment results, so they
// report through the same toast and the same re-render rather than growing a
// second notion of what "saved" means.
export function renderDeepAssessment(containerId, state, onComplete, onRunwaySaved) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const isCoupled = state.profile.relationshipStatus !== "Single";

  // THE RUNWAY FIGURES (v80). Three optional numbers that were asked at
  // onboarding until v79 and moved here because they do not belong in a
  // mandatory gate: none is scored, none is compared against a benchmark, and
  // a tester read them as a niche question about a household's cash position,
  // arriving before the app had shown what it does with anything.
  //
  // They are a SEPARATE form, not extra items on the questionnaire, which is
  // the objection v79's changelog raised when it rejected this move: the deep
  // page is a structure for scored instruments. So these never enter
  // submitDeepAssessment, earn no XP, verify no aspect, and save on their own
  // button. HTML forbids nested forms in any case -- a sibling is the only
  // shape available, and here it is also the honest one.
  //
  // Values render BLANK unless the coverage map says they were actually given.
  // profile.liquidSavings is 0 both for "I have nothing I could reach this
  // week" and for "nobody ever asked me", and pre-filling that 0 would put a
  // statement about a reader's finances into a box they never filled in -- the
  // same defect v79 fixed on the Finance page's runway row. An ABSENT map
  // reads as unknown rather than as missing (saves predating the flags were
  // made when these fields were required, so their owners did answer), which
  // is the inputAnswered convention in aspects.js.
  const p = state.profile;
  const givenValue = (key) => {
    if (!p.provided || typeof p.provided !== "object") return p[key];
    return p.provided[key] === true ? p[key] : "";
  };

  const runwayBlock = () => `
    <h4 class="instrument-title" style="margin-top: 22px;">${t("Runway — optional, and never scored")}</h4>
    <p class="onb-note">${t("Both optional. Together they give your runway: how long you could cover the unskippable if income stopped. Reported on your Finance page, not scored.")}</p>
    <form id="deep-runway-form">
      <div class="grid-2">
        ${numberField("deep-liquid", t("Liquid Savings You Could Reach This Week (THB)"), givenValue("liquidSavings"), 'min="0"', {
          field: "liquidSavings",
          placeholder: t("e.g. 50,000")
        })}
        ${numberField("deep-outflow", t("Committed Monthly Outflow (THB)"), givenValue("committedOutflow"), 'min="0"', {
          field: "committedOutflow",
          placeholder: t("e.g. 12,000"),
          note: t("Rent, loan repayments, bills.")
        })}
      </div>
      ${numberField("deep-family", t("Money You Send to Family (THB/month)"), givenValue("familySupport"), 'min="0"', {
        field: "familySupport",
        placeholder: t("e.g. 5,000 — leave blank if none"),
        note: t("Counted in your runway with the box above, and shown on your Social Contribution page as giving. It is never subtracted from a score.")
      })}
      <button type="submit" class="btn btn-secondary" style="width: 100%; margin-top: 12px;">${t("Save these figures")}</button>
    </form>`;

  const sectionCard = (section) => {
    const done = isAspectDeepVerified(state, section.aspect);
    const keys = deepSectionInstruments(section, isCoupled);
    return `
      <div class="card deep-section ${done ? "deep-section-done" : ""}" id="deep-section-${section.aspect}">
        <div class="deep-section-head">
          <h3 class="card-header">${t(section.title)}</h3>
          ${done ? `<span class="confidence-badge confidence-verified">${t("In-depth")}</span>` : ""}
        </div>
        <p class="onb-why">${t(section.blurb)}</p>
        ${done ? `<p class="deep-done-note">${t("Completed — this aspect's score is verified. You can redo it to update.")}</p>` : ""}
        <form class="deep-form" data-aspect="${section.aspect}" data-keys="${keys.join(",")}">
          ${keys.map(k => deepInstrumentBlock(k, deepAskIndices(k, state.baseline))).join("")}
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 12px;">${done ? t("Update this section") : t("Save this section")}</button>
        </form>
        ${section.aspect === "finance" ? runwayBlock() : ""}
      </div>`;
  };

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>
    <!-- Plain .card, not .onboarding-container: that class is capped at 981px
         for the INSTRUMENTS scales, but the .deep-section cards below stretch
         to the full 1192px shell for cfc12. Keeping the cap here would leave
         this intro card visibly narrower than every card under it. -->
    <div class="card" style="margin-bottom: 16px;">
      <div class="brand" style="text-align: center; margin-bottom: 18px;">
        <h1>${t("IN-DEPTH ASSESSMENT")}</h1>
        <p>${t("Optional • full-length validated questionnaires • one section at a time")}</p>
      </div>
      <p style="font-size: var(--text-base); color: var(--color-text-secondary);">
        ${t("These longer questionnaires make each aspect's estimate more reliable and tighten its percentile band. Save each section on its own — completed sections are kept as you go. Reward: +60 points per section.")}
      </p>
    </div>
    ${DEEP_SECTIONS.map(sectionCard).join("")}
    <p id="deep-error" class="d-none" style="color: var(--color-crimson); font-weight: 600;"></p>
  `;

  // The runway form saves through the SAME mutator the Profile page uses -- so
  // blank-means-zero for family support, blank-means-unchanged for the other
  // two, and the provided flags flipping to true are all decided in one place
  // rather than twice. No XP and no score movement: neither figure reaches a
  // scoring formula, which is why the app reports the runway and never ranks it.
  //
  // Deliberately NOT drafted. Every other form here saves a draft because
  // abandoning ten Likert items costs real work; three optional numbers do not,
  // and a draft would be a second copy of money figures the state already holds.
  const runwayForm = document.getElementById("deep-runway-form");
  if (runwayForm) {
    runwayForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("deep-error");
      errorEl.classList.add("d-none");
      // Range-checks whatever was typed and skips the blanks, which is what
      // makes three optional boxes safe to validate with the same call the
      // mandatory questionnaires use.
      const invalid = validateScope(runwayForm);
      if (invalid) {
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
      const val = (id) => document.getElementById(id).value;
      const result = stateManager.updateProfile({
        liquidSavings: val("deep-liquid"),
        committedOutflow: val("deep-outflow"),
        familySupport: val("deep-family")
      });
      if (onRunwaySaved) onRunwaySaved(result);
    });
  }

  container.querySelectorAll(".deep-form").forEach(form => {
    // One draft per aspect section, because each is submitted independently:
    // finishing Mental must not discard a half-finished Finance section.
    const draftKey = `deep-${form.dataset.aspect}`;
    applyDraft(draftKey, form);
    const saveDeep = () => saveDraft(draftKey, form, {});
    form.addEventListener("input", saveDeep);
    form.addEventListener("change", saveDeep);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("deep-error");
      errorEl.classList.add("d-none");
      const invalid = validateScope(form);
      if (invalid) {
        errorEl.textContent = t("Please answer every question before submitting.");
        errorEl.classList.remove("d-none");
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
      try {
        const aspect = form.dataset.aspect;
        const keys = form.dataset.keys.split(",").filter(Boolean);
        const deepData = {};
        // Same baseline the form was built from, so the asked-item set here
        // matches what was rendered; submitDeepAssessment derives it again to
        // reconstruct the full-length sum.
        keys.forEach(k => { deepData[k] = collectDeepInstrument(k, deepAskIndices(k, state.baseline)); });
        const result = stateManager.submitDeepAssessment(aspect, deepData);
        clearDraft(draftKey);
        if (result && result.flagged) {
          errorEl.textContent = t("Some answers all sat on the same option, so that questionnaire was not counted. Vary your answers to reflect your real experience and save again.");
          errorEl.classList.remove("d-none");
          return;
        }
        onComplete(aspect, result);
      } catch (err) {
        console.error("Deep assessment submission failed:", err);
        errorEl.textContent = t("Assessment Error: ") + err.message;
        errorEl.classList.remove("d-none");
      }
    });
  });
}
