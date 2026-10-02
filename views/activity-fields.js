// views/activity-fields.js - the two questions people could not answer as
// numbers (the owner, 2026-09-27: "a vague question that people doesn't
// measure these kind of number ... many user need to ask me about what they
// are to answer"): weekly learning hours, and the IPAQ exercise days and
// minutes. Used by the journey and the weekly review.
//
//   Learning: one question with six everyday answers, lowest first, each worth
//   a set number of hours.
//
//   Exercise: paint the week. Three rows (hard, moderate, walking) of seven
//   days; tap a day or drag across several, and one day can hold more than one
//   kind. Then one tap for how long a usual session of each kind lasts.
//
//   v120: donations and volunteering as everyday steps like learning, and
//   single-use plastic as a tally of things a usual day brings. Since v175
//   each thing is counted, not ticked.
//
// THE STORED NUMBERS DO NOT CHANGE. Each question writes the same values the
// old number boxes held into hidden number inputs with the old ids, so the
// submit paths, validation, drafts, recaps and scoring read them exactly as
// before (tests/activity-fields.test.mjs). A value from an earlier answer or a
// connected app that is not one of the steps is offered as a step of its own,
// already chosen, so confirming last week's answer never changes it.

import { t, tp, dateLocale } from "../i18n.js";

export const LEARNING_STEPS = Object.freeze([
  { hours: 0, label: "None" },
  { hours: 1, label: "A video or an article here and there" },
  { hours: 3, label: "About one evening's worth" },
  { hours: 5, label: "A couple of evenings" },
  { hours: 8, label: "A class plus some practice" },
  { hours: 12, label: "Like a part-time course, or more" }
]);

// v120, the same treatment for the other three boxes (the owner: "change these
// part as well"). Each step is a month someone can recognise, worth a set
// number. The scoring's own breakpoints sit between the steps: 500 baht or 4
// hours a month max their factors (scoring.js), so each side of them has an
// answer.
export const DONATION_STEPS = Object.freeze([
  { value: 0, label: "Nothing this month" },
  { value: 50, label: "Spare change in a donation box" },
  { value: 200, label: "Making merit at the temple now and then" },
  { value: 500, label: "A regular gift, like a monthly pledge" },
  { value: 1500, label: "Supporting a cause I care about every month" },
  { value: 5000, label: "A big gift, like sponsoring a child's schooling" }
]);

export const VOLUNTEER_STEPS = Object.freeze([
  { value: 0, label: "None this month" },
  { value: 1, label: "A small favour for a group, about an hour" },
  { value: 3, label: "One afternoon helping out" },
  { value: 6, label: "A couple of afternoons" },
  { value: 12, label: "A few hours every week" },
  { value: 24, label: "Most weekends, or more" }
]);

// Plastic is counted, not estimated: how many of each thing a usual day
// brings, with "Something else" for what the list misses (v175, the owner: a
// day can bring five cups, and a tick counted them as one). The total is the
// stored count, as the old box held it.
export const PLASTIC_ITEMS = Object.freeze([
  "Shopping bags",
  "Bags for food to go (curry, soup, ice)",
  "Straws",
  "Plastic cups (iced coffee, bubble tea)",
  "Food boxes or foam trays",
  "Plastic spoons or forks",
  "Bottles of water or soft drinks",
  "Snack or sauce wrappers",
  "Something else"
]);
const PLASTIC_KEY = "lifequest_plastic_items";
// Two digits a thing; the total is held to the stored field's own maximum
// (validation.js).
const ITEM_MAX = 99;
const TALLY_MAX = 100;

// Examples of what counts, in the IPAQ's own terms: vigorous is too hard to
// chat through, moderate is faster breathing that still allows talk, and a
// walk counts from ten minutes.
export const KINDS = Object.freeze([
  {
    key: "vig", name: "Hard exercise", length: "How long is a usual hard session?",
    hint: "You breathe hard and can't chat: running, football, fast cycling, a gym workout."
  },
  {
    key: "mod", name: "Moderate exercise", length: "How long is a usual moderate session?",
    hint: "Breathing faster but you can still talk: easy cycling, casual badminton, carrying loads, dancing."
  },
  {
    key: "walk", name: "Walking", length: "How long is a usual walk?",
    hint: "Any walk of 10 minutes or more: to the bus, around the market, with the dog."
  }
]);

