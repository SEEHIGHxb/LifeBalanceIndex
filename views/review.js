// views/review.js - the Weekly Review (#/review): ONE measured self-report per
// ISO week. The form asks for rough weekly quantities ("about 2 L of water a
// day"), prefilled with the current profile values so an unchanged week takes
// seconds; the submission re-measures the behavior-driven aspects through the
// shared scoring formulas and grades every pledge at once.
//
// THE REDESIGN (R4, v99). One region per screen, in the journey's mission
// panel: The Market, The Highlands (moving, then day to day: the owner split
// it on 2026-09-25 because nine boxes are long on a phone), The Workshop, The
// Crossroads and The Wildwood. Moving forward into a new region, its
// photograph wipes up over the screen and away. Submitting ends on one screen
// where every reviewed region bursts, the same whatever the numbers were:
// motion never rewards or scolds an answer. The screens are all in one form,
// so the submit path reads every box exactly as it always has.
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
import { numberField, markField } from "./instrument-forms.js";
import { escapeHtml, scrollIntoViewGently } from "./helpers.js";
import { savingsAmountFrom, savingsRateFrom } from "../scoring.js";
import {
  CONNECTION_SOURCES, SOURCE_NAMES, readConnection, readConnectionPrefs,
  connectionStatus, connectionPrefills, incomeDrifted
} from "../connections.js";
import { isoWeekKey } from "../season.js";
import { mountMotion, writeMotionStyle } from "./motion-mount.js";
import { typedMarkup, typeIn, settleIn, burst, onAbort, SPRITES, isQuietChapter } from "./stage.js";
import { label } from "./stage-page.js";
import { chapterOf, dotDate, shiftSummary, starThumb, newsRow } from "./news.js";
import { animate, easeStar, isReduced } from "../motion.js";
import { carriedStep } from "./lang-carry.js";

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

// The screens, one region each, and every field above on exactly one of them
// (tests/weekly-loop.test.mjs holds that). `title` replaces the region question
// where a region has two screens; `sub` is the old form's section heading.
export const REVIEW_STEPS = Object.freeze([
  { aspect: "finance", fields: ["monthlySavings"] },
  {
    aspect: "physical", sub: "Activity this week",
    fields: ["weeklyVigorousDays", "weeklyVigorousMins", "weeklyModerateDays", "weeklyModerateMins", "weeklyWalkingDays", "weeklyWalkingMins"]
  },
  {
    aspect: "physical", title: "And day to day: sleep, water, vegetables.", sub: "Daily habits (weekly average)",
    fields: ["sleepHours", "waterLiters", "vegetablePortions"]
  },
  { aspect: "personalGoals", fields: ["weeklyLearningHours"] },
  { aspect: "socialContribution", sub: "Monthly habits (update when they change)", fields: ["monthlyDonations", "volunteeringHours"] },
  { aspect: "environment", fields: ["singleUsePlastics"] }
]);
const STEPS = REVIEW_STEPS;
export const REVIEW_FIELDS = Object.freeze(Object.keys(FIELD_IDS));

// The onboarding label strings are reused verbatim so the review form needs no
// new translations and the two forms can never phrase the same field two ways.
// Per-field clarifications, shown under the input. Only where the QUESTION is
// ambiguous rather than the value hard to recall: criteria.js multiplies days
// by minutes, so these three mean "minutes on a day you did it", and reading
// them as a weekly average is a 2.3x-7x error inside the WHO guideline check.
const FIELD_NOTES = {
  weeklyVigorousMins: "Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.",
  weeklyModerateMins: "Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.",
  weeklyWalkingMins: "Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes."
};

