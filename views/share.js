// views/share.js - the sheet that previews the story card and hands it off.
//
// WHAT THIS DELIBERATELY DOES NOT CLAIM: there is no "post to my Instagram
// story" button, because no web page can have one. Meta requires a native app
// with a registered Facebook App ID for the Stories intent and says outright
// that mobile websites cannot use it. So the sheet renders a PNG, offers it to
// navigator.share(), and says in one line that Instagram has to be picked from
// the system share sheet. Promising the one-tap would just fail silently on
// the user's phone.
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
// valid PNG, so the size is the proof it drew something), changing either
// toggle changes the image data, and the chosen prefs survive in localStorage.
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

// Kept OUT of the app's state schema, in its own key, for the same reason
// `lifequest_lang` is: these are display preferences, not assessment data, so
// they should survive an erase and must not force a schema migration.
const PREFS_KEY = "lifequest_share_prefs";
// How long the preview takes to assemble the map when the sheet opens.
const ASSEMBLE_MS = 1100;

const DETAIL_LABELS = () => ({
  shape: t("Shape only"),
  names: t("Aspect names"),
  full: t("Everything")
});

function readPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return {
      theme: saved.theme === "navy" ? "navy" : "paper",
      detail: DETAIL_LEVELS.includes(saved.detail) ? saved.detail : "shape"
    };
  } catch {
    return { theme: "paper", detail: "shape" };
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
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

const fileName = () => `life-balance-index-${new Date().toISOString().slice(0, 10)}.png`;

// `card` is the already-computed dashboard reading; the sheet recomputes
// nothing, so the card can never disagree with the page behind it.
// `showMentalNote` is set by the caller when mental sits in the bottom decile.
export function openShareSheet(card, { showMentalNote = false } = {}) {
  const prefs = readPrefs();
  const data = storyCardData(card);
  const shareable = canShareFiles();
  const labels = DETAIL_LABELS();

  const toggle = (group, value, label, active) =>
    `<button type="button" class="pill pill-light share-toggle" data-group="${group}" data-value="${value}" aria-pressed="${active}">${label}</button>`;

  // The poster sheet (R5; docs/prototype/redesign/social.js shareHTML): the
  // choices beside, the poster itself on the right. On a phone the poster
  // comes first and the choices follow it.
  const { overlay, close } = openDialog({
    label: t("Share your radar"),
    html: `
    <div class="share-sheet">
      <div class="share-stage">
        <canvas id="share-preview" class="share-preview" width="${STORY_W}" height="${STORY_H}"
          role="img" aria-label="${t("Preview of your shareable card")}"></canvas>
      </div>
      <div class="share-side">
        <h2 class="share-title">${t("Share your radar")}</h2>
        <div class="share-option" role="group" aria-labelledby="share-style-label">
          <span class="share-option-label" id="share-style-label">${t("Card style")}</span>
          <span class="share-set">
            ${toggle("theme", "paper", t("Light"), prefs.theme === "paper")}
            ${toggle("theme", "navy", t("Dark"), prefs.theme === "navy")}
          </span>
        </div>
        <div class="share-option" role="group" aria-labelledby="share-show-label">
          <span class="share-option-label" id="share-show-label">${t("What to show")}</span>
          <span class="share-set">
            ${DETAIL_LEVELS.map(level =>
              toggle("detail", level, labels[level], prefs.detail === level)).join("")}
          </span>
        </div>

        ${showMentalNote ? `<p class="share-care">${t("This card shows your mental wellbeing alongside the other seven aspects. Choosing “Shape only” keeps the numbers off it.")}</p>` : ""}

        <p class="share-note">${t("Instagram cannot accept a post directly from a website. Pick Instagram in the share sheet, or save the image and post it from the app.")}</p>

        <div class="share-actions">
          ${shareable ? `<button type="button" class="pill" id="share-send">${t("Share")}</button>` : ""}
          <button type="button" class="pill" id="share-save">${t("Save image")}</button>
          <button type="button" class="pill pill-light" id="share-close">${t("Close")}</button>
        </div>
      </div>
    </div>`
  });

  const canvas = overlay.querySelector("#share-preview");
  const ctx = canvas.getContext("2d");
  let blob = null;
  let objectUrl = null;

  // The blob is refreshed EAGERLY on open and on every toggle, never inside
  // the Share click handler. On iOS, navigator.share() must be reached from
  // the user gesture, and awaiting canvas.toBlob() inside the handler breaks
  // that chain - the sheet then simply never opens, with no error. Keeping a
  // ready blob means the handler can call share() straight away.
  // The preview ASSEMBLES the poster once as the sheet opens (plan §5): the
  // sticker drops in large and turned and springs flat, then the names arrive
  // (story-card.js stickerPose). Only the preview moves. The exported image is drawn whole, on its own canvas, and a
  // toggle pressed mid-way stops the assembly and shows the finished card.
  let assembly = null;
  const stopAssembly = () => { assembly?.abort(); assembly = null; };
  const assemble = () => {
    stopAssembly();
    const run = new AbortController();
    assembly = run;
    if (!isReduced()) drawStoryCard(ctx, data, { ...prefs, grow: 0 });
    animate({
      duration: ASSEMBLE_MS, ease: linear, signal: run.signal, reduced: "end",
      update: (p) => {
        // Closed mid-way: nothing left to draw on.
        if (!canvas.isConnected) { run.abort(); return; }
        drawStoryCard(ctx, data, { ...prefs, grow: p });
      }
    });
  };

  let redraws = 0;
  const redraw = async () => {
    redraws += 1;
    stopAssembly();
    drawStoryCard(ctx, data, prefs);
    blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  };

  // First paint waits for document.fonts.ready (inside renderStoryCard);
  // without it the opening frame draws in a fallback face. If a toggle was
  // pressed while waiting (even one pressed and then pressed back), redraw()
  // has already drawn and exported the finished card: leave it be.
  renderStoryCard(data, { ...prefs }).then(first => {
    if (redraws > 0) return;
    blob = first;
    assemble();
  });

  overlay.querySelectorAll(".share-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const { group, value } = btn.dataset;
      if (prefs[group] === value) return;
      prefs[group] = value;
      writePrefs(prefs);
      overlay.querySelectorAll(`.share-toggle[data-group="${group}"]`).forEach(other => {
        other.setAttribute("aria-pressed", String(other.dataset.value === value));
      });
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
