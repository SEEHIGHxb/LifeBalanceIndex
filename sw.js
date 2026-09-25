// sw.js - LifeQuest service worker (PWA offline support)
//
// Strategy: NETWORK-FIRST with cache fallback. Online users always get fresh
// files, and offline users get the last shell that loaded.
// Bump CACHE_NAME together with the ?v=N version on each release.
//
// Every fetch here is issued with cache: "no-cache", which forces the browser
// to revalidate against the origin instead of serving its own HTTP cache. That
// is what actually makes "network-first" true, and it is load-bearing: the
// ?v=N query only tags three URLs (index.css, app.js, ui.js), while the module
// graph has ~66 relative imports — state.js, chart.js, views/*.js and the rest
// carry no version at all. Without revalidation a returning user could get a
// fresh app.js against stale view modules: a torn deploy, half-new half-old.
// Revalidation costs a conditional request per file and answers 304 when
// nothing changed, so the bandwidth is negligible and the version can never
// tear. Do NOT "optimise" this back to a plain fetch(req).

const CACHE_NAME = "lifequest-v99";

const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./index.css",
  "./css/frame.css",
  "./css/stage-page.css",
  "./css/home.css",
  "./css/journey.css",
  "./css/weekly.css",
  "./app.js",
  "./version.js",
  "./state.js",
  "./defaults.js",
  "./grades.js",
  "./season.js",
  "./sanitize.js",
  "./draft.js",
  "./scoring.js",
  "./connections.js",
  "./ui.js",
  "./motion.js",
  "./views/helpers.js",
  "./views/menu.js",
  "./views/motion-mount.js",
  "./views/instrument-forms.js",
  "./views/assistant.js",
  "./views/onboarding.js",
  "./views/journey.js",
  "./views/journey-progress.js",
  "./views/landing.js",
  "./views/stage-page.js",
  "./views/stage.js",
  "./views/news.js",
  "./views/dashboard.js",
  "./views/aspect.js",
  "./views/assessments.js",
  "./views/methodology.js",
  "./views/review.js",
  "./views/yearreview.js",
  "./views/quests.js",
  "./views/leaderboard.js",
  "./views/profile.js",
  "./views/share.js",
  "./chart.js",
  "./story-card.js",
  "./surveys.js",
  "./benchmarks.js",
  "./criteria.js",
  "./averages.js",
  "./goals.js",
  "./aspects.js",
  "./validation.js",
  "./suggestions.js",
  "./comparison-code.js",
  "./i18n.js",
  "./th.js",
  "./manifest.webmanifest",
  "./assets/lumi.png?v=99",
  // The eight region chapter plates. 0.73 MB for the set, which is why they
  // are band-cropped JPEGs and not the 10.3 MB of source PNGs they came from.
  "./assets/regions/market.jpg",
  "./assets/regions/highlands.jpg",
  "./assets/regions/still-water.jpg",
  "./assets/regions/commons.jpg",
  "./assets/regions/workshop.jpg",
  "./assets/regions/crossroads.jpg",
  "./assets/regions/wildwood.jpg",
  "./assets/regions/lookout.jpg",
  // Phase 4 art set: the sprite sheet (star, glint, motifs) and the eight
  // region emblems, 4-11 KB each. Precached so an offline journey is whole.
  "./assets/sprites.svg",
  "./assets/emblems/market.webp",
  "./assets/emblems/highlands.webp",
  "./assets/emblems/still-water.webp",
  "./assets/emblems/commons.webp",
  "./assets/emblems/workshop.webp",
  "./assets/emblems/crossroads.webp",
  "./assets/emblems/wildwood.webp",
  "./assets/emblems/lookout.webp",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  // Self-hosted faces. Only the subsets the UI can actually render are
  // precached: `latin` covers the English copy, `thai` covers th.js. The
  // `latin-ext` files are declared in fonts.css but left out on purpose —
  // unicode-range means the browser only fetches them for accented
  // codepoints our own copy never contains, so precaching them would add
  // ~415 KB to every install to cover user-typed names alone.
  "./assets/fonts/fonts.css",
  "./assets/fonts/inter-latin.woff2",
  "./assets/fonts/source-serif-4-latin.woff2",
  "./assets/fonts/sarabun-thai-400.woff2",
  "./assets/fonts/sarabun-thai-500.woff2",
  "./assets/fonts/sarabun-thai-600.woff2",
  "./assets/fonts/sarabun-thai-700.woff2",
  "./assets/fonts/maitree-thai-400.woff2",
  "./assets/fonts/maitree-thai-600.woff2",
  "./assets/fonts/maitree-thai-700.woff2",
  // The redesign's wordmark face; every screen's header shows it.
  "./assets/fonts/anton-latin.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Same reasoning as the fetch handler, and the same two layers to get
      // past. cache: "no-cache" keeps the browser's own stale HTTP entries out
      // of the new cache; versioned() keeps the CDN's out. A plain addAll would
      // bake a torn deploy — or, as with v82, an ENTIRELY previous release —
      // into the offline shell for the life of this CACHE_NAME.
      //
      // Fetched at the versioned URL and stored under the BARE one, so the
      // page's bare module imports still match what is in here. addAll cannot
      // do that: it keys each entry by the URL it fetched.
      .then(cache => Promise.all(APP_SHELL.map(url =>
        fetch(versioned(new URL(url, self.location).toString()), { cache: "no-cache" })
          .then(res => (res.ok ? cache.put(url, res) : null))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The URL this worker asks the NETWORK for, which is not the URL the page
// asked us for.
//
// cache: "no-cache" above makes the BROWSER revalidate instead of answering
// from its own HTTP cache. It does nothing about a CDN in front of the origin,
// and there is one: every bare asset URL came back `cf-cache-status: HIT` with
// `Cache-Control: max-age=14400`, so for four hours after a release the origin
// held the new bytes and the edge handed out the old ones. Measured, not
// assumed — bare `/views/onboarding.js` returned the previous release while
// the same path with any query string returned the current one.
//
// That is why v82 deployed correctly and was invisible. The ?v=N query tags
// only three URLs; the module graph has ~66 bare relative imports, and every
// one of them was served stale.
//
// Stamping the version onto the OUTBOUND request makes each release ask for
// URLs the edge has never seen, so it has nothing to serve and must go to the
// origin. The response is still returned for the page's original bare request
// and still cached under that bare key, so module resolution and the offline
// fallback are untouched.
//
// This is a workaround for a cache rule, not a fix for it: /sw.js and the
// module graph want a no-store or short-TTL rule at the CDN. Until then, this
// is what makes a deploy reach anyone who already has the app open.
function versioned(url) {
  const u = new URL(url);
  u.searchParams.set("v", CACHE_NAME);
  return u.toString();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(versioned(req.url), { cache: "no-cache", credentials: "same-origin" })
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        // ignoreSearch lets a cached "app.js" satisfy "app.js?v=N" offline.
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())
        )
      )
  );
});
