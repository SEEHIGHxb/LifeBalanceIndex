// Makes the app's emblem copies from the 1024 px masters in emblems/.
//
//   node docs/identity/make-app-emblems.mjs
//
// symbols.md S8: the masters stay here; the app gets small, trimmed copies.
// Each copy is trimmed to the drawing (the master's cream margin is cut to a
// 4 % pad), squared, and encoded as WebP at twice its 112 px display size.
// The budget (plan §6, Phase 4) is 20 KB per image; tests/art-set.test.mjs
// holds it. Chromium does the resize and the encode, so no image library is
// needed.
//
// The masters are read as data: URLs, which keeps the canvas untainted.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(root, "assets", "emblems");

const MASTERS = {
  market: "s8-1-market.webp",
  highlands: "s8-2-highlands.webp",
  "still-water": "s8-3-still-water.webp",
  commons: "s8-4-commons.webp",
  workshop: "s8-5-workshop.webp",
  crossroads: "s8-6-crossroads.webp",
  wildwood: "s8-7-wildwood.webp",
  lookout: "s8-8-lookout.webp"
};
const SIZE = 224;
const BUDGET = 20 * 1024;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

for (const [name, file] of Object.entries(MASTERS)) {
  const src = `data:image/webp;base64,${readFileSync(join(here, "emblems", file)).toString("base64")}`;
  let bytes = null;
  // Step the quality down until the copy fits the budget.
  for (const quality of [0.86, 0.8, 0.74, 0.68, 0.6]) {
    const dataUrl = await page.evaluate(async ({ src, size, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const probe = new OffscreenCanvas(w, h);
      const pctx = probe.getContext("2d");
      pctx.drawImage(img, 0, 0);
      const { data } = pctx.getImageData(0, 0, w, h);
      // The ground colour is the top-left pixel; anything clearly different
      // from it is drawing.
      const [r0, g0, b0] = data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const d = Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0);
          if (d > 36) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }
      const side = Math.max(maxX - minX, maxY - minY) * 1.08;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = `rgb(${r0}, ${g0}, ${b0})`;
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
      return canvas.toDataURL("image/webp", quality);
    }, { src, size: SIZE, quality });
    bytes = Buffer.from(dataUrl.split(",")[1], "base64");
    if (bytes.length <= BUDGET) break;
  }
  writeFileSync(join(outDir, `${name}.webp`), bytes);
  console.log(`${name}.webp ${bytes.length} bytes`);
}

await browser.close();
