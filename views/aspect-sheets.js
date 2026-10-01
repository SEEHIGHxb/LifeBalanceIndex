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

const PHONE = "(max-width: 900px)";
const isPhone = () => typeof matchMedia === "function" && matchMedia(PHONE).matches;

// One page at a time: a new render tears down the last one's listeners.
let teardown = null;

// --- sheets ------------------------------------------------------------------

function cssPx(name) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : 0;
}

// Where each sheet may pin: under the header, or higher by however much the
// sheet is taller than the room between the header and the bottom bar.
function measureSheets(page) {
  const header = document.querySelector(".site-header")?.offsetHeight || 0;
  const bottom = isPhone() ? cssPx("--nav-bar-h") : 0;
  const room = innerHeight - header - bottom;
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

export function bindAspectSheets(root) {
  teardown?.abort();
  const page = root.querySelector(".aspect-page");
  if (!page || typeof AbortController !== "function") return;
  teardown = new AbortController();
  const { signal } = teardown;
  bindSheets(page, signal);
  page.querySelectorAll(".parts-stepper").forEach(s => bindStepper(s, signal));
  tightenLoneWords(page, signal);
}
