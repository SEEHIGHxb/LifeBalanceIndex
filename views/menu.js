// views/menu.js - the site menu that replaced the bottom tab bar (redesign R1,
// docs/redesign-build-plan.md).
//
// The burger opens a dark panel from the left while the page slides aside.
// Every line of the menu starts as one small gilt star per character and turns
// into letters left to right, all lines finishing together; reduced motion
// shows the letters at once. Text is split with graphemes(), so a Thai vowel or
// tone mark never lands in a cell of its own.
//
// Screen readers never hear the letter cells: each line carries its full text
// in an .sr-only span and the cells are aria-hidden.
//
// No global listeners (motion guard 3): while the menu is open the page behind
// it is inert, so focus can only be in the menu or the header, and the keys
// are handled on those two elements.

import { t, graphemes } from "../i18n.js";
import { isReduced } from "../motion.js";
import { escapeHtml } from "./helpers.js";

// Letters start turning at 480ms and every line is done by 1040ms, as in the
// approved prototype (V6_REVIEW #7).
const REVEAL_DELAY_MS = 480;
const REVEAL_SPAN_MS = 560;

// The eight regions in journey order, keyed by the aspect each one measures.
const REGIONS = [
  ["finance", "The Market"],
  ["physical", "The Highlands"],
  ["mental", "The Still Water"],
  ["relationships", "The Commons"],
  ["personalGoals", "The Workshop"],
  ["socialContribution", "The Crossroads"],
  ["environment", "The Wildwood"],
  ["humanityFuture", "The Lookout"]
];

let revealTimers = [];
let lastFocus = null;

const el = id => document.getElementById(id);
const menuEl = () => el("site-menu");
const isOpen = () => document.body.classList.contains("menu-open");

// One line of the menu: the full text for screen readers, then a cell per
// grapheme for the reveal.
function lineHtml(text) {
  const cells = graphemes(text)
    .map(g => `<span class="ch">${escapeHtml(g)}</span>`)
    .join("");
  return `<span class="sr-only">${escapeHtml(text)}</span><span class="menu-line" aria-hidden="true">${cells}</span>`;
}

const link = (href, text, cls = "") =>
  `<a class="${cls}" href="${href}">${lineHtml(text)}</a>`;

const group = (top, subs = []) => `
  <div class="menu-group">
    ${top}
    ${subs.length ? `<ul class="menu-sub">${subs.map(s => `<li>${s}</li>`).join("")}</ul>` : ""}
  </div>`;

// Before onboarding the only screens are the Landing and the journey
// (app.js renderFirstRun), so those two and the static Privacy page are all the
// menu offers (the same reason app.js hides the footer's Methodology link).
//
// Privacy & Data is a sub line, not a heading: a line never wraps (a wrap
// between letter cells can split a Thai word), and at heading size the Thai
// name is wider than a menu column.
function menuHtml(onboarded) {
  const privacy = link("./privacy.html", t("Privacy & Data"));
  if (!onboarded) {
    const start = group(link("#/", t("Start"), "menu-top"));
    const journey = group(link("#/journey", t("The journey"), "menu-top"), [privacy]);
    return `<div class="menu-cols"><div>${start}${journey}</div></div>`;
  }
  const home = group(link("#/dashboard", t("Overview"), "menu-top"), [
    link("#/review", t("Weekly Review")),
    link("#/quests", t("Goals")),
    link("#/leaderboard", t("Side by Side"))
  ]);
  const regions = group(`<h2 class="menu-top">${lineHtml(t("Aspects"))}</h2>`,
    REGIONS.map(([key, region]) => link(`#/aspect/${key}`, t(region))));
  const you = group(`<h2 class="menu-top">${lineHtml(t("You"))}</h2>`, [
    link("#/profile", t("Profile")),
    link("#/year", t("Your year")),
    link("#/methodology", t("Methodology")),
    privacy
  ]);
  return `<div class="menu-cols"><div>${home}</div><div>${regions}</div><div>${you}</div></div>`;
}

