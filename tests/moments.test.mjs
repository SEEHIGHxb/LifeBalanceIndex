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
const {
  settleRing, playEnding, playOpening, hopTabIcon, isQuietChapter, QUIET_ASPECTS,
  glintTitleMarkup, caretLineMarkup, poseTug, releaseTug, tapTug
} = await import("../views/moments.js");
const { bindTug, TUG_SNAP_PX } = await import("../views/tug.js");
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
    emblem: makeNode("div"),
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
  assert.equal(last(p.emblem, "opacity"), "0", "the emblem waits to arrive");
  assert.equal(last(p.emblem, "transform"), "scale(0.86)");

  await tick.advance(1000);
  assert.equal(last(p.emblem, "opacity"), "1", "the emblem has arrived with the burst");
  for (const card of p.cards) assert.equal(last(card, "opacity"), "1", "every card is dealt by now");
  assert.match(last(p.fact, "transform"), /rotateY\(90deg\)/, "the fact waits for the cards");

  await tick.advance(2000);
  assert.equal(await done, true);
  for (const el of [p.lit, p.marker, p.emblem, ...p.cards, p.fact]) {
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
  for (const el of [p.lit, p.marker, p.emblem, ...p.cards, p.fact]) {
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
  for (const el of [p.lit, p.marker, p.emblem, ...p.cards, p.fact]) assert.ok(!moved(el));
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

// --- the chapter opening (second release) -----------------------------------------

test("glintTitleMarkup: one letter per Thai cluster, read once, words kept whole", () => {
  const th = glintTitleMarkup("ที่ราบสูง");
  const letters = [...th.matchAll(/<span class="g-letter">([^<]*)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(letters, ["ที่", "ร", "า", "บ", "สู", "ง"]);
  assert.match(th, /^<span class="sr-only">ที่ราบสูง<\/span><span class="g-row" aria-hidden="true">/);
  const en = glintTitleMarkup("The Still Water");
  assert.equal((en.match(/class="g-word"/g) || []).length, 3, "one unbreakable group per word");
  assert.match(en, /<\/span> <span class="g-word">/, "the spaces between words stay plain text");
  assert.match(glintTitleMarkup("A & <b>"), /A &amp; &lt;b&gt;/);
});

test("caretLineMarkup: one span per grapheme, a hidden full copy, and the caret last", () => {
  const html = caretLineMarkup("สู้ ๆ");
  assert.match(html, /^<span class="sr-only">สู้ ๆ<\/span><span class="t-row" aria-hidden="true">/);
  const letters = [...html.matchAll(/<span class="t">([^<]*)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(letters, ["สู้", " ", "ๆ"]);
  assert.match(html, /<span class="star-caret"><svg[^>]*aria-hidden="true"/);
});

function openingPieces(nTitle = 4, nLine = 6) {
  return {
    pairs: Array.from({ length: nTitle }, () => [makeNode("span"), makeNode("span")]),
    letters: Array.from({ length: nLine }, () => makeNode("span")),
    caret: makeNode("span"),
    marker: makeNode("circle"),
    shift: [3, 1]
  };
}

test("playOpening: spells the title, types the line, flies the caret, pulses the marker, lands", async () => {
  const p = openingPieces();
  const done = playOpening({ draw() {}, pieces: () => p });
  // Parked: every letter and glint hidden, the line hidden, the marker at its old place.
  for (const [letter, glint] of p.pairs) {
    assert.equal(last(letter, "opacity"), "0");
    assert.equal(last(glint, "opacity"), "0");
  }
  for (const t of p.letters) assert.equal(last(t, "opacity"), "0");
  assert.equal(last(p.marker, "transform"), "translate(3px, 1px)");

  await tick.advance(96);
  assert.ok(Number(last(p.pairs[0][1], "opacity")) > 0, "the first letter is a glint first");
  assert.equal(last(p.pairs[3][1], "opacity"), "0", "the last has not started");

  await tick.advance(1000);
  for (const [letter] of p.pairs) assert.equal(last(letter, "opacity") ?? "", "", "every letter turned");
  await tick.advance(400);
  assert.ok(p.letters.slice(0, 3).every(t => last(t, "opacity") === ""), "the line is being revealed in order");

  await tick.advance(3000);
  assert.equal(await done, true);
  assert.ok(p.marker.style.writes.some(w => /^scale\(1\.[1-8]/.test(w.value)), "the marker pulsed");
  for (const el of [...p.pairs.flat(), ...p.letters, p.caret, p.marker]) {
    assert.equal(last(el, "transform") ?? "", "");
    assert.equal(last(el, "opacity") ?? "", "");
  }
});

test("playOpening: with reduced motion the title and line are simply there", async () => {
  device = true;
  const p = openingPieces();
  assert.equal(await playOpening({ draw() {}, pieces: () => p }), true);
  for (const el of [...p.pairs.flat(), ...p.letters, p.caret, p.marker]) assert.ok(!moved(el));
});

test("playOpening: cut short mid-line, nothing stays hidden", async () => {
  const p = openingPieces();
  const done = playOpening({ draw() {}, pieces: () => p });
  await tick.advance(1300);
  const next = settleRing({ marker: makeNode("circle"), shift: [1, 0] });
  for (const el of [...p.pairs.flat(), ...p.letters, p.caret]) assert.equal(last(el, "opacity") ?? "", "");
  await tick.advance(1500);
  assert.equal(await done, false);
  await next;
});

test("playOpening: a screen with a title but no line ends after the spelling", async () => {
  const p = { ...openingPieces(), letters: [], caret: null };
  const done = playOpening({ draw() {}, pieces: () => p });
  await tick.advance(2000);
  assert.equal(await done, true);
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

// --- tug-the-ring (third release) ------------------------------------------------

// A button whose listeners really fire, which the stub's nodes do not do.
function fakeButton() {
  const on = {};
  return {
    hidden: true,
    captured: null,
    addEventListener(type, fn) { (on[type] ||= []).push(fn); },
    fire(type, e = {}) { for (const fn of on[type] || []) fn({ pointerId: 1, detail: 1, ...e }); },
    setPointerCapture(id) { this.captured = id; },
    releasePointerCapture() { this.captured = null; }
  };
}

function tugRig() {
  const button = fakeButton();
  const body = makeNode("div");
  const layer = makeNode("div");
  const errors = [];
  const tug = bindTug({ button, body, layer, onError: (e) => errors.push(e) });
  return { button, body, layer, tug, errors };
}

test("poseTug: follows the pull, stretched along it, and nothing under reduced motion", () => {
  const body = makeNode("div");
  poseTug(body, [30, 0]);
  assert.equal(last(body, "transform"), "translate(30px, 0px) rotate(0rad) scale(1.05, 0.975) rotate(0rad)");
  poseTug(body, [0, 0]);
  assert.equal(last(body, "transform"), "");
  device = true;
  const still = makeNode("div");
  poseTug(still, [30, 0]);
  assert.ok(!moved(still));
});

test("bindTug: offered only where enabled, and never with reduced motion", () => {
  const { button, tug } = tugRig();
  assert.equal(button.hidden, true, "hidden until a screen enables it");
  tug.setEnabled(true);
  assert.equal(button.hidden, false);
  tug.setEnabled(false);
  assert.equal(button.hidden, true);
  device = true;
  tug.setEnabled(true);
  assert.equal(button.hidden, true, "no toy that does nothing");
});

test("bindTug: a drag follows like a rubber band, never past its reach", () => {
  const { button, body, tug } = tugRig();
  tug.setEnabled(true);
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  assert.equal(button.captured, 1);
  button.fire("pointermove", { clientX: 40, clientY: 0 });
  const x = translateX(body);
  assert.ok(x > 20 && x < 40, `follows less than the finger: ${x}`);
  button.fire("pointermove", { clientX: TUG_SNAP_PX - 1, clientY: 0 });
  assert.ok(translateX(body) < 60, "the band never stretches past 60px");
});

test("bindTug: past the line it lets go, bursts, and springs home", async () => {
  const { button, body, layer, tug, errors } = tugRig();
  tug.setEnabled(true);
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointermove", { clientX: 0, clientY: TUG_SNAP_PX + 5 });
  assert.equal(button.captured, null, "released at the line");
  assert.equal(layer.childNodes.length, 8, "eight particles burst");
  button.fire("pointerup");
  button.fire("click");
  assert.equal(layer.childNodes.length, 8, "the click that ends a drag is not a second tap");
  await tick.advance(1500);
  assert.equal(last(body, "transform"), "", "home");
  assert.deepEqual(errors, []);
});

test("bindTug: let go short of the line, it goes home without a burst", async () => {
  const { button, body, layer, tug } = tugRig();
  tug.setEnabled(true);
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointermove", { clientX: 30, clientY: 0 });
  button.fire("pointerup");
  assert.equal(layer.childNodes.length, 0);
  await tick.advance(1500);
  assert.equal(last(body, "transform"), "");
});

test("bindTug: a tap, Enter or Space bursts; a keyboard click is never swallowed", async () => {
  const { button, body, layer, tug } = tugRig();
  tug.setEnabled(true);
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointerup");
  button.fire("click");
  assert.equal(layer.childNodes.length, 8, "a tap bursts");
  await tick.advance(48);
  assert.match(last(body, "transform"), /^scale\(0\.9/, "the ring dips");
  await tick.advance(1500);
  assert.equal(last(body, "transform"), "");
  // A drag that snapped away leaves no click behind; Enter must still work.
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointermove", { clientX: TUG_SNAP_PX + 5, clientY: 0 });
  await tick.advance(1500);
  const before = layer.childNodes.length;
  button.fire("click", { detail: 0 });
  assert.equal(layer.childNodes.length, before + 8, "Enter after a snap still bursts");
  await tick.advance(1500);
});

test("bindTug: disabled, it does nothing; with no ring on the page it is inert", () => {
  const { button, body, layer } = tugRig();
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointermove", { clientX: 50, clientY: 0 });
  button.fire("click");
  assert.ok(!moved(body));
  assert.equal(layer.childNodes.length, 0);
  assert.doesNotThrow(() => bindTug({ button: null, body: null, layer: null }).setEnabled(true));
});

test("bindTug: switched off mid-drag, the ring lets go and springs home", async () => {
  const { button, body, layer, tug } = tugRig();
  tug.setEnabled(true);
  button.fire("pointerdown", { clientX: 0, clientY: 0 });
  button.fire("pointermove", { clientX: 50, clientY: 0 });
  assert.ok(translateX(body) > 0);
  tug.setEnabled(false);
  assert.equal(button.captured, null, "capture released");
  assert.equal(button.hidden, true);
  assert.equal(layer.childNodes.length, 0, "no burst");
  await tick.advance(1500);
  assert.equal(last(body, "transform"), "", "not left stretched");
  button.fire("pointermove", { clientX: 80, clientY: 0 });
  assert.equal(last(body, "transform"), "", "the old drag is over");
});

test("releaseTug and tapTug: with reduced motion, home at once and no burst", async () => {
  device = true;
  const body = makeNode("div");
  const layer = makeNode("div");
  assert.equal(await releaseTug({ body, from: [20, 5], layer, burst: true }), true);
  assert.equal(await tapTug({ body, layer }), true);
  assert.equal(layer.childNodes.length, 0);
  assert.ok(!moved(body));
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
