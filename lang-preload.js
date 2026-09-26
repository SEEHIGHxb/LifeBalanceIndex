// lang-preload.js - a Thai reader's dictionary starts downloading as the page
// opens (tests/load-speed.test.mjs).
//
// The dictionary loads only for a Thai reader (i18n.js), and i18n.js asks for
// it only once the whole core has loaded and run: measured on a phone over 4G,
// that held a Thai reader's Landing back by 0.4 s. A classic script, run as
// soon as it arrives, reads the saved language and asks for the dictionary
// alongside the core. Anyone else pays for this file and nothing more.
try {
  if (localStorage.getItem("lifequest_lang") === "th") {
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = "./th.js";
    document.head.appendChild(link);
  }
} catch {
  // Storage is blocked: i18n.js reads English then, and fetches nothing.
}