export const LENGTHS = Object.freeze([10, 20, 30, 45, 60, 90, 120]);
const DAYS = 7;
const PATTERN_KEY = "lifequest_week_days";
// A drag that ends is followed by a click; within this long, that click is the
// drag's own and must not toggle the day back.
const DRAG_CLICK_MS = 400;

export const minutesLabel = (m) => m === 120 ? tp("{n} h or more", { n: 2 })
  : m >= 60 && m % 30 === 0 ? tp("{n} h", { n: m / 60 })
  : tp("{n} min", { n: m });

const isBlank = (v) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v));

// The steps to offer: the standard ones, plus the current value when it is not
// one of them.
export function withCurrent(steps, current) {
  if (isBlank(current)) return [...steps];
  const n = Number(current);
  return steps.includes(n) ? [...steps] : [...steps, n].sort((a, b) => a - b);
}

// What the painted week means, as the old boxes' values. Blank ("") until the
// week is answered at all (a day painted, or "none" ticked), so the blank-first
// rule still holds; after that an unpainted kind is 0 days and 0 minutes, and a
// painted one waits for its length.
export function summarizeWeek({ cells, none, lengths }) {
  const answered = none || KINDS.some(k => cells[k.key].some(Boolean));
  return Object.fromEntries(KINDS.map(({ key }) => {
    const days = cells[key].filter(Boolean).length;
    const mins = days ? (lengths[key] ?? "") : (answered ? 0 : "");
    return [key, { days: answered ? days : "", mins }];
  }));
}

const weekdayNames = (style) => {
  const fmt = new Intl.DateTimeFormat(dateLocale(), { weekday: style });
  // 1 January 2024 was a Monday.
  return Array.from({ length: DAYS }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
};

function readPattern() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(PATTERN_KEY) || "null");
  } catch {
    return null;
  }
}

// Which days to paint for a count carried over from an earlier answer: the
// days last painted, if they still add up to it, otherwise the first days of
// the week.
export function daysFor(key, count, pattern) {
  const saved = pattern?.[key];
  if (Array.isArray(saved) && saved.length === DAYS && saved.filter(Boolean).length === count) return saved.map(Boolean);
  return Array.from({ length: DAYS }, (_, i) => i < count);
}

const hidden = (id, extra = "") => `<input type="number" id="${id}" hidden step="any"${extra}>`;
const valueAttr = (v) => isBlank(v) ? "" : ` value="${Number(v)}"`;

// v158, the owner's Weekly Review cut list: a monthly habit rarely changes in
// a week, so the review shows only last week's answer, folded, and "Change"
// opens the whole list (css/weekly.css hides the rest while folded). Folded
// only when there is an answer to show; the journey never folds.
const folded = (fold, current) => fold && !isBlank(current) ? " data-folded" : "";
const changeButton = (fold, current, id) => folded(fold, current)
  ? `<button type="button" class="easy-change" aria-expanded="false" aria-controls="${id}-choices">${t("Change")}</button>`
  : "";

// --- learning ---------------------------------------------------------------

// One question of everyday steps, lowest first. `id` is the old number box's
// id; `current` pre-selects an earlier answer. `hint(n)` is the number under
// a step's words, `last(n)` the words for an earlier answer between steps.
export function stepsMarkup(id, { question, steps, hint, last, fold = false }, current = null) {
  const values = withCurrent(steps.map(s => s.value), current);
  const options = values.map(v => {
    const step = steps.find(s => s.value === v);
    const words = step ? t(step.label) : last(v);
    const under = step && v > 0 ? ` <span class="step-hint">${hint(v)}</span>` : "";
    const checked = !isBlank(current) && Number(current) === v ? " checked" : "";
    return `
          <label class="radio-option">
            <input type="radio" name="${id}-pick" value="${v}"${checked}>
            <span>${words}${under}</span>
          </label>`;
  }).join("");
  return `
    <div class="easy-field" data-easy="steps" data-out="${id}"${folded(fold, current)}>
      <fieldset class="survey-question" data-required="1"
        role="radiogroup" aria-required="true" aria-labelledby="${id}-legend">
        <legend id="${id}-legend">${question}</legend>
        <div class="radio-group" id="${id}-choices">${options}
        </div>
        ${changeButton(fold, current, id)}
        <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
      </fieldset>
      ${hidden(id, valueAttr(current))}
    </div>`;
}

