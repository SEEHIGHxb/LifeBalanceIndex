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
//   4. The Still Water's ending wipes and bursts like any region: no region
//      is quiet since v161 (the owner, 2026-10-01).
//   5. Reduced motion (the device setting): not one style is written on a
//      moving piece of the journey or Home, no frame is ever asked for, and
//      Home's star stays put when tapped.
//   7. The weekly loop (R4): an aspect page's emblem bursts and comes home, and
//      so does The Commons' (v161); Goals' stickers stick on and settle;
//      the Weekly Review wipes the next region's photograph over and away,
//      and its ending lifts its curtain and bursts, leaving nothing parked.
//   6. Home: a tap on your star bursts sixteen stars and motifs and it comes
//      home; the pledge wall drifts with the scroll; the share card assembles
//      in its preview. Beside the care notice Home is calm (nothing typed,
//      the wall does not drift), but your star still warps to its page.
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
    // The painted week (views/activity-fields.js): a walk on Monday; its
    // length is answered with every other question.
    const day = document.querySelector('input[name="onb-walk-days-d0"]');
    day.checked = true;
    day.dispatchEvent(new Event("change", { bubbles: true }));
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
  // The sprite sheet draws. The footer's star steps aside on a phone (v155),
  // so it is shown for the reading and put back.
  const sheetDrawn = await page.evaluate(() => {
    const mark = document.querySelector(".footer-mark");
    if (mark) mark.style.display = "grid";
    const use = document.querySelector(".brand-star use");
    const drawn = !!use && use.getBBox().width > 0;
    if (mark) mark.style.display = "";
    return drawn;
  });
  if (!sheetDrawn) problems.push("sprites: the footer star did not draw");

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
  const water = await endingState(page);
  if (water.count !== "3 / 8") problems.push(`still water: the ending reads ${water.count}, not 3 / 8`);
  await advance(page, 760);
  const waterBurst = await endingState(page);
  if (!water.curtain && !water.particles && !waterBurst.particles) problems.push("still water: the ending neither wiped nor burst");
  await advance(page, 3500);
  const waterEnd = await endingState(page);
  if (waterEnd.particles || waterEnd.curtain) problems.push(`still water: pieces left behind (${waterEnd.particles} particles, curtain "${waterEnd.curtain}")`);
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
  // A tap on your star opens its own page (v135): the ground blooms out of
  // the star, the star arcs in, the regions shoot out along their rays (v136).
  await page.click(".home .star-hit");
  await page.waitForSelector(".star-page .sp-mark svg.shape", { timeout: 10000 });
  await advance(page, FRAME_MS * 3);
  const entering = await page.evaluate(() => ({
    star: document.querySelector(".star-page .sp-mark svg.shape").style.transform,
    bloom: document.querySelector(".star-page .sp-bloom").style.transform,
    night: document.querySelector(".star-page .sp-night").style.transform,
    label: document.querySelector(".star-page .sp-label-in")?.style.opacity
  }));
  if (!entering.star || !entering.bloom || !entering.night || entering.label !== "0") problems.push(`star page: the entrance did not play (${JSON.stringify(entering)})`);
  // The warp (v139): the star turns on its way, and gold streaks fly out.
  await advance(page, 300);
  const warp = await page.evaluate(() => ({
    spin: /rotate\(-?[1-9]/.test(document.querySelector(".star-page .sp-mark svg.shape").style.transform),
    streaks: [...document.querySelectorAll(".star-page .sp-streak")].filter(el => Number(el.style.opacity) > 0).length
  }));
  if (!warp.spin || warp.streaks < 6) problems.push(`star page: the warp did not play (${JSON.stringify(warp)})`);
  await advance(page, 2500);
  const moving = ".star-page .sp-mark svg, .star-page .sp-bloom, .star-page .sp-label-in, .star-page .sp-fade";
  const settled = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map(el => el.getAttribute("style")).filter(Boolean)
    .concat(document.querySelector(".sp-stage[data-blooming]") ? ["still blooming"] : []), moving);
  if (settled.length) problems.push(`star page: not settled after 2.5 s (${settled.join(" | ")})`);
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1);
  if (!fits) problems.push("star page: it does not fit the window");
  await page.click(".star-page .sp-back");
  await advance(page, FRAME_MS * 3);
  const leaving = await page.evaluate(() => document.querySelector(".star-page .sp-mark svg.shape")?.style.transform);
  if (!leaving) problems.push("star page: your star did not fly home");
  await advance(page, 1000);
  await page.waitForSelector(".home .home-star svg", { timeout: 10000 });
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
  const other = detail === "full" ? "character" : "full";
  await page.click(`.share-toggle[data-value="${other}"]`);
  await page.click(`.share-toggle[data-value="${detail}"]`);
  await page.waitForTimeout(100);
  if ((await preview()) !== endCard) problems.push("share card: the assembly did not end on the finished card");
  await context.close();
} catch (err) {
  problems.push(`home: ${err.message}`);
}

