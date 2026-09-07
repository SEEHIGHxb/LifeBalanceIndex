// Instrument fidelity — does what we ADMINISTER match what was PUBLISHED?
//
// Fourteen research rounds have asked "who am I comparing this user to?" and
// none has asked "am I asking the question the instrument asks?". That gap is
// where v77's questionnaire defects were found, and this file is the standing
// guard against their return. It checks item WORDING and RESPONSE SCALES, not
// scoring — scoring.js is covered elsewhere.
//
// Each assertion names the published source it defends. When an instrument is
// deliberately abbreviated (CFPB-5, RAS-3, GSE-6), the note says so: the guard
// is against silent drift, not against documented adaptation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";
import { TH } from "../th.js";

const textOf = (key, i) => INSTRUMENTS[key].items[i].text;
const thaiOf = (key, i) => TH[textOf(key, i)];

// --- ST-5, Thai Department of Mental Health -----------------------------
//
// The ONLY instrument in the app that is Thai in origin, and the one with the
// most to lose from drift: scoring.js scores it against the DMH's own published
// cut-offs (<=4 / 5-7 / 8-9 / 10+). Those bands were established against the
// DMH's exact Thai wording, so an item that asks something else is scored on
// bands that do not describe it.
test("ST-5 item 1 asks the DMH question, including hypersomnia", () => {
  // The DMH item is "มีปัญหาการนอน นอนไม่หลับหรือนอนมาก" — trouble sleeping,
  // sleeping too little OR TOO MUCH. Until v77 the app asked about trouble
  // sleeping "because of worry": it had ADDED a causal attribution the original
  // does not make, and DROPPED oversleeping, which is half the item's content.
  // A person who oversleeps under stress scored 0 on an item written to catch
  // exactly them.
  const th = thaiOf("st5", 0);
  assert.match(th, /นอนไม่หลับ/, "insomnia limb present");
  assert.match(th, /นอนมาก/, "hypersomnia limb present — the half that was missing");
  assert.doesNotMatch(th, /กังวลใจ|คิดมาก/, "no causal attribution the DMH item does not make");
  assert.match(textOf("st5", 0), /too much/, "the English must carry the same second limb");
});

test("ST-5 item 4 asks the DMH question, without the added third barrel", () => {
  // The DMH item is "รู้สึกเบื่อ เซ็ง" — bored, fed up. Until v77 the app
  // appended "ท้อแท้" (discouraged/dejected), a heavier third state.
  const th = thaiOf("st5", 3);
  assert.match(th, /เบื่อ/);
  assert.match(th, /เซ็ง/);
  assert.doesNotMatch(th, /ท้อแท้/, "no third barrel beyond the published two");
});

test("the other three ST-5 items still match the DMH wording", () => {
  // These never drifted. Pinned so a future edit cannot quietly change them.
  assert.match(thaiOf("st5", 1), /สมาธิ/);
  assert.match(thaiOf("st5", 2), /หงุดหงิด/);
  assert.match(thaiOf("st5", 4), /ไม่อยากพบปะผู้คน/);
});

test("ST-5 keeps its published 4-point scale", () => {
  for (const item of INSTRUMENTS.st5.items) {
    assert.deepEqual(item.options.map(o => o.v), [0, 1, 2, 3]);
  }
});

// --- UCLA-3 loneliness ---------------------------------------------------
test("UCLA-3 'left out' asks about EXCLUSION, not falling behind", () => {
  // The Thai rendered this as "ถูกทิ้งไว้ข้างหลัง" — left BEHIND, which in Thai
  // reads as falling behind others in life or status. That is social
  // comparison, a different construct from loneliness. The score is placed
  // against England Community Life Survey bands collected on the exclusion
  // reading, so the mismatch reached the benchmark as well as the item.
  const th = thaiOf("ucla", 1);
  assert.doesNotMatch(th, /ทิ้งไว้ข้างหลัง/, "not 'left behind' — that is social comparison");
  assert.match(th, /ไม่ได้เป็นส่วนหนึ่ง/, "not being part of the group");
  // SINGLE-BARRELLED. A first pass at this fix used
  // "ถูกกีดกัน ไม่ได้เป็นส่วนหนึ่งของกลุ่ม", which had two faults: ถูกกีดกัน carries an
  // active-barring / discrimination sense (cf. กีดกันทางเพศ) far stronger than
  // UCLA's mild "left out", and pairing it with a second clause made the item
  // double-barrelled — the exact defect removed from ST-5 item 4 in the same
  // release. One clause, matched in register to the original.
  assert.doesNotMatch(th, /กีดกัน/, "no discrimination connotation, and no second barrel");
});

