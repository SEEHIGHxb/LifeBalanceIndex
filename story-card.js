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
// The shape's geometry comes from chart.js (shapeKite, shapeRim), the same as
// Home's, so the card and the page cannot disagree about where a score sits.

import { t } from "./i18n.js";
import { radarPoints, shapeKite, shapeRim, asterismStarRadius, SHAPE_VIEWS, RADAR_KEYS, ASPECT_LABELS } from "./chart.js";

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

// What each region's label says under its name. The user picks this per
// share (the owner, 2026-09-28: "Score/Character", nothing else):
//   full       its 0-100 score
//   character  your character there (characters.js)
// A region with no character (a side left unanswered) shows its score.
export const DETAIL_LEVELS = ["full", "character"];

// THE POSTER (redesign R5; docs/prototype/redesign/social.js posterSvg). The
// card is the prototype's 9:16 poster: ASTERISM in the wordmark face, your
// star as a die-cut sticker (a white cut edge, lifted on a soft shadow,
// turned a few degrees), each region named at its own point (v138), and the
// Balance Index under it. Light is the page's paper; Dark is the menu's navy. Every color is a
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

// Each region's hue (views/journey.js CHAPTERS), for the labels' dots. A
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
// Since v182 nothing on the card is set in the serif (the name went, and the
// code is set like the index), so it carries no serif stack to drift.
const SANS = "'Inter', 'Sarabun', system-ui, sans-serif";
// The wordmark face (css/frame.css --frame-word). It has no Thai, so a Thai
// line in it falls through to Sarabun, as it does on the page.
const WORD = "'Anton', 'Sarabun', Impact, sans-serif";

// Baselines, all inside the safe band. The star is sized so a label at each
// of its points still fits between it and the card's edge.
// The name and the date left in v182 (the owner, 2026-10-03), and the star
// took the room.
const LAYOUT = {
  wordmark: 422,
  url: 474,
  starCx: STORY_W / 2,
  starCy: 950,
  starR: 226,
  // How far past the rim each region's label sits, and the least room kept
  // between a label and the card's edge. Tight enough that the longest name
  // beside the star, The Still Water, still fits whole.
  labelGap: 42,
  labelEdge: 32,
  // The line under the star: its heading, then the Balance Index or, with
  // Character, your constellation (v182).
  footLabel: 1440,
  footValue: 1530
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

// The asterism's night and its light (css/shape.css), the same in both themes:
// the sky is the sticker, and a star reads best on it whatever sits behind.
const SKY = { night: "#1b1b1b", speck: "rgba(255, 255, 255, 0.55)", line: "rgba(240, 216, 168, 0.75)", star: "#f6e3b8", glow: "#f0d8a8" };
// Fixed specks on the sky, as fractions of the radius from the centre.
const SKY_SPECKS = [[-0.56, -0.42], [0.5, -0.66], [0.7, 0.3], [-0.4, 0.62], [0.16, 0.8], [-0.8, 0.1], [0.34, -0.2], [-0.2, -0.72], [0.84, -0.16], [-0.66, 0.46]];
const RINGS = [0.25, 0.5, 0.75];
// The star's tips only reach the rim at a perfect score, but the asterism's
// disc is round and full width: drawn at the star's size it would crowd the
// labels round it. So the whole sky is drawn a little smaller.
const SKY_SCALE = 0.86;
const circle = (cx, cy, r, n = 72) => Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * r, y: cy + Math.sin((i / n) * Math.PI * 2) * r }));

