// views/star-page.js - your star on a page of its own (#/star, v135).
//
// The owner, 2026-09-28: a tap on the star on Overview should zoom into "the
// page the contain the star mainly", where the reader can switch what the
// share window switches, with "Share your star" there too; around the star,
// region names rather than aspect names, and the choice of a score, your
// character, both, or names alone. v138 (the owner): the page drops the name
// and the Balance Index, and the labels show a score or a character.
//
// The page's choices are the share window's (views/share.js keeps them), so
// "Share your star" opens that window already set to what this page shows.
// The star arrives by zooming out of Home's (views/star-zoom.js) and goes
// back the same way from the Overview link.
import { t } from "../i18n.js";
import { radarPoints } from "../chart.js";
import { legendValue } from "../story-card.js";
import { readSharePrefs, writeSharePrefs, DETAIL_LABELS } from "./share.js";
import { shapeFigure, shapeSwitchMarkup, bindShapeSwitch, adoptShape } from "./shape.js";
import { readHome, regionLabels, shareStar } from "./dashboard.js";
import { CHAPTERS } from "./journey.js";
import { renderStagePage } from "./stage-page.js";
import { markZoom, takeZoom, enterStar, leaveStar } from "./star-zoom.js";
import { enterRadar, leaveRadar, enterAsterism, leaveAsterism } from "./star-shape-zoom.js";
import { escapeHtml } from "./helpers.js";

// Each view has its own way in and out (the owner, v152): the star's warp,
// the radar folding and opening, the asterism drawn star by star.
const ENTER = { star: enterStar, radar: enterRadar, asterism: enterAsterism };
const LEAVE = { star: leaveStar, radar: leaveRadar, asterism: leaveAsterism };
const shownView = (container) => container.querySelector(".sp-mark svg.shape")?.dataset.view;

const THEMES = ["paper", "navy"];
// Where the labels sit, in % of the figure from its centre: just past the
// star's rim (the mark is inset 17% each side, the rim at 47/50 of it).
const LABEL_R = 37;
// A label whose direction leans this far sideways reads from its point out.
const SIDEWAYS = 0.3;
// The warp the page opens with (views/star-zoom.js): its streaks and the
// rings that ripple out as the star lands.
const STREAKS = 24;
const RINGS = 2;
const WARP_MARKUP = '<i class="sp-streak"></i>'.repeat(STREAKS) + '<i class="sp-ring"></i>'.repeat(RINGS);

const optButton = (group, value, label, active) =>
  `<button type="button" class="sp-opt" data-group="${group}" data-value="${value}" aria-pressed="${active}">${escapeHtml(label)}</button>`;

function optGroup(group, labelText, options, current) {
  const id = `sp-${group}-label`;
  return `<div class="sp-control sp-control-${group} sp-fade">
      <span class="sp-control-label" id="${id}">${escapeHtml(labelText)}</span>
      <div class="shape-switch sp-group" role="group" aria-labelledby="${id}">
        ${options.map(([value, label]) => optButton(group, value, label, value === current)).join("")}
      </div>
    </div>`;
}

// One label per region, placed on its ray's direction, reading outward.
export function starLabelsMarkup(state, detail) {
  const labels = regionLabels(state);
  return CHAPTERS.map((c, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const cos = Math.cos(angle);
    const side = cos > SIDEWAYS ? "r" : cos < -SIDEWAYS ? "l" : Math.sin(angle) < 0 ? "t" : "b";
    const score = radarPoints(state.aspects, [c.aspect], 0, 0, 1)[0].value;
    const value = legendValue(detail, score, labels[c.aspect].character);
    const left = (50 + cos * LABEL_R).toFixed(1);
    const top = (50 + Math.sin(angle) * LABEL_R).toFixed(1);
    return `<li class="sp-label" data-side="${side}" style="left: ${left}%; top: ${top}%; --hue: ${c.hue};">` +
      `<span class="sp-label-in"><span class="sp-region">${escapeHtml(c.region)}</span>` +
      (value ? ` <span class="sp-value">${escapeHtml(value)}</span>` : "") +
      `</span></li>`;
  }).join("");
}

