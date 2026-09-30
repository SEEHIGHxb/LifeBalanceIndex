// Your star's own page (#/star, v135): the labels round it name regions and
// show a score, a character, both or nothing more; the share card follows
// the same choices; and the Home star leads here.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";
import { drawStoryCard, storyCardData, legendValue, DETAIL_LEVELS } from "../story-card.js";

const MAIN = "main-view";
let dom;
beforeEach(() => { dom = installDom(); });

installDom();
const { renderStarPage, starLabelsMarkup } = await import("../views/star-page.js");
const { regionLabels } = await import("../views/dashboard.js");
const { CHAPTERS } = await import("../views/journey.js");

const STATE = {
  ...DEFAULT_STATE,
  onboarded: true,
  profile: {
    ...DEFAULT_STATE.profile,
    name: "Fixture", level: 34, age: 34,
    gender: "female", region: "Provinces", employment: "Office Worker",
    relationshipStatus: "Single", income: 30000, savingsRate: 10
  },
  aspects: {
    finance: 55, physical: 62, mental: 71, relationships: 48,
    personalGoals: 70, socialContribution: 44, environment: 58, humanityFuture: 51
  },
  baseline: {
    ...DEFAULT_STATE.baseline,
    date: "2026-08-01T00:00:00.000Z",
    cfpb: 10, jss: 12, st5: 5, who5: 15, lsns: 15, ucla: 5
  },
  reviews: [],
  checkins: [],
  goals: []
};

const labelTexts = (html) => [...html.matchAll(/<li class="sp-label"[^>]*>(.*?)<\/li>/g)].map(m => m[1].replace(/<[^>]+>/g, "").trim());

test("the labels name the eight regions, never the aspects", () => {
  const texts = labelTexts(starLabelsMarkup(STATE, "full"));
  assert.equal(texts.length, 8);
  CHAPTERS.forEach((c, i) => assert.ok(texts[i].startsWith(c.region), texts[i]));
  assert.ok(!texts.some(s => /Finance|Mental/.test(s)));
});

test("Score shows each score, and Character each character", () => {
  const labels = regionLabels(STATE);
  const scores = labelTexts(starLabelsMarkup(STATE, "full"));
  const characters = labelTexts(starLabelsMarkup(STATE, "character"));
  CHAPTERS.forEach((c, i) => {
    const score = String(STATE.aspects[c.aspect]);
    assert.ok(scores[i].endsWith(` ${score}`), scores[i]);
    assert.ok(characters[i].endsWith(labels[c.aspect].character || score), characters[i]);
  });
  assert.ok(Object.values(labels).some(l => l.character), "the fixture should earn at least one character");
});

test("a region with no character falls back to its score", () => {
  assert.equal(legendValue("character", 40, null), "40");
  assert.equal(legendValue("character", 40, "Stargazer"), "Stargazer");
  assert.equal(legendValue("full", 40, "Stargazer"), "40");
  assert.deepEqual(DETAIL_LEVELS, ["full", "character"]);
});

test("labels sit round the star, each reading outward from its ray", () => {
  const html = starLabelsMarkup(STATE, "full");
  const sides = [...html.matchAll(/data-side="(\w)"/g)].map(m => m[1]);
  assert.deepEqual(sides, ["t", "r", "r", "r", "b", "l", "l", "l"]);
});

test("the page draws the star, its switches and Share your star", () => {
  renderStarPage(MAIN, STATE);
  const html = dom.html[MAIN] || "";
  assert.match(html, /class="stage-page star-page" data-theme="(paper|navy)"/);
  assert.match(html, /<svg class="shape" data-view="(star|radar|asterism)"/);
  assert.match(html, /class="shape-switch" role="group"/);
  for (const level of DETAIL_LEVELS) assert.match(html, new RegExp(`data-group="detail" data-value="${level}"`));
  assert.match(html, /data-group="theme" data-value="navy"/);
  assert.match(html, /id="sp-share"/);
  assert.doesNotMatch(html, /sp-index|Balance Index|Fixture/, "the page no longer shows the name or the index");
  assert.match(html, /class="pill pill-light sp-back" href="#\/dashboard"/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test("the card names regions and shows characters when given them", () => {
  const texts = [];
  const ctx = new Proxy({ measureText: s => ({ width: String(s).length * 14 }) }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "fillText") return (s) => texts.push(String(s));
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const data = storyCardData({ name: "Fixture", aspects: STATE.aspects, index: 58, labels: regionLabels(STATE) });
  drawStoryCard(ctx, data, { detail: "character" });
  for (const c of CHAPTERS) assert.ok(texts.includes(c.region), `the card left out ${c.region}`);
  const who = Object.values(regionLabels(STATE)).find(l => l.character).character;
  assert.ok(texts.includes(who), "the card left out the characters");
});

test("card labels keep only plain strings", () => {
  const data = storyCardData({ labels: { finance: { region: "<b>", character: 5 }, bogus: { region: "x" } } });
  assert.deepEqual(data.labels, { finance: { region: "<b>", character: null } });
  assert.deepEqual(storyCardData({ labels: "nope" }).labels, {});
});

test("the star flies home along an arc, not a straight line", async () => {
  const { arcOffset } = await import("../views/star-zoom.js");
  assert.deepEqual(arcOffset(300, -100, 0), { x: 300, y: -100 });
  const end = arcOffset(300, -100, 1);
  assert.ok(Math.abs(end.x) < 1e-9 && Math.abs(end.y) < 1e-9);
  // Halfway, the flight is off the straight line from (300, -100) to (0, 0).
  const mid = arcOffset(300, -100, 0.5);
  const offLine = Math.abs(mid.x * -100 - mid.y * 300) / Math.hypot(300, 100);
  assert.ok(offLine > 20, `only ${offLine.toFixed(1)} px off the line`);
});

// v152: the asterism is drawn again star by star, from the top.
test("the asterism's line is drawn from the first star round to the last", async () => {
  const { tracePoints } = await import("../views/star-shape-zoom.js");
  const tips = [{ x: 50, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 90 }, { x: 10, y: 50 }];
  const pts = (s) => s.split(" ").map(Number);
  // Nothing drawn: a line of no length at the first star.
  assert.deepEqual(pts(tracePoints(tips, 0)), [50, 10, 50, 10]);
  // Half way to the second star, walked out and back so no closing edge shows.
  assert.deepEqual(pts(tracePoints(tips, 0.5)), [50, 10, 70, 30]);
  assert.deepEqual(pts(tracePoints(tips, 2)), [50, 10, 90, 50, 50, 90, 90, 50]);
  // Every segment drawn: the loop closes on the first star.
  const full = pts(tracePoints(tips, 4));
  assert.deepEqual(full.slice(0, 10), [50, 10, 90, 50, 50, 90, 10, 50, 50, 10]);
  assert.deepEqual(pts(tracePoints(tips, 9)), full, "more than the loop draws the loop");
});

test("an asterism star pops past its size and settles back", async () => {
  const { popScale } = await import("../views/star-shape-zoom.js");
  assert.equal(popScale(0), 0);
  assert.ok(popScale(0.55) > 1.4);
  assert.equal(popScale(1), 1);
});

test("the star page picks its way in by the view it shows", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../views/star-page.js", import.meta.url), "utf8");
  assert.match(src, /const ENTER = \{ star: enterStar, radar: enterRadar, asterism: enterAsterism \}/);
  assert.match(src, /const LEAVE = \{ star: leaveStar, radar: leaveRadar, asterism: leaveAsterism \}/);
});
