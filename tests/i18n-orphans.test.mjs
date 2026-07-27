// The reverse of the i18n coverage guard: TH -> code, not code -> TH.
//
// i18n-coverage.test.mjs proves every t()/tp() key HAS a Thai entry. Nothing
// proved the opposite, so a key whose English string left the code stayed in
// th.js forever. That is not merely clutter: dead keys are where retired
// vocabulary hides. The "log routines" wording outlived the daily-logging
// feature by several releases in exactly this way, and the sweep that removed
// it found 118 unreachable entries.
//
// WHY LITERAL SCANNING IS ENOUGH. Many keys reach t() as a variable
// (t(instr.title), t(band.label), t(tmpl.unit)) and never appear as a literal
// argument. But the value still has to be WRITTEN somewhere — as a quoted
// string in the data module that defines it. So "does this text appear as a
// quoted string literal in any source file" covers dynamic and literal keys
// alike, without importing anything.
//
// The scan deliberately excludes tests/: a key propped up only by a test that
// asserts its translation is still dead in the app. It also excludes prose
// files (CHANGELOG, README) — a key must be reachable by CODE, and a changelog
// entry describing a removed feature must not keep that feature's strings alive.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TH } from "../th.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Everything that can legitimately reference a translation key.
function sourceFiles() {
  return [
    ...readdirSync(root).filter(f => f.endsWith(".js") && f !== "th.js"),
    ...readdirSync(join(root, "views")).filter(f => f.endsWith(".js")).map(f => join("views", f)),
    "index.html",
    "privacy.html"
  ];
}

// Keys intentionally kept even though nothing references them yet — e.g. a
// string landing in a follow-up PR. Add the reason inline; an entry that
// outlives its reason is the same rot this test exists to catch.
const ALLOWLIST = new Set([]);

// The forms a key can take when written as a source literal. Keys containing a
// quote are written in the other quoting style (or escaped), so all three
// delimiters are checked, both escaped and raw.
function literalForms(key) {
  const e = key.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  return [
    `"${e.replace(/"/g, '\\"')}"`,
    `'${e.replace(/'/g, "\\'")}'`,
    `\`${e}\``,
    `"${key}"`,
    `'${key}'`
  ];
}

test("every th.js key is still reachable from the code (no orphaned translations)", () => {
  const corpus = sourceFiles()
    .map(f => readFileSync(join(root, f), "utf8"))
    .join("\n");

  const orphans = Object.keys(TH).filter(
    key => !ALLOWLIST.has(key) && !literalForms(key).some(form => corpus.includes(form))
  );

  assert.deepEqual(
    orphans, [],
    "Orphaned Thai entries — the English string is gone from the code, so these " +
    "translate nothing and are where retired vocabulary hides. Delete them from " +
    "th.js, or add to ALLOWLIST with a reason:\n" +
    orphans.map(k => `  ${JSON.stringify(k)}`).join("\n")
  );
});

test("the ALLOWLIST has no entries that th.js no longer defines", () => {
  // A stale allowlist silently re-opens the hole it was meant to document.
  const stale = [...ALLOWLIST].filter(k => !Object.hasOwn(TH, k));
  assert.deepEqual(stale, [], `ALLOWLIST names keys absent from th.js: ${stale.join(", ")}`);
});
