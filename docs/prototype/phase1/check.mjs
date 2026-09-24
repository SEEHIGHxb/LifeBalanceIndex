// Phase 1 numeric motion checks (docs/interactive-web-plan.md §6, exit criteria).
//
//   node docs/prototype/phase1/check.mjs http://127.0.0.1:8181
//
// Time is driven by hand: addInitScript installs a manual clock before
// proto.js loads (the page's CSP blocks any inline injection), and every check
// advances it explicitly. The frame-budget check is the one exception: it runs
// on the real clock under a 4x CPU throttle, because that is what it measures.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const origin = (process.argv[2] ?? "http://127.0.0.1:8181").replace(/\/$/, "");
const PAGE_URL = `${origin}/docs/prototype/phase1/`;
const PHONE = { width: 375, height: 812 };
const SCORES = [55, 62, 71, 48, 70, 44, 58, 51];
const RADAR_C = [180, 165];
const RADAR_R = 100;

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
};

function installManualClock() {
  let now = 0;
  const queue = [];
  window.__protoClock = {
    now: () => now,
    frame: (cb) => {
      queue.push(cb);
      return queue.length;
    }
  };
  // A real frame lets microtasks drain before the next one, so code after an
  // `await animate(...)` runs between frames. A plain synchronous loop would
  // stall every chained step until the whole advance returned; yielding a
  // macrotask per frame keeps the manual clock faithful to rAF.
  window.__advance = async (ms, step = 1000 / 60) => {
    const end = now + ms;
    while (now < end - 1e-9) {
      now = Math.min(end, now + step);
      for (const cb of queue.splice(0)) cb(now);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return now;
  };
}

async function newPage(browser, { reduce = false, manual = true } = {}) {
  const context = await browser.newContext({
    viewport: PHONE,
    reducedMotion: reduce ? "reduce" : "no-preference"
  });
  if (manual) await context.addInitScript(installManualClock);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { context, page, errors };
}

async function open(page, scene) {
  await page.goto(`${PAGE_URL}#${scene}`);
  await page.waitForFunction((name) => window.__proto?.scene === name, scene);
}

const advance = (page, ms) => page.evaluate((n) => window.__advance(n), ms);
const probe = (page, fn) => page.evaluate(fn);

// translate(Xpx, Ypx) out of an inline transform.
const translateOf = (t) => {
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(t || "");
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};

async function ringCentre(page) {
  const box = await page.locator("#tug-ring").boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

async function pull(page, dx, steps = 10) {
  const [x, y] = await ringCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps });
}

const radarRadii = (page) => probe(page, () =>
  window.__proto.radarPoints.map(([x, y]) => Math.hypot(x - 180, y - 165)));

// --- 1. tug-the-ring ---------------------------------------------------------

async function checkTugPull(page) {
  // A pull short of the line: follows with resistance, no burst, springs home.
  await pull(page, 40);
  const short = await probe(page, () => ({ ...window.__proto.tugPos, bursts: window.__proto.bursts.length }));
  check("tug: a 40 px pull moves the ring less than the finger (rubber band)",
    short.x > 10 && short.x < 40, `ring at ${short.x.toFixed(1)} px`);
  check("tug: no burst short of 90 px", short.bursts === 0);
  await page.mouse.up();
  let settleMs = 0;
  while (settleMs < 3000 && !(await probe(page, () => window.__proto.done.tugHome))) {
    await advance(page, 50);
    settleMs += 50;
  }
  check("tug: springs home within 1 s", settleMs <= 1000, `${settleMs} ms`);
}

