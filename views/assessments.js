// views/assessments.js - the monthly mini re-assessment (#/checkin) and the
// optional in-depth assessment (#/deep). Moved verbatim from the old
// monolithic ui.js; behavior unchanged. Redesign R6 gave both pages a text
// page's head and the journey's mission panels; the forms, ids, drafts and
// validation are as they were, and neither page moves.

import { stateManager } from "../state.js";
import { DEEP_SECTIONS, deepSectionInstruments, deepAskIndices } from "../surveys.js";
import { isAspectDeepVerified } from "../aspects.js";
import { t, tp, dateLocale } from "../i18n.js";
import {
  instrumentBlock, collectInstrument,
  deepInstrumentBlock, collectDeepInstrument,
  validateScope
} from "./instrument-forms.js";
import { escapeHtml, scrollIntoViewGently } from "./helpers.js";
import { applyDraft, saveDraft, clearDraft } from "../draft.js";
import { isCarrying } from "./lang-carry.js";
import { pageHead } from "./stage-page.js";
import { emblemImg } from "./onboarding.js";
import { chapterOf, aspectName } from "./news.js";

// One aspect's questionnaires in the journey's mission panel: the region and
// its emblem on the left, the questions on the right, in the region's wash.
// data-quiet keeps the answer pills from rising as they do in the journey.
// `inner` and `sideExtra` are markup the caller built.
function assessPanel(aspect, inner, { id = "", sideExtra = "" } = {}) {
  const chapter = chapterOf(aspect);
  return `
    <section class="survey-page assess-panel" data-quiet${id ? ` id="${id}"` : ""}
      style="--chapter-hue: ${chapter.hue}; --chapter-wash: ${chapter.wash};">
      <div class="q-split">
        <div class="q-side">
          <p class="label">(${escapeHtml(chapter.region)})</p>
          ${emblemImg(chapter, "q-emblem")}
          ${sideExtra}
        </div>
        <div class="q-main">${inner}</div>
      </div>
    </section>`;
}

