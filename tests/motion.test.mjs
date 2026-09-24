// motion.js and views/motion-mount.js: the motion core and its lifecycle.
// docs/interactive-web-plan.md §6, Phase 2. Time is driven by hand through
// makeClock() from dom-stub.mjs, so every number here is deterministic.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installDom, makeClock, makeNode } from "./dom-stub.mjs";
import {
  setClock, clock, animate, spring, follow, loop, scrub, rubberBand,
  cubicBezier, easeStar, linear, anySignal, anySignalFallback,
  isReduced, deviceReducesMotion, getReduceMotionPref, setReduceMotionPref,
  syncReduceMotionAttr, REDUCE_MOTION_KEY, REDUCE_MOTION_ATTR, SPRING_STEP_S
} from "../motion.js";
import {
  mountMotion, disposeMotion, isMotionLive, writeMotionStyle, assertMayMove,
  runScene, MOTION_STYLE_PROPS
} from "../views/motion-mount.js";

let device = false;
let tick;

beforeEach(() => {
  installDom();
  device = false;
  globalThis.window = { matchMedia: () => ({ matches: device }) };
  tick = makeClock();
  setClock(tick);
  disposeMotion();
});

// --- clock -------------------------------------------------------------------

test("clock(): setClock wins, then a page-injected __lbiClock, then the real one", () => {
  assert.equal(clock(), tick);
  setClock(null);
  const injected = { now: () => 1, frame: () => {} };
  globalThis.__lbiClock = injected;
  assert.equal(clock(), injected);
  delete globalThis.__lbiClock;
  assert.equal(typeof clock().now(), "number", "falls back to performance.now");
});

// --- easing ------------------------------------------------------------------

test("cubicBezier matches the CSS endpoints and the linear case", () => {
  const lin = cubicBezier(0, 0, 1, 1);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) assert.ok(Math.abs(lin(t) - t) < 1e-4);
  assert.equal(easeStar(-1), 0);
  assert.equal(easeStar(2), 1);
});

test("easeStar starts fast and never goes backwards", () => {
  assert.ok(easeStar(0.25) > 0.6, "the house curve front-loads its travel");
  let prev = 0;
  for (let i = 1; i <= 100; i++) {
    const v = easeStar(i / 100);
    assert.ok(v >= prev - 1e-9, `easeStar dips at ${i / 100}`);
    prev = v;
  }
});

test("cubicBezier still solves a curve whose slope is flat at the ends", () => {
  const flat = cubicBezier(1, 0, 0, 1);
  assert.ok(Math.abs(flat(0.5) - 0.5) < 1e-3);
  assert.ok(flat(0.1) < 0.1);
});

// --- the reduced-path contract -----------------------------------------------

test("every entry point refuses to run without a reduced path", () => {
  const update = () => {};
  assert.throws(() => animate({ duration: 100, update }), /reduced path/);
  assert.throws(() => spring({ from: [1], update }), /reduced path/);
  assert.throws(() => follow({ from: [0], update }), /reduced path/);
  assert.throws(() => loop({ step: () => false }), /reduced path/);
  assert.throws(() => animate({ duration: 100, update, reduced: "fade" }), /reduced path/);
});

// --- animate -----------------------------------------------------------------

test("animate runs 0 -> 1 over its duration and resolves true", async () => {
  const seen = [];
  const done = animate({ duration: 160, update: v => seen.push(v), reduced: "end" });
  await tick.advance(400);
  assert.equal(await done, true);
  assert.equal(seen.at(-1), 1);
  assert.ok(seen.length >= 9, `only ${seen.length} frames`);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1]);
});

test("animate waits out its delay before the first update", async () => {
  const seen = [];
  const done = animate({ duration: 100, delay: 200, update: v => seen.push(v), reduced: "end" });
  await tick.advance(160);
  assert.deepEqual(seen, []);
  await tick.advance(400);
  assert.equal(await done, true);
  assert.equal(seen.at(-1), 1);
});

test("animate with no duration lands in one frame", async () => {
  const seen = [];
  const done = animate({ duration: 0, update: v => seen.push(v), reduced: "end" });
  await tick.advance(16);
  assert.equal(await done, true);
  assert.deepEqual(seen, [1]);
});

