// views/star-page.js - your star on a page of its own (#/star, v135).
//
// The owner, 2026-09-28: a tap on the star on Overview should zoom into "the
// page the contain the star mainly", where the reader can switch what the
// share window switches, with "Share your star" there too; around the star,
// region names rather than aspect names, and the choice of a score, your
// character, both, or names alone.
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
import { markZoom, takeZoom, zoomFrom } from "./star-zoom.js";
import { escapeHtml } from "./helpers.js";

const THEMES = ["paper", "navy"];
// Where the labels sit, in % of the figure from its centre: just past the
// star's rim (the mark is inset 17% each side, the rim at 47/50 of it).
const LABEL_R = 37;
// A label whose direction leans this far sideways reads from its point out.
const SIDEWAYS = 0.3;

const optButton = (group, value, label, active) =>
  `<button type="button" class="sp-opt" data-group="${group}" data-value="${value}" aria-pressed="${active}">${escapeHtml(label)}</button>`;

function optGroup(group, labelText, options, current) {
  const id = `sp-${group}-label`;
  return `<div class="sp-control">
      <span class="sp-control-label" id="${id}">${escapeHtml(labelText)}</span>
      <div class="shape-switch sp-group" role="group" aria-labelledby="${id}">
        ${options.map(([value, label]) => optButton(group, value, label, value === current)).join("")}
      </div>
    </div>`;
}

// One label per region, placed on its ray's direction, reading outward.
export function starLabelsMarkup(state, detail) {
  if (detail === "shape") return "";
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
      `<span class="sp-region">${escapeHtml(c.region)}</span>` +
      (value ? ` <span class="sp-value">${escapeHtml(value)}</span>` : "") +
      `</li>`;
  }).join("");
}

export function starPageMarkup(h, prefs) {
  const labels = DETAIL_LABELS();
  return `
    <div class="stage-page star-page" data-theme="${prefs.theme}">
      <section class="panel sp-stage">
        <div class="wrap sp-wrap">
          <p class="sp-top sp-fade"><a class="pill pill-light sp-back" href="#/dashboard">← ${escapeHtml(t("Overview"))}</a></p>
          <h1 class="sp-title sp-fade">${escapeHtml(t("Your star"))}<small>${escapeHtml(h.profile.name || "")}</small></h1>
          <div class="sp-figure">
            <div class="sp-mark">${shapeFigure({ view: h.view, you: h.scores })}</div>
            <ol class="sp-labels sp-fade" aria-label="${escapeHtml(t("Your eight regions"))}">${starLabelsMarkup(h.state, prefs.detail)}</ol>
          </div>
          <p class="sp-index sp-fade"><span>${escapeHtml(t("Balance Index"))}</span> <b>${escapeHtml(h.index)}</b> <span class="balance-band band-${h.band.key}">${escapeHtml(t(h.band.label))}</span></p>
          <div class="sp-controls sp-fade">
            <div class="sp-control">
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

export function renderStarPage(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const h = readHome(state);
  const prefs = readSharePrefs();
  const zoom = takeZoom();
  globalThis.scrollTo?.(0, 0);
  // Beside the care notice this page is as still as Home is.
  const scope = renderStagePage(container, () => starPageMarkup(h, prefs), { still: !!h.careNotice });
  const mark = container.querySelector(".sp-mark");
  adoptShape(mark?.querySelector("svg.shape"), { view: h.view, you: h.scores });
  bindShapeSwitch(container, scope);
  bindOptions(container, state, prefs);
  container.querySelector("#sp-share")?.addEventListener("click", () => shareStar(readHome(state)));
  if (!scope || !mark) return;
  scope.listen(container.querySelector(".sp-back"), "click", () => markZoom(mark));
  zoomFrom(mark, zoom, scope, [...container.querySelectorAll(".sp-fade")]);
}