// --- RAS, Hendrick -------------------------------------------------------
//
// Hendrick labels positions A, C and E DIFFERENTLY FOR EVERY ITEM. Applying one
// generic set to all of them made three items unanswerable: "how satisfied are
// you with your relationship?" answered with "Very poorly", and "how much do
// you love your partner?" with "Extremely well".
test("every RAS item carries anchors that fit its own question", () => {
  const first = k => INSTRUMENTS.ras.items[k].options[0].l;
  const last = k => INSTRUMENTS.ras.items[k].options[4].l;
  assert.equal(first(1), "Unsatisfied", "the satisfaction item runs on satisfaction");
  assert.equal(last(1), "Extremely satisfied");
  assert.equal(first(2), "Poor", "the comparison item runs Poor -> Excellent");
  assert.equal(last(2), "Excellent");

  const ras7 = DEEP_INSTRUMENTS.ras7.items;
  assert.equal(ras7[4].options[0].l, "Hardly at all", "expectations item, published anchor A");
  assert.equal(ras7[4].options[4].l, "Completely", "expectations item, published anchor E");
  assert.equal(ras7[5].options[4].l, "Very much", "the love item is not answered with 'Extremely well'");

  // No item may be answered with an anchor set built for a different question.
  for (const items of [INSTRUMENTS.ras.items, ras7]) {
    for (const item of items) {
      if (/satisfied/i.test(item.text)) {
        assert.match(item.options[0].l, /satisf/i, `"${item.text}" needs satisfaction anchors`);
      }
      if (/how much do you love/i.test(item.text)) {
        assert.doesNotMatch(item.options[4].l, /well/i, `"${item.text}" cannot end in "well"`);
      }
    }
  }
});

test("RAS values stay 1-5 ascending, so no stored raw sum moves", () => {
  // The v77 anchor split is a LABEL change. Any value change would silently
  // rescale every stored baseline.
  for (const items of [INSTRUMENTS.ras.items, DEEP_INSTRUMENTS.ras7.items]) {
    for (const item of items) {
      assert.deepEqual([...item.options].map(o => o.v).sort((a, b) => a - b), [1, 2, 3, 4, 5]);
    }
  }
});

// --- WHO-5 ---------------------------------------------------------------
test("WHO-5 keeps all five published items on the 0-5 scale", () => {
  assert.equal(INSTRUMENTS.who5.items.length, 5);
  for (const item of INSTRUMENTS.who5.items) {
    assert.deepEqual([...item.options].map(o => o.v).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
  assert.match(textOf("who5", 0), /cheerful and in good spirits/);
  assert.match(textOf("who5", 3), /fresh and rested/);
});

// --- Every instrument ----------------------------------------------------
test("no instrument item is missing its Thai translation", () => {
  // BOTH banks. An earlier version of this test walked INSTRUMENTS only, which
  // left the deep bank uncovered — including ras7, whose items the same release
  // edited. A fidelity guard that skips half the instruments is not a guard.
  for (const [bank, set] of [["INSTRUMENTS", INSTRUMENTS], ["DEEP_INSTRUMENTS", DEEP_INSTRUMENTS]]) {
    for (const [key, inst] of Object.entries(set)) {
      for (const [i, item] of inst.items.entries()) {
        assert.ok(TH[item.text], `${bank}.${key} item ${i} has no Thai: "${item.text}"`);
      }
    }
  }
});

test("every instrument option label is translated, in both banks", () => {
  // The RAS split added five new anchor sets. A missing anchor renders as raw
  // English inside an otherwise-Thai form, which is how a respondent ends up
  // answering a question on a scale they cannot read.
  for (const set of [INSTRUMENTS, DEEP_INSTRUMENTS]) {
    for (const [key, inst] of Object.entries(set)) {
      for (const item of inst.items) {
        for (const opt of item.options) {
          assert.ok(TH[opt.l], `${key}: option "${opt.l}" has no Thai`);
        }
      }
    }
  }
});
