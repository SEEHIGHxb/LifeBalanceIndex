// views/moments.js: the Phase 3 first-release moments. Time is driven by hand
// through makeClock(), so every pose asserted here is deterministic.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installDom, makeClock, makeNode } from "./dom-stub.mjs";

let device = false;
let tick;

installDom();
const { setClock } = await import("../motion.js");
const { disposeMotion } = await import("../views/motion-mount.js");
const { settleRing, playEnding, hopTabIcon, isQuietChapter, QUIET_ASPECTS } = await import("../views/moments.js");
const { CHAPTERS } = await import("../views/journey.js");
const { ringMarkup } = await import("../views/journey-ring.js");

beforeEach(() => {
  installDom();
  device = false;
  globalThis.window = { matchMedia: () => ({ matches: device }) };
  tick = makeClock();
  setClock(tick);
  disposeMotion();
});

const last = (el, prop) => el.style.writes.filter(w => w.prop === prop).at(-1)?.value;
const moved = (el) => el.style.writes.some(w => w.value !== "");
const translateX = (el) => Number(/translate\(([-\d.]+)px/.exec(last(el, "transform"))[1]);

function endingPieces(n = 3) {
  return {
    lit: makeNode("path"),
    marker: makeNode("circle"),
    shift: [4, -3],
    cards: Array.from({ length: n }, () => makeNode("li")),
    fact: makeNode("div"),
    layer: makeNode("div")
  };
}

// --- quiet zones -------------------------------------------------------------

test("the quiet zones are exactly The Still Water and The Commons", () => {
  const quiet = CHAPTERS.filter(isQuietChapter).map(c => c.aspect);
  assert.deepEqual(quiet, ["mental", "relationships"]);
  assert.deepEqual([...QUIET_ASPECTS], ["mental", "relationships"]);
  assert.equal(isQuietChapter(undefined), false);
});

test("the ring carries an aria-hidden burst layer", () => {
  assert.match(ringMarkup(CHAPTERS), /<div class="ring-burst" aria-hidden="true"><\/div>/);
});

// --- the neutral settle --------------------------------------------------------

test("settleRing: parks the marker at its old place and springs it home", async () => {
  const marker = makeNode("circle");
  const done = settleRing({ marker, shift: [6, -2] });
  assert.equal(last(marker, "transform"), "translate(6px, -2px)", "parked at the old place first");
  await tick.advance(1500);
  assert.equal(await done, true);
  assert.equal(last(marker, "transform"), "", "lands back on the stylesheet");
});

test("settleRing: the settle is a function of distance alone (non-negotiable 1)", async () => {
  // Two answers that move the marker the same distance get the same motion,
  // frame for frame; nothing else reaches the spring.
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const marker = makeNode("circle");
    const done = settleRing({ marker, shift: [-1.9, -0.6] });
    await tick.advance(1500);
    await done;
    runs.push(marker.style.writes.map(w => `${w.prop}=${w.value}`));
  }
  assert.ok(runs[0].length > 10);
  assert.deepEqual(runs[0], runs[1]);
});

test("settleRing: an interrupting settle starts from where the marker is", async () => {
  const marker = makeNode("circle");
  const first = settleRing({ marker, shift: [10, 0] });
  await tick.advance(48);
  const mid = translateX(marker);
  assert.ok(mid > 0 && mid < 10, `mid-settle at ${mid}`);
  const second = settleRing({ marker, shift: [5, 0] });
  const start = translateX(marker);
  assert.ok(Math.abs(start - (mid + 5)) < 0.02, `second settle starts at ${start}, not ${mid + 5}`);
  await tick.advance(1500);
  assert.equal(await first, false, "the first settle was cut short");
  assert.equal(await second, true);
  assert.equal(last(marker, "transform"), "");
});

test("settleRing: no distance, no motion", async () => {
  const marker = makeNode("circle");
  const done = settleRing({ marker, shift: [0, 0] });
  await tick.advance(32);
  assert.equal(await done, true);
  assert.ok(!moved(marker));
});

test("settleRing: with reduced motion the marker is simply there", async () => {
  device = true;
  const marker = makeNode("circle");
  assert.equal(await settleRing({ marker, shift: [6, -2] }), true);
  assert.ok(!moved(marker), "no pose was ever written");
});

// --- the chapter ending --------------------------------------------------------

