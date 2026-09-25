// chart.js - the eight aspects' labels, their order, and the geometry of
// your star: Home, Side by Side and the share card (story-card.js) all draw
// it from here. The on-screen radar chart that lived here went with the
// redesign.

export const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

// The axis ORDER of the radar, clockwise from the top: the share card draws
// its eight points in this order.
export const RADAR_KEYS = [
  "finance",
  "physical",
  "mental",
  "relationships",
  "personalGoals",
  "socialContribution",
  "environment",
  "humanityFuture"
];

// Vertex coordinates for one radar polygon: eight points, clockwise from the
// top, each pulled in from the rim in proportion to its 0-100 value.
//
// Pure and rendering-agnostic on purpose. Values outside 0-100 are clamped
// rather than allowed to escape the rim, and a missing value reads as 0.
const clampScore = (v) => {
  const raw = Number(v);
  return Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
};

export function radarPoints(values, keys, cx, cy, radius) {
  return keys.map((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const value = clampScore((values || {})[key]);
    return {
      key,
      value,
      angle,
      x: cx + Math.cos(angle) * radius * (value / 100),
      y: cy + Math.sin(angle) * radius * (value / 100)
    };
  });
}

// --- your star ---------------------------------------------------------------
// A symmetric eight-point star (the owner's choice on 2026-09-26): the outline
// never changes, and each ray fills from the centre to its score, like a
// gauge. It replaced the radar-shaped star, whose outline went lopsided
// whenever the scores were uneven. Rays run clockwise from the top in
// RADAR_KEYS order; the valleys sit at S1's depth (symbols.md).
export const STAR_VALLEY = 13 / 46;
const RAY = Math.PI / 4;
const tipAngle = (i) => -Math.PI / 2 + i * RAY;
const polar = (cx, cy, r, a) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });

// The outline: tip, valley, tip, valley... clockwise from the top.
export function starOutline(cx, cy, r) {
  return Array.from({ length: RADAR_KEYS.length }, (_, i) => [
    { ...polar(cx, cy, r, tipAngle(i)), tip: true },
    { ...polar(cx, cy, r * STAR_VALLEY, tipAngle(i) + RAY / 2), tip: false }
  ]).flat();
}

// Ray i filled to `value` (0-100): the ray's own kite (centre, valley, tip,
// valley) shrunk toward the centre, so it always sits inside the outline.
// `half` keeps one side of the ray, for two readings in one star: "start" is
// the side before the tip going clockwise, "end" the side after it.
export function starRay(i, value, cx, cy, r, half = "both") {
  const f = clampScore(value) / 100;
  const a = tipAngle(i);
  const centre = { x: cx, y: cy };
  const before = polar(cx, cy, r * STAR_VALLEY * f, a - RAY / 2);
  const tip = polar(cx, cy, r * f, a);
  const after = polar(cx, cy, r * STAR_VALLEY * f, a + RAY / 2);
  if (half === "start") return [centre, before, tip];
  if (half === "end") return [centre, tip, after];
  return [centre, before, tip, after];
}
