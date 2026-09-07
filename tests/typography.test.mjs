// Thai typography guards.
//
// Until v78 this stylesheet had NOT ONE rule scoped to Thai, and the defect
// that caused was invisible to every other kind of test. `--font-serif` read
//
//   'Source Serif 4', 'Sarabun', Georgia, serif
//
// and Source Serif 4 is subsetted to Latin, so every Thai heading skipped it
// and landed on Sarabun — a SANS. The serif/sans contrast that carries this
// app's entire visual hierarchy did not exist in the app's primary language,
// and nothing failed: the CSS was valid, the string was translated, the page
// rendered. Only a Thai reader looking at it would ever know.
//
// These are the guards that would have caught it, so it cannot come back
// silently. They are deliberately structural rather than visual: a test cannot
// see a typeface, but it CAN prove that the serif stack still names a family
// with Thai coverage, and that the faces it names actually ship.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

// The Thai block of the Unicode plane. A face declaring this range is a face
// that can render Thai; one that does not, cannot, whatever it is called.
const THAI_RANGE = "U+0E01-0E5B";

// [family, unicode-range, src url] for every @font-face in fonts.css.
function fontFaces() {
  const css = read("assets/fonts/fonts.css");
  return css.split("@font-face").slice(1).map(block => ({
    family: (block.match(/font-family:\s*'([^']+)'/) || [])[1],
    weight: (block.match(/font-weight:\s*(\d+)/) || [])[1],
    range: (block.match(/unicode-range:\s*([^;]+);/) || [])[1] || "",
    src: (block.match(/url\("\.\/([^"]+)"\)/) || [])[1]
  }));
}

const thaiFaces = () => fontFaces().filter(f => f.range.includes(THAI_RANGE));

test("the serif stack names a family that can actually render Thai", () => {
  // THE REGRESSION THIS FILE EXISTS FOR. Dropping the Thai serif from this
  // stack does not break anything a Latin reader can see — the Thai text keeps
  // rendering, in the sans, exactly as it did for years.
  const token = read("index.css").match(/--font-serif:\s*([^;]+);/);
  assert.ok(token, "index.css must define --font-serif");
  const families = new Set(thaiFaces().map(f => f.family));
  const named = [...families].filter(fam => token[1].includes(`'${fam}'`));
  assert.ok(
    named.length > 0,
    `--font-serif (${token[1].trim()}) names no Thai-capable family. ` +
    `Thai headings will silently fall through to whatever comes next. ` +
    `Families with Thai coverage in fonts.css: ${[...families].join(", ")}`
  );
});

test("the sans stack names a family that can actually render Thai", () => {
  const token = read("index.css").match(/--font-sans:\s*([^;]+);/);
  assert.ok(token, "index.css must define --font-sans");
  const families = new Set(thaiFaces().map(f => f.family));
  assert.ok(
    [...families].some(fam => token[1].includes(`'${fam}'`)),
    `--font-sans (${token[1].trim()}) names no Thai-capable family.`
  );
});

test("the serif and sans stacks do not resolve Thai to the SAME family", () => {
  // The original bug in its purest form: both stacks ending on Sarabun meant
  // the two roles were one role. If this passes only because the serif stack
  // has no Thai face at all, the test above has already failed.
  const css = read("index.css");
  const serif = css.match(/--font-serif:\s*([^;]+);/)[1];
  const sans = css.match(/--font-sans:\s*([^;]+);/)[1];
  const families = [...new Set(thaiFaces().map(f => f.family))];
  const first = (stack) => families.find(fam => stack.includes(`'${fam}'`));
  assert.notEqual(
    first(serif), first(sans),
    "serif and sans resolve Thai to the same face, so Thai readers see no " +
    "typographic hierarchy at all"
  );
});

test("every Thai face ships on disk and is precached for offline use", () => {
  const shell = read("sw.js");
  for (const face of thaiFaces()) {
    assert.ok(face.src, `a Thai @font-face in fonts.css has no src url`);
    assert.ok(
      existsSync(join(root, "assets/fonts", face.src)),
      `fonts.css declares assets/fonts/${face.src}, which is not in the repo`
    );
    // Unlike latin-ext (deliberately omitted — see the comment in sw.js), a
    // Thai face is needed for the app's PRIMARY language, so an offline Thai
    // reader losing it is not an edge case.
    assert.ok(
      shell.includes(`"./assets/fonts/${face.src}"`),
      `assets/fonts/${face.src} is not in the service worker APP_SHELL, so ` +
      `Thai text loses its typeface offline`
    );
  }
});

test("the stylesheet carries rules scoped to Thai", () => {
  // Not a style opinion: Thai stacks vowels and tone marks vertically, so the
  // Latin leading and the negative tracking this sheet sets are wrong for it.
  // Losing the whole block would restore the pre-v78 state, in which the
  // app's primary language had no typographic rules of its own whatsoever.
  const css = read("index.css");
  const rules = [...css.matchAll(/html\[lang="th"\]/g)].length;
  assert.ok(rules >= 4, `expected Thai-scoped rules in index.css, found ${rules}`);

  // ON BODY, NOT ON html. `body` DECLARES line-height 1.55, and a declared
  // value beats an inherited one whatever the specificity of the ancestor that
  // set it — so the first version of this block set 1.75 on <html> and reached
  // no text whatsoever. The bare selector is now a failure, not a pass.
  assert.match(
    css, /html\[lang="th"\] body \{[^}]*line-height:\s*1\.7/,
    "the Thai leading must be declared on body; on html it is inherited and " +
    "loses to body's own declaration"
  );
  const bareRoot = css.match(/html\[lang="th"\] \{([^}]*)\}/);
  if (bareRoot) {
    assert.ok(
      !/line-height/.test(bareRoot[1]),
      "a line-height on the bare html[lang=\"th\"] selector is inert — body " +
      "declares its own and wins"
    );
  }
  assert.match(
    css, /html\[lang="th"\][\s\S]*?letter-spacing:\s*normal/,
    "the Thai block must reset the Latin-tuned letter-spacing"
  );
});