// ...and beside the care notice Home is calm: the headline is not parked for
// typing and the wall does not drift, but a tap on the star still warps into
// its page and flies home again (the owner, v140: "Full warp always").
try {
  const { context, page } = await openJourney(browser);
  await finishJourney(page);
  if (!(await page.locator(".care-banner").count())) throw new Error("this reader was meant to see the care notice");
  if ((await heroState(page)).hidden) problems.push("quiet home: text was parked for typing beside the care notice");
  await page.evaluate(() => document.querySelector(".home .wall")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(100);
  const drift = await page.evaluate(() => [...document.querySelectorAll(".home .wall-col")].map(c => c.style.transform).filter(Boolean));
  if (drift.length) problems.push("quiet home: the wall drifted beside the care notice");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(".home .star-hit");
  await page.waitForSelector(".star-page .sp-mark svg.shape", { timeout: 10000 });
  await advance(page, FRAME_MS * 3 + 300);
  const warp = await page.evaluate(() => ({
    night: !!document.querySelector(".star-page .sp-night").style.transform,
    spin: /rotate\(-?[1-9]/.test(document.querySelector(".star-page .sp-mark svg.shape").style.transform)
  }));
  if (!warp.night || !warp.spin) problems.push(`quiet home: the warp did not play beside the care notice (${JSON.stringify(warp)})`);
  await advance(page, 2500);
  await page.click(".star-page .sp-back");
  await advance(page, FRAME_MS * 3);
  if (!(await page.evaluate(() => document.querySelector(".star-page .sp-mark svg.shape")?.style.transform))) {
    problems.push("quiet home: your star did not fly home beside the care notice");
  }
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

  // A region page bursts nothing (v170, the owner): no tap on its emblem, and
  // opening the next region lands at its top with no particles.
  await openHash(page, "#/aspect/physical", ".aspect-page .page-top .mark img");
  if (await page.$(".aspect-page .page-top .mark-hit")) problems.push("aspect: the emblem still has a tap to burst");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.click(".aspect-page .next-pull");
  await page.waitForSelector('.aspect-page[data-aspect="mental"]', { timeout: 5000 });
  await advance(page, 2500);
  const nextTop = await page.evaluate(() => ({ y: scrollY, particles: document.querySelectorAll(".spr").length }));
  if (nextTop.y !== 0) problems.push(`aspect: the next region opened ${nextTop.y}px down, not at its top`);
  if (nextTop.particles) problems.push(`aspect: ${nextTop.particles} particles burst on the next region`);

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
  // The round "+" has no dot, before a hover and after it: the hover wraps
  // the label in .pill__in, which draws a dot of its own (the owner, v147).
  const addDot = () => page.evaluate(() => {
    const b = document.querySelector(".goals .cat-add");
    const inner = b.querySelector(".pill__in");
    return [getComputedStyle(b, "::after").content, inner ? getComputedStyle(inner, "::after").content : "none"];
  });
  if ((await addDot()).some(c => c !== "none")) problems.push("goals: the + button shows a dot");
  await page.hover(".goals .cat-add");
  await advance(page, 300);
  const hovered = await addDot();
  if (hovered.some(c => c !== "none")) problems.push(`goals: the + button shows a dot after a hover (${hovered.join(", ")})`);

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
  await openHash(page, "#/leaderboard", ".compare .duo-fig .sh-them");
  const shape = () => page.evaluate(() => [...document.querySelectorAll(".duo-fig .sh-them .sh-fill polygon")].map(p => p.getAttribute("points")).join(" | "));
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

  // Lumi is off for now (the owner, v157: app.js LUMI_ON): its star stays hidden.
  if (await page.isVisible("#btn-lumi")) problems.push("lumi: the header star shows while Lumi is off");
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
  await page.waitForSelector('#brand-home[href="#/welcome"]', { state: "attached", timeout: 10000 });
  await goTo(page, "quests");
  await goTo(page, "dashboard");
  await page.waitForSelector(".home .home-star svg", { timeout: 10000 });
  const parked = await heroState(page);
  if (parked.hidden) problems.push("reduced: Home parked its headline");
  await page.click(".home .star-hit");
  await page.waitForSelector(".star-page .sp-mark svg.shape", { timeout: 10000 });
  await advance(page, 400);
  const zoomed = await page.evaluate(() => [...document.querySelectorAll(".star-page .sp-mark svg, .star-page .sp-bloom, .star-page .sp-label-in, .star-page .sp-fade")].map(el => el.getAttribute("style")).filter(Boolean));
  if (zoomed.length) problems.push(`reduced: your star zoomed into its page (${zoomed.join(" | ")})`);
  // The review changes screen with no wipe at all.
  await reviewDue(page);
  await openHash(page, "#/review", "#rv-step-0:not(.d-none)");
  await page.click("#rv-step-0 .rv-next");
  const hop = await page.evaluate(() => ({
    step: document.querySelector(".rv-step:not(.d-none)")?.dataset.step,
    wipe: !!document.querySelector(".rv-wipe.on")
  }));
  if (hop.step !== "1" || hop.wipe) problems.push(`reduced: the review wiped or did not move on (screen ${hop.step})`);
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
console.log("moments e2e passed: the Landing's star bursts and comes home, every answer moves the same way, The Market wipes and bursts and lands, The Highlands types its name, The Still Water wipes and bursts too, Home's star warps into its own page and flies back (the care notice too), a region page bursts nothing and opens the next at its top, Goals' stickers stick on, the review wipes between regions and bursts at its end, Side by Side slides the picked star, Lumi stays off, and reduced motion moves nothing");
