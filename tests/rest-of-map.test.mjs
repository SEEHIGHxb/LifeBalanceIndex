// The rest of the map (redesign R5): Side by Side, Your year, the text pages,
// Lumi's panel and the share poster. Rendered into the DOM stub and read back
// as HTML; the motion is covered by tests/moments-e2e.mjs.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_STATE } from "../defaults.js";
import { installDom } from "./dom-stub.mjs";

const MAIN = "main-view";
const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");
let dom;
beforeEach(() => { dom = installDom(); });

installDom();
const { renderLeaderboard } = await import("../views/leaderboard.js");
const { yearMarkup } = await import("../views/yearreview.js");
const { renderProfile } = await import("../views/profile.js");
const { renderMethodology } = await import("../views/methodology.js");
const { lumiMarkup, lowestAspect, getLumiTip } = await import("../views/lumi.js");
const { REGION_HUES } = await import("../story-card.js");
const { CHAPTERS } = await import("../views/journey.js");

const ASPECTS = {
  finance: 55, physical: 62, mental: 71, relationships: 48,
  personalGoals: 70, socialContribution: 30, environment: 58, humanityFuture: 51
};
const STATE = {
  ...DEFAULT_STATE,
  onboarded: true,
  profile: { ...DEFAULT_STATE.profile, name: "Fixture", age: 34, level: 34 },
  aspects: ASPECTS,
  friends: []
};
const html = () => dom.html[MAIN] || "";
const person = (id, name, v) => ({ id, name, aspects: Object.fromEntries(Object.keys(ASPECTS).map(k => [k, v])) });

// --- Side by Side -------------------------------------------------------------

test("with no one added there is nothing to lay over your star", () => {
  renderLeaderboard(MAIN, STATE, () => {});
  assert.match(html(), /No one added yet/);
  assert.doesNotMatch(html(), /class="duo-them"/);
  assert.doesNotMatch(html(), /compare-aspects/, "no aspect cards with no one to compare");
});

