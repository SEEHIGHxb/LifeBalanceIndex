// SCALE DIRECTION — every Likert scale in the app runs least-first.
//
// WHY THIS FILE EXISTS. Five of the app's twenty-five instruments used to paint
// their options MOST-first: onboarding CFPB ("Describes me completely" /
// "Always" on the left) and WHO-5 ("All of the time"), and in the deep
// assessment CFPB-10, Rosenberg ("Strongly agree") and CFC-12 ("Extremely
// characteristic of me"). The other twenty opened on their least end. They read
// that way because that is how those four instruments are PRINTED, but a
// printed form is read one sheet at a time and this app asks fourteen
// instruments in one sitting.
//
// The cost was concentrated in one place. views/journey.js puts ST-5 and WHO-5
// on CONSECUTIVE screens of The Still Water, and the second stem explicitly
// ties them together ("Five more, about the same stretch of time"). ST-5 opened
// on "Rarely / Not at all" and WHO-5 on "All of the time", so a reader who had
// just answered five items where the left end meant LEAST met five more, on the
// same subject, where it meant MOST. Anyone answering by position rather than
// by reading the anchors — which is most people by item forty of an assessment
// — inverted their own mental-health score, and nothing downstream could tell.
//
// Reordering is safe for measurement because option values live in {v, l} pairs
// and collectInstrument reads the VALUE of the chosen radio. Every raw sum,
// every clinical threshold and every published norm is untouched; only paint
// order moved. Anchor wording and point counts, which are what actually make a
// score comparable to its norms, are guarded separately in
// tests/instrument-fidelity.test.mjs and are unchanged.
//
// This file is the reason it stays fixed. A new instrument, or a scale someone
// reorders to match a source document, fails here.
import test from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";

// Every anchor that is the LEAST end of its scale — lowest frequency, lowest
// quantity, weakest agreement. Enumerated rather than pattern-matched: a regex
// over words like "never" would quietly accept "Hardly ever or never" at the
// wrong end, and the whole point here is to be exact about which end is which.
//
// Adding a scale means adding its least anchor. That is deliberate friction:
// it is the one decision this file exists to force someone to make.
const LEAST_ANCHORS = new Set([
  "Not at all",                        // DESCRIBES_POSITIVE / DESCRIBES_REVERSED
  "Never",                             // FREQ_POSITIVE / FREQ_REVERSED / FREQ_5 / PSS_FREQ / LSNS_DECISION / RAS_FREQ_REV
  "Not at all (0 days)",               // SLEEP_FREQ
  "Rarely / Not at all",               // ST5_FREQ
  "At no time",                        // WHO5_FREQ
  "None",                              // LSNS_COUNT
  "Hardly ever or never",              // UCLA_FREQ
  "Poorly",                            // RAS_NEEDS
  "Unsatisfied",                       // RAS_SATISFIED
  "Poor",                              // RAS_COMPARED
  "Hardly at all",                     // RAS_EXPECTATIONS
  "Not much",                          // RAS_LOVE
  "Not at all true",                   // AGREE_4
  "Strongly Disagree",                 // AGREE_5 (CIT capitalisation, as published)
  "Strongly disagree",                 // RSES_AGREE / RSES_AGREE_REV
  "Not like me at all",                // LIKE_ME_5 / LIKE_ME_5_REV
  "Extremely uncharacteristic of me",  // CFC_CHAR / CFC_CHAR_REV
  "None / very few",                   // RAS_AMOUNT_REV
  "Less than monthly",                 // LSNS_CONTACT
  "Less than 4 hours"                  // SITTING_BANDS (fewest hours of sitting)
]);

function everyScale() {
  const out = [];
  for (const [bank, set] of [["INSTRUMENTS", INSTRUMENTS], ["DEEP_INSTRUMENTS", DEEP_INSTRUMENTS]]) {
    for (const [key, instr] of Object.entries(set)) {
      instr.items.forEach((item, i) => {
        out.push({ where: `${bank}.${key} item ${i + 1}`, options: item.options });
      });
    }
  }
  return out;
}

