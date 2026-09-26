// The moments in a real browser, with motion and with reduced motion: the
// redesign's Landing and journey (R2) and Home (R3). Run in CI by .github/workflows/ci.yml, not by `node --test`
// (it needs a live server and a real browser, which is why it is .mjs).
//
// Time is driven by hand: an init script installs globalThis.__lbiClock, the
// hook motion.js reads before falling back to requestAnimationFrame (the CSP
// blocks inline scripts, so this is the only way in). Every pose below is
// therefore read at an exact frame.
//
//   0. The Landing's star: a tap bursts sixteen stars and motifs and the
//      lockup springs home, leaving no style behind.
//   1. The same for every answer: choosing the lowest or the highest point on
//      the first item writes no style on any item, and the next item's
//      answers rise the same way.
//   2. The Market's ending: the star reads 1 / 8, the photograph wipes up,
//      sixteen particles burst, and afterwards nothing is left parked.
//   3. The Highlands' first screen: every letter of its title starts hidden
//      and all have typed in by the end, the emblem settled.
//   4. The Still Water's ending: a quiet region, so no wipe and no burst.
//   5. Reduced motion (the device setting): not one style is written on a
//      moving piece of the journey or Home, no frame is ever asked for, and
//      Home's star stays put when tapped.
//   7. The weekly loop (R4): an aspect page's emblem bursts and comes home, and
//      a quiet region's page does not; Goals' stickers stick on and settle;
//      the Weekly Review wipes the next region's photograph over and away,
//      and its ending lifts its curtain and bursts, leaving nothing parked.
//   6. Home: a tap on your star bursts sixteen stars and motifs and it comes
//      home; the pledge wall drifts with the scroll; the share card assembles
//      in its preview. Beside the care notice Home is still: nothing typed,
//      nothing burst, nothing moved.
//
// The art set: the ending's emblem loads without a layout shift, and the
// sprite sheet's star really draws.
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
      if (el.closest?.(".q-side, .q-title, .ending-photo, .burst-layer, .chapter-recap, .chapter-fact, .hero, .region-card, .photoband, .wall, .pledge-list, .rv-wipe, .rv-ending, .lumi")) {
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
  await page.goto(`${BASE}/#/journey`, { waitUntil: "networkidle" });
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

// The first option everywhere, unless `last` names instruments to answer with
// their last option instead (a calm reader: WHO-5 high, so no care notice).
const answerAll = (page, { last = [] } = {}) => page.evaluate((lastKeys) => {
  document.querySelectorAll("#onboarding-form fieldset.survey-question").forEach(fs => {
    const radios = [...fs.querySelectorAll('input[type="radio"]')];
    const key = (radios[0]?.name || "").split("-q")[0];
    const r = lastKeys.includes(key) ? radios.at(-1) : radios[0];
    if (r && !fs.querySelector("input:checked")) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
  });
}, last);
const next = (page) => page.click(".survey-page:not(.d-none) .btn-onb-next");
const advance = (page, ms) => page.evaluate(([m, s]) => globalThis.__advance(m, s), [ms, FRAME_MS]);
const visible = (page) => page.evaluate(() => {
  const el = document.querySelector(".survey-page:not(.d-none)");
  return { id: el.id, ending: el.classList.contains("survey-page-ending"), chapter: Number(el.dataset.chapter) };
});

// The burger menu replaced the tab bar (redesign R1): open it and follow a link.
async function goTo(page, route) {
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

async function walkToEnding(page, chapter) {
  for (let i = 0; i < 60; i++) {
    const at = await visible(page);
    if (at.ending && at.chapter === chapter) return true;
    await next(page);
  }
  return false;
}

// Reads the ending's pieces: particles on screen and any inline style left.
const endingState = (page) => page.evaluate(() => {
  const pg = document.querySelector(".survey-page:not(.d-none)");
  const img = pg.querySelector(".ending-emblem");
  return {
    count: document.getElementById("progress-count").textContent,
    particles: pg.querySelectorAll(".burst-layer .spr").length,
    curtain: pg.querySelector(".ending-curtain")?.getAttribute("style") || "",
    parked: [...pg.querySelectorAll(".ending-photo [style], .chapter-recap [style], .chapter-fact[style]")]
      .map(el => el.getAttribute("style")).filter(Boolean),
    emblem: img ? { loaded: img.complete && img.naturalWidth > 0, w: img.getBoundingClientRect().width } : null
  };
});

// A <use> into assets/sprites.svg that failed to resolve draws nothing.
const spriteDrawn = (page, selector) => page.evaluate((sel) => {
  const use = document.querySelector(`${sel} use`);
  return !!use && use.getBBox().width > 0;
}, selector);

const browser = await chromium.launch();

// --- 0. the Landing's star ----------------------------------------------------------
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", err => problems.push(`landing uncaught: ${err.message}`));
  await page.addInitScript(installManualClock);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".landing .mark-hit", { timeout: 10000 });
  await page.click(".landing .mark-hit");
  await advance(page, FRAME_MS * 3);
  const flying = await page.evaluate(() => document.querySelectorAll(".hero .spr").length);
  if (flying !== 16) problems.push(`landing: ${flying} particles burst from the star, not 16`);
  await advance(page, 2500);
  const home = await page.evaluate(() => ({
    parts: document.querySelectorAll(".hero .spr").length,
    styled: [...document.querySelectorAll(".hero .lockup, .hero .part")].map(el => el.style.transform).filter(Boolean)
  }));
  if (home.parts || home.styled.length) {
    problems.push(`landing: not home after 2.5 s (${home.parts} particles, ${home.styled.join(" | ")})`);
  }
  await context.close();
} catch (err) {
  problems.push(`landing: ${err.message}`);
}