// 2c. RENDER THE MONTHLY MINI RE-ASSESSMENT (#/checkin)
export function renderCheckin(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Opened by hand before one is due: say when it opens, and ask nothing.
  // state.js refuses the submission anyway; this saves answering for nothing.
  if (!stateManager.isCheckinDue()) {
    const next = stateManager.nextCheckinDate();
    const line = next
      ? tp("The next re-assessment opens on {date}.", {
          date: next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })
        })
      : t("Re-assessment needs a baseline — complete the initial assessment first.");
    container.innerHTML = `
      <div class="stage-page textpage assess checkin-view">
        ${pageHead(t("Re-assessment"), [escapeHtml(line)])}
        <p class="rv-done-links"><a class="pill" href="#/dashboard">${t("See Home")}</a></p>
      </div>`;
    return;
  }

  const isCoupled = state.profile.relationshipStatus !== "Single";
  // The seven instruments, grouped by the aspect each one re-scores.
  const groups = [
    ["mental", ["who5", "st5"]],
    ["relationships", isCoupled ? ["ucla", "ras"] : ["ucla"]],
    ["personalGoals", ["gse", "citacc", "citlearn"]]
  ];

  // The one submit closes the last panel rather than sitting on the frame.
  const submit = `
    <div class="assess-submit">
      <button type="submit" class="pill">${t("Complete Re-assessment")}</button>
    </div>`;

  container.innerHTML = `
    <div class="stage-page textpage assess checkin-view">
      ${pageHead(t("Re-assessment"), [
        escapeHtml(t("Short instruments only • recalibrates Mental, Relationships & Personal Goals")),
        escapeHtml(t("Answer for the recent weeks, not how you felt at onboarding. Scores shift by at most ±15 points per re-assessment, and consistent weekly reviews since the last one add a small bonus. Reward: +40 points."))
      ])}
      <div class="journey assess-journey">
        <div id="checkin-resume" class="onb-resume d-none">
          <span>${t("Picked up where you left off. Your answers were saved on this device.")}</span>
        </div>
        <form id="checkin-form">
          ${groups.map(([aspect, keys], i) => assessPanel(aspect, `
            <h3 class="q-title">${escapeHtml(aspectName(aspect))}</h3>
            ${keys.map(k => instrumentBlock(k)).join("")}
            ${i === groups.length - 1 ? submit : ""}`)).join("")}
        </form>
        <p id="checkin-error" class="onboarding-error d-none" role="alert"></p>
      </div>
    </div>
  `;

  // Draft persistence, same contract as onboarding. Shorter form, same failure:
  // seven instruments answered on a phone, one interruption, all of it gone.
  //
  // No coverage bookkeeping to seed here -- unlike onboarding, the check-in
  // reads every instrument straight off the DOM at submit time and tracks no
  // "touched" sets, so restoring the controls is the whole job.
  const checkinForm = document.getElementById("checkin-form");
  // Not after a language switch, which re-renders from this same draft: the
  // reader never left, so there is nothing to have picked up.
  if (applyDraft("checkin", checkinForm) && !isCarrying()) {
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
export function renderDeepAssessment(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const isCoupled = state.profile.relationshipStatus !== "Single";

  const sectionCard = (section) => {
    const done = isAspectDeepVerified(state, section.aspect);
    const keys = deepSectionInstruments(section, isCoupled);
    const doneMark = done ? `<p class="assess-done">${t("In-depth")}</p>` : "";
    return assessPanel(section.aspect, `
      <h3 class="q-title">${t(section.title)}</h3>
      <p class="onb-why">${t(section.blurb)}</p>
      ${done ? `<p class="deep-done-note">${t("Completed — this aspect's score is verified. You can redo it to update.")}</p>` : ""}
      <form class="deep-form" data-aspect="${section.aspect}" data-keys="${keys.join(",")}">
        ${keys.map(k => deepInstrumentBlock(k, deepAskIndices(k, state.baseline))).join("")}
        <p class="onboarding-error deep-form-error d-none" role="alert"></p>
        <div class="assess-submit">
          <button type="submit" class="pill">${done ? t("Update this section") : t("Save this section")}</button>
        </div>
      </form>`,
    { id: `deep-section-${section.aspect}`, sideExtra: doneMark });
  };

  container.innerHTML = `
    <div class="stage-page textpage assess deep-view">
      ${pageHead(t("In-depth assessment"), [
        escapeHtml(t("Optional • full-length validated questionnaires • one section at a time")),
        escapeHtml(t("These longer questionnaires make each aspect's estimate more reliable and tighten its percentile band. Save each section on its own — completed sections are kept as you go. Reward: +60 points per section."))
      ])}
      <div class="journey assess-journey">
        ${DEEP_SECTIONS.map(sectionCard).join("")}
        <p id="deep-error" class="onboarding-error d-none" role="alert"></p>
      </div>
    </div>
  `;

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
      // The section's own message, beside its Save button. The page-wide one
      // sat under the last section, out of sight of whoever pressed Save on
      // the first.
      const errorEl = form.querySelector(".deep-form-error");
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
        if (result && result.flagged) {
          // The answers are kept: the reader is asked to change some and save
          // again, which a cleared draft would lose on the next reload.
          errorEl.textContent = t("Some answers all sat on the same option, so that questionnaire was not counted. Vary your answers to reflect your real experience and save again.");
          errorEl.classList.remove("d-none");
          scrollIntoViewGently(errorEl, { block: "center" });
          return;
        }
        clearDraft(draftKey);
        onComplete(aspect, result);
      } catch (err) {
        console.error("Deep assessment submission failed:", err);
        errorEl.textContent = t("Assessment Error: ") + err.message;
        errorEl.classList.remove("d-none");
      }
    });
  });
}
