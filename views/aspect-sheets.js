// views/aspect-sheets.js - the aspect page's scrolling (v161, the owner's
// layout rules of 2026-10-01, after fastwork.com):
//
//   sheets    on a phone every section is a rounded sheet that pins once it
//             has been read to its end, and the next one slides up over it.
//             A sheet shorter than the screen pins under the header; a
//             taller one pins when its bottom reaches the bottom of the
//             screen, so nothing in it is ever covered before it is seen.
//             A laptop reads them as static cards (v170, the owner).
//   stepper   "What it's made of" is a list of parts and one card; a tap on
//             a part shows its card (since v170 the scroll no longer picks
//             it on a laptop).
//   words     no paragraph ends on a lone word (views/lone-words.js).
//
// CSS does the pinning (css/weekly.css .aspect-page .panel); views/sheets.js
// measures where each sheet may pin. Reduced motion turns the pinning off in
// CSS.

import { isReduced } from "../motion.js";
import { tightenLoneWords } from "./lone-words.js";
import { bindRibbon } from "./aspect-ribbon.js";
import { bindSheets, frame, isPhone } from "./sheets.js";

// One page at a time: a new render tears down the last one's listeners.
let teardown = null;

// --- the parts stepper ---------------------------------------------------------

function showStep(stepper, i) {
  stepper.querySelectorAll(".ps-tab").forEach((tab, k) => {
    tab.setAttribute("aria-selected", String(k === i));
    tab.tabIndex = k === i ? 0 : -1;
  });
  stepper.querySelectorAll(".ps-card").forEach((card, k) => { card.hidden = k !== i; });
  stepper.dataset.step = String(i);
}

function bindStepper(stepper, signal) {
  const tabs = [...stepper.querySelectorAll(".ps-tab")];
  const go = (i) => {
    const k = (i + tabs.length) % tabs.length;
    showStep(stepper, k);
    return k;
  };
  stepper.addEventListener("click", (e) => {
    const tab = e.target.closest(".ps-tab");
    if (!tab) return;
    go(tabs.indexOf(tab));
  }, { signal });
  // The arrow keys move along the parts, as in any tab list.
  stepper.addEventListener("keydown", (e) => {
    const at = tabs.indexOf(e.target.closest(".ps-tab"));
    if (at < 0) return;
    const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    tabs[go(to)].focus();
  }, { signal });
}

// --- the pull to the next region ---------------------------------------------
//
// The last sheet is the next region's. Its top edge rising into view is the
// peek; a scroll that reaches the peek in one fling stops there, and only a
// fresh scroll pulls on. From the peek the ring round its emblem fills with
// the pull, and a full ring (the sheet under the header, or the page's end)
// opens the region. Let go short of it and the sheet slides back to the peek.
// Reduced motion: no hold, no pull; the sheet is a link to tap.

const PEEK_PX = 112;
// The pull from the peek to a full ring: one ordinary swipe on a phone (v163,
// the owner: the old pull, the whole sheet's height, was near impossible
// there), a short wheel or trackpad stroke on a laptop.
const PULL_PX = { phone: 180, laptop: 260 };
const END_SLACK_PX = 24;
const REST_MS = 220;
const OPEN_DELAY_MS = 360;
const LOCK_AFTER_MS = 450;
const HOLD_MAX_MS = 2500;
const ARRIVE_MAX_MS = 1500;

// How far the pull has gone, 0 at the peek and 1 at the full ring, from how
// much of the sheet shows (`shown`, px above the bottom of the screen), the
// pull a full ring takes (`pull`), and the scroll still left in the page
// (`left`): a page that ends before the ring is full counts as full.
export function pullProgress({ shown, pull, left }) {
  if (shown <= PEEK_PX) return 0;
  if (left <= 1 && shown > PEEK_PX + END_SLACK_PX) return 1;
  return Math.min(1, (shown - PEEK_PX) / pull);
}

// The scroll is held while the region opens and until the wheel or the finger
// has been still a moment, so a fling still running when the ring closes does
// not carry on down the next region's page. Not tied to the page's signal:
// the hold outlives the page it started on.
function holdScroll() {
  const html = document.documentElement;
  const since = performance.now();
  let input = since;
  const stir = () => { input = performance.now(); };
  const opts = { passive: true, capture: true };
  addEventListener("wheel", stir, opts);
  addEventListener("touchmove", stir, opts);
  html.style.overflow = "hidden";
  const check = () => {
    const now = performance.now();
    const held = now - since;
    if (held < HOLD_MAX_MS && (held < OPEN_DELAY_MS + LOCK_AFTER_MS || now - input < LOCK_AFTER_MS)) { setTimeout(check, 100); return; }
    removeEventListener("wheel", stir, opts);
    removeEventListener("touchmove", stir, opts);
    html.style.overflow = "";
  };
  setTimeout(check, 100);
}

// The pairs the switch morphs (v163, the owner: "not feel true smooth and
// seamless"): the sheet becomes the next page's top, its emblem flies to the
// top's emblem, its name grows into the title, its photograph into the plate.
const MORPH = [
  ["lbi-sheet", ":scope", ".page-top"],
  ["lbi-plate", ".next-plate", ".page-top-plate"],
  ["lbi-emblem", ".next-mark img", ".page-top .mark img"],
  ["lbi-name", ".next-name", ".page-top-word"]
];

