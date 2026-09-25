// tests/journey.test.mjs - the eight chapters of the redesigned onboarding
// flow (views/journey.js, v81).
//
// No DOM is installed and none is needed: journey.js never touches `document`
// by design, and the recaps read through an injected accessor. That is the
// whole reason the writing is testable, so these run against the real chapter
// definitions rather than a copy of them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

import { CHAPTERS, PROLOGUE, allScreens } from "../views/journey.js";
import { regionsComplete } from "../views/journey-progress.js";
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

// --- THE WASH IS READ THROUGH, NOT JUST LOOKED AT -------------------------
//
// v82 paints each chapter's colour across the whole page. The tempting version
// of that is the saturated hue as the background with light text on it, and it
// is unreadable: white on the finance gold #d9a441 is 2.2:1 against the 4.5:1
// small text needs. So `wash` is a light tint and the ink stays navy -- and
// that only holds while the wash STAYS light, which is what this measures.
//
// --color-navy is parsed out of the stylesheet rather than hardcoded here, so
// lightening the ink token re-checks all eight washes instead of silently
// lowering the floor.
function relativeLuminance(hex) {
  const channels = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("every chapter declares art that is present, in budget and precached", () => {
  // FAILS ON THE DEFECT, and there are three defects here a green suite would
  // otherwise ship.
  //
  // A chapter with no `art` paints url("./assets/regions/undefined.jpg") --
  // one region with no background, which is exactly the kind of thing that
  // survives a manual click-through of whichever chapter you happened to test.
  //
  // Art missing from the sw.js precache works perfectly online and leaves that
  // region bare offline, which cannot be caught except by testing offline.
  //
  // And these are the heaviest assets in the repo by an order of magnitude.
  // They are full-frame 1280px JPEGs because they are now viewport-filling
  // backgrounds rather than 400px bands; the whole set is precached, so every
  // byte is paid by every install whether or not the reader gets that far.
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const seen = new Set();
  for (const chapter of CHAPTERS) {
    assert.match(
      chapter.art ?? "", /^[a-z][a-z-]*$/,
      `${chapter.region} has no usable art slug. It must be a lowercase ` +
      "filename stem, and it must NOT be derived from `region` -- that is a " +
      "t() string and changes with the reader's language."
    );
    assert.ok(!seen.has(chapter.art), `two chapters share the art "${chapter.art}"`);
    seen.add(chapter.art);

    const file = new URL(`../assets/regions/${chapter.art}.jpg`, import.meta.url);
    assert.ok(
      existsSync(file),
      `assets/regions/${chapter.art}.jpg is missing, so ${chapter.region} has no background`
    );
    const kb = statSync(file).size / 1024;
    assert.ok(
      kb < 180,
      `assets/regions/${chapter.art}.jpg is ${Math.round(kb)} KB. The budget is ` +
      "180 KB: all eight are precached, so this is weight every install pays " +
      "whether or not the reader ever reaches that region."
    );
    assert.ok(
      sw.includes(`"./assets/regions/${chapter.art}.jpg"`),
      `assets/regions/${chapter.art}.jpg is not in the sw.js APP_SHELL, so it ` +
      "renders online and is missing offline"
    );
  }
  assert.equal(seen.size, 8, "expected eight distinct region images");
});

test("the region art is the ending's photograph, and carries no text", () => {
  // Redesign R2. The art used to be a full-screen layer behind the questions,
  // which is why every surface over it needed a measured veil (and why
  // assets/regions/contrast.json existed, deleted in R2). Now each question sits on its
  // region's plain wash, and the photograph appears only on the chapter
  // ending, as a panel holding nothing but the emblem. No word anywhere
  // depends on the contrast of a picture, so there is no veil to keep honest.
  // This fails if text lands on the photograph or the background layer is
  // brought back.
  const src = readFileSync(new URL("../views/onboarding.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /--journey-art/, "the region art is being painted behind the questions again");
  const photo = src.match(/<div class="ending-photo"[\s\S]*?\n {4}<\/div>/);
  assert.ok(photo, "the chapter ending no longer shows its region's photograph");
  assert.match(photo[0], /aria-hidden="true"/, "the photograph is decoration and must be hidden from readers");
  const words = photo[0].replace(/\$\{[^}]+\}/g, "").replace(/<[^>]+>/g, "").trim();
  assert.equal(words, "", `text sits on the photograph: "${words}"`);
  for (const sheet of ["../index.css", "../css/journey.css"]) {
    const css = readFileSync(new URL(sheet, import.meta.url), "utf8");
    assert.doesNotMatch(css, /journey-lit/, `${sheet} still styles the retired full-screen art layer`);
  }
});

test("every region wash keeps the journey's inks readable on it", () => {
  // Each question panel is painted in its region's wash with the ink straight
  // on it (css/journey.css). Navy stands in for the app's ink at a 7:1 floor;
  // the secondary ink (stems, counts, theme lines) is small text and is held
  // to 4.5:1 on every wash.
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  const navy = css.match(/--color-navy:\s*(#[0-9a-f]{6})/i);
  assert.ok(navy, "index.css no longer defines --color-navy, which every wash is measured against");
  const journeyCss = readFileSync(new URL("../css/journey.css", import.meta.url), "utf8");
  const muted = journeyCss.match(/--journey-muted:\s*(#[0-9a-f]{6})/i);
  assert.ok(muted, "css/journey.css no longer defines --journey-muted, which every wash is measured against");

  const washes = new Set();
  for (const chapter of CHAPTERS) {
    assert.match(chapter.wash, /^#[0-9a-f]{6}$/i, `${chapter.aspect}: wash is not a hex colour`);
    const ratio = contrastRatio(chapter.wash, navy[1]);
    assert.ok(
      ratio >= 7,
      `${chapter.aspect}: navy ink on wash ${chapter.wash} is ${ratio.toFixed(2)}:1, below 7:1. ` +
      "A wash this deep needs a different ink, not a darker page."
    );
    const secondary = contrastRatio(chapter.wash, muted[1]);
    assert.ok(
      secondary >= 4.5,
      `${chapter.aspect}: --journey-muted on wash ${chapter.wash} is ${secondary.toFixed(2)}:1, below 4.5:1`
    );
    washes.add(chapter.wash.toLowerCase());
  }
  // Two regions sharing a wash would make travelling between them invisible,
  // which is the entire point of the feature.
  assert.equal(washes.size, CHAPTERS.length, "two chapters share a wash");
});

test("a motif is path data and cannot carry markup", () => {
  // views/onboarding.js drops this straight into a d="" attribute. Path data is
  // commands and numbers, so there is nothing to escape -- but only while that
  // stays true. A motif holding a tag or a quote would be an injection point in
  // a file that currently has none.
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.motif, `${chapter.aspect}: no motif`);
    assert.doesNotMatch(chapter.motif, /[<>"']/, `${chapter.aspect}: motif contains markup, not path data`);
    assert.match(chapter.motif, /^M[\d\s.-]/, `${chapter.aspect}: motif does not begin with a moveto`);
  }
});

test("exactly one screen per chapter is marked as its first", () => {
  // The arrival beat -- the region name with its theme line -- renders on the
  // chapter's first screen only. Two would repeat the beat and stop it being
  // one; none would drop the reader into a chapter with no idea where they are.
  const screens = allScreens();
  for (let i = 0; i < CHAPTERS.length; i++) {
    const starts = screens.filter(s => s.chapter === i && s.startsChapter);
    assert.equal(starts.length, 1, `${CHAPTERS[i].aspect}: ${starts.length} screens marked as the chapter's first`);
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
// --- the four fixes from the two-sided UX review (v87) -------------------

test("answered questions keep full-strength ink over the region art", () => {
  // `.q-answered` was `opacity: 0.62`, which composited the option labels and
  // the legend down to about 2.4:1 over every one of the eight region
  // backgrounds — half the 4.5:1 floor the card veil beside it is held to. The
  // :hover and :focus-within rules that restored them do not exist on a
  // touchscreen, which is the primary device here, so on a phone most of the
  // questions on an instrument screen sat at that ratio permanently.
  //
  // There is no headroom to dim text at all: --color-text-secondary already
  // measures 4.65:1 over the darkest art in the set, so ANY opacity on a
  // text-bearing box fails. This asserts none is applied to the fieldset
  // itself. Dimming a non-text child — the radio controls, which WCAG 1.4.11
  // holds to 3:1 rather than 4.5:1 — is allowed, and is how the answered state
  // still reads as settled.
  const css = readFileSync(new URL("../css/journey.css", import.meta.url), "utf8");
  const rules = [...css.matchAll(/fieldset\.q-answered([^{]*)\{([^}]*)\}/g)];
  assert.ok(rules.length, "the .q-answered state has disappeared from the stylesheet");

  let checkedFieldsetRule = false;
  for (const [, selectorTail, body] of rules) {
    const tail = selectorTail.trim();
    // An empty tail means the rule targets the fieldset itself; a tail opening
    // on ":" is a pseudo-class on that same fieldset. Anything else is a
    // descendant, which may be dimmed.
    if (tail !== "" && !tail.startsWith(":")) continue;
    checkedFieldsetRule = true;
    assert.doesNotMatch(
      body, /opacity/,
      "an answered question's fieldset carries an opacity. Its labels are text " +
      "over an illustrated background: dimming them puts the option labels at " +
      "about 2.4:1, against a 4.5:1 floor, and there is no headroom to recover " +
      "it because the secondary ink is already at 4.65:1 over the darkest art. " +
      "Dim the radio controls instead — they are UI components held to 3:1."
    );
  }
  assert.ok(checkedFieldsetRule, "no rule targets fieldset.q-answered itself any more");
});

test("the progress star counts a region complete only when its ending is reached", () => {
  // The count used the in-progress chapter INDEX as the number of chapters
  // completed, so the ring read "0 / 8" on the screen whose card is headed
  // "Region complete", and "7 / 8" on the last screen of the journey, whose
  // recap reads "Every region on the ring is lit." It never showed 8/8.
  const total = CHAPTERS.length;
  assert.equal(regionsComplete({ chapter: -1, endsChapter: false, total }), 0,
    "the prologue has completed no region");
  assert.equal(regionsComplete({ chapter: 0, endsChapter: false, total }), 0,
    "a question screen inside The Market has completed no region");
  assert.equal(regionsComplete({ chapter: 0, endsChapter: true, total }), 1,
    "The Market's ending screen says the region is complete, so the ring must agree");
  assert.equal(regionsComplete({ chapter: 7, endsChapter: false, total }), 7,
    "inside the eighth region, seven are done");
  assert.equal(regionsComplete({ chapter: 7, endsChapter: true, total }), total,
    "the final screen must read 8 / 8 — the reader has to see the count complete");
  assert.equal(regionsComplete({ chapter: 99, endsChapter: true, total }), total,
    "the count can never exceed the number of regions");
});

test("an instrument screen names its instrument exactly once, translated", () => {
  // The engine prints the screen's own <h3>, and instrumentBlock printed the
  // title again — so the name appeared twice. In Thai it appeared twice in TWO
  // LANGUAGES, because the engine's copy was passed through no t() while the
  // block's was: a Thai reader met "CFPB Financial Well-Being Assessment" as
  // the largest text on the page with the Thai underneath it, on thirteen of
  // the twenty-one answering screens.
  const screens = allScreens().filter(s => s.instrument);
  assert.ok(screens.length >= 13, `only ${screens.length} instrument screens found`);

  for (const screen of screens) {
    assert.ok(screen.title && screen.title.length > 3, `${screen.id}: no screen title`);
    assert.doesNotMatch(
      screen.body, /class="instrument-title"/,
      `${screen.id} renders instrumentBlock's own title paragraph as well as the ` +
      "screen heading, so the instrument is named twice on one screen. The " +
      "journey must call instrumentBlock(key, { heading: false })."
    );
  }

  // And the heading the engine prints has to be translated. Asserted against
  // the source because the default test language is English, where a missing
  // t() is invisible — which is exactly how this shipped.
  const src = readFileSync(new URL("../views/journey.js", import.meta.url), "utf8");
  assert.match(
    src, /title: t\(INSTRUMENTS\[key\]\.title\)/,
    "the instrument screen's title is no longer wrapped in t(). It is rendered " +
    "as the screen's <h3> by an engine that escapes but does not translate, so " +
    "without t() every Thai instrument screen headlines an English acronym."
  );

  // The check-in still needs the paragraph: it stacks these blocks with no
  // heading of its own, so heading must default to true.
  const forms = readFileSync(new URL("../views/instrument-forms.js", import.meta.url), "utf8");
  assert.match(
    forms, /instrumentBlock\(instrKey, \{ heading = true \} = \{\}\)/,
    "instrumentBlock's heading must DEFAULT to true — views/assessments.js " +
    "renderCheckin stacks seven of these with no heading of its own, so " +
    "flipping the default strips every instrument name from the monthly check-in."
  );
});

test("the footer Methodology link is hidden until onboarding is finished", () => {
  // #/methodology resolves through initializeApp, which re-renders onboarding
  // while !onboarded, so the link changed the hash and did nothing else. It is
  // also the link a hesitant reader reaches for before handing over
  // eighty-five answers about their income and their mood, so a dead one is
  // worse than none. app.js had already caught and hidden btn-profile for the
  // same reason and left this one wired.
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const hide = app.indexOf('getElementById("footer-methodology").classList.add("d-none")');
  const show = app.indexOf('getElementById("footer-methodology").classList.remove("d-none")');

  assert.ok(hide > 0, "app.js no longer hides the footer Methodology link during first run");
  assert.ok(show > 0, "app.js never restores the footer Methodology link after onboarding");
  assert.ok(
    hide < show,
    "the hide must sit in the !onboarded branch, which comes first. Reversed, " +
    "the link is hidden from the readers who can actually use it and shown to " +
    "the ones for whom it does nothing."
  );
});

// --- A RECAP STATES WHAT WAS SAID, NOT WHAT WAS LEFT BLANK ----------------
//
// read.answers() returns null for an unanswered item and read.num() returns
// null for an empty field. highCount used to drop the nulls and count what was
// left, so five unanswered money questions came out as "Of five statements
// about money, 0 described you well." -- a sentence about answers the reader
// never gave, in the most deflating direction available. The Still Water went
// further and added "That is recorded exactly as you gave it."
//
// Today Next-validation and the draft version guard keep a reader from
// reaching an ending with blanks behind it. Those are two other modules that do
// not know the recap depends on them, and letting drafts survive a release
// removes one of them. So the recap has to be honest on its own.
function blankReader() {
  return {
    num: () => null,
    answers: (key) => INSTRUMENTS[key].items.map(() => null)
  };
}

test("with nothing answered, no recap line claims an answer", () => {
  for (const chapter of CHAPTERS) {
    for (const line of chapter.recap(blankReader())) {
      assert.doesNotMatch(
        line, /\d/,
        `${chapter.aspect}: stated a number over blank answers: "${line}"`
      );
      assert.doesNotMatch(
        line, /\b(None|No money|Nothing)\b/,
        `${chapter.aspect}: stated a zero over blank answers: "${line}"`
      );
    }
  }
});

test("one unanswered item drops that instrument's count line, not the others", () => {
  // Every item at the top of the scale except the first CFPB item. The count
  // would say 4 of 5; the reader answered 4, so the sentence about "five" is
  // not one they can have earned.
  const partial = {
    num: () => 1000,
    answers: (key) => INSTRUMENTS[key].items.map((_, i) => (key === "cfpb" && i === 0 ? null : 4))
  };
  const market = CHAPTERS.find(c => c.aspect === "finance").recap(partial);
  assert.ok(
    market.every(line => !line.includes("statements about money")),
    `the CFPB count was stated over an unanswered item: ${JSON.stringify(market)}`
  );
  assert.ok(
    market.some(line => line.includes("baht")),
    "the income line should still be there; only the incomplete instrument is dropped"
  );
});
