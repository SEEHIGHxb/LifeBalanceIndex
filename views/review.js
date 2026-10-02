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
import { numberField, markField, FIELD_HINTS } from "./instrument-forms.js";
import { escapeHtml } from "./helpers.js";
import { savingsAmountFrom, savingsRateFrom } from "../scoring.js";
import {
  CONNECTION_SOURCES, SOURCE_NAMES, readConnection, readConnectionPrefs,
  connectionStatus, connectionPrefills, incomeDrifted
} from "../connections.js";
import { isoWeekKey, reviewWeekKey } from "../season.js";
import { mountMotion, writeMotionStyle } from "./motion-mount.js";
import { typedMarkup, typeIn, settleIn, onAbort, SPRITES, isQuietChapter } from "./stage.js";
import { stepperMarkup } from "./stepper.js";
import { endingMarkup, playEnding } from "./ending.js";
import { label } from "./stage-page.js";
import { chapterOf, dotDate, shiftSummary, motifThumb, biggestShift } from "./news.js";
import { goalTemplate } from "../goals.js";
import { animate, easeStar, isReduced } from "../motion.js";
import { carriedStep, isCarrying } from "./lang-carry.js";
import { applyDraft, saveDraft, clearDraft, readDraft } from "../draft.js";
import {
  learningMarkup, weekMarkup, donationMarkup, volunteerMarkup, tallyMarkup,
  bindActivityFields, syncActivityFields
} from "./activity-fields.js";

// The review's half-typed answers survive a reload under this draft name, for
// the week they were typed in only: last week's unfinished numbers are not
// this week's answers.
const DRAFT_KEY = "review";

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
// where a region has two screens. The old form's section headings went in
// v144: each only repeated the question above it (the owner's cut list).
export const REVIEW_STEPS = Object.freeze([
  { aspect: "finance", fields: ["monthlySavings"] },
  {
    aspect: "physical",
    fields: ["weeklyVigorousDays", "weeklyVigorousMins", "weeklyModerateDays", "weeklyModerateMins", "weeklyWalkingDays", "weeklyWalkingMins"]
  },
  {
    aspect: "physical", title: "And day to day: sleep, water, vegetables.",
    fields: ["sleepHours", "waterLiters", "vegetablePortions"]
  },
  { aspect: "personalGoals", fields: ["weeklyLearningHours"] },
  { aspect: "socialContribution", fields: ["monthlyDonations", "volunteeringHours"] },
  { aspect: "environment", fields: ["singleUsePlastics"] }
]);
const STEPS = REVIEW_STEPS;
export const REVIEW_FIELDS = Object.freeze(Object.keys(FIELD_IDS));

// The onboarding label strings are reused verbatim so the review form needs no
// new translations and the two forms can never phrase the same field two ways.
// The exercise and learning fields are not boxes: they are the journey's
// painted week and six-step question (views/activity-fields.js), pre-set to
// last week's answer.
const WEEK_KINDS = {
  vig: ["weeklyVigorousDays", "weeklyVigorousMins"],
  mod: ["weeklyModerateDays", "weeklyModerateMins"],
  walk: ["weeklyWalkingDays", "weeklyWalkingMins"]
};

const FIELD_LABELS = {
  sleepHours: "Sleep a night (hours)",
  waterLiters: "Water a day (litres)",
  vegetablePortions: "Vegetable portions a day",
  monthlySavings: "Monthly savings (baht)"
};

const FIELD_STEPS = { sleepHours: 0.5, waterLiters: 0.1 };

// Fields asked as everyday answers (views/activity-fields.js), each drawn from
// last week's value.
const EASY_FIELDS = {
  weeklyLearningHours: learningMarkup,
  monthlyDonations: donationMarkup,
  volunteeringHours: volunteerMarkup,
  singleUsePlastics: tallyMarkup
};