// --- 1. the same for every answer -------------------------------------------------------
try {
  const seen = [];
  for (const pick of ["first", "last"]) {
    const { context, page } = await openJourney(browser);
    await next(page); // prologue -> The Market's numbers
    await next(page); // -> the first instrument
    await advance(page, 2000);
    const option = page.locator(".survey-page:not(.d-none) fieldset.survey-question").first().locator(".radio-option");
    await (pick === "first" ? option.first() : option.last()).click();
    await advance(page, 200);
    seen.push(await page.evaluate(() => {
      const pg = document.querySelector(".survey-page:not(.d-none)");
      const live = pg.querySelector("fieldset.survey-question:not(.q-answered):not(.q-pending)");
      const cs = (o) => getComputedStyle(o);
      return {
        styled: pg.querySelectorAll("fieldset.survey-question [style], fieldset.survey-question[style]").length,
        rise: live ? [...live.querySelectorAll(".radio-option")].map(o => `${cs(o).animationName} ${cs(o).animationDelay}`) : []
      };
    }));
    await context.close();
  }
  if (seen.some(x => x.styled)) problems.push("answers: a style was written on an item");
  if (!seen[0].rise.length || !seen[0].rise.every(r => r.startsWith("pill-rise"))) {
    problems.push(`answers: the next item's answers did not rise (${seen[0].rise[0]})`);
  }
  if (JSON.stringify(seen[0]) !== JSON.stringify(seen[1])) {
    problems.push("answers: the lowest and highest answers moved things differently (non-negotiable 1)");
  }
} catch (err) {
  problems.push(`answers: ${err.message}`);
}