test("i18n sets the lang attribute the Thai rules key off", () => {
  // The CSS above is inert unless <html lang> actually changes with the
  // language. It is set in two places; both must survive.
  assert.match(read("i18n.js"), /document\.documentElement\.lang\s*=/);
  assert.match(read("app.js"), /document\.documentElement\.lang\s*=/);
});

// --- The epistemic hierarchy -----------------------------------------------
//
// This app's whole claim is that it is careful about what it knows. Before
// v78 the type sizes said the opposite:
//
//   the Balance Index — its OWN composite, captioned two lines down as "not a
//   published measure" — was set at --text-4xl, 2.6rem/41.6px, the top step of
//   the scale and the largest type anywhere in the product;
//
//   the cited percentiles it is built from were --text-xs, 0.75rem/12px, grey;
//
//   on the aspect page the 0-100 score led at --text-3xl and the letter grade,
//   which is read off the cited percentile, was a --text-xs chip beside it.
//
// These tests state the ordering as an assertion so it cannot silently invert
// again. They compare TOKENS, not pixels: a retuned scale is fine, a reordered
// hierarchy is not.

// Every --text-* step, as a number of rem.
function typeScale() {
  const css = readFileSync(join(root, "index.css"), "utf8");
  const scale = {};
  for (const [, name, rem] of css.matchAll(/--text-([a-z0-9]+):\s*([\d.]+)rem;/g)) {
    scale[`--text-${name}`] = Number(rem);
  }
  return scale;
}

// The --text-* token a rule sets, or null.
function sizeOf(selector) {
  const css = readFileSync(join(root, "index.css"), "utf8");
  const rule = css.match(
    new RegExp(`\\${selector}\\s*\\{[^}]*?font-size:\\s*var\\((--text-[a-z0-9]+)\\)`, "s")
  );
  return rule ? rule[1] : null;
}

test("the app's own composite is set smaller than a sourced figure", () => {
  const scale = typeScale();
  const composite = sizeOf(".balance-index-value");
  const cited = sizeOf(".aspect-grade-glyph");
  assert.ok(composite && cited, "both figures must size themselves from the scale");
  assert.ok(
    scale[composite] < scale[cited],
    `the Balance Index is set at ${composite} (${scale[composite]}rem) and the ` +
    `letter grade at ${cited} (${scale[cited]}rem). The Index is the one figure ` +
    `in this app that no published source stands behind, and it must not be ` +
    `the louder of the two.`
  );
});

test("the cited grade outranks the uncited score on the aspect header", () => {
  const scale = typeScale();
  const glyph = sizeOf(".aspect-grade-glyph");
  const score = sizeOf(".aspect-score-value");
  assert.ok(glyph && score, "both aspect-header figures must size from the scale");
  assert.ok(
    scale[glyph] > scale[score],
    `the letter grade (${glyph}) must be set larger than the 0-100 score ` +
    `(${score}): the letter is read off the cited percentile, the score is ` +
    `this app's own composite`
  );
});