test("aborting animate stops the updates and resolves false, never rejects", async () => {
  const ctl = new AbortController();
  const seen = [];
  const done = animate({ duration: 500, update: v => seen.push(v), signal: ctl.signal, reduced: "end" });
  await tick.advance(100);
  ctl.abort();
  const count = seen.length;
  await tick.advance(600);
  assert.equal(await done, false);
  assert.equal(seen.length, count);
  assert.ok(seen.at(-1) < 1);
});

test("animate with no duration but a delay still lands, after the delay", async () => {
  const seen = [];
  const done = animate({ duration: 0, delay: 50, update: v => seen.push(v), reduced: "end" });
  await tick.advance(32);
  assert.deepEqual(seen, [], "nothing before the delay");
  await tick.advance(48);
  assert.equal(await done, true);
  assert.deepEqual(seen, [1]);
});

test("an update that throws rejects the animation instead of hanging it", async () => {
  let calls = 0;
  const done = animate({
    duration: 200, reduced: "end",
    update: () => { if (++calls === 2) throw new Error("bad write"); }
  });
  const settled = assert.rejects(done, /bad write/);
  await tick.advance(100);
  await settled;
  assert.equal(tick.pending, 0, "no frame loop left running");
});

test("animate on an already-aborted signal does nothing", async () => {
  const ctl = new AbortController();
  ctl.abort();
  let calls = 0;
  assert.equal(await animate({ duration: 100, update: () => calls++, signal: ctl.signal, reduced: "end" }), false);
  assert.equal(calls, 0);
});

test("reduced \"end\" lands the final state at once, with no frames", async () => {
  setReduceMotionPref(true);
  const seen = [];
  const done = animate({ duration: 500, update: v => seen.push(v), reduced: "end" });
  assert.equal(tick.pending, 0, "no frame was requested");
  assert.equal(await done, true);
  assert.deepEqual(seen, [1]);
});

test("a reduced function runs instead of the motion and gets the signal", async () => {
  device = true;
  const ctl = new AbortController();
  let got = null;
  let updates = 0;
  const done = animate({
    duration: 500, update: () => updates++, signal: ctl.signal,
    reduced: ({ signal }) => { got = signal; }
  });
  assert.equal(await done, true);
  assert.equal(got, ctl.signal);
  assert.equal(updates, 0);
});

// --- spring ------------------------------------------------------------------

test("spring settles on its target within a second at the house constants", async () => {
  let last = null;
  const done = spring({ from: [60, -30], to: [0, 0], update: v => { last = v; }, reduced: "end" });
  await tick.advance(1000);
  assert.equal(await done, true);
  assert.deepEqual(last, [0, 0]);
});

test("spring pulls to zero when no target is given", async () => {
  let last = null;
  const done = spring({ from: [20], update: v => { last = v; }, reduced: "end" });
  await tick.advance(1500);
  assert.equal(await done, true);
  assert.deepEqual(last, [0]);
});

test("spring is frame-rate independent: 30 fps and 120 fps land in the same place", async () => {
  const at = async (step) => {
    const c = makeClock();
    setClock(c);
    let pos = null;
    const ctl = new AbortController();
    spring({ from: [60], update: v => { pos = v[0]; }, signal: ctl.signal, reduced: "end" });
    await c.advance(240, step);
    ctl.abort();
    return pos;
  };
  const slow = await at(1000 / 30);
  const fast = await at(1000 / 120);
  assert.ok(Math.abs(slow - fast) < 1.5, `30 fps at ${slow}, 120 fps at ${fast}`);
});

test("one very long frame cannot run the spring for ever", async () => {
  let updates = 0;
  const ctl = new AbortController();
  spring({ from: [60], update: () => updates++, signal: ctl.signal, reduced: "end" });
  await tick.advance(5000, 5000);
  ctl.abort();
  assert.equal(updates, 1);
  assert.ok(SPRING_STEP_S > 0);
});

test("reduced spring jumps to the target", async () => {
  setReduceMotionPref(true);
  let last = null;
  assert.equal(await spring({ from: [5, 5], to: [1, 2], update: v => { last = v; }, reduced: "end" }), true);
  assert.deepEqual(last, [1, 2]);
});

test("spring on an aborted signal resolves false", async () => {
  const ctl = new AbortController();
  ctl.abort();
  assert.equal(await spring({ from: [1], update: () => {}, signal: ctl.signal, reduced: "end" }), false);
});

// --- follow ------------------------------------------------------------------

