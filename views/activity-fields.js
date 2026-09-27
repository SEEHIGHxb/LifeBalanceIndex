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

// --- learning ---------------------------------------------------------------

// `id` is the old number box's id; `current` pre-selects an earlier answer.
export function learningMarkup(id, current = null) {
  const hours = withCurrent(LEARNING_STEPS.map(s => s.hours), current);
  const options = hours.map(h => {
    const step = LEARNING_STEPS.find(s => s.hours === h);
    const words = step ? t(step.label) : tp("About {n} h — your last answer", { n: h });
    const hint = step && h > 0 ? ` <span class="step-hint">${tp("about {n} h", { n: h })}</span>` : "";
    const checked = !isBlank(current) && Number(current) === h ? " checked" : "";
    return `
          <label class="radio-option">
            <input type="radio" name="${id}-pick" value="${h}"${checked}>
            <span>${words}${hint}</span>
          </label>`;
  }).join("");
  return `
    <div class="easy-field" data-easy="learning" data-out="${id}">
      <fieldset class="survey-question" data-required="1"
        role="radiogroup" aria-required="true" aria-labelledby="${id}-legend">
        <legend id="${id}-legend">${t("How much of your week goes to learning something on purpose?")}</legend>
        <div class="radio-group">${options}
        </div>
        <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
      </fieldset>
      ${hidden(id, valueAttr(current))}
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
      <p class="wk-how">${t("Tap a day, or drag across several. One day can hold more than one kind.")}</p>
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

function syncLearning(field) {
  const pick = field.querySelector("input[type=radio]:checked");
  put(field.querySelector(`#${field.dataset.out}`), pick ? pick.value : "");
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
  root.querySelectorAll('[data-easy="learning"]').forEach(syncLearning);
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
function bindPainting(grid) {
  let paintOn = null;
  let endedAt = 0;
  grid.addEventListener("pointerdown", (e) => {
    const box = e.target.closest(".wk-cell")?.querySelector("input");
    if (!box || e.button !== 0) return;
    e.preventDefault();
    paintOn = !box.checked;
    setDay(box, paintOn);
    box.focus({ preventScroll: true });
    grid.setPointerCapture?.(e.pointerId);
  });
  grid.addEventListener("pointermove", (e) => {
    if (paintOn === null) return;
    const box = document.elementFromPoint(e.clientX, e.clientY)?.closest(".wk-cell")?.querySelector("input");
    if (box && grid.contains(box)) setDay(box, paintOn);
  });
  const end = () => {
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

// Wires every activity field inside `root` and computes their values once.
export function bindActivityFields(root) {
  root.querySelectorAll('[data-easy="week"] .wk-grid').forEach(bindPainting);
  root.addEventListener("change", (e) => {
    const field = e.target.closest("[data-easy]");
    if (!field) return;
    if (field.dataset.easy === "learning") {
      syncLearning(field);
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
  syncActivityFields(root);
}