test("the percentile's range is drawn on the rail, not only stated in small text", () => {
  // The range is the honest half of a percentile — how precise the estimate is
  // — and it was the smallest text in the block.
  const aspect = readFileSync(join(root, "views/aspect.js"), "utf8");
  assert.match(aspect, /class="gauge-range"[^>]*b\.range\.low/,
    "the gauge must draw the indicative range from b.range");
  assert.match(readFileSync(join(root, "index.css"), "utf8"), /\.gauge-range\s*\{/);
  // A screen reader gets the same two facts the sighted reader now gets.
  assert.match(aspect, /aria-valuetext=/,
    "the gauge must speak its range, not just draw it");
});

test("every letter-spacing rule in the sheet is reset for Thai", () => {
  // The enumeration is hand-maintained and invites exactly one kind of miss:
  // two selectors sharing a declaration, only one of which gets listed. That
  // is what happened — .confidence-badge and .component-confidence share a
  // rule and only the second was reset, leaving the trust chip tracked to a
  // Latin eye. Counted rather than trusted from here on.
  const css = readFileSync(join(root, "index.css"), "utf8");
  const thaiBlockEnd = css.indexOf("Reserve the scrollbar's column");
  const latin = css.slice(thaiBlockEnd);
  const reset = new Set(
    [...css.slice(0, thaiBlockEnd).matchAll(/html\[lang="th"\] (\.[a-z0-9-]+)/g)].map(m => m[1])
  );
  const missing = [];
  for (const m of latin.matchAll(/([^{}]+)\{([^}]*letter-spacing:\s*-?[\d.]+em[^}]*)\}/g)) {
    // Split on newlines as well as commas: [^{}]+ swallows the comment and
    // blank lines that precede a rule, so a comma-only split silently drops
    // the FIRST selector of every commented rule — which is precisely the
    // selector (.confidence-badge) this test was written to catch.
    for (const sel of m[1].split(/[,\n]/)) {
      const cls = sel.trim().match(/^(\.[a-z0-9-]+)$/);
      if (cls && !reset.has(cls[1])) missing.push(cls[1]);
    }
  }
  assert.deepEqual(
    missing, [],
    `these rules set letter-spacing for Latin but are not reset for Thai: ${missing.join(", ")}`
  );
});

test("the range band cannot paint over the percentile fill", () => {
  // THE DEFECT THIS EXISTS FOR. The first version drew the range inside the
  // track as a full-height absolutely-positioned band. .gauge-fill is not
  // positioned, so per CSS painting order the band landed ON TOP of the fill
  // and visually truncated it at range.low — on an `estimate` benchmark that
  // is a ten-percentile-point understatement of the reader's own standing, on
  // the one page whose entire purpose is reading that number correctly.
  const css = readFileSync(join(root, "index.css"), "utf8");
  const range = css.match(/\.gauge-range \{([^}]*)\}/);
  assert.ok(range, "index.css must style .gauge-range");
  const body = range[1];
  const positioned = /position:\s*absolute/.test(body);
  const fullHeight = /height:\s*100%/.test(body);
  const fill = css.match(/\.gauge-fill \{([^}]*)\}/);
  const fillPositioned = fill && /position:\s*(relative|absolute)/.test(fill[1]);
  assert.ok(
    !(positioned && fullHeight && !fillPositioned),
    "an absolutely-positioned full-height .gauge-range paints over the " +
    "unpositioned .gauge-fill and truncates the reader's own bar at range.low"
  );
});

test("the share card draws Thai in the same serif as the app", () => {
  // Canvas cannot read a CSS custom property, so story-card.js repeats the
  // stack by hand — and it was still on the pre-v78 stack, so Thai headings on
  // the shared PNG rendered in the sans while the same heading in the app
  // rendered in the serif. The card is the only part of this app anyone else
  // sees.
  const token = readFileSync(join(root, "index.css"), "utf8").match(/--font-serif:\s*([^;]+);/)[1];
  const card = readFileSync(join(root, "story-card.js"), "utf8").match(/const SERIF = "([^"]+)"/);
  assert.ok(card, "story-card.js must name its serif stack in one place");
  for (const family of new Set(thaiFaces().map(f => f.family))) {
    if (!token.includes(`'${family}'`)) continue;
    assert.ok(
      card[1].includes(`'${family}'`),
      `--font-serif resolves Thai to ${family}, but the share card's stack ` +
      `(${card[1]}) does not name it`
    );
  }
});