// --- 2 and 3. the endings, with motion -----------------------------------------------
try {
  const { context, page } = await openJourney(browser);
  await answerAll(page);
  if (!(await walkToEnding(page, 0))) throw new Error("never reached The Market's ending");
  const start = await endingState(page);
  if (start.count !== "1 / 8") problems.push(`market: the ending reads ${start.count}, not 1 / 8`);
  if (!/scaleY/.test(start.curtain)) problems.push("market: the photograph did not start covered for its wipe");
  await page.evaluate(() => { globalThis.__shift = 0; });
  await advance(page, 760);
  const bursting = await endingState(page);
  if (bursting.particles !== 16) problems.push(`market: ${bursting.particles} particles burst after the wipe, not 16`);
  await advance(page, 3000);
  const end = await endingState(page);
  if (end.particles) problems.push(`market: ${end.particles} particles left behind`);
  if (end.curtain || end.parked.length) problems.push(`market: pieces left parked: ${[end.curtain, ...end.parked].join(" | ")}`);
  if (!end.emblem?.loaded) problems.push("market: the region's emblem did not load");
  const shifted = await page.evaluate(() => globalThis.__shift);
  if (shifted > 0) problems.push(`market: the ending shifted the layout (CLS ${shifted.toFixed(4)})`);
  if (!(await spriteDrawn(page, ".brand-star"))) problems.push("sprites: the footer star did not draw");

  // The Highlands' first screen: its title types in and its emblem settles.
  await next(page);
  const typing = () => page.evaluate(() => {
    const pg = document.querySelector(".survey-page:not(.d-none)");
    return {
      chapter: pg.dataset.chapter,
      off: pg.querySelectorAll(".q-title .tc.off").length,
      letters: pg.querySelectorAll(".q-title .tc").length,
      emblem: pg.querySelector(".q-emblem")?.getAttribute("style") || ""
    };
  });
  const opening = await typing();
  if (opening.chapter !== "1") problems.push(`opening: landed on chapter ${opening.chapter}, not The Highlands`);
  if (!opening.letters || opening.off !== opening.letters) {
    problems.push(`opening: ${opening.off} of ${opening.letters} title letters hidden; all should start hidden`);
  }
  await advance(page, 4000);
  const typed = await typing();
  if (typed.off || typed.emblem) problems.push(`opening: left parked (${typed.off} letters hidden, emblem "${typed.emblem}")`);

  if (!(await walkToEnding(page, 2))) throw new Error("never reached The Still Water's ending");
  const quiet = await endingState(page);
  if (quiet.count !== "3 / 8") problems.push(`still water: the ending reads ${quiet.count}, not 3 / 8`);
  if (quiet.particles || quiet.curtain) {
    problems.push(`still water: a quiet region moved (${quiet.particles} particles, curtain "${quiet.curtain}")`);
  }
  await advance(page, 3500);
  if ((await endingState(page)).particles) problems.push("still water: a burst played in a quiet region");
  await context.close();
} catch (err) {
  problems.push(`endings: ${err.message}`);
}

