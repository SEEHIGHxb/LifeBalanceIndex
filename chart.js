// chart.js - the eight aspects' labels, their radar order, and the radar's
// geometry. The on-screen radar chart that lived here went with the redesign:
// Home's hero star (R3) and Side by Side's two stars laid over each other (R5)
// replaced it, and the share card (story-card.js) is the one drawing left that
// uses this geometry.

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
export function radarPoints(values, keys, cx, cy, radius) {
  return keys.map((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const raw = Number((values || {})[key]);
    const value = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
    return {
      key,
      value,
      angle,
      x: cx + Math.cos(angle) * radius * (value / 100),
      y: cy + Math.sin(angle) * radius * (value / 100)
    };
  });
}