// The prototype's timings: the title types at this pace; the next region's
// photograph wipes up, holds, then wipes away (the ending's own timings are in
// views/ending.js).
const TYPE_MS_PER_CHAR = 32;
const WIPE_IN_MS = 560;
const WIPE_HOLD_MS = 260;
const WIPE_OUT_MS = 520;
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
    ? tp("From {app} · your runs for {from} – {to}. Add anything it couldn't see.", { app, from, to })
    : tp("From {app} · a typical month, measured over {from} – {to}.", { app, from, to });
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
    lines.push(t("Some answers come from your connected apps. Check them before you finish."));
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

// The painted week stands where the six exercise boxes stood: drawn once, at
// the first of them, from last week's answers or a connected app's.
function reviewWeek(profile, prefills) {
  const value = (field) => Object.hasOwn(prefills, field) ? prefills[field].value : profile[field] ?? 0;
  const ids = {};
  const current = {};
  for (const [kind, [days, mins]] of Object.entries(WEEK_KINDS)) {
    ids[kind] = { days: FIELD_IDS[days], mins: FIELD_IDS[mins] };
    current[kind] = { days: value(days), mins: value(mins) };
  }
  const pre = prefills.weeklyVigorousDays || prefills.weeklyVigorousMins;
  const note = pre ? `<span class="prefill-chip">${SOURCE_NAMES[pre.source]}</span> ${prefillNote(pre)}` : "";
  return weekMarkup("rev", ids, current, note);
}

function reviewField(field, profile, prefills = {}) {
  if (field === "weeklyVigorousDays") return reviewWeek(profile, prefills);
  if (Object.values(WEEK_KINDS).flat().includes(field)) return "";
  if (EASY_FIELDS[field]) return EASY_FIELDS[field](FIELD_IDS[field], profile[field] ?? 0, { fold: true });
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
  const note = pre ? prefillNote(pre) : (FIELD_HINTS[field] ? t(FIELD_HINTS[field]) : "");
  return numberField(
    FIELD_IDS[field],
    `${t(FIELD_LABELS[field])}${chip}`,
    pre ? pre.value : own,
    `min="${c.min}" max="${c.max}"${step}`,
    note ? { note } : {}
  );
}

// Focus the control a field in error is answered with: a painted or picked
// field's box is hidden, so its first visible choice takes the focus.
function focusField(id) {
  const box = document.getElementById(id);
  const target = box?.hidden
    ? box.closest(".survey-question, .easy-field")?.querySelector("input:not([hidden])")
    : box;
  target?.focus();
}