// Your shape as a die-cut sticker, in the view you picked (views/shape.js):
// the white cut edge on its shadow, then the ground, the eight kites and the
// view's own marks, all turned to the sticker's pose. The star is the star's
// outline; the radar sits in its octagon; the asterism is a disc of night.
function drawSticker(ctx, theme, data, grow) {
  const view = SHAPE_VIEWS.includes(data.shape) ? data.shape : "star";
  const { starCx: cx, starCy: cy } = LAYOUT;
  const r = LAYOUT.starR * (view === "asterism" ? SKY_SCALE : 1);
  const pose = stickerPose(grow);
  const at = (pts) => pts.map(pt => place(pt, pose));
  const scores = RADAR_KEYS.map(key => (data.aspects || {})[key]);
  const rim = at(view === "asterism" ? circle(cx, cy, r * 1.04) : shapeRim(view, cx, cy, r));
  const kites = scores.map((_, i) => at(shapeKite(view, i, scores, cx, cy, r)));
  const tips = kites.map(k => k[2]);
  const centre = place({ x: cx, y: cy }, pose);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // The cut edge: the rim stroked wide in white, lifted on a shadow that is
  // switched off again before anything else is drawn.
  tracePath(ctx, rim);
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

  tracePath(ctx, rim);
  ctx.fillStyle = view === "asterism" ? SKY.night : theme.starGround;
  ctx.fill();

  if (view === "star") drawStarView(ctx, theme, kites, rim, pose);
  else if (view === "radar") drawRadarView(ctx, theme, tips, pose, { cx, cy, r, at });
  else drawAsterismView(ctx, scores, tips, pose, { cx, cy, r });

  if (view !== "asterism") {
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, CORE_R * pose.scale * (view === "radar" ? 0.5 : 1), 0, Math.PI * 2);
    ctx.fillStyle = theme.core;
    ctx.fill();
    ctx.strokeStyle = theme.coreLine;
    ctx.lineWidth = (view === "radar" ? 6 : 12) * pose.scale;
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function drawStarView(ctx, theme, kites, rim, pose) {
  ctx.fillStyle = theme.star;
  kites.forEach(kite => {
    tracePath(ctx, kite);
    ctx.fill();
  });
  tracePath(ctx, rim);
  ctx.strokeStyle = theme.starLine;
  ctx.lineWidth = 12 * pose.scale;
  ctx.stroke();
}

function drawRadarView(ctx, theme, tips, pose, { cx, cy, r, at }) {
  ctx.strokeStyle = theme.starLine;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3 * pose.scale;
  RINGS.forEach(f => {
    tracePath(ctx, at(shapeRim("radar", cx, cy, r, f)));
    ctx.stroke();
  });
  at(shapeRim("radar", cx, cy, r)).forEach(pt => {
    const c = place({ x: cx, y: cy }, pose);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  });
  ctx.globalAlpha = 0.75;
  tracePath(ctx, tips);
  ctx.fillStyle = theme.star;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 8 * pose.scale;
  ctx.stroke();
  tracePath(ctx, at(shapeRim("radar", cx, cy, r)));
  ctx.lineWidth = 10 * pose.scale;
  ctx.stroke();
}

function drawAsterismView(ctx, scores, tips, pose, { cx, cy, r }) {
  ctx.fillStyle = SKY.speck;
  SKY_SPECKS.forEach(([fx, fy]) => {
    const pt = place({ x: cx + fx * r, y: cy + fy * r }, pose);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.6 * pose.scale, 0, Math.PI * 2);
    ctx.fill();
  });
  tracePath(ctx, tips);
  ctx.strokeStyle = SKY.line;
  ctx.lineWidth = 3 * pose.scale;
  ctx.stroke();
  ctx.fillStyle = SKY.star;
  ctx.shadowColor = SKY.glow;
  ctx.shadowBlur = 24 * pose.scale;
  tips.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, asterismStarRadius(scores[i]) * r * pose.scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowColor = "rgba(0, 0, 0, 0)";
  ctx.shadowBlur = 0;
}

// What stands in for a character, or a constellation, that is not there yet.
export const NONE = "–";

// Each region's label: its name, and under it what the detail level shows,
// the score or your character. A region with no character shows a dash
// (v182): its score there would read as a character's.
export function legendValue(detail, score, character) {
  if (detail === "character") return character || NONE;
  return String(score);
}

// Which way a label reads from its point: out to the right, out to the left,
// or centred above or below the star.
const SIDEWAYS = 0.3;
const labelSide = (cos, sin) => (cos > SIDEWAYS ? "r" : cos < -SIDEWAYS ? "l" : sin < 0 ? "t" : "b");
// Each side's two baselines (textBaseline middle), from the label's point.
const LABEL_LINES = { t: [-52, -14], b: [14, 52], r: [-19, 19], l: [-19, 19] };
const DOT_R = 9;
const DOT_SPACE = 26;
const CENTRED_W = 380;