test("every option scale in both banks opens on its least anchor", () => {
  const scales = everyScale();
  assert.ok(scales.length > 100, `only ${scales.length} items found — the banks did not load`);

  for (const { where, options } of scales) {
    const first = options[0].l;
    const last = options[options.length - 1].l;

    assert.ok(
      LEAST_ANCHORS.has(first),
      `${where} opens on "${first}", which is not a declared least anchor. Either the ` +
      "scale was reordered to run most-first, or it is a new scale whose least end " +
      "has not been declared in LEAST_ANCHORS. Leftmost must be the lowest " +
      "frequency, quantity or agreement — see the header of this file for why."
    );
    assert.ok(
      !LEAST_ANCHORS.has(last),
      `${where} ENDS on "${last}", a least anchor. The scale is painted backwards: ` +
      "the reader meets the strongest answer first. This is the exact regression " +
      "this file exists to catch."
    );
  }
});

test("option values run monotonically from one end of a scale to the other", () => {
  // Reverse-keyed items descend and positively-keyed items ascend — both are
  // correct. What is never correct is a scale whose values wander, which would
  // mean the labels and the scores have come uncoupled.
  for (const { where, options } of everyScale()) {
    const vs = options.map(o => o.v);
    const up = vs.every((v, i) => i === 0 || v > vs[i - 1]);
    const down = vs.every((v, i) => i === 0 || v < vs[i - 1]);
    assert.ok(
      up || down,
      `${where} has non-monotonic option values [${vs.join(", ")}]. A scale must ` +
      "ascend or descend across its whole length; anything else means a label and " +
      "its score no longer correspond."
    );
    assert.equal(
      Math.abs(vs[0] - vs[vs.length - 1]), Math.max(...vs) - Math.min(...vs),
      `${where} does not put its extreme values at its two ends [${vs.join(", ")}]`
    );
  }
});

test("ST-5 and WHO-5 open on the same end, being consecutive screens", () => {
  // The defect that prompted this file. These two are asked back to back in The
  // Still Water, about the same stretch of time, and used to run in opposite
  // directions. If a future edit restores either to its printed order, this
  // fails with the reason rather than with a diff.
  const st5 = INSTRUMENTS.st5.items[0].options;
  const who5 = INSTRUMENTS.who5.items[0].options;

  assert.equal(st5[0].l, "Rarely / Not at all", "ST-5 must open on its least-frequency anchor");
  assert.equal(who5[0].l, "At no time", "WHO-5 must open on its least-frequency anchor");

  // ST-5 counts UP toward stress and WHO-5 counts UP toward wellbeing, so their
  // values move in the same direction while meaning opposite things. That is
  // fine and is what the scoring expects; the DISPLAY is what has to agree.
  assert.equal(st5[0].v, 0, "ST-5 least = 0");
  assert.equal(who5[0].v, 0, "WHO-5 least = 0");
});

test("the five reordered instruments now open least-first", () => {
  // Named explicitly so the change is legible in the suite output rather than
  // only in a git diff.
  const opens = key => (INSTRUMENTS[key] || DEEP_INSTRUMENTS[key]).items[0].options[0].l;

  assert.equal(opens("cfpb"), "Not at all", "onboarding CFPB");
  assert.equal(opens("who5"), "At no time", "onboarding WHO-5");
  assert.equal(opens("cfpb10"), "Not at all", "deep CFPB-10");
  assert.equal(opens("rses"), "Strongly disagree", "deep Rosenberg");
  assert.equal(opens("cfc12"), "Extremely uncharacteristic of me", "deep CFC-12");

  // And CFPB's frequency items, which are a different scale on the same screen.
  assert.equal(INSTRUMENTS.cfpb.items[3].options[0].l, "Never", "CFPB item 4 frequency");
  assert.equal(INSTRUMENTS.cfpb.items[4].options[0].l, "Never", "CFPB item 5 frequency");
});
