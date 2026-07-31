// Tests for the methodology page (#/methodology): the score-stability readout
// and the transparency guarantees the page exists to provide — citations for
// validated instruments and an explicit disclosure for app-authored ones.
import { test } from "node:test";
import assert from "node:assert/strict";

// Globals must exist before importing any view (views/helpers.js pulls in
// state.js). Same minimal stub approach as views-xss.test.mjs.
globalThis.localStorage = {
  store: {},
  getItem(k) { return Object.hasOwn(this.store, k) ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};
const captured = { html: "" };
globalThis.document = {
  getElementById: () => ({
    set innerHTML(v) { captured.html = v; },
    get innerHTML() { return captured.html; },
    querySelectorAll: () => [],
    addEventListener: () => {}
  })
};

const { scoreStability, renderMethodology } = await import("../views/methodology.js");
const { methodTag } = await import("../views/helpers.js");

// methodTag falls back to `return tags[method] || method`, so a benchmark
// method with no entry does not render blank — it renders its own raw key.
// That is a quieter failure than a blank, not a safer one: v41's `norms` would
// have printed the untranslated word "norms" to Thai users. Every method
// benchmarks.js can emit must resolve to a real label.
test("every benchmark method has a label, and norms is not just distribution", () => {
  // `estimate` is excluded from the raw-key check because its English label IS
  // the word "estimate" — it is mapped, it just maps to itself in this
  // language. Its Thai coverage is enforced by tests/i18n-coverage.test.mjs.
  for (const m of ["norms", "distribution", "threshold"]) {
    assert.notEqual(methodTag(m), m, `method "${m}" renders its raw key instead of a label`);
  }
  assert.equal(methodTag("estimate"), "estimate", "still mapped, just to itself in English");
  assert.notEqual(methodTag("norms"), methodTag("distribution"),
    "a table lookup and a normal approximation must not claim to be the same thing");
});

test("scoreStability is null without check-ins and averages absolute shifts with them", () => {
  assert.equal(scoreStability(null), null);
  assert.equal(scoreStability({ checkins: [] }), null);
  assert.equal(scoreStability({ checkins: [{ date: "2026-01-01", sums: {}, shifts: {} }] }), null);

  const state = {
    checkins: [
      { date: "2026-01-01", sums: {}, shifts: { mental: -4, relationships: 2 } },
      { date: "2026-02-01", sums: {}, shifts: { mental: 6 } }
    ]
  };
  // |−4| + |2| + |6| over 3 shifts = 4.
  assert.deepEqual(scoreStability(state), { count: 2, avg: 4 });
});

test("the methodology page cites validated instruments and discloses app-authored ones", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /consumerfinance\.gov/, "CFPB citation present");
  assert.match(html, /Jenkins et al\./, "JSS citation present");
  assert.match(html, /Schwarzer & Jerusalem|Schwarzer &amp; Jerusalem/, "GSE citation present");
  assert.match(html, /App-authored behavioral items/, "unstandardized aspects are disclosed, not dressed up");
  assert.match(html, /not a medical or psychological diagnosis/, "disclaimer present");
  assert.match(html, /Complete a monthly re-assessment/, "stability placeholder shown without check-ins");
});

// The app's stated non-goal. Deliberately a test and not merely a comment: this
// sentence is the guardrail on every percentile, grade and index the app
// prints, and it must not be quietly dropped in some future copy edit.
test("the methodology page states what the app does not measure", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /does not measure: your worth as a person/, "the non-goal is stated outright");
  assert.match(html, /behavior you reported and circumstances you were handed/,
    "it says what the numbers ARE built from, not only what they are not");
  assert.match(html, /never as a judgment on the person living in it/,
    "a low score is explicitly disclaimed as a verdict on the person");
  assert.match(html, /class="aspect-blurb methodology-nongoal"/,
    "the statement is set apart, not styled as fine print");
});

// The provenance table is the app's answer to "compared with whom?" — the
// single question a percentile is meaningless without. Pinned as a test for the
// same reason as the non-goal above: it is the honesty guarantee on eight
// printed ranks, and it must not be lost in a future copy edit.
test("the methodology page names the reference sample behind every comparison", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /Who you are actually compared with/, "the section exists");
  assert.match(html, /provenance-table/, "rendered as a table, not buried in prose");
  // Each aspect's row names the sample it is compared against.
  assert.match(html, /Labour Force Survey/, "finance names its Thai wage source");
  assert.match(html, /representative German sample/, "mental names the German WHO-5 sample");
  assert.match(html, /25-country pooled norms/, "personal goals names the pooled GSE norm");
  assert.match(html, /World Giving Index/, "social contribution names CAF");
  // The unranked row is visually and semantically distinct.
  assert.match(html, /provenance-unranked/, "the unranked row is marked, not styled like the rest");
  assert.match(html, /ages 57-85/, "the wrong-population problem is stated with the actual age band");
});

// v41. The mental row is now the only one read out of a published percentile
// table, and the only one stratified by the user's age — but the sample is
// still German. The honest-labelling constraint on this release is that better
// precision must not be allowed to read as better relevance, so both halves are
// pinned: the table/age-band claim AND the admission that it changes nothing
// about the population mismatch.
test("the mental row names the age-banded table without overselling it", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /Kliem et al\. 2025, Table 2/, "the table the percentile is read from is named");
  assert.match(html, /Germany · adults, by age band/, "the row says the comparison is age-stratified");
  assert.match(html, /Ranked from a published table/, "the claim is distinguished from a fitted rank");
  assert.match(html, /no more relevant to life in Thailand/,
    "precision is not allowed to pass for relevance");
  assert.match(html, /Nothing is interpolated/, "the exact-row property is stated");
});

test("the methodology page states that no representative Thai norm exists", () => {
  renderMethodology("main-view", { checkins: [] });
  const html = captured.html;
  assert.match(html, /no representative Thai general-adult norm published/,
    "the finding that drove this disclosure is stated outright, not implied");
  assert.match(html, /guess wearing a number(&#39;|')s clothes/,
    "the reason for withholding the relationships rank is given in plain language");
});

test("the stability line reports count and average once check-ins exist", () => {
  renderMethodology("main-view", {
    checkins: [{ date: "2026-01-01", sums: {}, shifts: { mental: 3, personalGoals: -5 } }]
  });
  assert.match(captured.html, /shifted by an average of 4 points/, "average |3|,|−5| = 4");
});