// Names one side's elements for the morph; returns them, to unname later.
function nameMorph(root, side) {
  const named = [];
  for (const pair of MORPH) {
    const el = side === 1 && pair[1] === ":scope" ? root : root?.querySelector(pair[side]);
    if (!el) continue;
    el.style.viewTransitionName = pair[0];
    named.push(el);
  }
  return named;
}

// Resolves once the region's page is drawn (or after a while regardless, so
// a slow load never strands the switch).
function arrived(key) {
  const find = () => document.querySelector(`.aspect-page[data-aspect="${key}"]`);
  return new Promise((resolve) => {
    if (find()) { resolve(find()); return; }
    const mo = new MutationObserver(() => { if (find()) { mo.disconnect(); resolve(find()); } });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); resolve(find()); }, ARRIVE_MAX_MS);
  });
}

const toTop = () => scrollTo({ top: 0, behavior: "instant" });

function openNext(sheet, link) {
  if (sheet.dataset.opening) return;
  sheet.dataset.opening = "1";
  sheet.style.setProperty("--pull", "1");
  const key = sheet.dataset.next;
  const go = () => { location.hash = link.getAttribute("href"); };
  if (isReduced()) { go(); return; }
  holdScroll();
  if (typeof document.startViewTransition === "function") {
    nameMorph(sheet, 1);
    let landed = null;
    let named = [];
    const vt = document.startViewTransition(async () => {
      go();
      landed = await arrived(key);
      named = nameMorph(landed, 2);
    });
    vt.finished.finally(() => {
      named.forEach(el => { el.style.viewTransitionName = ""; });
      // The new page opens at its top, whatever the tail of the pull did
      // (v170, the owner: a phone used to land partway down).
      toTop();
    });
    return;
  }
  // No View Transitions: the page changes after the ring has closed.
  setTimeout(() => { go(); toTop(); }, OPEN_DELAY_MS);
}

function bindPull(sheet, signal) {
  const link = sheet.querySelector(".next-pull");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    openNext(sheet, link);
  }, { signal });

  let armed = false;
  let touching = false;
  let rest = 0;
  const read = () => {
    const { header, room } = frame();
    const top = sheet.getBoundingClientRect().top;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    return { left, shown: header + room - top, pull: isPhone() ? PULL_PX.phone : PULL_PX.laptop };
  };
  const toPeek = (f, smooth) => scrollTo({ top: scrollY - (f.shown - PEEK_PX), behavior: smooth ? "smooth" : "instant" });
  const settle = () => {
    if (touching || sheet.dataset.opening) return;
    const f = read();
    if (f.shown <= 0) { armed = false; return; }
    // Armed only at rest on the peek itself: a stop short of it leaves the
    // next scroll to be held there too.
    if (f.shown < PEEK_PX - 4) return;
    if (f.shown <= PEEK_PX + 2) { armed = true; return; }
    if (armed && pullProgress(f) < 1) toPeek(f, true);
  };
  const onScroll = () => {
    if (!sheet.isConnected || isReduced() || sheet.dataset.opening) return;
    const f = read();
    if (f.shown <= 0) armed = false;
    // A fling into the sheet stops at the peek; a fresh scroll pulls on.
    if (!armed && f.shown > PEEK_PX) toPeek(f, false);
    const p = armed ? pullProgress(f) : 0;
    sheet.style.setProperty("--pull", p.toFixed(3));
    sheet.classList.toggle("is-pulling", p > 0);
    if (armed && p >= 0.995) { openNext(sheet, link); return; }
    clearTimeout(rest);
    rest = setTimeout(settle, REST_MS);
  };
  addEventListener("scroll", onScroll, { signal, passive: true });
  addEventListener("touchstart", () => { touching = true; }, { signal, passive: true });
  addEventListener("touchend", () => {
    touching = false;
    clearTimeout(rest);
    rest = setTimeout(settle, REST_MS);
  }, { signal, passive: true });
  signal.addEventListener("abort", () => clearTimeout(rest));
}

// Ends the page's listeners, observers and ribbon. The router calls it on
// every route change (views/aspect.js registers it with onRouteEnd), since the window listeners would otherwise
// outlive the page: v162's pull went on snapping every other page back to
// its top. A listener finding its page gone ends them too (below).
export function disposeAspectSheets() {
  teardown?.abort();
  teardown = null;
}

export function bindAspectSheets(root) {
  disposeAspectSheets();
  const page = root.querySelector(".aspect-page");
  if (!page || typeof AbortController !== "function") return;
  teardown = new AbortController();
  const { signal } = teardown;
  // Registered first, in the capture phase, so it runs before the others.
  const guard = () => { if (!page.isConnected) disposeAspectSheets(); };
  for (const type of ["scroll", "resize", "touchstart", "touchend"]) {
    addEventListener(type, guard, { signal, capture: true, passive: true });
  }
  bindSheets(page, signal);
  bindRibbon(page, signal);
  page.querySelectorAll(".parts-stepper").forEach(s => bindStepper(s, signal));
  page.querySelectorAll(".next-aspect").forEach(s => bindPull(s, signal));
  tightenLoneWords(page, signal);
}
