// views/lumi.js - Lumi's tip, behind the header's star (redesign R5;
// docs/prototype/redesign/you.js openLumi).
//
// It replaces the floating assistant, whose bubble typed a tip over the page
// on every route change and, on a phone, sat on top of whatever was scrolled
// under it. Lumi now speaks only when asked: the star opens a small panel with
// the tip for your lowest aspect and a link to that region.
//
// The panel settles in on a small spring and the tip types itself, by
// grapheme. A quiet region's tip (the Still Water, the Commons) arrives whole,
// and reduced motion shows the panel finished. Escape, a press outside, the
// menu, a new route or a new language all close it.

import { t, tp } from "../i18n.js";
import { escapeHtml } from "./helpers.js";
import { SPRITES, QUIET_ASPECTS, typedMarkup, typeIn, settleIn } from "./stage.js";
import { chapterOf, aspectName } from "./news.js";
import { closeMenu } from "./menu.js";
import { isReduced } from "../motion.js";

const TIP_MS_PER_CHAR = 32;
const SETTLE = { scale: 0.94, drop: -18, stiffness: 380, damping: 24 };

const TIPS = {
  finance: "Your finance score has room to grow. A simple monthly budget and a set savings rate are good starting points.",
  physical: "Your physical activity could use a lift. A short walk today is an easy way to build momentum.",
  mental: "Feeling stretched? Try a slow breathing break — two short inhales through the nose, then one long exhale.",
  relationships: "Connection matters. Consider reaching out to a close friend or relative this week.",
  personalGoals: "Steady practice moves your goals forward. Even 20 minutes of focused learning today helps.",
  socialContribution: "Small acts of giving add up. A minor kindness or a modest donation strengthens this area.",
  environment: "Everyday choices shape your footprint. Separating recyclables today is a simple step.",
  humanityFuture: "Long-term security grows from consistent habits — saving and upskilling both anchor your future."
};

// The lowest aspect, the first on a tie; null when there are no scores.
export function lowestAspect(aspects) {
  let lowest = null;
  let min = Infinity;
  for (const [key, value] of Object.entries(aspects || {})) {
    if (Number(value) < min) {
      min = Number(value);
      lowest = key;
    }
  }
  return lowest;
}

// The tip for the lowest aspect, or the weekly-review reminder when the lowest
// is not an aspect this app has a tip for.
export function getLumiTip(aspects) {
  const key = lowestAspect(aspects);
  return t(TIPS[key] || "Complete your weekly review to keep your assessment current and track your progress.");
}

export function lumiMarkup(aspects) {
  const key = lowestAspect(aspects);
  const tip = getLumiTip(aspects);
  const link = TIPS[key] && chapterOf(key)
    ? `<a class="pill" href="#/aspect/${key}">${escapeHtml(tp("Open {aspect} details", { aspect: aspectName(key) }))}</a>`
    : `<a class="pill" href="#/review">${escapeHtml(t("Weekly Review"))}</a>`;
  return `
    <img class="lumi-img" src="./assets/lumi.png" alt="" width="256" height="256">
    <div class="lumi-body">
      <h2 class="lumi-label" id="lumi-title">(${escapeHtml(t("Lumi's tip"))})</h2>
      <p class="lumi-tip">${typedMarkup(tip)}</p>
      <div class="lumi-row">
        ${link}
        <button type="button" class="linkbtn" data-lumi-close>${escapeHtml(t("Close"))}</button>
      </div>
    </div>`;
}

// --- the panel ----------------------------------------------------------------

let readState = () => null;
let motion = null;

const panelEl = () => document.getElementById("lumi-panel");
const buttonEl = () => document.getElementById("btn-lumi");
const isOpen = () => panelEl()?.hidden === false;

function onKeydown(e) {
  if (e.key === "Escape" && isOpen()) {
    e.preventDefault();
    closeLumi({ restoreFocus: true });
  }
}

function onPointerDown(e) {
  const panel = panelEl();
  const button = buttonEl();
  if (!isOpen() || panel.contains(e.target) || button?.contains(e.target)) return;
  closeLumi();
}

// The panel settles in, then the tip types itself. A quiet region's tip is
// shown whole, and under reduced motion nothing is parked at all.
function arrive(panel, key) {
  motion?.abort();
  motion = new AbortController();
  if (QUIET_ASPECTS.includes(key) || isReduced()) return;
  const { signal } = motion;
  const report = (err) => console.error("Lumi's panel motion failed:", err);
  settleIn(panel, { ...SETTLE, signal }).catch(report);
  typeIn(panel.querySelector(".lumi-tip .typed"), { msPerChar: TIP_MS_PER_CHAR, signal }).catch(report);
}

export function openLumi() {
  const panel = panelEl();
  const state = readState();
  if (!panel || !state) return;
  closeMenu({ restoreFocus: false });
  panel.innerHTML = lumiMarkup(state.aspects);
  panel.hidden = false;
  buttonEl()?.setAttribute("aria-expanded", "true");
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onPointerDown);
  panel.focus();
  arrive(panel, lowestAspect(state.aspects));
}

export function closeLumi({ restoreFocus = false } = {}) {
  const panel = panelEl();
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerdown", onPointerDown);
  motion?.abort();
  motion = null;
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  buttonEl()?.setAttribute("aria-expanded", "false");
  if (restoreFocus) buttonEl()?.focus();
}

// The star shows only once there are scores to speak about.
export function setLumiAvailable(on) {
  const button = buttonEl();
  if (!button) return;
  button.classList.toggle("d-none", !on);
  button.setAttribute("aria-label", t("Lumi's tip"));
  if (!on) closeLumi();
}

// Binds once: the header and the panel live for the page's lifetime.
let bound = false;
export function bindLumi(getState) {
  readState = getState;
  if (bound) return;
  const button = buttonEl();
  const panel = panelEl();
  if (!button || !panel) return;
  bound = true;
  button.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="${SPRITES}#star"/></svg>`;
  button.addEventListener("click", () => (isOpen() ? closeLumi({ restoreFocus: true }) : openLumi()));
  panel.addEventListener("click", (e) => {
    if (e.target.closest("[data-lumi-close]")) closeLumi({ restoreFocus: true });
    else if (e.target.closest("a[href]")) closeLumi();
  });
  document.getElementById("btn-menu")?.addEventListener("click", () => closeLumi());
}
