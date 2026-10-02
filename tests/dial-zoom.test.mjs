// The ring round your star on its way in and out (v180, views/dial-zoom.js):
// the star's orbit lands level with the symbols where they started, the
// radar's beam reveals the ring from the marker round, and the asterism's
// twinkles each come on once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orbitIn, orbitOut, orbitPose, ORBIT_IN_MS, tickShare, twinkleAt, twinkle, staggered, backOut } from "../views/dial-zoom.js";

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const whole = (deg) => near(((deg % 360) + 360) % 360, 0) || near(((deg % 360) + 360) % 360, 360);

test("the way in starts flat and lands level, the symbols where Home had them", () => {
  const start = orbitIn(0);
  assert.ok(near(start.tilt, 0) && near(start.lean, 0));
  assert.ok(whole(start.spin));
  const end = orbitIn(ORBIT_IN_MS);
  assert.ok(near(end.tilt, 0) && near(end.lean, 0) && near(end.spin, 0));
});

test("in flight the ring is tipped over into orbit", () => {
  assert.ok(orbitIn(400).tilt > 60);
  assert.ok(orbitOut(450, 900).tilt > 60);
});

test("the way out lands level after whole turns", () => {
  const start = orbitOut(0, 900);
  assert.ok(near(start.tilt, 0) && near(start.spin, 0));
  const end = orbitOut(900, 900);
  assert.ok(near(end.tilt, 0) && near(end.lean, 0));
  assert.ok(whole(end.spin));
});

test("swinging level overshoots and comes back to rest", () => {
  assert.ok(near(backOut(0), 0));
  assert.ok(near(backOut(1), 1));
  assert.ok([0.6, 0.7, 0.8].some(u => backOut(u) > 1));
});

test("the ring's pose keeps the figure's place and adds the orbit", () => {
  const pose = orbitPose("translate(4px, 5px) scale(0.5)", { lean: 10, tilt: 20, spin: 30 });
  assert.match(pose, /^translate\(4px, 5px\) scale\(0\.5\) rotateZ\(10\.0deg\) rotateX\(20\.0deg\) rotateZ\(30\.0deg\)$/);
});

test("the beam meets the ticks clockwise from the marker, however the ring is turned", () => {
  // Tick 36 of 48 sits at the top of an unturned ring, tick 0 at its right.
  assert.ok(near(tickShare(36, 48, 0), 0));
  assert.ok(near(tickShare(0, 48, 0), 0.25));
  assert.ok(near(tickShare(36, 48, 120), 1 / 3));
  for (let k = 0; k < 48; k++) {
    const s = tickShare(k, 48, 240);
    assert.ok(s >= 0 && s < 1);
  }
});

test("every tick twinkles on once, each at its own time", () => {
  const times = Array.from({ length: 48 }, (_, k) => twinkleAt(k, 48));
  assert.equal(new Set(times).size, 48);
  assert.ok(times.every(v => v >= 0 && v < 1));
  assert.equal(twinkle(-1, 3).opacity, 0);
  const lit = twinkle(5000, 3);
  assert.ok(lit.opacity > 0.4 && near(lit.scale, 1, 1e-6));
  assert.ok(twinkle(10, 3).scale > 2);
});

test("the symbols come on one after another", () => {
  assert.deepEqual(staggered(0, 100, 60, 160), [0, 0, 0]);
  const mid = staggered(200, 100, 60, 160);
  assert.ok(mid[0] > mid[1] && mid[1] > mid[2]);
  assert.deepEqual(staggered(1000, 100, 60, 160), [1, 1, 1]);
});