export function learningMarkup(id, current = null, { fold = false } = {}) {
  return stepsMarkup(id, {
    question: t("How much of your week goes to learning something on purpose?"),
    steps: LEARNING_STEPS.map(s => ({ value: s.hours, label: s.label })),
    hint: (n) => tp("about {n} h", { n }),
    last: (n) => tp("About {n} h · your last answer", { n }),
    fold
  }, current);
}

const baht = (n) => Number(n).toLocaleString("en-US");

export function donationMarkup(id, current = null, { fold = false } = {}) {
  return stepsMarkup(id, {
    question: t("What does your giving look like in a usual month?"),
    steps: DONATION_STEPS,
    hint: (n) => tp("about {amount} baht", { amount: baht(n) }),
    last: (n) => tp("{amount} baht · your last answer", { amount: baht(n) }),
    fold
  }, current);
}

export function volunteerMarkup(id, current = null, { fold = false } = {}) {
  return stepsMarkup(id, {
    question: t("How much time do you give to helping others, unpaid, in a usual month?"),
    steps: VOLUNTEER_STEPS,
    hint: (n) => tp("about {n} h a month", { n }),
    last: (n) => tp("{n} h a month · your last answer", { n }),
    fold
  }, current);
}

// --- the plastic tally ------------------------------------------------------

// One thing's count from what is in its box: digits only, 0 to ITEM_MAX.
export function clampCount(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.min(ITEM_MAX, Math.max(0, n)) : 0;
}

// Last time's counts, one a thing. Until v175 they were ticks (true is one
// piece) and there was no "Something else", which comes back as 0.
function readCounts() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(PLASTIC_KEY) || "null");
    if (!Array.isArray(saved) || saved.length > PLASTIC_ITEMS.length) return null;
    return PLASTIC_ITEMS.map((_, i) => clampCount(Number(saved[i]) || 0));
  } catch {
    return null;
  }
}

// The count, as the old box held it: blank until something is counted or
// "none" is ticked, then the counts plus an earlier answer kept whole.
export function summarizeTally({ counts, none, carried }) {
  const total = counts.reduce((sum, c) => sum + clampCount(c), 0) + carried;
  return total || none ? Math.min(TALLY_MAX, total) : "";
}

// One thing: its name, then a count to step with - and + or to type.
const counterRow = (id, label, i, n) => `
        <div class="tally-item${n ? " is-on" : ""}">
          <label class="tally-name" for="${id}-i${i}">${t(label)}</label>
          <span class="tally-step">
            <button type="button" class="tally-less" data-step="-1" aria-label="${tp("One fewer: {item}", { item: t(label) })}">−</button>
            <input type="text" id="${id}-i${i}" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="0"${n ? ` value="${n}"` : ""}>
            <button type="button" class="tally-more" data-step="1" aria-label="${tp("One more: {item}", { item: t(label) })}">+</button>
          </span>
        </div>`;

