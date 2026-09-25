// story-card.js - the 1080x1920 shareable card: your star as a poster.
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
// The star's geometry comes from chart.js (starOutline, starRay), the same as
// Home's, so the card and the page cannot disagree about where a score sits.

import { t, tp, dateLocale } from "./i18n.js";
import { radarPoints, starOutline, starRay, RADAR_KEYS, ASPECT_LABELS } from "./chart.js";

export { STAR_VALLEY } from "./chart.js";

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

// THE POSTER (redesign R5; docs/prototype/redesign/social.js posterSvg). The
// card is the prototype's 9:16 poster: LIFE BALANCE / INDEX in the wordmark
// face, your star as a die-cut sticker (a white cut edge, lifted on a soft
// shadow, turned a few degrees), and under it the names in two columns of
// four. Light is the page's paper; Dark is the menu's navy. Every color is a
// literal: the sticker's are the gilt star's (symbols.md S1).
export const THEMES = {
  paper: {
    bg: "#f4efe4",
    ink: "#1b1b1b",
    muted: "#4a4a4a",
    accent: "#6d2e3f",
    cut: "#ffffff",
    lift: "rgba(0, 0, 0, 0.25)",
    starGround: "#fbf3e2",
    star: "#e2b866",
    starLine: "#a88752",
    core: "#fbf8f1",
    coreLine: "#6f7d64"
  },
  navy: {
    bg: "#16213e",
    ink: "#ffffff",
    muted: "#c9ccd6",
    accent: "#e6b8c4",
    cut: "#ffffff",
    lift: "rgba(0, 0, 0, 0.45)",
    starGround: "#fbf3e2",
    star: "#e2b866",
    starLine: "#a88752",
    core: "#fbf8f1",
    coreLine: "#6f7d64"
  }
};

// Each region's hue (views/journey.js CHAPTERS), for the legend's dots. A
// literal copy for the same reason as the themes; tests/rest-of-map.test.mjs
// holds the two together.
export const REGION_HUES = {
  finance: "#d9a441",
  physical: "#3fa796",
  mental: "#5b8dd9",
  relationships: "#d9738f",
  personalGoals: "#e08a3c",
  socialContribution: "#8d6fd1",
  environment: "#2e9e5b",
  humanityFuture: "#5a63b8"
};

// Font stacks carry Sarabun in second place so Thai falls through to it
// instead of rendering as tofu. Canvas honours a stack exactly like CSS.
// Must track --font-serif in index.css. Canvas cannot read a CSS custom
// property, so this is the one place the stack is repeated by hand — and it
// was still on the pre-v78 stack, which meant Thai headings on the shared
// PNG rendered in Sarabun, the sans, while the same heading in the app
// rendered in Maitree. The card is the only thing about this app anyone
// else sees. tests/typography.test.mjs pins the two together.
const SERIF = "'Source Serif 4', 'Maitree', Georgia, serif";
const SANS = "'Inter', 'Sarabun', system-ui, sans-serif";
// The wordmark face (css/frame.css --frame-word). It has no Thai, so a Thai
// line in it falls through to Sarabun, as it does on the page.
const WORD = "'Anton', 'Sarabun', Impact, sans-serif";

// Baselines, all inside the safe band. Kept constant across detail levels so
// the composition cannot drift into the chrome when the names are switched
// off.
const LAYOUT = {
  wordmark: 372,
  wordmarkSub: 448,
  url: 492,
  name: 566,
  date: 612,
  starCx: STORY_W / 2,
  starCy: 905,
  starR: 280,
  // The legend: two columns of four under the sticker.
  legendTop: 1216,
  legendStep: 60,
  legendX: [70, 560],
  legendW: 450,
  indexLabel: 1470,
  indexValue: 1550,
  band: 1594,
  standing: 1630,
  standingLine: 28
};

// The sticker's cut edge and lift, and how it sits: turned a little, as if
// stuck on by hand.
const CUT = 18;
const LIFT = { blur: 28, dy: 14 };
const TILT_DEG = -4;
const CORE_R = 30;
const SIDE_MARGIN = 80;

