// The old address's service worker after the move. A returning reader's
// browser still runs the app's old worker, which answers from its cache and
// would keep showing the old app here. When it checks for an update it gets
// this: clear the old copies, step aside, and reload the open pages so they
// reach index.html, which sends them to the new address.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: "window" });
    pages.forEach((page) => page.navigate(page.url));
  })());
});
