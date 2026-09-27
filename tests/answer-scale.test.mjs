// The answers to a question, read as a scale (the owner, 2026-09-27): "on the
// PC web ... order from low-high, left-right ... on the mobile phone ... from
// low-high, bottom-top", and the chosen answer's "color is too dark and make
// the text hard to read. I think softer shade of color would help."
//
// Every instrument lists its options from the lowest wording to the highest
// (Never ... Always), so the order is laid out by the stylesheet alone: the
// markup, the tab order and what a screen reader hears stay low to high.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTERS } from "../views/journey.js";

const css = readFileSync(new URL("../css/journey.css", import.meta.url), "utf8");
const frame = readFileSync(new URL("../css/frame.css", import.meta.url), "utf8");
const phoneAt = css.indexOf("@media (max-width: 900px)");
const desktop = css.slice(0, phoneAt);
const phone = css.slice(phoneAt, css.indexOf("\n}\n", phoneAt));

const body = (src, selector) => {
  const at = src.indexOf(`${selector} {`);
  assert.ok(at >= 0, `no "${selector}" rule`);
  return src.slice(at, src.indexOf("}", at));
};

test("on a computer the answers run left to right in one row, lowest first", () => {
  const group = body(desktop, ".journey .radio-group");
  assert.match(group, /display: grid;/);
  assert.match(group, /grid-auto-flow: column;/, "one row: a wrapped second row breaks the scale");
  assert.match(group, /grid-auto-columns: minmax\(0, 1fr\);/, "equal steps");
});

test("on a phone the answers climb from the bottom, lowest at the bottom", () => {
  const group = body(phone, ".journey .radio-group");
  assert.match(group, /display: flex;/);
  assert.match(group, /flex-direction: column-reverse;/);
});

const hex = (n) => n.toString(16).padStart(2, "0");
const mix = (a, pct, b) => "#" + [1, 3, 5].map(i => {
  const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
  return hex(Math.round((x * pct + y * (100 - pct)) / 100));
}).join("");
const lum = (h) => {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("the chosen answer is a soft tint of its region, with dark ink that reads easily", () => {
  const chosen = body(css, ".journey .radio-option:has(input:checked)");
  assert.doesNotMatch(chosen, /--frame-dark|#ffffff;/, "the near-black fill with white text is gone");
  assert.match(chosen, /color: var\(--frame-ink\);/);
  const [, pct] = chosen.match(/background: color-mix\(in srgb, var\(--chapter-hue[^)]*\) (\d+)%, #ffffff\);/) ?? [];
  assert.ok(pct, "the fill is the region's hue mixed with white");
  const ink = frame.match(/--frame-ink: (#[0-9a-f]{6});/i)[1];
  for (const { region, hue, wash } of CHAPTERS) {
    const fill = mix(hue, Number(pct), "#ffffff");
    assert.ok(ratio(ink, fill) >= 7, `${region}: ink on the chosen answer is ${ratio(ink, fill).toFixed(2)}:1, under 7:1`);
    // Still tells itself apart from the page and the white answers around it.
    assert.ok(lum(fill) < lum(wash), `${region}: the chosen answer is paler than the page behind it`);
  }
});
