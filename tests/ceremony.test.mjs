// views/ceremony.js: the ring unfolding into the radar (Phase 4). The radar is
// drawn by the real chart.js into the stub, then the ceremony is driven by
// hand through makeClock(), so every pose is read at an exact time.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installDom, makeClock, makeNode } from "./dom-stub.mjs";

let device = false;
let tick;
let dom;

installDom();
const { setClock } = await import("../motion.js");
const { disposeMotion } = await import("../views/motion-mount.js");
const { playRadarCeremony, bindRadarCeremony, disposeCeremony, readPlot, ceremonyMs, RING_START } = await import("../views/ceremony.js");
const { renderRadarChart } = await import("../chart.js");

const SCORES = {
  finance: 40, physical: 72, mental: 55, relationships: 90,
  personalGoals: 30, socialContribution: 65, environment: 80, humanityFuture: 50
};

beforeEach(() => {
  dom = installDom();
  device = false;
  globalThis.window = { matchMedia: () => ({ matches: device }) };
  tick = makeClock();
  setClock(tick);
  disposeMotion();
});

// The stub's nodes have no selector engine; give the svg one over the nodes
// chart.js created, matching the ".class" lists the ceremony asks for.
function drawRadar(scores = SCORES) {
  renderRadarChart("radar", scores, { average: SCORES });
  // Not the probe svg chart.js measures its labels in: the radar itself.
  const svg = dom.nodes.find(n => n.attributes.class === "radar-svg");
  const inside = () => dom.nodes.filter(n => n !== svg && !n.removed);
  const matches = (n, sel) => sel.split(",").some(s => (n.attributes.class || "").split(" ").includes(s.trim().slice(1)));
  svg.querySelectorAll = (sel) => inside().filter(n => matches(n, sel));
  svg.querySelector = (sel) => svg.querySelectorAll(sel)[0] || null;
  svg.insertBefore = (child) => child;
  return svg;
}

// Every node the stub creates can be removed and says so.
function trackRemoval() {
  const make = globalThis.document.createElementNS;
  globalThis.document.createElementNS = (ns, tag) => {
    const node = make(ns, tag);
    node.remove = () => { node.removed = true; };
    return node;
  };
}

const last = (el, prop) => el.style.writes.filter(w => w.prop === prop).at(-1)?.value;
// chart.js sets fonts on its labels; motion is transform and opacity.
const moved = (el) => el.style.writes.some(w => (w.prop === "transform" || w.prop === "opacity") && w.value !== "");
const ring = () => dom.nodes.find(n => (n.attributes.class || "") === "radar-ring");
const shape = (svg) => svg.querySelector(".radar-shape");

function parts(svg) {
  return {
    shape: shape(svg),
    vertices: svg.querySelectorAll(".radar-vertex"),
    bloom: svg.querySelector(".radar-bloom"),
    fades: svg.querySelectorAll(".radar-label, .radar-score, .radar-average")
  };
}

function burstLayer() {
  const layer = makeNode("div");
  layer.appendChild = (child) => { layer.childNodes.push(child); child.remove = () => { layer.childNodes = layer.childNodes.filter(c => c !== child); }; return child; };
  return layer;
}

test("readPlot: the radar as drawn is the end state; the ring is 0.725 of its radius", () => {
  const svg = drawRadar();
  const plot = readPlot(svg);
  assert.equal(plot.target.length, 8);
  assert.equal(plot.points, shape(svg).getAttribute("points"));
  for (const [x, y] of plot.start) {
    const d = Math.hypot(x - plot.cx, y - plot.cy);
    assert.ok(Math.abs(d - plot.r * RING_START) < 1e-6, `start point at ${d}, not ${plot.r * RING_START}`);
  }
  assert.equal(readPlot(makeNode("svg")), null, "no radar, nothing to animate");
});

test("playRadarCeremony: parks on the ring, unfolds, lands exactly on the drawn radar, then one burst", async () => {
  trackRemoval();
  const svg = drawRadar();
  const drawn = shape(svg).getAttribute("points");
  const layer = burstLayer();
  const done = playRadarCeremony({ svg, layer });
  const p = parts(svg);
  assert.ok(ring(), "the ring is drawn for the handover");
  assert.equal(last(p.shape, "opacity"), "0", "the shape waits for the ring");
  assert.notEqual(p.shape.getAttribute("points"), drawn, "parked on the ring, not the result");
  for (const el of p.fades) assert.equal(last(el, "opacity"), "0");
  assert.match(last(p.bloom, "transform"), /scale\(0\.725\)/);

  await tick.advance(ceremonyMs() + 16);
  assert.equal(p.shape.getAttribute("points"), drawn, "every region lands exactly on its score");
  assert.ok(ring().removed, "the ring hands over and goes");
  assert.equal(layer.childNodes.length, 8, "one burst of eight");
  for (const el of [p.shape, p.bloom, ...p.vertices, ...p.fades]) {
    assert.equal(last(el, "transform") ?? "", "");
    assert.equal(last(el, "opacity") ?? "", "");
  }
  await tick.advance(1000);
  assert.equal(await done, true);
  assert.equal(layer.childNodes.length, 0, "the burst clears itself away");
});

test("playRadarCeremony: the same length for every reader; only the distance is theirs", async () => {
  const ends = [];
  for (const scores of [SCORES, Object.fromEntries(Object.keys(SCORES).map(k => [k, 5]))]) {
    dom = installDom();
    const svg = drawRadar(scores);
    const drawn = shape(svg).getAttribute("points");
    const done = playRadarCeremony({ svg, layer: burstLayer() });
    await tick.advance(ceremonyMs() - 48);
    const early = shape(svg).getAttribute("points") === drawn;
    await tick.advance(64);
    ends.push({ early, landed: shape(svg).getAttribute("points") === drawn });
    await tick.advance(1000);
    await done;
  }
  assert.deepEqual(ends, [{ early: false, landed: true }, { early: false, landed: true }]);
});

