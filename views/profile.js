// views/profile.js - the Profile & Data page (#/profile).
//
// One place to hand-edit the SLOW-MOVING facts about the user — name, age,
// gender, region, employment, relationship status, income, body metrics,
// long-term investments, and birthday. The fast,
// behaviour-driven quantities (sleep, water, activity, plastics, donations...)
// are deliberately NOT here: those are measured once a week in the Weekly
// Review, not typed in on demand.
//
// Score-affecting edits (income, region, age, weight/height, investments) are
// re-measured through the same formulas onboarding uses and applied as deltas
// by stateManager.updateProfile — see the note there. Gender and employment
// move only benchmarks/recommendations, and a relationship-status flip refines
// the relationships score at the next monthly check-in (no RAS answers exist to
// recompute it now); the UI says both of these out loud.
//
// This page is also the home of the data controls (Export / Import / Reset),
// relocated from the header. Those buttons keep the ids the existing app.js
// handlers expect, and app.js binds them after this view renders.
//
// And it is where the sibling apps on this origin are switched on. The toggles
// here control READING only, are off until asked for, and store their setting
// outside the app's schema — see connections.js. A connection pre-fills the
// Weekly Review; it never submits one, so the user still confirms every number
// that reaches a score.

import { stateManager } from "../state.js";
import { numberField, markField } from "./instrument-forms.js";
import { birthdayFields, escapeHtml, noteBook, footnoteList, bindFootnotes } from "./helpers.js";
import { validateProfile } from "../validation.js";
import { sanitizeBirthday } from "../sanitize.js";
import {
  CONNECTION_SOURCES, SOURCE_NAMES, readConnection, readConnectionPrefs,
  setConnectionPref, connectionStatus
} from "../connections.js";
import { isoWeekKey } from "../season.js";
import { t, tp, dateLocale } from "../i18n.js";
import { deviceReducesMotion, isReduced, setReduceMotionPref } from "../motion.js";
import { textSection, pageHead, label } from "./stage-page.js";

const AGE_MIN = 15;
const AGE_MAX = 100;

// field name (as validateProfile / the birthday check reports it) -> the id of
// its inline <span class="field-error"> in the DOM.
const ERR_IDS = {
  income: "pf-income-err", weight: "pf-weight-err", height: "pf-height-err",
  name: "pf-name-err", age: "pf-age-err", birthday: "pf-birthday-err",
  familySupport: "pf-family-err"
};

// A labelled <select> prefilled to `current`. options: [{ value, label }].
function selectField(id, label, options, current) {
  const opts = options.map(o =>
    `<option value="${escapeHtml(o.value)}"${o.value === current ? " selected" : ""}>${o.label}</option>`
  ).join("");
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <select id="${id}" class="form-control">${opts}</select>
    </div>`;
}

// A labelled text input, value HTML-escaped (name is user-authored free text).
function textField(id, label, value, attrs = "") {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="text" id="${id}" class="form-control" value="${escapeHtml(value)}" ${attrs}>
      <span class="field-error d-none" id="${id}-err" aria-live="polite"></span>
    </div>`;
}

// --- CONNECTED APPS ---

// App names are proper nouns and stay untranslated. Everything else is a
// literal inside t(), so the i18n coverage guard can see it — a call like
// t(meta.role) would be invisible to the scanner and could ship English into
// Thai mode unnoticed. Built per call because the language can change without
// a reload.
// `fills` names the boxes a source actually pre-fills TODAY, not everything it
// reports. Midori also sends income and an investments flag, but nothing fills
// those in yet, and a settings page that promises more than it does is worse
// than one that promises less.
const SOURCE_META = () => ({
  midori: {
    name: SOURCE_NAMES.midori,
    role: t("Your ledger"),
    fills: t("Monthly savings, in the Weekly Review")
  },
  runaway: {
    name: SOURCE_NAMES.runaway,
    role: t("Your run log"),
    fills: t("Vigorous exercise days and minutes, in the Weekly Review")
  }
});

function connectionDate(date) {
  return date.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
}

