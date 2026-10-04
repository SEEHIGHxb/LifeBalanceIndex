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

const entry = html.match(/<script type="module" src="\.\/([^"]+)"/)[1];
const core = moduleGraph(entry);

// The owner, 2026-09-27: "load only the code each screen needs". The screens
// are fetched when first shown (view-loader.js), and the Thai dictionary only
// for a Thai reader, so none of them is in what app.js imports.
test("the first download leaves out every other screen and the Thai dictionary", () => {
  const screens = ["dashboard", "review", "aspect", "assessments", "methodology", "yearreview",
    "quests", "leaderboard", "profile", "onboarding", "landing"];
  const leaked = [...core].filter(u => screens.some(s => u === `views/${s}.js`) || u === "th.js");
  assert.deepEqual(leaked, []);
  assert.doesNotMatch(read("app.js"), /from "\.\/ui\.js/, "the barrel of every screen is gone");
});

test("the core and the Landing are preloaded, so a first visit fetches them together", () => {
  // The Landing is the first screen of every first visit, so its code is
  // asked for with the core instead of after it.
  const landing = [...moduleGraph("views/landing.js")].filter(u => !core.has(u));
  const expected = [...[...core].filter(u => u !== entry), ...landing].sort();
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="\.\/([^"]+)">/g)].map(m => m[1]).sort();
  assert.deepEqual(preloaded, expected);
});

test("the Thai dictionary loads before a Thai reader sees a word", async () => {
  const i18n = await import("../i18n.js");
  i18n.setLang("en");
  assert.equal(i18n.t("Overview"), "Overview");
  await i18n.loadLang("th");
  i18n.setLang("th");
  assert.equal(i18n.t("Overview"), "ภาพรวม");
  i18n.setLang("en");
  // Loaded at the top of i18n.js, before any module that translates as it
  // loads (criteria.js, benchmarks.js) has run.
  assert.match(read("i18n.js"), /^if \(currentLang === "th"\) await loadLang\("th"\);$/m);
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

// A Thai reader's app.js runs only once i18n.js has fetched the dictionary (a
// top-level await), after DOMContentLoaded and perhaps load have fired. A
// listener for either, added then, never runs: in testing, the app did not
// start at all in Thai.
test("the app starts, and works offline, even when it runs after the page has loaded", () => {
  const app = read("app.js");
  assert.doesNotMatch(app, /window\.addEventListener\("(DOMContentLoaded|load)"/);
  assert.match(app, /whenReady\("DOMContentLoaded", \(\) => document\.readyState !== "loading"/);
  assert.match(app, /whenReady\("load", \(\) => document\.readyState === "complete"/);
});

// Measured: a Thai reader's Landing came 0.4 s later than it had to, as the
// dictionary was asked for only once the whole core had loaded and run. A
// few lines read the saved language as the page opens and start it at once.
test("a Thai reader's dictionary starts downloading with the core", () => {
  // High priority: an async script is fetched last otherwise, too late to help.
  assert.match(html, /<script async fetchpriority="high" src="\.\/lang-preload\.js"><\/script>/);
  const src = read("lang-preload.js");
  assert.match(src, /localStorage\.getItem\("lifequest_lang"\) === "th"/, "the key i18n.js reads");
  assert.match(src, /link\.rel = "modulepreload";\s*link\.href = "\.\/th\.js";/);
  assert.match(read("i18n.js"), /const LANG_STORAGE_KEY = "lifequest_lang";/);
  assert.match(read("sw.js"), /"\.\/lang-preload\.js"/, "offline too");
});
