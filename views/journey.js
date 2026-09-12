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

import { numberField, selectField, instrumentBlock } from "./instrument-forms.js";
import { INSTRUMENTS } from "../surveys.js";
import { t, tp } from "../i18n.js";

// A screen is the unit the reader actually sees: one instrument, or one small
// group of related numbers. `stem` is the line pinned above the items while
// they reveal one at a time; it is what stops a reader losing the question the
// scale belongs to once the item itself has settled into an answered row.
//
// `instrument` being set is what tells the engine to apply the reveal rhythm.
// A fields screen shows its inputs together, because three numbers about sleep
// and water are read at a glance and revealing them one by one would be
// ceremony without information.
function instrumentScreen(key, stem) {
  return {
    id: `instr-${key}`,
    instrument: key,
    title: INSTRUMENTS[key].title,
    stem,
    body: instrumentBlock(key)
  };
}

function fieldsScreen(id, title, stem, body) {
  return { id: `fields-${id}`, instrument: null, title, stem, body };
}

// --- THE PROLOGUE --------------------------------------------------------
//
// Not a chapter and deliberately outside the ring: none of these six answers
// scores an aspect, they choose which population norms the scoring compares
// against. Putting them inside The Market -- where step 1 used to bury them
// under a header promising benchmark comparison -- was the original reason a
// tester read the finance step as three unrelated money questions.
export const PROLOGUE = fieldsScreen(
  "prologue",
  t("Before you set out"),
  t("Six quick things, so the rest of the journey can compare you with people in a similar situation. Nothing here is scored."),
  `
    <div class="form-group">
      <label for="onb-name">${t("Name")}</label>
      <input type="text" id="onb-name" class="form-control" value="" maxlength="40">
    </div>
    <div class="grid-2">
      ${numberField("onb-age", t("Age"), "", 'min="15" max="100"', { required: true, placeholder: "15–100" })}
      ${selectField("onb-gender", t("Gender (for benchmark norms)"), [
        { v: "unspecified", l: "Prefer not to say" },
        { v: "male", l: "Male" },
        { v: "female", l: "Female" }
      ])}
    </div>
    ${selectField("onb-region", t("Primary Region (Cost of Living Mapping)"), [
      { v: "Provinces", l: "Provinces / Upcountry Thailand" },
      { v: "Bangkok", l: "Bangkok & Vicinity" }
    ])}
    ${selectField("onb-employment", t("Employment Status"), [
      { v: "Office Worker", l: "Office Worker / Salary Employee" },
      { v: "Freelancer", l: "Freelancer / Independent" },
      { v: "Business Owner", l: "Business Owner / Entrepreneur" },
      { v: "Unemployed", l: "Unemployed / Looking for Work" },
      { v: "Student", l: "Student" }
    ])}
    ${selectField("onb-relationship", t("Relationship Status"), [
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

// How many of an instrument's items the reader put at "Often" or "Very often".
// A count, not a score: it says how many times they said yes, which is a fact
// about their own answers rather than a judgement of them.
function highCount(values, floor = 3) {
  return values.filter(v => v !== null && Number(v) >= floor).length;
}

export const CHAPTERS = [
  // --- 1. THE MARKET (finance) -------------------------------------------
  {
    aspect: "finance",
    region: t("The Market"),
    theme: t("Where what you have meets what it costs."),
    hue: "#d9a441",
    screens: [
      fieldsScreen(
        "money",
        t("What comes in, what stays"),
        t("Two numbers. Round them — nothing here needs to be exact."),
        `
          ${numberField("onb-income", t("Monthly Individual Income (Net THB)"), "", 'min="0"', { required: true, field: "income" })}
          ${numberField("onb-savings", t("Monthly Savings (THB)"), "", 'min="0"', { required: true, field: "monthlySavings", placeholder: t("e.g. 3,000") })}`
      ),
      instrumentScreen("cfpb", t("Now how money feels, which is a different question from how much of it there is."))
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
      const cfpb = read.answers("cfpb");
      lines.push(tp("Of five statements about money, {n} described you well.", { n: highCount(cfpb) }));
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
        t("Not your best day and not your worst — the one that repeats."),
        `
          <div class="grid-2">
            ${numberField("onb-sleep", t("Average Nightly Sleep (Hours)"), "", 'min="0" max="16" step="0.5"', { required: true, field: "sleepHours", placeholder: "0–16" })}
            ${numberField("onb-veg", t("Vegetable Portions per Day"), "", 'min="0" max="15"', { required: true, field: "vegetablePortions", placeholder: "0–15", note: t("One portion ≈ 80 g — about one handful, or half a plate of cooked greens. Vegetables only: the guideline check behind this field counts vegetables, not fruit.") })}
          </div>
          ${numberField("onb-water", t("Water Intake per Day (Liters)"), "", 'min="0" max="10" step="0.1"', { required: true, field: "waterLiters", placeholder: "0–10" })}`
      ),
      fieldsScreen(
        "activity",
        t("Weekly Physical Activity (IPAQ)"),
        t("Three pairs. For each: how many days in a normal week, and how long on one of those days — not the weekly total."),
        `
          <div class="grid-2">
            ${numberField("onb-vig-days", t("Vigorous Exercise (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyVigorousDays", placeholder: "0–7" })}
            ${numberField("onb-vig-mins", t("Vigorous Minutes on Each of Those Days"), "", 'min="0" max="600"', { required: true, field: "weeklyVigorousMins", placeholder: "0–600", note: t("Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.") })}
          </div>
          <div class="grid-2">
            ${numberField("onb-mod-days", t("Moderate Exercise (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyModerateDays", placeholder: "0–7" })}
            ${numberField("onb-mod-mins", t("Moderate Minutes on Each of Those Days"), "", 'min="0" max="600"', { required: true, field: "weeklyModerateMins", placeholder: "0–600", note: t("Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.") })}
          </div>
          <div class="grid-2">
            ${numberField("onb-walk-days", t("Walking (Days/Week)"), "", 'min="0" max="7"', { required: true, field: "weeklyWalkingDays", placeholder: "0–7" })}
            ${numberField("onb-walk-mins", t("Walking Minutes on Each of Those Days"), "", 'min="0" max="600"', { required: true, field: "weeklyWalkingMins", placeholder: "0–600", note: t("Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.") })}
          </div>`
      ),
      instrumentScreen("jss", t("Four questions about how the sleep actually went, which the hours alone do not tell us."))
    ],
    recap(read) {
      const lines = [];
      const sleep = read.num("onb-sleep");
      if (sleep !== null) {
        lines.push(tp("{hours} hours a night — around {annual} hours of sleep a year.", {
          hours: sleep, annual: Math.round(sleep * 365).toLocaleString()
        }));
      }
      const days = ["onb-vig-days", "onb-mod-days", "onb-walk-days"].map(id => read.num(id) || 0);
      const mins = ["onb-vig-mins", "onb-mod-mins", "onb-walk-mins"].map(id => read.num(id) || 0);
      const weekly = days[0] * mins[0] + days[1] * mins[1] + days[2] * mins[2];
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
    screens: [
      instrumentScreen("st5", t("Five questions about the last few weeks. There is no right answer and nothing here is a diagnosis.")),
      instrumentScreen("who5", t("Five more, about the same stretch of time — this time asking what was good rather than what was hard."))
    ],
    recap(read) {
      const lines = [];
      const st5 = read.answers("st5");
      const who5 = read.answers("who5");
      lines.push(tp("You answered {n} questions about the past few weeks.", { n: st5.length + who5.length }));
      const good = highCount(who5);
      lines.push(good > 0
        ? tp("In {n} of the five well-being questions, you said that was true of you most of the time or more.", { n: good })
        : t("None of the five well-being questions landed in the upper half for you. That is recorded exactly as you gave it."));
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
    screens: [
      instrumentScreen("lsns", t("Six questions about the people around you — three about family, three about friends.")),
      instrumentScreen("ucla", t("Three questions about the gaps. They are asked of everyone, including people with plenty of company.")),
      {
        ...instrumentScreen("ras", t("Three last questions, asked only because you said you are in a relationship.")),
        conditional: "couple"
      }
    ],
    recap(read) {
      const lines = [];
      const lsns = read.answers("lsns");
      lines.push(tp("Across the six network questions your answers add up to {n}.", { n: sum(lsns) }));
      const ucla = read.answers("ucla");
      const lonely = highCount(ucla, 2);
      lines.push(lonely === 0
        ? t("None of the three loneliness questions described you often.")
        : tp("{n} of the three loneliness questions described you at least some of the time.", { n: lonely }));
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
    screens: [
      instrumentScreen("gse", t("Six statements about how you handle difficulty.")),
      instrumentScreen("citacc", t("Three about finishing things.")),
      instrumentScreen("citlearn", t("Three about learning things.")),
      instrumentScreen("grit", t("Four about staying with something once the novelty wears off.")),
      fieldsScreen(
        "learning",
        t("Time at the bench"),
        t("Any deliberate learning counts — a course, a language, a craft, a manual."),
        numberField("onb-learning", t("Weekly Learning / Study Hours"), "", 'min="0" max="80" step="0.5"', { required: true, field: "weeklyLearningHours", placeholder: "0–80" })
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
      const gse = read.answers("gse");
      lines.push(tp("Of six statements about handling difficulty, {n} were true of you.", { n: highCount(gse) }));
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
    screens: [
      instrumentScreen("ptm", t("Five questions about a typical month, not an exceptional one.")),
      fieldsScreen(
        "giving",
        t("Money and hours"),
        t("Both can be zero. Giving is not the only way to contribute and this app does not pretend otherwise."),
        `
          <div class="grid-2">
            ${numberField("onb-donations", t("Monthly Donations (THB)"), "", 'min="0"', { required: true, field: "monthlyDonations" })}
            ${numberField("onb-volunteer", t("Volunteering Hours per Month"), "", 'min="0" max="168"', { required: true, field: "volunteeringHours", placeholder: "0–168" })}
          </div>`
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
      if (!donations && !hours) {
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
    screens: [
      instrumentScreen("geb", t("Six everyday habits. Answer for what you actually do, not what you mean to.")),
      fieldsScreen(
        "plastics",
        t("One last count"),
        t("Bags, straws, cups, cutlery, bottles — anything used once and thrown away."),
        numberField("onb-plastics", t("Single-Use Plastic Items per Day"), "", 'min="0" max="100"', { required: true, field: "singleUsePlastics", placeholder: "0–100" })
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
      const geb = read.answers("geb");
      lines.push(tp("Of six green habits, {n} are ones you do often or very often.", { n: highCount(geb) }));
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
    screens: [
      instrumentScreen("lfis", t("Six last questions. The furthest ahead this whole journey asks you to look."))
    ],
    recap(read) {
      const lfis = read.answers("lfis");
      return [
        tp("Of six questions about the long term, {n} described something you do often.", { n: highCount(lfis) }),
        t("That is the last of them. Every region on the ring is lit.")
      ];
    },
    fact: {
      source: "unWppAgeing",
      text: t("In 2015, 10.3% of Thailand's population was 65 or older. By 2024 it was 15.4%. The country the long term belongs to is not the one that exists now.")
    }
  }
];

// Every screen in order, prologue first, each tagged with the chapter it
// belongs to and whether it is that chapter's last. The engine renders from
// this and never walks CHAPTERS itself.
export function allScreens() {
  const out = [{ ...PROLOGUE, chapter: -1, endsChapter: false }];
  CHAPTERS.forEach((chapter, ci) => {
    chapter.screens.forEach((screen, si) => {
      out.push({ ...screen, chapter: ci, endsChapter: si === chapter.screens.length - 1 });
    });
  });
  return out;
}
