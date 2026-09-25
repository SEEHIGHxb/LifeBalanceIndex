// E2E user flows — run in CI by .github/workflows/ci.yml, not by `node --test`.
//
// Deliberately named .mjs, not .test.mjs: the `tests/*.test.mjs` glob must not
// pick this up, because it needs a live server and a real browser.
//
// smoke.mjs proves the app boots; this proves the three flows a real user
// actually depends on still work end-to-end (finding #13e):
//   0. onboarding a11y     -> the error is announced, Next moves focus, and a
//                             resumed draft lands on its first blank screen
//   1. express onboarding  -> Home renders with a real baseline: your star,
//                             and every aspect's score beside its average
//   2. weekly review       -> measured quantities land, pledges grade, points pay
//   3. EN -> TH toggle     -> persists across a full reload
//   4. share sheet         -> a real 1080x1920 PNG comes out and the controls
//                             actually change it. Flow 4 runs in Thai, because
//                             flow 3 leaves the app there, so it asserts on
//                             pixels and storage and never on English strings.
//   5. phone layout        -> at 375x812: no sideways pan, the menu button
//                             stays in reach, no field small enough to make iOS zoom, no
//                             tap target under 44px, and your star and
//                             Balance Index on the first screen.
//   6. connected pre-fill  -> a payload written by a sibling app on this origin
//                             reaches the review, names its source, lands on the
//                             per-day unit, and stops the moment it is switched
//                             off
//   7. site menu           -> the burger opens it over an inert page, its
//                             letters start as stars and all land, Thai cells
//                             are whole graphemes, Escape closes it and hands
//                             focus back, and reduced motion shows the letters
//                             at once
//
// Usage: node tests/e2e.mjs <base-url>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8181";
const problems = [];

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("pageerror", err => problems.push(`uncaught: ${err.message}`));
page.on("console", msg => {
  if (msg.type() === "error") problems.push(`console.error: ${msg.text()}`);
});

// The app is navigated through the burger menu (redesign R1, which replaced the
// tab bar): open it, follow the route's link, and wait for it to close, which
// it does as the link is followed.
async function goTo(route) {
  await page.click("#btn-menu");
  await page.click(`#site-menu a[href="#/${route}"]`);
  await page.waitForSelector("body:not(.menu-open)", { state: "attached" });
  // The page slides back into place over 520ms; measuring before it lands
  // would read the half-moved page as a sideways overflow.
  // Polled with evaluate: the CSP blocks the string eval waitForFunction uses.
  for (let i = 0; i < 40; i++) {
    const still = await page.evaluate(() => getComputedStyle(document.getElementById("page")).transform !== "none");
    if (!still) return;
    await page.waitForTimeout(50);
  }
  throw new Error("the page never slid back after the menu closed");
}

// Onboarded: the wordmark leads to the dashboard once there is one (before
// that it leads to the Landing).
// The Weekly Review is one region per screen (redesign R4): fill what is on
// each screen as it comes up, press Next through the wipes, submit from the
// last, and leave the ending by its Continue button. `fill` maps input ids to
// values. Resolves once the review is saved and the done page is up.
async function walkReview(fill = {}) {
  const current = () => page.evaluate(() => document.querySelector(".rv-step:not(.d-none)")?.dataset.step);
  for (let guard = 0; guard < 12; guard++) {
    for (const [id, value] of Object.entries(fill)) {
      if (await page.isVisible(`#${id}`)) await page.fill(`#${id}`, value);
    }
    const next = page.locator(".rv-step:not(.d-none) .rv-next");
    if (!(await next.count())) break;
    const was = await current();
    await next.click();
    // Polled from here: waitForFunction with an argument trips the app's CSP.
    for (let t = 0; t < 100; t++) {
      const moved = (await current()) !== was;
      const wiping = await page.evaluate(() => !!document.querySelector(".rv-wipe.on"));
      if (moved && !wiping) break;
      await page.waitForTimeout(50);
    }
  }
  await page.click('#weekly-review-form button[type="submit"]');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state") || "{}");
    return s.reviews && s.reviews.length > 0;
  }, { timeout: 5000 });
  await page.waitForSelector("#rv-ending:not(.d-none) .rv-continue", { timeout: 5000 });
  await page.click("#rv-ending .rv-continue");
  await page.waitForSelector("#rv-done-head", { timeout: 5000 });
}

