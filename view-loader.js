// view-loader.js - each screen's code is fetched the first time it is shown
// (the owner, 2026-09-27: "load only the code each screen needs").
//
// Measured on a phone over 4G, a first visit fetched every screen's code
// before drawing the Landing. Now app.js imports the core only, and a screen
// arrives when it is first asked for.
//
// A screen already loaded draws before show() returns. That keeps the flows
// that re-render the current screen and act on it straight after (the
// language button carrying half-typed answers, the review's ending moving
// focus) exactly as they were, since the screen on show is always loaded.
//
// When fetches overlap, only the screen asked for last is drawn: a slow
// Profile arriving after a quick Home must not draw over it.

export function createViewLoader(loaders, { onError = () => {} } = {}) {
  const loaded = new Map();
  let ticket = 0;

  // Draws the screen `name` with draw(module). Resolves true once drawn, false
  // when a later show() superseded it or its code could not be fetched.
  function show(name, draw) {
    const load = loaders[name];
    if (!load) throw new Error(`view-loader: unknown view "${name}"`);
    const mine = ++ticket;
    if (loaded.has(name)) {
      draw(loaded.get(name));
      return Promise.resolve(true);
    }
    return Promise.resolve()
      .then(load)
      .then(mod => {
        loaded.set(name, mod);
        if (mine !== ticket) return false;
        draw(mod);
        return true;
      }, err => {
        if (mine === ticket) onError(name, err);
        return false;
      });
  }

  // Fetches a screen's code ahead of time without drawing it, for the screen
  // the reader is most likely to open next. A failure is left for show().
  function prefetch(name) {
    const load = loaders[name];
    if (!load) throw new Error(`view-loader: unknown view "${name}"`);
    if (loaded.has(name)) return Promise.resolve(true);
    return Promise.resolve()
      .then(load)
      .then(mod => { loaded.set(name, mod); return true; }, () => false);
  }

  return { show, prefetch, isLoaded: (name) => loaded.has(name) };
}