// One screen, no scrolling (the owner, 2026-09-28): the star takes all the
// height the stage has, beside a column of everything else (above and below
// it on a phone). The bloom is the disc of ground the entrance opens with.
export function starPageMarkup(h, prefs) {
  const labels = DETAIL_LABELS();
  return `
    <div class="stage-page star-page" data-theme="${prefs.theme}">
      <section class="panel sp-stage">
        <i class="sp-night" aria-hidden="true"></i>
        <i class="sp-bloom" aria-hidden="true"></i>
        <div class="sp-fx" aria-hidden="true">${WARP_MARKUP}</div>
        <div class="sp-layout">
          <div class="sp-head sp-fade">
            <a class="pill pill-light sp-back" href="#/dashboard">← ${escapeHtml(t("Overview"))}</a>
            <h1 class="sp-title">${escapeHtml(t("Your star"))}</h1>
          </div>
          <div class="sp-figure">
            <div class="sp-square">
              <div class="sp-mark">${shapeFigure({ view: h.view, you: h.scores })}</div>
              <ol class="sp-labels" aria-label="${escapeHtml(t("Your eight regions"))}">${starLabelsMarkup(h.state, prefs.detail)}</ol>
            </div>
          </div>
          <div class="sp-controls">
            <div class="sp-control sp-control-shape sp-fade">
              <span class="sp-control-label">${escapeHtml(t("Shape"))}</span>
              ${shapeSwitchMarkup(h.view)}
            </div>
            ${optGroup("theme", t("Card style"), [["paper", t("Light")], ["navy", t("Dark")]], prefs.theme)}
            ${optGroup("detail", t("What to show"), Object.entries(labels), prefs.detail)}
          </div>
          <p class="sp-share sp-fade"><button type="button" class="pill" id="sp-share">${escapeHtml(t("Share your star"))}</button></p>
        </div>
      </section>
    </div>`;
}

// The style and label switches: saved as the share window's choices, and
// shown here at once.
function bindOptions(container, state, prefs) {
  container.querySelectorAll(".sp-opt").forEach(btn => btn.addEventListener("click", () => {
    const { group, value } = btn.dataset;
    const allowed = group === "theme" ? THEMES : Object.keys(DETAIL_LABELS());
    if (!allowed.includes(value) || prefs[group] === value) return;
    prefs[group] = value;
    writeSharePrefs(prefs);
    container.querySelectorAll(`.sp-opt[data-group="${group}"]`).forEach(other => {
      other.setAttribute("aria-pressed", String(other.dataset.value === value));
    });
    if (group === "theme") container.querySelector(".star-page")?.setAttribute("data-theme", value);
    else container.querySelector(".sp-labels").innerHTML = starLabelsMarkup(state, value);
  }));
}

// The moving parts of the entrance and the exit (views/star-zoom.js).
const motionParts = (container) => ({
  stage: container.querySelector(".sp-stage"),
  night: container.querySelector(".sp-night"),
  bloom: container.querySelector(".sp-bloom"),
  streaks: [...container.querySelectorAll(".sp-streak")],
  rings: [...container.querySelectorAll(".sp-ring")],
  star: container.querySelector(".sp-mark svg.shape"),
  labels: [...container.querySelectorAll(".sp-label-in")],
  fades: [...container.querySelectorAll(".sp-fade")]
});

// Overview flies the star home when this page was reached from there; opened
// by its address, Home settles its star from here instead.
function bindBack(container, note, scope) {
  const back = container.querySelector(".sp-back");
  if (!back) return;
  let leaving = false;
  scope.listen(back, "click", (e) => {
    if (!note) {
      markZoom(container.querySelector(".sp-mark svg.shape"));
      return;
    }
    e.preventDefault();
    if (leaving) return;
    leaving = true;
    (LEAVE[shownView(container)] ?? leaveStar)(note, motionParts(container), scope).finally(() => { location.hash = "#/dashboard"; });
  });
}

export function renderStarPage(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const h = readHome(state);
  const prefs = readSharePrefs();
  const note = takeZoom();
  globalThis.scrollTo?.(0, 0);
  // The warp plays beside the care notice too (the owner, v140).
  const scope = renderStagePage(container, () => starPageMarkup(h, prefs));
  adoptShape(container.querySelector(".sp-mark svg.shape"), { view: h.view, you: h.scores });
  bindShapeSwitch(container, scope);
  bindOptions(container, state, prefs);
  container.querySelector("#sp-share")?.addEventListener("click", () => shareStar(readHome(state)));
  if (!scope) return;
  bindBack(container, note, scope);
  (ENTER[h.view] ?? enterStar)(note, motionParts(container), scope);
}
