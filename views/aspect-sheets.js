// views/aspect-sheets.js - the aspect page's scrolling (v161, the owner's
// layout rules of 2026-10-01, after fastwork.com):
//
//   sheets    every section is a rounded sheet that pins once it has been
//             read to its end, and the next one slides up over it. A sheet
//             shorter than the screen pins under the header; a taller one
//             pins when its bottom reaches the bottom of the screen, so
//             nothing in it is ever covered before it is seen.
//   stepper   "What it's made of" is a list of parts and one card. On a
//             laptop the card follows the scroll; on a phone, and anywhere,
//             a tap on a part shows its card.
//   words     no paragraph ends on a lone word (views/lone-words.js).
//
// CSS does the pinning (css/weekly.css .aspect-page .panel); this file only
// measures where each sheet may pin. Reduced motion turns the pinning off in
// CSS, and the stepper then follows taps alone.

import { isReduced } from "../motion.js";
import { tightenLoneWords } from "./lone-words.js";
import { burst } from "./stage.js";

const PHONE = "(max-width: 900px)";
const isPhone = () => typeof matchMedia === "function" && matchMedia(PHONE).matches;

// One page at a time: a new render tears down the last one's listeners.
let teardown = null;

// --- sheets ------------------------------------------------------------------

function cssPx(name) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : 0;
}

function frame() {
  const header = document.querySelector(".site-header")?.offsetHeight || 0;
  const bottom = isPhone() ? cssPx("--nav-bar-h") : 0;
  return { header, bottom, room: innerHeight - header - bottom };
}

// Where each sheet may pin: under the header, or higher by however much the
// sheet is taller than the room between the header and the bottom bar.
// First the stepper's pinned block is measured (v162): the section is sized
// round it, so the last part stays on screen a while before the next sheet
// rises over it, and the block pins where it fits whole.
function measureSheets(page) {
  const { header, room } = frame();
  page.style.setProperty("--head-h", `${header}px`);
  page.style.setProperty("--room", `${room}px`);
  page.querySelectorAll(".aspect-parts").forEach(section => {
    const pin = section.querySelector(".ps-pin");
    if (pin) section.style.setProperty("--pin-h", `${pin.offsetHeight}px`);
  });
  page.querySelectorAll(":scope > .panel").forEach(sheet => {
    const over = Math.max(0, sheet.offsetHeight - room);
    sheet.style.setProperty("--stick", `${header - over}px`);
  });
}

function bindSheets(page, signal) {
  const measure = () => measureSheets(page);
  measure();
  addEventListener("resize", measure, { signal });
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(measure);
    page.querySelectorAll(":scope > .panel").forEach(s => ro.observe(s));
    signal.addEventListener("abort", () => ro.disconnect());
  }
}

// --- the parts stepper ---------------------------------------------------------

function showStep(stepper, i) {
  stepper.querySelectorAll(".ps-tab").forEach((tab, k) => {
    tab.setAttribute("aria-selected", String(k === i));
    tab.tabIndex = k === i ? 0 : -1;
  });
  stepper.querySelectorAll(".ps-card").forEach((card, k) => { card.hidden = k !== i; });
  stepper.dataset.step = String(i);
}

