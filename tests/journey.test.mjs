// tests/journey.test.mjs - the eight chapters of the redesigned onboarding
// flow (views/journey.js, v81).
//
// No DOM is installed and none is needed: journey.js never touches `document`
// by design, and the recaps read through an injected accessor. That is the
// whole reason the writing is testable, so these run against the real chapter
// definitions rather than a copy of them.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CHAPTERS, PROLOGUE, allScreens } from "../views/journey.js";
import { RADAR_KEYS } from "../chart.js";
import { SOURCES } from "../benchmarks.js";
import { INSTRUMENTS } from "../surveys.js";

// A `read` accessor standing in for the engine's DOM reader. Every number comes
// back as `value` and every instrument fully answered at `answer`, so a recap
// can be exercised at any point of its range.
function reader(value, answer) {
  return {
    num: () => value,
    answers: (key) => INSTRUMENTS[key].items.map(() => answer)
  };
}

test("the ring is in RADAR_KEYS order, so completing the circuit is completing the radar", () => {
  // The whole metaphor rests on this. chart.js fixes the eight aspects
  // clockwise and story-card.js draws from the same list; a chapter order that
  // drifted from it would light regions in one order and draw axes in another,
  // and the finished map would stop being the reader's radar.
  assert.deepEqual(CHAPTERS.map(c => c.aspect), RADAR_KEYS);
});

test("every chapter's fact resolves to a real source with a URL", () => {
  // A fact citing a key that no longer exists renders no citation at all —
  // silently, because views/onboarding.js drops the <details> when the lookup
  // misses. An uncited fact in this app is indistinguishable from an invented
  // one, which is the failure rounds 5, 6 and 7 each shipped once.
  for (const chapter of CHAPTERS) {
    const source = SOURCES[chapter.fact.source];
    assert.ok(source, `${chapter.aspect}: fact cites SOURCES.${chapter.fact.source}, which does not exist`);
    assert.match(source.url, /^https?:\/\//, `${chapter.aspect}: its source has no usable URL`);
    assert.ok(chapter.fact.text.length > 40, `${chapter.aspect}: fact text is too short to be a fact`);
  }
});

// --- THE LOAD-BEARING RULE ------------------------------------------------
//
// No chapter ending may show a score, a grade, a percentile or a rank.
// docs/onboarding-flow-redesign.md sets out the reason and it is not tidiness:
// usability-test-plan.md already worries whether testers "answer ST-5 and
// UCLA-3 honestly, or begin optimizing their score". A rank shown at chapter 1
// is read by someone about to answer chapters 2 through 8, and every number
// after it is contaminated.
//
// This fails on the defect. Writing `${score}%` or "you rank" into any recap
// trips it, at any point in the answer range.
const EVALUATIVE = [
  /\d\s*%/,                       // a percentage of anything
  /\bpercentile\b/i,
  /\brank(ed|ing|s)?\b/i,
  /\bscore[ds]?\b/i,
  /\bgrade[ds]?\b/i,
  /\baverage\b/i,                 // "above average" is a rank in disguise
  /\b(better|worse|higher|lower)\s+than\b/i,
  /\bout of 100\b/i
];

test("no chapter recap is evaluative, at any point in the answer range", () => {
  for (const chapter of CHAPTERS) {
    // Floor, middle and ceiling of every scale, plus the empty case a reader
    // reaches by leaving a number blank.
    for (const [value, answer] of [[0, 0], [3, 2], [999999, 5], [null, null]]) {
      const lines = chapter.recap(reader(value, answer));
      assert.ok(Array.isArray(lines), `${chapter.aspect}: recap did not return an array`);
      for (const line of lines) {
        assert.equal(typeof line, "string", `${chapter.aspect}: recap produced a non-string line`);
        for (const pattern of EVALUATIVE) {
          assert.doesNotMatch(line, pattern,
            `${chapter.aspect} recap is evaluative at value=${value}, answer=${answer}: "${line}". ` +
            "A chapter ending states what the reader said, never what it is worth — " +
            "a rank here teaches them how to answer the seven chapters after it.");
        }
      }
    }
  }
});

test("a recap never renders an unfilled placeholder or a NaN", () => {
  // tp() leaves an unknown {placeholder} in place on purpose, so a typo in a
  // key surfaces as literal braces on screen rather than vanishing.
  for (const chapter of CHAPTERS) {
    for (const [value, answer] of [[0, 0], [7, 3], [null, null]]) {
      for (const line of chapter.recap(reader(value, answer))) {
        assert.doesNotMatch(line, /\{[a-z]+\}/i, `${chapter.aspect}: unfilled placeholder in "${line}"`);
        assert.doesNotMatch(line, /NaN|undefined|Infinity/, `${chapter.aspect}: bad arithmetic in "${line}"`);
      }
    }
  }
});

test("every scored instrument is asked in exactly one chapter", () => {
  // The old six-page form was the only place several instruments were ever
  // asked, and that is still true. One dropped in the split means its aspect
  // scores from defaults forever; one duplicated means two radio groups share a
  // name and the second silently overwrites the first.
  const asked = allScreens().map(s => s.instrument).filter(Boolean);
  assert.deepEqual(
    [...asked].sort(),
    Object.keys(INSTRUMENTS).sort(),
    "the chapters no longer ask each scored instrument exactly once"
  );
});

test("the prologue is outside the ring and asks nothing that is scored", () => {
  // These six answers choose which population norms apply; none of them is an
  // aspect input. Putting them inside The Market is what made a tester read the
  // finance step as unrelated money questions in v79.
  const screens = allScreens();
  assert.equal(screens[0].id, PROLOGUE.id, "the prologue is not first");
  assert.equal(screens[0].chapter, -1, "the prologue claims a chapter");
  assert.equal(screens[0].instrument, null, "the prologue carries a scored instrument");
});

test("exactly one screen per chapter is marked as its last", () => {
  // The engine inserts a chapter ending after every `endsChapter` screen, so a
  // second one would render two endings for the same region and a missing one
  // would skip that region's recap and fact entirely.
  const screens = allScreens();
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ends = screens.filter(s => s.chapter === i && s.endsChapter);
    assert.equal(ends.length, 1, `${CHAPTERS[i].aspect}: ${ends.length} screens marked as the chapter's last`);
  }
});

test("every chapter carries a region name, a theme and a hue of its own", () => {
  const hues = new Set();
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.region && chapter.region.length > 2, `${chapter.aspect}: no region name`);
    assert.ok(chapter.theme && chapter.theme.length > 10, `${chapter.aspect}: no theme line`);
    assert.match(chapter.hue, /^#[0-9a-f]{6}$/i, `${chapter.aspect}: hue is not a hex colour`);
    hues.add(chapter.hue);
  }
  // Shared hues would make two regions on the ring indistinguishable.
  assert.equal(hues.size, CHAPTERS.length, "two chapters share a hue");
});
