// tests/story-card.test.mjs - the shareable card.
//
// No canvas is needed anywhere here. drawStoryCard() only ever talks to a 2D
// context, so a RECORDING STUB standing in for one turns "what got drawn"
// into a plain array that can be asserted against. That is what lets a
// pixel-producing feature be tested in Node with no browser and no snapshots.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  drawStoryCard, storyCardData, fitText, wrapText,
  THEMES, DETAIL_LEVELS, STORY_W, STORY_H, SAFE_TOP, SAFE_LOW
} from "../story-card.js";
import { radarPoints, RADAR_KEYS } from "../chart.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ASPECTS = {
  finance: 62, physical: 48, mental: 71, relationships: 55,
  personalGoals: 60, socialContribution: 30, environment: 44, humanityFuture: 38
};
const AVERAGE = {
  finance: 55, physical: 62, mental: 69, relationships: 70,
  personalGoals: 59, socialContribution: 32, environment: 50, humanityFuture: 44
};
const GRADES = {
  finance: { grade: "B" }, physical: { grade: "C" }, mental: { grade: "A" },
  relationships: null, personalGoals: { grade: "C" },
  socialContribution: { grade: "D" }, environment: { grade: "C" },
  humanityFuture: { grade: "F" }
};

// Records every call and every coordinate. measureText returns a plausible
// width so the wrapping and truncation paths execute for real.
function stubContext() {
  const calls = [];
  const points = [];
  const texts = [];
  const mark = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y }); };
  return {
    calls, points, texts,
    fillStyle: "", strokeStyle: "", lineWidth: 0, font: "",
    textAlign: "", textBaseline: "",
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    beginPath() { calls.push(["beginPath"]); },
    closePath() { calls.push(["closePath"]); },
    fill() { calls.push(["fill"]); },
    stroke() { calls.push(["stroke"]); },
    setLineDash(d) { calls.push(["setLineDash", d]); },
    fillRect(x, y, w, h) { calls.push(["fillRect", x, y, w, h]); },
    moveTo(x, y) { calls.push(["moveTo", x, y]); mark(x, y); },
    lineTo(x, y) { calls.push(["lineTo", x, y]); mark(x, y); },
    arc(x, y, r) { calls.push(["arc", x, y, r]); mark(x, y - r); mark(x, y + r); },
    fillText(s, x, y) {
      calls.push(["fillText", s, x, y]);
      texts.push(String(s));
      // Record the drawn EXTENT, not just the anchor. An earlier version of
      // this stub tracked only (x, y), which let three long axis labels ship
      // clipped off the left edge of the canvas — the anchor was comfortably
      // inside while the text ran past it.
      const w = this.measureText(s).width;
      const left = this.textAlign === "left" ? x
        : this.textAlign === "right" ? x - w : x - w / 2;
      texts.extents = texts.extents || [];
      texts.extents.push({ s: String(s), left, right: left + w, y });
      mark(x, y);
    },
    measureText(s) { return { width: String(s).length * 14 }; }
  };
}

const draw = (opts, extra = {}) => {
  const ctx = stubContext();
  const data = storyCardData({
    name: "Jojo", date: new Date("2026-07-31T00:00:00Z"),
    aspects: ASPECTS, average: AVERAGE, index: 58,
    bandLabel: "Steady balance", standing: { count: 5, total: 8 }, grades: GRADES,
    ...extra
  });
  drawStoryCard(ctx, data, opts);
  return ctx;
};

test("nothing is drawn under Instagram's own chrome, at any detail level", () => {
  for (const detail of DETAIL_LEVELS) {
    for (const theme of Object.keys(THEMES)) {
      const ctx = draw({ theme, detail });
      // fillRect is excluded deliberately: the only one is the full-bleed
      // background, which is SUPPOSED to cover the reserved bands.
      const stray = ctx.points.filter(p => p.y < SAFE_TOP || p.y > SAFE_LOW);
      assert.deepEqual(stray, [], `${theme}/${detail} drew outside the safe band`);
      const sideways = ctx.points.filter(p => p.x < 0 || p.x > STORY_W);
      assert.deepEqual(sideways, [], `${theme}/${detail} drew outside the canvas width`);
    }
  }
});

