// The Phase 4 art set (docs/interactive-web-plan.md §6): the sprite sheet, the
// region emblems and the asset budget. The budget is the phase's exit
// criterion, so it is held here rather than checked once by hand:
//   motion JS ≤ 6 KB (motion.js, gzipped), SVG sprites ≤ 25 KB, and each
//   raster emblem ≤ 20 KB at its display size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { installDom } from "./dom-stub.mjs";

installDom();
const { CHAPTERS } = await import("../views/journey.js");
const { RADAR_KEYS } = await import("../chart.js");

const url = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");
const bytes = (path) => statSync(url(path)).size;
const SPRITES = read("assets/sprites.svg");

function symbolPath(id) {
  const m = new RegExp(`<symbol id="${id}"[^>]*>\\s*<path d="([^"]+)"`).exec(SPRITES);
  return m && m[1];
}

test("budget: motion.js is at most 6 KB gzipped", () => {
  const size = gzipSync(readFileSync(url("motion.js")), { level: 9 }).length;
  assert.ok(size <= 6 * 1024, `motion.js is ${size} bytes gzipped`);
});

test("budget: the sprite sheet is at most 25 KB", () => {
  assert.ok(bytes("assets/sprites.svg") <= 25 * 1024);
});

test("budget: every region has a WebP emblem of at most 20 KB", () => {
  for (const chapter of CHAPTERS) {
    const path = `assets/emblems/${chapter.art}.webp`;
    assert.ok(existsSync(url(path)), `${path} is missing`);
    const head = readFileSync(url(path)).subarray(0, 12);
    assert.equal(head.toString("latin1", 0, 4), "RIFF", `${path} is not a RIFF file`);
    assert.equal(head.toString("latin1", 8, 12), "WEBP", `${path} is not WebP`);
    assert.ok(bytes(path) <= 20 * 1024, `${path} is ${bytes(path)} bytes`);
  }
});

test("sprites: the glint is the symbols.md S2 silhouette", () => {
  assert.equal(symbolPath("glint"), "M12 0 Q13 11 24 12 Q13 13 12 24 Q11 13 0 12 Q11 11 12 0Z");
});

test("sprites: one motif per aspect, identical to the chapter's own", () => {
  assert.deepEqual(CHAPTERS.map(c => c.aspect), RADAR_KEYS);
  for (const chapter of CHAPTERS) {
    assert.equal(symbolPath(`motif-${chapter.aspect}`), chapter.motif, `motif-${chapter.aspect} drifted`);
  }
});

test("sprites: every <use> in the app points at a symbol that exists", () => {
  const ids = new Set([...SPRITES.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
  const sources = ["index.html", "views/moments.js"].map(read).join("\n");
  const refs = [...sources.matchAll(/sprites\.svg#([\w-]+)/g)].map(m => m[1]);
  // The footer star and the glint. The four tab icons went with the tab bar
  // (redesign R1); the floor only proves the regex still matches something.
  assert.ok(refs.length >= 2, `only ${refs.length} sprite references found`);
  for (const ref of refs) assert.ok(ids.has(ref), `#${ref} is not in assets/sprites.svg`);
});

test("offline: the service worker precaches the sprites and every emblem", () => {
  const sw = read("sw.js");
  assert.ok(sw.includes('"./assets/sprites.svg"'));
  for (const chapter of CHAPTERS) {
    assert.ok(sw.includes(`"./assets/emblems/${chapter.art}.webp"`), `${chapter.art} emblem not precached`);
  }
});

test("no layout shift: each ending's emblem is sized before it loads, and lazy", async () => {
  const dom = installDom();
  const { renderOnboarding } = await import("../views/onboarding.js");
  renderOnboarding("main-view", () => {});
  const html = dom.html["main-view"] || "";
  const imgs = [...html.matchAll(/<img src="\.\/assets\/emblems\/[^"]+"[^>]*>/g)].map(m => m[0]);
  assert.equal(imgs.length, CHAPTERS.length, "one emblem per chapter ending");
  for (const img of imgs) {
    assert.match(img, /width="96" height="96"/);
    assert.match(img, /loading="lazy"/);
    assert.match(img, /alt=""/);
  }
});
