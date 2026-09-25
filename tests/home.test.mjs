// Home (redesign R3, views/dashboard.js): your star, the headline, the news
// list, the pledge wall, and the rules it keeps (escaping, the notice first).
// Rendered into the DOM stub and read back as HTML.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

const MAIN = "main-view";
let dom;
beforeEach(() => { dom = installDom(); });

installDom();
const { renderDashboard, yourStarSvg } = await import("../views/dashboard.js");
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
const render = (state) => {
  renderDashboard(MAIN, state, () => {});
  return dom.html[MAIN] || "";
};

// --- your star ------------------------------------------------------------------

const polygons = (svg) => [...svg.matchAll(/<polygon points="([^"]+)"/g)].map(m => m[1].split(" ").map(Number));
const radius = (pts, k) => Math.hypot(pts[k * 2] - 50, pts[k * 2 + 1] - 50);

test("your star's outline is the same symmetric star whatever the scores", () => {
  const lopsided = polygons(yourStarSvg([100, 5, 80, 30, 60, 70, 40, 90]))[0];
  const even = polygons(yourStarSvg([50, 50, 50, 50, 50, 50, 50, 50]))[0];
  assert.deepEqual(lopsided, even, "the outline must not follow the scores");
  // 8 tips at the rim, 8 valleys at S1's depth.
  for (let i = 0; i < 8; i++) {
    assert.ok(Math.abs(radius(lopsided, i * 2) - 47) < 0.01, `tip ${i} is off the rim`);
    assert.ok(Math.abs(radius(lopsided, i * 2 + 1) - 47 * 13 / 46) < 0.01, `valley ${i} is off S1's depth`);
  }
});

test("each ray fills from the centre to its score", () => {
  const [, ...rays] = polygons(yourStarSvg([100, 50, 80, 30, 60, 70, 40, 0]));
  assert.equal(rays.length, 9, "the ground, eight rays, then the outline on top");
  // A ray is centre, valley, tip, valley: its tip is the fill level.
  const level = (i) => radius(rays[i], 2) / 47;
  assert.ok(Math.abs(level(0) - 1) < 0.001, "a full score fills the ray");
  assert.ok(Math.abs(level(1) - 0.5) < 0.001, "half a score fills half the ray");
  assert.ok(level(7) < 0.001, "a zero leaves the ray empty");
});

test("your star never breaks on a missing or junk score", () => {
  assert.doesNotMatch(yourStarSvg([null, undefined, "x", -5, 50, 50, 50, 50]), /NaN/);
});

// --- the page -------------------------------------------------------------------

test("the top names the Balance Index for readers, and the headline names real regions", () => {
  const html = render(STATE);
  assert.match(html, /<h2 class="sr-only">Your star — Balance Index \d+<\/h2>/);
  const head = html.match(/class="home-headline">(Strongest in [^<]+)</);
  assert.ok(head, "the headline is missing");
  assert.ok(CHAPTERS.some(c => head[1].includes(c.region)), `no region named in "${head[1]}"`);
  assert.match(head[1], /is asking for more\./);
  assert.match(html, /class="star-hit" type="button" aria-label="Play with your star"/);
});

test("every aspect is one row that links to its aspect and shows its average", () => {
  const html = render(STATE);
  assert.equal((html.match(/class="aspect-row"/g) || []).length, 8);
  for (const chapter of CHAPTERS) {
    assert.match(html, new RegExp(`class="aspect-row" href="#/aspect/${chapter.aspect}"`));
  }
  assert.equal((html.match(/class="score-average"/g) || []).length, 8);
});

test("Home is compact: no full-screen hero, photo band or repeated panels", () => {
  const html = render(STATE);
  for (const gone of ['class="hero"', 'class="panel mission"', "photoband", "home-you", "panel careers", "region-card"]) {
    assert.ok(!html.includes(gone), `Home still renders ${gone}`);
  }
  // Where to start comes before Recent.
  assert.ok(html.indexOf("(Where to start)") < html.indexOf("(Recent)"));
});

test("the to-do list says when the next review opens once this week's is done", () => {
  const html = render({ ...STATE, reviews: [{ date: new Date().toISOString(), goals: [], xp: 0, shifts: {} }] });
  assert.match(html, /class="todo todo-done"/);
  assert.match(html, /Done for this week\./);
  assert.doesNotMatch(html, /Weekly review open\./);
});

test("a hostile name, pledge id and review shift are escaped or dropped", () => {
  const html = render({
    ...STATE,
    profile: { ...STATE.profile, name: "<img src=x onerror=alert(1)>" },
    goals: [{ id: "g1", templateId: "constructor", target: 1 }, { id: "g2", templateId: "water", target: 2 }],
    reviews: [{ date: "2026-09-01T00:00:00.000Z", goals: [], xp: 5, shifts: { "<b>": 3 } }]
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x/);
  assert.match(html, /&lt;b&gt; \+3/, "an unknown shift key must print escaped");
  assert.doesNotMatch(html, /<b> \+3/);
});

test("the news list is newest first and at most five rows", () => {
  const reviews = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-09-0${i + 1}T00:00:00.000Z`, goals: [], xp: 10, shifts: {}
  }));
  const html = render({ ...STATE, reviews });
  const dates = [...html.matchAll(/class="newsrow-date">([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(dates, ["2026.09.07", "2026.09.06", "2026.09.05", "2026.09.04", "2026.09.03"]);
});

test("a bad date is left out of the news, not printed as NaN", () => {
  const html = render({ ...STATE, reviews: [{ date: "not a date", goals: [], xp: 1, shifts: {} }] });
  assert.doesNotMatch(html, /NaN/);
});

test("the pledge wall appears only with pledges, and says in words what it shows", () => {
  assert.doesNotMatch(render(STATE), /class="wall"/);
  const html = render({ ...STATE, goals: [{ id: "g", templateId: "sleep", target: 7 }] });
  assert.match(html, /<section class="wall" aria-hidden="true">/);
  assert.match(html, /1 active this week/);
  // A strip, not a screen: a few stickers per column, not a wall of them.
  const perColumn = html.split('class="wall-col"').slice(1).map(c => (c.match(/class="sticker/g) || []).length);
  assert.equal(perColumn.length, 6);
  assert.ok(perColumn.every(n => n <= 3), `columns hold ${perColumn.join(",")} stickers`);
});

test("the care notice leads the page, before your star", () => {
  const html = render({ ...STATE, baseline: { ...STATE.baseline, who5: 0, st5: 20 } });
  const notice = html.indexOf("care-banner");
  assert.ok(notice > -1, "the fixture must cross the cutoff or this test proves nothing");
  assert.ok(notice < html.indexOf("home-top"), "the notice must come before your star");
});
