// The three views of your eight scores (v134): the geometry they share
// (chart.js shapeKite), the figure and its switch (views/shape.js), the share
// card drawn in each, and the Landing the ASTERISM wordmark now leads to.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeKite, shapeRim, SHAPE_VIEWS, RADAR_KEYS } from "../chart.js";
import { drawStoryCard, storyCardData, THEMES, DETAIL_LEVELS, STORY_W } from "../story-card.js";

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
const { shapeFigure, shapeSwitchMarkup, readShapeView, saveShapeView, shapeDial, viewAtTurn, turnFor, settleTurn } = await import("../views/shape.js");
const { landingMarkup } = await import("../views/landing.js");

const SCORES = [55, 62, 71, 48, 70, 44, 58, 51];
const close = (a, b) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;

test("every view puts each score's tip in the same place", () => {
  for (let i = 0; i < 8; i++) {
    const tips = SHAPE_VIEWS.map(v => shapeKite(v, i, SCORES, 50, 50, 47)[2]);
    assert.ok(close(tips[0], tips[1]) && close(tips[1], tips[2]), `tip ${i} moves between views`);
  }
});

test("the radar's kites tile its polygon: each kite's after is the next one's before", () => {
  for (let i = 0; i < 8; i++) {
    const kite = shapeKite("radar", i, SCORES, 50, 50, 47);
    const next = shapeKite("radar", (i + 1) % 8, SCORES, 50, 50, 47);
    assert.ok(close(kite[3], next[1]), `kite ${i} leaves a gap`);
  }
});

test("a kite always has four points, halves included, so any view morphs into any other", () => {
  for (const view of SHAPE_VIEWS) {
    for (const half of ["both", "start", "end"]) {
      assert.equal(shapeKite(view, 3, SCORES, 50, 50, 47, half).length, 4, `${view}/${half}`);
    }
  }
});

