// tests/chart.test.mjs - the radar's geometry, which was the least-tested code
// in the repo at 21.44% of lines and 40% of functions.
//
// WHY IT WAS UNTESTED, AND WHY THAT WAS THE WRONG PLACE TO STOP. chart.js
// builds its SVG node by node, so it needs a document; the unit suite had none
// that could createElementNS, so only the pure helpers were ever reached. What
// went uncovered was not decoration — it is the RADIUS SOLVE, roughly 60 lines
// of trigonometry whose comments record a specific shipped bug: on a 375px
// phone the axis labels started at negative x and their first letters were
// simply missing off the side of the card.
//
// tests/e2e.mjs does check that today, by measuring drawn label extents in a
// real browser. That is the stronger check and it stays. But it runs under
// Playwright in a separate CI job, so a regression here fails late, in the slow
// job, with a pixel measurement to interpret. These tests fail in 20ms with the
// arithmetic in the message.
//
// WHY THE NUMBERS ARE STABLE. The stub has no layout engine, so
// getComputedTextLength is absent and chart.js takes its own documented
// fallback: `label.length * LABEL_FONT_PX * 0.6`. Every width, and therefore
// every radius, is then a pure function of the label strings and the container
// width. That is a real code path — it is what any engine reporting zero would
// hit — and it makes the solve reproducible.

import { test } from "node:test";
import assert from "node:assert/strict";

import { installDom } from "./dom-stub.mjs";
import { radarPoints, RADAR_KEYS, ASPECT_LABELS } from "../chart.js";

const ASPECTS = {
  finance: 55, physical: 62, mental: 71, relationships: 48,
  personalGoals: 70, socialContribution: 44, environment: 58, humanityFuture: 51
};

// From chart.js. Duplicated deliberately: if someone changes the constants
// there, these tests should fail and make them think about the label bounds,
// not silently follow along.
const MIN_RADIUS_PX = 20;
const MAX_RADIUS_PX = 146;

// A render produces THREE kinds of <text>, and only one of them is an axis
// label: eight unpositioned probes inside the measuring SVG, eight positioned
// axis labels, and eight positioned score numbers. The probes carry no
// attributes at all (measureLabelWidths only sets style and textContent), and
// the score numbers are numeric, so the axis labels are the positioned
// non-numeric ones.
function axisLabels(nodes) {
  return nodes.filter(n =>
    n.tagName === "text" &&
    n.getAttribute("x") !== null &&
    Number.isNaN(Number(n.textContent))
  );
}

function drawRadar({ width }) {
  const dom = installDom({ width });
  return import("../chart.js").then(({ renderRadarChart }) => {
    renderRadarChart("radar", ASPECTS);
    const svg = dom.nodes.find(n => n.tagName === "svg" && n.getAttribute("viewBox"));
    return { dom, svg, texts: axisLabels(dom.nodes) };
  });
}

// --- the pure helper -----------------------------------------------------

test("radarPoints returns one vertex per axis, clockwise from the top", () => {
  const pts = radarPoints(ASPECTS, RADAR_KEYS, 100, 100, 50);
  assert.equal(pts.length, 8);
  // The first axis points straight up: same x as the centre, smaller y.
  assert.ok(Math.abs(pts[0].x - 100) < 1e-9, "the first vertex is not on the vertical axis");
  assert.ok(pts[0].y < 100, "the first vertex is below the centre, not above it");
});

test("radarPoints clamps out-of-range values instead of drawing outside the rim", () => {
  const rim = radarPoints({ finance: 100 }, ["finance"], 0, 0, 50)[0];
  const over = radarPoints({ finance: 999 }, ["finance"], 0, 0, 50)[0];
  const under = radarPoints({ finance: -50 }, ["finance"], 0, 0, 50)[0];
  const centre = radarPoints({ finance: 0 }, ["finance"], 0, 0, 50)[0];

  assert.deepEqual(over, rim, "a value above 100 escaped the rim");
  assert.deepEqual(under, centre, "a negative value crossed the centre");
});

// --- the radius solve ----------------------------------------------------

test("every axis label is drawn inside the container, at both phone and desktop width", async () => {
  // THE SHIPPED BUG THIS REPRODUCES: labels whose drawn extent ran past x = 0.
  // Each label's extent is its anchor x plus or minus its measured width,
  // depending on text-anchor — exactly what the solve in chart.js budgets for.
  for (const width of [320, 375, 414, 768, 1280]) {
    const { texts } = await drawRadar({ width });
    assert.equal(texts.length, 8, `${width}px: expected eight axis labels`);

    for (const node of texts) {
      const x = Number(node.getAttribute("x"));
      const anchor = node.getAttribute("text-anchor");
      const measured = node.textContent.length * 11 * 0.6;
      const left = anchor === "end" ? x - measured : anchor === "middle" ? x - measured / 2 : x;
      const right = anchor === "end" ? x : anchor === "middle" ? x + measured / 2 : x + measured;

      assert.ok(left >= 0, `${width}px: "${node.textContent}" starts at x=${left.toFixed(1)}, off the left edge`);
      assert.ok(right <= width, `${width}px: "${node.textContent}" ends at x=${right.toFixed(1)}, past the ${width}px edge`);
    }
  }
});

test("the chart grows with the container and then stops growing", async () => {
  const phone = await drawRadar({ width: 320 });
  const desktop = await drawRadar({ width: 1280 });
  const huge = await drawRadar({ width: 4000 });

  const h = r => Number(r.svg.getAttribute("height"));
  assert.ok(h(phone) < h(desktop), "a wider container did not produce a larger chart");
  assert.equal(h(desktop), h(huge), "the radius cap did not hold on a very wide window");

  // The cap is on the radius; the height derives from it, so bound the height
  // by what the maximum radius can produce rather than restating the formula.
  assert.ok(h(huge) <= 2 * (MAX_RADIUS_PX + 22 + 11 + 40), "the derived height exceeds what MAX_RADIUS_PX allows");
});

test("a pathologically long label cramps the chart instead of collapsing it", async () => {
  // The floor exists because a translation can make the binding label wide
  // enough to solve for a negative radius. A cramped chart is honest; an
  // inverted or invisible one is not.
  const original = ASPECT_LABELS.environment;
  ASPECT_LABELS.environment = "E".repeat(120);
  try {
    const { svg, texts } = await drawRadar({ width: 320 });
    assert.equal(texts.length, 8, "the chart stopped drawing axes under pressure");
    assert.ok(Number(svg.getAttribute("height")) >= 2 * MIN_RADIUS_PX, "the chart collapsed below its floor");
  } finally {
    ASPECT_LABELS.environment = original;
  }
});

test("the radar is described to assistive technology, with every score in it", async () => {
  // The radar was silent to screen readers until a review caught it. The label
  // must carry the numbers, not just say "chart".
  const { svg } = await drawRadar({ width: 360 });
  const label = svg.getAttribute("aria-label");
  assert.ok(label && label.length > 0, "the radar has no accessible name");
  for (const key of RADAR_KEYS) {
    assert.ok(
      label.includes(String(ASPECTS[key])),
      `the accessible name omits the ${key} score`
    );
  }
});
