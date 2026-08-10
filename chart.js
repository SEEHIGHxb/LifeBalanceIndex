// chart.js - LifeQuest Interactive SVG Radar Chart Renderer

import { t, tp, dateLocale } from "./i18n.js";

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

// The axis ORDER of the radar, clockwise from the top. Exported as RADAR_KEYS
// (aliased locally to ASPECT_KEYS, which the drawing code below already used)
// so story-card.js draws its eight axes in provably the same order as the
// on-screen chart — two independent copies of this list could silently drift
// and produce a shared card whose shape did not match the dashboard.
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

const ASPECT_KEYS = RADAR_KEYS;

// Vertex coordinates for one radar polygon: eight points, clockwise from the
// top, each pulled in from the rim in proportion to its 0-100 value.
//
// Pure and rendering-agnostic on purpose. The SVG chart below and the canvas
// story card consume the identical numbers, so the two renderings cannot
// disagree about where a score sits. Values outside 0-100 are clamped rather
// than allowed to escape the rim, and a missing value reads as 0.
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

// Line chart of one aspect's weekly snapshots (0-100 scale).
export function renderTrendChart(containerId, trend) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!trend || trend.length === 0) {
    container.innerHTML = `<p style="font-size: var(--text-base); color: var(--color-text-secondary);">${t("No snapshots yet — trends appear after your first weekly sync.")}</p>`;
    return;
  }

  const width = container.clientWidth || 520;
  const height = 180;
  const pad = { top: 14, right: 14, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  // Accessible name for the chart (review finding: SVGs were silent to AT).
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", tp("Trend chart: {n} weekly snapshot(s), latest score {latest} of 100", {
    n: trend.length,
    latest: trend[trend.length - 1].value
  }));

  const xFor = i => trend.length === 1
    ? pad.left + plotW / 2
    : pad.left + (i / (trend.length - 1)) * plotW;
  const yFor = v => pad.top + (1 - v / 100) * plotH;

  // Horizontal grid lines with score labels
  [0, 25, 50, 75, 100].forEach(level => {
    const y = yFor(level);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", pad.left);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - pad.right);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "rgba(32, 50, 76, 0.1)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", pad.left - 6);
    label.setAttribute("y", y + 3);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "var(--color-text-secondary)");
    label.style.fontFamily = "var(--font-mono)";
    // Not a --text-* token, here or at the three other sizes in this file.
    // The svg is width="100%" over a viewBox, so its contents are in
    // user-space units the browser rescales to whatever width the card
    // happens to be. A rem would resolve against the root font size and THEN
    // get multiplied by that ratio, so one token would render at a different
    // size on a phone than on a desktop — the opposite of what a type scale
    // is for. These four numbers are chart geometry; they belong to the
    // viewBox, not to the sheet.
    label.style.fontSize = "9px";
    label.textContent = level;
    svg.appendChild(label);
  });

  // Score line. NB: callback param is `pt` (a trend point) — `t` would shadow
  // the imported translation function.
  if (trend.length > 1) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    path.setAttribute("points", trend.map((pt, i) => `${xFor(i)},${yFor(pt.value)}`).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--color-slate)");
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
  }

  // Points + first/last date labels.
  //
  // Both go through dateLocale(), as every other date site in the app does.
  // Bare toLocaleDateString() takes the BROWSER's locale, not the app's, so a
  // Thai UI rendered en-US dates on the dashboard chart — the one date the user
  // sees every session. The axis label takes the short day+month form the
  // sibling views use: the full form does not fit in 9px at the chart edge.
  const shortDate = iso => new Date(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
  trend.forEach((pt, i) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", xFor(i));
    dot.setAttribute("cy", yFor(pt.value));
    dot.setAttribute("r", "3.5");
    dot.setAttribute("fill", "var(--color-accent)");
    dot.setAttribute("stroke", "#ffffff");
    dot.setAttribute("stroke-width", "1.5");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${new Date(pt.date).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" })}: ${pt.value}`;
    dot.appendChild(title);
    svg.appendChild(dot);

    if (i === 0 || i === trend.length - 1) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", xFor(i));
      label.setAttribute("y", height - 8);
      label.setAttribute("text-anchor", i === 0 ? "start" : "end");
      if (trend.length === 1) label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "var(--color-text-secondary)");
      label.style.fontFamily = "var(--font-mono)";
      // SVG user-space unit — see the note at the first label size above.
      label.style.fontSize = "9px";
      label.textContent = shortDate(pt.date);
      svg.appendChild(label);
    }
  });

  container.appendChild(svg);
}

