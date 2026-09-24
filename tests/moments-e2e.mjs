// The Phase 3 moments in a real browser, with motion and with reduced motion.
// Run in CI by .github/workflows/ci.yml, not by `node --test` (it needs a live
// server and a real browser, which is why it is .mjs and not .test.mjs).
//
// Time is driven by hand: an init script installs globalThis.__lbiClock, the
// hook motion.js reads before falling back to requestAnimationFrame (the CSP
// blocks inline scripts, so this is the only way in). Every pose below is
// therefore read at an exact frame, which is what lets the neutral settle be
// compared frame for frame across two different answers.
//
//   0. Tug-the-ring on the landing: a real drag past the line bursts eight
//      glints and the ring springs home; the next screen does not offer it.
//   1. The neutral settle: choosing the lowest or the highest point on the
//      first item moves the ring marker identically, frame for frame.
//   2. The Market's ending: the ring reads 1 / 8, eight particles burst, the
//      cards are dealt, and afterwards nothing is left parked or on screen.
//   3. The Highlands' opening: every title letter starts hidden, and once the
//      title is spelled, the line typed and the caret home, nothing is left
//      parked.
//   4. The Still Water's ending: a quiet zone, so no burst at all.
//   5. Reduced motion (the device setting): no tug is offered, not one style
//      is written on the
//      ring, the region banner, the recap, the fact or a tab icon, and no
//      frame is ever asked for.
//
// Usage: node tests/moments-e2e.mjs <base-url>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8181";
const FRAME_MS = 16;
const SETTLE_FRAMES = 40;
const problems = [];

