// views/instrument-forms.js - form builders and readers for the survey
// instruments (onboarding, monthly check-in, and deep assessment).
//
// Blank-first policy: every instrument question and every required numeric /
// select field renders BLANK, with a red "*" marker and a data-required flag.
// Nothing is pre-checked or pre-filled, so a user can never coast past a
// question on a silent default. validateScope() below enforces this — it blocks
// Next / Submit until each visible required control is answered. (The Profile
// page and Weekly Review build their own PRE-FILLED inputs by calling
// numberField without opts, so those edit screens are unaffected.)

import { INSTRUMENTS, DEEP_INSTRUMENTS } from "../surveys.js";
import { validateProfile } from "../validation.js";
import { t, tp } from "../i18n.js";

// A red required marker. aria-hidden so the asterisk is not read out mid-label
// as a stray "star"; requiredness reaches assistive tech through the control's
// own aria-required instead. That second half used to be a claim rather than a
// fact — the marker was hidden and no aria-required existed anywhere, so a
// screen reader user got no signal at all and had to discover which fields
// block Next by tripping the validator. Every builder below now emits it.
const REQ_MARK = `<span class="req" aria-hidden="true">*</span>`;

// A number/text input. Backward-compatible: called with (id, label, value,
// attrs) it renders exactly as before (pre-filled, optional). The trailing
// opts turn on the blank-first behavior:
//   required    -> adds the "*" marker, aria-required, and data-required
//                  (the last is the validateScope gate; aria-required is what
//                  a screen reader actually announces, since data-* is inert)
//   placeholder -> a language-neutral hint (digits only, no translation)
//   field       -> a validation.js FIELD_CONSTRAINTS key, so validateScope can
//                  range-check the value on the same step it is entered
//   note        -> a caption under the input, wired to it with aria-describedby
//                  so it is heard rather than merely seen. Used by the weekly
//                  review to say where a pre-filled number came from. The caller
//                  owns escaping, exactly as it already does for `label`.
export function numberField(id, label, value, attrs = "", opts = {}) {
  const { required = false, placeholder = "", field = "", note = "" } = opts;
  const req = required ? ` ${REQ_MARK}` : "";
  const ph = placeholder ? ` placeholder="${placeholder}"` : "";
  const dataField = field ? ` data-field="${field}"` : "";
  const dataReq = required ? ` data-required="1" aria-required="true"` : "";
  const describedBy = note ? ` aria-describedby="${id}-note"` : "";
  const noteEl = note ? `\n      <p class="field-note" id="${id}-note">${note}</p>` : "";
  return `
    <div class="form-group">
      <label for="${id}">${label}${req}</label>
      <input type="number" id="${id}" class="form-control" value="${value}"${ph}${dataField}${dataReq}${describedBy} ${attrs}>${noteEl}
      <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
    </div>`;
}

// `itemIndex` identifies the item within its instrument (it names the radio
// group and must match the canonical scale). `displayIndex` is what the user
// sees; it differs only when some items are skipped as carried-over, so the
// numbering still reads 1, 2, 3 with no gaps.
//
// role="radiogroup" is deliberate, not decoration. aria-required is not a
// global attribute: ARIA supports it on radiogroup but not on the plain `group`
// role a bare <fieldset> maps to, so without the role the requiredness would be
// invalid markup that assistive tech is free to ignore. Overriding the role
// costs the legend-derived accessible name in some implementations, hence the
// explicit aria-labelledby back to the legend.
function radioQuestion(instrKey, itemIndex, item, displayIndex = itemIndex) {
  const base = `${instrKey}-q${itemIndex}`;
  return `
    <fieldset class="survey-question" data-required="1"
      role="radiogroup" aria-required="true" aria-labelledby="${base}-legend">
      <legend id="${base}-legend">${displayIndex + 1}. ${t(item.text)} ${REQ_MARK}</legend>
      <div class="radio-group">
        ${item.options.map(o => `
          <label class="radio-option">
            <input type="radio" name="${base}" value="${o.v}">
            ${t(o.l)}
          </label>`).join("")}
      </div>
      <span class="field-error d-none" id="${base}-err" aria-live="polite"></span>
    </fieldset>`;
}

export function instrumentBlock(instrKey) {
  const instr = INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${instr.items.map((item, i) => radioQuestion(instrKey, i, item)).join("")}
    </div>`;
}

export function collectInstrument(instrKey) {
  return INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}

// Deep-assessment instruments live in DEEP_INSTRUMENTS and use a "deep-" name
// prefix so their radios never collide with an onboarding form on the page.
//
// `askIndices` (surveys.js deepAskIndices) lists the items still to ask; the
// rest were already answered at onboarding and are carried over at scoring
// time, so re-asking them would put the same question to the user twice. The
// radio NAME keeps the item's original index while the visible number counts
// the asked items, so the form reads 1..n with no gaps yet collect and score
// stay aligned with the canonical scale.
export function deepInstrumentBlock(instrKey, askIndices) {
  const instr = DEEP_INSTRUMENTS[instrKey];
  const ask = askIndices || instr.items.map((_, i) => i);
  const carried = instr.items.length - ask.length;
  return `
    <div class="instrument-block">
      <p class="instrument-title">${t(instr.title)}</p>
      ${carried > 0 ? `<p class="carry-note">${tp("{n} answers carry over from your baseline — only the new questions are asked here.", { n: carried })}</p>` : ""}
      ${ask.map((itemIndex, position) =>
        radioQuestion(`deep-${instrKey}`, itemIndex, instr.items[itemIndex], position)
      ).join("")}
    </div>`;
}

export function collectDeepInstrument(instrKey, askIndices) {
  const instr = DEEP_INSTRUMENTS[instrKey];
  const ask = askIndices || instr.items.map((_, i) => i);
  return ask.map(i => {
    const el = document.querySelector(`input[name="deep-${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : instr.items[i].def;
  });
}