test("follow chases a moving target and closes the gap", async () => {
  const ctl = new AbortController();
  let pos = null;
  const f = follow({ from: [0], update: v => { pos = v[0]; }, signal: ctl.signal, reduced: "end" });
  f.set([100]);
  await tick.advance(32);
  assert.ok(pos > 0 && pos < 100, `lags the target: ${pos}`);
  await tick.advance(600);
  assert.ok(pos > 99, `catches up: ${pos}`);
  ctl.abort();
  await tick.advance(16);
  assert.equal(await f.done, false);
});

test("reduced follow: \"end\" jumps, a function gets the target", async () => {
  setReduceMotionPref(true);
  let pos = null;
  follow({ from: [0], update: v => { pos = v; }, reduced: "end" }).set([40, 2]);
  assert.deepEqual(pos, [40, 2]);
  let seen = null;
  const f = follow({ from: [0], update: () => assert.fail("no update when reduced"), reduced: ({ target }) => { seen = target; } });
  f.set([9]);
  assert.deepEqual(seen, [9]);
  assert.equal(await f.done, true);
});

test("rubberBand follows 1:1 at first, never passes max, and keeps the sign", () => {
  assert.ok(Math.abs(rubberBand(1, 60) - 1) < 0.01);
  assert.ok(rubberBand(1000, 60) < 60);
  assert.ok(rubberBand(1000, 60) > 59.9);
  assert.equal(rubberBand(-30, 60), -rubberBand(30, 60));
});

// --- loop --------------------------------------------------------------------

test("loop calls step every frame until it returns false", async () => {
  let frames = 0;
  const done = loop({ step: () => ++frames < 5, reduced: "end" });
  await tick.advance(200);
  assert.equal(await done, true);
  assert.equal(frames, 5);
});

test("reduced loop never starts a frame", async () => {
  device = true;
  let ran = false;
  assert.equal(await loop({ step: () => assert.fail("no frames when reduced"), reduced: () => { ran = true; } }), true);
  assert.equal(ran, true);
  assert.equal(await loop({ step: () => assert.fail("no frames when reduced"), reduced: "end" }), true);
});

// --- scrub -------------------------------------------------------------------

test("scrub interpolates numbers and arrays, and clamps at both ends", () => {
  const stops = [[0, 0], [100, 10], [200, 30]];
  assert.equal(scrub(-5, stops), 0);
  assert.equal(scrub(50, stops), 5);
  assert.equal(scrub(150, stops), 20);
  assert.equal(scrub(999, stops), 30);
  assert.deepEqual(scrub(50, [[0, [0, 10]], [100, [10, 30]]]), [5, 20]);
  assert.equal(scrub(50, [[0, 0], [100, 10]], t => t * t), 2.5);
  assert.equal(linear(0.3), 0.3);
  assert.throws(() => scrub(0, []), RangeError);
});

// --- signals -----------------------------------------------------------------

test("anySignal handles none, one and many", () => {
  assert.equal(anySignal([]).aborted, false);
  const a = new AbortController();
  assert.equal(anySignal([a.signal, null]), a.signal);
  const b = new AbortController();
  const both = anySignal([a.signal, b.signal]);
  b.abort("b");
  assert.equal(both.aborted, true);
});

test("the fallback aborts on EITHER signal (the Phase 1 review's HIGH finding)", () => {
  for (const which of [0, 1]) {
    const ctls = [new AbortController(), new AbortController()];
    const combined = anySignalFallback(ctls.map(c => c.signal));
    ctls[which].abort(`reason-${which}`);
    assert.equal(combined.aborted, true, `signal ${which} did not reach the combined one`);
    assert.equal(combined.reason, `reason-${which}`);
  }
});

test("the fallback is already aborted if an input is", () => {
  const a = new AbortController();
  a.abort("early");
  const combined = anySignalFallback([new AbortController().signal, a.signal]);
  assert.equal(combined.aborted, true);
  assert.equal(combined.reason, "early");
});

test("anySignal uses the fallback where AbortSignal.any is missing", () => {
  const original = AbortSignal.any;
  try {
    AbortSignal.any = undefined;
    const a = new AbortController();
    const b = new AbortController();
    const combined = anySignal([a.signal, b.signal]);
    a.abort();
    assert.equal(combined.aborted, true);
  } finally {
    AbortSignal.any = original;
  }
});

// --- reduced motion: device OR app, never less -----------------------------------