// Runs in the page before any module loads.
function installManualClock() {
  let now = 0;
  let queue = [];
  let requested = 0;
  globalThis.__lbiClock = {
    now: () => now,
    frame(cb) { requested += 1; queue.push(cb); }
  };
  globalThis.__framesRequested = () => requested;
  // One frame at a time, yielding a macrotask first so promise chains between
  // frames settle the way they do under requestAnimationFrame.
  globalThis.__advance = async (ms, step) => {
    for (let left = ms; left > 0; left -= step) {
      await new Promise(resolve => setTimeout(resolve, 0));
      now += Math.min(step, left);
      const due = queue;
      queue = [];
      for (const cb of due) cb(now);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  };
  // Every inline style write on a moving piece, for the reduced-motion check.
  globalThis.__styleWrites = [];
  const watch = () => new MutationObserver(records => {
    for (const r of records) {
      const el = r.target;
      if (el.closest?.(".journey-ring, .region-banner, .chapter-recap, .chapter-fact, .tab-btn")) {
        globalThis.__styleWrites.push(`${el.id || el.className?.baseVal || el.className}: ${el.getAttribute("style")}`);
      }
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"], subtree: true });
  if (document.documentElement) watch();
  else document.addEventListener("DOMContentLoaded", watch);
  // Layout shift from the moment it is reset (the art set: nothing may shift).
  globalThis.__shift = 0;
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) globalThis.__shift += e.value;
  }).observe({ type: "layout-shift" });
}

async function openJourney(browser, { reduced = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: reduced ? "reduce" : "no-preference"
  });
  const page = await context.newPage();
  page.on("pageerror", err => problems.push(`uncaught: ${err.message}`));
  page.on("console", msg => { if (msg.type() === "error") problems.push(`console.error: ${msg.text()}`); });
  await page.addInitScript(installManualClock);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("#onboarding-form", { timeout: 10000 });
  await page.fill("#onb-name", "Moments Runner");
  await page.evaluate(() => {
    document.querySelectorAll('#onboarding-form input[type="number"]').forEach(i => {
      i.value = i.min !== "" ? i.min : "1";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    document.querySelectorAll("#onboarding-form select").forEach(s => {
      const opt = Array.from(s.options).find(o => o.value !== "");
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });
  return { context, page };
}

const answerAll = (page) => page.evaluate(() => {
  document.querySelectorAll("#onboarding-form fieldset.survey-question").forEach(fs => {
    const r = fs.querySelector('input[type="radio"]');
    if (r && !fs.querySelector("input:checked")) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
  });
});
const next = (page) => page.click(".survey-page:not(.d-none) .btn-onb-next");
const advance = (page, ms) => page.evaluate(([m, s]) => globalThis.__advance(m, s), [ms, FRAME_MS]);
const visible = (page) => page.evaluate(() => {
  const el = document.querySelector(".survey-page:not(.d-none)");
  return { id: el.id, ending: el.classList.contains("survey-page-ending"), chapter: Number(el.dataset.chapter) };
});

async function walkToEnding(page, chapter) {
  for (let i = 0; i < 60; i++) {
    const at = await visible(page);
    if (at.ending && at.chapter === chapter) return true;
    await next(page);
  }
  return false;
}

// Reads the ending's pieces: particles on screen and any inline style left.
const endingState = (page) => page.evaluate(() => ({
  count: document.getElementById("ring-count").textContent,
  particles: document.querySelectorAll(".ring-particle").length,
  parked: [...document.querySelectorAll(
    ".survey-page:not(.d-none) .chapter-recap li, .survey-page:not(.d-none) .chapter-fact, .survey-page:not(.d-none) .chapter-emblem, #ring-marker, [id^='ring-lit-']"
  )].map(el => el.getAttribute("style")).filter(Boolean),
  emblem: (() => {
    const img = document.querySelector(".survey-page:not(.d-none) .chapter-emblem img");
    return img ? { loaded: img.complete && img.naturalWidth > 0, w: img.parentElement.getBoundingClientRect().width } : null;
  })()
}));

// A <use> into assets/sprites.svg that failed to resolve draws nothing.
const spriteDrawn = (page, selector) => page.evaluate((sel) => {
  const use = document.querySelector(`${sel} use`);
  return !!use && use.getBBox().width > 0;
}, selector);

const browser = await chromium.launch();

// --- 1. the neutral settle ------------------------------------------------------
try {
  const traces = [];
  for (const pick of ["first", "last"]) {
    const { context, page } = await openJourney(browser);
    await next(page); // prologue -> The Market's numbers
    await next(page); // -> the first instrument
    await advance(page, 2000); // let the Next settles finish
    const option = page.locator(".survey-page:not(.d-none) fieldset.survey-question").first().locator(".radio-option");
    await (pick === "first" ? option.first() : option.last()).click();
    const trace = [];
    for (let f = 0; f < SETTLE_FRAMES; f++) {
      trace.push(await page.evaluate(() => document.getElementById("ring-marker").style.transform));
      await advance(page, FRAME_MS);
    }
    traces.push(trace);
    await context.close();
  }
  if (!traces[0].some(Boolean)) problems.push("settle: answering an item did not move the ring marker at all");
  if (JSON.stringify(traces[0]) !== JSON.stringify(traces[1])) {
    problems.push("settle: the lowest and highest answers moved the marker differently (non-negotiable 1)");
  }
} catch (err) {
  problems.push(`settle: ${err.message}`);
}

// --- 0. tug-the-ring on the landing ---------------------------------------------
try {
  const { context, page } = await openJourney(browser);
  const box = await page.locator(".ring-tug").boundingBox();
  if (!box) throw new Error("the tug is not offered on the landing");
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy, { steps: 8 });
  await page.mouse.up();
  const snapped = await page.evaluate(() => ({
    parts: document.querySelectorAll(".ring-particle").length,
    body: document.querySelector(".ring-body").style.transform
  }));
  if (snapped.parts !== 8) problems.push(`tug: ${snapped.parts} particles past the line, not 8`);
  if (!snapped.body) problems.push("tug: the ring did not follow the drag");
  await advance(page, 2000);
  const home = await page.evaluate(() => ({
    parts: document.querySelectorAll(".ring-particle").length,
    body: document.querySelector(".ring-body").getAttribute("style") || ""
  }));
  if (home.parts || home.body) problems.push(`tug: not home after 2 s (${home.parts} particles, style "${home.body}")`);
  await next(page);
  if (await page.locator(".ring-tug").isVisible()) problems.push("tug: offered on a screen with instrument items nearby");
  await context.close();
} catch (err) {
  problems.push(`tug: ${err.message}`);
}

// --- 2 and 3. the endings, with motion -----------------------------------------------
try {
  const { context, page } = await openJourney(browser);
  await answerAll(page);
  if (!(await walkToEnding(page, 0))) throw new Error("never reached The Market's ending");
  const start = await endingState(page);
  if (start.count !== "1 / 8") problems.push(`market: the ending reads ${start.count}, not 1 / 8`);
  if (start.particles !== 8) problems.push(`market: ${start.particles} particles burst, not 8`);
  if (!start.parked.length) problems.push("market: nothing was parked, so nothing was dealt");
  await page.evaluate(() => { globalThis.__shift = 0; });
  await advance(page, 3500);
  const end = await endingState(page);
  if (end.particles) problems.push(`market: ${end.particles} particles left behind`);
  if (end.parked.length) problems.push(`market: pieces left parked: ${end.parked.join(" | ")}`);
  if (!end.emblem?.loaded) problems.push("market: the region's emblem did not load");
  if (end.emblem && Math.round(end.emblem.w) !== 96) problems.push(`market: the emblem is ${end.emblem.w}px wide, not 96`);
  const shifted = await page.evaluate(() => globalThis.__shift);
  if (shifted > 0) problems.push(`market: the ending shifted the layout (CLS ${shifted.toFixed(4)})`);
  if (!(await spriteDrawn(page, ".brand-star"))) problems.push("sprites: the header star did not draw");

  // The Highlands' first screen: its name is spelled and its line typed.
  await next(page);
  const bannerStyles = () => page.evaluate(() => [...document.querySelectorAll(
    ".survey-page:not(.d-none) .region-banner [style], #ring-marker[style]"
  )].map(el => el.getAttribute("style")).filter(Boolean));
  const opening = await page.evaluate(() => {
    const pg = document.querySelector(".survey-page:not(.d-none)");
    return {
      chapter: pg.dataset.chapter,
      hidden: [...pg.querySelectorAll(".region-banner-name .g-letter")].filter(el => el.style.opacity === "0").length,
      letters: pg.querySelectorAll(".region-banner-name .g-letter").length
    };
  });
  if (opening.chapter !== "1") problems.push(`opening: landed on chapter ${opening.chapter}, not The Highlands`);
  if (!opening.letters || opening.hidden !== opening.letters) {
    problems.push(`opening: ${opening.hidden} of ${opening.letters} title letters parked; all should start hidden`);
  }
  await advance(page, 7000);
  const leftover = await bannerStyles();
  if (leftover.length) problems.push(`opening: pieces left parked: ${leftover.slice(0, 3).join(" | ")}`);

  if (!(await walkToEnding(page, 2))) throw new Error("never reached The Still Water's ending");
  const quiet = await endingState(page);
  if (quiet.count !== "3 / 8") problems.push(`still water: the ending reads ${quiet.count}, not 3 / 8`);
  if (quiet.particles) problems.push(`still water: ${quiet.particles} particles burst in a quiet zone`);
  await advance(page, 3500);
  if ((await endingState(page)).parked.length) problems.push("still water: pieces left parked");
  await context.close();
} catch (err) {
  problems.push(`endings: ${err.message}`);
}

// --- 4. reduced motion ------------------------------------------------------------------
try {
  const { context, page } = await openJourney(browser, { reduced: true });
  if (await page.locator(".ring-tug").isVisible()) problems.push("reduced: the tug is offered with nothing to do");
  await answerAll(page);
  if (!(await walkToEnding(page, 0))) throw new Error("never reached The Market's ending");
  const at = await endingState(page);
  if (at.count !== "1 / 8") problems.push(`reduced: the ending reads ${at.count}, not 1 / 8`);
  if (at.particles) problems.push("reduced: a burst played");
  let walked = 0;
  while ((await page.locator(".survey-page:not(.d-none) .btn-onb-next").count()) && walked++ < 60) await next(page);
  await page.click('#onboarding-form button[type="submit"]');
  await page.waitForSelector("#tab-dashboard .tab-icon", { timeout: 10000 });
  for (const tab of ["#tab-dashboard", "#tab-review", "#tab-quests", "#tab-leaderboard"]) {
    if (!(await spriteDrawn(page, `${tab} .tab-icon`))) problems.push(`sprites: the ${tab} icon did not draw`);
  }
  await page.click("#tab-quests");
  await page.click("#tab-dashboard");
  const writes = await page.evaluate(() => globalThis.__styleWrites);
  if (writes.length) problems.push(`reduced: styles written on moving pieces: ${writes.slice(0, 4).join(" | ")}`);
  const frames = await page.evaluate(() => globalThis.__framesRequested());
  if (frames) problems.push(`reduced: ${frames} animation frames requested`);
  await context.close();
} catch (err) {
  problems.push(`reduced: ${err.message}`);
}

await browser.close();

if (problems.length) {
  console.error("MOMENTS E2E FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("moments e2e passed: the tug bursts and comes home, the settle ignores the answer, The Market bursts and lands, The Highlands spells its name, The Still Water stays quiet, and reduced motion moves nothing");
