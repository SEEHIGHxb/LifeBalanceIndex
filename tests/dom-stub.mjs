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

export function makeNode(tagName) {
  return {
    tagName,
    style: {},
    textContent: "",
    attributes: {},
    childNodes: [],
    dataset: {},
    classList: makeClassList(),
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; },
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

  return { html, nodes, width };
}
