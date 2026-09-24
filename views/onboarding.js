// views/onboarding.js - the baseline assessment, as a journey through eight
// chapters rather than six long form pages.
//
// WHAT CHANGED AND WHY (v81). The content is identical: the same 85 required
// inputs, the same 14 instruments, the same field ids, the same submitted
// payload. Only the PARTITION and the PACING changed. The old shape asked for
// 85 answers across 6 pages -- 12, 14, 10, 12, 17 and 20, heaviest last -- with
// no in-page feedback at all, so the only signal a reader got was a "Step n of
// 6" that moved roughly once every four minutes. See
// docs/onboarding-flow-redesign.md for the counts and the argument.
//
// Now: one instrument (or one small group of numbers) per screen, items within
// an instrument revealed one at a time, and every chapter ending with a recap
// of the reader's own answers plus one cited fact. The ring replaces the bar.
//
// Blank-first policy (v2.3.0) is untouched: every field starts empty, every
// mandatory field carries a red "*", and no screen can be left until each
// visible required control is answered. A first baseline must be filled in
// full, so no aspect is scored from a silent default.
//
// THE THING THIS FILE MUST NOT DO. No screen before the end may show a score,
// a grade, a percentile or a rank. usability-test-plan.md already worries that
// testers "begin optimizing their score"; a rank shown at chapter 1 would be
// read by someone answering chapters 2 to 8, and every number after it would be
// contaminated. The recaps are descriptive by construction -- see the rule at
// the top of views/journey.js.

import { stateManager } from "../state.js";
import { buildProvidedFlags, buildAnsweredFlags } from "../validation.js";
import { collectInstrument, validateScope, clearScopeErrors } from "./instrument-forms.js";
import { escapeHtml, scrollIntoViewGently } from "./helpers.js";
import { applyDraft, saveDraft, clearDraft, instrumentsIn } from "../draft.js";
import { savingsRateFrom } from "../scoring.js";
import { CHAPTERS, allScreens } from "./journey.js";
import { ringMarkup, paintRing } from "./journey-ring.js";
import { playEnding, settleRing, isQuietChapter } from "./moments.js";
import { SOURCES } from "../benchmarks.js";
import { INSTRUMENTS } from "../surveys.js";
import { t, tp } from "../i18n.js";

// The form is long enough that losing it hurts. draft.js keeps a scratch copy
// under this name so a reload resumes instead of restarting. Cleared the moment
// the baseline is accepted -- from then on state.js is the record, and a draft
// would be a stale second copy of assessment data.
const DRAFT_KEY = "onboarding";

// Maps each validated numeric field (validation.js FIELD_CONSTRAINTS keys) to
// its onboarding input id — used for reading and coverage tracking. The inputs
// also carry data-field so validateScope range-checks them per screen.
//
// liquidSavings / committedOutflow / familySupport are deliberately absent
// since v80. Their coverage flags therefore come back false from
// buildProvidedFlags, which is exactly right: the runway row stays withheld
// until someone actually enters the figures on the Profile or deep pages,
// rather than reporting a zero nobody typed.
const ONB_NUMERIC_IDS = {
  income: "onb-income", monthlySavings: "onb-savings",
  weeklyLearningHours: "onb-learning", weeklyVigorousDays: "onb-vig-days",
  weeklyVigorousMins: "onb-vig-mins", weeklyModerateDays: "onb-mod-days",
  weeklyModerateMins: "onb-mod-mins", weeklyWalkingDays: "onb-walk-days",
  weeklyWalkingMins: "onb-walk-mins", weight: "onb-weight", height: "onb-height",
  sleepHours: "onb-sleep", vegetablePortions: "onb-veg", waterLiters: "onb-water",
  singleUsePlastics: "onb-plastics", monthlyDonations: "onb-donations",
  volunteeringHours: "onb-volunteer"
};

// Content screens with a chapter ending inserted after the last screen of each
// chapter. Both kinds render as `.survey-page`, which matters more than it
// looks: instrument-forms.js:isConditionallyHidden treats a `.d-none` ancestor
// as "skip this control" UNLESS that ancestor is a `.survey-page`. Keeping the
// class means an off-screen screen is still validated by the final sweep, so a
// reader cannot reach submit with an unanswered screen behind them.
function buildScreens() {
  const out = [];
  for (const screen of allScreens()) {
    out.push({ ...screen, kind: "content" });
    if (screen.endsChapter) {
      out.push({ kind: "ending", chapter: screen.chapter, id: `ending-${screen.chapter}` });
    }
  }
  return out;
}