// Which step the scroll has reached, from the track's markers crossing the
// middle band of the screen (the observer's rootMargin). `entries` holds only
// the markers whose crossing changed since the last call, as
// [{ step, isIntersecting }]; `current` is the step on show now.
// The last marker to enter wins; a report of leavings alone (a fling past a
// part) keeps the card on show, so it never flickers back.
export function stepFromEntries(entries, current) {
  const entered = entries.filter(e => e.isIntersecting && e.step >= 0);
  return entered.length ? entered[entered.length - 1].step : current;
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
    const i = go(tabs.indexOf(tab));
    // On a laptop the card follows the scroll, so a tap scrolls there too.
    const marker = stepper.querySelectorAll(".ps-track li")[i];
    if (marker && !isPhone() && marker.offsetParent) {
      marker.scrollIntoView({ block: "center", behavior: isReduced() ? "auto" : "smooth" });
    }
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

  if (typeof IntersectionObserver !== "function") return;
  const markers = [...stepper.querySelectorAll(".ps-track li")];
  const io = new IntersectionObserver((entries) => {
    if (isPhone()) return;
    const current = Number(stepper.dataset.step) || 0;
    const next = stepFromEntries(entries.map(e => ({ step: markers.indexOf(e.target), isIntersecting: e.isIntersecting })), current);
    if (next !== current) showStep(stepper, next);
  }, { rootMargin: "-45% 0px -45% 0px" });
  markers.forEach(m => io.observe(m));
  signal.addEventListener("abort", () => io.disconnect());
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
const REST_MS = 220;
const OPEN_DELAY_MS = 360;
const LOCK_AFTER_MS = 450;
const HOLD_MAX_MS = 2500;

// How far the pull has gone, 0 at the peek and 1 at the full ring, from where
// the sheet's top stands (`top`, from the top of the screen), the frame, and
// the scroll still left in the page (`left`).
export function pullProgress({ top, header, room, left }) {
  const shown = header + room - top;
  if (shown <= PEEK_PX) return 0;
  const toFull = Math.min(Math.max(0, top - header), left);
  const pulled = shown - PEEK_PX;
  return Math.min(1, pulled / (pulled + toFull || 1));
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

function openNext(sheet, link, signal) {
  if (sheet.dataset.opening) return;
  sheet.dataset.opening = "1";
  sheet.style.setProperty("--pull", "1");
  const go = () => { location.hash = link.getAttribute("href"); };
  if (isReduced()) { go(); return; }
  holdScroll();
  const hue = getComputedStyle(sheet).getPropertyValue("--next-hue").trim();
  burst(sheet.querySelector(".burst-layer"), link.querySelector(".next-mark"), {
    motifs: [{ motif: sheet.dataset.next, hue }], signal
  });
  setTimeout(go, OPEN_DELAY_MS);
}

function bindPull(sheet, signal) {
  const link = sheet.querySelector(".next-pull");
  if (!link) return;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    openNext(sheet, link, signal);
  }, { signal });

  let armed = false;
  let touching = false;
  let rest = 0;
  const read = () => {
    const { header, room } = frame();
    const top = sheet.getBoundingClientRect().top;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    return { top, header, room, left, shown: header + room - top };
  };
  const toPeek = (f, smooth) => scrollTo({ top: scrollY - (f.shown - PEEK_PX), behavior: smooth ? "smooth" : "instant" });
  const settle = () => {
    if (touching || sheet.dataset.opening) return;
    const f = read();
    if (f.shown <= 0) { armed = false; return; }
    if (f.shown <= PEEK_PX + 2) { armed = true; return; }
    if (armed && pullProgress(f) < 1) toPeek(f, true);
  };
  const onScroll = () => {
    if (isReduced() || sheet.dataset.opening) return;
    const f = read();
    if (f.shown <= 0) armed = false;
    // A fling into the sheet stops at the peek; a fresh scroll pulls on.
    if (!armed && f.shown > PEEK_PX) toPeek(f, false);
    const p = armed ? pullProgress(f) : 0;
    sheet.style.setProperty("--pull", p.toFixed(3));
    sheet.classList.toggle("is-pulling", p > 0);
    if (armed && p >= 0.995) { openNext(sheet, link, signal); return; }
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

export function bindAspectSheets(root) {
  teardown?.abort();
  const page = root.querySelector(".aspect-page");
  if (!page || typeof AbortController !== "function") return;
  teardown = new AbortController();
  const { signal } = teardown;
  bindSheets(page, signal);
  page.querySelectorAll(".parts-stepper").forEach(s => bindStepper(s, signal));
  page.querySelectorAll(".next-aspect").forEach(s => bindPull(s, signal));
  tightenLoneWords(page, signal);
}