async function checkTugSnap(page) {
  // A pull past the line: snaps, bursts, and never travels past the reach.
  let maxReach = 0;
  const [x, y] = await ringCentre(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let d = 10; d <= 120; d += 10) {
    await page.mouse.move(x + d, y);
    const reach = await probe(page, () => Math.hypot(window.__proto.tugPos.x, window.__proto.tugPos.y));
    maxReach = Math.max(maxReach, reach);
  }
  await page.mouse.up();
  check("tug: the ring never travels more than 60 px", maxReach <= 60.01, `max ${maxReach.toFixed(1)} px`);

  const b = await probe(page, () => window.__proto.bursts.at(-1));
  check("tug: snapping past 90 px fires one burst", b && !b.reduced);
  if (!b) return;
  const angles = b.particles.map((p) => p.angle).join(",");
  check("burst: 8 particles on the star angles, in radar order", angles === "0,45,90,135,180,225,270,315", angles);
  check("burst: half glints, half dots", b.particles.filter((p) => p.glint).length === 4);
  const dists = b.particles.map((p) => p.dist);
  check("burst: every travel distance is 70-110 px",
    dists.every((d) => d >= 70 && d <= 110), dists.map((d) => d.toFixed(0)).join(","));

  await advance(page, 400);
  const mid = await probe(page, () => [...document.querySelectorAll("#tug-burst .particle")].map((el) => el.style.transform));
  const midDist = mid.map((t) => Math.hypot(...translateOf(t)));
  check("burst: at half-life every particle is 60-100 % of its way out",
    mid.length === 8 && midDist.every((d, i) => d >= 0.6 * dists[i] && d <= dists[i] + 0.01),
    midDist.map((d) => d.toFixed(0)).join(","));
  await advance(page, 450);
  const left = await probe(page, () => document.querySelectorAll("#tug-burst .particle").length);
  check("burst: particles are removed after their 800 ms life", left === 0, `${left} left`);
}

