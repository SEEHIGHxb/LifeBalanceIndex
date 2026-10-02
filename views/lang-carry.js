// views/lang-carry.js - keeps a half-filled screen intact across a language
// switch.
//
// The header's language button re-renders the whole app, because every string
// is translated as it is drawn. A re-render rebuilds each form from saved
// state, so before this anything typed but not yet saved went with the old
// language: the Weekly Review went back to its first screen with last week's
// numbers, the Profile page dropped its unsaved edits, and the journey landed
// on whichever screen it had last saved a draft on rather than the one being
// read. Reading a question in the other language is a reason to press the
// button mid-form, so the form has to survive it.
//
// HOW. withCarriedScreen() snapshots every control under the root, runs the
// re-render, then writes back whatever the fresh render shows differently,
// firing the same `input` and `change` events a person typing would. That is
// deliberate: each view's own listeners (autosave, the couples-only block, the
// reveal rhythm, error clearing) then react exactly as they would have to the
// typing, so no view needs a second code path for a restore.
//
// Where a form walks through screens, the screen is the one thing the controls
// cannot say. Such a form marks the screen it shows as `data-step` on the
// <form>, and reads it back with carriedStep() while it renders.
//
// In memory only, and gone the moment the re-render ends: a draft that should
// outlive a reload is draft.js's job, and some of these forms (the Review) are deliberately never written to storage.

let carried = null;

const isToggle = (el) => el.type === "radio" || el.type === "checkbox";
const SKIPPED_TYPES = new Set(["file", "button", "submit", "reset", "hidden", "image"]);

// A control's identity across two renders: radios by group and value, since a
// group's buttons share a name and differ by value; everything else by id.
function keyOf(el) {
  if (el.type === "radio") return el.name ? `radio:${el.name}=${el.value}` : null;
  return el.id ? `id:${el.id}` : null;
}

export function captureScreen(root) {
  const controls = new Map();
  const steps = {};
  if (!root || typeof root.querySelectorAll !== "function") return { controls, steps, scrollY: 0 };
  for (const el of root.querySelectorAll("input, select, textarea")) {
    if (SKIPPED_TYPES.has(el.type)) continue;
    const key = keyOf(el);
    if (key) controls.set(key, isToggle(el) ? !!el.checked : el.value);
  }
  for (const form of root.querySelectorAll("form[id]")) {
    const step = Number.parseInt(form.dataset?.step, 10);
    if (Number.isInteger(step)) steps[form.id] = step;
  }
  const scrollY = typeof window !== "undefined" ? window.scrollY || 0 : 0;
  return { controls, steps, scrollY };
}

// Writes back what the fresh render shows differently. Returns the number of
// controls restored, for tests. A control the new render no longer has (a
// block that is conditional, say) is skipped: nothing can hold its value.
export function restoreScreen(root, snapshot) {
  if (!root || !snapshot || typeof root.querySelectorAll !== "function") return 0;
  let restored = 0;
  for (const el of root.querySelectorAll("input, select, textarea")) {
    if (SKIPPED_TYPES.has(el.type)) continue;
    const key = keyOf(el);
    if (!key || !snapshot.controls.has(key)) continue;
    const was = snapshot.controls.get(key);
    if (isToggle(el)) {
      if (!!el.checked === was) continue;
      el.checked = was;
    } else {
      if (el.value === was) continue;
      el.value = was;
    }
    restored++;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return restored;
}

// True only while a language switch is re-rendering. Views use it to keep
// quiet about restores the reader did not ask for ("picked up where you left
// off" is news after a reload, not after pressing a language button).
export function isCarrying() {
  return carried !== null;
}

// The screen `formId` was on before the switch, or null.
export function carriedStep(formId) {
  const step = carried?.steps?.[formId];
  return Number.isInteger(step) ? step : null;
}

// --- the place on the page ---------------------------------------------------
//
// v176, the owner: the page moved the reader somewhere else when the language
// changed, because Thai and English lines run to different lengths and the
// old scroll distance then points at other words. So the place is kept as the
// element under the top of the screen, found again in the new render by its
// position in the tree (both languages draw the same markup), and how far
// down it the screen's top was. The page scrolls until that point is back
// under the header.

// How far below the header the reading line sits.
const ANCHOR_INSET_PX = 12;

// The element's child-index path from `root`, or null when it is not inside.
export function pathTo(root, el) {
  const path = [];
  for (let node = el; node && node !== root; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
  }
  return path;
}

// The element at `path` under `root`, or the deepest one still there when the
// new render has fewer children somewhere along it.
export function nodeAt(root, path) {
  let node = root;
  for (const i of path) {
    const next = node.children?.[i];
    if (!next) break;
    node = next;
  }
  return node;
}

const readingLine = () => {
  const header = document.getElementById("site-header");
  return Math.max(0, header ? header.getBoundingClientRect().bottom : 0) + ANCHOR_INSET_PX;
};

export function captureAnchor(root) {
  if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") return null;
  if (!root || (window.scrollY || 0) < 1) return null;
  const y = readingLine();
  const box = root.getBoundingClientRect();
  // Near the left edge first: the middle can fall in the gap between columns.
  for (const x of [box.left + 24, box.left + box.width / 2]) {
    const el = document.elementFromPoint(x, y);
    if (!el || el === root || !root.contains(el)) continue;
    const path = pathTo(root, el);
    if (!path) continue;
    const r = el.getBoundingClientRect();
    const fraction = r.height ? Math.min(1, Math.max(0, (y - r.top) / r.height)) : 0;
    return { path, y, fraction };
  }
  return null;
}

// Scrolls so the anchored point is back on the reading line. Returns where it
// scrolled to.
export function restoreAnchor(root, anchor) {
  const el = nodeAt(root, anchor.path);
  if (!el || el === root) return null;
  const r = el.getBoundingClientRect();
  window.scrollBy({ top: r.top + anchor.fraction * r.height - anchor.y, behavior: "instant" });
  return window.scrollY;
}

// The Thai font's glyphs can arrive after the switch and reflow the page
// again, so the place is set once more when they are in, unless the reader
// has scrolled since.
function settleAnchor(root, anchor, at) {
  const fonts = document.fonts?.ready;
  if (!fonts || at === null) return;
  fonts.then(() => {
    if (Math.abs(window.scrollY - at) > 2) return;
    restoreAnchor(root, anchor);
  }).catch(() => {});
}

export function withCarriedScreen(root, rerender) {
  const snapshot = captureScreen(root);
  const anchor = captureAnchor(root);
  carried = snapshot;
  try {
    rerender();
  } finally {
    carried = null;
  }
  const restored = restoreScreen(root, snapshot);
  if (typeof window === "undefined" || typeof window.scrollTo !== "function") return restored;
  // Without an anchor (the top of the page, or no layout to read), the old
  // distance: near the same place, and a stepped form's own scroll to its top
  // does not leave the reader at the head of a long screen.
  window.scrollTo({ top: snapshot.scrollY, behavior: "instant" });
  if (anchor) settleAnchor(root, anchor, restoreAnchor(root, anchor));
  return restored;
}
