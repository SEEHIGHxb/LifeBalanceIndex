// characters.js - One character per region, MBTI-style (v122).
//
// The owner, 2026-09-27: testers suggested that "since we grade the score
// anyways ... we may mimic a bit of the personality test aspect", with names
// that are "not the professional recommendation. Simply fun reference made up
// stuff", and "if possible we should not directly use the grade to define",
// because a grade piles most people into the middle. The owner chose four
// one-word people per region ("Set B", 2026-09-28).
//
// So each region reads TWO either/or sides from answers already given, and the
// pair picks one of four characters. Neither side is the aspect score: each is
// one of its parts, cut at a published average, median or threshold (named
// below with its source), so where you land depends on the shape of your
// answers, not on how high the total is.
//
// A side with no answer behind it is null, and a region with a null side has
// no character: a made-up name on top of default answers would be made up
// twice.

import { t } from "./i18n.js";
import { incomePercentile } from "./benchmarks.js";
import {
  cfpbScore, metMinutes, learningScore,
  donationVolumeFactor, volunteerFactor, ptmMax
} from "./scoring.js";

// --- where each side is cut, and why ----------------------------------------

// The income median: incomePercentile is calibrated to the Labour Force Survey.
const INCOME_MEDIAN_PERCENTILE = 50;
// The CFPB scale is built so the US adult average sits near 50 (CFPB 2017).
const CFPB_AVERAGE = 50;
// WHO 2020: 150 min of moderate activity a week, 600 MET-min.
const WHO_MET_MINUTES = 600;
// AASM and Sleep Research Society 2015: 7 hours or more for adults.
const SLEEP_HOURS = 7;
// WHO-5 raw 12 or under (50/100) is the usual sign of poor well-being; the
// care notice uses the same line (suggestions.js).
const WHO5_LOW_MAX = 12;
// Thai DMH ST-5: 0-4 is the low-stress band.
const ST5_LOW_MAX = 4;
// LSNS-6 community samples average about 16 of 30 (benchmarks.js cites them).
const LSNS_AVERAGE = 16;
// UCLA-3: 6 or more of 9 is the usual "lonely" line (Steptoe et al., 2013).
const UCLA_NOT_LONELY_MAX = 5;
// CIT Accomplishment, 3 items of 1-5: 11 or more is agreeing on average.
const CITACC_AGREE = 11;
// Half of the Active learning part (about 2.5 h a week plus a middle CIT answer).
const LEARNING_HALF = 50;
// Half of either giving part: 250 THB a month (or 1% of income), or 2 hours.
const GIVING_HALF = 50;
// PTM: 12 of 20 (five items) is above the middle answer; the same share of 24
// since v177's sixth item.
const PTM_ABOVE_MIDDLE_SHARE = 0.6;
// GEB: half of 24.
const GEB_HALF = 12;
// Thailand's average is about 3 single-use pieces a day (scoring.js).
const PLASTIC_THAI_AVERAGE = 3;
// A common rule of thumb: save 10% of income.
const SAVINGS_RATE = 10;
// Two hours a week of learning, half of the Future skills part's 4 h.
const LEARNING_HOURS = 2;

const num = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));
// A side from a number, or null when the number is missing.
const side = (v, test) => (Number.isFinite(num(v)) ? test(num(v)) : null);

// Each region's two sides as [first, second]; true is the first-named side.
const SIDES = {
  finance: (p, b) => [
    side(p.income, v => incomePercentile(v, p.region) >= INCOME_MEDIAN_PERCENTILE),
    side(b.cfpb, v => cfpbScore(v, p.age) >= CFPB_AVERAGE)
  ],
  physical: (p) => [
    metMinutes(p) >= WHO_MET_MINUTES,
    side(num(p.sleepHours) > 0 ? p.sleepHours : NaN, v => v >= SLEEP_HOURS)
  ],
  mental: (p, b) => [
    side(b.who5, v => v > WHO5_LOW_MAX),
    side(b.st5, v => v <= ST5_LOW_MAX)
  ],
  relationships: (p, b) => [
    side(b.lsns, v => v >= LSNS_AVERAGE),
    side(b.ucla, v => v <= UCLA_NOT_LONELY_MAX)
  ],
  personalGoals: (p, b) => [
    side(b.citacc, v => v >= CITACC_AGREE),
    learningScore(p, b.citlearn) >= LEARNING_HALF
  ],
  socialContribution: (p, b) => [
    Math.max(donationVolumeFactor(p), volunteerFactor(p)) >= GIVING_HALF,
    side(b.ptm, v => v >= PTM_ABOVE_MIDDLE_SHARE * ptmMax(b.ptmItems))
  ],
  environment: (p, b) => [
    side(b.geb, v => v >= GEB_HALF),
    side(p.singleUsePlastics, v => v <= PLASTIC_THAI_AVERAGE)
  ],
  humanityFuture: (p) => [
    safetyNet(p),
    side(p.weeklyLearningHours, v => v >= LEARNING_HOURS)
  ]
};

