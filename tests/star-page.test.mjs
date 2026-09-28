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
  const texts = labelTexts(starLabelsMarkup(STATE, "names"));
  assert.equal(texts.length, 8);
  CHAPTERS.forEach((c, i) => assert.equal(texts[i], c.region));
  assert.ok(!texts.some(s => /Finance|Mental/.test(s)));
});

test("each label choice shows what it says, and Shape only shows none", () => {
  const labels = regionLabels(STATE);
  assert.equal(starLabelsMarkup(STATE, "shape"), "");
  const scores = labelTexts(starLabelsMarkup(STATE, "full"));
  assert.ok(scores[0].endsWith(" 55"), scores[0]);
  const characters = labelTexts(starLabelsMarkup(STATE, "character"));
  const both = labelTexts(starLabelsMarkup(STATE, "both"));
  CHAPTERS.forEach((c, i) => {
    const who = labels[c.aspect].character;
    const score = STATE.aspects[c.aspect];
    assert.ok(characters[i].endsWith(who || String(score)), characters[i]);
    assert.ok(both[i].endsWith(who ? `${score} · ${who}` : String(score)), both[i]);
  });
  assert.ok(Object.values(labels).some(l => l.character), "the fixture should earn at least one character");
});

test("a region with no character falls back to its score", () => {
  assert.equal(legendValue("character", 40, null), "40");
  assert.equal(legendValue("both", 40, null), "40");
  assert.equal(legendValue("both", 40, "Stargazer"), "40 · Stargazer");
  assert.equal(legendValue("names", 40, "Stargazer"), "");
  assert.equal(legendValue("shape", 40, "Stargazer"), "");
});

test("labels sit round the star, each reading outward from its ray", () => {
  const html = starLabelsMarkup(STATE, "names");
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
  drawStoryCard(ctx, data, { detail: "both" });
  for (const c of CHAPTERS) assert.ok(texts.includes(c.region), `the card left out ${c.region}`);
  const who = Object.values(regionLabels(STATE)).find(l => l.character).character;
  assert.ok(texts.some(s => s.endsWith(`· ${who}`)), "the card left out the characters");
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