// The next review opens on the coming Sunday (v174): only asked while this
// week's is done, so on a Sunday it is the Sunday after.
export function nextReviewDate(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
  return next.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

// --- the screens --------------------------------------------------------------

// The box a pledge is graded from, where that is not the pledge's own field:
// the savings rate is worked out from the baht box, and the exercise pledges
// from the painted week, which stands at the first exercise box.
const PLEDGE_BOX = { savingsRate: "monthlySavings", "@exerciseDays": "weeklyVigorousDays", "@metMinutes": "weeklyVigorousDays" };

// v166: the pledges this screen's answers will grade, as on Overview, each
// starred if it was kept last week. No pledge here, nothing shown.
function pledgesMarkup(step, goals) {
  const cards = (goals || []).flatMap(goal => {
    const tmpl = goalTemplate(goal.templateId);
    if (!tmpl || !step.fields.includes(PLEDGE_BOX[tmpl.field] ?? tmpl.field)) return [];
    const kept = goal.lastResult?.met === true;
    const star = kept
      ? `<svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg>`
      : `<svg viewBox="0 0 24 24"><use href="${SPRITES}#star-line"/></svg>`;
    return [`
      <li class="rv-pledge${kept ? " is-kept" : ""}">
        <i class="rv-pledge-star" aria-hidden="true">${star}</i>
        <b>${escapeHtml(t(tmpl.title))}</b>
        <span>${tp(tmpl.desc, { target: escapeHtml(goal.target ?? tmpl.def) })}</span>
      </li>`];
  });
  if (!cards.length) return "";
  return `<div class="rv-pledges"><p class="label">${t("Your pledges")}</p><ul>${cards.join("")}</ul></div>`;
}

function stepMarkup(step, i, { box, intro, goals }) {
  const chapter = stepChapter(i);
  const last = i === STEPS.length - 1;
  const title = step.title ? t(step.title) : tp("How was {region} this week?", { region: chapter.region });
  const quiet = isQuietChapter(chapter) ? " data-quiet" : "";
  const progress = Math.round(((i + 1) / STEPS.length) * 100);
  // The phone shows the short word (css/weekly.css); a screen reader always
  // hears the long one.
  const submit = `<span class="pill-long">${t("Complete Weekly Review")}</span><span class="pill-short" aria-hidden="true">${t("Finish")}</span>`;
  return `
    <section class="survey-page rv-step${i ? " d-none" : ""}" id="rv-step-${i}" data-step="${i}"${quiet}
      style="--chapter-hue: ${chapter.hue}; --chapter-wash: ${chapter.wash};">
      <div class="q-split">
        <div class="q-side">
          <p class="label">(${escapeHtml(chapter.region)})</p>
          <img class="q-emblem" src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async">
          <p class="q-count sr-only">${escapeHtml(tp("Weekly Review · {i} / {n}", { i: i + 1, n: STEPS.length }))}</p>
          ${stepperMarkup(STEPS.map(st => st.aspect), i)}
          <span class="rv-progress" aria-hidden="true"><i style="width: ${progress}%;"></i></span>
        </div>
        <div class="q-main">
          <h3 class="q-title" tabindex="-1">${typedMarkup(title)}</h3>
          ${i === 0 ? intro : ""}
          <div class="rv-fields">${step.fields.map(box).join("")}</div>
          ${pledgesMarkup(step, goals)}
          <div class="onb-nav">
            ${i > 0 ? `<button type="button" class="btn btn-onb-prev rv-back">${t("Back")}</button>` : "<span></span>"}
            <div class="onb-nav-right">
              ${last
                ? `<button type="submit" class="btn btn-primary">${submit}</button>`
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
    <p class="onb-why">${t("Last week's answers are filled in. Change only what's different.")}</p>
    ${connectionBanner(conn, state.profile)}`;
  return `
    <div class="journey review">
      <div id="rv-resume" class="onb-resume d-none">
        <span>${t("Picked up where you left off.")}</span>
      </div>
      <form id="weekly-review-form" novalidate>
        ${STEPS.map((step, i) => stepMarkup(step, i, { box, intro, goals: state.goals })).join("")}
      </form>
      <p id="review-error" class="onboarding-error d-none" role="alert"></p>
      <section class="rv-ending d-none" id="rv-ending" aria-labelledby="rv-ending-title"></section>
      <div class="rv-wipe" id="rv-wipe" aria-hidden="true"></div>
    </div>`;
}

// A past review's pledges met and points, the pledges only when there were
// some: "0/0 pledges met" says nothing (the owner's cut list, v144).
export function pledgesAndPoints(r) {
  const points = tp("+{xp} points", { xp: r.xp });
  if (!r.goals.length) return points;
  return `${tp("{met}/{total} pledges met", { met: r.goals.filter(g => g.met).length, total: r.goals.length })} · ${points}`;
}

// This week, Monday to Sunday (v174, the owner: seven days, the review on
// Sunday, which is marked). The days gone are faint, today is ringed, the day
// of the latest review this week is starred. The line under it says the date in
// words, so the strip is not read out.
function weekStrip(reviews, now = new Date()) {
  const day = (k) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + k);
  const today = day((now.getDay() + 6) % 7).getTime();
  const last = reviews.length ? new Date(reviews.at(-1).date) : null;
  const doneDay = last && !Number.isNaN(last.getTime())
    ? new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()
    : null;
  const letter = new Intl.DateTimeFormat(dateLocale(), { weekday: "narrow" });
  const cells = Array.from({ length: 7 }, (_, k) => {
    const d = day(k);
    const at = d.getTime();
    const cls = [
      at < today && "is-past",
      at === today && "is-today",
      at === doneDay && "is-done",
      k === 6 && "is-next"
    ].filter(Boolean).join(" ");
    const star = at === doneDay
      ? `<svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg>`
      : "";
    return `<li${cls ? ` class="${cls}"` : ""}><span>${escapeHtml(letter.format(d))}</span><b>${d.getDate()}</b>${star}</li>`;
  }).join("");
  return `<ol class="rv-days" aria-hidden="true">${cells}</ol>`;
}

