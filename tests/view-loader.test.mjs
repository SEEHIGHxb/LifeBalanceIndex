// Each screen's code loads the first time it is shown (the owner, 2026-09-27:
// "load only the code each screen needs"). A screen already loaded draws at
// once, so the flows that re-render the current screen and act on it straight
// after (the language button, the review's ending) behave as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createViewLoader } from "../view-loader.js";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

test("a screen's code is fetched once, on first use, and drawn when it arrives", async () => {
  let fetched = 0;
  const views = createViewLoader({ home: async () => { fetched++; return { name: "home" }; } });
  const drawn = [];
  assert.equal(views.isLoaded("home"), false);
  await views.show("home", mod => drawn.push(mod.name));
  await views.show("home", mod => drawn.push(mod.name));
  assert.deepEqual(drawn, ["home", "home"]);
  assert.equal(fetched, 1);
});

test("a screen already loaded draws before show() returns", async () => {
  const views = createViewLoader({ home: async () => ({}) });
  await views.show("home", () => {});
  let drawn = false;
  views.show("home", () => { drawn = true; });
  assert.equal(drawn, true, "the language button re-renders and reads the screen at once");
});

test("only the last screen asked for is drawn, however the fetches finish", async () => {
  const slow = deferred();
  const views = createViewLoader({ slow: () => slow.promise, fast: async () => ({}) });
  const drawn = [];
  const first = views.show("slow", () => drawn.push("slow"));
  await views.show("fast", () => drawn.push("fast"));
  slow.resolve({});
  assert.equal(await first, false, "a superseded screen reports it was not drawn");
  assert.deepEqual(drawn, ["fast"]);
  assert.equal(views.isLoaded("slow"), true, "its code is kept for next time");
});

test("a screen that cannot load is reported, and is fetched again next time", async () => {
  let attempts = 0;
  const errors = [];
  const views = createViewLoader({
    away: async () => { attempts++; if (attempts === 1) throw new Error("offline"); return {}; }
  }, { onError: (name, err) => errors.push([name, err.message]) });
  assert.equal(await views.show("away", () => {}), false);
  assert.deepEqual(errors, [["away", "offline"]]);
  assert.equal(await views.show("away", () => {}), true);
  assert.equal(attempts, 2);
});

test("the next likely screen can be fetched ahead, without drawing it", async () => {
  let fetched = 0;
  const views = createViewLoader({ journey: async () => { fetched++; return {}; }, bad: async () => { throw new Error("x"); } });
  assert.equal(await views.prefetch("journey"), true);
  assert.equal(views.isLoaded("journey"), true);
  let drawn = false;
  views.show("journey", () => { drawn = true; });
  assert.equal(drawn, true, "tapping Start draws the journey at once");
  assert.equal(fetched, 1);
  assert.equal(await views.prefetch("bad"), false, "a failed prefetch stays quiet; show() reports");
});

test("an unknown screen is a programming error, not a silent blank", () => {
  const views = createViewLoader({});
  assert.throws(() => views.show("nowhere", () => {}), /unknown view "nowhere"/);
});
