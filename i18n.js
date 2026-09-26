// i18n.js - Tiny EN/TH localization layer.
//
// English strings ARE the canonical keys: t("Weekly Review") looks the
// exact English text up in the Thai dictionary (th.js) and falls back to
// English when no entry exists (e.g. the user's own name). The
// language choice lives in its own localStorage key so it survives a
// game-data reset. Pure module: no DOM at import time, fully testable.

import { TH } from "./th.js";

const LANG_STORAGE_KEY = "lifequest_lang";
const SUPPORTED_LANGS = ["en", "th"];

function readStoredLang() {
  try {
    const saved = typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

let currentLang = readStoredLang();

// Content modules that build translated text ONCE, when they are first
// imported, register here to rebuild it when the language changes. Without
// this the journey's questions stayed in whatever language the page loaded
// in: the header toggle re-rendered every screen, but from strings that had
// already been translated at import time.
const langListeners = new Set();

export function onLangChange(listener) {
  langListeners.add(listener);
  return () => langListeners.delete(listener);
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return currentLang;
  const changed = lang !== currentLang;
  currentLang = lang;
  if (changed) langListeners.forEach(listener => listener(lang));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  } catch (e) {
    console.error("Failed to persist language choice:", e);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  return currentLang;
}

// Translate a canonical English string.
export function t(text) {
  if (currentLang === "th") {
    return TH[text] || text;
  }
  return text;
}

// Translate a parameterized template: tp("Log {n} more", {n: 3}).
// Unknown placeholders are left as-is so mistakes stay visible.
export function tp(text, params = {}) {
  return t(text).replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? params[key] : match
  );
}

// "62nd" in English; Thai has no ordinal suffixes, so "ที่ 62".
export function percentileLabel(n) {
  if (currentLang === "th") return `ที่ ${n}`;
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

// Locale tag for Date.toLocale* formatting.
export function dateLocale() {
  return currentLang === "th" ? "th-TH" : "en-US";
}

// Splits text into what a reader sees as single letters. Any per-letter effect
// (Lumi's typewriter, a title spelled in glints) must split on these, never on
// charAt or split(""): Thai stacks vowels and tone marks on the consonant before
// them, and a split between the two shows a bare consonant with the mark
// dropping onto it a frame later. Code points are the fallback where
// Intl.Segmenter is missing -- they still split marks, but never a surrogate pair.
const segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

export function graphemes(text) {
  const str = String(text ?? "");
  return segmenter ? Array.from(segmenter.segment(str), s => s.segment) : Array.from(str);
}