// The regions round the sticker, each just past its own point, in radar order
// clockwise from the top. They follow the sticker's resting tilt.
function drawRegionLabels(ctx, theme, data, detail, grow) {
  const { starCx: cx, starCy: cy, starR, labelGap, labelEdge } = LAYOUT;
  const rest = stickerPose(1);
  // While the poster assembles, the names arrive last.
  ctx.globalAlpha = clamp01((grow - LABELS_FROM) / (1 - LABELS_FROM));
  ctx.textBaseline = "middle";
  RADAR_KEYS.forEach((key, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const side = labelSide(cos, sin);
    const at = place({ x: cx + cos * (starR + labelGap), y: cy + sin * (starR + labelGap) }, rest);
    const room = side === "r" ? STORY_W - labelEdge - at.x - DOT_SPACE
      : side === "l" ? at.x - labelEdge - DOT_SPACE : CENTRED_W;
    const label = (data.labels || {})[key] || {};
    const score = radarPoints(data.aspects, [key], 0, 0, 1)[0].value;
    const value = legendValue(detail, score, label.character);
    const [nameY, valueY] = LABEL_LINES[side].map(dy => at.y + dy);

    ctx.font = font(600, 24, SANS);
    const name = fitText(ctx, label.region || t(ASPECT_LABELS[key]), room);
    const nameW = ctx.measureText(name).width;
    const left = side === "r" ? at.x : side === "l" ? at.x - nameW - DOT_SPACE : at.x - (nameW + DOT_SPACE) / 2;
    ctx.beginPath();
    ctx.arc(left + DOT_R, nameY, DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = REGION_HUES[key];
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = theme.ink;
    ctx.fillText(name, left + DOT_SPACE, nameY);

    // A score is a numeral in the display face; a character is words. The dash
    // sits in the display face too, muted.
    const numeral = /^\d+$/.test(value);
    ctx.font = numeral || value === NONE ? font(400, 32, WORD) : font(400, 22, SANS);
    ctx.fillStyle = numeral ? theme.ink : theme.muted;
    ctx.textAlign = side === "r" ? "left" : side === "l" ? "right" : "center";
    const valueX = side === "r" ? at.x + DOT_SPACE : side === "l" ? at.x : at.x + DOT_SPACE / 2;
    ctx.fillText(fitText(ctx, value, room), valueX, valueY);
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
  const detail = DETAIL_LEVELS.includes(opts.detail) ? opts.detail : "full";
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
  ctx.fillText("ASTERISM", mid, LAYOUT.wordmark);
  ctx.font = font(400, 24, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText("asterism.plainpoint.net", mid, LAYOUT.url);

  // The sheet's own choice of view wins over the page's, which only seeds it.
  drawSticker(ctx, theme, SHAPE_VIEWS.includes(opts.shape) ? { ...data, shape: opts.shape } : data, grow);
  drawRegionLabels(ctx, theme, data, detail, grow);
  drawFoot(ctx, theme, data, detail, maxWidth);
}

// The line under the star follows the labels (the owner, 2026-10-03): Score
// shows the Balance Index, Character your constellation under its own
// heading, or a dash until every region has a character. The code only,
// never the answers behind it (v171-v172).
function drawFoot(ctx, theme, data, detail, maxWidth) {
  const mid = STORY_W / 2;
  const coded = detail === "character";
  const value = coded ? data.constellation?.code ?? NONE : String(data.index ?? "");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(700, 24, SANS);
  ctx.fillStyle = theme.muted;
  ctx.fillText(t(coded ? "Your constellation" : "Balance Index").toUpperCase(), mid, LAYOUT.footLabel);
  ctx.font = font(400, 72, WORD);
  ctx.fillStyle = value === NONE ? theme.muted : theme.ink;
  ctx.fillText(fitText(ctx, value, maxWidth), mid, LAYOUT.footValue);
}

// The code as a plain string, or none: a card short of a character in any
// region has no constellation.
function cardConstellation(c) {
  if (!c || !c.complete || typeof c.code !== "string") return null;
  return { code: c.code };
}

// Each region's name and character, as plain strings, or none at all.
function cardLabels(labels) {
  if (!labels || typeof labels !== "object") return {};
  const text = (v) => (typeof v === "string" && v ? v : null);
  return Object.fromEntries(RADAR_KEYS.filter(k => labels[k]).map(k => [k, {
    region: text(labels[k].region),
    character: text(labels[k].character)
  }]));
}

// Everything the card needs, assembled from state the dashboard already has.
// Not your name, nor the date (v182): the card is the star, not a record.
export function storyCardData({ aspects, index, shape, labels, constellation }) {
  return {
    aspects: aspects || {},
    index,
    shape: SHAPE_VIEWS.includes(shape) ? shape : "star",
    labels: cardLabels(labels),
    constellation: cardConstellation(constellation)
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