// The savings rate (the runway it once preferred left in v143).
function safetyNet(p) {
  return side(p.savingsRate, v => v >= SAVINGS_RATE);
}

// --- the characters ---------------------------------------------------------
//
// `sides` names each side as [label, first-named, second-named]. `cast` is in
// the order [both first, first only, second only, neither]. Built on call so
// the words follow the language switch.
const buildCast = () => ({
  finance: {
    sides: [
      [t("Earning"), t("Earns well"), t("Earns modestly")],
      [t("Money"), t("Feels in control"), t("Feels stretched")]
    ],
    cast: [
      { name: t("Treasurer"), line: t("A good income, and a steady hand on it."), tip: t("Give some of the surplus a job: a goal, or a gift.") },
      { name: t("Merchant"), line: t("Good trade, but the till never quite feels settled."), tip: t("One automatic transfer on payday does more than a raise.") },
      { name: t("Sage"), line: t("Knows what enough looks like, and lives by it."), tip: t("A small emergency pot protects the calm you've built.") },
      { name: t("Vendor"), line: t("Building up, one stall at a time."), tip: t("Track one week of spending; control grows before income does.") }
    ],
    research: [
      t("Savings and everyday money habits predict financial well-being more than income alone (US CFPB, Financial Well-Being in America, 2017)."),
      t("Thailand's sufficiency economy philosophy puts having enough, and being in control of it, ahead of having more.")
    ]
  },
  physical: {
    sides: [
      [t("Moving"), t("Moves a lot"), t("Moves a little")],
      [t("Sleep"), t("Rests well"), t("Runs on little rest")]
    ],
    cast: [
      { name: t("Guide"), line: t("Out on the trail every week, and home in time to rest."), tip: t("Keep it going; change the route so it stays fun.") },
      { name: t("Climber"), line: t("All energy, short nights."), tip: t("Rest is part of training. Guard your 7 hours.") },
      { name: t("Herder"), line: t("Rests well, and takes the slow path."), tip: t("A 10-minute walk after dinner is a first trail.") },
      { name: t("Pilgrim"), line: t("At the start of the path, with the whole mountain ahead."), tip: t("Pick one thing: an earlier night or a short walk. Just one.") }
    ],
    research: [
      t("WHO recommends 150 to 300 minutes of moderate activity a week for adults (WHO guidelines on physical activity, 2020)."),
      t("Adults need 7 or more hours of sleep a night (American Academy of Sleep Medicine and Sleep Research Society, 2015).")
    ]
  },
  mental: {
    sides: [
      [t("Mood"), t("Feels good"), t("Feels low")],
      [t("Pressure"), t("Little pressure"), t("A lot of pressure")]
    ],
    cast: [
      { name: t("Poet"), line: t("Calm, and able to notice the good things."), tip: t("Notice what keeps you here, and protect it.") },
      { name: t("Boatman"), line: t("Feeling good while rowing hard against the current."), tip: t("Plan a quiet day before the current picks one for you.") },
      { name: t("Fisher"), line: t("Nothing pressing, but the colour has faded a little."), tip: t("Do one thing you used to enjoy, this week.") },
      { name: t("Wayfarer"), line: t("Carrying a lot right now. It passes, and you don't have to carry it alone."), tip: t("The free, 24-hour numbers are at the top of this page.") }
    ],
    research: [
      t("The WHO-5 Well-Being Index is one of the most widely used short checks of well-being (Topp et al., 2015)."),
      t("The ST-5 is the Thai Department of Mental Health's own five-question stress check.")
    ]
  },
  relationships: {
    sides: [
      [t("Circle"), t("A wide circle"), t("A small circle")],
      [t("Bonds"), t("Close bonds"), t("Lighter bonds")]
    ],
    cast: [
      { name: t("Elder"), line: t("Knows everyone, and is close to many."), tip: t("Introduce two friends who would get along.") },
      { name: t("Host"), line: t("Everyone comes to your party; fewer stay to talk."), tip: t("Turn one group chat into a coffee for two.") },
      { name: t("Hearthkeeper"), line: t("Few people, but warm ones."), tip: t("One new face a month keeps the circle growing.") },
      { name: t("Newcomer"), line: t("Still on the way to finding your people."), tip: t("A class or club gives you the same faces every week.") }
    ],
    research: [
      t("Across 148 studies, people with stronger social ties were 50% more likely to survive over the study period (Holt-Lunstad et al., PLOS Medicine, 2010)."),
      t("In the Harvard Study of Adult Development, satisfaction with relationships at 50 predicted health at 80 better than cholesterol did (Waldinger and Schulz, 2023).")
    ]
  },
  personalGoals: {
    sides: [
      [t("Finishing"), t("Gets things done"), t("Finishes less")],
      [t("Growing"), t("Always learning"), t("Learning less right now")]
    ],
    cast: [
      { name: t("Artisan"), line: t("Learns, and delivers."), tip: t("Teach someone; that's the next level.") },
      { name: t("Blacksmith"), line: t("Reliable work, at the same anvil."), tip: t("One new skill a season keeps the craft alive.") },
      { name: t("Apprentice"), line: t("Full of new interests, many of them half-built."), tip: t("Finish one small thing before starting the next.") },
      { name: t("Tinkerer"), line: t("Ideas on the bench, waiting their turn."), tip: t("Give one idea 20 minutes this week.") }
    ],
    research: [
      t("Grit, the passion and perseverance for long-term goals, predicted achievement beyond talent (Duckworth et al., 2007)."),
      t("Belief in your own ability to cope and learn is measured by the General Self-Efficacy Scale (Schwarzer and Jerusalem, 1995).")
    ]
  },
  socialContribution: {
    sides: [
      [t("Giving"), t("Gives often"), t("Gives rarely")],
      [t("Instinct"), t("A strong urge to help"), t("Helps less by instinct")]
    ],
    cast: [
      { name: t("Wayfinder"), line: t("Gives time, money and heart."), tip: t("Bring a friend along; giving spreads.") },
      { name: t("Almsgiver"), line: t("Gives steadily, out of habit and duty."), tip: t("Pick one cause you care about yourself.") },
      { name: t("Helper"), line: t("Wants to help; the time or money hasn't come yet."), tip: t("An hour a month counts. Start there.") },
      { name: t("Traveller"), line: t("On your own road for now."), tip: t("A small kindness to a stranger is a first step.") }
    ],
    research: [
      t("Spending money on others raised happiness more than spending it on yourself (Dunn, Aknin and Norton, Science, 2008)."),
      t("Volunteering was linked to lower mortality in older adults (Okun, Yeung and Brown, 2013).")
    ]
  },
  environment: {
    sides: [
      [t("Habits"), t("Many green habits"), t("Few green habits")],
      [t("Plastic"), t("Little plastic"), t("A lot of plastic")]
    ],
    cast: [
      { name: t("Ranger"), line: t("Careful habits and a light footprint."), tip: t("Share one habit; habits spread.") },
      { name: t("Gardener"), line: t("Cares a lot, but city life keeps handing you plastic."), tip: t("Keep a bottle and a bag by the door.") },
      { name: t("Hermit"), line: t("A light footprint, without really trying."), tip: t("Add one green habit on purpose.") },
      { name: t("Scout"), line: t("Just arriving at the edge of the woods."), tip: t("Say no to the straw and the bag for one week.") }
    ],
    research: [
      t("The General Ecological Behavior scale measures green living as everyday actions, not attitudes (Kaiser, 1998)."),
      t("Thailand ranked among the top six sources of plastic reaching the ocean (Jambeck et al., Science, 2015).")
    ]
  },
  humanityFuture: {
    sides: [
      [t("Safety net"), t("A strong safety net"), t("A thin safety net")],
      [t("Skills"), t("Keeps learning"), t("Learning less right now")]
    ],
    cast: [
      { name: t("Captain"), line: t("Stocked, trained, and ready for any weather."), tip: t("Help someone else build their safety net.") },
      { name: t("Farmer"), line: t("A full granary, and the skills you know."), tip: t("One course a year keeps you ready for change.") },
      { name: t("Voyager"), line: t("Travels light, and adapts anywhere."), tip: t("Set aside one month of expenses, then two.") },
      { name: t("Stargazer"), line: t("Looking ahead, with the view just opening."), tip: t("Start with one: a small savings pot, or a free online course.") }
    ],
    research: [
      t("A widely used guideline is an emergency fund covering 3 to 6 months of expenses."),
      t("Employers expect 44% of workers' core skills to change within five years (World Economic Forum, Future of Jobs Report, 2023).")
    ]
  }
});

// The cast index for a pair of sides: [both, first only, second only, neither].
export function castIndex(first, second) {
  return (first ? 0 : 2) + (second ? 0 : 1);
}

// Your character in one region, or null when either side has no answer.
export function characterFor(state, key) {
  const read = SIDES[key];
  if (!read || !state) return null;
  const [first, second] = read(state.profile || {}, state.baseline || {});
  if (first === null || second === null) return null;
  const region = buildCast()[key];
  const index = castIndex(first, second);
  return {
    key,
    index,
    ...region.cast[index],
    cast: region.cast.map(c => c.name),
    sides: region.sides.map(([label, yes, no], i) => ({ label, value: (i === 0 ? first : second) ? yes : no })),
    research: region.research
  };
}

export const characterDisclaimer = () =>
  t("These characters are made up for fun, not a professional assessment. The lines they are drawn on come from published research.");
