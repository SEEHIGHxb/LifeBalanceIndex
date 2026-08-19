// story-card.js - the 1080x1920 shareable card of the aspect radar.
//
// WHY THIS IS A CANVAS AND NOT A SCREENSHOT OF THE EXISTING RADAR:
// chart.js paints SVG whose colors are CSS custom properties (the --color-*
// tokens) and whose text relies
// on the self-hosted @font-face families. Rasterising that SVG through an
// <img> silently strips BOTH — CSS custom properties resolve against nothing
// inside an SVG image document, and the fonts never load there — so the card
// would come out unstyled and in a fallback face. Canvas fillText, by
// contrast, uses fonts the page has already loaded, which is why Thai renders
// in Sarabun here. Every color below is therefore a LITERAL, transcribed from
// index.css. A CSS custom property in this file would be a bug — it has no
// cascade to resolve against and paints as transparent black — so a test
// greps this source for one and fails if it finds any.
//
// WHAT THIS CANNOT DO: post to Instagram. Meta requires a native app with a
// registered Facebook App ID for the Stories intent, and states that mobile
// websites cannot use it. This module produces the image; views/share.js hands
// it to navigator.share() so the user picks Instagram themselves.
//
// The geometry comes from chart.js radarPoints() so the card and the on-screen
// chart cannot disagree about where a score sits.

import { t, tp, dateLocale } from "./i18n.js";
import { radarPoints, RADAR_KEYS, ASPECT_LABELS } from "./chart.js";

export const STORY_W = 1080;
export const STORY_H = 1920;

// Instagram overlays its own chrome on a story: the progress bar, avatar and
// username at the top, the reply bar and reaction row at the bottom. Published
// guidance puts these at roughly 155-250px each; take the conservative 250 so
// nothing that matters can end up underneath. All content lives in
// y = [SAFE_TOP, STORY_H - SAFE_BOTTOM] = [250, 1670], and a test enforces it.
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = 250;
export const SAFE_LOW = STORY_H - SAFE_BOTTOM;

// How much of the assessment the card states. The user picks this per share.
//   shape  the outline only - a viewer sees the pattern but cannot read off
//          any single aspect, which is what makes the card safe to post
//   names  axis labels on, still no numbers
//   full   labels, letter grades and 0-100 scores, matching the dashboard
export const DETAIL_LEVELS = ["shape", "names", "full"];

// Both palettes are the app's own tokens from index.css, written out as
// literals. The one value with no direct counterpart is the navy theme's
// accent: #6d2e3f is near-black against a #24344d ground, so it is lifted to a
// tint of the same hue rather than swapped for an unrelated color.
export const THEMES = {
  paper: {
    bg: "#f7f5f0",
    ink: "#1f2733",
    muted: "#5c6672",
    grid: "rgba(32, 50, 76, 0.14)",
    rim: "rgba(36, 52, 77, 0.30)",
    average: "rgba(32, 50, 76, 0.55)",
    you: "#3a5170",
    youFill: "rgba(36, 52, 77, 0.12)",
    accent: "#6d2e3f",
    dotRing: "#ffffff"
  },
  navy: {
    bg: "#24344d",
    ink: "#f7f5f0",
    muted: "#b9c2ce",
    grid: "rgba(247, 245, 240, 0.16)",
    rim: "rgba(247, 245, 240, 0.34)",
    average: "rgba(247, 245, 240, 0.60)",
    you: "#e8dfd2",
    youFill: "rgba(247, 245, 240, 0.14)",
    accent: "#c9909f",
    dotRing: "#24344d"
  }
};

// Font stacks carry Sarabun in second place so Thai falls through to it
// instead of rendering as tofu. Canvas honours a stack exactly like CSS.
const SERIF = "'Source Serif 4', 'Sarabun', Georgia, serif";
const SANS = "'Inter', 'Sarabun', system-ui, sans-serif";

// Baselines, all inside the safe band. Kept constant across detail levels so
// the composition cannot drift into the chrome when labels are switched off.
const LAYOUT = {
  name: 320,
  date: 372,
  radarCx: STORY_W / 2,
  radarCy: 880,
  // The radius is set by the LABELS, not the polygon. Two constraints bind, and
  // they pull opposite ways: the widest label is "Social Contribution  D" on
  // the 225° diagonal, but the tightest FIT is "Environment  C" on the 180°
  // axis, because a horizontal axis reaches the full ring while a diagonal only
  // reaches 0.707 of it. Measured against the real font, ring 300 at 25px
  // leaves 26px of clearance on that worst case; ring 312 at 27px left exactly
  // zero and shipped an ellipsis. Widen the radar and the labels clip.
  radarR: 260,
  labelRing: 300,
  legend: 1300,
  indexLabel: 1372,
  indexValue: 1452,
  band: 1502,
  standing: 1552,
  standingLine: 38,
  wordmark: 1630,
  url: 1662
};

