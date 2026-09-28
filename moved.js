// moved.js - bringing a reader's answers from the old address (v132).
//
// The app moved from lbi.plainpoint.net to asterism.plainpoint.net (the owner,
// 2026-09-28, option B). Everything a reader has lives in localStorage, and a
// browser keeps that per address, so on the new one a returning reader would
// open an empty app. Both addresses are the same site (plainpoint.net), so the
// browser lets a page here frame a page there with its real storage: the old
// address serves legacy/handoff.html, which reads its lifequest_* keys and
// posts them to this page, and to no other.
//
// It runs once per browser, only on the new address, and only while there is
// nothing here yet. Anything a reader already has here is never overwritten.
export const OLD_ORIGIN = "https://lbi.plainpoint.net";
export const NEW_HOST = "asterism.plainpoint.net";
export const MOVED_KEY = "lifequest_moved_from_lbi";
const MESSAGE_TYPE = "asterism-handoff";
const HANDOFF_WAIT_MS = 10000;
// localStorage holds about 5 MB per address; a bigger payload is not ours.
const MAX_CHARS = 5_000_000;
const KEY_RE = /^(lifequest_|lbi_reduce_motion$)/;

export function shouldBringAnswers(hostname, storage) {
  return hostname === NEW_HOST && !storage.getItem("lifequest_state") && !storage.getItem(MOVED_KEY);
}

// The entries a handoff message may write, or null when it is not one. The
// message comes from our own old page, but it is still checked like any input.
export function handoffEntries(data) {
  if (!data || data.type !== MESSAGE_TYPE || data.v !== 1) return null;
  const items = data.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) return null;
  let size = 0;
  const entries = [];
  for (const [key, value] of Object.entries(items)) {
    if (!KEY_RE.test(key) || key === MOVED_KEY || typeof value !== "string") continue;
    size += key.length + value.length;
    if (size > MAX_CHARS) return null;
    entries.push([key, value]);
  }
  return entries;
}

// Writes the entries unless the reader already began here, and says whether
// the page should reload to show what arrived.
export function writeEntries(entries, storage) {
  const fresh = !storage.getItem("lifequest_state");
  if (fresh) {
    for (const [key, value] of entries) if (storage.getItem(key) === null) storage.setItem(key, value);
  }
  storage.setItem(MOVED_KEY, new Date().toISOString());
  return fresh && entries.some(([key]) => key === "lifequest_state");
}

export function bringAnswers({ doc = document, storage = localStorage, reload = () => location.reload() } = {}) {
  const frame = doc.createElement("iframe");
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.src = `${OLD_ORIGIN}/handoff.html`;
  let timer = 0;

  const finish = () => {
    clearTimeout(timer);
    window.removeEventListener("message", onMessage);
    frame.remove();
  };
  function onMessage(event) {
    if (event.origin !== OLD_ORIGIN || event.source !== frame.contentWindow) return;
    const entries = handoffEntries(event.data);
    if (!entries) return;
    finish();
    try {
      if (writeEntries(entries, storage)) reload();
    } catch (err) {
      console.warn("Could not bring the answers from the old address", err);
    }
  }
  window.addEventListener("message", onMessage);
  // No answer (offline, or the old address is gone): try again next visit.
  timer = setTimeout(finish, HANDOFF_WAIT_MS);
  doc.body.append(frame);
}
