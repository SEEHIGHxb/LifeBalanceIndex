// The seven motion guards. docs/interactive-web-plan.md §6, Phase 2:
//
//   1. every animation has a reduced path
//   2. no motion on items (or on the mental-health notice)
//   3. no global listeners outside the mount
//   4. transform and opacity only
//   5. APP_SHELL and ?v= parity for the motion modules
//   6. a frame budget under a 4x CPU throttle
//   7. the Thai splitter keeps marks attached
//
// Where a rule can be enforced at runtime it is (motion.js throws without a
// reduced path; motion-mount refuses other style properties and still
// elements), and the runtime behaviour is unit-tested in motion.test.mjs.
// These guards are the other half: they stop code from routing AROUND those
// checks, which a runtime check cannot see. Phases 3 to 5 must pass them
// without new exceptions.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { installDom, makeClock, makeNode } from "./dom-stub.mjs";

installDom();
const { setClock, spring, animate, follow, loop } = await import("../motion.js");
const { writeMotionStyle, runScene, STILL_SELECTOR, MOTION_STYLE_PROPS } = await import("../views/motion-mount.js");
const { instrumentBlock } = await import("../views/instrument-forms.js");
const { mentalHealthNotice } = await import("../views/helpers.js");
const { graphemes } = await import("../i18n.js");

const ROOT = new URL("../", import.meta.url);
const read = rel => readFileSync(new URL(rel, ROOT), "utf8");

// Whole-line and block comments out, so a comment that NAMES a banned pattern
// (as the typewriter's note on charAt does) is not mistaken for a use of it.
// Trailing `// ...` after code is deliberately NOT stripped: telling it apart
// from a `//` inside a string ("a.com,//b.com") needs a tokenizer, and a
// regex that guesses wrong deletes real code from every guard's view. Kept
// in, a trailing comment can at worst fail a guard loudly, never hide a use.
const code = rel => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const viewFiles = readdirSync(new URL("views/", ROOT)).filter(f => f.endsWith(".js")).map(f => `views/${f}`);
const rootFiles = readdirSync(ROOT).filter(f => f.endsWith(".js") && f !== "sw.js");
const APP_CODE = [...rootFiles, ...viewFiles];
const MOTION_CORE = ["motion.js", "views/motion-mount.js"];

// --- 1. every animation has a reduced path ----------------------------------

test("guard 1: every motion entry point throws without a reduced path", async () => {
  const update = () => {};
  assert.throws(() => animate({ duration: 1, update }), /reduced path/);
  assert.throws(() => spring({ from: [1], update }), /reduced path/);
  assert.throws(() => follow({ from: [1], update }), /reduced path/);
  assert.throws(() => loop({ step: () => false }), /reduced path/);
  await assert.rejects(runScene({ render() {}, park() {}, play: async () => true }), /reduced path/);
});

