// The return visit (the owner, 2026-09-27: "sometime it took like 5-10s to
// load"). The network-first worker waited on the network for the page and
// every module before using the complete copy it already held: 2 s at one
// second a request, and nothing at all on a connection that stalls. These pin
// the cache-first worker and the release check that replaced it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const sw = read("sw.js");
const app = read("app.js");

test("a returning visitor is answered from the cache before the network", () => {
  assert.match(
    sw, /:\s*fromCache\(req, cache\)\.then\(hit => hit \|\| fromNetwork\(req, cache\)\)/,
    "outside localhost the worker must try its cache first; network-first made a weak signal a 5-10 s wait"
  );
});

test("the precache is all or nothing, so cache-first can never serve half a release", () => {
  const install = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
  assert.match(install, /if \(!res\.ok\) throw/, "a failed file must fail the install");
  assert.doesNotMatch(install, /res\.ok \? cache\.put/, "skipping a failed file leaves a torn copy to serve");
});

test("the page asks the network which release is live, past the worker and the CDN", () => {
  assert.match(app, /fetch\(`\.\/version\.js\?live=\$\{Date\.now\(\)\}`, \{ cache: "no-store" \}\)/,
    "a unique query passes the CDN; no-store passes the browser cache");
  assert.match(sw, /if \(req\.cache === "no-store"\) return;/,
    "the worker must let the release check through, or it answers with its own old version.js");
  assert.match(app, /register\(`\.\/sw\.js\?v=\$\{live\}`/, "a newer release registers that release's worker");
});

test("a new release reloads the page only if nobody has touched it", () => {
  assert.match(app, /if \(!pageTouched\) window\.location\.reload\(\)/);
  assert.match(app, /\["pointerdown", "keydown"\]/);
});
