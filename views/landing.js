// views/landing.js - the Landing: the first screen for anyone who has not
// taken the journey yet, and where the ASTERISM wordmark leads everyone else
// (redesign R2; docs/prototype/redesign/proto.js landingHTML).
//
// Top to bottom: the hero (the gilt star over ASTERISM), WHY with its
// typed headline, HOW IT WORKS, the eight regions as cards, a photo band and
// the call to begin. The regions (the owner, v151): one card each, which pin
// and stack like the pages of a travel journal, beside a rail of their
// emblems that marks where you are and jumps to any of them. The sections and their motion are the shared stage page
// (views/stage-page.js); this file is the Landing's copy and its cards.

import { CHAPTERS } from "./journey.js";
import { ASPECT_META } from "../aspects.js";
import { SPRITES } from "./stage.js";
import { heroMarkup, missionMarkup, bandMarkup, label, renderStagePage } from "./stage-page.js";
import { escapeHtml } from "./helpers.js";
import { t } from "../i18n.js";
import { isReduced } from "../motion.js";

const BAND_REGIONS = [0, 1, 7];

// One card per region: the photograph on top, the emblem overlapping its
// corner, and the name, aspect and line underneath on one grid. `--i` sets
// how far down each card pins, so the ones beneath peek out like pages.
function cardMarkup(chapter, i) {
  return `
    <article class="region-card" id="region-${i}" tabindex="-1" aria-labelledby="region-${i}-name"
      style="--i: ${i}; --wash: ${chapter.wash}; --hue: ${chapter.hue};">
      <div class="rc-photo"><img src="./assets/regions/${chapter.art}.jpg" alt="" loading="lazy" decoding="async"></div>
      <div class="rc-info">
        <img class="rc-emblem" src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async">
        <div class="rc-name">
          <h3 class="card-title" id="region-${i}-name">${escapeHtml(chapter.region)}</h3>
          <span class="tag">${escapeHtml(t(ASPECT_META[chapter.aspect].label))}</span>
        </div>
        <p class="card-desc">${escapeHtml(chapter.theme)}</p>
      </div>
    </article>`;
}

// The rail: one emblem per region, the one you are in lit in its hue.
function railMarkup() {
  return `
    <nav class="region-rail" aria-label="${escapeHtml(t("The eight aspects"))}">
      <ol>${CHAPTERS.map((c, i) => {
        const name = `${c.region} · ${t(ASPECT_META[c.aspect].label)}`;
        return `
        <li><button type="button" class="rail-stop" data-region="${i}" style="--hue: ${c.hue};" aria-label="${escapeHtml(name)}" title="${escapeHtml(name)}"${i ? "" : ' aria-current="true"'}>
          <img src="./assets/emblems/${c.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async">
        </button></li>`;
      }).join("")}
      </ol>
    </nav>`;
}

// `returning` is someone who has taken the journey and came back by the
// wordmark (the owner, 2026-09-28): every call leads to their Home instead.
export function landingMarkup({ resume = false, returning = false } = {}) {
  const cta = returning ? t("Open your star") : resume ? t("Continue the journey") : t("Start the journey");
  const go = returning ? "#/dashboard" : "#/journey";
  const how = [
    t("A journey through eight places, from The Market to The Lookout. Each one asks about one part of your life."),
    t("Your answers are compared with cited Thai and international benchmarks."),
    t("Local-first: your answers never leave your device, and there is no account.")
  ];
  return `
    <div class="stage-page landing">
      ${heroMarkup({
        mark: `<svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg>`,
        word: "ASTERISM",
        inc: "LIFE BALANCE INDEX",
        srTitle: "Asterism: Life Balance Index",
        tapLabel: t("Play with the star"),
        // On the first screen (the owner, 2026-09-26): the page's two lower
        // calls to begin were three sections down.
        cta: `<a class="pill pill-xl" href="${go}">${escapeHtml(cta)}</a>`
      })}
      ${missionMarkup(t("Why"), [t("Eight parts of one life,"), t("measured against the evidence.")])}
      <section class="panel statement"><div class="wrap split">
        ${label(t("How it works"))}
        <div>${how.map(p => `<p>${escapeHtml(p)}</p>`).join("")}</div>
      </div></section>
      <section class="projects">
        <div class="inner">
          ${label(t("The eight aspects"))}
          <div class="regions">
            ${railMarkup()}
            <div class="cardblock">
              ${CHAPTERS.map(cardMarkup).join("")}
              <p class="allprojects"><a class="pill pill-xl" href="${go}">${escapeHtml(cta)}</a></p>
            </div>
          </div>
        </div>
      </section>
      ${bandMarkup(BAND_REGIONS)}
      <section class="panel careers"><div class="wrap split">
        ${label(t("Begin"))}
        <div class="careers-row">
          <p class="careers-head">${escapeHtml(t("Eight chapters."))}<br>${escapeHtml(t("One star at the end."))}</p>
          <div class="careers-actions">
            <a class="pill" href="${go}">${escapeHtml(cta)}</a>${returning ? "" : `
            <button type="button" id="btn-restore-backup" class="linkbtn">${escapeHtml(t("Restore from a backup"))}</button>
            <input type="file" id="restore-file-input" accept="application/json,.json" class="d-none" aria-hidden="true" tabindex="-1">`}
          </div>
        </div>
      </div></section>
    </div>`;
}

// Draws the Landing into the container. `resume` names the call to action
// "Continue the journey" when a draft of it is saved on this device.
export function renderLanding(containerId, { resume = false, returning = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  renderStagePage(container, () => landingMarkup({ resume, returning }));
  bindRail(container);
}

// Where a card sits when it is not pinned: the block's top plus every card
// and gap before it. A pinned card's own box reports where it is stuck.
function restingTop(cards, i) {
  let y = cards[0].parentElement.getBoundingClientRect().top + scrollY;
  for (let k = 0; k < i; k++) {
    y += cards[k].offsetHeight + parseFloat(getComputedStyle(cards[k + 1]).marginTop || "0");
  }
  return y;
}

// Lights the region you are in and jumps to the one you pick. Works with
// reduced motion too (the cards then sit in a plain list), so it is bound
// here rather than with the stage page's motion.
export function bindRail(container) {
  const rail = container.querySelector(".region-rail");
  const cards = [...container.querySelectorAll(".region-card")];
  if (!rail || !cards.length) return;
  const stops = [...rail.querySelectorAll(".rail-stop")];
  let current = 0;
  // Eight box reads a scroll: cheap enough to run on each event, and no
  // frame loop to answer to reduced motion for.
  const paint = () => {
    const line = innerHeight * 0.45;
    let at = 0;
    cards.forEach((card, i) => { if (card.getBoundingClientRect().top <= line) at = i; });
    if (at === current) return;
    stops[current]?.removeAttribute("aria-current");
    stops[at]?.setAttribute("aria-current", "true");
    current = at;
  };
  const onScroll = () => {
    if (!rail.isConnected) { removeEventListener("scroll", onScroll); return; }
    paint();
  };
  addEventListener("scroll", onScroll, { passive: true });
  rail.addEventListener("click", (e) => {
    const stop = e.target.closest(".rail-stop");
    if (!stop) return;
    const i = Number(stop.dataset.region);
    const card = cards[i];
    const pin = parseFloat(getComputedStyle(card).top);
    const offset = Number.isFinite(pin) ? pin : 96;
    scrollTo({ top: restingTop(cards, i) - offset, behavior: isReduced() ? "auto" : "smooth" });
    card.focus({ preventScroll: true });
  });
  paint();
}
