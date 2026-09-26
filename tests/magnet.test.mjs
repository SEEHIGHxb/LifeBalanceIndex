// The pills lean toward the pointer, as on humanmade.co.jp (the owner,
// 2026-09-26; the prototype's "magnetic pills"). The feel itself needs a real
// pointer and is covered in the browser; here are the rules around it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installDom } from "./dom-stub.mjs";

installDom();
const { MAG, magnetTarget, magneticPill } = await import("../views/magnet.js");
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

// A pill whose ancestors answer closest() for the selectors given.
const pill = ({ inside = [], disabled = false, ariaDisabled = false } = {}) => {
  const el = {
    disabled,
    getAttribute: (n) => (n === "aria-disabled" && ariaDisabled ? "true" : null),
    closest: (sel) => {
      if (sel === ".pill") return el;
      return sel.split(",").some(s => inside.includes(s.trim())) ? {} : null;
    }
  };
  return el;
};

test("a pill slides toward the pointer, tilts its way and grows a little", () => {
  const t = magnetTarget(40, 10, 200, 60);
  assert.equal(t.x, MAG.pullX * 40);
  assert.equal(t.y, MAG.pullY * 10);
  assert.ok(t.r > 0, "the pointer on the right tilts it right");
  assert.equal(t.s, MAG.scale);
  assert.equal(t.ix, MAG.inner * 40, "the label lags a step behind");
  assert.ok(magnetTarget(-40, 0, 200, 60).r < 0);
});

test("however far the pointer, a pill never leaves its own footprint", () => {
  const t = magnetTarget(5000, -5000, 200, 60);
  assert.equal(t.x, MAG.maxX * 200);
  assert.equal(t.y, -MAG.maxY * 60);
  assert.equal(t.r, MAG.maxTilt);
});

test("calls to act lean; choices, answers and disabled pills never do", () => {
  const cta = pill();
  assert.equal(magneticPill(cta), cta);
  assert.equal(magneticPill(pill({ inside: ['[role="radiogroup"]'] })), null, "a picker is a choice");
  assert.equal(magneticPill(pill({ inside: [".answers"] })), null);
  assert.equal(magneticPill(pill({ inside: [".care-banner"] })), null);
  assert.equal(magneticPill(pill({ disabled: true })), null);
  assert.equal(magneticPill(pill({ ariaDisabled: true })), null);
  assert.equal(magneticPill({ closest: () => null }), null, "not on a pill");
  assert.equal(magneticPill(null), null);
});

test("the page binds the magnet once, and the label's wrapper keeps the pill's layout", () => {
  assert.match(read("app.js"), /bindMagnet\(document\.getElementById\("page"\)\)/);
  assert.match(read("css/stage-page.css"), /\.pill__in\s*\{[^}]*display:\s*inline-flex[^}]*gap:\s*inherit/);
  assert.match(read("sw.js"), /"\.\/views\/magnet\.js"/);
});
