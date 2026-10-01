// views/aspect-ribbon.js - "you are here" on an aspect page (v163, the owner:
// "a ribbon for the current aspect page ... so the user know where they are
// from the seamless scroll"). The region's emblem, its name and eight dots,
// this region's filled. It takes the wordmark's place in the header once the
// page's top has been covered by the next sheet, and gives it back after;
// a tap goes back up to the top. The page renders it (views/aspect.js
// ribbonMarkup); this moves it into the header and takes it out again when
// the page ends.

import { isReduced } from "../motion.js";

const ON = "ribbon-on";
// How near the header the covering sheet comes before the ribbon shows.
const COVER_PX = 40;

export function bindRibbon(page, signal) {
  const ribbon = page.querySelector(".aspect-ribbon");
  const header = document.querySelector(".site-header");
  const wordmark = header?.querySelector(".wordmark");
  const top = page.querySelector(".page-top");
  if (!ribbon || !header || !wordmark) { ribbon?.remove(); return; }
  wordmark.after(ribbon);
  ribbon.hidden = false;
  const show = (on) => {
    header.classList.toggle(ON, on);
    ribbon.inert = !on;
  };
  show(false);
  // On a laptop it starts where the wordmark starts and stops short of the
  // section links; on a phone the stylesheet centres it.
  const place = () => {
    const nav = header.querySelector(".navpill");
    const x = wordmark.offsetLeft - 5;
    header.style.setProperty("--ribbon-x", `${x}px`);
    if (nav?.offsetWidth) header.style.setProperty("--ribbon-w", `${Math.max(160, nav.offsetLeft - x - 16)}px`);
  };
  place();
  addEventListener("resize", place, { signal });
  ribbon.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: isReduced() ? "instant" : "smooth" });
  }, { signal });
  signal.addEventListener("abort", () => {
    header.classList.remove(ON);
    ribbon.remove();
  });
  // On once the sheet after the top has slid up over it (the top is itself a
  // sticky sheet, so it never leaves the screen to be watched for).
  const cover = top?.nextElementSibling;
  if (!cover) return;
  const check = () => show(cover.getBoundingClientRect().top < header.offsetHeight + COVER_PX);
  check();
  addEventListener("scroll", check, { signal, passive: true });
  addEventListener("resize", check, { signal, passive: true });
}
