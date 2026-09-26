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
// outlive a reload is draft.js's job, and some of these forms (the Review, the
// runway) are deliberately never written to storage.

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

export function withCarriedScreen(root, rerender) {
  const snapshot = captureScreen(root);
  carried = snapshot;
  try {
    rerender();
  } finally {
    carried = null;
  }
  const restored = restoreScreen(root, snapshot);
  // The page lengthens or shortens with the language, so this lands near the
  // same place rather than exactly on it; without it a stepped form's own
  // scroll to its top would leave the reader at the head of a long screen.
  if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
    window.scrollTo({ top: snapshot.scrollY, behavior: "instant" });
  }
  return restored;
}