// `current` (the review) is last week's count. The counts given then come
// back if they still add up to it; otherwise the count is kept whole as one
// ticked line of its own, so confirming it changes nothing.
export function tallyMarkup(id, current = null, { fold = false } = {}) {
  const n = isBlank(current) ? null : Math.max(0, Math.round(Number(current)));
  const saved = n ? readCounts() : null;
  const counts = saved && saved.reduce((a, b) => a + b, 0) === n ? saved : [];
  const carried = n && !counts.length ? n : 0;
  const items = PLASTIC_ITEMS.map((label, i) => counterRow(id, label, i, counts[i] || 0)).join("");
  const kept = carried ? `
        <label class="tally-item tally-last">
          <input type="checkbox" name="${id}-last" value="${carried}" checked>
          <span>${tp("{n} pieces a day · your last answer", { n: carried })}</span>
        </label>` : "";
  return `
    <div class="easy-field tally" data-easy="tally" data-out="${id}"${folded(fold, n)}>
      <fieldset class="survey-question" aria-labelledby="${id}-legend">
        <legend id="${id}-legend">${t("How many of each does a usual day bring you? Count each one you use once and throw away.")}</legend>
        <div class="tally-grid" id="${id}-choices">${items}${kept}
        </div>
        <label class="wk-none">
          <input type="checkbox" name="${id}-none" value="1"${n === 0 ? " checked" : ""}>
          ${t("None")}
        </label>
        ${changeButton(fold, n, id)}
        <p class="tally-count" aria-live="polite"></p>
        <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
      </fieldset>
      ${hidden(id, ` min="0" max="100" data-required="1"${valueAttr(n)}`)}
    </div>`;
}

// --- the painted week -------------------------------------------------------

// `ids` maps each kind to its old boxes: { vig: { days, mins }, ... }.
// `current` (the review) is { vig: { days, mins }, ... } from an earlier
// answer; without it every day starts unpainted. `note` is a line of the
// caller's (a connected app's provenance), already escaped.
export function weekMarkup(prefix, ids, current = null, note = "") {
  const short = weekdayNames("narrow");
  const long = weekdayNames("long");
  const pattern = current ? readPattern() : null;
  const count = (key) => current ? Math.max(0, Math.min(DAYS, Math.round(Number(current[key]?.days) || 0))) : 0;
  const allZero = current && KINDS.every(k => !count(k.key));

  const rows = KINDS.map(({ key, name, hint }) => {
    const painted = current ? daysFor(key, count(key), pattern) : [];
    const cells = short.map((d, i) => `
          <label class="wk-cell">
            <input type="checkbox" name="${ids[key].days}-d${i}" value="1" aria-label="${long[i]}"${painted[i] ? " checked" : ""}>
            <span aria-hidden="true">${d}</span>
          </label>`).join("");
    return `
        <div class="wk-row" data-kind="${key}" role="group" aria-labelledby="${prefix}-${key}-name">
          <p class="wk-kind"><b id="${prefix}-${key}-name">${t(name)}</b> <span>${t(hint)}</span></p>
          ${cells}
        </div>`;
  }).join("");

  const lengths = KINDS.map(({ key, length }) => {
    const days = count(key);
    const mins = current ? Number(current[key]?.mins) || 0 : null;
    const chosen = days && mins ? mins : null;
    const chips = withCurrent(LENGTHS, chosen).map(m => `
            <label class="radio-option">
              <input type="radio" name="${ids[key].mins}-len" value="${m}"${m === chosen ? " checked" : ""}>
              ${minutesLabel(m)}
            </label>`).join("");
    return `
      <fieldset class="survey-question wk-len${days ? "" : " d-none"}" data-kind="${key}" data-required="1"
        role="radiogroup" aria-required="true" aria-labelledby="${ids[key].mins}-legend">
        <legend id="${ids[key].mins}-legend">${t(length)}</legend>
        <div class="radio-group">${chips}
        </div>
        <span class="field-error d-none" id="${ids[key].mins}-err" aria-live="polite"></span>
        ${hidden(ids[key].mins, current ? valueAttr(days ? chosen : 0) : "")}
      </fieldset>`;
  }).join("");

  const days = KINDS.map(({ key }) =>
    hidden(ids[key].days, ` data-kind="${key}" min="0" max="7" data-required="1"${current ? valueAttr(count(key)) : ""}`)
  ).join("");
  return `
    <div class="easy-field wk" data-easy="week">
      ${note ? `<p class="field-note">${note}</p>` : ""}
      <p class="wk-how">${t("Tap or drag across days. A day can hold more than one kind.")}</p>
      <div class="wk-grid">${rows}
      </div>
      <label class="wk-none">
        <input type="checkbox" name="${prefix}-week-none" value="1"${allZero ? " checked" : ""}>
        ${t("None of these in my week")}
      </label>
      <div class="wk-out">
        ${days}
        <span class="field-error d-none" id="${ids.vig.days}-err" aria-live="polite"></span>
      </div>
      ${lengths}
    </div>`;
}