// --- REQUIRED-INPUT VALIDATION (blank-first policy) ---
//
// Native `required` cannot carry this: onboarding hides earlier steps with
// `.d-none`, and a browser refuses to focus an invalid control on a hidden step
// (it silently blocks submit with only a console error). So completeness is
// checked in JS against a DOM subtree — one onboarding step, or a whole
// single-page check-in / deep form.
//
// A control is skipped only when it sits inside a *conditionally* hidden block
// (e.g. the couples-only RAS block) — identified by a `.d-none` ancestor that is
// NOT a `.survey-page`. An off-screen onboarding step is `.survey-page.d-none`
// and IS validated, so its errors get marked before the caller jumps to it.
function isConditionallyHidden(el) {
  const hidden = el.closest(".d-none");
  return !!hidden && !hidden.classList.contains("survey-page");
}

// Show the message AND wire it to the control it belongs to.
//
// The error span is aria-live, so it is spoken once at validation time. That is
// not enough on its own: the callers only scrollIntoView, they never focus, so
// a user who tabs back to the field afterwards hears the label alone and the
// control sounds perfectly valid. aria-invalid plus an aria-describedby link
// makes the state and the reason travel WITH the field on every later visit.
// The link is appended, not assigned, so a field that already points at its
// `-note` caption keeps it.
function setError(errEl, message, ctrl) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.classList.remove("d-none");
  if (!ctrl) return;
  ctrl.setAttribute("aria-invalid", "true");
  if (!errEl.id) return;
  const ids = (ctrl.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  if (!ids.includes(errEl.id)) ids.push(errEl.id);
  ctrl.setAttribute("aria-describedby", ids.join(" "));
}

export function clearScopeErrors(scopeEl) {
  scopeEl.querySelectorAll(".field-error").forEach(e => {
    e.textContent = "";
    e.classList.add("d-none");
  });
  scopeEl.querySelectorAll(".input-invalid").forEach(e => e.classList.remove("input-invalid"));
  scopeEl.querySelectorAll(".survey-question-invalid").forEach(e => e.classList.remove("survey-question-invalid"));
  // Unwire what setError wired. Only the "-err" token is dropped, so a "-note"
  // caption survives a failed-then-corrected round trip.
  scopeEl.querySelectorAll("[aria-invalid]").forEach(el => {
    el.removeAttribute("aria-invalid");
    const kept = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/).filter(id => id && !id.endsWith("-err"));
    if (kept.length) el.setAttribute("aria-describedby", kept.join(" "));
    else el.removeAttribute("aria-describedby");
  });
}

// Validate every visible required control in `scopeEl`. Marks each offender's
// inline error and returns the first invalid element (or null when all pass),
// so the caller can scroll it into view.
export function validateScope(scopeEl) {
  clearScopeErrors(scopeEl);
  let firstInvalid = null;
  const fail = (el) => { if (!firstInvalid) firstInvalid = el; };
  const requiredMsg = t("Required.");

  // 1. Required numeric / text / select controls left blank.
  scopeEl.querySelectorAll("[data-required]").forEach(ctrl => {
    if (ctrl.tagName === "FIELDSET") return; // instruments handled in step 2
    if (isConditionallyHidden(ctrl)) return;
    if (String(ctrl.value).trim() === "") {
      setError(ctrl.parentElement.querySelector(".field-error"), requiredMsg, ctrl);
      ctrl.classList.add("input-invalid");
      fail(ctrl);
    }
  });

  // 2. Required instrument questions with no option chosen.
  scopeEl.querySelectorAll("fieldset.survey-question[data-required]").forEach(fs => {
    if (isConditionallyHidden(fs)) return;
    if (!fs.querySelector('input[type="radio"]:checked')) {
      setError(fs.querySelector(".field-error"), requiredMsg, fs);
      fs.classList.add("survey-question-invalid");
      fail(fs);
    }
  });

  // 3. Range-check any present numeric values, so an out-of-range entry is
  //    caught on the step it is typed, not deferred to a hidden final submit.
  const payload = {};
  scopeEl.querySelectorAll('input[type="number"][data-field]').forEach(inp => {
    if (!isConditionallyHidden(inp)) payload[inp.dataset.field] = inp.value;
  });
  const { errors } = validateProfile(payload);
  for (const [field, message] of Object.entries(errors)) {
    const inp = scopeEl.querySelector(`input[data-field="${field}"]`);
    if (!inp) continue;
    setError(inp.parentElement.querySelector(".field-error"), message, inp);
    inp.classList.add("input-invalid");
    fail(inp);
  }

  return firstInvalid;
}