const FIELD_LABELS = {
  weeklyVigorousDays: "Vigorous Exercise (Days/Week)",
  weeklyVigorousMins: "Vigorous Minutes on Each of Those Days",
  weeklyModerateDays: "Moderate Exercise (Days/Week)",
  weeklyModerateMins: "Moderate Minutes on Each of Those Days",
  weeklyWalkingDays: "Walking (Days/Week)",
  weeklyWalkingMins: "Walking Minutes on Each of Those Days",
  sleepHours: "Average Nightly Sleep (Hours)",
  waterLiters: "Water Intake per Day (Liters)",
  vegetablePortions: "Vegetable Portions per Day",
  weeklyLearningHours: "Weekly Learning / Study Hours",
  singleUsePlastics: "Single-Use Plastic Items per Day",
  monthlySavings: "Monthly Savings (THB)",
  monthlyDonations: "Monthly Donations (THB)",
  volunteeringHours: "Volunteering Hours per Month"
};

const FIELD_STEPS = { sleepHours: 0.5, waterLiters: 0.1, weeklyLearningHours: 0.5, volunteeringHours: 0.5 };

// The prototype's timings: the title types at this pace; the next region's
// photograph wipes up, holds, then wipes away; the ending's curtain lifts and
// each reviewed region bursts a beat after the one before.
const TYPE_MS_PER_CHAR = 32;
const WIPE_IN_MS = 560;
const WIPE_HOLD_MS = 260;
const WIPE_OUT_MS = 520;
const ENDING_MS = 700;
const BURST_STAGGER_MS = 140;
const PAST_ROWS = 8;

const stepChapter = (i) => chapterOf(STEPS[i].aspect);

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
  // The clarification note travels with the field, not just with onboarding.
  // These three are re-entered EVERY week, so the week-average-vs-per-session
  // ambiguity that the v77 relabel fixed bites here more often than it does at
  // onboarding, where it is read once. When a connected source prefilled the
  // box, both notes are shown: the provenance and the unit are different facts.
  const ownNote = FIELD_NOTES[field] ? t(FIELD_NOTES[field]) : "";
  const note = [pre ? prefillNote(pre) : "", ownNote].filter(Boolean).join(" ");
  return numberField(
    FIELD_IDS[field],
    `${t(FIELD_LABELS[field])}${chip}`,
    pre ? pre.value : own,
    `min="${c.min}" max="${c.max}"${step}`,
    note ? { note } : {}
  );
}