const font = (weight, size, family) => `${weight} ${size}px ${family}`;

// THE CARD AS THE MAP. The reader's star is the same symmetric Lumi Star as
// Home's (symbols.md S1; chart.js): the outline never changes, and each ray
// fills from the centre to its score, so the card cannot disagree with the
// page.

// The names arrive once the sticker has mostly settled (stickerPose below).
const LABELS_FROM = 0.7;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

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

// The share sheet's preview ASSEMBLES the poster (plan §5): the sticker drops
// in large and turned and springs flat to its tilt, then the names arrive.
// `grow` runs 0..1; this is the sticker's pose at it, a damped settle that is
// exactly at rest at 1.
const DROP = { scale: 0.35, turn: -30, decay: 5, swing: 8 };
export function stickerPose(grow) {
  if (grow >= 1) return { scale: 1, turn: TILT_DEG };
  const left = Math.exp(-DROP.decay * grow) * Math.cos(DROP.swing * grow);
  return { scale: 1 + DROP.scale * left, turn: TILT_DEG + DROP.turn * left };
}

// A point turned and scaled about the sticker's centre.
function place(pt, pose) {
  const { starCx: cx, starCy: cy } = LAYOUT;
  const a = (pose.turn * Math.PI) / 180;
  const dx = (pt.x - cx) * pose.scale;
  const dy = (pt.y - cy) * pose.scale;
  return { ...pt, x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
  ctx.closePath();
}

// Your star as a die-cut sticker: the white cut edge on its shadow, then the
// star's ground, each ray filled to its score, the outline and the core, all
// turned to the sticker's pose.
function drawSticker(ctx, theme, data, grow) {
  const { starCx: cx, starCy: cy, starR: r } = LAYOUT;
  const pose = stickerPose(grow);
  const star = starOutline(cx, cy, r).map(pt => place(pt, pose));
  const rays = RADAR_KEYS.map((key, i) => starRay(i, (data.aspects || {})[key], cx, cy, r).map(pt => place(pt, pose)));
  const centre = place({ x: cx, y: cy }, pose);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // The cut edge: the same outline stroked wide in white, lifted on a shadow
  // that is switched off again before anything else is drawn.
  tracePath(ctx, star);
  ctx.shadowColor = theme.lift;
  ctx.shadowBlur = LIFT.blur;
  ctx.shadowOffsetY = LIFT.dy;
  ctx.strokeStyle = theme.cut;
  ctx.lineWidth = CUT * 2 * pose.scale;
  ctx.stroke();
  ctx.fillStyle = theme.cut;
  ctx.fill();
  ctx.shadowColor = "rgba(0, 0, 0, 0)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  tracePath(ctx, star);
  ctx.fillStyle = theme.starGround;
  ctx.fill();
  ctx.fillStyle = theme.star;
  rays.forEach(ray => {
    tracePath(ctx, ray);
    ctx.fill();
  });
  tracePath(ctx, star);
  ctx.strokeStyle = theme.starLine;
  ctx.lineWidth = 12 * pose.scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centre.x, centre.y, CORE_R * pose.scale, 0, Math.PI * 2);
  ctx.fillStyle = theme.core;
  ctx.fill();
  ctx.strokeStyle = theme.coreLine;
  ctx.lineWidth = 12 * pose.scale;
  ctx.stroke();
  ctx.lineCap = "butt";
}