const ONBOARDED = '#brand-home[href="#/dashboard"]';

const readState = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem("lifequest_state") || "null"));

// --- FLOW L: the Landing (redesign R2) ---
// A first visit lands on the Landing, not in the assessment. It must fit a
// phone and a laptop in both languages, and its call to begin must open the
// journey with focus on the new page and the progress star in the header.
try {
  const ctxL = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pL = await ctxL.newPage();
  pL.on("pageerror", err => problems.push(`flowL uncaught: ${err.message}`));
  const pans = () => pL.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  await pL.goto(BASE, { waitUntil: "networkidle" });
  await pL.waitForSelector(".landing", { timeout: 10000 });
  if (await pL.$("#onboarding-form")) problems.push("flowL: a first visit opened the assessment, not the Landing");
  if (!(await pL.getAttribute(".hero .mark-hit", "aria-label"))) problems.push("flowL: the star's button has no name");
  if (await pans()) problems.push("flowL: the Landing scrolls sideways at 375px");
  await pL.click("#btn-lang");
  await pL.waitForSelector("html[lang='th'] .landing", { timeout: 10000 });
  if (await pans()) problems.push("flowL: the Thai Landing scrolls sideways at 375px");
  await pL.setViewportSize({ width: 1440, height: 900 });
  if (await pans()) problems.push("flowL: the Landing scrolls sideways at 1440px");
  await pL.click(".allprojects a");
  await pL.waitForSelector("#onboarding-form", { timeout: 10000 });
  const opened = await pL.evaluate(() => ({
    hash: location.hash,
    focus: document.activeElement?.id,
    pill: !document.getElementById("journey-progress").classList.contains("d-none"),
    count: document.getElementById("progress-count")?.textContent
  }));
  if (opened.hash !== "#/journey") problems.push(`flowL: the call to begin went to ${opened.hash}`);
  if (opened.focus !== "main-view") problems.push(`flowL: after beginning, focus is on #${opened.focus}, not the page`);
  if (!opened.pill || opened.count !== "0 / 8") problems.push(`flowL: the progress star is not showing 0 / 8 (${opened.count})`);
  await ctxL.close();
} catch (err) {
  problems.push(`flowL (Landing): ${err.message}`);
}

// --- FLOW 0: onboarding is usable without sight, and a resume is honest ---
// Own browser context, so its half-finished draft never leaks into flow 1.
//   a. The error line is announced: role="alert". It used to be a bare <p>.
//   b. Next moves focus to the new screen's heading. showScreen used to leave
//      focus on <body>, and #journey-status reads the same on every screen of a
//      chapter, so a screen-reader user heard nothing when the page changed.
//   c. A draft resumes at the first screen with anything unanswered, even when
//      it says it was further on -- and even when an earlier release wrote it.
//      Resuming onto the saved step alone could put the reader past blanks,
//      onto a chapter ending whose recap had nothing to recap.
try {
  const ctx0 = await browser.newContext();
  const p0 = await ctx0.newPage();
  p0.on("pageerror", err => problems.push(`flow0 uncaught: ${err.message}`));
  await p0.goto(`${BASE}/#/journey`, { waitUntil: "networkidle" });
  await p0.waitForSelector("#onboarding-form", { timeout: 10000 });

  if ((await p0.getAttribute("#onboarding-error", "role")) !== "alert") {
    problems.push('flow0: #onboarding-error is not role="alert", so a blocked Next is silent to a screen reader');
  }

  // Answer the prologue only.
  await p0.fill("#onb-name", "Resume Runner");
  await p0.evaluate(() => {
    const first = document.getElementById("onb-page-0");
    first.querySelectorAll('input[type="number"]').forEach(i => {
      i.value = i.min !== "" ? i.min : "1";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    first.querySelectorAll("select").forEach(s => {
      const opt = Array.from(s.options).find(o => o.value !== "");
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });
  await p0.click("#onb-page-0 .btn-onb-next");
  const focused = await p0.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, page: el?.closest(".survey-page")?.id };
  });
  if (focused.tag !== "H2" || focused.page !== "onb-page-1") {
    problems.push(`flow0: after Next, focus is on ${focused.tag} in ${focused.page}, not the heading of onb-page-1`);
  }

  // Claim the reader got to screen 12, from an older release, then reload.
  await p0.evaluate(() => {
    const key = "lifequest_draft_onboarding";
    const draft = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...draft, v: "1", step: 12 }));
  });
  await p0.reload({ waitUntil: "networkidle" });
  await p0.waitForSelector("#onboarding-form", { timeout: 10000 });
  const resumed = await p0.evaluate(() => ({
    page: document.querySelector(".survey-page:not(.d-none)")?.id,
    name: document.getElementById("onb-name").value,
    visibleErrors: Array.from(document.querySelectorAll(".survey-page:not(.d-none) .field-error"))
      .filter(e => !e.classList.contains("d-none")).length
  }));
  if (resumed.name !== "Resume Runner") {
    problems.push("flow0: a draft from an earlier release was discarded instead of restored");
  }
  if (resumed.page !== "onb-page-1") {
    problems.push(`flow0: resumed on ${resumed.page}; the first screen with anything unanswered is onb-page-1`);
  }
  if (resumed.visibleErrors > 0) {
    problems.push(`flow0: the resumed screen opened with ${resumed.visibleErrors} error message(s) the reader did nothing to earn`);
  }
  await ctx0.close();
} catch (err) {
  problems.push(`flow0 (onboarding focus and resume): ${err.message}`);
}

