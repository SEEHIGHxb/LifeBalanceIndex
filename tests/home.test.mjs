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

test("your star has a tip per aspect, each as long as its score", () => {
  const svg = yourStarSvg([100, 50, 80, 30, 60, 70, 40, 90]);
  const points = svg.match(/points="([^"]+)"/)[1].split(" ").map(Number);
  // 8 tips and 8 valleys, x and y each.
  assert.equal(points.length, 32);
  const tip = (i) => Math.hypot(points[i * 4] - 50, points[i * 4 + 1] - 50);
  assert.ok(Math.abs(tip(0) - 47) < 0.01, "a full score reaches the edge");
  assert.ok(Math.abs(tip(1) - 23.5) < 0.01, "half a score reaches half way");
  assert.ok(tip(3) > 47 * (13 / 46), "a low score keeps a tip beyond the valleys");
});

test("your star never breaks on a missing or junk score", () => {
  assert.doesNotMatch(yourStarSvg([null, undefined, "x", -5, 50, 50, 50, 50]), /NaN/);
});

// --- the page -------------------------------------------------------------------

test("the hero names the Balance Index for readers, and the headline names real regions", () => {
  const html = render(STATE);
  assert.match(html, /<h2 class="sr-only">Your star — Balance Index \d+<\/h2>/);
  const head = html.match(/class="sr-only">(Strongest in [^<]+)</);
  assert.ok(head, "the typed headline lost its reader copy");
  assert.ok(CHAPTERS.some(c => head[1].includes(c.region)), `no region named in "${head[1]}"`);
  assert.match(html, /is asking for more\./);
});

test("every aspect card links to its aspect and shows its average", () => {
  const html = render(STATE);
  for (const chapter of CHAPTERS) {
    assert.match(html, new RegExp(`href="#/aspect/${chapter.aspect}"`));
  }
  assert.equal((html.match(/class="score-average"/g) || []).length, 8);
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
});

test("the care notice leads the page, before your star", () => {
  const html = render({ ...STATE, baseline: { ...STATE.baseline, who5: 0, st5: 20 } });
  const notice = html.indexOf("care-banner");
  assert.ok(notice > -1, "the fixture must cross the cutoff or this test proves nothing");
  assert.ok(notice < html.indexOf('class="hero"'), "the notice must come before the hero");
});