test("no drawn text runs off either edge of the card", () => {
  // The regression this exists for: at the `full` detail level the long
  // left-hand labels ("Social Contribution  D", "Humanity's Future  C") were
  // anchored inside the canvas but rendered past its left edge, so the words
  // arrived on the exported PNG with their first letters missing.
  for (const detail of DETAIL_LEVELS) {
    for (const theme of Object.keys(THEMES)) {
      const ctx = draw({ theme, detail });
      const clipped = (ctx.texts.extents || [])
        .filter(e => e.left < 0 || e.right > STORY_W)
        .map(e => `${e.s} [${Math.round(e.left)}..${Math.round(e.right)}]`);
      assert.deepEqual(clipped, [], `${theme}/${detail} clipped text at the canvas edge`);
    }
  }
});

test("the detail level decides what the card states about you", () => {
  const shape = draw({ detail: "shape" }).texts;
  const named = draw({ detail: "names" }).texts;
  const full = draw({ detail: "full" }).texts;

  // "Shape only" must not name a single aspect - that is the whole point of
  // the level: a viewer sees the outline and can read nothing off it.
  assert.ok(!shape.some(s => s === "Mental" || s.startsWith("Mental ")), "shape level named Mental");
  assert.ok(!shape.some(s => s === "Finance" || s.startsWith("Finance ")), "shape level named Finance");
  assert.ok(!shape.includes("71"), "shape level printed a score");

  // Names on, numbers still off.
  assert.ok(named.some(s => s.startsWith("Mental")), "names level omitted the aspect labels");
  assert.ok(!named.includes("71"), "names level printed a score");
  assert.ok(!named.some(s => s === "Mental  A"), "names level printed a grade");

  // Everything: labels carry the grade letter, and each score is printed.
  assert.ok(full.some(s => s === "Mental  A"), "full level omitted the grade letter");
  assert.ok(full.includes("71"), "full level omitted the score");
  assert.ok(full.includes("30"), "full level omitted a low score");
});

test("an ungraded aspect shows no letter rather than a placeholder", () => {
  // relationships is unranked by design (v39/v43). Inventing a dash or an "N/A"
  // beside it would imply a grade exists and was merely hidden.
  const full = draw({ detail: "full" }).texts;
  assert.ok(full.some(s => s === "Relationships"), "expected a bare Relationships label");
  assert.ok(!full.some(s => s.startsWith("Relationships ")), "a grade was invented for an unranked aspect");
});

test("the Balance Index and its band always appear, whatever the detail", () => {
  for (const detail of DETAIL_LEVELS) {
    const texts = draw({ detail }).texts;
    assert.ok(texts.includes("58"), `${detail} dropped the Balance Index`);
    assert.ok(texts.includes("Steady balance"), `${detail} dropped the band`);
    assert.ok(texts.some(s => s.includes("5 of 8")), `${detail} dropped the standing line`);
  }
});

