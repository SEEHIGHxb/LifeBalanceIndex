// secure-context.js - what the app needs from a page that may be served over
// plain http.
//
// The site answers on http://lbi.plainpoint.net as well as https, and a page
// there is not a secure context: crypto.randomUUID is missing, so finishing the
// journey threw, and the service worker never registers. The page is moved to
// https before anything runs (app.js), and ids come from getRandomValues, which
// every context has, so an http page that is not moved still works.

// Local development hosts stay on http; nothing there has a certificate.
const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/;

// "<prefix>_" and eight hex characters: four random bytes.
export function shortId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${prefix}_${Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")}`;
}

// The https address of a page on plain http, or null when it should stay put.
export function httpsUpgradeUrl({ protocol, hostname, host, pathname, search, hash }) {
  if (protocol !== "http:" || LOCAL_HOST_RE.test(hostname)) return null;
  return `https://${host}${pathname}${search}${hash}`;
}
