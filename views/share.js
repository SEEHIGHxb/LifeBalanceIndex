// views/share.js - the sheet that previews the story card and hands it off.
//
// WHAT THIS DELIBERATELY DOES NOT CLAIM: there is no "post to my Instagram
// story" button, because no web page can have one. Meta requires a native app
// with a registered Facebook App ID for the Stories intent and says outright
// that mobile websites cannot use it. So the sheet renders a PNG and offers it
// to navigator.share(), where Instagram is one of the choices. (The line that
// said so left in v182: the owner found it unnecessary.)
//
// EXCLUDED FROM THE COVERAGE GATE, on purpose, with the reason here rather
// than only in package.json where a comment cannot go.
//
// Everything below `openShareSheet` writes an HTML string and then reads its
// own elements back out of the live document (`overlay.querySelectorAll`),
// draws to a real 2D context, and hands a File to navigator.share(). The unit
// suite's stub document has no parser, so the toggles it wrote can never be
// found again; covering this file with unit tests would mean adding happy-dom
// or jsdom, which this project has deliberately never had.
//
// It is NOT untested. tests/e2e.mjs flow 4 drives this sheet in a real browser
// and asserts the strong facts a stub could not: the preview is exactly
// 1080x1920, the exported PNG is over 5KB (a blank canvas still encodes to a
// valid PNG, so the size is the proof it drew something), changing what the
// card shows changes the image data, swapping the cards brings the other one
// forward, and the chosen prefs survive in localStorage.
//
// So the exclusion moves this file to the check that actually covers it. It
// does not stop covering it. If a future change adds pure logic here, test it
// and narrow this exclusion rather than inheriting the exemption.

import { t } from "../i18n.js";
import { openDialog } from "./helpers.js";
import { animate, linear, isReduced } from "../motion.js";
import {
  renderStoryCard, drawStoryCard, storyCardData, DETAIL_LEVELS, STORY_W, STORY_H
} from "../story-card.js";
import { readShapeView, SHAPE_VIEWS, SHAPE_ICONS } from "./shape.js";

// Kept OUT of the app's state schema, in its own key, for the same reason
// `lifequest_lang` is: these are display preferences, not assessment data, so
// they should survive an erase and must not force a schema migration.
const PREFS_KEY = "lifequest_share_prefs";
// How long the preview takes to assemble the map when the sheet opens.
const ASSEMBLE_MS = 1100;

// THE STACK (v182). The owner, 2026-10-03: rather than Light and Dark
// buttons, "make the side swap to the dark card", with "a bit of hint that
// there is dark card". Both cards are drawn; the other one is tucked behind,
// turned, its edge showing. A swipe past SWIPE_SHARE of the card's width, a
// tap on the one behind, the arrow keys or the dots under it swap them.
const THEMES = ["paper", "navy"];
const SWIPE_SHARE = 0.22;
// A press that moves less than this is a tap.
const TAP_PX = 6;
// How far a drag goes before the card behind has fully come forward.
const LIFT_SHARE = 0.6;
// The card behind (css/more.css .share-card:not(.is-front) holds the same).
const BACK = { x: 15, scale: 0.9, turn: 4 };
const DRAG_TURN_DEG = 8;
// The hint: once the poster has assembled, the front card steps aside this
// far, once, to show the one behind.
const NUDGE_SHARE = 0.16;
const NUDGE_DELAY_MS = 600;
const NUDGE_HOLD_MS = 420;
// THE FLIP (v183). The owner, 2026-10-03, picked a card you turn over: a tap
// on the front card (or Enter, or the switch under it) turns it edge-on, and
// it comes round showing the other choice. Half of css/more.css share-flip.
const FLIP_HALF_MS = 170;

// Save is a download arrow, Share the arrow out of a tray, Close a cross.
const ICON_SAVE = `<path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const ICON_SEND = `<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7.5h14V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const ICON_CLOSE = `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`;

// The same two choices label the star on its own page (views/star-page.js).
export const DETAIL_LABELS = () => ({
  full: t("Score"),
  character: t("Character")
});