async function checkTug(browser) {
  const { context, page, errors } = await newPage(browser);
  await open(page, "tug");
  // A scene hash that matched an element id focused (and scrolled to) that
  // element on every tab switch; the ring loaded wearing its focus outline.
  const focused = await probe(page, () => document.activeElement?.id || document.activeElement?.tagName);
  check("tug: nothing is focused on load (scene hashes name no element)", focused === "BODY", focused);
  await checkTugPull(page);
  await checkTugSnap(page);

  // The tap and keyboard forms reach the same toy (non-negotiable 6).
  const before = await probe(page, () => window.__proto.bursts.length);
  const [cx, cy] = await ringCentre(page);
  await page.mouse.click(cx, cy);
  await page.focus("#tug-ring");
  await page.keyboard.press("Enter");
  const after = await probe(page, () => window.__proto.bursts.length);
  check("tug: a tap and Enter each fire a burst", after - before === 2, `${after - before} bursts`);

  check("tug: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// --- 2. chapter ending -------------------------------------------------------------

// Steps the clock in 10 ms slices and logs when each piece first shows.
async function timeEnding(page) {
  const seen = { cards: [] };
  for (let t = 10; t <= 3500; t += 10) {
    await advance(page, 10);
    const snap = await probe(page, () => ({
      count: document.getElementById("end-count").textContent,
      cards: [...document.querySelectorAll("#end-recap .card, #end-fact")].map((el) => Number(el.style.opacity || 1)),
      done: window.__proto.done.ending
    }));
    if (snap.count === "1 / 8" && seen.count === undefined) seen.count = t;
    snap.cards.forEach((o, i) => { if (o > 0 && seen.cards[i] === undefined) seen.cards[i] = t; });
    if (snap.done) {
      seen.done = t;
      break;
    }
  }
  return seen;
}

async function checkEnding(browser) {
  const { context, page, errors } = await newPage(browser);
  await open(page, "ending");

  const start = await probe(page, () => ({
    cards: [...document.querySelectorAll("#end-recap .card, #end-fact")].map((el) => el.style.opacity),
    count: document.getElementById("end-count").textContent
  }));
  check("ending: nothing is dealt before the region lights", start.cards.every((o) => o === "0"), start.cards.join(","));
  check("ending: the count reads 0 / 8 until the arc is full", start.count === "0 / 8", start.count);

  const seen = await timeEnding(page);
  const order = seen.cards;
  const gaps = order.slice(1).map((v, i) => v - order[i]);
  check("ending: the count turns to 1 / 8 when the arc is full (~600 ms)",
    seen.count >= 590 && seen.count <= 620, `${seen.count} ms`);
  check("ending: recap cards are dealt one by one, 170 ms apart",
    gaps.length === 3 && gaps.every((g) => Math.abs(g - 170) <= 10), `first seen at ${order.join(", ")} ms`);
  check("ending: the fact card is dealt last", order.at(-1) === Math.max(...order));
  check("ending: the fact card flips after it lands, and the scene completes",
    seen.done !== undefined && seen.done >= order.at(-1) + 460 + 180 + 620 - 20, `done at ${seen.done} ms`);
  const bursts = await probe(page, () => window.__proto.bursts.filter((b) => b.scene === "ending").length);
  check("ending: The Market bursts once", bursts === 1, `${bursts}`);
  const rest = await probe(page, () => [...document.querySelectorAll("#end-emblem, #end-recap .card, #end-fact, #end-fact-inner")]
    .every((el) => el.style.transform === ""));
  check("ending: every element comes to rest with no transform left on it", rest);

  // The quiet zone: same beats, no burst (non-negotiable 4).
  await page.click('[data-region="stillWater"]');
  await advance(page, 3500);
  const quiet = await probe(page, () => ({
    bursts: window.__proto.bursts.filter((b) => b.scene === "ending").length,
    done: window.__proto.done.ending
  }));
  check("ending: The Still Water finishes with no burst", quiet.done && quiet.bursts === 1, `${quiet.bursts - 1} new bursts`);

  check("ending: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// --- 3. chapter opening --------------------------------------------------------------

async function checkOpening(browser) {
  const { context, page, errors } = await newPage(browser);
  await open(page, "opening");
  await page.click('[data-lang="th"]');
  await page.waitForFunction(() => document.documentElement.lang === "th");

  const letters = await probe(page, () => [...document.querySelectorAll("#open-title .g-letter")].map((el) => el.textContent));
  check("opening: ที่ราบสูง splits into 6 grapheme clusters", letters.length === 6, letters.join(" | "));
  check("opening: no cluster starts with a combining mark", letters.every((l) => !/^\p{M}/u.test(l)));
  check("opening: the clusters rejoin into the exact title", letters.join("") === "ที่ราบสูง");
  const hidden = await probe(page, () => [...document.querySelectorAll("#open-title .g-letter")].every((el) => el.style.opacity === "0"));
  check("opening: letters start hidden behind their glints", hidden);

  let doneAt = null;
  for (let t = 50; t <= 6000; t += 50) {
    await advance(page, 50);
    if (await probe(page, () => window.__proto.done.opening)) {
      doneAt = t;
      break;
    }
  }
  const end = await probe(page, () => ({
    letters: [...document.querySelectorAll("#open-title .g-letter")].map((el) => Number(el.style.opacity)),
    typed: document.getElementById("open-typed").textContent,
    flight: window.__proto.flight
  }));
  check("opening: every letter ends fully shown", end.letters.every((o) => o === 1));
  check("opening: Lumi's line ends as the full sentence",
    end.typed === "การไต่ที่ร่างกายคุณทำทุกวัน ไม่ว่าคุณจะรู้ตัวหรือไม่");
  const miss = end.flight
    ? Math.hypot(end.flight.end[0] - end.flight.target[0], end.flight.end[1] - end.flight.target[1])
    : Number.POSITIVE_INFINITY;
  check("opening: the caret lands on the ring marker", miss <= 1.5, `${miss.toFixed(2)} px off`);
  check("opening: the whole opening takes under 4 s", doneAt !== null && doneAt <= 4000, `${doneAt} ms`);

  check("opening: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// --- 4. ring to radar ----------------------------------------------------------------

async function checkRadar(browser) {
  const { context, page, errors } = await newPage(browser);
  await open(page, "radar");
  const landed = (radii) => radii.every((r, i) => Math.abs(r - (RADAR_R * SCORES[i]) / 100) < 0.05);

  const r0 = await radarRadii(page);
  check("radar: every vertex starts on the ring (0.725 of the plot radius)",
    r0.every((r) => Math.abs(r - 72.5) < 0.01), r0.map((r) => r.toFixed(1)).join(","));
  await advance(page, 700);
  const mid = await radarRadii(page);
  const progress = mid.map((r, i) => (r - 72.5) / (SCORES[i] - 72.5));
  check("radar: the regions grow in radar order (vertex 1 ahead of vertex 8)",
    progress[0] > progress[7], progress.map((p) => p.toFixed(2)).join(","));
  await advance(page, 1200);
  const fin = await radarRadii(page);
  check("radar: every vertex lands on its score", landed(fin), fin.map((r) => r.toFixed(1)).join(","));
  const done = await probe(page, () => ({
    done: window.__proto.done.radar,
    bursts: window.__proto.bursts.filter((b) => b.scene === "radar").length
  }));
  check("radar: one burst at the end", done.done && done.bursts === 1, `${done.bursts}`);

  // Skip is always there and jumps straight to the end state.
  await page.click("#radar-play");
  await advance(page, 100);
  await page.click("#radar-skip");
  check("radar: Skip lands every vertex immediately", landed(await radarRadii(page)));

  check("radar: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// --- 5. reduced motion ---------------------------------------------------------------

async function checkReduced(browser) {
  const { context, page, errors } = await newPage(browser, { reduce: true });

  await open(page, "tug");
  await pull(page, 40);
  const still = await probe(page, () => window.__proto.tugPos);
  check("reduced: the ring does not follow the finger", still.x === 0 && still.y === 0);
  await page.mouse.up();
  await pull(page, 120, 12);
  await page.mouse.up();
  await advance(page, 100);
  const a = await probe(page, () => [...document.querySelectorAll("#tug-burst .particle")].map((el) => el.style.transform));
  await advance(page, 300);
  const b = await probe(page, () => [...document.querySelectorAll("#tug-burst .particle")].map((el) => el.style.transform));
  check("reduced: burst particles fade in place, with no travel", a.length === 8 && a.join() === b.join());

  await open(page, "ending");
  await advance(page, 300);
  const ending = await probe(page, () => ({
    done: window.__proto.done.ending,
    moved: [...document.querySelectorAll("#end-emblem, #end-recap .card, #end-fact, #end-fact-inner")]
      .some((el) => el.style.transform !== "")
  }));
  check("reduced: the chapter ending is a cross-fade under 300 ms", ending.done && !ending.moved);

  await open(page, "opening");
  const opening = await probe(page, () => ({
    done: window.__proto.done.opening,
    typed: document.getElementById("open-typed").textContent.length,
    hidden: [...document.querySelectorAll("#open-title .g-letter")].some((el) => el.style.opacity === "0")
  }));
  check("reduced: the opening shows its end state at once", opening.done && opening.typed > 0 && !opening.hidden);

  await open(page, "radar");
  await advance(page, 350);
  const radar = await probe(page, () => ({
    done: window.__proto.done.radar,
    bloom: document.getElementById("radar-bloom").style.transform
  }));
  check("reduced: ring to radar is a cross-fade under 350 ms", radar.done && radar.bloom === "");

  check("reduced: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// --- 6. transform and opacity only -----------------------------------------------------

function checkStyleWrites() {
  const src = readFileSync(join(here, "proto.js"), "utf8");
  const props = new Set([...src.matchAll(/\.style\.([a-zA-Z]+)\s*=/g)].map((m) => m[1]));
  const custom = new Set([...src.matchAll(/setProperty\("([^"]+)"/g)].map((m) => m[1]));
  const bad = [...props].filter((p) => p !== "transform" && p !== "opacity");
  check("style writes are transform and opacity only", bad.length === 0, `found: ${[...props].join(", ")}`);
  check("the only custom property set is the static --wash", [...custom].every((p) => p === "--wash"), [...custom].join(", "));
}

// --- 7. frame budget under a 4x CPU throttle ---------------------------------------------

const FRAME_BUDGET_MS = 34;

async function checkFrameBudget(browser) {
  const { context, page } = await newPage(browser, { manual: false });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const measure = () => page.evaluate(() => new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const t0 = last;
    const tick = (now) => {
      deltas.push(now - last);
      last = now;
      if (now - t0 < 1600) requestAnimationFrame(tick);
      else resolve(deltas.slice(1));
    };
    requestAnimationFrame(tick);
  }));
  for (const scene of ["radar", "ending", "opening"]) {
    await page.goto(`${PAGE_URL}#${scene}`);
    const sorted = (await measure()).sort((x, y) => x - y);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    check(`frame budget (4x CPU): ${scene} p95 frame under ${FRAME_BUDGET_MS} ms`, p95 < FRAME_BUDGET_MS,
      `p95 ${p95.toFixed(1)} ms, max ${sorted.at(-1).toFixed(1)} ms over ${sorted.length} frames`);
  }
  await context.close();
}

// --- run ----------------------------------------------------------------------------------

const browser = await chromium.launch();
try {
  checkStyleWrites();
  await checkTug(browser);
  await checkEnding(browser);
  await checkOpening(browser);
  await checkRadar(browser);
  await checkReduced(browser);
  await checkFrameBudget(browser);
} finally {
  await browser.close();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
