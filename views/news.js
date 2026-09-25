// views/news.js - the dated news list the redesign's pages share (redesign R4;
// the prototype's .newslist / .newsrow): Home's recent records, an aspect's
// weekly trend and the past weekly reviews. Markup only, no motion.

import { t } from "../i18n.js";
import { ASPECT_LABELS } from "../chart.js";
import { CHAPTERS } from "./journey.js";
import { SPRITES } from "./stage.js";
import { escapeHtml } from "./helpers.js";

export const chapterOf = (aspect) => CHAPTERS.find(c => c.aspect === aspect);

// The aspect's name as plain text, for places that escape it themselves
// (helpers.js's aspectLabel returns it already escaped, for raw HTML sinks).
export const aspectName = (key) => t(ASPECT_LABELS[key] || key);

// "2026.09.21", the prototype's news-list date, the same in both languages.
// "" for a date that does not parse, so a bad record never prints NaN.
export function dotDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}`;
}

// "Body +2 · Environment -1", or "scores steady". Text: the caller escapes.
export function shiftSummary(shifts) {
  const parts = Object.entries(shifts || {})
    .map(([key, v]) => `${aspectName(key)} ${v > 0 ? "+" : ""}${v}`);
  return parts.length ? parts.join(" · ") : t("scores steady");
}

export const motifIcon = (aspect) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="${SPRITES}#motif-${aspect}"/></svg>`;

const STAR_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="${SPRITES}#star"/></svg>`;

// A row's thumbnail with the gilt star, or `svg` (trusted markup) in its place.
export const starThumb = (svg = STAR_SVG) => `<span class="newsrow-thumb newsrow-star">${svg}</span>`;

// A row's thumbnail: the region's motif on its wash, or the gilt star.
export function motifThumb(aspect) {
  const chapter = aspect && chapterOf(aspect);
  if (!chapter) return starThumb();
  return `<span class="newsrow-thumb" style="background: ${chapter.wash}; --hue: ${chapter.hue};">${motifIcon(aspect)}</span>`;
}

// One row. `thumb` is trusted markup; everything else, the link included, is
// escaped here.
export function newsRow({ date = "", kind, thumb, title, sub = "", href = "" }) {
  const inner = `
    <span class="newsrow-meta">${date ? `<span class="newsrow-date">${escapeHtml(date)}</span>` : ""}<span class="newsrow-kind">${escapeHtml(kind)}</span></span>
    ${thumb}
    <span class="newsrow-title">${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ""}</span>`;
  return href ? `<li><a class="newsrow" href="${escapeHtml(href)}">${inner}</a></li>` : `<li class="newsrow">${inner}</li>`;
}
