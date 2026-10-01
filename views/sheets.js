// views/sheets.js - stacked sheets (v161 on the aspect pages, v164 on
// Overview; the owner's layout rules of 2026-10-01, after fastwork.com).
// Every section of a page is a rounded sheet that pins once it has been read
// to its end, and the next one slides up over it. A sheet shorter than the
// screen pins under the header; a taller one pins when its bottom reaches the
// bottom of the screen, so nothing in it is covered before it is seen.
//
// CSS does the pinning (position: sticky at --stick); this only measures.
// Reduced motion turns the pinning off in CSS.

const PHONE = "(max-width: 900px)";
export const isPhone = () => typeof matchMedia === "function" && matchMedia(PHONE).matches;

function cssPx(name) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : 0;
}

// The header's height, the bottom bar's on a phone, and the room between.
export function frame() {
  const header = document.querySelector(".site-header")?.offsetHeight || 0;
  const bottom = isPhone() ? cssPx("--nav-bar-h") : 0;
  return { header, bottom, room: innerHeight - header - bottom };
}

// Where each sheet may pin: under the header, or higher by however much the
// sheet is taller than the room. `before` measures anything a sheet's height
// depends on first (the aspect page's stepper).
function measure(page, before) {
  const { header, room } = frame();
  page.style.setProperty("--head-h", `${header}px`);
  page.style.setProperty("--room", `${room}px`);
  before?.(page);
  page.querySelectorAll(":scope > .panel").forEach(sheet => {
    const over = Math.max(0, sheet.offsetHeight - room);
    sheet.style.setProperty("--stick", `${header - over}px`);
  });
}

export function bindSheets(page, signal, { before } = {}) {
  const run = () => measure(page, before);
  run();
  addEventListener("resize", run, { signal });
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(run);
    page.querySelectorAll(":scope > .panel").forEach(s => ro.observe(s));
    signal.addEventListener("abort", () => ro.disconnect());
  }
}
