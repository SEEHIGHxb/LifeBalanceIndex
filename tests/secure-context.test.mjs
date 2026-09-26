// secure-context.js: what the app needs from a page that may be served over
// plain http. crypto.randomUUID exists only in a secure context, and on
// http://lbi.plainpoint.net finishing the journey threw on it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { shortId, httpsUpgradeUrl } from "../secure-context.js";

test("shortId is the prefix and eight hex characters", () => {
  assert.match(shortId("goal"), /^goal_[0-9a-f]{8}$/);
  assert.notEqual(shortId("goal"), shortId("goal"));
});

test("shortId works where crypto.randomUUID does not exist", () => {
  const original = crypto.randomUUID;
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true, writable: true });
  try {
    assert.match(shortId("crew"), /^crew_[0-9a-f]{8}$/);
  } finally {
    Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true, writable: true });
  }
});

test("no shipped module calls crypto.randomUUID", () => {
  const root = new URL("../", import.meta.url);
  const files = [
    ...readdirSync(root).filter(f => f.endsWith(".js")).map(f => new URL(f, root)),
    ...readdirSync(new URL("views/", root)).filter(f => f.endsWith(".js")).map(f => new URL(`views/${f}`, root))
  ];
  for (const f of files) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /randomUUID\(/, `${f.pathname} calls randomUUID`);
  }
});

test("a page on plain http is sent to https with its path and hash", () => {
  assert.equal(
    httpsUpgradeUrl({ protocol: "http:", hostname: "lbi.plainpoint.net", host: "lbi.plainpoint.net", pathname: "/", search: "?a=1", hash: "#/review" }),
    "https://lbi.plainpoint.net/?a=1#/review"
  );
});

test("https and local development hosts are left alone", () => {
  assert.equal(httpsUpgradeUrl({ protocol: "https:", hostname: "lbi.plainpoint.net", host: "lbi.plainpoint.net", pathname: "/", search: "", hash: "" }), null);
  for (const hostname of ["localhost", "127.0.0.1", "[::1]", "app.localhost", "lbi.test"]) {
    assert.equal(httpsUpgradeUrl({ protocol: "http:", hostname, host: `${hostname}:8181`, pathname: "/", search: "", hash: "" }), null, hostname);
  }
});