test("the app switch can only add reduction", () => {
  assert.equal(isReduced(), false);
  setReduceMotionPref(true);
  assert.equal(isReduced(), true);
  assert.equal(localStorage.getItem(REDUCE_MOTION_KEY), "1");
  setReduceMotionPref(false);
  assert.equal(localStorage.getItem(REDUCE_MOTION_KEY), null);
  device = true;
  assert.equal(deviceReducesMotion(), true);
  assert.equal(isReduced(), true, "turning the app switch off never overrides the device");
});

test("the switch is mirrored onto <html> for the stylesheet", () => {
  setReduceMotionPref(true);
  assert.equal(document.documentElement.hasAttribute(REDUCE_MOTION_ATTR), true);
  setReduceMotionPref(false);
  assert.equal(document.documentElement.hasAttribute(REDUCE_MOTION_ATTR), false);
  localStorage.setItem(REDUCE_MOTION_KEY, "1");
  syncReduceMotionAttr();
  assert.equal(document.documentElement.hasAttribute(REDUCE_MOTION_ATTR), true);
});

test("blocked storage reads as off and a failed save does not throw", () => {
  localStorage.getItem = () => { throw new Error("SecurityError"); };
  localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(getReduceMotionPref(), false);
  assert.doesNotThrow(() => setReduceMotionPref(true));
});

test("no window, no document: nothing reduces and nothing throws", () => {
  const { window: w, document: d } = globalThis;
  try {
    delete globalThis.window;
    delete globalThis.document;
    assert.equal(deviceReducesMotion(), false);
    assert.doesNotThrow(() => syncReduceMotionAttr());
  } finally {
    globalThis.window = w;
    globalThis.document = d;
  }
});

// --- the Profile switch ----------------------------------------------------------

const PROFILE = {
  name: "Alex", age: 30, gender: "unspecified", region: "Provinces",
  employment: "Office Worker", relationshipStatus: "Single",
  income: 15000, weight: 60, height: 170, birthMonth: null, birthDay: null
};

async function renderMotionCard() {
  const { renderProfile } = await import("../views/profile.js");
  const box = document.getElementById("pf-reduce-motion");
  const handlers = {};
  box.addEventListener = (type, fn) => { handlers[type] = fn; };
  renderProfile("main-view", { profile: PROFILE });
  const html = document.getElementById("main-view").innerHTML;
  const input = html.match(/<input[^>]*id="pf-reduce-motion"[^>]*>/)[0];
  return { box, handlers, html, input };
}

test("Profile: the switch starts off, labelled and described, and turns reduction on", async () => {
  const { box, handlers, html, input } = await renderMotionCard();
  assert.doesNotMatch(input, /\bchecked\b/);
  assert.doesNotMatch(input, /\bdisabled\b/);
  assert.match(input, /aria-describedby="pf-reduce-motion-note"/);
  assert.match(html, /<label class="conn-switch">\s*<input[^>]*id="pf-reduce-motion"[\s\S]*?Reduce motion<\/span>\s*<\/label>/);
  assert.match(html, /id="pf-reduce-motion-note">Keeps animations/);
  box.checked = true;
  handlers.change();
  assert.equal(localStorage.getItem(REDUCE_MOTION_KEY), "1");
  assert.equal(document.documentElement.hasAttribute(REDUCE_MOTION_ATTR), true);
  box.checked = false;
  handlers.change();
  assert.equal(isReduced(), false);
});

test("Profile: with the device reducing, the switch is checked, locked, and says why", async () => {
  device = true;
  const { html, input } = await renderMotionCard();
  assert.match(input, /\bchecked\b/);
  assert.match(input, /\bdisabled\b/);
  assert.match(html, /Your device already asks for less motion/);
});

test("Profile: a switch already on renders checked but still clearable", async () => {
  setReduceMotionPref(true);
  const { input } = await renderMotionCard();
  assert.match(input, /\bchecked\b/);
  assert.doesNotMatch(input, /\bdisabled\b/);
});

// --- motion-mount: one lifetime at a time -------------------------------------

test("a new mount ends the previous one", () => {
  const first = mountMotion();
  assert.equal(isMotionLive(), true);
  const second = mountMotion();
  assert.equal(first.signal.aborted, true);
  assert.equal(second.signal.aborted, false);
  disposeMotion();
  assert.equal(second.signal.aborted, true);
  assert.equal(isMotionLive(), false);
  assert.doesNotThrow(() => disposeMotion(), "disposing twice is safe");
});

