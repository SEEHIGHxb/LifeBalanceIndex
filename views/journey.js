// views/journey.js - the content model for the redesigned onboarding flow:
// eight chapters on a ring, each made of small screens, each ending with a
// recap of the reader's own answers and one cited fact about the world.
//
// WHY THIS IS A SEPARATE MODULE FROM views/onboarding.js. onboarding.js is now
// an ENGINE -- it knows how to reveal an item, advance a screen, light a region
// and validate a scope, and it knows nothing about markets or highlands. This
// file is the CONTENT -- it knows what the chapters are and says nothing about
// how they move. The split is what lets Phase 4 point the same engine at the
// deep assessment and the monthly review without copying any of the writing.
//
// Design source: docs/onboarding-flow-redesign.md, agreed 2026-09-11.
// Facts: the CHAPTER-ENDING FACTS block in benchmarks.js, verified 2026-09-11
// and inventoried in docs/chapter-facts.md.

import { numberField, selectField, instrumentBlock, FIELD_HINTS } from "./instrument-forms.js";
import { learningMarkup, weekMarkup, donationMarkup, volunteerMarkup, tallyMarkup } from "./activity-fields.js";
import { INSTRUMENTS } from "../surveys.js";
import { t, tp, onLangChange } from "../i18n.js";

// A screen is the unit the reader actually sees: one instrument, or one small
// group of related numbers. `stem` is the line pinned above the items while
// they reveal one at a time; it is what stops a reader losing the question the
// scale belongs to once the item itself has settled into an answered row.
//
// `instrument` being set is what tells the engine to apply the reveal rhythm.
// A fields screen shows its inputs together, because three numbers about sleep
// and water are read at a glance and revealing them one by one would be
// ceremony without information.
// The title is plain words (the owner, v149); the questionnaire's official
// name is kept as a small note under it (`source`). t() on both because the
// engine escapes but does not translate.
function instrumentScreen(key, title, stem = "") {
  return {
    id: `instr-${key}`,
    instrument: key,
    title,
    source: t(INSTRUMENTS[key].title),
    stem,
    // heading: false -- the engine prints the title above; see instrumentBlock.
    body: instrumentBlock(key, { heading: false })
  };
}

function fieldsScreen(id, title, stem, body, source = "") {
  return { id: `fields-${id}`, instrument: null, title, stem, body, source };
}

// --- THE PROLOGUE --------------------------------------------------------
//
// Not a chapter and deliberately outside the ring: none of these six answers
// scores an aspect, they choose which population norms the scoring compares
// against. Putting them inside The Market -- where step 1 used to bury them
// under a header promising benchmark comparison -- was the original reason a
// tester read the finance step as three unrelated money questions.
const buildPrologue = () => fieldsScreen(
  "prologue",
  t("Before you set out"),
  t("Used to compare you with people like you. Nothing here is scored."),
  `
    <div class="form-group">
      <label for="onb-name">${t("Name")}</label>
      <input type="text" id="onb-name" class="form-control" value="" maxlength="40">
    </div>
    <div class="grid-2">
      ${numberField("onb-age", t("Age"), "", 'min="15" max="100"', { required: true, placeholder: "15–100" })}
      ${selectField("onb-gender", t("Gender"), [
        { v: "unspecified", l: "Prefer not to say" },
        { v: "male", l: "Male" },
        { v: "female", l: "Female" }
      ])}
    </div>
    ${selectField("onb-region", t("Where you live"), [
      { v: "Provinces", l: "Provinces / Upcountry Thailand" },
      { v: "Bangkok", l: "Bangkok & Vicinity" }
    ])}
    ${selectField("onb-employment", t("Work"), [
      { v: "Office Worker", l: "Office Worker / Salary Employee" },
      { v: "Freelancer", l: "Freelancer / Independent" },
      { v: "Business Owner", l: "Business Owner / Entrepreneur" },
      { v: "Unemployed", l: "Unemployed / Looking for Work" },
      { v: "Student", l: "Student" }
    ])}
    ${selectField("onb-relationship", t("Relationship"), [
      { v: "Single", l: "Single" },
      { v: "Coupled", l: "In a Relationship / Married" }
    ])}`
);