// The status line for one source.
//
// Nothing from the payload is rendered here — only these fixed strings plus one
// date formatted by Intl. That is rule 4 of the handoff contract holding in
// practice: there is no attacker-controlled text on this page to escape,
// because none was ever carried across.
function connectionStatusText(status, read) {
  if (status === "off") return t("Off — this app isn't reading anything from it.");
  if (status === "waiting") {
    return t("Nothing shared yet. Open the app on this device and turn its sharing on.");
  }
  if (status === "unreadable") {
    return t("Something is stored, but not in a form this version can read.");
  }
  if (status === "future") {
    return t("The stored data is dated in the future — check this device's clock.");
  }
  const through = connectionDate(read.payload.window.to);
  if (status === "stale") {
    return tp("Last shared data covers up to {date}, which isn't the period being scored. Open the app to refresh it.", { date: through });
  }
  return tp("Connected — data through {date}.", { date: through });
}

function connectionRow(source, meta, enabled, read) {
  const status = connectionStatusText(connectionStatus(enabled, read), read);
  return `
    <div class="conn-row">
      <div class="conn-head">
        <span class="conn-id">
          <span class="conn-name">${escapeHtml(meta.name)}</span>
          <span class="conn-role">${meta.role}</span>
        </span>
        <label class="conn-switch">
          <input type="checkbox" id="conn-${source}"${enabled ? " checked" : ""} aria-describedby="conn-${source}-status">
          <span>${t("Use it")}</span>
        </label>
      </div>
      <p class="conn-status" id="conn-${source}-status" aria-live="polite">${escapeHtml(status)}</p>
    </div>`;
}

// A section whose label carries a note mark (the owner, v150: what the page
// explains moves to numbered notes at its end).
function notedSection(labelText, ref, inner) {
  return `
    <section class="panel statement textsec"><div class="wrap split">
      <h2 class="label">(${escapeHtml(labelText)})${ref}</h2>
      <div>${inner}</div>
    </div></section>`;
}

// --- MOTION ---

// The in-app Reduce motion switch (plan decision 7). It can only ADD
// reduction: when the device already asks for less motion the box shows
// checked and cannot be cleared, and the line under it says why rather than
// leaving a dead control unexplained. What the switch does is a note.
function motionCard(book) {
  const device = deviceReducesMotion();
  const ref = book.ref("motion", `<p>${t("Keeps animations to quick fades and finished states. It can only reduce motion; your device's own setting always applies.")}</p>`);
  return notedSection(t("Motion"), ref, `
        <label class="conn-switch">
          <input type="checkbox" id="pf-reduce-motion"${isReduced() ? " checked" : ""}${device ? ' disabled aria-describedby="pf-reduce-motion-note"' : ""}>
          <span>${t("Reduce motion")}</span>
        </label>
        ${device ? `<p class="profile-note" id="pf-reduce-motion-note">${t("Your device already asks for less motion, so it stays reduced everywhere in this app.")}</p>` : ""}`);
}