export function renderRadarChart(containerId, aspects, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const average = options.average || null;

  const width = container.clientWidth || 360;
  // The axis labels sit on a ring outside the plot, and `svg.style.overflow` is
  // "visible", so anything that does not fit does not get clipped by the SVG —
  // it escapes and gets cut off by the screen edge instead. Measured on a
  // 375px phone, "Environment" started at x = -10 and "Social Contribution" at
  // x = -8: the first letters were simply missing.
  //
  // The binding constraint is the HORIZONTAL axis rather than the longest
  // label, because a horizontal axis reaches the full label ring while a
  // diagonal one reaches only 0.707 of it. A flat 50px allowance is right at
  // desktop width and nowhere near enough at ~311px, so it scales with width.
  const narrow = width < 420;
  const height = narrow ? 320 : 360;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - (narrow ? 96 : 50);

  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.overflow = "visible";
  // Accessible name listing every score (review finding: the radar was
  // silent to AT). The old "astral-glow" filter definition — a leftover from
  // the game theme, defined but never applied — is gone.
  const summary = ASPECT_KEYS.map(key => `${t(ASPECT_LABELS[key])} ${aspects[key] || 0}`).join(", ");
  svg.setAttribute("role", "img");
  if (average) {
    const avgSummary = ASPECT_KEYS.map(key => `${t(ASPECT_LABELS[key])} ${average[key] || 0}`).join(", ");
    svg.setAttribute("aria-label", tp(
      "Radar chart of the eight aspect scores: {summary}. Dashed outline shows the population average: {avgSummary}",
      { summary, avgSummary }
    ));
  } else {
    svg.setAttribute("aria-label", tp("Radar chart of the eight aspect scores: {summary}", { summary }));
  }

  // 1. Draw Concentric Grid Lines (concentric octagons for 8 axes)
  const gridLevels = [20, 40, 60, 80, 100];
  gridLevels.forEach(level => {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius * (level / 100);
      const y = cy + Math.sin(angle) * radius * (level / 100);
      points.push(`${x},${y}`);
    }
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.join(" "));
    polygon.setAttribute("fill", "none");
    polygon.setAttribute("stroke", "rgba(32, 50, 76, 0.1)"); // Light slate grid lines
    polygon.setAttribute("stroke-width", "1");
    if (level === 100) {
      polygon.setAttribute("stroke", "rgba(36, 52, 77, 0.28)"); // Navy outer rim
      polygon.setAttribute("stroke-dasharray", "4,2");
    }
    svg.appendChild(polygon);
  });

  // 2. Draw 8 Axis lines & Labels
  ASPECT_KEYS.forEach((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const endX = cx + Math.cos(angle) * radius;
    const endY = cy + Math.sin(angle) * radius;

    // Axis line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", cy);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("stroke", "rgba(32, 50, 76, 0.15)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    // Label positioning
    const labelDistance = radius + 22;
    const lx = cx + Math.cos(angle) * labelDistance;
    const ly = cy + Math.sin(angle) * labelDistance;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", lx);
    text.setAttribute("y", ly + 4);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "var(--color-text-chart)");
    text.style.fontFamily = "var(--font-serif)";
    // SVG user-space unit — see the note at the first label size above.
    text.style.fontSize = "11px";
    text.style.fontWeight = "bold";
    text.textContent = t(ASPECT_LABELS[key]);

    // Adjust text alignments slightly depending on quadrant
    if (Math.cos(angle) > 0.1) text.setAttribute("text-anchor", "start");
    else if (Math.cos(angle) < -0.1) text.setAttribute("text-anchor", "end");

    svg.appendChild(text);
  });

  // 3. Draw the population-average reference polygon FIRST (dashed, unfilled,
  // no vertex dots) so the user's polygon layers on top of it.
  if (average) {
    const avgPoints = radarPoints(average, ASPECT_KEYS, cx, cy, radius)
      .map(pt => `${pt.x},${pt.y}`);
    const avgPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    avgPolygon.setAttribute("points", avgPoints.join(" "));
    avgPolygon.setAttribute("fill", "none");
    avgPolygon.setAttribute("stroke", "rgba(32, 50, 76, 0.45)");
    avgPolygon.setAttribute("stroke-width", "1.5");
    avgPolygon.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(avgPolygon);
  }

  // 4. Draw User Score Polygon
  const vertices = radarPoints(aspects, ASPECT_KEYS, cx, cy, radius);
  const scorePoints = vertices.map(pt => `${pt.x},${pt.y}`);

  const scorePolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  scorePolygon.setAttribute("points", scorePoints.join(" "));
  scorePolygon.setAttribute("fill", "rgba(36, 52, 77, 0.10)"); // Navy translucent fill
  scorePolygon.setAttribute("stroke", "var(--color-slate)");
  scorePolygon.setAttribute("stroke-width", "2");
  svg.appendChild(scorePolygon);

  // 5. Draw Score Points (dots at vertices)
  vertices.forEach(({ value: score, x, y }) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "var(--color-accent)");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.5");
    svg.appendChild(circle);

    // Score label numbers
    const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scoreText.setAttribute("x", x);
    scoreText.setAttribute("y", y - 8);
    scoreText.setAttribute("text-anchor", "middle");
    scoreText.setAttribute("fill", "var(--color-slate-dark)");
    scoreText.style.fontFamily = "var(--font-mono)";
    // SVG user-space unit — see the note at the first label size above.
    scoreText.style.fontSize = "9px";
    scoreText.style.fontWeight = "bold";
    scoreText.textContent = score;
    svg.appendChild(scoreText);
  });

  container.appendChild(svg);

  // Legend + provenance caption, only when the reference polygon is drawn.
  // Built with createElement/textContent — no markup ever passes through here.
  if (average) {
    const legend = document.createElement("div");
    legend.className = "radar-legend";
    const legendItem = (swatchClass, label) => {
      const item = document.createElement("span");
      item.className = "radar-legend-item";
      const swatch = document.createElement("span");
      swatch.className = `radar-legend-swatch ${swatchClass}`;
      swatch.setAttribute("aria-hidden", "true");
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(label));
      return item;
    };
    legend.appendChild(legendItem("radar-legend-swatch--you", t("Your scores")));
    legend.appendChild(legendItem("radar-legend-swatch--average", t("Population average")));
    const caption = document.createElement("p");
    caption.className = "radar-legend-caption";
    caption.textContent = t("Average estimated from cited population statistics — see Methodology.");
    legend.appendChild(caption);
    container.appendChild(legend);
  }
}