// The region banner: what turns 22 answering screens from a form into a place.
//
// Before this, a chapter's colour and name appeared ONLY on its ending card, so
// the reader crossed The Wildwood on the same off-white page as every other
// screen and met the forest for one screen out of four. The name was present in
// the ring's centre the whole time, but at --text-sm inside a 132px ring it sits
// below everything else in the hierarchy.
//
// The theme line shows on the chapter's FIRST screen only. It is an arrival
// beat; repeated on all four screens of a chapter it stops being one.
//
// The motif is decorative and aria-hidden: it carries no information the region
// name does not already carry in text.
// The region's art is NOT rendered here. It is a page background, painted on
// <body> by paintWash below, so it fills the viewport behind and around the
// card rather than sitting in a band inside it. This function renders only the
// text: which region, its name, and on the arrival screen its theme line.
function regionBannerMarkup(chapter, index, showTheme) {
  return `
    <div class="region-banner">
      <svg class="region-motif" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="${chapter.motif}" />
      </svg>
      <p class="region-banner-eyebrow">${tp("Region {n} of {total}", { n: index + 1, total: CHAPTERS.length })}</p>
      <h4 class="region-banner-name">${escapeHtml(chapter.region)}</h4>
      ${showTheme ? `<p class="region-banner-theme">${escapeHtml(chapter.theme)}</p>` : ""}
    </div>`;
}

// A chapter ending: the reader's own answers, then one fact about the world.
//
// The citation is real and links out, but it is folded into a <details> rather
// than printed under every fact. A chapter ending is four lines of writing; a
// 60-word citation beneath each one would bury the beat it exists to support.
// Folded is not hidden -- the disclosure is always present and always openable,
// which is the standard the rest of the app's benchmark cards already meet.
function endingMarkup(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex];
  const source = SOURCES[chapter.fact.source];
  return `
    <div class="chapter-ending" style="--chapter-hue: ${chapter.hue};">
      <p class="chapter-ending-eyebrow">${t("Region complete")}</p>
      <h3 class="chapter-ending-region">${escapeHtml(chapter.region)}</h3>
      <p class="chapter-ending-theme">${escapeHtml(chapter.theme)}</p>
      <ul class="chapter-recap" id="recap-${chapterIndex}"></ul>
      <div class="chapter-fact">
        <p class="chapter-fact-label">${t("Meanwhile, in the world")}</p>
        <p class="chapter-fact-text">${escapeHtml(chapter.fact.text)}</p>
        ${source ? `
        <details class="chapter-fact-source">
          <summary>${t("Where this comes from")}</summary>
          <p><a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></p>
        </details>` : ""}
      </div>
    </div>`;
}

