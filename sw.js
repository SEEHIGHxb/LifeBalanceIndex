// sw.js - LifeQuest service worker (PWA offline support)
//
// Strategy: CACHE-FIRST from one release's complete copy (v119). A returning
// visitor opens at once from this worker's cache; a new release arrives as a
// new worker with a new cache, found by the page's release check (app.js).
// Bump CACHE_NAME together with the ?v=N version on each release.
//
// It was network-first until v118, and that was the "sometimes it takes 5-10
// seconds" the owner reported (2026-09-27): every visit waited on the network
// for the page and each of ~50 modules before touching the copy already here.
// Measured with the worker installed: 2 s at one second a request, and never
// opened at all (20 s) on a connection that stalls, the weak phone signal
// that the "sometimes" was. The cache was complete the whole time.
//
// It cannot tear. Every file answered here comes from the same CACHE_NAME, and
// install stores the whole shell or fails (below), so there is never a new
// app.js against old view modules. Files outside the shell go to the network
// once and are kept.
//
// On localhost the worker stays network-first, so an edit shows on reload
// while the version is unchanged.
const IS_DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

const CACHE_NAME = "lifequest-v158";

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
  "./css/more.css",
  "./css/shape.css",
  "./css/star-page.css",
  "./css/phone.css",
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
  "./view-loader.js",
  "./lang-preload.js",
  "./motion.js",
  "./views/helpers.js",
  "./views/menu.js",
  "./views/magnet.js",
  "./views/activity-fields.js",
  "./views/lang-carry.js",
  "./views/motion-mount.js",
  "./views/instrument-forms.js",
  "./views/lumi.js",
  "./views/onboarding.js",
  "./views/journey.js",
  "./views/journey-progress.js",
  "./views/landing.js",
  "./views/stage-page.js",
  "./views/shape.js",
  "./views/star-page.js",
  "./views/star-zoom.js",
  "./views/star-shape-zoom.js",
  "./views/night-sky.js",
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
  "./characters.js",
  "./secure-context.js",
  "./moved.js",
  "./aspects.js",
  "./validation.js",
  "./suggestions.js",
  "./comparison-code.js",
  "./i18n.js",
  "./th.js",
  "./manifest.webmanifest",
  "./assets/lumi.png?v=158",
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
  "./assets/favicon.svg",
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
      //
      // All or nothing: a file that fails fails the install, so the previous
      // worker keeps serving its own whole copy and the browser tries again on
      // the next check. A half-filled cache would be served cache-first.
      .then(cache => Promise.all(APP_SHELL.map(url =>
        fetch(versioned(new URL(url, self.location).toString()), { cache: "no-cache" })
          .then(res => {
            if (!res.ok) throw new Error(`precache ${url}: HTTP ${res.status}`);
            return cache.put(url, res);
          })
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
  // The page's release check (app.js) must see the network, not this copy.
  if (req.cache === "no-store") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      IS_DEV
        ? fromNetwork(req, cache).then(res => res || fromCache(req, cache))
        : fromCache(req, cache).then(hit => hit || fromNetwork(req, cache))
    ).then(res => res || offlineAnswer(req))
  );
});

// ignoreSearch lets the stored "app.js" answer "app.js?v=N", and "./" answer
// "/?anything". Only ?v= and the page's own queries ever reach here.
function fromCache(req, cache) {
  return cache.match(req, { ignoreSearch: true });
}

function fromNetwork(req, cache) {
  return fetch(versioned(req.url), { cache: "no-cache", credentials: "same-origin" })
    .then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    // Offline and not in the copy: answered by offlineAnswer.
    .catch(() => null);
}

function offlineAnswer(req) {
  return req.mode === "navigate"
    ? caches.match("./index.html").then(hit => hit || Response.error())
    : Response.error();
}