// One past review as a card in a sideways row (v166, where tall rows filled
// more than a screen): its date, the region that moved most, the shifts, and
// the pledges met and points.
function weekCard(r) {
  return `
    <li class="rv-week">
      <span class="rv-week-date">${escapeHtml(dotDate(r.date))}</span>
      ${motifThumb(biggestShift(r.shifts))}
      <b class="rv-week-title">${escapeHtml(shiftSummary(r.shifts))}</b>
      <span class="rv-week-sub">${escapeHtml(pledgesAndPoints(r))}</span>
    </li>`;
}

// The review is done for the week: the week so far, and the past reviews
// newest first, each with the region that moved most (v158).
function doneMarkup(state) {
  const reviews = state.reviews || [];
  const rows = reviews.slice(-PAST_ROWS).reverse().map(weekCard).join("");
  const checkin = stateManager.isCheckinDue() ? `
    <p class="rv-done-note">${t("Your monthly re-assessment is due.")}</p>
    <p class="rv-done-cta"><a class="pill" href="#/checkin">${t("Start Re-assessment")}</a></p>` : "";
  // No reviews yet: the journey was this week's measurement, and the first
  // review opens next Monday. "Reviewed this week." over an empty list said
  // otherwise.
  const first = !rows;
  const head = first
    ? tp("Your first review opens on {date}.", { date: nextReviewDate() })
    : t("Reviewed this week.");
  const note = first
    ? ""
    : `<p class="rv-done-note">${tp("Next review opens {date}.", { date: nextReviewDate() })}</p>`;
  return `
    <div class="stage-page review-done">
      <section class="panel news rv-done">
        <div class="wrap split news-block">
          <div class="news-side">${label(first ? t("Weekly Review") : t("Past Reviews"))}</div>
          <div>
            <h2 class="rv-done-head" id="rv-done-head" tabindex="-1">${head}</h2>
            ${weekStrip(reviews)}
            ${note}
            ${checkin}
            ${rows ? `<ul class="rv-weeks">${rows}</ul>` : ""}
            <p class="rv-done-links"><a class="pill" href="#/dashboard">${t("Overview")}</a></p>
          </div>
        </div>
      </section>
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
  // Each screen opens at the top of the page, under the header (v166: the
  // review scrolled itself to the top of its box, which the header covered,
  // and the list of screens sits there now).
  const toTop = () => scrollTo({ top: 0, behavior: isReduced() ? "instant" : "smooth" });
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
    const { errors } = validateProfile(readFields(fields), { required: fields });
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

  const week = reviewWeekKey(new Date());
  const save = () => saveDraft(DRAFT_KEY, form, { week, step: current });

  // Focus follows the screen, so a screen-reader user hears where they are.
  // Under a wipe the arrival shares the wipe's scope: a fresh mount here would
  // abort the wipe before its second half.
  const land =(i, { forward, signal = null }) => {
    current = i;
    // Published for views/lang-carry.js: a language switch re-renders the
    // review, and without this it came back on the first screen.
    form.dataset.step = String(i);
    // The screen is part of the draft, so a reload comes back to it. saveDraft
    // writes nothing until a box holds something, and every box is prefilled.
    save();
    STEPS.forEach((_, k) => page(k).classList.toggle("d-none", k !== i));
    toTop();
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

  // A draft from this week puts the typed numbers back over the prefills; one
  // from an earlier week is dropped. Only when the draft was actually saved
  // mid-review does it say so: after a language switch the reader never left.
  bindActivityFields(form);
  const draft = readDraft(DRAFT_KEY);
  let draftStep = null;
  if (draft && draft.week !== week) clearDraft(DRAFT_KEY);
  else if (draft) {
    // A draft records only the boxes that were ticked (days painted) and the
    // counts that were given (plastic), so one the reader cleared is absent
    // from it: last week's come off first, or the restore would leave them on.
    const painted = [...form.querySelectorAll(".wk-cell input:checked, .wk-none input:checked, .tally-item input:checked")];
    const counted = [...form.querySelectorAll(".tally-step input")].map(box => [box, box.value]);
    painted.forEach(box => { box.checked = false; });
    counted.forEach(([box]) => { box.value = ""; });
    const restored = applyDraft(DRAFT_KEY, form);
    if (!restored) {
      painted.forEach(box => { box.checked = true; });
      counted.forEach(([box, value]) => { box.value = value; });
    }
    if (restored) {
      syncActivityFields(form);
      draftStep = Number.isInteger(restored.step) ? restored.step : null;
      if (!isCarrying()) document.getElementById("rv-resume")?.classList.remove("d-none");
    }
  }
  form.addEventListener("input", save);
  form.addEventListener("change", save);

  // Back on the screen the reader was on when they switched language, or when
  // the draft was saved. Not announced as an arrival: focus stays put.
  const carried = carriedStep("weekly-review-form") ?? draftStep;
  if (carried !== null && carried > 0 && carried < STEPS.length) {
    current = carried;
    form.dataset.step = String(carried);
    STEPS.forEach((_, k) => page(k).classList.toggle("d-none", k !== carried));
  }

  const showEnding = (record, onContinue) => {
    const ending = document.getElementById("rv-ending");
    const met = record.goals.filter(g => g.met).length;
    ending.innerHTML = endingMarkup({
      title: t("Reviewed this week."),
      lines: [
        shiftSummary(record.shifts),
        record.goals.length && tp("{met}/{total} pledges met", { met, total: record.goals.length })
      ],
      xp: record.xp
    });
    form.classList.add("d-none");
    hideError();
    ending.classList.remove("d-none");
    toTop();
    ending.querySelector("#rv-ending-title")?.focus({ preventScroll: true });
    ending.querySelector(".rv-continue")?.addEventListener("click", onContinue, { once: true });
    const scope = mountMotion();
    if (isReduced()) return;
    playEnding(ending, STEPS.map(st => st.aspect), scope.signal).catch(reportMotion);
  };

  const next = () => {
    const bad = checkStep(current);
    if (bad) focusField(FIELD_IDS[bad]);
    else goForward(current + 1);
  };

  form.addEventListener("click", (e) => {
    if (busy) return;
    const jump = e.target.closest(".rv-jump");
    if (e.target.closest(".rv-next")) {
      next();
    } else if (e.target.closest(".rv-back")) {
      hideError();
      land(current - 1, { forward: false });
    } else if (jump) {
      // Only screens already answered are buttons, so going back to one needs
      // no check.
      hideError();
      land(Number(jump.dataset.to), { forward: false });
    }
  });

  // Enter in a box moves to the next screen, as the Next button would. Left to
  // the browser it submitted the whole review from the first screen, with
  // every later screen's prefills unseen.
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.matches("input")) return;
    e.preventDefault();
    if (busy) return;
    if (current < STEPS.length - 1) next();
    else form.requestSubmit();
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
      focusField(FIELD_IDS[bad]);
      return;
    }

    const inputs = readFields(REVIEW_FIELDS);
    // Convert the baht box back to the stored rate BEFORE validation, so
    // validateProfile and submitWeeklyReview see the same savingsRate they
    // always have. Income is not a weekly-review field, so it comes from the
    // saved profile.
    inputs.savingsRate = savingsRateFrom(inputs.monthlySavings, stateManager.state.profile.income);
    if (!validateProfile(inputs, { required: REVIEW_FIELDS }).ok) {
      showError(t("Please fix the highlighted fields before continuing."));
      return;
    }
    const record = stateManager.submitWeeklyReview(inputs);
    // Recorded, or refused because this week already was: either way the
    // draft is spent. A save the storage rejected keeps it for another try.
    if (!record || record.persisted !== false) clearDraft(DRAFT_KEY);
    // Already recorded this week, or the save was refused: nothing to
    // celebrate, and the app says why (a toast, or the storage warning).
    if (!record || record.persisted === false) {
      onComplete(record);
      return;
    }
    showEnding(record, () => onComplete(record));
  });
}
