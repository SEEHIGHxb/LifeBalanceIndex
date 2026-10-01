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
import { escapeHtml, scrollIntoViewGently, noteBook, footnoteList, bindFootnotes } from "./helpers.js";
import { applyDraft, saveDraft, clearDraft } from "../draft.js";
import { isCarrying, carriedStep } from "./lang-carry.js";
import { pageHead, textSection } from "./stage-page.js";
import { emblemImg } from "./onboarding.js";
import { chapterOf, aspectName } from "./news.js";

// One aspect's questionnaires in the journey's mission panel: the region and
// its emblem on the left, the questions on the right, in the region's wash.
// data-quiet keeps the answer pills from rising as they do in the journey.
// `inner` and `sideExtra` are markup the caller built.
function assessPanel(aspect, inner, { id = "", cls = "", sideExtra = "" } = {}) {
  const chapter = chapterOf(aspect);
  return `
    <section class="survey-page assess-panel${cls ? ` ${cls}` : ""}" data-quiet${id ? ` id="${id}"` : ""}
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
//
// v159, the owner's cut list: three screens, one region each, as the Weekly
// Review (the count, a progress bar on phones, Back and Next pinned above the
// bottom bar); an answered question folds to its answer; the head is one line
// and the rules are a note at the page's end. Still quiet: no wipes.

const CHECKIN_DRAFT = "checkin";
// A tap folds its question at once; a change this long after a press is the
// arrow keys moving through the answers, which fold when focus leaves.
const FOLD_TAP_MS = 600;

// The seven instruments, grouped by the aspect each one re-scores.
function checkinGroups(state) {
  const isCoupled = state.profile.relationshipStatus !== "Single";
  return [
    ["mental", ["who5", "st5"]],
    ["relationships", isCoupled ? ["ucla", "ras"] : ["ucla"]],
    ["personalGoals", ["gse", "citacc", "citlearn"]]
  ];
}

function checkinNav(i, n) {
  // The phone shows the short word (css/weekly.css); a screen reader always
  // hears the long one.
  const submit = `<span class="pill-long">${t("Complete Re-assessment")}</span><span class="pill-short" aria-hidden="true">${t("Finish")}</span>`;
  return `
    <div class="onb-nav">
      ${i > 0 ? `<button type="button" class="btn btn-onb-prev ck-back">${t("Back")}</button>` : "<span></span>"}
      <div class="onb-nav-right">
        ${i === n - 1
          ? `<button type="submit" class="btn btn-primary">${submit}</button>`
          : `<button type="button" class="btn btn-primary ck-next">${t("Next")}</button>`}
      </div>
    </div>`;
}

function checkinScreen([aspect, keys], i, n) {
  const progress = Math.round(((i + 1) / n) * 100);
  const side = `
    <p class="q-count">${escapeHtml(tp("Re-assessment · {i} / {n}", { i: i + 1, n }))}</p>
    <span class="rv-progress" aria-hidden="true"><i style="width: ${progress}%;"></i></span>`;
  return assessPanel(aspect, `
    <h3 class="q-title" tabindex="-1">${escapeHtml(aspectName(aspect))}</h3>
    ${keys.map(k => instrumentBlock(k)).join("")}
    ${checkinNav(i, n)}`,
  { id: `ck-step-${i}`, cls: i ? "d-none" : "", sideExtra: side });
}

// An answered question folds to its answer: the question on one line and the
// answer as a button that opens it again (css/more.css).
function foldQuestion(fs) {
  const chosen = fs.querySelector('input[type="radio"]:checked');
  if (!chosen) return;
  let summary = fs.querySelector(".q-summary");
  if (!summary) {
    summary = document.createElement("button");
    summary.type = "button";
    summary.className = "q-summary";
    fs.querySelector(".radio-group").after(summary);
  }
  summary.textContent = chosen.closest("label").textContent.trim();
  summary.setAttribute("aria-expanded", "false");
  fs.classList.add("q-folded");
}

function unfoldQuestion(fs) {
  fs.classList.remove("q-folded");
  fs.querySelector(".q-summary")?.setAttribute("aria-expanded", "true");
  fs.querySelector('input[type="radio"]:checked')?.focus();
}

function bindFolding(form) {
  let pressedAt = 0;
  form.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".radio-option")) pressedAt = Date.now();
  });
  form.addEventListener("change", (e) => {
    const fs = e.target.closest("fieldset.survey-question");
    if (fs && Date.now() - pressedAt < FOLD_TAP_MS) foldQuestion(fs);
  });
  form.addEventListener("focusout", (e) => {
    const fs = e.target.closest("fieldset.survey-question");
    if (fs && !fs.contains(e.relatedTarget)) foldQuestion(fs);
  });
  form.addEventListener("click", (e) => {
    const summary = e.target.closest(".q-summary");
    if (summary) unfoldQuestion(summary.closest("fieldset"));
  });
  // A draft picked up again shows how far it got.
  form.querySelectorAll("fieldset.survey-question").forEach(foldQuestion);
}

// The screens: Next checks the screen it leaves, focus follows the screen, and
// the draft remembers which one the reader was on.
function bindCheckinScreens(form, count, errorEl) {
  const page = (i) => document.getElementById(`ck-step-${i}`);
  let current = 0;
  const save = () => saveDraft(CHECKIN_DRAFT, form, { step: current });
  const show = (i, { announce = true } = {}) => {
    current = i;
    // Published for views/lang-carry.js, so a language switch keeps the screen.
    form.dataset.step = String(i);
    for (let k = 0; k < count; k++) page(k).classList.toggle("d-none", k !== i);
    if (!announce) return;
    save();
    scrollIntoViewGently(form, { block: "start" });
    page(i).querySelector(".q-title")?.focus({ preventScroll: true });
  };
  // An answer is the reader acting on the message, so it goes; the inline
  // "Required." stays on whatever is still unanswered.
  form.addEventListener("change", () => errorEl.classList.add("d-none"));
  form.addEventListener("click", (e) => {
    if (e.target.closest(".ck-next")) {
      const invalid = validateScope(page(current));
      if (invalid) {
        errorEl.textContent = t("Please fix the highlighted fields before continuing.");
        errorEl.classList.remove("d-none");
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
      errorEl.classList.add("d-none");
      show(current + 1);
    } else if (e.target.closest(".ck-back")) {
      errorEl.classList.add("d-none");
      show(current - 1);
    }
  });
  return { show, save };
}

function checkinNotDue(container) {
  const next = stateManager.nextCheckinDate();
  const line = next
    ? tp("The next re-assessment opens on {date}.", {
        date: next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })
      })
    : t("Re-assessment needs a baseline — complete the initial assessment first.");
  container.innerHTML = `
    <div class="stage-page textpage assess checkin-view">
      ${pageHead(t("Re-assessment"), [escapeHtml(line), `<a class="pill rv-done-home" href="#/dashboard">${t("Overview")}</a>`])}
    </div>`;
}

export function renderCheckin(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Opened by hand before one is due: say when it opens, and ask nothing.
  // state.js refuses the submission anyway; this saves answering for nothing.
  if (!stateManager.isCheckinDue()) {
    checkinNotDue(container);
    return;
  }

  const isCoupled = state.profile.relationshipStatus !== "Single";
  const groups = checkinGroups(state);
  const book = noteBook();
  const aboutRef = book.ref("checkin-about", [
    t("This re-assessment re-scores Mental, Relationships and Personal Goals with short questionnaires."),
    t("Each aspect moves by at most 15 points per re-assessment, and consistent weekly reviews since the last one add a small bonus."),
    t("Finishing it earns 40 points.")
  ].map(p => `<p>${escapeHtml(p)}</p>`).join(""));

  container.innerHTML = `
    <div class="stage-page textpage assess checkin-view">
      ${pageHead(t("Re-assessment"), [`${escapeHtml(t("Answer for the last few weeks."))}${aboutRef}`])}
      <div class="journey assess-journey">
        <div id="checkin-resume" class="onb-resume d-none">
          <span>${t("Picked up where you left off.")}</span>
        </div>
        <form id="checkin-form" novalidate>
          ${groups.map((group, i) => checkinScreen(group, i, groups.length)).join("")}
        </form>
        <p id="checkin-error" class="onboarding-error d-none" role="alert"></p>
      </div>
      ${textSection(t("Notes and sources"), footnoteList(book.notes), "checkin-notes")}
    </div>
  `;
  bindFootnotes(container);

  // Draft persistence, same contract as onboarding: seven instruments answered
  // on a phone, one interruption, all of it gone. The check-in reads every
  // instrument straight off the DOM at submit, so restoring the controls (and
  // the screen) is the whole job.
  const checkinForm = document.getElementById("checkin-form");
  const errorEl = document.getElementById("checkin-error");
  const screens = bindCheckinScreens(checkinForm, groups.length, errorEl);
  const restored = applyDraft(CHECKIN_DRAFT, checkinForm);
  // Not after a language switch, which re-renders from this same draft: the
  // reader never left, so there is nothing to have picked up.
  if (restored && !isCarrying()) {
    document.getElementById("checkin-resume").classList.remove("d-none");
  }
  const step = carriedStep("checkin-form") ?? restored?.step;
  if (Number.isInteger(step) && step > 0 && step < groups.length) screens.show(step, { announce: false });
  checkinForm.addEventListener("input", screens.save);
  checkinForm.addEventListener("change", screens.save);
  bindFolding(checkinForm);

  checkinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.classList.add("d-none");
    // Every screen, not only this one; the first in error is shown.
    const invalid = validateScope(checkinForm);
    if (invalid) {
      const screen = Number(invalid.closest(".assess-panel")?.id.replace("ck-step-", ""));
      if (Number.isInteger(screen)) screens.show(screen);
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
      clearDraft(CHECKIN_DRAFT);
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
//
// The owner, v154: the page keeps to the aspect's name, the questionnaire's
// name and its questions; what the questionnaires are for, why some questions
// are not asked again and what a finished section means are notes at its end.
export function renderDeepAssessment(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const isCoupled = state.profile.relationshipStatus !== "Single";
  const book = noteBook();
  const aboutRef = book.ref("about", [
    t("These longer questionnaires make each aspect's estimate more reliable and tighten its percentile band."),
    t("Completed sections are kept as you go, and each one earns 60 points."),
    t("Questions you already answered in the journey are not asked again: those answers still count here."),
    t("A finished section marks its aspect Done and its score verified. Save it again any time to update it.")
  ].map(p => `<p>${escapeHtml(p)}</p>`).join(""));

  // The section's note (what its questionnaires add) marks its first one.
  const sectionCard = (section) => {
    const done = isAspectDeepVerified(state, section.aspect);
    const keys = deepSectionInstruments(section, isCoupled);
    const ref = book.ref(`deep-${section.aspect}`, `<p>${escapeHtml(t(section.blurb))}</p>`);
    const doneMark = done ? `<p class="assess-done">${t("Done")}</p>` : "";
    return assessPanel(section.aspect, `
      <h3 class="q-title">${escapeHtml(aspectName(section.aspect))}</h3>
      <form class="deep-form" data-aspect="${section.aspect}" data-keys="${keys.join(",")}">
        ${keys.map((k, i) => deepInstrumentBlock(k, deepAskIndices(k, state.baseline), i ? "" : ref)).join("")}
        <p class="onboarding-error deep-form-error d-none" role="alert"></p>
        <div class="assess-submit">
          <button type="submit" class="pill">${done ? t("Update") : t("Save")}</button>
        </div>
      </form>`,
    { id: `deep-section-${section.aspect}`, sideExtra: doneMark });
  };

  const sections = DEEP_SECTIONS.map(sectionCard).join("");
  container.innerHTML = `
    <div class="stage-page textpage assess deep-view">
      ${pageHead(t("In-depth assessment"), [
        `${escapeHtml(t("Optional. Save each section on its own."))}${aboutRef}`
      ])}
      <div class="journey assess-journey">
        ${sections}
        <p id="deep-error" class="onboarding-error d-none" role="alert"></p>
      </div>
      ${textSection(t("Notes and sources"), footnoteList(book.notes), "deep-notes")}
    </div>
  `;
  bindFootnotes(container);

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
