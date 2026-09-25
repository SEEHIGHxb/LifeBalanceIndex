// The moments that remain after the redesign's R2 (views/moments.js: the quiet
// regions and the ceremony's burst) and the redesign's shared stage pieces
// (views/stage.js) and progress star (views/journey-progress.js). Time is
// driven by hand through makeClock(), so every pose asserted here is
// deterministic.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installDom, makeClock, makeNode } from "./dom-stub.mjs";

let device = false;
let tick;

installDom();
const { setClock } = await import("../motion.js");
const { disposeMotion } = await import("../views/motion-mount.js");
const { isQuietChapter, QUIET_ASPECTS, playBurst } = await import("../views/moments.js");
const { typedMarkup, typeIn, settleIn, burstSpread, burstPose } = await import("../views/stage.js");
const { progressMarkup, paintProgress, regionsComplete } = await import("../views/journey-progress.js");
const { CHAPTERS } = await import("../views/journey.js");

beforeEach(() => {
  installDom();
  device = false;
  globalThis.window = { matchMedia: () => ({ matches: device }) };
  tick = makeClock();
  setClock(tick);
  disposeMotion();
});

const last = (el, prop) => el.style.writes.filter(w => w.prop === prop).at(-1)?.value;

// A .typed element whose cells are real stub nodes with class lists.
function typedOf(n) {
  const cells = Array.from({ length: n }, () => makeNode("span"));
  return { cells, el: { querySelectorAll: () => cells } };
}
const hidden = (cells) => cells.filter(c => c.classList.contains("off")).length;

// --- quiet zones -------------------------------------------------------------

test("the quiet zones are exactly The Still Water and The Commons", () => {
  const quiet = CHAPTERS.filter(isQuietChapter).map(c => c.aspect);
  assert.deepEqual(quiet, ["mental", "relationships"]);
  assert.deepEqual([...QUIET_ASPECTS], ["mental", "relationships"]);
  assert.equal(isQuietChapter(undefined), false);
});

// --- the ceremony's burst (views/ceremony.js until R3) ------------------------

test("playBurst: eight particles, flown and removed", async () => {
  const layer = makeNode("div");
  const done = playBurst(layer, new AbortController().signal);
  assert.equal(layer.childNodes.length, 8);
  await tick.advance(900);
  assert.equal(await done, true);
});

test("playBurst: with reduced motion every particle lands unseen at once", async () => {
  device = true;
  const layer = makeNode("div");
  assert.equal(await playBurst(layer, new AbortController().signal), true);
  assert.ok(layer.childNodes.every(p => Number(last(p, "opacity")) === 0));
});

// --- typed lines (views/stage.js) --------------------------------------------

test("typedMarkup: one cell per Thai cluster, the full text once for readers", () => {
  const html = typedMarkup("ที่ราบสูง");
  assert.match(html, /<span class="sr-only">ที่ราบสูง<\/span>/);
  assert.match(html, /<span class="typed" aria-hidden="true">/);
  assert.equal((html.match(/class="tc"/g) || []).length, 6);
  assert.match(html, /<span class="tc">ที่<\/span>/);
  assert.match(typedMarkup(["A", "<b>"]), /A<\/span><br><span class="tc">&lt;/);
});

test("typeIn: hides every cell, then shows them all by the end", async () => {
  const { cells, el } = typedOf(10);
  const done = typeIn(el, { msPerChar: 10 });
  assert.equal(hidden(cells), 10);
  await tick.advance(50);
  const midway = hidden(cells);
  assert.ok(midway > 0 && midway < 10, `midway ${midway} cells were hidden`);
  await tick.advance(200);
  assert.equal(await done, true);
  assert.equal(hidden(cells), 0);
});

test("typeIn: cut short, nothing stays hidden", async () => {
  const { cells, el } = typedOf(10);
  const ctl = new AbortController();
  const done = typeIn(el, { msPerChar: 10, signal: ctl.signal });
  await tick.advance(30);
  ctl.abort();
  assert.equal(hidden(cells), 0, "the abort shows every cell at once");
  await tick.advance(16);
  assert.equal(await done, false);
  assert.equal(hidden(cells), 0);
});

test("typeIn: with reduced motion every cell is simply there", async () => {
  device = true;
  const { cells, el } = typedOf(6);
  assert.equal(await typeIn(el, { msPerChar: 10 }), true);
  assert.equal(hidden(cells), 0);
});

test("settleIn: starts small and ends with no transform at all", async () => {
  const el = makeNode("img");
  const done = settleIn(el, { scale: 0.86 });
  assert.match(el.style.writes[0].value, /scale\(0\.86/);
  await tick.advance(2000);
  assert.equal(await done, true);
  assert.equal(last(el, "transform"), "");
});

// --- the burst's spread is the same for every reader -----------------------------

test("burst: the spread is fixed per particle, never random", () => {
  const a = Array.from({ length: 16 }, (_, i) => burstSpread(i));
  const b = Array.from({ length: 16 }, (_, i) => burstSpread(i));
  assert.deepEqual(a, b);
  for (const p of a) assert.ok(p.m >= 0.65 && p.m <= 1.3);
});

test("burst: a particle fades in, flies out, shrinks and is gone by 800ms", () => {
  const start = burstPose(0, 1);
  const mid = burstPose(300, 1);
  const end = burstPose(1100, 1);
  assert.equal(start.opacity, 0);
  assert.ok(mid.r > start.r && mid.opacity > 0.9);
  assert.ok(end.scale < mid.scale);
  assert.equal(end.opacity, 0);
});

// --- the progress star (views/journey-progress.js) --------------------------------

test("the progress star counts a region only once its ending is reached", () => {
  const total = CHAPTERS.length;
  assert.equal(regionsComplete({ chapter: -1, endsChapter: false, total }), 0);
  assert.equal(regionsComplete({ chapter: 0, endsChapter: true, total }), 1);
  assert.equal(regionsComplete({ chapter: 7, endsChapter: true, total }), total);
  assert.equal(regionsComplete({ chapter: 99, endsChapter: true, total }), total);
});

test("the progress star has one point per region and is hidden from readers", () => {
  const html = progressMarkup(CHAPTERS);
  assert.equal((html.match(/class="pt"/g) || []).length, 8);
  assert.match(html, /<svg class="progress-star"[^>]*aria-hidden="true"/);
});

test("paintProgress lights finished regions in their hue and says so in words", () => {
  const kites = CHAPTERS.map(() => makeNode("path"));
  const count = makeNode("span");
  const pill = {
    querySelector: (sel) => sel === "#progress-count" ? count : kites[Number(sel.replace("#progress-pt-", ""))]
  };
  const status = makeNode("p");
  paintProgress({ chapter: 2, endsChapter: true, chapters: CHAPTERS, pill, status });
  assert.equal(count.textContent, "3 / 8");
  assert.deepEqual(kites.map(k => k.attributes.fill ?? null), [...CHAPTERS.slice(0, 3).map(c => c.hue), null, null, null, null, null]);
  assert.equal(status.textContent, `${CHAPTERS[2].region} — 3 / 8`);
});

// --- wiring ------------------------------------------------------------------------

test("CI runs the moments in a browser, with motion and with reduced motion", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
  assert.match(read(".github/workflows/ci.yml"), /node tests\/moments-e2e\.mjs/);
  const e2e = read("tests/moments-e2e.mjs");
  assert.match(e2e, /reducedMotion: reduced \? "reduce"/);
  assert.match(e2e, /__lbiClock/);
});