test("everyone keeps the order they were added in, whatever their scores", () => {
  const friends = [person("f1", "Ann", 20), person("f2", "Bo", 95), person("f3", "Cy", 50)];
  renderLeaderboard(MAIN, { ...STATE, friends }, () => {});
  const picks = [...html().matchAll(/data-pick="\d+"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.deepEqual(picks, ["Ann", "Bo", "Cy"]);
  // One table: the columns are the average, you, then the three; a row per
  // aspect, each with a score in every column.
  const head = [...html().matchAll(/<th scope="col">([^<]+)<\/th>/g)].map(m => m[1]);
  assert.deepEqual(head, ["Population average", "Fixture (You)", "Ann", "Bo", "Cy"]);
  const rows = html().split("<tbody>")[1].split("</tbody>")[0].split("<tr>").slice(1);
  assert.equal(rows.length, 8);
  for (const row of rows) assert.equal((row.match(/<td/g) || []).length, 5);
});

test("the codes lead when no one is added, and fold away last once someone is", () => {
  renderLeaderboard(MAIN, STATE, () => {});
  const empty = html();
  assert.ok(empty.indexOf("statement codes") < empty.indexOf("statement duo"), "with no one added the codes come first");
  assert.doesNotMatch(empty, /codes-fold/);
  renderLeaderboard(MAIN, { ...STATE, friends: [person("f1", "Ann", 20)] }, () => {});
  const some = html();
  assert.ok(some.indexOf("codes-fold") > some.indexOf("compare-aspects"), "once someone is added the codes come last");
  assert.match(some, /<summary>Share or add a code<\/summary>/);
  assert.doesNotMatch(some, /class="hero"|class="panel mission"/);
});

test("the picked person is the one whose star lies over yours", () => {
  const friends = [person("f1", "Ann", 20), person("f2", "Bo", 95)];
  renderLeaderboard(MAIN, { ...STATE, friends }, () => {}, { pick: 1 });
  assert.match(html(), /data-pick="1"[^>]*aria-checked="true"/);
  assert.match(html(), /id="duo-them-name">Bo</);
  assert.match(html(), /role="radiogroup"/);
});

test("removing someone asks on the page first", () => {
  const friends = [person("f1", "Ann", 20)];
  renderLeaderboard(MAIN, { ...STATE, friends }, () => {}, { confirm: "f1" });
  assert.match(html(), /data-confirm-remove="f1"/);
  assert.match(html(), /data-cancel-remove="f1"/);
  assert.doesNotMatch(html(), /data-friend-id="f1"/, "the plain Remove is replaced by the question");
});

// --- Your year ----------------------------------------------------------------

test("the year's hero is YEAR and your level, and a loss reads with a real minus", () => {
  const state = {
    ...STATE,
    profile: { ...STATE.profile, birthMonth: 3, birthDay: 14, season: { startDate: "2026-03-13T17:00:00.000Z", earnedXp: 10, possibleXp: 40 } },
    snapshots: [
      { date: "2026-03-15T00:00:00.000Z", aspects: { ...ASPECTS, finance: 60 } },
      { date: "2026-07-01T00:00:00.000Z", aspects: ASPECTS }
    ]
  };
  const out = yearMarkup(state, new Date("2026-09-25T00:00:00Z"));
  assert.match(out, /class="word">YEAR</);
  assert.match(out, /class="inc">34</);
  assert.match(out, /class="newsrow-delta">−5</, "finance 60 -> 55 is shown as −5");
  assert.match(out, /id="year-birthday-form"/, "the day your year turns stays on the page");
});

test("the years filed are listed newest first", () => {
  const out = yearMarkup({ ...STATE, levelYears: [{ level: 32, xp: 5, possible: 9, ratio: 0.5 }, { level: 33, xp: 7, possible: 9, ratio: 0.7 }] });
  const years = [...out.matchAll(/class="newsrow-kind">Year (\d+)</g)].map(m => m[1]);
  assert.deepEqual(years, ["33", "32"]);
});

// --- the text pages -------------------------------------------------------------

test("the Landing offers to restore a backup before the journey", async () => {
  const { landingMarkup } = await import("../views/landing.js");
  const out = landingMarkup();
  assert.match(out, /<button type="button" id="btn-restore-backup"[^>]*>Restore from a backup<\/button>/);
  assert.match(out, /<input type="file" id="restore-file-input" accept="application\/json,\.json" class="d-none"/);
});

test("Profile is a text page that keeps every field and control", () => {
  renderProfile(MAIN, STATE, () => {});
  const out = html();
  assert.match(out, /class="stage-page textpage profile-view"/);
  assert.doesNotMatch(out, /class="hero"/, "a text page has no hero");
  for (const id of ["pf-name", "pf-age", "pf-gender", "pf-birthday-month", "pf-birthday-day", "pf-region", "pf-employment",
    "pf-relationship", "pf-income", "pf-height", "pf-weight", "pf-liquid", "pf-outflow", "pf-family", "pf-save",
    "pf-reduce-motion", "btn-export-data", "btn-import-data", "btn-reset-data", "import-file-input"]) {
    assert.match(out, new RegExp(`id="${id}"`), `Profile lost #${id}`);
  }
});

test("Methodology is a text page with its full text", () => {
  renderMethodology(MAIN, { checkins: [] });
  const out = html();
  assert.match(out, /class="stage-page textpage methodology"/);
  assert.doesNotMatch(out, /class="hero"|aspect-back/, "no hero and no old back link");
  // The full formula, not the prototype's first sentence.
  assert.match(out, /Savings is entered as an amount in baht/);
  assert.doesNotMatch(out, /dashboard radar/, "no line still points at the retired radar");
});

// --- Lumi ---------------------------------------------------------------------------

test("Lumi's tip is for your lowest aspect and links to it", () => {
  assert.equal(lowestAspect(ASPECTS), "socialContribution");
  const out = lumiMarkup(ASPECTS);
  assert.match(out, /href="#\/aspect\/socialContribution"/);
  assert.match(out, /class="sr-only">Small acts of giving/, "the whole tip is there for a screen reader");
  assert.match(out, /id="lumi-title"/);
});

test("Lumi falls back to the weekly review when there is no aspect to speak about", () => {
  assert.equal(lowestAspect({}), null);
  assert.match(getLumiTip({}), /weekly review/);
  assert.match(lumiMarkup({}), /href="#\/review"/);
});

test("the floating bubble is gone and the header's star opens Lumi's panel", () => {
  const page = read("index.html");
  assert.doesNotMatch(page, /assistant-mount|speech-bubble/);
  assert.match(page, /id="btn-lumi"[^>]*aria-controls="lumi-panel"/);
  assert.match(page, /<aside id="lumi-panel" class="lumi" role="dialog" aria-labelledby="lumi-title"[^>]*hidden>/);
  assert.doesNotMatch(read("app.js"), /triggerLumiMessage|LUMI_PHONE_MAX_PX/);
  assert.doesNotMatch(read("index.css"), /assistant-wrapper|speech-bubble/);
});

// --- the share poster ---------------------------------------------------------------

test("the poster's region dots are the regions' own hues", () => {
  for (const chapter of CHAPTERS) {
    assert.equal(REGION_HUES[chapter.aspect], chapter.hue, `${chapter.aspect}'s dot drifted from its region`);
  }
});