test("scores outside 0-100, or missing, stay inside the rim", () => {
  const wild = [150, -20, null, undefined, "x", 100, 0, 50];
  for (const view of SHAPE_VIEWS) {
    for (let i = 0; i < 8; i++) {
      for (const p of shapeKite(view, i, wild, 50, 50, 47)) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${view} ${i} is not a number`);
        assert.ok(Math.hypot(p.x - 50, p.y - 50) <= 47 + 1e-9, `${view} ${i} escapes the rim`);
      }
    }
  }
});

test("the radar's rim is an octagon through the eight axes; the asterism has none", () => {
  assert.equal(shapeRim("radar", 50, 50, 47).length, RADAR_KEYS.length);
  assert.equal(shapeRim("star", 50, 50, 47).length, 16);
  assert.deepEqual(shapeRim("asterism", 50, 50, 47), []);
});

test("the figure draws eight kites per reading in the view asked for, with no NaN", () => {
  const solo = shapeFigure({ view: "radar", you: [null, 50, 50, 50, 50, 50, 50, 50] });
  assert.match(solo, /data-view="radar"/);
  assert.equal((solo.match(/<g class="sh-fill">/g) || []).length, 1);
  const fill = solo.slice(solo.indexOf("<g class=\"sh-fill\">"), solo.indexOf("<polygon class=\"sh-line\""));
  assert.equal((fill.match(/<polygon points=/g) || []).length, 8);
  assert.doesNotMatch(solo, /NaN/);
  const duo = shapeFigure({ view: "asterism", you: SCORES, them: SCORES, avg: SCORES });
  assert.match(duo, /class="shape shape-duo"/);
  assert.match(duo, /sh-them/);
  assert.match(duo, /sh-avg-ring/);
});

// v179, the owner: a ring to turn rather than a bar of buttons, and it goes
// round, so the asterism turns straight on into the star.
test("the dial goes round: every whole turn is a view, and past the asterism comes the star", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(viewAtTurn), ["star", "radar", "asterism", "star", "radar"]);
  assert.deepEqual([-1, -2, -3].map(viewAtTurn), ["asterism", "radar", "star"]);
  assert.equal(viewAtTurn(0.49), "star");
  assert.equal(viewAtTurn(0.51), "radar");
});

test("a dot turns the short way: from the star, the asterism is one step back", () => {
  assert.equal(turnFor("asterism", 0), -1);
  assert.equal(turnFor("radar", 0), 1);
  assert.equal(turnFor("star", 2), 3, "from the asterism, on round to the star");
  assert.equal(turnFor("star", 0), 0);
});

test("a let-go ring lands on the nearest view, or one on when flung, never further", () => {
  assert.equal(settleTurn(0.3), 0);
  assert.equal(settleTurn(0.6), 1);
  assert.equal(settleTurn(-0.6), -1, "backwards past halfway: the asterism");
  assert.equal(settleTurn(0.2, 0.01), 1, "a fling carries on");
  assert.equal(settleTurn(0.2, 1), 1, "however hard, one view at a time");
  assert.equal(settleTurn(0.2, -1), -1);
});

test("the dial wraps the figure in a ring with a grip, its symbols and a marker", () => {
  const html = shapeDial(shapeFigure({ view: "radar", you: SCORES }), "radar");
  assert.match(html, /^<div class="shape-dial"><div class="dial-fig"><svg class="shape"/);
  assert.match(html, /class="dial-turn" transform="rotate\(120\.00 50 50\)"/, "turned so the radar is at the top");
  assert.equal((html.match(/class="dial-icon"/g) || []).length, 3);
  assert.match(html, /class="dial-mark"/);
  assert.match(html, /class="dial-hit"/);
  assert.match(html, /class="dial-ring"[^>]*aria-hidden="true"/, "the dots are what a screen reader uses");
  assert.doesNotMatch(html, /NaN/);
});

test("the switch offers the three views and marks the current one", () => {
  const html = shapeSwitchMarkup("asterism");
  for (const view of SHAPE_VIEWS) assert.match(html, new RegExp(`data-shape="${view}"`));
  assert.match(html, /data-shape="asterism" aria-pressed="true"/);
  assert.match(html, /data-shape="star" aria-pressed="false"/);
  assert.match(html, /class="shape-dots" role="group"/);
  assert.match(html, /class="dial-hint" hidden>/, "the hint waits for the first ring");
});

test("the chosen view is remembered, and anything else reads as the star", () => {
  store.clear();
  assert.equal(readShapeView(), "star");
  saveShapeView("radar");
  assert.equal(readShapeView(), "radar");
  store.set("lifequest_shape_view", "pie");
  assert.equal(readShapeView(), "star");
});

test("the share card draws every view inside the card, under the ASTERISM wordmark", () => {
  const points = [];
  const texts = [];
  const ctx = new Proxy({ measureText: s => ({ width: String(s).length * 14 }) }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "moveTo" || key === "lineTo") return (x, y) => points.push({ x, y });
      if (key === "arc") return (x, y) => points.push({ x, y });
      if (key === "fillText") return (s) => texts.push(String(s));
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const data = storyCardData({ name: "Fixture", date: new Date("2026-09-28"), aspects: Object.fromEntries(RADAR_KEYS.map((k, i) => [k, SCORES[i]])), index: 58, bandLabel: "Steady", standing: { count: 5, total: 8 }, grades: {} });
  for (const shape of SHAPE_VIEWS) {
    for (const theme of Object.keys(THEMES)) {
      for (const detail of DETAIL_LEVELS) {
        drawStoryCard(ctx, data, { theme, detail, shape });
      }
    }
  }
  assert.ok(points.length > 0);
  assert.deepEqual(points.filter(p => !Number.isFinite(p.x) || p.x < 0 || p.x > STORY_W), []);
  assert.ok(texts.includes("ASTERISM"));
  assert.ok(!texts.includes("LIFE BALANCE INDEX"));
});

test("an unknown shape on the card falls back to the star", () => {
  assert.equal(storyCardData({ shape: "pie" }).shape, "star");
  assert.equal(storyCardData({ shape: "asterism" }).shape, "asterism");
});

test("the Landing for a returning reader leads to their Home and offers no restore", () => {
  const first = landingMarkup();
  assert.match(first, /href="#\/journey"/);
  assert.match(first, /btn-restore-backup/);
  const back = landingMarkup({ returning: true });
  assert.doesNotMatch(back, /href="#\/journey"/);
  assert.equal((back.match(/href="#\/dashboard"/g) || []).length, 3);
  assert.doesNotMatch(back, /btn-restore-backup/);
});