// --- RECAP HELPERS -------------------------------------------------------
//
// Every recap is built from a `read` accessor the engine injects, so this whole
// file stays free of `document` and can be exercised in node. `read.num(id)`
// returns a finite number or null; `read.answers(key)` returns the chosen
// values for an instrument, with null for anything unanswered.
//
// THE RULE THESE ALL OBEY, and the one worth guarding: a recap states what the
// reader said and never what it is worth. No score, no band, no percentile, no
// comparison against the fact that follows it. docs/onboarding-flow-redesign.md
// sets out why -- a rank shown at chapter 1 teaches the reader how to answer
// chapters 2 to 8, and usability-test-plan.md already worries that testers
// "begin optimizing their score".
function sum(values) {
  return values.reduce((a, v) => a + (Number(v) || 0), 0);
}

// Every item of an instrument has an answer. read.answers() returns null for
// an unanswered item, and a blank is not the same as the lowest option.
function isComplete(values) {
  return values.length > 0 && values.every(v => v !== null && v !== undefined);
}

// How many of an instrument's items the reader put at "Often" or "Very often".
// A count, not a score: it says how many times they said yes, which is a fact
// about their own answers rather than a judgement of them.
//
// NULL UNLESS EVERY ITEM WAS ANSWERED, and every caller drops its line on null.
// Counting only the answered items turned five blanks into "0 described you
// well" -- a sentence about answers the reader never gave. Today Next-
// validation keeps blanks out of an ending, but that is another module's rule;
// the recap must not depend on it.
function highCount(values, floor = 3) {
  if (!isComplete(values)) return null;
  return values.filter(v => Number(v) >= floor).length;
}

