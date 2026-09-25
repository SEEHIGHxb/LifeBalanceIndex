// tests/chart.test.mjs - the radar's geometry (chart.js radarPoints), which
// the share card draws its star from. The on-screen radar chart and its radius
// solve went with the redesign (R5), and their tests with them.

import { test } from "node:test";
import assert from "node:assert/strict";

import { radarPoints, RADAR_KEYS } from "../chart.js";

const ASPECTS = {
  finance: 55, physical: 62, mental: 71, relationships: 48,
  personalGoals: 70, socialContribution: 44, environment: 58, humanityFuture: 51
};

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