// Next ISO week starts on the coming Monday.
export function nextReviewDate() {
  const d = new Date();
  const sinceMonday = (d.getDay() + 6) % 7;
  const next = new Date(d);
  next.setDate(d.getDate() + (7 - sinceMonday));
  return next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

// --- the screens --------------------------------------------------------------

function stepMarkup(step, i, box, intro) {
  const chapter = stepChapter(i);
  const last = i === STEPS.length - 1;
  const title = step.title ? t(step.title) : tp("How was {region} this week?", { region: chapter.region });
  const quiet = isQuietChapter(chapter) ? " data-quiet" : "";
  return `
    <section class="survey-page rv-step${i ? " d-none" : ""}" id="rv-step-${i}" data-step="${i}"${quiet}
      style="--chapter-hue: ${chapter.hue}; --chapter-wash: ${chapter.wash};">
      <div class="q-split">
        <div class="q-side">
          <p class="label">(${escapeHtml(chapter.region)})</p>
          <img class="q-emblem" src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async">
          <p class="q-count">${escapeHtml(tp("Weekly Review · {i} / {n}", { i: i + 1, n: STEPS.length }))}</p>
        </div>
        <div class="q-main">
          <h3 class="q-title" tabindex="-1">${typedMarkup(title)}</h3>
          ${i === 0 ? intro : ""}
          ${step.sub ? `<p class="onb-why">${t(step.sub)}</p>` : ""}
          <div class="rv-fields">${step.fields.map(box).join("")}</div>
          <div class="onb-nav">
            ${i > 0 ? `<button type="button" class="btn btn-onb-prev rv-back">${t("Back")}</button>` : "<span></span>"}
            <div class="onb-nav-right">
              ${last
                ? `<button type="submit" class="btn btn-primary">${t("Complete Weekly Review")}</button>`
                : `<button type="button" class="btn btn-primary rv-next">${t("Next")}</button>`}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function formMarkup(state) {
  // One read of the sibling apps for the whole render: values for the boxes a
  // connection fills, plus the status needed to explain an empty-handed one.
  const conn = readConnections(new Date());
  const box = field => reviewField(field, state.profile, conn.prefills);
  const intro = `
    <p class="onb-why">${t("Report a rough weekly average for each habit — no daily logging needed. Every value is prefilled with last week's answer, so only touch what changed. Takes about two minutes.")}</p>
    ${connectionBanner(conn, state.profile)}`;
  return `
    <div class="journey review">
      <form id="weekly-review-form" novalidate>
        ${STEPS.map((step, i) => stepMarkup(step, i, box, intro)).join("")}
      </form>
      <p id="review-error" class="onboarding-error d-none" role="alert"></p>
      <section class="rv-ending d-none" id="rv-ending" aria-labelledby="rv-ending-title"></section>
      <div class="rv-wipe" id="rv-wipe" aria-hidden="true"></div>
    </div>`;
}

// The review is done for the week: the past reviews as a dated list.
function doneMarkup(state) {
  const rows = (state.reviews || []).slice(-PAST_ROWS).reverse().map(r => newsRow({
    date: dotDate(r.date),
    kind: t("Weekly Review"),
    thumb: starThumb(),
    title: shiftSummary(r.shifts),
    sub: `${tp("{met}/{total} pledges met", { met: r.goals.filter(g => g.met).length, total: r.goals.length })} · ${tp("+{xp} points", { xp: r.xp })}`
  })).join("");
  const checkin = stateManager.isCheckinDue() ? `
    <p class="rv-done-note">${t("One thing while you're here: the monthly re-assessment is due.")}
      <a href="#/checkin">${t("Start Re-assessment")}</a></p>` : "";
  return `
    <div class="stage-page review-done">
      <section class="panel news rv-done">
        <div class="wrap split news-block">
          <div class="news-side">${label(t("Past Reviews"))}</div>
          <div>
            <h2 class="rv-done-head" id="rv-done-head" tabindex="-1">${t("Reviewed this week.")}</h2>
            <p class="rv-done-note">${tp("Nothing to do here until {date} — live your week; the app can wait.", { date: nextReviewDate() })}</p>
            ${checkin}
            ${rows ? `<ul class="newslist">${rows}</ul>` : ""}
            <p class="rv-done-links"><a class="pill" href="#/dashboard">${t("See Home")}</a></p>
          </div>
        </div>
      </section>
    </div>`;
}

function endingMarkup(record) {
  const met = record.goals.filter(g => g.met).length;
  return `
    <i class="rv-ending-curtain" aria-hidden="true"></i>
    <div class="burst-layer" aria-hidden="true"></div>
    <div class="rv-ending-in">
      <span class="rv-ending-star" aria-hidden="true"><svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg></span>
      <h2 id="rv-ending-title" tabindex="-1">${t("Reviewed this week.")}</h2>
      <p>${escapeHtml(shiftSummary(record.shifts))}</p>
      ${record.goals.length ? `<p>${escapeHtml(tp("{met}/{total} pledges met", { met, total: record.goals.length }))}</p>` : ""}
      <p class="rv-ending-xp">${escapeHtml(tp("+{xp} points", { xp: record.xp }))}</p>
      <button type="button" class="rv-continue">${t("Continue")}</button>
    </div>`;
}

// --- motion -------------------------------------------------------------------

// The next region's photograph wipes up over the screen, the screen changes
// under it (`land`), and it wipes away upward. The window moves while the
// picture inside moves the other way, so the edge sweeps and the picture holds
// still: a wipe in transforms alone. Resolves when the wipe is over.
function wipeTo(overlay, chapter, land, signal) {
  overlay.innerHTML = `<i class="rv-wipe-window"><b style="background-image: url('./assets/regions/${chapter.art}.jpg'); background-color: ${chapter.wash};"><span>${escapeHtml(chapter.region)}</span></b></i>`;
  const win = overlay.firstElementChild;
  const pic = win.firstElementChild;
  let landed = false;
  const arrive = () => { if (!landed) { landed = true; land(); } };
  const clear = () => { overlay.classList.remove("on"); overlay.innerHTML = ""; };
  // A wipe cut short still lands the reader on the screen they asked for.
  onAbort(signal, () => { arrive(); clear(); });
  // k = 1 below the screen, 0 covering it, -1 gone above it.
  const pose = (k) => {
    const y = k * (overlay.clientHeight || innerHeight);
    writeMotionStyle(win, { transform: k ? `translateY(${y.toFixed(1)}px)` : "" });
    writeMotionStyle(pic, { transform: k ? `translateY(${(-y).toFixed(1)}px)` : "" });
  };
  pose(1);
  overlay.classList.add("on");
  return animate({ duration: WIPE_IN_MS, ease: easeStar, signal, reduced: "end", update: p => pose(1 - p) })
    .then(done => {
      if (!done) return false;
      arrive();
      return animate({ duration: WIPE_HOLD_MS, update: () => {}, signal, reduced: "end" });
    })
    .then(done => done && animate({ duration: WIPE_OUT_MS, ease: easeStar, signal, reduced: "end", update: p => pose(-p) }))
    .finally(clear);
}

// The ending: a curtain lifts off it, then every reviewed region bursts from
// the star in turn. The regions are the screens', not the answers'.
function playEnding(ending, signal) {
  const curtain = ending.querySelector(".rv-ending-curtain");
  const layer = ending.querySelector(".burst-layer");
  const star = ending.querySelector(".rv-ending-star");
  onAbort(signal, () => writeMotionStyle(curtain, { transform: "" }));
  writeMotionStyle(curtain, { transform: "scaleY(1)" });
  const regions = [...new Set(STEPS.map(s => s.aspect))].map(chapterOf).filter(c => c && !isQuietChapter(c));
  return animate({
    duration: ENDING_MS, ease: easeStar, signal, reduced: "end",
    update: (p) => writeMotionStyle(curtain, { transform: p >= 1 ? "" : `scaleY(${(1 - p).toFixed(4)})` })
  }).then(done => done && Promise.all(regions.map((c, k) => animate({
    duration: 1, delay: k * BURST_STAGGER_MS, update: () => {}, signal, reduced: "end"
  }).then(go => go && burst(layer, star, { motifs: [{ motif: c.aspect, hue: c.hue }], signal })))));
}

// --- the view -----------------------------------------------------------------

export function renderReview(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!stateManager.isWeeklyReviewDue()) {
    container.innerHTML = doneMarkup(state);
    return;
  }
  container.innerHTML = formMarkup(state);

  const form = document.getElementById("weekly-review-form");
  const errorEl = document.getElementById("review-error");
  const page = (i) => document.getElementById(`rv-step-${i}`);
  const reportMotion = (err) => console.error("Review motion failed:", err);
  let current = 0;
  let busy = false;

  // Unhidden BEFORE the text is written: a live region that is display:none
  // when its text changes announces nothing.
  const showError = (msg) => { errorEl.classList.remove("d-none"); errorEl.textContent = msg; };
  const hideError = () => errorEl.classList.add("d-none");

  const readFields = (fields) => Object.fromEntries(fields.map(f => [f, document.getElementById(FIELD_IDS[f])?.value]));

  // Same inline-error pattern as onboarding: per-field messages and a banner.
  // Returns the first field in error on this screen, or null.
  const checkStep = (i) => {
    const { fields } = STEPS[i];
    const { errors } = validateProfile(readFields(fields));
    for (const field of fields) {
      const input = document.getElementById(FIELD_IDS[field]);
      const span = document.getElementById(`${FIELD_IDS[field]}-err`);
      const message = errors[field] || "";
      markField(input, span, message);
    }
    const bad = fields.find(f => errors[f]) || null;
    if (bad) showError(t("Please fix the highlighted fields before continuing."));
    else hideError();
    return bad;
  };

  // Focus follows the screen, so a screen-reader user hears where they are.
  // Under a wipe the arrival shares the wipe's scope: a fresh mount here would
  // abort the wipe before its second half.
  const land = (i, { forward, signal = null }) => {
    current = i;
    // Published for views/lang-carry.js: a language switch re-renders the
    // review, and without this it came back on the first screen.
    form.dataset.step = String(i);
    STEPS.forEach((_, k) => page(k).classList.toggle("d-none", k !== i));
    scrollIntoViewGently(container, { block: "start" });
    page(i).querySelector(".q-title")?.focus({ preventScroll: true });
    const live = signal || mountMotion().signal;
    if (!forward || isReduced() || isQuietChapter(stepChapter(i))) return;
    settleIn(page(i).querySelector(".q-emblem"), { signal: live }).catch(reportMotion);
    typeIn(page(i).querySelector(".q-title .typed"), { msPerChar: TYPE_MS_PER_CHAR, signal: live }).catch(reportMotion);
  };

  const goForward = (i) => {
    const chapter = stepChapter(i);
    const newRegion = chapter !== stepChapter(current);
    if (!newRegion || isReduced() || isQuietChapter(chapter)) {
      land(i, { forward: true });
      return;
    }
    busy = true;
    const scope = mountMotion();
    wipeTo(document.getElementById("rv-wipe"), chapter, () => land(i, { forward: true, signal: scope.signal }), scope.signal)
      .catch(err => { land(i, { forward: true }); reportMotion(err); })
      .finally(() => { busy = false; });
  };

  // Back on the screen the reader was on when they switched language. Not
  // announced as an arrival: focus stays with the language button.
  const carried = carriedStep("weekly-review-form");
  if (carried !== null && carried > 0 && carried < STEPS.length) {
    current = carried;
    form.dataset.step = String(carried);
    STEPS.forEach((_, k) => page(k).classList.toggle("d-none", k !== carried));
  }

  const showEnding = (record, onContinue) => {
    const ending = document.getElementById("rv-ending");
    ending.innerHTML = endingMarkup(record);
    form.classList.add("d-none");
    hideError();
    ending.classList.remove("d-none");
    scrollIntoViewGently(container, { block: "start" });
    ending.querySelector("#rv-ending-title")?.focus({ preventScroll: true });
    ending.querySelector(".rv-continue")?.addEventListener("click", onContinue, { once: true });
    const scope = mountMotion();
    if (isReduced()) return;
    playEnding(ending, scope.signal).catch(reportMotion);
  };

  form.addEventListener("click", (e) => {
    if (busy) return;
    if (e.target.closest(".rv-next")) {
      const bad = checkStep(current);
      if (bad) document.getElementById(FIELD_IDS[bad])?.focus();
      else goForward(current + 1);
    } else if (e.target.closest(".rv-back")) {
      hideError();
      land(current - 1, { forward: false });
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    // Every screen, not only this one: an earlier screen could have been left
    // invalid. The first screen in error is shown, with its messages.
    for (let i = 0; i < STEPS.length; i++) {
      const bad = checkStep(i);
      if (!bad) continue;
      if (i !== current) land(i, { forward: false });
      checkStep(i);
      document.getElementById(FIELD_IDS[bad])?.focus();
      return;
    }

    const inputs = readFields(REVIEW_FIELDS);
    // Convert the baht box back to the stored rate BEFORE validation, so
    // validateProfile and submitWeeklyReview see the same savingsRate they
    // always have. Income is not a weekly-review field, so it comes from the
    // saved profile.
    inputs.savingsRate = savingsRateFrom(inputs.monthlySavings, stateManager.state.profile.income);
    if (!validateProfile(inputs).ok) {
      showError(t("Please fix the highlighted fields before continuing."));
      return;
    }
    const record = stateManager.submitWeeklyReview(inputs);
    // Already recorded this week, or the save was refused: nothing to
    // celebrate, and the app says why (a toast, or the storage warning).
    if (!record || record.persisted === false) {
      onComplete(record);
      return;
    }
    showEnding(record, () => onComplete(record));
  });
}
