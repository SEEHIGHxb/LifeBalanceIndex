// The first visit (the owner, 2026-09-26: "the web took a bit long to load").
// Measured on a phone over 4G: the Landing waited on 50 modules found five
// imports deep, one round trip per level, and all eight region photographs
// (1.3 MB of 1.8 MB) downloaded though none is on the first screen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { installDom } from "./dom-stub.mjs";

installDom();
const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");
const html = read("index.html");

// Every module app.js reaches through static imports, as the URL the browser
// asks for (the ?v= kept: a preload under another URL is a second download).
function moduleGraph(entry) {
  const seen = new Set();
  const walk = (url) => {
    if (seen.has(url)) return;
    seen.add(url);
    const file = url.split("?")[0];
    const src = read(file);
    const specs = src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+"(\.[^"]+)"|^\s*import\s+"(\.[^"]+)"/gms);
    for (const m of specs) {
      const [p, q] = (m[1] || m[2]).split("?");
      walk(posix.normalize(posix.join(posix.dirname(file), p)) + (q ? `?${q}` : ""));
    }
  };
  walk(entry);
  return seen;
}

test("every module the app imports is preloaded, so they arrive together", () => {
  const entry = html.match(/<script type="module" src="\.\/([^"]+)"/)[1];
  const graph = [...moduleGraph(entry)].filter(u => u !== entry).sort();
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="\.\/([^"]+)">/g)].map(m => m[1]).sort();
  assert.deepEqual(preloaded, graph);
});

test("the first screen's two fonts are preloaded", () => {
  for (const font of ["anton-latin", "inter-latin"]) {
    assert.match(html, new RegExp(`<link rel="preload" href="\\./assets/fonts/${font}\\.woff2" as="font" type="font/woff2" crossorigin>`));
  }
});

test("the Landing's region photographs wait until they are near the screen", async () => {
  const { landingMarkup } = await import("../views/landing.js");
  const out = landingMarkup();
  assert.doesNotMatch(out, /background-image: url\('\.\/assets\/regions/, "a background image downloads at once");
  const photos = [...out.matchAll(/<img [^>]*src="\.\/assets\/regions\/[^"]+"[^>]*>/g)].map(m => m[0]);
  assert.equal(photos.length, 8 + 3, "eight cards and the three-photo band");
  for (const img of photos) assert.match(img, /loading="lazy"/);
});