// --- 6. Home: your star plays, and beside the care notice nothing moves -------------
const finishJourney = async (page, answers) => {
  await answerAll(page, answers);
  let walked = 0;
  while ((await page.locator(".survey-page:not(.d-none) .btn-onb-next").count()) && walked++ < 60) await next(page);
  await page.click('#onboarding-form button[type="submit"]');
  await page.waitForSelector(".home .home-star svg", { timeout: 10000 });
};
const heroState = (page) => page.evaluate(() => ({
  particles: document.querySelectorAll(".home .home-top .spr").length,
  styled: [...document.querySelectorAll(".home .home-star, .home .home-star-mark")].map(el => el.style.transform).filter(Boolean),
  hidden: document.querySelectorAll(".home .tc.off").length
}));
try {
  const { context, page } = await openJourney(browser);
  await finishJourney(page, { last: ["who5"] });
  if (await page.locator(".care-banner").count()) throw new Error("the calm reader was shown the care notice");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(".home .star-hit");
  await advance(page, FRAME_MS * 3);
  const tapped = await heroState(page);
  if (tapped.particles !== 16) problems.push(`home: ${tapped.particles} particles burst from your star, not 16`);
  await advance(page, 2500);
  const home = await heroState(page);
  if (home.particles || home.styled.length) problems.push(`home: your star did not come home (${home.particles} particles, ${home.styled.join(" | ")})`);
  // The pledge wall drifts with the scroll, and only then.
  await page.evaluate(() => document.querySelector(".home .wall")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(100);
  const drift = await page.evaluate(() => [...document.querySelectorAll(".home .wall-col")].map(c => c.style.transform));
  if (!drift.length) problems.push("home: the default pledges drew no wall");
  else if (!drift.some(Boolean)) problems.push("home: the wall did not move with the scroll");
  // Leaving Home puts every moving piece back.
  await goTo(page, "quests");
  await goTo(page, "dashboard");
  if ((await heroState(page)).styled.length) problems.push("home: a redraw kept your star's old pose");

  // The share card assembles as the map, in the preview only, and ends on the
  // finished card: the same pixels a plain redraw gives.
  const framesBefore = await page.evaluate(() => globalThis.__framesRequested());
  await page.click("#btn-share-radar");
  await page.waitForSelector("#share-preview");
  const preview = () => page.evaluate(() => document.getElementById("share-preview").toDataURL("image/png"));
  let midCard = null;
  for (let i = 0; i < 50 && !midCard; i++) {
    await page.waitForTimeout(50);
    // The assembly asks for its first frame once the fonts are ready; step in.
    if (await page.evaluate((n) => globalThis.__framesRequested() > n, framesBefore)) {
      await advance(page, 400);
      midCard = await preview();
    }
  }
  await advance(page, 1200);
  const endCard = await preview();
  if (!midCard || midCard === endCard) problems.push("share card: the preview did not assemble");
  const detail = await page.evaluate(() => document.querySelector('.share-toggle[data-group="detail"][aria-pressed="true"]').dataset.value);
  const other = detail === "full" ? "names" : "full";
  await page.click(`.share-toggle[data-value="${other}"]`);
  await page.click(`.share-toggle[data-value="${detail}"]`);
  await page.waitForTimeout(100);
  if ((await preview()) !== endCard) problems.push("share card: the assembly did not end on the finished card");
  await context.close();
} catch (err) {
  problems.push(`home: ${err.message}`);
}

// ...and beside the care notice Home is still: the headline is not parked for
// typing, and a tap on the star bursts nothing and moves nothing.
try {
  const { context, page } = await openJourney(browser);
  await finishJourney(page);
  if (!(await page.locator(".care-banner").count())) throw new Error("this reader was meant to see the care notice");
  if ((await heroState(page)).hidden) problems.push("quiet home: text was parked for typing beside the care notice");
  await page.click(".home .star-hit");
  let moved = 0;
  for (let f = 0; f < 120; f++) {
    await advance(page, FRAME_MS);
    const st = await heroState(page);
    moved = Math.max(moved, st.particles + st.styled.length);
  }
  if (moved) problems.push("quiet home: the star moved or burst beside the care notice");
  await context.close();
} catch (err) {
  problems.push(`quiet home: ${err.message}`);
}

// --- 7. the weekly loop -----------------------------------------------------------------
// Makes this week's review due: a baseline from last week and no review yet.
const reviewDue = async (page) => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    s.baseline.date = new Date(Date.now() - 8 * 86400000).toISOString();
    s.reviews = [];
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
};
const openHash = async (page, hash, selector) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
};
const pieceState = (page, root) => page.evaluate((r) => ({
  particles: document.querySelectorAll(`${r} .spr`).length,
  styled: [...document.querySelectorAll(`${r} .lockup, ${r} .part, ${r} .pledge-sticker i, ${r} .rv-ending-curtain, .rv-wipe-window, .rv-wipe-window b`)]
    .map(el => el.getAttribute("style") || "").filter(Boolean)
}), root);
try {
  const { context, page } = await openJourney(browser);
  await finishJourney(page, { last: ["who5"] });

  // An aspect page: its emblem bursts its region's motifs and comes home.
  await openHash(page, "#/aspect/physical", ".aspect-page .page-top .mark img");
  await page.click(".aspect-page .mark-hit");
  await advance(page, FRAME_MS * 3);
  const tapped = await pieceState(page, ".aspect-page");
  if (tapped.particles !== 16) problems.push(`aspect: ${tapped.particles} particles burst from the emblem, not 16`);
  await advance(page, 2500);
  const rested = await pieceState(page, ".aspect-page");
  if (rested.particles || rested.styled.length) problems.push(`aspect: the emblem did not come home (${rested.styled.join(" | ")})`);
  // A quiet region's page is still.
  await openHash(page, "#/aspect/relationships", ".aspect-page .page-top .mark img");
  await page.click(".aspect-page .mark-hit");
  await advance(page, 400);
  const hush = await pieceState(page, ".aspect-page");
  if (hush.particles || hush.styled.length) problems.push("aspect: The Commons' page moved or burst");

  // Goals: the stickers stick on when the list comes into view, then settle.
  await openHash(page, "#/quests", ".goals .pledge-list .pledge");
  await page.evaluate(() => document.querySelector(".goals .pledge-list").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(150);
  await advance(page, FRAME_MS * 4);
  const sticking = await pieceState(page, ".goals");
  if (!sticking.styled.length) problems.push("goals: no sticker stuck on");
  await advance(page, 3000);
  const stuck = await pieceState(page, ".goals");
  if (stuck.styled.length) problems.push(`goals: stickers left mid-motion: ${stuck.styled.slice(0, 3).join(" | ")}`);

  // The Weekly Review: the next region's photograph wipes over and away.
  await reviewDue(page);
  await openHash(page, "#/review", "#rv-step-0:not(.d-none)");
  await page.click("#rv-step-0 .rv-next");
  await advance(page, 300);
  const wiping = await page.evaluate(() => ({
    on: !!document.querySelector(".rv-wipe.on"),
    photo: !!document.querySelector(".rv-wipe-window b")?.style.backgroundImage
  }));
  if (!wiping.on || !wiping.photo) problems.push("review: the next region's photograph did not wipe over");
  await advance(page, 2500);
  const landed = await page.evaluate(() => ({
    step: document.querySelector(".rv-step:not(.d-none)")?.dataset.step,
    wipe: !!document.querySelector(".rv-wipe.on") || !!document.querySelector(".rv-wipe").children.length
  }));
  if (landed.step !== "1" || landed.wipe) problems.push(`review: after the wipe, screen ${landed.step}, wipe left: ${landed.wipe}`);
  // Through the rest, then the ending: the curtain lifts and the regions burst.
  for (let i = 0; i < 8 && (await page.locator(".rv-step:not(.d-none) .rv-next").count()); i++) {
    await page.click(".rv-step:not(.d-none) .rv-next");
    await advance(page, 2500);
  }
  await page.click('#weekly-review-form button[type="submit"]');
  await advance(page, FRAME_MS * 3);
  const lifting = await pieceState(page, "#rv-ending");
  if (!lifting.styled.length) problems.push("review: the ending's curtain did not lift");
  let burstMax = 0;
  for (let f = 0; f < 90; f++) {
    await advance(page, FRAME_MS);
    burstMax = Math.max(burstMax, (await pieceState(page, "#rv-ending")).particles);
  }
  if (!burstMax) problems.push("review: the ending burst nothing");
  await advance(page, 3000);
  const ended = await pieceState(page, "#rv-ending");
  if (ended.particles || ended.styled.length) problems.push(`review: the ending left pieces behind (${ended.particles} particles)`);
  await page.click("#rv-ending .rv-continue");
  await page.waitForSelector("#rv-done-head", { timeout: 5000 });
  await context.close();
} catch (err) {
  problems.push(`weekly loop: ${err.message}`);
}

// --- 8. the rest of the map ---------------------------------------------------------------
const lumiState = (page) => page.evaluate(() => {
  const panel = document.getElementById("lumi-panel");
  return {
    open: !panel.hidden,
    styled: panel.getAttribute("style") || "",
    hidden: panel.querySelectorAll(".lumi-tip .tc.off").length
  };
});
try {
  const { context, page } = await openJourney(browser);
  await finishJourney(page, { last: ["who5"] });

  // Side by Side: the picked person's star slides into the new shape.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("lifequest_state"));
    const at = (v) => Object.fromEntries(Object.keys(s.aspects).map(k => [k, v]));
    s.friends = [{ id: "f1", name: "Nok", aspects: at(20) }, { id: "f2", name: "Ton", aspects: at(90) }, { id: "f3", name: "Mai", aspects: at(50) }];
    localStorage.setItem("lifequest_state", JSON.stringify(s));
  });
  await page.reload({ waitUntil: "networkidle" });
  await openHash(page, "#/leaderboard", ".compare .duo-them");
  const shape = () => page.evaluate(() => [...document.querySelectorAll(".duo-them polygon")].map(p => p.getAttribute("points")).join(" | "));
  const from = await shape();
  await page.click('.people [data-pick="1"]');
  await advance(page, 200);
  const mid = await shape();
  await advance(page, 1000);
  const to = await shape();
  await advance(page, 500);
  if (mid === from || mid === to) problems.push("side by side: the picked star did not slide between shapes");
  if (to === from || (await shape()) !== to) problems.push("side by side: the picked star did not settle on its new shape");

  // Removing someone before the picked person keeps that person picked.
  await page.click('[data-friend-id="f1"]');
  await page.click('[data-confirm-remove="f1"]');
  const picked = await page.evaluate(() => document.querySelector('.people [aria-checked="true"]')?.textContent);
  if (picked !== "Ton") problems.push(`side by side: removing Nok moved the pick to ${picked}`);

  // Lumi: the panel settles in and the tip types itself, then both rest.
  await page.click("#btn-lumi");
  await advance(page, FRAME_MS * 3);
  const arriving = await lumiState(page);
  if (!arriving.open || !arriving.styled || !arriving.hidden) problems.push(`lumi: the panel did not settle in and type (${JSON.stringify(arriving)})`);
  await advance(page, 6000);
  const rested = await lumiState(page);
  if (rested.styled || rested.hidden) problems.push(`lumi: the panel was left mid-motion (${JSON.stringify(rested)})`);
  await page.keyboard.press("Escape");
  if ((await lumiState(page)).open) problems.push("lumi: Escape did not close the panel");
  await context.close();
} catch (err) {
  problems.push(`rest of the map: ${err.message}`);
}