export function renderProfile(containerId, state, onSaved) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const p = state.profile;

  // Read once for the initial paint. A run log describes one specific week, so
  // the week being scored has to be passed in for it to be judged fresh.
  const meta = SOURCE_META();
  const prefs = readConnectionPrefs();
  const reads = {};
  for (const source of CONNECTION_SOURCES) {
    reads[source] = readConnection(source, { isoWeek: isoWeekKey(new Date()) });
  }

  const genderOpts = [
    { value: "unspecified", label: t("Prefer not to say") },
    { value: "male", label: t("Male") },
    { value: "female", label: t("Female") }
  ];
  const regionOpts = [
    { value: "Provinces", label: t("Provinces / Upcountry Thailand") },
    { value: "Bangkok", label: t("Bangkok & Vicinity") }
  ];
  const employmentOpts = [
    { value: "Office Worker", label: t("Office Worker / Salary Employee") },
    { value: "Freelancer", label: t("Freelancer / Independent") },
    { value: "Business Owner", label: t("Business Owner / Entrepreneur") },
    { value: "Unemployed", label: t("Unemployed / Looking for Work") },
    { value: "Student", label: t("Student") }
  ];
  const relationshipOpts = [
    { value: "Single", label: t("Single") },
    { value: "Coupled", label: t("In a Relationship / Married") }
  ];
  // The owner's cut list (v150): plain labels on the page, the explanations
  // as numbered notes at its end.
  const book = noteBook();
  const aboutRef = book.ref("about", `<p>${t("Update the slower-moving facts about you. Day-to-day quantities like sleep, water, and activity live in the Weekly Review.")}</p>`);
  // The birth year is never asked for: Age plus today's date gives it to
  // within twelve months, so the note says only why the field exists.
  const birthdayRef = book.ref("birthday", `<p>${t("Month and day only, so the app knows when your year turns.")}</p>`);
  const lifeRef = book.ref("life", `<p>${t("Change your relationship and your recommendations update now; your relationship score refines at your next monthly check-in.")}</p><p>${t("Gender and employment guide your benchmarks and recommendations: they don't change your scores.")}</p>`);
  const moneyRef = book.ref("money", `<p>${t("Money sent to family: leave it blank or enter 0 if you send nothing.")} ${t("Shown on your Social Contribution page as giving. It changes nothing about your score.")}</p>`);
  const appsRef = book.ref("apps", `<p>${t("If you use these apps on this device, they can hand their numbers to your Weekly Review so you type less. Everything stays in this browser: nothing is uploaded, and no account is involved.")}</p><p>${t("Each app has its own sharing switch too. Turning one on here only means this app may read what that app chose to share.")}</p>${CONNECTION_SOURCES.map(s => `<p>${escapeHtml(meta[s].name)}. ${tp("Pre-fills: {fields}", { fields: meta[s].fills })}</p>`).join("")}`);
  const motion = motionCard(book);
  // The backup reminder, moved here from Overview's To do (v157).
  const sinceExport = stateManager.needsBackupNudge() ? stateManager.daysSinceLastExport() : null;
  const backupLine = sinceExport === null ? "" : ` <strong>${escapeHtml(tp("Last backup {days} days ago.", { days: sinceExport }))}</strong>`;

  container.innerHTML = `
    <div class="stage-page textpage profile-view">
      ${pageHead(t("Profile"), [`<span class="profile-who"><strong>${escapeHtml(p.name)}</strong> · ${t("Lv.")}${escapeHtml(p.level)}</span> <a class="profile-year" href="#/year">${escapeHtml(t("Your year"))}</a>`])}

      ${notedSection(t("About you"), aboutRef, `
        ${textField("pf-name", t("Name"), p.name, 'maxlength="40"')}
        <div class="grid-2">
          ${numberField("pf-age", t("Age"), p.age, `min="${AGE_MIN}" max="${AGE_MAX}"`)}
          ${selectField("pf-gender", t("Gender"), genderOpts, p.gender)}
        </div>
        <p class="profile-field-head">${t("Birthday (optional)")}${birthdayRef}</p>
        ${birthdayFields({ idPrefix: "pf-birthday", month: p.birthMonth, day: p.birthDay })}
        <span class="field-error d-none" id="pf-birthday-err" aria-live="polite"></span>`)}

      ${notedSection(t("Life Context"), lifeRef, `
        ${selectField("pf-region", t("Where you live"), regionOpts, p.region)}
        ${selectField("pf-employment", t("Work"), employmentOpts, p.employment)}
        ${selectField("pf-relationship", t("Relationship"), relationshipOpts, p.relationshipStatus)}`)}

      ${notedSection(t("Finance & Body"), moneyRef, `
        ${numberField("pf-income", t("Monthly income after tax (baht)"), p.income, 'min="0"')}
        <div class="grid-2">
          ${numberField("pf-height", t("Height (cm)"), p.height, 'min="100" max="250"')}
          ${numberField("pf-weight", t("Weight (kg)"), p.weight, 'min="25" max="300"')}
        </div>
        ${numberField("pf-family", t("Sent to family a month (baht)"), p.familySupport, 'min="0"')}
        <p id="profile-error" class="profile-error d-none" role="alert"></p>
        <p class="actions"><button type="button" id="pf-save" class="pill">${t("Save")}</button></p>`)}

      ${notedSection(t("Connected apps"), appsRef, `
        ${CONNECTION_SOURCES.map(s => connectionRow(s, meta[s], prefs[s], reads[s])).join("")}`)}

      ${motion}

      ${textSection(t("Your data"), `
        <p class="profile-note">${t("Stored only in this browser. Export a backup now and then.")}${backupLine}</p>
        <p class="actions profile-data-actions">
          <button type="button" id="btn-export-data" class="pill">${t("Export")}</button>
          <button type="button" id="btn-import-data" class="pill">${t("Import")}</button>
          <button type="button" id="btn-reset-data" class="pill pill-danger">${t("Reset")}</button>
          <input type="file" id="import-file-input" accept="application/json,.json" class="d-none">
        </p>`)}

      <section class="panel statement textsec profile-notes"><div class="wrap split">
        ${label(t("Notes and sources"))}
        <div>${footnoteList(book.notes)}</div>
      </div></section>
    </div>
  `;
  bindFootnotes(container);

  // A toggle redraws its OWN status line and nothing else: the form above can
  // be holding unsaved edits, and re-rendering the page would throw them away.
  for (const source of CONNECTION_SOURCES) {
    const box = document.getElementById(`conn-${source}`);
    const line = document.getElementById(`conn-${source}-status`);
    if (!box || !line) continue;
    box.addEventListener("change", () => {
      const next = setConnectionPref(source, box.checked);
      // Re-read rather than reuse the initial read: switching a source on is
      // exactly when the user wants to know whether anything is actually there.
      const read = readConnection(source, { isoWeek: isoWeekKey(new Date()) });
      line.textContent = connectionStatusText(connectionStatus(next[source], read), read);
    });
  }

  // Applies on change, like the connection toggles: no Save, and the form
  // above keeps any unsaved edits.
  const reduceBox = document.getElementById("pf-reduce-motion");
  if (reduceBox) {
    reduceBox.addEventListener("change", () => setReduceMotionPref(reduceBox.checked));
  }

  // Each error span is "<control id>-err"; the birthday's covers both selects.
  const showFieldError = (field, message) => {
    const errEl = document.getElementById(ERR_IDS[field]);
    const base = ERR_IDS[field].replace(/-err$/, "");
    const ctrls = field === "birthday" ? [`${base}-month`, `${base}-day`] : [base];
    for (const id of ctrls) markField(document.getElementById(id), errEl, message);
  };

  const clearErrors = () => {
    for (const field of Object.keys(ERR_IDS)) showFieldError(field, "");
    const err = document.getElementById("profile-error");
    if (err) err.classList.add("d-none");
  };

  document.getElementById("pf-save").addEventListener("click", () => {
    clearErrors();
    const val = id => document.getElementById(id)?.value ?? "";
    const errors = {};

    // Numeric fields validated against the shared FIELD_CONSTRAINTS.
    const { errors: numErrors } = validateProfile({
      income: val("pf-income"), weight: val("pf-weight"),
      height: val("pf-height"),
      familySupport: val("pf-family")
    });
    Object.assign(errors, numErrors);

    // A cleared name was saved as "Guest" without a word.
    if (!String(val("pf-name")).trim()) errors.name = t("Enter a name.");

    // Age isn't a FIELD_CONSTRAINTS key — bound it explicitly. Whole years
    // only: 30.7 used to be saved as 31, and the level moved with it.
    const ageNum = Number(val("pf-age"));
    if (!Number.isFinite(ageNum) || ageNum < AGE_MIN || ageNum > AGE_MAX) {
      errors.age = tp("Enter a value between {min} and {max}.", { min: AGE_MIN, max: AGE_MAX });
    } else if (!Number.isInteger(ageNum)) {
      errors.age = t("Enter a whole number.");
    }

    // Birthday: both-or-neither, and a real calendar date. Blank keeps the
    // current birthday (there is no "unset" path anywhere in the app).
    const bMonth = val("pf-birthday-month");
    const bDay = String(val("pf-birthday-day")).trim();
    const monthFilled = bMonth !== "";
    const dayFilled = bDay !== "";
    let birthdayChange = null;
    if (monthFilled !== dayFilled) {
      errors.birthday = t("Choose both a month and a day, or leave both blank.");
    } else if (monthFilled && dayFilled) {
      const b = sanitizeBirthday(parseInt(bMonth), parseInt(bDay));
      if (!b.birthMonth) errors.birthday = t("That isn't a real date — check the day for that month.");
      else if (b.birthMonth !== p.birthMonth || b.birthDay !== p.birthDay) birthdayChange = b;
    }

    if (Object.keys(errors).length) {
      for (const [field, message] of Object.entries(errors)) showFieldError(field, message);
      const err = document.getElementById("profile-error");
      err.textContent = t("Please fix the highlighted fields before continuing.");
      err.classList.remove("d-none");
      return;
    }

    const result = stateManager.updateProfile({
      name: val("pf-name"), age: val("pf-age"),
      gender: val("pf-gender"), region: val("pf-region"),
      employment: val("pf-employment"), relationshipStatus: val("pf-relationship"),
      income: val("pf-income"), weight: val("pf-weight"), height: val("pf-height"),
      familySupport: val("pf-family")
    });
    // Birthday rides its own mutator (re-anchors level-ups safely).
    if (birthdayChange) stateManager.setBirthday(birthdayChange.birthMonth, birthdayChange.birthDay);

    if (typeof onSaved === "function") onSaved(result);
  });
}