test("playRadarCeremony: Skip lands the radar at once, with no burst", async () => {
  trackRemoval();
  const svg = drawRadar();
  const drawn = shape(svg).getAttribute("points");
  const layer = burstLayer();
  const skip = makeNode("button");
  const handlers = {};
  skip.addEventListener = (type, fn) => { handlers[type] = fn; };
  skip.hidden = true;
  const done = playRadarCeremony({ svg, layer, skip });
  await tick.advance(400);
  assert.equal(skip.hidden, false, "Skip is offered while it plays");
  handlers.click();
  await tick.advance(32);
  assert.equal(await done, true);
  assert.equal(skip.hidden, true);
  assert.equal(shape(svg).getAttribute("points"), drawn);
  assert.ok(ring().removed);
  assert.equal(layer.childNodes.length, 0, "skipped: no burst");
});

test("playRadarCeremony: a replay mid-flight reads the radar as drawn, not the run in progress", async () => {
  trackRemoval();
  const svg = drawRadar();
  const drawn = shape(svg).getAttribute("points");
  const first = playRadarCeremony({ svg, layer: burstLayer() });
  await tick.advance(700);
  const second = playRadarCeremony({ svg, layer: burstLayer() });
  await tick.advance(ceremonyMs() + 1000);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(shape(svg).getAttribute("points"), drawn);
});

test("playRadarCeremony: with reduced motion the radar is simply there", async () => {
  device = true;
  const svg = drawRadar();
  const drawn = shape(svg).getAttribute("points");
  assert.equal(await playRadarCeremony({ svg, layer: burstLayer() }), true);
  const p = parts(svg);
  for (const el of [p.shape, p.bloom, ...p.vertices, ...p.fades]) assert.ok(!moved(el));
  assert.equal(p.shape.getAttribute("points"), drawn);
  assert.equal(ring(), undefined, "no ring was drawn");
});

test("bindRadarCeremony: Play is offered only with motion, and steps aside while it plays", () => {
  for (const reduced of [false, true]) {
    dom = installDom();
    device = reduced;
    disposeMotion();
    const svg = drawRadar();
    const play = makeNode("button");
    play.hidden = false;
    bindRadarCeremony({ svg, layer: burstLayer(), play, skip: makeNode("button"), autoplay: true });
    // No IntersectionObserver in node: with motion, the autoplay starts at once.
    assert.equal(play.hidden, true, reduced ? "reduced: no Play at all" : "Play steps aside while it runs");
    assert.equal(!!ring(), !reduced, reduced ? "reduced: no autoplay" : "the autoplay started");
  }
});

test("bindRadarCeremony: the autoplay waits until the radar is on screen, and plays once", () => {
  const observers = [];
  globalThis.IntersectionObserver = class {
    constructor(cb, opts) { this.cb = cb; this.opts = opts; this.off = false; observers.push(this); }
    observe(el) { this.el = el; }
    disconnect() { this.off = true; }
  };
  try {
    const svg = drawRadar();
    svg.isConnected = true;
    bindRadarCeremony({ svg, layer: burstLayer(), autoplay: true });
    assert.equal(observers.length, 1);
    assert.equal(observers[0].opts.threshold, 0.5, "half the radar on screen");
    assert.equal(ring(), undefined, "off screen: nothing plays yet");
    observers[0].cb([{ isIntersecting: false }]);
    assert.equal(ring(), undefined);
    observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.1 }]);
    assert.equal(ring(), undefined, "a sliver on screen is not enough");
    observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.6 }]);
    assert.ok(ring(), "on screen: it plays");
    assert.equal(observers[0].off, true, "and only once");

    // A dashboard redrawn before the radar was seen: nothing to play.
    dom = installDom();
    disposeMotion();
    const gone = drawRadar();
    gone.isConnected = false;
    bindRadarCeremony({ svg: gone, layer: burstLayer(), autoplay: true });
    observers[1].cb([{ isIntersecting: true, intersectionRatio: 1 }]);
    assert.equal(ring(), undefined);
    assert.equal(observers[1].off, true);
  } finally {
    delete globalThis.IntersectionObserver;
  }
});

test("disposeCeremony: a dashboard left before its radar was seen stops watching it", () => {
  const observers = [];
  globalThis.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; this.off = false; observers.push(this); }
    observe() {}
    disconnect() { this.off = true; }
  };
  try {
    bindRadarCeremony({ svg: drawRadar(), layer: burstLayer(), autoplay: true });
    assert.equal(observers[0].off, false, "watching, not yet seen");
    disposeCeremony();
    assert.equal(observers[0].off, true, "renderActiveTab's teardown ends it");
    // A second bind replaces a watcher that is still live.
    bindRadarCeremony({ svg: drawRadar(), layer: burstLayer(), autoplay: true });
    bindRadarCeremony({ svg: drawRadar(), layer: burstLayer(), autoplay: true });
    assert.equal(observers[1].off, true);
    assert.equal(observers[2].off, false);
    disposeCeremony();
  } finally {
    delete globalThis.IntersectionObserver;
  }
});

test("bindRadarCeremony: with no radar on the page, nothing is wired", () => {
  assert.doesNotThrow(() => bindRadarCeremony({ svg: null, autoplay: true }));
});