// The names under the sticker, two columns of four in radar order, each with
// its region's dot. In `full` the grade letter follows the name and the score
// sits at the column's end. An aspect with no grade (relationships is
// unranked by design) simply shows no letter - inventing a placeholder would
// imply a grade exists.
function drawNames(ctx, theme, data, detail, grow) {
  if (detail === "shape") return;
  const full = detail === "full";
  const { legendTop, legendStep, legendX, legendW } = LAYOUT;
  // While the poster assembles, the names arrive last.
  ctx.globalAlpha = clamp01((grow - LABELS_FROM) / (1 - LABELS_FROM));
  ctx.textBaseline = "middle";
  RADAR_KEYS.forEach((key, i) => {
    const x = legendX[i < 4 ? 0 : 1];
    const y = legendTop + (i % 4) * legendStep;
    ctx.beginPath();
    ctx.arc(x + 12, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = REGION_HUES[key];
    ctx.fill();

    const score = radarPoints(data.aspects, [key], 0, 0, 1)[0].value;
    const grade = full ? (data.grades || {})[key] : null;
    const name = t(ASPECT_LABELS[key]) + (grade?.grade ? `  ${grade.grade}` : "");
    ctx.textAlign = "left";
    ctx.font = font(600, 26, SANS);
    ctx.fillStyle = theme.ink;
    const room = legendW - 40 - (full ? 80 : 0);
    ctx.fillText(fitText(ctx, name, room), x + 40, y);
    if (!full) return;
    ctx.textAlign = "right";
    ctx.font = font(400, 40, WORD);
    ctx.fillText(String(score), x + legendW, y);
  });
  ctx.globalAlpha = 1;
}

// Draw the whole card onto any 2D context. Pure in the sense that matters: it
// reads nothing but its arguments and touches no storage, so a recording stub
// context can be handed in from a test with no canvas anywhere.
// opts.grow (0..1, default 1) is how far the poster has assembled; the
// exported image is always drawn at 1.
export function drawStoryCard(ctx, data, opts = {}) {
  const grow = Number.isFinite(opts.grow) ? clamp01(opts.grow) : 1;
  const theme = THEMES[opts.theme] || THEMES.paper;
  const detail = DETAIL_LEVELS.includes(opts.detail) ? opts.detail : "shape";
  const maxWidth = STORY_W - SIDE_MARGIN * 2;
  const mid = STORY_W / 2;

  // The share sheet draws every frame, and the exported card, on one context.
  // State one draw sets (the sticker's round joins, the names' fade) must not
  // carry into the next, so each draw starts from the canvas defaults.
  ctx.globalAlpha = 1;
  ctx.lineJoin = "miter";

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // The wordmark and the address are the product's own name, so they are not
  // routed through t() - translating them would be translating a brand.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.ink;
  ctx.font = font(400, 112, WORD);
  ctx.fillText("LIFE BALANCE", mid, LAYOUT.wordmark);
  ctx.font = font(400, 68, WORD);
  ctx.fillText("INDEX", mid, LAYOUT.wordmarkSub);
  ctx.font = font(400, 24, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText("lbi.plainpoint.net", mid, LAYOUT.url);

  if (data.name) {
    ctx.font = font(700, 48, SERIF);
    ctx.fillStyle = theme.ink;
    ctx.fillText(fitText(ctx, data.name, maxWidth), mid, LAYOUT.name);
  }
  if (data.dateText) {
    ctx.font = font(400, 28, SANS);
    ctx.fillStyle = theme.muted;
    ctx.fillText(fitText(ctx, data.dateText, maxWidth), mid, LAYOUT.date);
  }

  drawSticker(ctx, theme, data, grow);
  drawNames(ctx, theme, data, detail, grow);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(700, 24, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText(t("Balance Index").toUpperCase(), mid, LAYOUT.indexLabel);

  ctx.font = font(400, 72, WORD);
  ctx.fillStyle = theme.ink;
  ctx.fillText(String(data.index ?? ""), mid, LAYOUT.indexValue);

  if (data.bandLabel) {
    ctx.font = font(600, 30, SERIF);
    ctx.fillStyle = theme.accent;
    ctx.fillText(fitText(ctx, t(data.bandLabel), maxWidth), mid, LAYOUT.band);
  }

  if (data.standing) {
    ctx.font = font(400, 22, SANS);
    ctx.fillStyle = theme.muted;
    const sentence = tp(
      "You are at or above the population average in {count} of {total} aspects.",
      { count: data.standing.count, total: data.standing.total }
    );
    wrapText(ctx, sentence, maxWidth, 2).forEach((line, i) => {
      ctx.fillText(line, mid, LAYOUT.standing + i * LAYOUT.standingLine);
    });
  }
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