// The view (star, radar or asterism) is not kept here: it starts from the one
// the page shows, and a change in the sheet is for this card only. Your star's
// own page (views/star-page.js) sets the style and labels here too, so the
// sheet it opens starts from what that page shows. With nothing saved, or a
// choice this version no longer offers, each region shows its score.
export function readSharePrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return {
      theme: saved.theme === "navy" ? "navy" : "paper",
      detail: DETAIL_LEVELS.includes(saved.detail) ? saved.detail : "full",
      shape: readShapeView()
    };
  } catch {
    return { theme: "paper", detail: "full", shape: readShapeView() };
  }
}

export function writeSharePrefs({ theme, detail }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme, detail }));
  } catch {
    // A full or blocked storage quota must not stop someone sharing.
  }
}

// Feature-detect FILE sharing specifically. navigator.share exists in browsers
// that still reject a files payload, so probing with an actual File is the
// only honest check - otherwise we would render a button that throws.
function canShareFiles() {
  try {
    const probe = new File([new Blob(["p"], { type: "image/png" })], "p.png", { type: "image/png" });
    return !!(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch {
    return false;
  }
}

const fileName = () => `asterism-${new Date().toISOString().slice(0, 10)}.png`;

// `card` is the already-computed dashboard reading; the sheet recomputes
// nothing, so the card can never disagree with the page behind it.
// `showMentalNote` is set by the caller when mental sits in the bottom decile.
export function openShareSheet(card, { showMentalNote = false } = {}) {
  const prefs = readSharePrefs();
  const data = storyCardData(card);
  const shareable = canShareFiles();
  const shapeNames = { star: t("Star"), radar: t("Radar"), asterism: t("Asterism") };
  const themeNames = { paper: t("Light"), navy: t("Dark") };

  // Each view as its symbol (views/shape.js), its name the button's name.
  const shapeButton = (view, active) =>
    `<button type="button" class="share-toggle share-shape" data-group="shape" data-value="${view}" aria-pressed="${active}" aria-label="${shapeNames[view]}" title="${shapeNames[view]}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SHAPE_ICONS[view]}</svg></button>`;
  const stackCard = (theme) =>
    `<div class="share-card${theme === prefs.theme ? " is-front" : ""}" data-theme="${theme}">` +
    `<canvas${theme === "paper" ? ' id="share-preview"' : ""} class="share-preview" data-theme="${theme}" width="${STORY_W}" height="${STORY_H}" role="img" aria-label="${t("Preview of your shareable card")}: ${themeNames[theme]}"></canvas>` +
    `<span class="share-flip-hint" aria-hidden="true">↻ ${t("Tap to flip")}</span></div>`;
  const action = (id, label, icon, kind) =>
    `<button type="button" class="share-act ${kind}" id="${id}" aria-label="${label}"><span class="share-act-label">${label}</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg></button>`;

  // The poster sheet (R5; docs/prototype/redesign/social.js shareHTML): the
  // poster with its own switches on the left, the shape and the two ways out
  // on the right. On a phone it all fits one screen (css/more.css).
  const { overlay, close } = openDialog({
    label: t("Share your star"),
    html: `
    <div class="share-sheet">
      <button type="button" class="share-x" id="share-close" aria-label="${t("Close")}" title="${t("Close")}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_CLOSE}</svg></button>
      <div class="share-stage">
        <div class="share-stack" data-detail="${prefs.detail}" tabindex="0" role="group" aria-label="${t("Card style")}" aria-describedby="share-flip-help">
          ${THEMES.map(stackCard).join("")}
        </div>
        <span class="sr-only" id="share-flip-help">${t("Tap to flip")}</span>
        <span class="share-dots" role="group" aria-label="${t("Card style")}">
          ${THEMES.map(theme => `<button type="button" class="share-style" data-value="${theme}" aria-pressed="${prefs.theme === theme}" aria-label="${themeNames[theme]}" title="${themeNames[theme]}"><i aria-hidden="true"></i></button>`).join("")}
        </span>
      </div>
      <div class="share-side">
        <h2 class="share-title">${t("Share your star")}</h2>
        <div class="share-option" role="group" aria-labelledby="share-shape-label">
          <span class="sr-only" id="share-shape-label">${t("Shape")}</span>
          <span class="share-set">
            ${SHAPE_VIEWS.map(v => shapeButton(v, prefs.shape === v)).join("")}
          </span>
        </div>

        ${showMentalNote ? `<p class="share-care">${t("This card shows your mental wellbeing alongside the other seven aspects. Choosing “Character” shows a character in place of each score where you have one.")}</p>` : ""}

        <div class="share-actions">
          ${action("share-save", t("Save image"), ICON_SAVE, "is-save")}
          ${shareable ? action("share-send", t("Share"), ICON_SEND, "is-send") : ""}
        </div>
      </div>
    </div>`
  });

  const stack = overlay.querySelector(".share-stack");
  const cards = [...stack.querySelectorAll(".share-card")];
  const canvasOf = (theme) => stack.querySelector(`canvas[data-theme="${theme}"]`);
  const contexts = Object.fromEntries(THEMES.map(theme => [theme, canvasOf(theme).getContext("2d")]));
  const paintCard = (theme, grow = 1) => drawStoryCard(contexts[theme], data, { ...prefs, theme, grow });
  const behind = () => THEMES.find(theme => theme !== prefs.theme);
  let blob = null;
  let objectUrl = null;

  // The blob is refreshed EAGERLY on open and on every change, never inside
  // the Share click handler. On iOS, navigator.share() must be reached from
  // the user gesture, and awaiting canvas.toBlob() inside the handler breaks
  // that chain - the sheet then simply never opens, with no error. Keeping a
  // ready blob means the handler can call share() straight away. It is drawn
  // whole on its own canvas (renderStoryCard, which also waits for the
  // fonts), so a preview still assembling can never be what gets saved.
  let exports = 0;
  const refreshBlob = async () => {
    exports += 1;
    const mine = exports;
    const fresh = await renderStoryCard(data, { ...prefs });
    if (mine === exports) blob = fresh;
  };

  // The front card ASSEMBLES the poster once as the sheet opens (plan §5):
  // the sticker drops in large and turned and springs flat, then the names
  // arrive (story-card.js stickerPose). A change pressed mid-way stops it and
  // shows the finished card.
  let assembly = null;
  const stopAssembly = () => {
    if (!assembly) return;
    assembly.abort();
    assembly = null;
    THEMES.forEach(theme => paintCard(theme));
  };
  const assemble = () => {
    const run = new AbortController();
    const theme = prefs.theme;
    assembly = run;
    if (!isReduced()) paintCard(theme, 0);
    return animate({
      duration: ASSEMBLE_MS, ease: linear, signal: run.signal, reduced: "end",
      update: (p) => {
        // Closed mid-way: nothing left to draw on.
        if (!stack.isConnected) { run.abort(); return; }
        paintCard(theme, p);
      }
    }).then(done => {
      if (assembly === run) assembly = null;
      return done;
    });
  };

  let changes = 0;
  const redraw = () => {
    changes += 1;
    stopAssembly();
    THEMES.forEach(theme => paintCard(theme));
    refreshBlob();
  };

  // --- the stack -----------------------------------------------------------
  // `dx` is how far the front card has been dragged; 0 lets the stylesheet
  // hold both cards where they rest.
  const layout = (dx = 0) => {
    const w = stack.clientWidth || 1;
    const lift = Math.min(1, Math.abs(dx) / (w * LIFT_SHARE));
    cards.forEach(el => {
      const front = el.dataset.theme === prefs.theme;
      el.classList.toggle("is-front", front);
      if (!dx) el.style.transform = "";
      else if (front) el.style.transform = `translateX(${dx}px) rotate(${(dx / w) * DRAG_TURN_DEG}deg)`;
      else el.style.transform = `translateX(${BACK.x * (1 - lift)}%) scale(${BACK.scale + (1 - BACK.scale) * lift}) rotate(${BACK.turn * (1 - lift)}deg)`;
    });
    overlay.querySelectorAll(".share-style").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === prefs.theme)));
  };

  const choose = (theme) => {
    if (theme !== prefs.theme) {
      stopAssembly();
      prefs.theme = theme;
      writeSharePrefs(prefs);
      refreshBlob();
    }
    layout(0);
  };

  let drag = null;
  stack.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const el = e.target.closest(".share-card");
    if (!el) return;
    drag = { x: e.clientX, dx: 0, theme: el.dataset.theme, moved: false };
    stack.setPointerCapture?.(e.pointerId);
    stack.classList.add("is-dragging");
  });
  stack.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    if (Math.abs(drag.dx) > TAP_PX) drag.moved = true;
    if (drag.moved) layout(drag.dx);
  });
  const release = () => {
    if (!drag) return;
    const { dx, moved, theme } = drag;
    drag = null;
    stack.classList.remove("is-dragging");
    // A tap on the front card turns it over; on the one behind, brings it forward.
    if (!moved) return theme === prefs.theme ? flip() : choose(theme);
    if (Math.abs(dx) > stack.clientWidth * SWIPE_SHARE) return choose(behind());
    layout(0);
  };
  stack.addEventListener("pointerup", release);
  stack.addEventListener("pointercancel", release);
  stack.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flip();
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    choose(behind());
  });
  overlay.querySelectorAll(".share-style").forEach(btn => {
    btn.addEventListener("click", () => choose(btn.dataset.value));
  });

  const nudge = () => {
    if (isReduced() || drag || !stack.isConnected) return;
    layout(-stack.clientWidth * NUDGE_SHARE);
    setTimeout(() => { if (!drag && stack.isConnected) layout(0); }, NUDGE_HOLD_MS);
  };

  // First paint waits for the fonts; without them the opening frame draws in
  // a fallback face. If something was changed while waiting, redraw() has
  // already drawn the finished cards: leave them be.
  refreshBlob();
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    if (changes > 0 || !stack.isConnected) return;
    paintCard(behind());
    assemble().then(done => {
      if (done && changes === 0) setTimeout(nudge, NUDGE_DELAY_MS);
    });
  });

  // The shape and what each region shows.
  const pick = (group, value) => {
    prefs[group] = value;
    writeSharePrefs(prefs);
    overlay.querySelectorAll(`.share-toggle[data-group="${group}"]`).forEach(other => {
      other.setAttribute("aria-pressed", String(other.dataset.value === value));
    });
  };

  // Turning the card over: edge-on at the half, drawn with the other choice,
  // then round again. Without motion it simply redraws.
  let flipTimer = 0;
  function flip(detail = prefs.detail === "full" ? "character" : "full") {
    if (detail === prefs.detail) return;
    pick("detail", detail);
    stack.dataset.detail = detail;
    if (isReduced()) return redraw();
    changes += 1;
    stopAssembly();
    refreshBlob();
    const front = canvasOf(prefs.theme);
    front.classList.remove("is-flipping");
    void front.offsetWidth;
    front.classList.add("is-flipping");
    clearTimeout(flipTimer);
    flipTimer = setTimeout(() => THEMES.forEach(theme => paintCard(theme)), FLIP_HALF_MS);
  }

  overlay.querySelectorAll(".share-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const { group, value } = btn.dataset;
      if (prefs[group] === value) return;
      pick(group, value);
      redraw();
    });
  });

  overlay.querySelector("#share-send")?.addEventListener("click", async () => {
    if (!blob) return;
    const file = new File([blob], fileName(), { type: "image/png" });
    try {
      await navigator.share({ files: [file] });
    } catch {
      // AbortError is the user dismissing the share sheet - not a failure,
      // and nothing should be said about it.
    }
  });

  overlay.querySelector("#share-save")?.addEventListener("click", () => {
    if (!blob) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName();
    link.click();
  });

  const dismiss = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    close();
  };
  overlay.querySelector("#share-close")?.addEventListener("click", dismiss);

  return { overlay, close: dismiss };
}
