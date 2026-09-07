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
  assert.match(
    css, /html\[lang="th"\][\s\S]{0,400}?line-height:\s*1\.7/,
    "the Thai block must set a leading that clears stacked tone marks"
  );
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