test("both themes resolve to literal colors, never CSS variables", () => {
  // A `var(--…)` here would survive lint and tests but render as transparent
  // black on the exported PNG, because a canvas has no cascade to resolve it.
  const src = readFileSync(join(root, "story-card.js"), "utf8");
  assert.ok(!/var\(--/.test(src), "story-card.js must not reference CSS custom properties");

  for (const [name, theme] of Object.entries(THEMES)) {
    for (const [token, value] of Object.entries(theme)) {
      assert.match(value, /^(#[0-9a-f]{6}|rgba?\()/i, `${name}.${token} is not a literal color`);
    }
  }
});

test("an unknown theme or detail falls back rather than drawing nothing", () => {
  const ctx = draw({ theme: "chartreuse", detail: "everything-please" });
  assert.ok(ctx.texts.includes("58"), "a bad option set produced an empty card");
  assert.ok(!ctx.texts.some(s => s.startsWith("Mental")), "the fallback detail level should be 'shape'");
});

test("radarPoints puts 0 at the centre and 100 on the rim, in chart order", () => {
  const zero = radarPoints({}, RADAR_KEYS, 500, 500, 300);
  zero.forEach(pt => {
    assert.ok(Math.abs(pt.x - 500) < 1e-9 && Math.abs(pt.y - 500) < 1e-9, "0 should sit at the centre");
  });

  const rim = radarPoints(
    Object.fromEntries(RADAR_KEYS.map(k => [k, 100])), RADAR_KEYS, 500, 500, 300
  );
  rim.forEach(pt => {
    const dist = Math.hypot(pt.x - 500, pt.y - 500);
    assert.ok(Math.abs(dist - 300) < 1e-9, "100 should sit on the rim");
  });

  // First axis points straight up; the eight are evenly spaced clockwise.
  assert.equal(rim[0].key, "finance");
  assert.ok(Math.abs(rim[0].x - 500) < 1e-9 && rim[0].y < 500, "the first axis should point up");
  assert.equal(rim.length, 8);
});

test("out-of-range and missing scores are clamped, never escaping the rim", () => {
  const pts = radarPoints(
    { finance: 250, physical: -40, mental: NaN, relationships: "oops" },
    RADAR_KEYS, 500, 500, 300
  );
  assert.equal(pts[0].value, 100);
  assert.equal(pts[1].value, 0);
  assert.equal(pts[2].value, 0);
  assert.equal(pts[3].value, 0);
  pts.forEach(pt => {
    assert.ok(Math.hypot(pt.x - 500, pt.y - 500) <= 300 + 1e-9, "a point escaped the rim");
  });
});

test("a hostile profile name is truncated instead of running off the card", () => {
  const ctx = draw({ detail: "shape" }, { name: "Jo".repeat(200) });
  const drawn = ctx.calls.find(c => c[0] === "fillText" && String(c[1]).startsWith("Jo"));
  assert.ok(drawn, "the name was not drawn at all");
  assert.ok(drawn[1].endsWith("…"), "an over-long name should be ellipsised");
  assert.ok(ctx.measureText(drawn[1]).width <= STORY_W - 160, "the truncated name still overflows");
});

test("fitText leaves a name that already fits completely alone", () => {
  const ctx = stubContext();
  assert.equal(fitText(ctx, "Jojo", 1000), "Jojo");
  assert.equal(fitText(ctx, "", 1000), "");
});

test("wrapText breaks Thai, which has no spaces to break on", () => {
  const ctx = stubContext();
  // One space-free token far wider than the line: word wrapping alone would
  // overflow, so it has to fall back to breaking by character.
  const thai = "ก".repeat(120);
  const lines = wrapText(ctx, thai, 280, 2);
  assert.equal(lines.length, 2);
  lines.forEach(line => assert.ok(ctx.measureText(line).width <= 280, "a wrapped line still overflows"));
  assert.ok(lines[1].endsWith("…"), "the overflowing tail should be ellipsised");
});

test("the card is a 9:16 story frame with the reserved bands accounted for", () => {
  assert.equal(STORY_W, 1080);
  assert.equal(STORY_H, 1920);
  assert.equal(STORY_W / STORY_H, 9 / 16);
  assert.equal(SAFE_TOP, 250);
  assert.equal(SAFE_LOW, 1670);
});

test("storyCardData formats the date and survives missing fields", () => {
  const bare = storyCardData({});
  assert.equal(bare.name, "");
  assert.equal(bare.average, null);
  assert.deepEqual(bare.grades, {});
  assert.ok(bare.dateText.length > 0, "a date should always be produced");

  const dated = storyCardData({ date: new Date("2026-07-31T00:00:00Z") });
  assert.match(dated.dateText, /2026/);
});
