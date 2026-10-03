// tests/asterism-mark.test.mjs - the Landing's mark (v187): eight region
// stars joined into an asterism, the bigger section labels and the quiet
// source list that came with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { asterismPoints, treeEdges, asterismMarkup } from "../views/asterism-mark.js";
import { CHAPTERS } from "../views/journey.js";
import { sourceList, splitSourceLabel } from "../views/helpers.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// A fixed sequence, so a test draws the same asterism every run.
const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

test("one star per region, inside the picture's ring", () => {
  const pts = asterismPoints(seeded());
  assert.equal(pts.length, CHAPTERS.length);
  for (const [x, y] of pts) {
    const r = Math.hypot(x, y);
    assert.ok(r >= 52 - 1e-9 && r <= 104 + 1e-9, `star at radius ${r}`);
  }
});

test("the thread is a tree: seven links reach all eight stars, no loop", () => {
  const edges = treeEdges(asterismPoints(seeded(42)));
  assert.equal(edges.length, CHAPTERS.length - 1);
  const reached = new Set([0]);
  for (const [a, b] of edges) {
    assert.ok(reached.has(a), "each link grows from a star already joined");
    assert.ok(!reached.has(b), "and reaches a new one");
    reached.add(b);
  }
  assert.equal(reached.size, CHAPTERS.length);
});

test("the markup draws each star in its region's hue, threads with a unit length", () => {
  const svg = asterismMarkup(asterismPoints(seeded(3)));
  assert.match(svg, /^<svg class="asterism" viewBox="-120 -120 240 240">/);
  assert.equal(svg.match(/class="asterism-thread" pathLength="1"/g).length, 7);
  for (const c of CHAPTERS) assert.ok(svg.includes(`--hue: ${c.hue};`), `${c.region} star missing`);
});

test("the Landing's hero is the asterism, and a tap draws a new one", async () => {
  const { landingMarkup } = await import("../views/landing.js");
  const hero = landingMarkup().match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  assert.match(hero, /<div class="mark"><svg class="asterism"/);
  assert.doesNotMatch(hero, /#star"/, "the gilt star is gone from the Landing");
  assert.match(read("views/landing.js"), /bindAsterismRedraw\(container\)/);
  assert.match(read("views/asterism-mark.js"), /mark\.innerHTML = asterismMarkup\(\)/);
});

test("the asterism animates once and stands still under reduced motion", () => {
  const css = read("css/stage-page.css");
  assert.match(css, /\.asterism-thread \{[^}]*stroke-dasharray: 1;[^}]*animation: asterism-draw/);
  assert.doesNotMatch(css, /asterism-(?:draw|pop)[^;]*infinite/, "no endless loop");
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.asterism-thread,\s*\.asterism-star \{ animation: none; \}/);
  assert.match(css, /html\[data-reduce-motion\] \.asterism-thread,\s*html\[data-reduce-motion\] \.asterism-star,/);
});

test("section labels read at 15px or more", () => {
  assert.match(read("css/stage-page.css"), /\.stage-page \.label \{[^}]*font-size: max\(15px,/);
  assert.match(read("css/journey.css"), /\.journey \.label \{[^}]*font-size: 15px;/);
  assert.match(read("css/weekly.css"), /\.aspect-page \.chapter-label \{[^}]*font-size: 15px;/);
  assert.doesNotMatch(read("css/stage-page.css"), /\.stage-page \.label \{ font-size: max\(11px/);
});

test("a source's bracketed detail moves to its own grey line", () => {
  assert.deepEqual(splitSourceLabel("NSO Survey (avg. wage ~15,972 THB, Q3 2025)"), { name: "NSO Survey", detail: "avg. wage ~15,972 THB, Q3 2025" });
  assert.deepEqual(splitSourceLabel("Survey (2014). Table 2 notes"), { name: "Survey (2014). Table 2 notes", detail: "" });
  assert.deepEqual(splitSourceLabel("Plain name"), { name: "Plain name", detail: "" });
  const html = sourceList([{ url: "https://example.org", label: "A <b> (detail)" }]);
  assert.match(html, /<span class="fn-src-name">A &lt;b&gt;<\/span><span class="fn-src-detail">detail<\/span>/);
  assert.match(html, /<span class="fn-src-arrow" aria-hidden="true">↗<\/span>/);
  assert.doesNotMatch(read("css/home.css"), /\.fn-sources \{[^}]*padding-left/, "no bullet indent");
});

test("Goals and the Year review wear the asterism on their tops (v188)", () => {
  for (const p of ["views/quests.js", "views/yearreview.js"]) {
    const src = read(p);
    assert.match(src, /mark: asterismMarkup\(\)|mark,\n/, `${p} top is not the asterism`);
    assert.match(src, /bindAsterismRedraw\(/, `${p} does not redraw on tap`);
    assert.doesNotMatch(src, /mark: STAR_SVG/, `${p} still wears the gilt star`);
  }
  // Goals redraws itself on every pledge change: it keeps its asterism, still.
  assert.match(read("views/quests.js"), /asterismMarkup\(goalsSky, \{ still: Boolean\(redrawn\) \}\)/);
  assert.match(asterismMarkup(asterismPoints(seeded()), { still: true }), /^<svg class="asterism is-still"/);
  assert.match(read("css/stage-page.css"), /\.asterism\.is-still \.asterism-star \{ animation: none; \}/);
});