// --- FLOW 1: full onboarding -> dashboard ---
// Blank-first: nothing is pre-filled, every required field must be answered,
// and there is no express shortcut. Fill every screen at once, even the hidden
// ones, then walk the whole flow and submit.
try {
  await page.goto(`${BASE}/#/journey`, { waitUntil: "networkidle" });
  await page.waitForSelector("#onboarding-form", { timeout: 10000 });
  await page.fill("#onb-name", "E2E Runner");

  // Number inputs -> their min (a valid in-range value); dropdowns -> their
  // first real option; every survey question -> its first radio.
  await page.evaluate(() => {
    document.querySelectorAll('#onboarding-form input[type="number"]').forEach(i => {
      i.value = i.min !== "" ? i.min : "1";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    document.querySelectorAll("#onboarding-form select").forEach(s => {
      const opt = Array.from(s.options).find(o => o.value !== "");
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    document.querySelectorAll("#onboarding-form fieldset.survey-question").forEach(fs => {
      const r = fs.querySelector('input[type="radio"]');
      if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });

  // Walk every screen to the last one, then submit.
  //
  // THE SCREEN COUNT IS DELIBERATELY NOT WRITTEN DOWN HERE. This loop used to
  // read `for (let i = 0; i < 5; i++)` because onboarding was six pages. v81
  // made it thirty screens and the literal did not fail loudly: it walked five,
  // stopped in the middle of the assessment, and timed out waiting for a submit
  // button still hidden twenty-four screens away. Flows 2 through 6 then failed
  // with it, each reporting its own symptom ("null has no baseline",
  // "the dashboard never appeared"), so one stale number read as six unrelated
  // breakages. Walking until no Next remains cannot go stale.
  //
  // Each Next re-validates its own screen, so a missed field still fails here
  // rather than silently passing. The bound is a stuck-loop guard, not a screen
  // count -- if it is ever reached, the flow has stopped advancing and the
  // assertion below says so.
  let walked = 0;
  for (; walked < 200; walked++) {
    const next = page.locator(".survey-page:not(.d-none) .btn-onb-next");
    if ((await next.count()) === 0) break;
    await next.click();
  }
  if (walked >= 200) {
    problems.push("flow1: onboarding never reached its last screen — a Next click is not advancing");
  }
  // Proves the walk ended where the assessment ends rather than stalling on a
  // screen that happens to have no Next of its own.
  await page.waitForSelector('.survey-page:not(.d-none) button[type="submit"]', { timeout: 10000 });
  await page.click('#onboarding-form button[type="submit"]');

  await page.waitForSelector(ONBOARDED, { state: "attached", timeout: 10000 });
  const state = await readState();
  if (!state?.onboarded) problems.push("flow1: state not onboarded after completing the assessment");
  if (state?.profile?.name !== "E2E Runner") problems.push("flow1: profile name not saved");
  if (state?.profile?.assessmentComplete !== true) {
    problems.push("flow1: a completed baseline must be marked assessmentComplete=true");
  }
  if (!state?.baseline?.date) problems.push("flow1: no baseline captured");
  const dashboardText = await page.textContent("#main-view");
  if (!dashboardText || dashboardText.length < 100) {
    problems.push("flow1: dashboard rendered empty");
  }
  // Home: the top is the reader's own star, and every aspect
  // row carries the population average the old radar drew as a dashed line.
  const home = await page.evaluate(() => ({
    star: !!document.querySelector(".home .home-star svg polygon"),
    averages: document.querySelectorAll(".home .score-average").length
  }));
  if (!home.star) problems.push("flow1: Home is missing your star");
  if (home.averages !== 8) problems.push(`flow1: ${home.averages} aspect rows show the average, not 8`);
} catch (err) {
  problems.push(`flow1 (full onboarding): ${err.message}`);
}

// --- FLOW 2: weekly review -> measured values land, pledges grade, points pay ---
// Onboarding counts as this week's measurement, so backdate the baseline a
// week to make the review due, exactly as a returning user would find it.
// Reads the dashboard's birthday prompt by its dismiss button, which only that
// card renders — matching on prose would break the moment the copy is reworded.
const birthdayPromptShown = () =>
  page.evaluate(() => !!document.getElementById("birthday-prompt-dismiss"));

try {
  const before = await readState();

  // The birthday left onboarding, so it must not simply reappear on the first
  // dashboard — that would relocate the question rather than defer it. At this
  // point the user has onboarded and submitted nothing, so the prompt is gated.
  if (await birthdayPromptShown()) {
    problems.push("flow2: the birthday prompt fired before the first weekly review");
  }

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString();
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await goTo("review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });

  // The form is prefilled; only touch what changed this week.
  await walkReview({ "rev-waterLiters": "2.5" });
  // The 60+ points can trigger the level-up dialog; Escape dismisses it.
  await page.keyboard.press("Escape");

  const after = await readState();
  const review = after?.reviews?.[0];
  if (!/^\d{4}-W\d+$/.test(review?.week || "")) {
    problems.push(`flow2: review week key malformed (${review?.week})`);
  }
  if (review?.inputs?.waterLiters !== 2.5) problems.push("flow2: measured water intake not recorded");
  if (after?.profile?.waterLiters !== 2.5) problems.push("flow2: measured value did not land in the profile");
  const gained = (after?.profile?.lifetimeXp || 0) - (before?.profile?.lifetimeXp || 0);
  if (gained < 60) problems.push(`flow2: expected >=60 points from the review, got ${gained}`);
  const waterPledge = after?.goals?.find(g => g.templateId === "water");
  if (!waterPledge?.lastResult) {
    problems.push("flow2: water pledge was not graded by the review");
  } else if (waterPledge.lastResult.met !== true) {
    problems.push("flow2: 2.5 L/day must meet the 2 L/day default pledge");
  }

  // The other half of the gate: deferred is not the same as suppressed. With a
  // review on record the prompt has to actually arrive, or the birthday becomes
  // a question the app never asks and the level silently never advances.
  await goTo("dashboard");
  // The menu link is in the DOM the whole time, so waiting on it would wait for
  // nothing, and the check below would race renderDashboard (the old tab button
  // did exactly that).
  // This failed roughly one run in three, on this release AND on v77 (measured:
  // 2 of 4 on v77, 1 of 3 on HEAD), which is exactly the kind of intermittent
  // red that trains people to re-run CI instead of reading it.
  // Wait for a card the dashboard actually renders, then give the prompt its own
  // bounded wait so a genuine absence still fails the flow.
  await page.waitForSelector(".home-top .balance-index", { timeout: 10000 });
  const birthdayArrived = await page
    .waitForSelector("#birthday-prompt-dismiss", { timeout: 5000 })
    .then(() => true, () => false);
  if (!birthdayArrived) {
    problems.push("flow2: the birthday prompt never arrived after the first weekly review");
  }
} catch (err) {
  problems.push(`flow2 (weekly review): ${err.message}`);
}

// --- FLOW 3: EN -> TH language toggle persists across reload ---
try {
  await page.click("#btn-lang");
  const lang = await page.evaluate(() => localStorage.getItem("lifequest_lang"));
  if (lang !== "th") problems.push(`flow3: toggle stored "${lang}", expected "th"`);
  const thaiBefore = await page.evaluate(() => /[฀-๿]/.test(document.body.innerText));
  if (!thaiBefore) problems.push("flow3: no Thai text rendered after toggle");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(ONBOARDED, { state: "attached", timeout: 10000 });
  const thaiAfter = await page.evaluate(() => /[฀-๿]/.test(document.body.innerText));
  if (!thaiAfter) problems.push("flow3: Thai did not survive the reload");
  const persisted = await page.evaluate(() => localStorage.getItem("lifequest_lang"));
  if (persisted !== "th") problems.push("flow3: language choice lost on reload");
} catch (err) {
  problems.push(`flow3 (language persistence): ${err.message}`);
}

// --- FLOW 4: the share sheet produces a real story image ---
// Asserts on the exported pixels rather than on any string, both because the
// app is in Thai by this point and because "the PNG is real and responds to
// the controls" is the thing that would actually break.
try {
  const dataUrl = () => page.evaluate(() =>
    document.getElementById("share-preview").toDataURL("image/png"));

  // Earlier flows leave the app on another route, and flow 3's reload preserves
  // the hash — so come back to the dashboard before looking for its controls.
  await goTo("dashboard");
  await page.waitForSelector("#btn-share-radar", { timeout: 10000 });
  await page.click("#btn-share-radar");
  await page.waitForSelector("#share-preview", { timeout: 10000 });

  const dims = await page.evaluate(() => {
    const c = document.getElementById("share-preview");
    return { w: c.width, h: c.height };
  });
  if (dims.w !== 1080 || dims.h !== 1920) {
    problems.push(`flow4: preview is ${dims.w}x${dims.h}, expected 1080x1920`);
  }

  // A blank canvas still encodes to a valid PNG, so size is the cheap proof
  // that something was actually painted onto it.
  const bytes = await page.evaluate(async () => {
    const c = document.getElementById("share-preview");
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    return blob ? blob.size : 0;
  });
  if (bytes < 5000) problems.push(`flow4: exported PNG is only ${bytes} bytes — likely blank`);

  // Each control must visibly change the image. waitForFunction doubles as the
  // wait and the assertion, so a control that silently does nothing times out.
  const beforeDetail = await dataUrl();
  await page.click('.share-toggle[data-value="full"]');
  await page.waitForFunction(
    prev => document.getElementById("share-preview").toDataURL("image/png") !== prev,
    beforeDetail, { timeout: 5000 }
  );

  const beforeTheme = await dataUrl();
  await page.click('.share-toggle[data-value="navy"]');
  await page.waitForFunction(
    prev => document.getElementById("share-preview").toDataURL("image/png") !== prev,
    beforeTheme, { timeout: 5000 }
  );

  // Preferences live outside the app's own save, so an erase cannot clear them
  // and no schema migration was needed to add them.
  const prefs = await page.evaluate(() => localStorage.getItem("lifequest_share_prefs"));
  const parsed = JSON.parse(prefs || "{}");
  if (parsed.detail !== "full" || parsed.theme !== "navy") {
    problems.push(`flow4: share prefs stored ${prefs}, expected detail=full theme=navy`);
  }

  await page.click("#share-close");
  const stillOpen = await page.evaluate(() => !!document.getElementById("share-preview"));
  if (stillOpen) problems.push("flow4: the share sheet did not close");
} catch (err) {
  problems.push(`flow4 (share sheet): ${err.message}`);
}

// --- FLOW 5: the phone layout holds up ---
// Guards the v45 mobile redesign. Every assertion here is a defect that was
// actually measured on a 375x812 screen before the redesign, so this is a
// regression test in the strict sense rather than a wish list:
//   - inputs at 15.2px, which makes iOS Safari zoom the page on every focus
//   - tap targets at 19-37px against a 44px standard
//   - navigation that scrolled away on a 5.6-screen page
//   - radar axis labels rendering past the left edge of the screen
try {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await goTo("dashboard");
  await page.waitForSelector(".home .home-star svg", { timeout: 10000 });

  // Nothing may force the page to pan sideways.
  const pans = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (pans) problems.push("flow5: the page scrolls horizontally at 375px");

  // Navigation must stay in reach on a long page: the header, and the menu
  // button in it, are sticky, so they are still on screen at the very bottom.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => {
    const r = document.getElementById("btn-menu").getBoundingClientRect();
    return { position: getComputedStyle(document.getElementById("site-header")).position,
      onScreen: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  if (nav.position !== "sticky") problems.push(`flow5: the header is ${nav.position}, expected sticky`);
  if (!nav.onScreen) problems.push("flow5: the menu button scrolled off screen");

  // 16px is a hard iOS threshold, not a preference: 15.9px still zooms.
  // Radios and checkboxes are exempt — they open no keyboard.
  const smallFields = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el.type === "radio" || el.type === "checkbox" || el.type === "hidden") return;
      if (!el.getBoundingClientRect().height) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.push(`${el.id || el.type}:${fs}px`);
    });
    return out;
  });
  if (smallFields.length) {
    problems.push(`flow5: fields under 16px will make iOS zoom: ${smallFields.join(", ")}`);
  }

  // Tap targets. A radio's own box is small by design; the label wrapping it is
  // the thing a thumb actually hits, so measure that instead.
  const smallTargets = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("button, a.btn, .radio-option").forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.height < 44) out.push(`${el.className || el.tagName}:${Math.round(r.height)}px`);
    });
    return out;
  });
  if (smallTargets.length) {
    problems.push(`flow5: tap targets under 44px: ${smallTargets.slice(0, 5).join(", ")}`);
  }

  // Your own data on the first screen, not behind a wall of prompts (before
  // v45 the radar started 1800px down). Home's hero is your star with the
  // Balance Index under it. The one thing allowed above it is the care notice
  // (this flow's answers cross the screening cutoff), so the hero must follow
  // the notice, or the header when there is none, directly, and hold the
  // Balance Index within one screen of its top.
  const fold = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    const hero = box(".home .home-top");
    const above = box(".home .notice-panel") || box("#site-header");
    return { gap: hero.top - above.bottom, index: box(".home .balance-index-value").bottom - hero.top };
  });
  if (fold.gap > 8) problems.push(`flow5: ${Math.round(fold.gap)}px of something sits between the notice or header and your star`);
  if (fold.index > 812 - 80) problems.push(`flow5: the Balance Index is ${Math.round(fold.index)}px into the hero, past one screen`);
} catch (err) {
  problems.push(`flow5 (mobile layout): ${err.message}`);
}

