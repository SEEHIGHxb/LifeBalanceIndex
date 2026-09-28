# lbi.plainpoint.net (old address)

The app moved to https://asterism.plainpoint.net. This folder is the whole site
for the old address, published from its own repository with GitHub Pages:

- `index.html` / `404.html`: send every page to the same path on the new address.
- `handoff.html`: framed by the new address, passes the reader's saved answers
  across (see `moved.js` in the app).
- `sw.js`: replaces the app's old service worker so old copies stop loading.

Keep it online for a few months after the move.
