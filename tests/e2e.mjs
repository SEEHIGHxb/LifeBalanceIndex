// E2E user flows — run in CI by .github/workflows/ci.yml, not by `node --test`.
//
// Deliberately named .mjs, not .test.mjs: the `tests/*.test.mjs` glob must not
// pick this up, because it needs a live server and a real browser.
//
// smoke.mjs proves the app boots; this proves the three flows a real user
// actually depends on still work end-to-end (finding #13e):
//   1. express onboarding  -> dashboard renders with a real baseline + radar average
//   2. weekly review       -> measured quantities land, pledges grade, points pay
//   3. EN -> TH toggle     -> persists across a full reload
//   4. share sheet         -> a real 1080x1920 PNG comes out and the controls
//                             actually change it. Flow 4 runs in Thai, because
//                             flow 3 leaves the app there, so it asserts on
//                             pixels and storage and never on English strings.
//   5. phone layout        -> at 375x812: no sideways pan, the tab bar stays
//                             put, no field small enough to make iOS zoom, no
//                             tap target under 44px, no radar label off the
//                             card, and the radar near the top of the page.
//   6. connected pre-fill  -> a payload written by a sibling app on this origin
//                             reaches the review, names its source, lands on the
//                             per-day unit, and stops the moment it is switched
//                             off
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

const readState = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem("lifequest_state") || "null"));

// --- FLOW 1: full onboarding -> dashboard ---
// Blank-first: nothing is pre-filled, every required field must be answered,
// and there is no express shortcut. Fill the whole form (all six steps, even the
// hidden ones), then walk each step and submit.
try {
  await page.goto(BASE, { waitUntil: "networkidle" });
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

  // Advance through steps 0..4, then submit on step 5. Each Next re-validates
  // the step, so a missed field would fail here rather than silently pass.
  for (let i = 0; i < 5; i++) {
    await page.click(`#onb-page-${i} .btn-onb-next`);
  }
  await page.click('#onboarding-form button[type="submit"]');

  await page.waitForSelector("#tab-dashboard", { timeout: 10000 });
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
  // The population-average overlay: a dashed polygon under the user's own.
  const avgPolygon = await page.$('#radar-chart-container polygon[stroke-dasharray="5,4"]');
  if (!avgPolygon) problems.push("flow1: radar is missing the dashed population-average polygon");
} catch (err) {
  problems.push(`flow1 (full onboarding): ${err.message}`);
}

// --- FLOW 2: weekly review -> measured values land, pledges grade, points pay ---
// Onboarding counts as this week's measurement, so backdate the baseline a
// week to make the review due, exactly as a returning user would find it.
try {
  const before = await readState();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString();
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#tab-review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });

  // The form is prefilled; only touch what changed this week.
  await page.fill("#rev-waterLiters", "2.5");
  await page.click('#weekly-review-form button[type="submit"]');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state") || "{}");
    return s.reviews && s.reviews.length > 0;
  }, { timeout: 5000 });
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
  await page.waitForSelector("#tab-dashboard", { timeout: 10000 });
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
  await page.click("#tab-dashboard");
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
  await page.click("#tab-dashboard");
  await page.waitForSelector("#radar-chart-container svg", { timeout: 10000 });

  // Nothing may force the page to pan sideways.
  const pans = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (pans) problems.push("flow5: the page scrolls horizontally at 375px");

  // The tab bar is fixed, so it must still be on screen at the very bottom of
  // a long page — that is the whole point of moving it there.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => {
    const el = document.querySelector(".nav-tabs");
    const r = el.getBoundingClientRect();
    return { position: getComputedStyle(el).position, top: r.top, bottom: r.bottom,
      onScreen: r.top < window.innerHeight && r.bottom > 0 };
  });
  if (nav.position !== "fixed") problems.push(`flow5: nav is ${nav.position}, expected fixed`);
  if (!nav.onScreen) problems.push("flow5: the tab bar scrolled off screen");

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
    document.querySelectorAll("button, a.btn, .tab-btn, .radio-option").forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.height < 44) out.push(`${el.className || el.tagName}:${Math.round(r.height)}px`);
    });
    return out;
  });
  if (smallTargets.length) {
    problems.push(`flow5: tap targets under 44px: ${smallTargets.slice(0, 5).join(", ")}`);
  }

  // The radar sets svg.style.overflow = "visible", so a label that does not fit
  // is not clipped by the SVG — it escapes and the screen edge cuts it off.
  // Three labels shipped that way before v45; assert on the drawn extent, not
  // the anchor, because the anchor was comfortably inside the whole time.
  const escaping = await page.evaluate(() => {
    const svg = document.querySelector("#radar-chart-container svg");
    const card = svg.closest(".card").getBoundingClientRect();
    return Array.from(svg.querySelectorAll("text")).map(t => {
      const r = t.getBoundingClientRect();
      return { txt: t.textContent, slack: Math.min(r.left - card.left, card.right - r.right) };
    }).filter(o => o.slack < 0).map(o => `${o.txt} (${Math.round(o.slack)}px)`);
  });
  if (escaping.length) {
    problems.push(`flow5: radar labels run outside the card: ${escaping.join(", ")}`);
  }

  // The redesign's purpose: your own data on the first screen, not behind a
  // wall of prompts. Before v45 the radar started 1800px down.
  const radarTop = await page.evaluate(() =>
    document.querySelector("#radar-chart-container").getBoundingClientRect().top + window.scrollY);
  if (radarTop > 1000) {
    problems.push(`flow5: the radar starts ${Math.round(radarTop)}px down; it should be near the top`);
  }
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
  await page.click("#tab-review");
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
  await page.click('#weekly-review-form button[type="submit"]');
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state") || "{}");
    return s.reviews && s.reviews.length > 0;
  }, { timeout: 5000 });
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
  await page.click("#tab-review");
  await page.waitForSelector("#weekly-review-form", { timeout: 10000 });
  const offChips = await page.$$("#weekly-review-form .prefill-chip");
  if (offChips.length) problems.push(`flow6: ${offChips.length} chip(s) survived switching the connection off`);
} catch (err) {
  problems.push(`flow6 (connected pre-fill): ${err.message}`);
}

await browser.close();

if (problems.length) {
  console.error("E2E FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("e2e passed: onboarding, the weekly review, TH persistence, the share card, the phone layout, and the connected pre-fill all work");