test("guard 1: script motion outside motion.js asks for reduced motion first", () => {
  // WAAPI, timers and smooth scrolls do not pass through motion.js, so the
  // sheet cannot reach them and neither can its runtime check. Each site must
  // ask prefersReducedMotion() (or isReduced()) within the 12 lines before it.
  const SITES = /\.animate\(|setInterval\(|requestAnimationFrame\(|scrollIntoView\(/;
  const ASKS = /prefersReducedMotion\(\)|isReduced\(\)/;
  const offenders = [];
  for (const file of APP_CODE.filter(f => !MOTION_CORE.includes(f))) {
    const lines = code(file).split("\n");
    lines.forEach((line, i) => {
      if (!SITES.test(line)) return;
      const window = lines.slice(Math.max(0, i - 12), i + 3).join("\n");
      if (!ASKS.test(window)) offenders.push(`${file}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `motion with no reduced path:\n${offenders.join("\n")}`);
});

test("guard 1: every call into motion.js names its reduced path", () => {
  const CALL = /\b(animate|spring|follow|loop|runScene)\(\{/g;
  const offenders = [];
  for (const file of APP_CODE.filter(f => !MOTION_CORE.includes(f))) {
    const src = code(file);
    if (!/from "\.\.?\/(views\/)?motion(-mount)?\.js"/.test(src)) continue;
    for (const m of src.matchAll(CALL)) {
      if (!/\breduced\s*:/.test(src.slice(m.index, m.index + 600))) {
        offenders.push(`${file}: ${m[1]}() at offset ${m.index}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

// --- 2. no motion on items ---------------------------------------------------

test("guard 2: the still selector matches the markup items and the notice really use", () => {
  // If the item markup changes and the selector does not, motion-mount's
  // refusal silently stops covering the answers. Render the real thing.
  const item = instrumentBlock("who5");
  assert.match(item, /role="radiogroup"/);
  assert.match(item, /<fieldset class="survey-question"/);
  const notice = mentalHealthNotice({ title: "t", body: "b", resources: [{ label: "l", tel: "1323" }] });
  assert.match(notice, /class="care-banner"/);
  for (const part of ['[role="radiogroup"]', "fieldset.survey-question", ".care-banner"]) {
    assert.ok(STILL_SELECTOR.includes(part), `STILL_SELECTOR lost ${part}`);
  }
});

test("guard 2: the modules that render items do not import motion", () => {
  for (const file of ["views/instrument-forms.js"]) {
    assert.doesNotMatch(read(file), /motion(-mount)?\.js/, `${file} renders items and must not animate`);
  }
});

// --- 3. no global listeners outside the mount --------------------------------

test("guard 3: views listen on window or document only through the mount", () => {
  // The mount's listen() ties a listener to the view's lifetime. The one
  // older pattern allowed alongside it is a listener the SAME file removes by
  // name (openDialog's Escape handler); anything else outlives its view.
  const GLOBAL_ADD = /\b(window|document)\.addEventListener\(\s*"([^"]+)",\s*([A-Za-z_$][\w$]*)/g;
  const offenders = [];
  for (const file of [...viewFiles, "motion.js"]) {
    const src = code(file);
    for (const m of src.matchAll(GLOBAL_ADD)) {
      const [, target, type, handler] = m;
      const removed = new RegExp(`\\b${target}\\.removeEventListener\\(\\s*"${type}",\\s*${handler}\\b`);
      if (!removed.test(src)) offenders.push(`${file}: ${target} "${type}" ${handler}`);
    }
    for (const m of src.matchAll(/\b(window|document)\.addEventListener\(\s*"[^"]+",\s*(\(|function|async)/g)) {
      offenders.push(`${file}: anonymous ${m[1]} listener at offset ${m.index} can never be removed`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

// --- 4. transform and opacity only -------------------------------------------

test("guard 4: the stub's style log sees every way of writing a style", () => {
  // The guard below is only as good as this detector: the Phase 1 check was a
  // source grep and missed bracket writes and cssText.
  const el = makeNode("div");
  el.style.left = "1px";
  el.style["top"] = "2px";
  el.style.cssText = "width:3px";
  el.style.setProperty("height", "4px");
  assert.deepEqual(el.style.writes.map(w => w.prop), ["left", "top", "cssText", "height"]);
});

test("guard 4: a spring driven through the mount writes transform and opacity only", async () => {
  const tick = makeClock();
  setClock(tick);
  const el = makeNode("div");
  const done = spring({
    from: [60, 0.2], to: [0, 1],
    update: ([x, o]) => writeMotionStyle(el, { transform: `translateX(${x}px)`, opacity: o }),
    reduced: "end"
  });
  await tick.advance(1200);
  assert.equal(await done, true);
  assert.ok(el.style.writes.length > 10);
  const other = el.style.writes.filter(w => !MOTION_STYLE_PROPS.includes(w.prop));
  assert.deepEqual(other, []);
});

test("guard 4: animated views write styles only through writeMotionStyle", () => {
  const STYLE_WRITE = /\.style(\.[a-zA-Z]+|\[[^\]]+\])\s*=(?!=)|\.cssText\s*=|\.style\.setProperty\(/;
  assert.doesNotMatch(code("motion.js"), /\.style\b/, "motion.js computes numbers and never touches the DOM");
  for (const file of viewFiles.filter(f => f !== "views/motion-mount.js")) {
    const src = code(file);
    if (!/from "\.\/motion-mount\.js"/.test(src)) continue;
    assert.doesNotMatch(src, STYLE_WRITE, `${file} animates, so its style writes must go through writeMotionStyle`);
  }
});

// --- 5. APP_SHELL and ?v= parity --------------------------------------------

test("guard 5: the motion modules are precached and deployed", () => {
  // Version parity for every shell entry is consistency.test.mjs's job; this
  // pins the two new modules so they cannot be dropped from the offline shell
  // or the deploy copy.
  const shell = read("sw.js");
  for (const f of MOTION_CORE) assert.ok(shell.includes(`"./${f}"`), `sw.js APP_SHELL lacks ./${f}`);
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /cp [^\n]*\*\.js _site\//, "the deploy step must copy root *.js (motion.js)");
  assert.match(ci, /cp views\/\*\.js _site\/views\//, "the deploy step must copy views/*.js (motion-mount.js)");
});

// --- 6. frame budget under 4x CPU ----------------------------------------------

test("guard 6: CI runs the frame-budget check at a 4x CPU throttle", () => {
  // The budget itself needs a real browser, so it lives in
  // tests/motion-budget.mjs and runs in the smoke job. This keeps it wired in.
  assert.match(read(".github/workflows/ci.yml"), /node tests\/motion-budget\.mjs/);
  const budget = read("tests/motion-budget.mjs");
  assert.match(budget, /CPU_THROTTLE\s*=\s*4\b/);
  assert.match(budget, /P95_BUDGET_MS\s*=\s*34\b/);
});

// --- 7. the Thai splitter keeps marks attached ----------------------------------

test("guard 7: nothing splits display text by code unit", () => {
  const BANNED = /\.split\(\s*(""|'')\s*\)|\.charAt\(/;
  const offenders = APP_CODE.filter(f => BANNED.test(code(f)));
  assert.deepEqual(offenders, [], "split per letter with graphemes() from i18n.js");
});

test("guard 7: a region title splits into whole Thai clusters", () => {
  assert.deepEqual(graphemes("ที่ราบสูง"), ["ที่", "ร", "า", "บ", "สู", "ง"]);
});

// --- the sheet's half of reduced motion ------------------------------------------

test("the in-app switch mirrors every rule of the device's reduced block", () => {
  const css = read("index.css");
  const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)[1];
  const rules = s => s.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const device = rules(block);
  const app = [...css.matchAll(/^html\[data-reduce-motion\] (.+)$/gm)].map(m => m[1].trim());
  assert.ok(device.length > 0);
  assert.deepEqual(app, device);
});