test("disposing the mount stops a spring it started", async () => {
  const scope = mountMotion();
  let updates = 0;
  const done = spring({ from: [60], update: () => updates++, signal: scope.signal, reduced: "end" });
  await tick.advance(48);
  disposeMotion();
  const count = updates;
  await tick.advance(500);
  assert.equal(await done, false);
  assert.equal(updates, count);
});

test("listen() ties the listener to the mount's signal", () => {
  const scope = mountMotion();
  const calls = [];
  const target = { addEventListener: (type, fn, opts) => calls.push({ type, opts }) };
  scope.listen(target, "pointermove", () => {}, { passive: true });
  assert.equal(calls[0].type, "pointermove");
  assert.equal(calls[0].opts.signal, scope.signal);
  assert.equal(calls[0].opts.passive, true);
});

test("a child lifetime ends with the mount but not the other way round", () => {
  const scope = mountMotion();
  const one = scope.child();
  one.abort();
  assert.equal(one.signal.aborted, true);
  assert.equal(scope.signal.aborted, false);
  const two = scope.child();
  disposeMotion();
  assert.equal(two.signal.aborted, true);
});

test("writeMotionStyle writes transform and opacity only", () => {
  const el = makeNode("div");
  writeMotionStyle(el, { transform: "translate(1px, 2px)", opacity: 0.5 });
  assert.deepEqual(el.style.writes.map(w => w.prop), ["transform", "opacity"]);
  assert.throws(() => writeMotionStyle(el, { left: "4px" }), /not transform or opacity/);
  assert.throws(() => writeMotionStyle(el, { cssText: "left:4px" }), /not transform or opacity/);
  assert.deepEqual([...MOTION_STYLE_PROPS], ["transform", "opacity"]);
});

test("items and the mental-health notice never move", () => {
  const inItem = makeNode("span");
  inItem.closest = () => ({});
  assert.throws(() => writeMotionStyle(inItem, { opacity: 1 }), /never move/);
  assert.doesNotThrow(() => assertMayMove(makeNode("div")));
  assert.doesNotThrow(() => assertMayMove(null));
});

// --- runScene: render, park, play ---------------------------------------------

test("runScene renders, then parks in the same task, then plays", async () => {
  const order = [];
  const done = runScene({
    render: () => order.push("render"),
    park: () => order.push("park"),
    play: async () => { order.push("play"); return true; },
    reduced: "end"
  });
  assert.deepEqual(order, ["render", "park", "play"], "all three ran before the first await");
  assert.equal(await done, true);
});

test("reduced runScene keeps the rendered end state and skips park and play", async () => {
  setReduceMotionPref(true);
  const order = [];
  const scene = extra => runScene({
    render: () => order.push("render"),
    park: () => order.push("park"),
    play: async () => order.push("play"),
    ...extra
  });
  assert.equal(await scene({ reduced: "end" }), true);
  assert.deepEqual(order, ["render"]);
  assert.equal(await scene({ reduced: async () => order.push("fade") }), true);
  assert.deepEqual(order, ["render", "render", "fade"]);
});

test("a scene whose park or play throws is rendered again, then the error surfaces", async () => {
  for (const failing of ["park", "play"]) {
    let renders = 0;
    const boom = () => { throw new Error(`${failing} broke`); };
    const done = runScene({
      render: () => renders++,
      park: failing === "park" ? boom : () => {},
      play: failing === "play" ? async () => boom() : async () => true,
      reduced: "end"
    });
    await assert.rejects(done, new RegExp(`${failing} broke`));
    assert.equal(renders, 2, `${failing}: the finished markup is drawn again`);
    assert.equal(isMotionLive(), false);
  }
});

test("a failing scene that a newer view replaced does not draw over it", async () => {
  let renders = 0;
  const done = runScene({
    render: () => renders++,
    park() {},
    play: async () => {
      mountMotion(); // the next view mounts while this one is still playing
      throw new Error("late");
    },
    reduced: "end"
  });
  await assert.rejects(done, /late/);
  assert.equal(renders, 1);
  assert.equal(isMotionLive(), true, "the newer view's mount is left alone");
});

test("runScene needs a reduced path and reports a scene cut short", async () => {
  await assert.rejects(runScene({ render() {}, park() {}, play: async () => true }), /reduced path/);
  const done = runScene({
    render() {}, park() {},
    play: scope => animate({ duration: 500, update() {}, signal: scope.signal, reduced: "end" }),
    reduced: "end"
  });
  await tick.advance(64);
  disposeMotion();
  await tick.advance(16);
  assert.equal(await done, false);
});