const buildChapters = () => [
  // --- 1. THE MARKET (finance) -------------------------------------------
  {
    aspect: "finance",
    region: t("The Market"),
    theme: t("Where what you have meets what it costs."),
    hue: "#d9a441",
    art: "market",
    wash: "#f2e2bb",
    motif: "M3.5 11h17l-2.2 9H5.7z M5.2 15.5h13.6 M8 11a3 3 0 0 1 6 0 M15.5 11c.6-3.6 2.6-6 5.5-7",
    screens: [
      fieldsScreen(
        "money",
        t("What comes in, what stays"),
        t("Round numbers are fine."),
        `
          ${numberField("onb-income", t("Monthly income after tax (baht)"), "", 'min="0"', { required: true, field: "income" })}
          ${numberField("onb-savings", t("Monthly savings (baht)"), "", 'min="0"', { required: true, field: "monthlySavings", placeholder: t("e.g. 3,000") })}`
      ),
      instrumentScreen("cfpb", t("How money feels"))
    ],
    recap(read) {
      const lines = [];
      const income = read.num("onb-income");
      const savings = read.num("onb-savings");
      if (income !== null && savings !== null && income > 0) {
        lines.push(tp("Of the {income} baht that comes in each month, you set aside {amount}.", {
          amount: savings.toLocaleString(), income: income.toLocaleString()
        }));
        lines.push(tp("Over a year, that is about {annual} baht.", {
          annual: Math.round(savings * 12).toLocaleString()
        }));
      }
      const wellCount = highCount(read.answers("cfpb"));
      if (wellCount !== null) {
        lines.push(tp("Of five statements about money, {n} described you well.", { n: wellCount }));
      }
      return lines;
    },
    fact: {
      source: "findexSaving",
      text: t("Across Thailand, 63.1% of adults set aside money at some point last year. The survey deliberately never asked how much — only whether any was set aside at all.")
    }
  },

  // --- 2. THE HIGHLANDS (physical) ---------------------------------------
  {
    aspect: "physical",
    region: t("The Highlands"),
    theme: t("The climb your body does every day, whether or not you notice it."),
    hue: "#3fa796",
    art: "highlands",
    wash: "#d9eeea",
    motif: "M2 20h20 M3.5 20l6-10.5 4 5.5 2.5-3.2 4.5 8.2 M9.5 20c-1.6-2.2 1.6-3.4 0-6 M15 5.5a2.5 2.5 0 1 1 5 0a2.5 2.5 0 1 1-5 0",
    screens: [
      fieldsScreen(
        "body",
        t("The basics"),
        t("Used for a BMI band and nothing else. It is never shown to anyone."),
        `
          <div class="grid-2">
            ${numberField("onb-height", t("Height (cm)"), "", 'min="100" max="250"', { required: true, field: "height", placeholder: "100–250" })}
            ${numberField("onb-weight", t("Weight (kg)"), "", 'min="25" max="300"', { required: true, field: "weight", placeholder: "25–300" })}
          </div>`
      ),
      fieldsScreen(
        "daily",
        t("An ordinary day"),
        t("A typical day."),
        `
          <div class="grid-2">
            ${numberField("onb-sleep", t("Sleep a night (hours)"), "", 'min="0" max="16" step="0.5"', { required: true, field: "sleepHours", placeholder: "0–16" })}
            ${numberField("onb-veg", t("Vegetable portions a day"), "", 'min="0" max="15"', { required: true, field: "vegetablePortions", placeholder: "0–15", note: t(FIELD_HINTS.vegetablePortions) })}
          </div>
          ${numberField("onb-water", t("Water a day (litres)"), "", 'min="0" max="10" step="0.1"', { required: true, field: "waterLiters", placeholder: "0–10", note: t(FIELD_HINTS.waterLiters) })}`
      ),
      fieldsScreen(
        "activity",
        t("How you move"),
        // Painted, not typed (the owner, 2026-09-27): nobody measures their
        // exercise in days and minutes, but everyone knows which days they run.
        t("Paint the days you move in a normal week."),
        weekMarkup("onb", {
          vig: { days: "onb-vig-days", mins: "onb-vig-mins" },
          mod: { days: "onb-mod-days", mins: "onb-mod-mins" },
          walk: { days: "onb-walk-days", mins: "onb-walk-mins" }
        }),
        t("Weekly Physical Activity (IPAQ)")
      ),
      instrumentScreen("jss", t("How you sleep"), t("The past month."))
    ],
    recap(read) {
      const lines = [];
      const sleep = read.num("onb-sleep");
      if (sleep !== null) {
        lines.push(tp("{hours} hours a night — around {annual} hours of sleep a year.", {
          hours: sleep, annual: Math.round(sleep * 365).toLocaleString()
        }));
      }
      const days = ["onb-vig-days", "onb-mod-days", "onb-walk-days"].map(id => read.num(id));
      const mins = ["onb-vig-mins", "onb-mod-mins", "onb-walk-mins"].map(id => read.num(id));
      const weekly = isComplete([...days, ...mins])
        ? days[0] * mins[0] + days[1] * mins[1] + days[2] * mins[2]
        : 0;
      if (weekly > 0) {
        lines.push(tp("You move for about {mins} minutes in a normal week.", { mins: Math.round(weekly) }));
      }
      const veg = read.num("onb-veg");
      if (veg !== null && veg > 0) {
        lines.push(tp("{n} portions of vegetables a day is roughly {annual} across a year.", {
          n: veg, annual: Math.round(veg * 365).toLocaleString()
        }));
      }
      return lines;
    },
    fact: {
      source: "thaiSleep2015",
      text: t("In a national time-use survey of 167,577 Thai adults, 56.4% slept within the recommended seven to nine hours. The other 43.6% are not a small group.")
    }
  },

  // --- 3. THE STILL WATER (mental) ---------------------------------------
  //
  // The most carefully written chapter in the file. A reader arrives here
  // having just answered ten questions about their mood, and the two things a
  // recap must not do are diagnose and console. Both mental instruments are
  // reported as counts of their own items, and the fact is a national average
  // that has barely moved in eight years -- a fact about the country, not a
  // verdict on the reader. The three clinical thresholds this app holds for
  // ST-5 and WHO-5 are deliberately absent: a screening cut-off shown here
  // would read as a diagnosis, whatever the surrounding wording said.
  {
    aspect: "mental",
    region: t("The Still Water"),
    theme: t("Where the surface tells you something about what is underneath."),
    hue: "#5b8dd9",
    art: "still-water",
    wash: "#dde8f8",
    motif: "M12 3.5c2.6 3.2 2.6 8 0 11.5c-2.6-3.5-2.6-8.3 0-11.5z M12 15c-4 0-7-2.2-8.5-6c3.8 0 6.5 1.8 8.5 6z M12 15c4 0 7-2.2 8.5-6c-3.8 0-6.5 1.8-8.5 6z M5 19.5h14",
    screens: [
      instrumentScreen("st5", t("Stress"), t("The past 2 to 4 weeks. Nothing here is a diagnosis.")),
      instrumentScreen("who5", t("Well-being"), t("The past 2 weeks."))
    ],
    recap(read) {
      const lines = [];
      const st5 = read.answers("st5");
      const who5 = read.answers("who5");
      const answered = [...st5, ...who5].filter(v => v !== null).length;
      if (answered > 0) {
        lines.push(tp("You answered {n} questions about the past few weeks.", { n: answered }));
      }
      const good = highCount(who5);
      if (good !== null) {
        lines.push(good > 0
          ? tp("In {n} of the five well-being questions, you said that was true of you most of the time or more.", { n: good })
          : t("None of the five well-being questions landed in the upper half for you. That is recorded exactly as you gave it."));
      }
      return lines;
    },
    fact: {
      source: "nsoHappiness",
      text: t("Thailand's national mental-health score has sat between 31.4 and 33.6 out of 45 every single year from 2008 to 2015. Whatever else changed in those eight years, that did not.")
    }
  },

  // --- 4. THE COMMONS (relationships) ------------------------------------
  {
    aspect: "relationships",
    region: t("The Commons"),
    theme: t("The people you would call, and the people who would call you."),
    hue: "#d9738f",
    art: "commons",
    wash: "#f7dfe6",
    motif: "M3.5 11.5h7v2.4a3.3 3.3 0 0 1-3.3 3.3h-.4a3.3 3.3 0 0 1-3.3-3.3z M3.5 12.4h-.5a1.4 1.4 0 0 0 0 2.8h.8 M13.5 11.5h7v2.4a3.3 3.3 0 0 1-3.3 3.3h-.4a3.3 3.3 0 0 1-3.3-3.3z M20.5 12.4h.5a1.4 1.4 0 0 1 0 2.8h-.8 M1.5 20.5h21 M7 8.5c-1-1.1 1-2.2 0-3.5 M17 8.5c-1-1.1 1-2.2 0-3.5",
    screens: [
      instrumentScreen("lsns", t("The people around you"), t("Three about family, three about friends.")),
      instrumentScreen("ucla", t("Loneliness"), t("Asked of everyone, including people with plenty of company.")),
      {
        ...instrumentScreen("ras", t("Your relationship"), t("Asked because you said you are in a relationship.")),
        conditional: "couple"
      }
    ],
    recap(read) {
      const lines = [];
      const lsns = read.answers("lsns");
      if (isComplete(lsns)) {
        lines.push(tp("Across the six network questions your answers add up to {n}.", { n: sum(lsns) }));
      }
      const lonely = highCount(read.answers("ucla"), 2);
      if (lonely !== null) {
        lines.push(lonely === 0
          ? t("None of the three loneliness questions described you often.")
          : tp("{n} of the three loneliness questions described you at least some of the time.", { n: lonely }));
      }
      return lines;
    },
    fact: {
      source: "whrThaiSupport",
      text: t("Asked whether they have relatives or friends they can count on whenever they need them, 87.6% of people in Thailand say yes. It is one of the country's strongest showings on any measure of this kind.")
    }
  },

  // --- 5. THE WORKSHOP (personalGoals) -----------------------------------
  {
    aspect: "personalGoals",
    region: t("The Workshop"),
    theme: t("What you are building, and whether you believe you can finish it."),
    hue: "#e08a3c",
    art: "workshop",
    wash: "#f8e4cf",
    motif: "M9.5 3.5h5 M10.3 3.5c.3 2.1-4.8 3.3-4.8 7.4 0 2.7 2.6 4.1 6.5 4.1s6.5-1.4 6.5-4.1c0-4.1-5.1-5.3-4.8-7.4 M3.5 18.2h17 M7.5 21h9",
    screens: [
      instrumentScreen("gse", t("Handling difficulty")),
      instrumentScreen("citacc", t("Finishing things")),
      instrumentScreen("citlearn", t("Learning things")),
      instrumentScreen("grit", t("Sticking with things")),
      fieldsScreen(
        "learning",
        t("Time spent learning"),
        t("Any deliberate learning counts: a course, a language, a craft, a manual."),
        learningMarkup("onb-learning")
      )
    ],
    recap(read) {
      const lines = [];
      const hours = read.num("onb-learning");
      if (hours !== null) {
        lines.push(hours > 0
          ? tp("{hours} hours a week of deliberate learning — about {annual} hours a year.", {
              hours, annual: Math.round(hours * 52).toLocaleString()
            })
          : t("No hours set aside for learning this week. It is a week, not a verdict."));
      }
      const coped = highCount(read.answers("gse"));
      if (coped !== null) {
        lines.push(tp("Of six statements about handling difficulty, {n} were true of you.", { n: coped }));
      }
      return lines;
    },
    fact: {
      source: "nsoSkillDev",
      text: t("Of 57 million Thais aged 15 and over, 5.33 million said they wanted to develop a skill. Among those who did not, the reason given most often — by 22.24 million people — was having no free time.")
    }
  },

  // --- 6. THE CROSSROADS (socialContribution) ----------------------------
  {
    aspect: "socialContribution",
    region: t("The Crossroads"),
    theme: t("What you hand to people you will never meet again."),
    hue: "#8d6fd1",
    art: "crossroads",
    wash: "#e6dff8",
    motif: "M11 21V3 M11 5h7.5l2 2.2-2 2.2H11 M11 12H4.5l-2 2.2 2 2.2H11 M17 9.4v2 M15.8 11.4h2.4v3.4h-2.4z M7 21h8",
    screens: [
      instrumentScreen("ptm", t("Helping others"), t("A typical month.")),
      fieldsScreen(
        "giving",
        t("Money and hours"),
        t("Both can be zero."),
        donationMarkup("onb-donations") + volunteerMarkup("onb-volunteer")
      )
    ],
    recap(read) {
      const lines = [];
      const donations = read.num("onb-donations");
      const hours = read.num("onb-volunteer");
      if (donations) {
        lines.push(tp("{amount} baht a month is about {annual} baht a year passed on.", {
          amount: donations.toLocaleString(), annual: Math.round(donations * 12).toLocaleString()
        }));
      }
      if (hours) {
        lines.push(tp("{hours} hours a month adds up to roughly {annual} hours a year given to other people.", {
          hours, annual: Math.round(hours * 12)
        }));
      }
      if (donations === 0 && hours === 0) {
        lines.push(t("No money and no hours this month — recorded as given, and not weighed against anything."));
      }
      return lines;
    },
    fact: {
      source: "cafTrend",
      text: t("The share of people in Thailand who volunteered their time in the past month went from 15% to 19% to 24% across three editions of the same global survey. It is one of the steepest rises anywhere in it.")
    }
  },

  // --- 7. THE WILDWOOD (environment) -------------------------------------
  //
  // The chapter prototyped in Phase 1 and the one the author judged on. The
  // plastics arithmetic is kept from that prototype because it is the clearest
  // demonstration in the whole flow of why the endings are descriptive: "three
  // a day is about 1,100 a year" is a better beat than any percentile, and it
  // is entirely the reader's own number handed back to them.
  {
    aspect: "environment",
    region: t("The Wildwood"),
    theme: t("The mark a single ordinary day leaves behind it."),
    hue: "#2e9e5b",
    art: "wildwood",
    wash: "#d8eddf",
    motif: "M7 14.5c-2.8 0-4.6-2-4.1-4.3.3-1.6 1.6-2.5 3-2.6C6.4 4.7 8.8 3 12 3s5.6 1.7 6.1 4.6c1.4.1 2.7 1 3 2.6.5 2.3-1.3 4.3-4.1 4.3z M12 14.5V21 M12 17.8l-2.4-2.2 M12 17.4l2.4-2.4 M7.5 21h9",
    screens: [
      instrumentScreen("geb", t("Everyday green habits"), t("Six everyday habits. Answer for what you actually do, not what you mean to.")),
      fieldsScreen(
        "plastics",
        t("Single-use items"),
        t("Bags, straws, cups, cutlery, bottles: anything used once and thrown away."),
        tallyMarkup("onb-plastics")
      )
    ],
    recap(read) {
      const lines = [];
      const plastics = read.num("onb-plastics");
      if (plastics !== null) {
        lines.push(plastics > 0
          ? tp("{n} single-use items a day is about {annual} in a year.", {
              n: plastics, annual: Math.round(plastics * 365).toLocaleString()
            })
          : t("Nothing single-use on an ordinary day."));
      }
      const habits = highCount(read.answers("geb"));
      if (habits !== null) {
        lines.push(tp("Of six green habits, {n} are ones you do often or very often.", { n: habits }));
      }
      return lines;
    },
    fact: {
      source: "pcdWaste",
      text: t("Thailand produced 27.76 million tonnes of municipal waste last year and put 10.62 million tonnes of it back to use — composted, recycled or burned for energy. That is 38.3%.")
    }
  },

  // --- 8. THE LOOKOUT (humanityFuture) -----------------------------------
  {
    aspect: "humanityFuture",
    region: t("The Lookout"),
    theme: t("How far ahead you are looking, and who is standing there with you."),
    hue: "#5a63b8",
    art: "lookout",
    wash: "#e0e2f5",
    motif: "M4 13.4l11-5.5 1.7 3.4-11 5.5z M16.8 7l1.6-.8 1.7 3.4-1.6.8z M11 13.6V16 M11 16l-3.8 5 M11 16l3.8 5 M21 1.8v3.4 M19.3 3.5h3.4",
    screens: [
      instrumentScreen("lfis", t("Looking ahead"))
    ],
    recap(read) {
      const longTerm = highCount(read.answers("lfis"));
      return [
        ...(longTerm === null ? [] : [
          tp("Of six questions about the long term, {n} described something you do often.", { n: longTerm })
        ]),
        t("That is the last of them. Every region on the ring is lit.")
      ];
    },
    fact: {
      source: "unWppAgeing",
      text: t("In 2015, 10.3% of Thailand's population was 65 or older. By 2024 it was 15.4%. The country the long term belongs to is not the one that exists now.")
    }
  }
];

// The content is built by a function rather than written as a constant because
// every label, stem, question and fact in it is translated as it is built. A
// constant froze them in the language the page loaded in, so pressing the
// header's language button mid-journey re-rendered the screens with the old
// language's questions. Rebuilt on every language change; `export let` keeps
// the importers' bindings live, so each of them sees the new build.
export let PROLOGUE = buildPrologue();
export let CHAPTERS = buildChapters();
onLangChange(() => {
  PROLOGUE = buildPrologue();
  CHAPTERS = buildChapters();
});

// Every screen in order, prologue first, each tagged with the chapter it
// belongs to and whether it is that chapter's last. The engine renders from
// this and never walks CHAPTERS itself.
export function allScreens() {
  const out = [{ ...PROLOGUE, chapter: -1, startsChapter: false, endsChapter: false }];
  CHAPTERS.forEach((chapter, ci) => {
    chapter.screens.forEach((screen, si) => {
      out.push({
        ...screen,
        chapter: ci,
        startsChapter: si === 0,
        endsChapter: si === chapter.screens.length - 1
      });
    });
  });
  return out;
}