function showAllLetters() {
  revealTimers.forEach(clearTimeout);
  revealTimers = [];
  const menu = menuEl();
  if (!menu) return;
  menu.querySelectorAll(".ch.hid").forEach(cell => cell.classList.remove("hid"));
}

// Each line's cells turn from stars into letters left to right; a longer line
// turns faster, so every line finishes at the same moment.
function startReveal() {
  showAllLetters();
  if (isReduced()) return;
  menuEl().querySelectorAll(".menu-line").forEach(line => {
    const cells = [...line.children];
    cells.forEach((cell, i) => {
      if (!cell.textContent.trim()) return;
      cell.classList.add("hid");
      const at = REVEAL_DELAY_MS + (REVEAL_SPAN_MS * i) / cells.length;
      revealTimers.push(setTimeout(() => cell.classList.remove("hid"), at));
    });
  });
}

function setBehindInert(on) {
  for (const id of ["page", "assistant-mount"]) {
    const node = el(id);
    if (node) node.toggleAttribute("inert", on);
  }
}

function labelBurger() {
  const burger = el("btn-menu");
  if (!burger) return;
  burger.setAttribute("aria-expanded", isOpen() ? "true" : "false");
  burger.setAttribute("aria-label", isOpen() ? t("Close menu") : t("Open menu"));
}

export function openMenu() {
  const menu = menuEl();
  if (!menu || isOpen()) return;
  lastFocus = document.activeElement;
  document.body.classList.add("menu-open");
  menu.setAttribute("aria-hidden", "false");
  setBehindInert(true);
  labelBurger();
  menu.querySelector("a[href]")?.focus();
  startReveal();
}

// restoreFocus is false when a link was followed: focus then goes to the new
// view rather than back to the burger.
export function closeMenu({ restoreFocus = true } = {}) {
  if (!isOpen()) return;
  document.body.classList.remove("menu-open");
  menuEl()?.setAttribute("aria-hidden", "true");
  setBehindInert(false);
  labelBurger();
  showAllLetters();
  if (restoreFocus && lastFocus?.focus) lastFocus.focus();
  lastFocus = null;
}

// Marks the link for the current route (aria-current), in the menu and in the
// desktop quick links. `path` is the hash without "#/".
export function syncMenuRoute(path) {
  document.querySelectorAll("#site-menu a[href^='#'], #navpill a").forEach(a => {
    const here = a.getAttribute("href").replace(/^#\/?/, "") === path;
    if (here) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

// Escape closes; Tab wraps between the menu and the header, the only two
// places focus can be while the page is inert.
function onKeydown(e) {
  if (!isOpen()) return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeMenu();
    return;
  }
  if (e.key !== "Tab") return;
  const stops = [...document.querySelectorAll("#site-header button, #site-header a[href], #site-menu a[href]")];
  if (!stops.length) return;
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// A followed link closes the menu and hands focus to the view. On the route
// already showing no hashchange fires, so this is also the only close there.
function onMenuClick(e) {
  const a = e.target.closest?.("a[href]");
  if (!a || !isOpen()) return;
  closeMenu({ restoreFocus: false });
  if (a.getAttribute("href").startsWith("#")) el("main-view")?.focus({ preventScroll: true });
}

// Draws the menu for the current language and onboarding state.
export function renderMenu({ onboarded }) {
  const menu = menuEl();
  if (!menu) return;
  menu.innerHTML = menuHtml(onboarded);
  menu.setAttribute("aria-label", t("Main menu"));
  if (isOpen()) showAllLetters();
  labelBurger();
}

// Binds once: the header and the menu element live for the page's lifetime.
let bound = false;
export function bindMenu() {
  if (bound) return;
  const burger = el("btn-menu");
  const menu = menuEl();
  const header = el("site-header");
  if (!burger || !menu || !header) return;
  bound = true;
  burger.addEventListener("click", () => (isOpen() ? closeMenu() : openMenu()));
  menu.addEventListener("click", onMenuClick);
  menu.addEventListener("keydown", onKeydown);
  header.addEventListener("keydown", onKeydown);
}