// --- FLOW 6: a connected app pre-fills the weekly review ---
// The unit suite proves the rules; this proves the wiring — that a payload
// written by another page on this origin actually reaches the form, carries its
// source, and lands on the PER-DAY unit. 102 minutes over 3 days must appear as
// 34, the defect this whole feature was most likely to ship with.
//
// Runs in Thai (flow 3 left it there) and at 375px (flow 5), so it asserts on
// input values and the chip — "Runaway" is a proper noun, identical in both
// languages and taken from our own constant, never from the payload.
try {
  await page.evaluate(() => {
    // Unpadded, matching season.js isoWeekKey — "2026-W3", not "2026-W03". A
    // padded key still matches the reader's regex and then compares unequal, so
    // seeding one here would make this flow fail for nine weeks a year.
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const week = Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);

    // Local calendar dates: toISOString() would report yesterday for an evening
    // east of Greenwich, and the window would not contain the day it describes.
    const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() || 7) - 1));

    localStorage.setItem("lifequest_connections", JSON.stringify({ midori: false, runaway: true }));
    localStorage.setItem("lbi_bridge_runaway", JSON.stringify({
      v: 1,
      source: "runaway",
      writtenAt: now.toISOString(),
      window: { isoWeek: `${d.getUTCFullYear()}-W${week}`, from: iso(monday), to: iso(now) },
      facts: { activeDays: 3, totalMinutes: 102, minutesPerActiveDay: 34, runsWithoutDuration: 1 }
    }));
  });

  // Flow 2 already submitted this week's review, so clear it and back-date the
  // baseline the same way flow 2 did — otherwise the form is not due.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.reviews = [];
    s.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString();
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await goTo("review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });

  const days = await page.inputValue("#rev-weeklyVigorousDays");
  const mins = await page.inputValue("#rev-weeklyVigorousMins");
  if (days !== "3") problems.push(`flow6: vigorous days pre-filled "${days}", expected "3"`);
  if (mins !== "34") {
    problems.push(`flow6: vigorous minutes pre-filled "${mins}", expected "34" — 102 min over 3 days is PER DAY`);
  }

  // The source must be visible on the boxes it filled, and only on those.
  const chips = await page.evaluate(() => Array.from(
    document.querySelectorAll("#weekly-review-form .prefill-chip"),
    el => `${el.closest("label")?.getAttribute("for") || "?"}:${el.textContent.trim()}`
  ).sort());
  const expected = ["rev-weeklyVigorousDays:Runaway", "rev-weeklyVigorousMins:Runaway"];
  if (JSON.stringify(chips) !== JSON.stringify(expected)) {
    problems.push(`flow6: source chips were ${JSON.stringify(chips)}, expected ${JSON.stringify(expected)}`);
  }

  // Running is vigorous by definition; a runner who also walks keeps their own
  // answer rather than having it overwritten.
  const walking = await page.inputValue("#rev-weeklyWalkingMins");
  const walkingChip = await page.$("#weekly-review-form label[for='rev-weeklyWalkingMins'] .prefill-chip");
  if (walkingChip) problems.push("flow6: the walking box must never be pre-filled from a run log");

  // Submitting must still go through the ordinary gate: the answer is the
  // user's, so it lands in the profile and the review exactly like a typed one.
  await walkReview();
  await page.keyboard.press("Escape");

  const after = await readState();
  if (after?.profile?.weeklyVigorousDays !== 3 || after?.profile?.weeklyVigorousMins !== 34) {
    problems.push(`flow6: pre-filled values did not land in the profile (${after?.profile?.weeklyVigorousDays} days, ${after?.profile?.weeklyVigorousMins} min)`);
  }
  if (String(after?.profile?.weeklyWalkingMins ?? "") !== walking) {
    problems.push("flow6: submitting a pre-filled review changed the walking answer");
  }

  // Switching the connection off must stop the pre-fill immediately.
  await page.evaluate(() => {
    localStorage.setItem("lifequest_connections", JSON.stringify({ midori: false, runaway: false }));
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.reviews = [];
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await goTo("review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });
  const offChips = await page.$$("#weekly-review-form .prefill-chip");
  if (offChips.length) problems.push(`flow6: ${offChips.length} chip(s) survived switching the connection off`);
} catch (err) {
  problems.push(`flow6 (connected pre-fill): ${err.message}`);
}

// --- FLOW 7: the site menu (redesign R1) ---
// Runs in Thai at 375px, where flows 5 and 6 left the app, so it asserts on
// state and structure rather than on English strings.
try {
  const menuState = () => page.evaluate(() => ({
    expanded: document.getElementById("btn-menu").getAttribute("aria-expanded"),
    hidden: document.getElementById("site-menu").getAttribute("aria-hidden"),
    inert: document.getElementById("page").hasAttribute("inert"),
    stars: document.querySelectorAll("#site-menu .ch.hid").length,
    inMenu: !!document.activeElement?.closest("#site-menu"),
    focus: document.activeElement?.id || ""
  }));
  await page.click("#btn-menu");
  const opened = await menuState();
  if (opened.expanded !== "true" || opened.hidden !== "false") {
    problems.push(`flow7: the menu did not open (aria-expanded ${opened.expanded}, aria-hidden ${opened.hidden})`);
  }
  if (!opened.inert) problems.push("flow7: the page behind the open menu is not inert");
  if (!opened.inMenu) problems.push("flow7: focus did not move into the open menu");
  if (!opened.stars) problems.push("flow7: the menu's letters did not start as stars");
  // Every line lands by 1040ms.
  await page.waitForTimeout(1300);
  const landed = await menuState();
  if (landed.stars) problems.push(`flow7: ${landed.stars} letters were still stars after the reveal`);
  // A Thai vowel or tone mark alone in a cell means the text was split by code
  // unit, not by grapheme.
  const orphans = await page.evaluate(() => [...document.querySelectorAll("#site-menu .ch")]
    .filter(c => /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(c.textContent)).length);
  if (orphans) problems.push(`flow7: ${orphans} menu cells start with a Thai mark`);
  await page.keyboard.press("Escape");
  const closed = await menuState();
  if (closed.expanded !== "false" || closed.inert) problems.push("flow7: Escape did not close the menu");
  if (closed.focus !== "btn-menu") problems.push(`flow7: after Escape focus is on #${closed.focus}, not the menu button`);
  // Reduced motion: the letters are simply there.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click("#btn-menu");
  const reduced = await menuState();
  if (reduced.stars) problems.push(`flow7: with reduced motion ${reduced.stars} letters started as stars`);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
} catch (err) {
  problems.push(`flow7 (site menu): ${err.message}`);
}

await browser.close();

if (problems.length) {
  console.error("E2E FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("e2e passed: the Landing, onboarding, the weekly review, TH persistence, the share card, the phone layout, the connected pre-fill, and the site menu all work");