// --- behaviour --------------------------------------------------------------

// Writes a hidden box and tells the form, as typing in the old box did: the
// journey counts a field as answered, and both forms save their draft, on
// `input`.
function put(el, value) {
  if (!el || el.value === String(value)) return;
  el.value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncSteps(field) {
  const pick = field.querySelector("input[type=radio]:checked");
  put(field.querySelector(`#${field.dataset.out}`), pick ? pick.value : "");
}

function syncTally(field) {
  const boxes = [...field.querySelectorAll(".tally-step input")];
  const counts = boxes.map(b => clampCount(b.value));
  boxes.forEach((b, i) => b.closest(".tally-item").classList.toggle("is-on", counts[i] > 0));
  const last = field.querySelector(`input[name="${field.dataset.out}-last"]`);
  const none = field.querySelector(".wk-none input").checked;
  const count = summarizeTally({ counts, none, carried: last?.checked ? Number(last.value) : 0 });
  put(field.querySelector(`#${field.dataset.out}`), count);
  field.querySelector(".tally-count").textContent = count === "" ? ""
    : tp("{n} pieces a day", { n: count });
  if (count !== "") {
    const err = field.querySelector(".field-error");
    err.textContent = "";
    err.classList.add("d-none");
  }
  try {
    globalThis.localStorage?.setItem(PLASTIC_KEY, JSON.stringify(counts));
  } catch {
    // Only a convenience for next week's review.
  }
}

function syncWeek(week) {
  const cells = {};
  const lengths = {};
  for (const { key } of KINDS) {
    cells[key] = [...week.querySelectorAll(`.wk-row[data-kind="${key}"] .wk-cell input`)].map(i => i.checked);
    const pick = week.querySelector(`.wk-len[data-kind="${key}"] input[type=radio]:checked`);
    lengths[key] = pick ? Number(pick.value) : null;
  }
  const sum = summarizeWeek({ cells, none: week.querySelector(".wk-none input").checked, lengths });
  for (const { key } of KINDS) {
    const len = week.querySelector(`.wk-len[data-kind="${key}"]`);
    // Hidden, the validators skip it: a `.d-none` block is a conditional one.
    len.classList.toggle("d-none", !sum[key].days);
    put(week.querySelector(`.wk-out input[data-kind="${key}"]`), sum[key].days);
    put(len.querySelector("input[type=number]"), sum[key].mins);
  }
  // A week answered at last takes away the "Required." an earlier Next left.
  if (sum.vig.days !== "") {
    const err = week.querySelector(".wk-out .field-error");
    err.textContent = "";
    err.classList.add("d-none");
  }
  try {
    globalThis.localStorage?.setItem(PATTERN_KEY, JSON.stringify(cells));
  } catch {
    // Only a convenience for next week's review.
  }
}

// Every value recomputed from what is on screen. Call after anything sets the
// controls from script (a draft restore, a form reset), which fires no events.
export function syncActivityFields(root) {
  root.querySelectorAll('[data-easy="steps"]').forEach(syncSteps);
  root.querySelectorAll('[data-easy="tally"]').forEach(syncTally);
  root.querySelectorAll('[data-easy="week"]').forEach(syncWeek);
}

function setDay(box, on) {
  if (box.checked === on) return;
  box.checked = on;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

// Drag to paint: the first day pressed decides whether the drag paints or
// clears, and every day the pointer crosses, in any row, follows. Keyboard and
// screen readers use the days as the checkboxes they are.
//
// A finger starts painting only once it moves sideways (v174, the owner: the
// grid trapped the page's scroll). An up-and-down swipe is left to the page
// (touch-action: pan-y in css/journey.css), and a tap is the checkbox's own
// click. A mouse paints from the press, as before.
const PAINT_SLOP_PX = 8;

function bindPainting(grid) {
  let paintOn = null;
  let endedAt = 0;
  let pending = null;
  const begin = (box, e) => {
    paintOn = !box.checked;
    setDay(box, paintOn);
    box.focus({ preventScroll: true });
    grid.setPointerCapture?.(e.pointerId);
  };
  grid.addEventListener("pointerdown", (e) => {
    const box = e.target.closest(".wk-cell")?.querySelector("input");
    if (!box || e.button !== 0) return;
    if (e.pointerType === "touch") {
      pending = { box, x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    begin(box, e);
  });
  grid.addEventListener("pointermove", (e) => {
    if (pending) {
      const dx = Math.abs(e.clientX - pending.x);
      const dy = Math.abs(e.clientY - pending.y);
      if (dx < PAINT_SLOP_PX || dx < dy) return;
      const { box } = pending;
      pending = null;
      begin(box, e);
    }
    if (paintOn === null) return;
    const box = document.elementFromPoint(e.clientX, e.clientY)?.closest(".wk-cell")?.querySelector("input");
    if (box && grid.contains(box)) setDay(box, paintOn);
  });
  const end = () => {
    pending = null;
    if (paintOn === null) return;
    paintOn = null;
    endedAt = Date.now();
  };
  grid.addEventListener("pointerup", end);
  grid.addEventListener("pointercancel", end);
  // The press already painted; the click the browser sends after it would
  // toggle the day straight back.
  grid.addEventListener("click", (e) => {
    if (e.detail > 0 && Date.now() - endedAt < DRAG_CLICK_MS && e.target.closest(".wk-cell")) e.preventDefault();
  });
}

// A count and "None" rule each other out: "None" empties every count and the
// kept answer, and any count above zero takes "None" off.
function editTally(field, target) {
  const none = field.querySelector(".wk-none input");
  if (target === none) {
    if (none.checked) {
      field.querySelectorAll(".tally-step input").forEach(b => { b.value = ""; });
      field.querySelectorAll(".tally-last input").forEach(b => { b.checked = false; });
    }
  } else if (target.type === "text" ? clampCount(target.value) > 0 : target.checked) {
    none.checked = false;
  }
  syncTally(field);
}

// - and + step a count; typing keeps digits only.
function stepTally(button) {
  const box = button.closest(".tally-step").querySelector("input");
  const n = clampCount(clampCount(box.value) + Number(button.dataset.step));
  box.value = n ? String(n) : "";
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

// Wires every activity field inside `root` and computes their values once.
export function bindActivityFields(root) {
  root.querySelectorAll('[data-easy="week"] .wk-grid').forEach(bindPainting);
  // "Change" unfolds the whole list; focus goes to the answer already chosen,
  // so the arrow keys move straight on from it.
  root.addEventListener("click", (e) => {
    const step = e.target.closest(".tally-step button");
    if (step) {
      stepTally(step);
      return;
    }
    const button = e.target.closest(".easy-change");
    const field = button?.closest("[data-easy]");
    if (!field) return;
    field.removeAttribute("data-folded");
    button.setAttribute("aria-expanded", "true");
    button.hidden = true;
    field.querySelector("input:checked")?.focus();
  });
  root.addEventListener("change", (e) => {
    const field = e.target.closest("[data-easy]");
    if (!field) return;
    if (field.dataset.easy === "steps") {
      syncSteps(field);
      return;
    }
    if (field.dataset.easy === "tally") {
      editTally(field, e.target);
      return;
    }
    // Painting a day and "none of these" rule each other out.
    if (e.target.closest(".wk-none")) {
      if (e.target.checked) field.querySelectorAll(".wk-cell input:checked").forEach(b => setDay(b, false));
    } else if (e.target.closest(".wk-cell") && e.target.checked) {
      field.querySelector(".wk-none input").checked = false;
    }
    syncWeek(field);
  });
  root.addEventListener("input", (e) => {
    const box = e.target.closest(".tally-step input");
    if (!box) return;
    const digits = box.value.replace(/[^0-9]/g, "").slice(0, 2);
    if (digits !== box.value) box.value = digits;
    editTally(box.closest("[data-easy]"), box);
  });
  syncActivityFields(root);
}
