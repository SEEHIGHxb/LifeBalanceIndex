// draft.js - keeps a half-finished form alive across a reload.
//
// THE FAILURE THIS EXISTS TO FIX. Onboarding asks 64 radio groups plus a dozen
// numeric fields. Until now a reload, a back-swipe, or a phone call that killed
// the tab took every one of them and dropped the user back on question 1. The
// answers were never anywhere but the DOM.
//
// Kept OUT of the app's state schema, in its own keys, for the same reason
// `lifequest_share_prefs` and `lifequest_lang` are: a draft is not assessment
// data. It has not been validated, it has not been scored, and it must never
// migrate. It is a scratch copy of what is currently on screen.
//
// There is no in-app erase; the documented path is clearing site data, which
// takes these keys with it. Nothing here outlives that.

import { APP_VERSION } from "./version.js";

const PREFIX = "lifequest_draft_";

// A draft older than this is not offered. Someone returning after a week is
// starting again, not resuming, and a week-old half-answered mood scale is a
// worse input than the question asked fresh.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (name) => `${PREFIX}${name}`;

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    // Storage can throw on access alone in a locked-down browser context.
    return null;
  }
}

const escapeSelector = (value) =>
  (globalThis.CSS && typeof CSS.escape === "function") ? CSS.escape(value) : value;

// Read every control the form owns. Radios and checkboxes are keyed by `name`
// and recorded only when checked -- that matches how the form is read back
// (collectInstrument reads `[name="who5-q0"]:checked`), so the draft and the
// submit path agree on what an answer is. Everything else is keyed by `id`.
//
// Controls with neither a name nor an id are skipped: nothing can restore them
// and nothing reads them.
export function serializeForm(formEl) {
  const named = {};
  const ids = {};
  const controls = formEl.querySelectorAll("input, select, textarea");

  for (const el of controls) {
    const type = (el.type || "").toLowerCase();
    if (type === "radio" || type === "checkbox") {
      if (el.checked && el.name) named[el.name] = el.value;
    } else if (el.id && el.value !== "") {
      ids[el.id] = el.value;
    }
  }
  return { named, ids };
}

// Write the current state of `formEl`. `extra` carries anything the caller
// needs back on restore -- onboarding passes the step index so the user lands
// on the page they left rather than at the start.
export function saveDraft(name, formEl, extra = {}) {
  const store = storage();
  if (!store) return false;
  try {
    const { named, ids } = serializeForm(formEl);
    // Nothing answered yet is not a draft. Writing one would mean offering to
    // restore an empty form, which reads as a bug.
    if (Object.keys(named).length === 0 && Object.keys(ids).length === 0) {
      store.removeItem(keyFor(name));
      return false;
    }
    store.setItem(keyFor(name), JSON.stringify({
      v: APP_VERSION,
      at: new Date().toISOString(),
      named,
      ids,
      ...extra
    }));
    return true;
  } catch {
    // A full or blocked quota must never stop someone filling the form in.
    return false;
  }
}

// Returns the stored draft, or null when there is nothing usable.
//
// DISCARDS RATHER THAN REPAIRS, in three cases, because a partly-applicable
// draft is worse than none:
//
//   1. A DIFFERENT APP VERSION. Instruments get added between releases -- v73
//      added CIT Learning to onboarding. Restoring a v72 draft into the v73
//      form would fill everything except the new block, and the user would be
//      looking at a form that appears finished and is not.
//   2. TOO OLD. See MAX_AGE_MS.
//   3. UNPARSEABLE. Hand-edited or truncated storage.
export function readDraft(name) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(keyFor(name));
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object") return null;
    if (draft.v !== APP_VERSION) return null;

    const age = Date.now() - new Date(draft.at).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return null;

    if (!draft.named || !draft.ids) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(name) {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(keyFor(name));
  } catch {
    // Nothing to do and nothing worth saying.
  }
}

// Put a draft back into a live form.
//
// RETURNS WHAT IT RESTORED, and callers must use it. Onboarding tracks which
// fields and instruments the user touched by listening for `change` events, and
// setting `.checked` from script fires none. Without the returned sets those
// answers would be on screen but recorded as never answered, and the coverage
// tier shown on the aspect pages would call a fully answered assessment
// "estimated". Restoring the values without restoring that bookkeeping is the
// bug this return value exists to prevent.
//
// A control named in the draft but absent from the form is skipped silently:
// the version guard in readDraft already rejects cross-version drafts, so the
// only way here is a conditional block that is legitimately hidden right now
// (the RAS instrument for a single user).
export function applyDraft(name, formEl) {
  const draft = readDraft(name);
  if (!draft) return null;

  const restoredNames = new Set();
  const restoredIds = new Set();

  for (const [inputName, value] of Object.entries(draft.named)) {
    const el = formEl.querySelector(
      `[name="${escapeSelector(inputName)}"][value="${escapeSelector(value)}"]`
    );
    if (el) {
      el.checked = true;
      restoredNames.add(inputName);
    }
  }

  for (const [id, value] of Object.entries(draft.ids)) {
    const el = formEl.querySelector(`#${escapeSelector(id)}`);
    if (el) {
      el.value = value;
      restoredIds.add(id);
    }
  }

  if (restoredNames.size === 0 && restoredIds.size === 0) return null;

  return { restoredNames, restoredIds, savedAt: draft.at, step: draft.step };
}

// The instrument keys a restore touched, derived from control names of the form
// `who5-q0`. Onboarding and the check-in both seed their `touchedInstruments`
// set from this.
export function instrumentsIn(restoredNames) {
  const keys = new Set();
  for (const inputName of restoredNames) {
    const match = String(inputName).match(/^([a-z0-9]+)-q\d+$/i);
    if (match) keys.add(match[1]);
  }
  return keys;
}