// 1. RENDER ONBOARDING SURVEY
export function renderOnboarding(containerId, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Motion is decoration around the assessment. If a scene throws, the page
  // is already in its finished state (runScene renders it again), so the
  // defect goes to the console and the reader carries on.
  const reportMotion = (err) => console.error("Journey motion failed:", err);

  const screens = buildScreens();
  const total = screens.length;
  const lastIndex = total - 1;

  const screenMarkup = (screen, i) => {
    const isLast = i === lastIndex;
    const nav = `
      <div class="onb-nav">
        ${i > 0 ? `<button type="button" class="btn btn-onb-prev" data-screen="${i}">${t("Back")}</button>` : `<span></span>`}
        <div class="onb-nav-right">
          ${isLast
            ? `<button type="submit" class="btn btn-primary">${t("Complete Assessment")}</button>`
            : `<button type="button" class="btn btn-primary btn-onb-next" data-screen="${i}">${screen.kind === "ending" ? t("Travel on") : t("Next")}</button>`}
        </div>
      </div>`;

    const chapter = screen.chapter >= 0 ? CHAPTERS[screen.chapter] : null;
    const themed = chapter ? ` style="--chapter-hue: ${chapter.hue}; --chapter-wash: ${chapter.wash};"` : "";

    if (screen.kind === "ending") {
      return `
        <div class="survey-page survey-page-ending d-none" id="onb-page-${i}" data-chapter="${screen.chapter}"${themed}>
          ${endingMarkup(screen.chapter)}
          ${nav}
        </div>`;
    }

    // The couples-only RAS block keeps its conditional wrapper INSIDE the
    // screen. The wrapper is what validateScope skips for a single reader; the
    // screen itself is additionally skipped in navigation, so a single reader
    // never lands on a page with nothing on it.
    const body = screen.conditional === "couple"
      ? `<div id="ras-block" class="d-none">${screen.body}</div>`
      : screen.body;

    return `
      <div class="survey-page d-none" id="onb-page-${i}" data-chapter="${screen.chapter}"${themed}
        ${screen.instrument ? `data-instrument="${screen.instrument}"` : ""}
        ${screen.conditional ? `data-conditional="${screen.conditional}"` : ""}>
        ${chapter ? regionBannerMarkup(chapter, screen.chapter, screen.startsChapter) : ""}
        <h3 class="card-header">${escapeHtml(screen.title)}</h3>
        <p class="onb-why">${escapeHtml(screen.stem)}</p>
        ${body}
        ${nav}
      </div>`;
  };

  container.innerHTML = `
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 18px;">
        <h1>${t("PERSONAL WELLBEING ASSESSMENT")}</h1>
        <p>${t("Baseline Assessment")}</p>
      </div>
      ${ringMarkup(CHAPTERS)}
      <div id="onb-resume" class="onb-resume d-none">
        <span>${t("Picked up where you left off. Your answers were saved on this device.")}</span>
        <button type="button" class="btn btn-sm" id="onb-resume-clear">${t("Start over")}</button>
      </div>
      <form id="onboarding-form">
        ${screens.map(screenMarkup).join("")}
      </form>
      <p id="onboarding-error" class="d-none" role="alert" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  const form = document.getElementById("onboarding-form");
  const pageEl = (i) => document.getElementById(`onb-page-${i}`);
  const errorEl = () => document.getElementById("onboarding-error");
  // Unhidden BEFORE the text is written. The line is role="alert", and a live
  // region that is display:none when its text changes announces nothing.
  const showError = (msg) => { const el = errorEl(); el.classList.remove("d-none"); el.textContent = msg; };
  const hideError = () => errorEl().classList.add("d-none");

  // --- the couples-only block --------------------------------------------
  const relationshipSelect = document.getElementById("onb-relationship");
  const isCoupled = () => relationshipSelect.value === "Coupled";
  // Extracted because a restore has to run it too: setting `.value` from script
  // fires no change event, so without this a restored "Coupled" answer would
  // leave the RAS block hidden and the reader would never be asked those items.
  const syncCoupleBlock = () => {
    document.getElementById("ras-block").classList.toggle("d-none", !isCoupled());
  };
  const isSkippedScreen = (screen) => screen.conditional === "couple" && !isCoupled();
  const isSkipped = (i) => isSkippedScreen(screens[i]);

  // --- the reveal rhythm -------------------------------------------------
  //
  // Within an instrument screen the reader sees every question they have
  // already answered, plus exactly one they have not. That is the in-screen
  // feedback the old six-page form had none of, and it is computed from the
  // DOM rather than tracked in a counter on purpose: a reader who scrolls back
  // and CHANGES an earlier answer must not have the later ones vanish, and a
  // draft restore must land on the right item without replaying any events.
  const syncReveal = (page) => {
    if (!page || !page.dataset.instrument) return;
    let seenUnanswered = false;
    for (const fs of page.querySelectorAll("fieldset.survey-question")) {
      if (fs.querySelector('input[type="radio"]:checked')) {
        fs.classList.remove("q-pending");
        fs.classList.add("q-answered");
        continue;
      }
      fs.classList.remove("q-answered");
      // The first unanswered question is live; everything after it waits.
      fs.classList.toggle("q-pending", seenUnanswered);
      seenUnanswered = true;
    }
  };

  // --- the ring ----------------------------------------------------------
  //
  // `within` is the fraction of THIS chapter's screens the reader has passed,
  // counting the ending as one of them. Screens completed, never score.
  //
  // Within an instrument screen the arc also moves one sub-step per item
  // answered: the count of answered items, never which point was chosen.
  const itemsDone = (page) => {
    if (!page || !page.dataset.instrument) return 0;
    const items = page.querySelectorAll("fieldset.survey-question");
    if (!items.length) return 0;
    const answered = page.querySelectorAll('fieldset.survey-question input[type="radio"]:checked').length;
    return Math.min(1, answered / items.length);
  };

  const chapterProgress = (index) => {
    const screen = screens[index];
    if (screen.chapter < 0) return { chapter: -1, within: 0, endsChapter: false };
    const ofChapter = screens.filter(s => s.chapter === screen.chapter && !isSkippedScreen(s));
    const position = ofChapter.indexOf(screen);
    // The ENDING screen counts its own chapter as finished: the arc fills to
    // the brim and the count increments there, at the same moment the card in
    // front of it says the region is complete. This used to key off the last
    // CONTENT screen's `endsChapter` flag, so the count reached 1 / 8 one screen
    // early and fell back to 0 / 8 on the card headed "Region complete".
    const isEnding = screen.kind === "ending";
    const passed = position < 0 ? 0 : position + (isEnding ? 1 : itemsDone(pageEl(index)));
    return {
      chapter: screen.chapter,
      within: passed / ofChapter.length,
      endsChapter: isEnding
    };
  };

  const ringMarker = () => container.querySelector("#ring-marker");
  const markerAt = () => {
    const m = ringMarker();
    return m ? [Number(m.getAttribute("cx")), Number(m.getAttribute("cy"))] : [0, 0];
  };

  // Paints the ring in its new place at once (the finished state), then lets
  // the marker settle there. `motion` is false on the first paint.
  const updateRing = (index, { motion = true } = {}) => {
    const [x0, y0] = markerAt();
    paintRing(container, { ...chapterProgress(index), chapters: CHAPTERS });
    const [x1, y1] = markerAt();
    const shift = [x0 - x1, y0 - y1];
    if (motion) settleRing({ marker: ringMarker(), shift }).catch(reportMotion);
    return shift;
  };

  // A chapter ending reached by moving forward: the region lights up and the
  // recap is dealt. Arriving by Back, or on a resume, it is simply there.
  const playChapterEnding = (index, shift) => {
    const chapterIndex = screens[index].chapter;
    const page = pageEl(index);
    playEnding({
      draw: () => fillRecap(chapterIndex),
      pieces: () => ({
        lit: container.querySelector(`#ring-lit-${chapterIndex}`),
        marker: ringMarker(),
        shift,
        cards: page.querySelectorAll(".chapter-recap li"),
        fact: page.querySelector(".chapter-fact"),
        layer: container.querySelector(".ring-burst")
      }),
      quiet: isQuietChapter(CHAPTERS[chapterIndex])
    }).catch(reportMotion);
  };

  // --- recap -------------------------------------------------------------
  //
  // Built at display time, because it reads what the reader actually typed.
  // This accessor is the whole DOM dependency of views/journey.js: that module
  // never touches `document`, which is what makes the writing testable.
  const read = {
    num(id) {
      const el = document.getElementById(id);
      if (!el || String(el.value).trim() === "") return null;
      const n = Number(el.value);
      return Number.isFinite(n) ? n : null;
    },
    answers(key) {
      const instrument = INSTRUMENTS[key];
      if (!instrument) return [];
      return instrument.items.map((_, i) => {
        const el = form.querySelector(`input[name="${key}-q${i}"]:checked`);
        return el ? Number(el.value) : null;
      });
    }
  };

  const fillRecap = (chapterIndex) => {
    const list = document.getElementById(`recap-${chapterIndex}`);
    if (!list) return;
    let lines = [];
    try {
      lines = CHAPTERS[chapterIndex].recap(read) || [];
    } catch (err) {
      // A recap is writing around an assessment, not the assessment. If it
      // throws on some shape of answer nobody anticipated, the reader still
      // gets their chapter ending and their fact, and the console gets the
      // defect. Losing the flow over a sentence would be the worse failure by
      // a wide margin.
      console.error(`Chapter recap failed for ${CHAPTERS[chapterIndex].aspect}:`, err);
    }
    list.innerHTML = lines.map(line => `<li>${escapeHtml(line)}</li>`).join("");
  };

  // --- navigation --------------------------------------------------------
  let currentScreen = 0;

  // Paints the region's colour across the whole page. Set on <body>, not on the
  // container: a wash that stops at the card edge reads as a tinted panel
  // rather than as somewhere the reader has travelled to.
  //
  // The prologue is outside the ring and keeps the app's own paper, which is
  // what makes crossing into The Market feel like a departure.
  const paintWash = (index) => {
    const chapter = screens[index].chapter >= 0 ? CHAPTERS[screens[index].chapter] : null;
    if (chapter) {
      document.body.style.setProperty("--journey-wash", chapter.wash);
      // The region's art, as a background layer on <body>. Set here rather
      // than in the screen markup because a background has to be behind AND
      // around the card to read as a place; anything rendered inside the card
      // is a picture in a frame instead. The wash stays set as the colour
      // underneath it, which is what shows while the JPEG is still loading
      // and what a reader with images disabled gets.
      document.body.style.setProperty(
        "--journey-art", `url("./assets/regions/${chapter.art}.jpg")`
      );
      document.body.classList.add("journey-lit");
    } else {
      document.body.classList.remove("journey-lit");
    }
  };

  // FOCUS FOLLOWS THE SCREEN when the reader moved it. Hiding the old screen
  // otherwise drops focus to <body>, and #ring-status reads the same on every
  // screen of a chapter, so a screen-reader user pressed Next and heard
  // nothing. The heading is the screen's name, so landing there announces it.
  // Not on the first paint: a page that grabs focus on load is its own problem.
  const showScreen = (index, { moveFocus = true } = {}) => {
    const forward = moveFocus && index > currentScreen;
    currentScreen = index;
    screens.forEach((_, i) => pageEl(i).classList.toggle("d-none", i !== index));
    const page = pageEl(index);
    syncReveal(page);
    const isEnding = screens[index].kind === "ending";
    if (isEnding) fillRecap(screens[index].chapter);
    const shift = updateRing(index, { motion: moveFocus && !(isEnding && forward) });
    if (isEnding && forward) playChapterEnding(index, shift);
    paintWash(index);
    scrollIntoViewGently(container, { block: "start" });
    const heading = moveFocus && page.querySelector("h3");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  };

  // Walks past a screen the reader is not being asked (today: the couples-only
  // RAS screen for a single reader). Returns null when there is nothing left in
  // that direction, which only happens at the two ends.
  const nextVisible = (from, step) => {
    let i = from + step;
    while (i >= 0 && i < total && isSkipped(i)) i += step;
    return i >= 0 && i < total ? i : null;
  };

  container.querySelectorAll(".btn-onb-next").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.screen);
      const invalid = validateScope(pageEl(index));
      if (invalid) {
        showError(t("Please answer every question on this screen."));
        scrollIntoViewGently(invalid, { block: "center" });
        return;
      }
      hideError();
      const target = nextVisible(index, 1);
      if (target !== null) showScreen(target);
    });
  });
  container.querySelectorAll(".btn-onb-prev").forEach(btn => {
    btn.addEventListener("click", () => {
      hideError();
      const target = nextVisible(parseInt(btn.dataset.screen), -1);
      if (target !== null) showScreen(target);
    });
  });

  relationshipSelect.addEventListener("change", () => {
    syncCoupleBlock();
    updateRing(currentScreen);
  });

  // --- coverage capture --------------------------------------------------
  //
  // The reader must now answer everything, so these sets end up fully
  // populated — but they still record interaction honestly (e.g. the RAS
  // instrument stays unanswered, hence answered=false, for single readers).
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
  form.addEventListener("input", (e) => {
    const field = idToField[e.target.id];
    if (field) touchedFields.add(field);
    clearControlError(e.target);
  });
  form.addEventListener("change", (e) => {
    const match = (e.target.name || "").match(/^([a-z0-9]+)-q\d+$/i);
    if (match) touchedInstruments.add(match[1]);
    clearControlError(e.target);
    // An answer is what advances the reveal, so this runs on every radio
    // change rather than only on the one that happens to be live.
    syncReveal(e.target.closest(".survey-page"));
    // ...and the ring's sub-step: the same settle whichever point was chosen.
    if (match) updateRing(currentScreen);
  });

  // --- draft restore, then autosave --------------------------------------
  //
  // ORDER MATTERS. The restore runs AFTER `touchedFields` and
  // `touchedInstruments` exist, because it seeds them directly: applyDraft sets
  // `.checked` and `.value` from script, which fires no input or change event,
  // so the two listeners above see nothing. Skipping that bookkeeping would
  // leave a fully answered assessment recorded as never answered, and every
  // aspect page would show the "estimated" confidence tier over real answers.
  const restored = applyDraft(DRAFT_KEY, form);
  if (restored) {
    for (const id of restored.restoredIds) {
      const field = idToField[id];
      if (field) touchedFields.add(field);
    }
    for (const key of instrumentsIn(restored.restoredNames)) touchedInstruments.add(key);
    // Only on a restore. A fresh render already ships the RAS block hidden, so
    // an unconditional call here would do nothing except require a live DOM at
    // render time -- which the view tests deliberately do not provide.
    syncCoupleBlock();
    document.getElementById("onb-resume").classList.remove("d-none");
  }

  // WHERE A RESUMED READER LANDS: the screen they saved on, or the first screen
  // before it with anything unanswered, whichever comes first.
  //
  // The saved step alone is not enough. Drafts survive releases since v88, and
  // a release can add a question to a screen the reader already passed or move
  // screens around; landing on the saved step would put them past a blank, and
  // a chapter ending past a blank recaps answers that were never given. The
  // clamp covers a release with fewer screens than the draft remembers.
  //
  // Checking a screen with validateScope paints its error messages, so they
  // are cleared straight away: the reader has not tried to leave anything yet.
  const firstIncompleteUpTo = (limit) => {
    for (let i = 0; i < limit; i++) {
      if (isSkipped(i)) continue;
      const invalid = validateScope(pageEl(i));
      clearScopeErrors(pageEl(i));
      if (invalid) return i;
    }
    return limit;
  };
  const savedStep = restored && Number.isInteger(restored.step)
    ? Math.min(Math.max(restored.step, 0), lastIndex)
    : 0;
  const resumeAt = firstIncompleteUpTo(savedStep);
  showScreen(isSkipped(resumeAt) ? (nextVisible(resumeAt, 1) ?? 0) : resumeAt, { moveFocus: false });

  // Start over: drop the draft and put the form back to the blank-first state
  // the markup was rendered in. form.reset() is exactly right here BECAUSE of
  // that policy -- every control ships empty, so resetting to defaults is the
  // same thing as clearing. The coverage sets have to be emptied with it, or a
  // discarded draft would keep counting as answered.
  document.getElementById("onb-resume-clear").addEventListener("click", () => {
    clearDraft(DRAFT_KEY);
    form.reset();
    touchedFields.clear();
    touchedInstruments.clear();
    syncCoupleBlock();
    document.getElementById("onb-resume").classList.add("d-none");
    hideError();
    showScreen(0);
  });

  const save = () => saveDraft(DRAFT_KEY, form, { step: currentScreen });
  form.addEventListener("input", save);
  form.addEventListener("change", save);

  // Build the survey payload from the DOM and submit. By the time this runs
  // every screen has passed validateScope, so no field is blank or out of range.
  const doSubmit = () => {
    hideError();
    // Final full-form sweep: validate every screen, jump to the first offender.
    // Ending screens hold no controls, so they pass trivially.
    for (let i = 0; i < total; i++) {
      if (isSkipped(i)) continue;
      const invalid = validateScope(pageEl(i));
      if (invalid) {
        // Focus goes to the first blank itself, not the heading: the scroll
        // below centres that control, and focus must agree with it.
        showScreen(i, { moveFocus: false });
        showError(t("Please answer every question before submitting."));
        scrollIntoViewGently(invalid, { block: "center" });
        const control = invalid.matches("input, select, textarea")
          ? invalid
          : invalid.querySelector("input, select, textarea");
        if (control) control.focus({ preventScroll: true });
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
        citacc: collectInstrument("citacc"),
        citlearn: collectInstrument("citlearn"),
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
      // The baseline is accepted and state.js is now the record. A surviving
      // draft would be a stale second copy of assessment data, and on a retake
      // it would repopulate the form with the previous run.
      clearDraft(DRAFT_KEY);
      // The journey is finished and the dashboard is not a region. Leaving the
      // wash on would tint every screen after this one with whichever chapter
      // happened to be last.
      document.body.classList.remove("journey-lit");
      document.body.style.removeProperty("--journey-wash");
      onComplete();
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      showError(t("Assessment Error: ") + err.message);
    }
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    doSubmit();
  });
}