const GRID_LEVELS = [20, 40, 60, 80, 100];
const SIDE_MARGIN = 80;
// Axis labels may sit closer to the edge than body text, but never touch it.
const LABEL_MARGIN = 30;

const font = (weight, size, family) => `${weight} ${size}px ${family}`;

// Every axis at the same value - the rim, and each grid ring. Built through
// radarPoints so the rings share the chart's angles too.
const ringAt = (level, cx, cy, r) =>
  radarPoints(
    Object.fromEntries(RADAR_KEYS.map(k => [k, level])),
    RADAR_KEYS, cx, cy, r
  );

// Shorten until the string PLUS its ellipsis fits. Always marks the cut, so
// this is only for text that is genuinely being truncated.
function ellipsise(ctx, text, maxWidth) {
  let cut = String(text ?? "");
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

// Trim to fit, with an ellipsis. A profile name is free text and can be
// arbitrarily long; without this it would run off both edges of the card.
export function fitText(ctx, text, maxWidth) {
  const str = String(text ?? "");
  return ctx.measureText(str).width <= maxWidth ? str : ellipsise(ctx, str, maxWidth);
}

// Word wrap that also survives Thai, which is written without spaces: a token
// wider than the line on its own is broken by character rather than allowed to
// overflow. Returns at most `maxLines`, ellipsising the last one.
export function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  const pushChars = (token) => {
    let chunk = "";
    for (const ch of token) {
      if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = ctx.measureText(word).width > maxWidth ? pushChars(word) : word;
  }
  if (line) lines.push(line);

  if (lines.length <= maxLines) return lines;
  // Lines are being dropped, so the last kept one is ellipsised unconditionally
  // — even though it fits — because silently discarding the tail would leave a
  // sentence that reads as complete when it is not.
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsise(ctx, kept[maxLines - 1], maxWidth);
  return kept;
}

function drawRadar(ctx, theme, data, detail) {
  const { radarCx: cx, radarCy: cy, radarR: r, labelRing } = LAYOUT;

  // Grid rings, outermost dashed to read as the 100 rim.
  GRID_LEVELS.forEach(level => {
    const pts = ringAt(level, cx, cy, r);
    ctx.beginPath();
    pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.closePath();
    ctx.strokeStyle = level === 100 ? theme.rim : theme.grid;
    ctx.lineWidth = level === 100 ? 3 : 2;
    ctx.setLineDash(level === 100 ? [8, 6] : []);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Axis spokes.
  const rim = ringAt(100, cx, cy, r);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 2;
  rim.forEach(pt => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  });

  // The population average, dashed and unfilled, drawn first so the user's own
  // polygon layers on top of it - same stacking as the on-screen chart.
  if (data.average) {
    const avg = radarPoints(data.average, RADAR_KEYS, cx, cy, r);
    ctx.beginPath();
    avg.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.closePath();
    ctx.strokeStyle = theme.average;
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The user's polygon.
  const vertices = radarPoints(data.aspects, RADAR_KEYS, cx, cy, r);
  ctx.beginPath();
  vertices.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  ctx.closePath();
  ctx.fillStyle = theme.youFill;
  ctx.fill();
  ctx.strokeStyle = theme.you;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Vertex dots.
  vertices.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.strokeStyle = theme.dotRing;
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  if (detail === "shape") return;

  // Axis labels, and in `full` the grade letter beside the name. An aspect
  // with no grade (relationships is unranked by design) simply shows no
  // letter - inventing a placeholder would imply a grade exists.
  ctx.textBaseline = "middle";
  ctx.font = font(600, 25, SANS);
  ctx.fillStyle = theme.ink;
  rim.forEach((pt, i) => {
    const key = RADAR_KEYS[i];
    const grade = detail === "full" ? (data.grades || {})[key] : null;
    const label = t(ASPECT_LABELS[key]) + (grade?.grade ? `  ${grade.grade}` : "");
    const lx = cx + Math.cos(pt.angle) * labelRing;
    const ly = cy + Math.sin(pt.angle) * labelRing;
    const align = Math.cos(pt.angle) > 0.1 ? "left"
      : Math.cos(pt.angle) < -0.1 ? "right" : "center";
    ctx.textAlign = align;
    // Clamp to the room actually available on this side. The geometry above is
    // tuned for the longest English label, but a translation or a longer aspect
    // name must not be able to run off the edge — so the width is measured
    // rather than assumed.
    const room = align === "left" ? STORY_W - LABEL_MARGIN - lx
      : align === "right" ? lx - LABEL_MARGIN
        : Math.min(lx, STORY_W - lx) * 2;
    ctx.fillText(fitText(ctx, label, room), lx, ly);
  });

  if (detail !== "full") return;

  // The 0-100 score, nudged outward along its own axis so it clears the dot.
  ctx.font = font(700, 26, SANS);
  ctx.fillStyle = theme.accent;
  ctx.textAlign = "center";
  vertices.forEach(pt => {
    ctx.fillText(
      String(pt.value),
      pt.x + Math.cos(pt.angle) * 26,
      pt.y + Math.sin(pt.angle) * 26
    );
  });
}

function drawLegend(ctx, theme, y) {
  const you = t("Your scores");
  const avg = t("Population average");
  const swatch = 46;
  const gap = 14;
  const between = 44;

  ctx.font = font(400, 28, SANS);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const total = swatch + gap + ctx.measureText(you).width + between
    + swatch + gap + ctx.measureText(avg).width;
  let x = (STORY_W - total) / 2;

  const rule = (dashed) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + swatch, y);
    ctx.strokeStyle = dashed ? theme.average : theme.you;
    ctx.lineWidth = dashed ? 4 : 6;
    ctx.setLineDash(dashed ? [10, 7] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    x += swatch + gap;
  };

  rule(false);
  ctx.fillStyle = theme.muted;
  ctx.fillText(you, x, y);
  x += ctx.measureText(you).width + between;

  rule(true);
  ctx.fillStyle = theme.muted;
  ctx.fillText(avg, x, y);
}

// Draw the whole card onto any 2D context. Pure in the sense that matters: it
// reads nothing but its arguments and touches no storage, so a recording stub
// context can be handed in from a test with no canvas anywhere.
export function drawStoryCard(ctx, data, opts = {}) {
  const theme = THEMES[opts.theme] || THEMES.paper;
  const detail = DETAIL_LEVELS.includes(opts.detail) ? opts.detail : "shape";
  const maxWidth = STORY_W - SIDE_MARGIN * 2;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (data.name) {
    ctx.font = font(700, 60, SERIF);
    ctx.fillStyle = theme.ink;
    ctx.fillText(fitText(ctx, data.name, maxWidth), STORY_W / 2, LAYOUT.name);
  }

  if (data.dateText) {
    ctx.font = font(400, 34, SANS);
    ctx.fillStyle = theme.muted;
    ctx.fillText(fitText(ctx, data.dateText, maxWidth), STORY_W / 2, LAYOUT.date);
  }

  drawRadar(ctx, theme, data, detail);

  drawLegend(ctx, theme, LAYOUT.legend);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.font = font(600, 26, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText(t("Balance Index").toUpperCase(), STORY_W / 2, LAYOUT.indexLabel);

  ctx.font = font(700, 84, SERIF);
  ctx.fillStyle = theme.ink;
  ctx.fillText(String(data.index ?? ""), STORY_W / 2, LAYOUT.indexValue);

  if (data.bandLabel) {
    ctx.font = font(600, 36, SERIF);
    ctx.fillStyle = theme.accent;
    ctx.fillText(fitText(ctx, t(data.bandLabel), maxWidth), STORY_W / 2, LAYOUT.band);
  }

  if (data.standing) {
    ctx.font = font(400, 30, SANS);
    ctx.fillStyle = theme.muted;
    const sentence = tp(
      "You are at or above the population average in {count} of {total} aspects.",
      { count: data.standing.count, total: data.standing.total }
    );
    wrapText(ctx, sentence, maxWidth, 2).forEach((line, i) => {
      ctx.fillText(line, STORY_W / 2, LAYOUT.standing + i * LAYOUT.standingLine);
    });
  }

  // Wordmark and URL are the product's own name and address, so they are not
  // routed through t() - translating them would be translating a brand.
  ctx.font = font(500, 26, SANS);
  ctx.fillStyle = theme.ink;
  ctx.fillText("Life Balance Index", STORY_W / 2, LAYOUT.wordmark);

  ctx.font = font(400, 22, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText("lbi.plainpoint.net", STORY_W / 2, LAYOUT.url);
}

// Everything the card needs, assembled from state the dashboard already has.
// `date` is formatted here rather than by the caller so the card follows the
// active language's locale (Thai dates on a Thai card).
export function storyCardData({ name, date, aspects, average, index, bandLabel, standing, grades }) {
  const when = date instanceof Date ? date : new Date(date || Date.now());
  return {
    name: name || "",
    dateText: when.toLocaleDateString(dateLocale(), {
      day: "numeric", month: "long", year: "numeric"
    }),
    aspects: aspects || {},
    average: average || null,
    index,
    bandLabel: bandLabel || "",
    standing: standing || null,
    grades: grades || {}
  };
}

// Render to a PNG Blob. Browser-only: awaits document.fonts.ready first,
// because without it the first card of a session draws in a fallback face -
// the canvas paints immediately whether or not the webfont has arrived.
export async function renderStoryCard(data, opts = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = opts.canvas || document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  drawStoryCard(ctx, data, opts);
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}
