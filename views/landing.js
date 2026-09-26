// views/landing.js - the Landing, for anyone who has not taken the journey yet
// (redesign R2; docs/prototype/redesign/proto.js landingHTML).
//
// Top to bottom: the hero (the gilt star over LIFE BALANCE INDEX), WHY with its
// typed headline, HOW IT WORKS, the eight regions as cards, a photo band and
// the call to begin. The sections and their motion are the shared stage page
// (views/stage-page.js); this file is the Landing's copy and its cards.

import { CHAPTERS } from "./journey.js";
import { ASPECT_META } from "../aspects.js";
import { SPRITES } from "./stage.js";
import { heroMarkup, missionMarkup, bandMarkup, label, renderStagePage } from "./stage-page.js";
import { escapeHtml } from "./helpers.js";
import { t } from "../i18n.js";

const BAND_REGIONS = [0, 1, 7];

function cardMarkup(chapter) {
  return `
    <div class="region-card">
      <article class="lcard brand-visual">
        <div class="brand-logo" style="background: ${chapter.wash};"><img src="./assets/emblems/${chapter.art}.webp" alt="" width="224" height="224" loading="lazy" decoding="async"></div>
        <div class="brand-photo"><img src="./assets/regions/${chapter.art}.jpg" alt="" loading="lazy" decoding="async"></div>
      </article>
      <article class="lcard info">
        <h3 class="card-title">${escapeHtml(chapter.region)}</h3>
        <p class="card-desc">${escapeHtml(chapter.theme)}</p>
        <p class="info-links"><span class="tag" style="border-color: ${chapter.hue};">${escapeHtml(t(ASPECT_META[chapter.aspect].label))}</span></p>
      </article>
    </div>`;
}

export function landingMarkup({ resume = false } = {}) {
  const cta = resume ? t("Continue the journey") : t("Start the journey");
  const how = [
    t("A journey through eight places, from The Market to The Lookout. Each one asks about one part of your life."),
    t("Your answers are compared with cited Thai and international benchmarks."),
    t("Local-first: your answers never leave your device, and there is no account.")
  ];
  return `
    <div class="stage-page landing">
      ${heroMarkup({
        mark: `<svg viewBox="0 0 100 100"><use href="${SPRITES}#star"/></svg>`,
        word: "LIFE BALANCE",
        inc: "INDEX",
        srTitle: "Life Balance Index",
        tapLabel: t("Play with the star"),
        // On the first screen (the owner, 2026-09-26): the page's two lower
        // calls to begin were three sections down.
        cta: `<a class="pill pill-xl" href="#/journey">${escapeHtml(cta)}</a>`
      })}
      ${missionMarkup(t("Why"), [t("Eight parts of one life,"), t("measured against the evidence.")])}
      <section class="panel statement"><div class="wrap split">
        ${label(t("How it works"))}
        <div>${how.map(p => `<p>${escapeHtml(p)}</p>`).join("")}</div>
      </div></section>
      <section class="projects">
        <div class="inner">
          ${label(t("The eight aspects"))}
          <div class="cardblock">
            ${CHAPTERS.map(cardMarkup).join("")}
            <p class="allprojects"><a class="pill pill-xl" href="#/journey">${escapeHtml(cta)}</a></p>
          </div>
        </div>
      </section>
      ${bandMarkup(BAND_REGIONS)}
      <section class="panel careers"><div class="wrap split">
        ${label(t("Begin"))}
        <div class="careers-row">
          <p class="careers-head">${escapeHtml(t("Eight chapters."))}<br>${escapeHtml(t("One star at the end."))}</p>
          <div class="careers-actions">
            <a class="pill" href="#/journey">${escapeHtml(cta)}</a>
            <button type="button" id="btn-restore-backup" class="linkbtn">${escapeHtml(t("Restore from a backup"))}</button>
            <input type="file" id="restore-file-input" accept="application/json,.json" class="d-none" aria-hidden="true" tabindex="-1">
          </div>
        </div>
      </div></section>
    </div>`;
}

// Draws the Landing into the container. `resume` names the call to action
// "Continue the journey" when a draft of it is saved on this device.
export function renderLanding(containerId, { resume = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  renderStagePage(container, () => landingMarkup({ resume }));
}
