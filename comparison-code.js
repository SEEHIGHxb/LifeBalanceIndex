// comparison-code.js - Shareable Comparison Codes for real, backend-free peer
// comparison.
//
// A comparison code packs a participant's public snapshot — their name and the
// eight aspect scores — into a compact base64url string with an "LQ1-" prefix.
// Participants exchange codes over chat and paste them into the Peer Comparison
// tab: real people, no backend, works on any static host. Pure module: no DOM.
//
// The board ranks on the Balance Index, which is derived from the aspect scores
// alone — so the code deliberately carries NO age/level and NO points. Age would
// disclose a fact the participant never chose to share; points measured tenure
// with the app, not anything about the person.
//
// Format history:
//   v2 (current) — { v:2, n:name, a:[8 aspect scores] }
//   v1 (legacy)  — also carried l:level and p:points. Still DECODED (l/p simply
//                  ignored) so codes shared before this release keep working.

import { t, tp } from "./i18n.js";

const CODE_PREFIX = "LQ1-";
const NAME_MAX_LENGTH = 20;
const ASPECT_COUNT = 8;

// Aspect order is part of the code format — do not reorder.
const ASPECT_ORDER = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

// TextEncoder-based base64url so Thai and other non-Latin names survive.
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  const bin = atob(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// The name cut to NAME_MAX_LENGTH characters, counted as the reader counts
// them. String#slice counts UTF-16 units, so an emoji straddling the 20th cut
// in half and left a broken glyph at the end of the name.
function clipName(name) {
  return Array.from(name).slice(0, NAME_MAX_LENGTH).join("");
}

export function encodeComparisonCode(state) {
  const payload = {
    v: 2,
    n: clipName(String(state.profile.name || "Guest").trim()) || "Guest",
    a: ASPECT_ORDER.map(key => Math.round(Math.max(0, Math.min(100, (state.aspects || {})[key] || 0))))
  };
  return CODE_PREFIX + toBase64Url(JSON.stringify(payload));
}

// Throws a user-friendly Error on anything malformed or out of range.
export function decodeComparisonCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed.startsWith(CODE_PREFIX)) {
    throw new Error(tp('Comparison codes start with "{prefix}".', { prefix: CODE_PREFIX }));
  }
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(trimmed.slice(CODE_PREFIX.length)));
  } catch {
    throw new Error(t("That code is damaged — ask the participant to copy it again."));
  }
  // Both formats are accepted. A v1 code still carries l/p; they are read past,
  // not validated — the board no longer uses them and they leave no trace.
  if (!payload || (payload.v !== 1 && payload.v !== 2)) {
    throw new Error(t("Unsupported comparison code version."));
  }
  const name = typeof payload.n === "string" ? clipName(payload.n.trim()) : "";
  const aspects = payload.a;
  if (!name) throw new Error(t("Comparison code is missing a name."));
  if (!Array.isArray(aspects) || aspects.length !== ASPECT_COUNT
    || !aspects.every(v => Number.isFinite(v) && v >= 0 && v <= 100)) {
    throw new Error(t("Comparison code has invalid aspect scores."));
  }
  return {
    name,
    aspects: Object.fromEntries(ASPECT_ORDER.map((key, i) => [key, Math.round(aspects[i])]))
  };
}
