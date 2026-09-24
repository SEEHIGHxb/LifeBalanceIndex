// tests/dom-stub.mjs - the smallest document the view and chart modules need.
//
// NOT a test file: the `tests/*.test.mjs` glob deliberately does not match it.
//
// The project has no DOM dependency and this does not add one. views-xss.test.mjs
// established the approach — stub `document.getElementById` and capture what is
// assigned to `.innerHTML` — and this is that stub with the two gaps closed
// that stopped it covering the dashboard:
//
//   1. PER-ID ELEMENTS. The original returned one shared object for every id,
//      so a view writing to two containers overwrote the first. renderAspectPage
//      does exactly that (the page, then its trend panel), which made the page
//      look like it had rendered 142 characters.
//
//   2. createElementNS. chart.js builds its SVG node by node and measures label
//      widths in a throwaway probe before it can solve the radius, so a
//      document without it throws before the dashboard renders at all.
//
// The nodes are inert bags of attributes. That is the point: no layout engine
// means `getComputedTextLength` is absent, chart.js takes its documented
// character-count fallback, and every number the chart derives becomes
// deterministic and assertable.

const DEFAULT_WIDTH_PX = 360;

// A real DOMTokenList, minus the parts nothing here uses. Added when the
// onboarding rewrite started showing its first screen AT RENDER TIME rather
// than only on a draft restore: the view legitimately toggles `.d-none` on
// every screen, and a node without a classList made that read as a view bug
// when it was a stub gap. Backed by a Set so add/remove/toggle compose the way
// the real one does.
function makeClassList(initial = "") {
  const set = new Set(String(initial).split(/\s+/).filter(Boolean));
  return {
    add(...names) { for (const n of names) set.add(n); },
    remove(...names) { for (const n of names) set.delete(n); },
    contains(name) { return set.has(name); },
    toggle(name, force) {
      const on = force === undefined ? !set.has(name) : !!force;
      if (on) set.add(name); else set.delete(name);
      return on;
    }
  };
}

// CSSStyleDeclaration, minus the parts nothing here uses. A plain `{}` carries
// assignments like `el.style.color = "red"` but not `setProperty`, which is the
// only way to write a CUSTOM property -- and the region wash is a custom
// property on <body>.
//
// Every write is also logged in `writes`, in order, whichever way it was made:
// `style.left = ...`, `style["left"] = ...` and `setProperty` all land here.
// That log is the runtime half of the "transform and opacity only" guard
// (tests/motion-guards.test.mjs). The Phase 1 review found the source grep
// alone missed bracket writes and cssText; a runtime log does not.
function makeStyle() {
  const props = {};
  const writes = [];
  const style = {
    props,
    writes,
    setProperty(name, value) { writes.push({ prop: name, value: String(value) }); props[name] = String(value); },
    getPropertyValue(name) { return Object.hasOwn(props, name) ? props[name] : ""; },
    removeProperty(name) { delete props[name]; }
  };
  return new Proxy(style, {
    set(target, prop, value) {
      writes.push({ prop: String(prop), value: String(value) });
      target[prop] = value;
      return true;
    }
  });
}

// A hand-driven clock for motion.js (pass it to setClock). Frames only run
// when advance() says so, and each frame yields a macrotask first, so promise
// chains between frames settle the way they do in a browser. The Phase 1
// harness learned this the hard way: a synchronous loop starved the awaits
// between frames and the chapter ending never reached its last card.
export const FRAME_MS = 16;

export function makeClock(start = 0) {
  let now = start;
  let queue = [];
  return {
    now: () => now,
    frame(cb) { queue.push(cb); },
    get pending() { return queue.length; },
    async advance(ms, step = FRAME_MS) {
      let left = ms;
      // setImmediate, not setTimeout(0): both are macrotasks, but Windows
      // rounds a zero timeout up to its ~15 ms timer tick, which made a
      // one-second animation take a second of wall time to test.
      while (left > 0) {
        await new Promise(resolve => setImmediate(resolve));
        const dt = Math.min(step, left);
        now += dt;
        left -= dt;
        const due = queue;
        queue = [];
        for (const cb of due) cb(now);
      }
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

export function makeNode(tagName) {
  return {
    tagName,
    style: makeStyle(),
    textContent: "",
    attributes: {},
    childNodes: [],
    dataset: {},
    classList: makeClassList(),
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; },
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); },
    removeAttribute(name) { delete this.attributes[name]; },
    toggleAttribute(name, force) {
      const on = force === undefined ? !Object.hasOwn(this.attributes, name) : !!force;
      if (on) this.attributes[name] = ""; else delete this.attributes[name];
      return on;
    },
    appendChild(child) { this.childNodes.push(child); return child; },
    removeChild(child) { this.childNodes = this.childNodes.filter(c => c !== child); },
    remove() {},
    // No layout: chart.js checks for getComputedTextLength and falls back to a
    // character-count estimate when it is missing. Leaving it off keeps the
    // fallback on the tested path AND makes the widths reproducible.
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, right: DEFAULT_WIDTH_PX, top: 0, bottom: 0, width: DEFAULT_WIDTH_PX, height: 0 }; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {}
  };
}

// Install a document and localStorage on globalThis.
//
// Returns { html, nodes, width }: `html` maps container id -> the last string
// assigned to its innerHTML, and `nodes` collects every element created through
// createElementNS, in creation order.
export function installDom({ width = DEFAULT_WIDTH_PX } = {}) {
  const html = {};
  const nodes = [];
  const elements = {};

  globalThis.localStorage = {
    store: {},
    getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };

  globalThis.document = {
    getElementById(id) {
      if (!elements[id]) {
        const el = makeNode("div");
        el.clientWidth = width;
        el.getBoundingClientRect = () => ({ left: 0, right: width, top: 0, bottom: 0, width, height: 0 });
        Object.defineProperty(el, "innerHTML", {
          get() { return html[id] || ""; },
          set(v) { html[id] = v; }
        });
        elements[id] = el;
      }
      return elements[id];
    },
    createElementNS(_ns, tagName) {
      const node = makeNode(tagName);
      nodes.push(node);
      return node;
    },
    createElement(tagName) {
      const node = makeNode(tagName);
      nodes.push(node);
      return node;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: String(text) };
    }
  };

  // The view paints the journey wash onto <body>. A real document always has
  // one, so the stub does too rather than the view guarding for its absence.
  globalThis.document.body = makeNode("body");
  // <html>: motion.js mirrors the in-app Reduce motion switch onto it.
  globalThis.document.documentElement = makeNode("html");

  return { html, nodes, width };
}
