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

test("the region art is a background, not an element inside the card", () => {
  // The whole point of the v85 change. An <img> in the card is a picture in a
  // frame; a fixed background layer is a place the reader is standing in.
  // Reverting to an element would also put art back in the scroll flow,
  // pushing the first question down the screen again.
  const src = readFileSync(new URL("../views/onboarding.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    src, /<img[^>]*region/,
    "the region art is being rendered as an <img> again. It belongs on <body> " +
    "as a background so it fills the viewport behind and around the card."
  );
  assert.match(
    src, /setProperty\([\s\S]{0,40}"--journey-art"/,
    "views/onboarding.js no longer sets --journey-art on <body>, so no region " +
    "paints its background"
  );
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  assert.match(
    css, /body\.journey-lit::before \{[\s\S]*?position:\s*fixed/,
    "the art layer must be position: fixed on a pseudo-element -- " +
    "background-attachment: fixed is broken on iOS Safari"
  );
});

test("the card veil keeps the app's own ink readable over the darkest art", () => {
  // THIS IS THE GUARD THAT MAKES ART-BEHIND-TEXT SAFE, and it is why the veil
  // is 0.86 rather than a number that looked nice.
  //
  // The reader's questions sit on a translucent card over a full-screen
  // painting. Open the card up to show more art, or add a ninth image darker
  // than the current eight, and the helper text silently stops being readable
  // -- silently, because whoever makes the change is looking at a bright
  // region on a good monitor. Measured: at 0.86 the secondary ink clears
  // 4.80:1; at 0.82 it falls to 4.47:1 and fails the 4.5:1 small-text
  // minimum. There is almost no room here, which is exactly why it is a test.
  //
  // Node has no JPEG decoder, so the darkest tile of each image is recorded in
  // assets/regions/contrast.json alongside the byte size it was measured from.
  // The size check is what makes that record trustworthy: swap an image and
  // the recorded size stops matching, so this fails and tells you to
  // re-measure rather than passing on a stale number.
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  // The rule lists every surface that carries text over the art: the card,
  // the header and the footer. Read the selectors as well as the alpha, so a
  // surface dropped from the list is caught here rather than by a reader.
  const rule = css.match(
    /((?:body\.journey-lit [^{,]+,\s*)*body\.journey-lit [^{]+)\{[^}]*?rgba\(\s*255,\s*255,\s*255,\s*([\d.]+)\s*\)[^}]*?backdrop-filter/
  );
  assert.ok(rule, "no white rgba veil with a backdrop-filter is applied over the region art");
  const alpha = Number(rule[2]);
  const veiled = rule[1];

  // Every surface that can hold text on a journey screen. The footer was
  // measured at 1.07:1 on raw art before it was veiled, so a missing entry
  // here is not cosmetic.
  for (const surface of [".onboarding-container.card", "header", ".app-footer"]) {
    assert.ok(
      veiled.includes(surface),
      `${surface} is no longer veiled over the region art. Text on it would sit ` +
      "directly on an illustrated background -- the footer links measured 1.07:1 " +
      "that way, against a 4.5:1 floor."
    );
  }

  const measured = JSON.parse(
    readFileSync(new URL("../assets/regions/contrast.json", import.meta.url), "utf8")
  ).regions;

  const toHex = rgb => "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join("");
  // Both inks that land on the onboarding card. Small text in either needs
  // 4.5:1; the stems and helper lines use the secondary colour, and they are
  // the ones that actually bind.
  const inks = ["--color-navy", "--color-text-secondary"].map(name => {
    const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
    assert.ok(m, `index.css no longer defines ${name}, which the veil is measured against`);
    return { name, hex: m[1] };
  });

  for (const chapter of CHAPTERS) {
    const rec = measured[chapter.art];
    assert.ok(
      rec,
      `assets/regions/contrast.json has no entry for "${chapter.art}". A new region ` +
      "background needs its darkest tile measured before it can be shipped."
    );
    const file = new URL(`../assets/regions/${chapter.art}.jpg`, import.meta.url);
    assert.equal(
      statSync(file).size, rec.bytes,
      `assets/regions/${chapter.art}.jpg is ${statSync(file).size} bytes but ` +
      `contrast.json was measured against ${rec.bytes}. The image changed, so its ` +
      "recorded darkest tile is stale -- re-measure it, do not edit the number."
    );

    const over = rec.darkestTile.map(c => Math.round(alpha * 255 + (1 - alpha) * c));
    for (const ink of inks) {
      const ratio = contrastRatio(ink.hex, toHex(over));
      assert.ok(
        ratio >= 4.5,
        `${ink.name} on the card over ${chapter.art}.jpg is ${ratio.toFixed(2)}:1, below ` +
        `the 4.5:1 small-text minimum. Either the card veil (now ${alpha}) was opened ` +
        "up to show more art, or this image is darker than the set it joined. Raise " +
        "the veil or lighten the image -- do not lower the threshold."
      );
    }
  }
});

test("every region wash keeps the app's own ink readable on it", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  const navy = css.match(/--color-navy:\s*(#[0-9a-f]{6})/i);
  assert.ok(navy, "index.css no longer defines --color-navy, which every wash is measured against");

  const washes = new Set();
  for (const chapter of CHAPTERS) {
    assert.match(chapter.wash, /^#[0-9a-f]{6}$/i, `${chapter.aspect}: wash is not a hex colour`);
    const ratio = contrastRatio(chapter.wash, navy[1]);
    // 7:1 is AAA for body text. The floor is deliberately above the 4.5:1
    // minimum: the wash sits under a 22-screen form of small radio labels, and
    // the card over it is only 86% opaque, so the real composite is lighter
    // than this measurement rather than darker.
    assert.ok(
      ratio >= 7,
      `${chapter.aspect}: navy ink on wash ${chapter.wash} is ${ratio.toFixed(2)}:1, below 7:1. ` +
      "A wash this deep needs a different ink, not a darker page."
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