test("playEnding: draws first, deals every card, turns the fact last, then lands", async () => {
  const p = endingPieces();
  const order = [];
  const done = playEnding({
    draw: () => order.push("draw"),
    pieces: () => { order.push("pieces"); return p; },
    quiet: false
  });
  assert.deepEqual(order, ["draw", "pieces"]);
  // Parked in the same task as the draw.
  assert.equal(last(p.lit, "opacity"), "0.25");
  assert.equal(last(p.marker, "transform"), "translate(4px, -3px)");
  for (const card of p.cards) assert.equal(last(card, "opacity"), "0");
  assert.match(last(p.fact, "transform"), /rotateY\(90deg\)/);

  await tick.advance(1000);
  for (const card of p.cards) assert.equal(last(card, "opacity"), "1", "every card is dealt by now");
  assert.match(last(p.fact, "transform"), /rotateY\(90deg\)/, "the fact waits for the cards");

  await tick.advance(2000);
  assert.equal(await done, true);
  for (const el of [p.lit, p.marker, ...p.cards, p.fact]) {
    assert.equal(last(el, "transform") ?? "", "");
    assert.equal(last(el, "opacity") ?? "", "");
  }
});

test("playEnding: a burst of 8 outside the quiet zones, none inside them", async () => {
  for (const quiet of [false, true]) {
    const p = endingPieces();
    const done = playEnding({ draw() {}, pieces: () => p, quiet });
    assert.equal(p.layer.childNodes.length, quiet ? 0 : 8);
    await tick.advance(3000);
    assert.equal(await done, true);
    for (const part of p.layer.childNodes) assert.equal(last(part, "opacity"), "0", "every particle fades out");
  }
});

test("playEnding: the burst is identical for every reader", async () => {
  const poses = [];
  for (let i = 0; i < 2; i++) {
    const p = endingPieces();
    const done = playEnding({ draw() {}, pieces: () => p, quiet: false });
    await tick.advance(3000);
    await done;
    poses.push(p.layer.childNodes.map(n => n.style.writes.map(w => w.value).join(";")));
  }
  assert.deepEqual(poses[0], poses[1]);
});

test("playEnding: cut short by the next screen, every piece lands", async () => {
  const p = endingPieces();
  const done = playEnding({ draw() {}, pieces: () => p, quiet: false });
  await tick.advance(400);
  const next = settleRing({ marker: makeNode("circle"), shift: [1, 1] });
  for (const el of [p.lit, p.marker, ...p.cards, p.fact]) {
    assert.equal(last(el, "transform") ?? "", "");
    assert.equal(last(el, "opacity") ?? "", "");
  }
  await tick.advance(1500);
  assert.equal(await done, false);
  await next;
});

test("playEnding: with reduced motion it draws the end state and moves nothing", async () => {
  device = true;
  const p = endingPieces();
  let drawn = 0;
  assert.equal(await playEnding({ draw: () => drawn++, pieces: () => p, quiet: false }), true);
  assert.equal(drawn, 1);
  assert.equal(p.layer.childNodes.length, 0, "no burst");
  for (const el of [p.lit, p.marker, ...p.cards, p.fact]) assert.ok(!moved(el));
});

test("playEnding: a piece that throws while parking puts the finished ending back", async () => {
  const p = endingPieces();
  const broken = p.cards[1];
  const style = broken.style;
  broken.style = new Proxy(style, {
    set(target, prop, value) {
      if (prop === "opacity" && String(value) === "0") throw new Error("boom");
      target[prop] = value;
      return true;
    }
  });
  let drawn = 0;
  await assert.rejects(playEnding({ draw: () => drawn++, pieces: () => p, quiet: true }), /boom/);
  assert.equal(drawn, 2, "rendered again after the failure");
  assert.equal(last(p.cards[0], "opacity"), "", "the card parked before it landed");
});

// --- the tab hop -----------------------------------------------------------------

test("hopTabIcon: rises about 5px and lands", async () => {
  const icon = makeNode("svg");
  const done = hopTabIcon(icon);
  await tick.advance(176);
  const peak = Number(/translateY\(([-\d.]+)px\)/.exec(last(icon, "transform"))[1]);
  assert.ok(peak < -4 && peak >= -5, `peak ${peak}`);
  await tick.advance(400);
  assert.equal(await done, true);
  assert.equal(last(icon, "transform"), "");
});

test("hopTabIcon: with the in-app switch on, no hop", async () => {
  localStorage.setItem("lbi_reduce_motion", "1");
  const icon = makeNode("svg");
  assert.equal(await hopTabIcon(icon), true);
  assert.ok(!moved(icon));
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
