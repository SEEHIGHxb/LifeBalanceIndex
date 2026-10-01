// views/lone-words.js - no paragraph ends on a lone word (the owner's layout
// rule, 2026-10-01): "compact the space of the paragraph or reduce the font
// size to make the single word going up into previous line."
//
// index.css asks the browser for it first (text-wrap: pretty), but Chromium
// leaves a two-line paragraph alone and Firefox ignores the property. This
// pass measures what is left: a paragraph whose last line holds one word is
// tightened a step at a time, letter spacing first and then the size, and put
// back as it was if no step lifts the word. Words come from Intl.Segmenter,
// so Thai, written without spaces, counts by its words too.

const STEPS = [
  { letterSpacing: "-0.01em" },
  { letterSpacing: "-0.02em" },
  { letterSpacing: "-0.02em", fontSize: "0.96em" },
  { letterSpacing: "-0.02em", fontSize: "0.92em" }
];
const SELECTOR = "p, li";

function lastLineWords(el, segmenter) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const tops = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (const s of segmenter.segment(n.data)) {
      if (!s.isWordLike) continue;
      const r = document.createRange();
      r.setStart(n, s.index);
      r.setEnd(n, s.index + s.segment.length);
      const box = r.getClientRects()[0];
      if (box) tops.push(Math.round(box.top));
    }
  }
  const lines = [...new Set(tops)];
  if (lines.length < 2) return 0;
  const last = Math.max(...lines);
  return tops.filter(t => t === last).length;
}

function fit(el, segmenter) {
  el.style.letterSpacing = "";
  el.style.fontSize = "";
  if (lastLineWords(el, segmenter) !== 1) return;
  for (const step of STEPS) {
    el.style.letterSpacing = step.letterSpacing || "";
    el.style.fontSize = step.fontSize || "";
    if (lastLineWords(el, segmenter) !== 1) return;
  }
  el.style.letterSpacing = "";
  el.style.fontSize = "";
}

function sweep(root) {
  if (typeof Intl?.Segmenter !== "function") return;
  const segmenter = new Intl.Segmenter(document.documentElement.lang || "en", { granularity: "word" });
  root.querySelectorAll(SELECTOR).forEach(el => {
    // Lists of lists and hidden text (a closed fold) are measured when shown.
    if (!el.offsetParent || el.querySelector(SELECTOR)) return;
    fit(el, segmenter);
  });
}

// Measures now, again when the width changes, and inside a fold once opened.
export function tightenLoneWords(root, signal) {
  sweep(root);
  // Again once the web fonts are in: they set different widths.
  document.fonts?.ready.then(() => { if (!signal.aborted) sweep(root); });
  let width = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    sweep(root);
  }, { signal });
  root.addEventListener("toggle", (e) => {
    if (e.target.open) sweep(e.target);
  }, { signal, capture: true });
}