// --- 4. reduced motion ------------------------------------------------------------------
try {
  const { context, page } = await openJourney(browser, { reduced: true });
  await answerAll(page);
  if (!(await walkToEnding(page, 0))) throw new Error("never reached The Market's ending");
  const at = await endingState(page);
  if (at.count !== "1 / 8") problems.push(`reduced: the ending reads ${at.count}, not 1 / 8`);
  if (at.particles) problems.push("reduced: a burst played");
  let walked = 0;
  while ((await page.locator(".survey-page:not(.d-none) .btn-onb-next").count()) && walked++ < 60) await next(page);
  await page.click('#onboarding-form button[type="submit"]');
  // Onboarded: the wordmark becomes a link home only once there is a home.
  await page.waitForSelector('#brand-home[href="#/dashboard"]', { state: "attached", timeout: 10000 });
  await goTo(page, "quests");
  await goTo(page, "dashboard");
  await page.waitForSelector(".home .home-star svg", { timeout: 10000 });
  await page.click(".home .star-hit");
  await advance(page, 400);
  const still = await heroState(page);
  if (still.particles || still.styled.length || still.hidden) problems.push("reduced: Home moved (a burst, a pose or a parked headline)");
  // The review changes screen with no wipe at all.
  await reviewDue(page);
  await openHash(page, "#/review", "#rv-step-0:not(.d-none)");
  await page.click("#rv-step-0 .rv-next");
  const hop = await page.evaluate(() => ({
    step: document.querySelector(".rv-step:not(.d-none)")?.dataset.step,
    wipe: !!document.querySelector(".rv-wipe.on")
  }));
  if (hop.step !== "1" || hop.wipe) problems.push(`reduced: the review wiped or did not move on (screen ${hop.step})`);
  // Lumi's panel is simply there, the tip whole.
  await page.click("#btn-lumi");
  const lumi = await lumiState(page);
  if (!lumi.open || lumi.styled || lumi.hidden) problems.push(`reduced: Lumi's panel moved or typed (${JSON.stringify(lumi)})`);
  await page.keyboard.press("Escape");
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
console.log("moments e2e passed: the Landing's star bursts and comes home, every answer moves the same way, The Market wipes and bursts and lands, The Highlands types its name, The Still Water stays still, Home's star bursts and comes home (and stays still beside the care notice), an aspect page bursts and The Commons' does not, Goals' stickers stick on, the review wipes between regions and bursts at its end, Side by Side slides the picked star, Lumi's panel settles and types, and reduced motion moves nothing");
