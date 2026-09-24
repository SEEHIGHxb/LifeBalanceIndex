// Motion guard 6: the frame budget. Run in CI by .github/workflows/ci.yml,
// not by `node --test` (it needs a live server and a real browser, which is
// why it is .mjs and not .test.mjs).
//
// Loads the real app, throttles Chrome's CPU 4x through CDP (the plan's stand-
// in for a low-end phone, decision 8), and drives a representative load
// through motion.js and motion-mount.js: two dozen pieces, each on the house
// curve plus a spring, the size of the heaviest Phase 1 scene. It passes when
// the 95th-percentile frame is under 34 ms, i.e. no worse than 30 fps.
//
// A shared CI runner is noisy, so the best of three attempts counts. A real
// regression (layout thrash, a write that is not transform or opacity) fails
// all three; one slow neighbour on the runner does not.
//
// Also checks the reduced path in the browser: with the device asking for
// reduced motion, an animation lands its end state without a single frame.
//
// Usage: node tests/motion-budget.mjs <base-url>
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8181";
const CPU_THROTTLE = 4;
const P95_BUDGET_MS = 34;
const ATTEMPTS = 3;
const PIECES = 24;
const RUN_MS = 1500;
const WARMUP_FRAMES = 3;

const problems = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();
page.on("pageerror", err => problems.push(`uncaught: ${err.message}`));

await page.goto(`${BASE}/`, { waitUntil: "load" });
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

// Runs in the page. Returns every frame interval seen while the load played.
const runLoad = ({ pieces, runMs }) => (async () => {
  const m = await import(new URL("motion.js", location.href).href);
  const mm = await import(new URL("views/motion-mount.js", location.href).href);
  const layer = document.createElement("div");
  layer.className = "motion-budget-layer";
  Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "9999" });
  const els = Array.from({ length: pieces }, (_, i) => {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute", left: `${(i % 6) * 60 + 20}px`, top: `${Math.floor(i / 6) * 120 + 120}px`,
      width: "14px", height: "14px", background: "#c9a45c", borderRadius: "50%"
    });
    layer.appendChild(el);
    return el;
  });
  document.body.appendChild(layer);

  const deltas = [];
  let recording = true;
  let last = performance.now();
  const sample = (now) => {
    deltas.push(now - last);
    last = now;
    if (recording) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);

  const scope = mm.mountMotion();
  await Promise.all(els.map((el, i) => Promise.all([
    m.animate({
      duration: runMs, delay: i * 20, ease: m.easeStar, signal: scope.signal, reduced: "end",
      update: v => mm.writeMotionStyle(el, {
        transform: `translate(${Math.cos(i) * 90 * v}px, ${Math.sin(i) * 90 * v}px) rotate(${v * 180}deg)`,
        opacity: 1 - v * 0.6
      })
    }),
    m.spring({
      from: [1.8], to: [1], signal: scope.signal, reduced: "end",
      update: () => {}
    })
  ])));
  recording = false;
  mm.disposeMotion();
  layer.remove();
  return deltas;
})();

const p95 = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
};

const results = [];
for (let i = 0; i < ATTEMPTS; i++) {
  const deltas = (await page.evaluate(runLoad, { pieces: PIECES, runMs: RUN_MS })).slice(WARMUP_FRAMES);
  results.push({ p95: p95(deltas), frames: deltas.length });
  if (results.at(-1).p95 < P95_BUDGET_MS) break;
}
const best = results.reduce((a, b) => (b.p95 < a.p95 ? b : a));
const summary = results.map(r => `${r.p95.toFixed(1)} ms over ${r.frames} frames`).join("; ");
if (best.frames < 20) problems.push(`too few frames to judge (${summary})`);
if (best.p95 >= P95_BUDGET_MS) {
  problems.push(`p95 frame ${best.p95.toFixed(1)} ms at ${CPU_THROTTLE}x CPU, budget ${P95_BUDGET_MS} ms (${summary})`);
}

// The reduced path, in a real browser: the end state, no frames.
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
const reduced = await page.evaluate(async () => {
  const m = await import(new URL("motion.js", location.href).href);
  const seen = [];
  const done = await m.animate({ duration: 800, update: v => seen.push(v), reduced: "end" });
  return { done, seen };
});
if (!reduced.done || reduced.seen.length !== 1 || reduced.seen[0] !== 1) {
  problems.push(`reduced animate should land 1 in one call, got ${JSON.stringify(reduced)}`);
}

await browser.close();

if (problems.length) {
  console.error(`motion budget: FAIL\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`motion budget: ok (best p95 ${best.p95.toFixed(1)} ms at ${CPU_THROTTLE}x CPU; ${summary}); reduced path lands at once`);
