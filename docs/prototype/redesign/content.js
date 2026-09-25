/* docs/prototype/redesign/content.js - the LBI content poured into the frame.
 *
 * Every chapter name, theme, colour, motif, question and answer below is
 * copied from the app (views/journey.js, aspects.js, surveys.js, th.js), so
 * the prototype shows LBI's real words. Lines marked NEW are prototype copy
 * written for this design; they have no app string yet and their Thai needs
 * the owner's read before any of it moves into th.js.
 *
 * HOME_SAMPLE is a fixed, invented reading so Home has something to show. It
 * is not anyone's data and the prototype never reads the app's storage.
 */
(function () {
  "use strict";

  var CHAPTERS = [
    { aspect: "finance", art: "market", photo: true, hue: "#d9a441", wash: "#f2e2bb",
      region: { en: "The Market", th: "ตลาด" },
      label: { en: "Finance", th: "การเงิน" },
      theme: { en: "Where what you have meets what it costs.", th: "ที่ซึ่งสิ่งที่คุณมีมาเจอกับราคาที่ต้องจ่าย" },
      blurb: { en: "Income standing, financial well-being, and savings habits.", th: "สถานะรายได้ สุขภาวะทางการเงิน และนิสัยการออม" },
      motif: "M4 7a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 12a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 17a8 3 0 1 0 16 0a8 3 0 1 0-16 0" },
    { aspect: "physical", art: "highlands", photo: true, hue: "#3fa796", wash: "#d9eeea",
      region: { en: "The Highlands", th: "ที่ราบสูง" },
      label: { en: "Physical", th: "ร่างกาย" },
      theme: { en: "The climb your body does every day, whether or not you notice it.", th: "การไต่ที่ร่างกายคุณทำทุกวัน ไม่ว่าคุณจะรู้ตัวหรือไม่" },
      blurb: { en: "Weekly activity, body composition, sleep, and nutrition.", th: "กิจกรรมรายสัปดาห์ องค์ประกอบร่างกาย การนอน และโภชนาการ" },
      motif: "M2 19 L8 8 L12 14 L16 6 L22 19" },
    { aspect: "mental", art: "still-water", photo: true, hue: "#5b8dd9", wash: "#dde8f8", quiet: true,
      region: { en: "The Still Water", th: "ผืนน้ำนิ่ง" },
      label: { en: "Mental", th: "จิตใจ" },
      theme: { en: "Where the surface tells you something about what is underneath.", th: "ที่ซึ่งผิวน้ำบอกบางอย่างเกี่ยวกับสิ่งที่อยู่ข้างใต้" },
      blurb: { en: "Well-being (WHO-5) and stress resilience (Thai DMH ST-5).", th: "สุขภาวะ (WHO-5) และความทนทานต่อความเครียด (ST-5 กรมสุขภาพจิต)" },
      motif: "M2 11a10 5 0 0 1 20 0 M5 15a7 3.5 0 0 1 14 0 M8 19a4 2 0 0 1 8 0" },
    { aspect: "relationships", art: "commons", photo: true, hue: "#d9738f", wash: "#f7dfe6", quiet: true,
      region: { en: "The Commons", th: "ลานกลางเมือง" },
      label: { en: "Relationships", th: "ความสัมพันธ์" },
      theme: { en: "The people you would call, and the people who would call you.", th: "คนที่คุณจะโทรหา และคนที่จะโทรหาคุณ" },
      blurb: { en: "Social network strength, loneliness, and romantic satisfaction.", th: "ความแข็งแรงของเครือข่ายสังคม ความเหงา และความพึงพอใจในความรัก" },
      motif: "M8 9a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5 M16 9a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5 M3 20c0-3.5 2.2-6 5-6s5 2.5 5 6 M11 20c0-3.5 2.2-6 5-6s5 2.5 5 6" },
    { aspect: "personalGoals", art: "workshop", photo: false, hue: "#e08a3c", wash: "#f8e4cf",
      region: { en: "The Workshop", th: "โรงช่าง" },
      label: { en: "Personal Goals", th: "เป้าหมายส่วนตัว" },
      theme: { en: "What you are building, and whether you believe you can finish it.", th: "สิ่งที่คุณกำลังสร้าง และความเชื่อว่าคุณจะทำมันจนจบได้" },
      blurb: { en: "Goal progress, self-efficacy, and active learning habits.", th: "ความคืบหน้าตามเป้าหมาย การรับรู้ความสามารถของตนเอง และนิสัยการเรียนรู้" },
      motif: "M8 3 L8 21 M16 3 L16 21 M8 8 L16 8 M8 13 L16 13 M8 18 L16 18" },
    { aspect: "socialContribution", art: "crossroads", photo: true, hue: "#8d6fd1", wash: "#e6dff8",
      region: { en: "The Crossroads", th: "ทางแยก" },
      label: { en: "Social Contribution", th: "การช่วยเหลือสังคม" },
      theme: { en: "What you hand to people you will never meet again.", th: "สิ่งที่คุณส่งต่อให้คนที่คุณจะไม่ได้พบอีก" },
      blurb: { en: "Giving, volunteering, and prosocial habits.", th: "การให้ การอาสา และพฤติกรรมเพื่อสังคม" },
      motif: "M12 21 L12 4 M12 6 L19 6 L17 8.5 L12 8.5 M12 12 L5 12 L7 14.5 L12 14.5" },
    { aspect: "environment", art: "wildwood", photo: false, hue: "#2e9e5b", wash: "#d8eddf",
      region: { en: "The Wildwood", th: "ป่าใหญ่" },
      label: { en: "Environment", th: "สิ่งแวดล้อม" },
      theme: { en: "The mark a single ordinary day leaves behind it.", th: "ร่องรอยที่วันธรรมดาเพียงวันเดียวทิ้งไว้" },
      blurb: { en: "Plastic footprint and everyday green behavior.", th: "การใช้พลาสติกและพฤติกรรมรักษ์โลกในชีวิตประจำวัน" },
      motif: "M12 21 L12 16 M5 16 L12 5 L19 16 Z M8 11 L16 11" },
    { aspect: "humanityFuture", art: "lookout", photo: true, hue: "#5a63b8", wash: "#e0e2f5",
      region: { en: "The Lookout", th: "จุดชมวิว" },
      label: { en: "Humanity's Future", th: "อนาคตมนุษยชาติ" },
      theme: { en: "How far ahead you are looking, and who is standing there with you.", th: "คุณมองไปข้างหน้าไกลแค่ไหน และมีใครยืนอยู่ตรงนั้นกับคุณ" },
      blurb: { en: "Future skills, future orientation, and maintaining what lasts.", th: "ทักษะแห่งอนาคต การมองการณ์ไกล และการดูแลรักษาสิ่งที่อยู่ได้นาน" },
      motif: "M2 20 L22 20 M12 3 L13.8 8.2 L19 8.2 L14.8 11.6 L16.4 17 L12 13.8 L7.6 17 L9.2 11.6 L5 8.2 L10.2 8.2 Z" }
  ];

  var opts = function (pairs) {
    return pairs.map(function (p) { return { en: p[0], th: p[1] }; });
  };

  // Three items from the real instruments, one per chapter. The Still Water
  // is here on purpose: it shows the quiet version of a question.
  var QUESTIONS = [
    { chapter: 0,
      stem: { en: "CFPB Financial Well-Being Assessment", th: "แบบประเมินสุขภาวะทางการเงิน (CFPB)" },
      text: { en: "I am just getting by financially.", th: "ฉันแค่พอประทังตัวไปเดือนต่อเดือน" },
      options: opts([["Not at all", "ไม่ตรงเลย"], ["Very little", "ตรงเพียงเล็กน้อย"], ["Somewhat", "ปานกลาง"],
        ["Describes me very well", "ตรงกับฉันมาก"], ["Describes me completely", "ตรงกับฉันที่สุด"]]) },
    { chapter: 2,
      stem: { en: "WHO-5 Well-Being Index (past 2 weeks)", th: "ดัชนีสุขภาวะ WHO-5 (2 สัปดาห์ที่ผ่านมา)" },
      text: { en: "I have felt cheerful and in good spirits.", th: "ฉันรู้สึกร่าเริงและอารมณ์ดี" },
      options: opts([["At no time", "ไม่มีเลย"], ["Some of the time", "เป็นบางครั้ง"],
        ["Less than half the time", "น้อยกว่าครึ่งหนึ่งของเวลา"], ["More than half the time", "มากกว่าครึ่งหนึ่งของเวลา"],
        ["Most of the time", "เกือบตลอดเวลา"], ["All of the time", "ตลอดเวลา"]]) },
    { chapter: 4,
      stem: { en: "GSE-6 Self-Efficacy Scale", th: "แบบวัดการรับรู้ความสามารถของตนเอง GSE-6" },
      text: { en: "I can always manage to solve difficult problems if I try hard enough.", th: "ฉันสามารถแก้ปัญหาที่ยากได้เสมอ ถ้าฉันพยายามมากพอ" },
      options: opts([["Not at all true", "ไม่จริงเลย"], ["Hardly true", "แทบไม่จริง"],
        ["Moderately true", "ค่อนข้างจริง"], ["Exactly true", "จริงที่สุด"]]) }
  ];

  // Invented sample for Home. Order matches CHAPTERS.
  var HOME_SAMPLE = {
    scores: [58, 81, 70, 64, 73, 55, 49, 66],
    index: 65,
    strongest: 1,
    lowest: 6,
    feed: [
      { date: "2026.09.21", kind: "review", chapter: 1,
        title: { en: "Sleep up to 7.5 hours a night", th: "นอนเพิ่มเป็น 7.5 ชั่วโมงต่อคืน" }, delta: "+4" },
      { date: "2026.09.14", kind: "review", chapter: 6,
        title: { en: "Two more single-use pieces a day", th: "ใช้พลาสติกครั้งเดียวทิ้งเพิ่มวันละ 2 ชิ้น" }, delta: "−3" },
      { date: "2026.09.08", kind: "goal", chapter: 4,
        title: { en: "Goal set: read for 20 minutes a day", th: "ตั้งเป้าหมาย: อ่านหนังสือวันละ 20 นาที" }, delta: "" },
      { date: "2026.09.01", kind: "journey", chapter: -1,
        title: { en: "Baseline journey complete", th: "ทำแบบประเมินตั้งต้นครบแล้ว" }, delta: "" }
    ]
  };

  var tx = function (en, th) { return { en: en, th: th }; };

  // Invented aspect-page readings, one per chapter (order matches CHAPTERS).
  // Component names are the app's (aspects.js); the numbers are not anyone's.
  // pct null = the app does not rank this aspect against a population.
  var ASPECT_SAMPLE = [
    { pct: 41, comps: [[tx("Income standing", "สถานะรายได้"), 41], [tx("Financial well-being (CFPB)", "สุขภาวะทางการเงิน (CFPB)"), 62]] },
    { pct: 64, comps: [[tx("Activity", "การเคลื่อนไหว"), 90], [tx("Body composition", "องค์ประกอบร่างกาย"), 78],
      [tx("Sleep", "การนอน"), 74], [tx("Nutrition", "โภชนาการ"), 80]] },
    { pct: 58, comps: [[tx("Well-being (WHO-5)", "สุขภาวะ (WHO-5)"), 72], [tx("Stress resilience (ST-5)", "ความทนทานต่อความเครียด (ST-5)"), 67]] },
    { pct: null, comps: [[tx("Social network (LSNS-6)", "เครือข่ายสังคม (LSNS-6)"), 60], [tx("Low loneliness (UCLA-3)", "ความเหงาต่ำ (UCLA-3)"), 70],
      [tx("Romantic satisfaction (RAS)", "ความพึงพอใจในความรัก (RAS)"), 62]] },
    { pct: 61, comps: [[tx("Self-efficacy (GSE)", "การรับรู้ความสามารถของตนเอง (GSE)"), 79], [tx("Goal progress", "ความคืบหน้าตามเป้าหมาย"), 68],
      [tx("Active learning", "การเรียนรู้เชิงรุก"), 71]] },
    { pct: null, comps: [[tx("Giving", "การให้"), 50], [tx("Volunteering", "จิตอาสา"), 38], [tx("Prosocial habits (PTM)", "พฤติกรรมเพื่อสังคม (PTM)"), 75]] },
    { pct: null, comps: [[tx("Plastic reduction", "การลดพลาสติก"), 40], [tx("Green habits (GEB)", "นิสัยรักษ์โลก (GEB)"), 58]] },
    { pct: null, comps: [[tx("Future skills", "ทักษะแห่งอนาคต"), 60], [tx("Future orientation (LFIS)", "การมองการณ์ไกล (LFIS)"), 72]] }
  ];

  // Lumi's per-aspect tip from views/assistant.js, used as the focus line.
  var FOCUS = [
    tx("Your finance score has room to grow. A simple monthly budget and a set savings rate are good starting points.",
      "คะแนนการเงินของคุณยังพัฒนาได้อีก การทำงบรายเดือนง่าย ๆ และตั้งอัตราการออมเป็นจุดเริ่มต้นที่ดี"),
    tx("Your physical activity could use a lift. A short walk today is an easy way to build momentum.",
      "กิจกรรมทางกายของคุณน่าจะเพิ่มได้อีก เดินสั้น ๆ วันนี้เป็นวิธีง่าย ๆ ในการสร้างแรงส่ง"),
    tx("Feeling stretched? Try a slow breathing break — two short inhales through the nose, then one long exhale.",
      "รู้สึกตึงเครียดไหม? ลองพักหายใจช้า ๆ — สูดเข้าทางจมูกสั้น ๆ สองครั้ง แล้วผ่อนออกยาว ๆ หนึ่งครั้ง"),
    tx("Connection matters. Consider reaching out to a close friend or relative this week.",
      "ความสัมพันธ์สำคัญ ลองติดต่อเพื่อนสนิทหรือญาติสักคนในสัปดาห์นี้"),
    tx("Steady practice moves your goals forward. Even 20 minutes of focused learning today helps.",
      "การฝึกฝนสม่ำเสมอช่วยให้เป้าหมายก้าวหน้า แค่ตั้งใจเรียนรู้ 20 นาทีวันนี้ก็ช่วยได้"),
    tx("Small acts of giving add up. A minor kindness or a modest donation strengthens this area.",
      "การให้เล็ก ๆ น้อย ๆ สะสมได้ น้ำใจเล็กน้อยหรือการบริจาคพอประมาณช่วยเสริมด้านนี้"),
    tx("Everyday choices shape your footprint. Separating recyclables today is a simple step.",
      "ทางเลือกในแต่ละวันกำหนดรอยเท้าทางสิ่งแวดล้อมของคุณ การแยกขยะรีไซเคิลวันนี้เป็นก้าวง่าย ๆ"),
    tx("Long-term security grows from consistent habits — saving and upskilling both anchor your future.",
      "ความมั่นคงระยะยาวเติบโตจากนิสัยที่สม่ำเสมอ — การออมและการอัปสกิลต่างช่วยยึดอนาคตของคุณ")
  ];

  // The Weekly Review's fields (views/review.js), grouped one region per
  // screen. Only these five regions have weekly numbers: The Still Water and
  // The Commons are re-assessed monthly, and The Lookout reuses learning hours.
  var MINS_NOTE = tx("Minutes on a day you actually did it, not an average across the week. 30 minutes on each of 3 days = 3 days, 30 minutes.",
    "นับนาทีเฉพาะวันที่ทำจริง ไม่ใช่ค่าเฉลี่ยทั้งสัปดาห์ เช่น ออกกำลัง 30 นาที 3 วัน ให้กรอก 3 วัน และ 30 นาที");
  var f = function (id, label, value, step, max, note) {
    return { id: id, label: label, value: value, step: step || 1, max: max, note: note || null };
  };
  var REVIEW = [
    { chapter: 0, fields: [f("monthlySavings", tx("Monthly Savings (THB)", "เงินออมต่อเดือน (บาท)"), 5000, 100, 1000000)] },
    { chapter: 1, fields: [
      f("weeklyVigorousDays", tx("Vigorous Exercise (Days/Week)", "ออกกำลังหนัก (วัน/สัปดาห์)"), 1, 1, 7),
      f("weeklyVigorousMins", tx("Vigorous Minutes on Each of Those Days", "นาทีต่อวัน เฉพาะวันที่ออกกำลังหนัก"), 30, 5, 600, MINS_NOTE),
      f("weeklyModerateDays", tx("Moderate Exercise (Days/Week)", "ออกกำลังปานกลาง (วัน/สัปดาห์)"), 2, 1, 7),
      f("weeklyModerateMins", tx("Moderate Minutes on Each of Those Days", "นาทีต่อวัน เฉพาะวันที่ออกกำลังปานกลาง"), 40, 5, 600, MINS_NOTE),
      f("weeklyWalkingDays", tx("Walking (Days/Week)", "เดิน (วัน/สัปดาห์)"), 5, 1, 7),
      f("weeklyWalkingMins", tx("Walking Minutes on Each of Those Days", "นาทีต่อวัน เฉพาะวันที่เดิน"), 25, 5, 600, MINS_NOTE),
      f("sleepHours", tx("Average Nightly Sleep (Hours)", "ชั่วโมงนอนเฉลี่ยต่อคืน"), 7, 0.5, 14),
      f("waterLiters", tx("Water Intake per Day (Liters)", "น้ำดื่มต่อวัน (ลิตร)"), 1.8, 0.1, 8),
      f("vegetablePortions", tx("Vegetable Portions per Day", "ผักต่อวัน (ส่วน)"), 3, 1, 20)] },
    { chapter: 4, fields: [f("weeklyLearningHours", tx("Weekly Learning / Study Hours", "ชั่วโมงเรียนรู้/ศึกษาต่อสัปดาห์"), 3, 0.5, 80)] },
    { chapter: 5, fields: [
      f("monthlyDonations", tx("Monthly Donations (THB)", "เงินบริจาคต่อเดือน (บาท)"), 200, 10, 1000000),
      f("volunteeringHours", tx("Volunteering Hours per Month", "ชั่วโมงจิตอาสาต่อเดือน"), 1, 0.5, 200)] },
    { chapter: 6, fields: [f("singleUsePlastics", tx("Single-Use Plastic Items per Day", "พลาสติกใช้ครั้งเดียวต่อวัน (ชิ้น)"), 4, 1, 50)] }
  ];

  // The pledge catalog (goals.js), with the app's titles and descriptions.
  var p = function (id, chapter, title, desc, def, step, min, max) {
    return { id: id, chapter: chapter, title: title, desc: desc, def: def, step: step, min: min, max: max };
  };
  var PLEDGES = [
    p("water", 1, tx("Hydration pledge", "คำมั่นดื่มน้ำ"),
      tx("Average at least {target} L of water per day.", "ดื่มน้ำเฉลี่ยอย่างน้อยวันละ {target} ลิตร"), 2, 0.1, 0.5, 5),
    p("sleep", 1, tx("Sleep pledge", "คำมั่นการนอน"),
      tx("Average at least {target} hours of sleep per night.", "นอนเฉลี่ยอย่างน้อยคืนละ {target} ชั่วโมง"), 7, 0.5, 5, 10),
    p("veg", 1, tx("Vegetables pledge", "คำมั่นกินผัก"),
      tx("Average at least {target} vegetable portions per day (WHO: 400 g of fruit and vegetables, about 5 portions).",
        "กินผักเฉลี่ยอย่างน้อยวันละ {target} ส่วน (WHO: ผักและผลไม้ 400 กรัมต่อวัน ราว 5 ส่วน)"), 5, 0.5, 1, 10),
    p("exercise", 1, tx("Exercise days pledge", "คำมั่นวันออกกำลังกาย"),
      tx("Exercise (vigorous or moderate) on at least {target} days this week.", "ออกกำลังกาย (หนักหรือปานกลาง) อย่างน้อย {target} วันในสัปดาห์นี้"), 3, 1, 1, 7),
    p("learning", 4, tx("Learning pledge", "คำมั่นการเรียนรู้"),
      tx("Spend at least {target} hours on active learning this week.", "ใช้เวลาเรียนรู้อย่างน้อย {target} ชั่วโมงในสัปดาห์นี้"), 3, 0.5, 1, 40),
    p("plastics", 6, tx("Plastics pledge", "คำมั่นลดพลาสติก"),
      tx("Keep single-use plastics to at most {target} pieces per day.", "ใช้พลาสติกใช้ครั้งเดียวไม่เกินวันละ {target} ชิ้น"), 2, 1, 0, 10),
    p("savings", 0, tx("Savings pledge", "คำมั่นการออม"),
      tx("Keep your savings rate at or above {target}% of income.", "รักษาอัตราการออมไว้อย่างน้อย {target}% ของรายได้"), 10, 1, 1, 80),
    p("giving", 5, tx("Giving pledge", "คำมั่นการให้"),
      tx("Donate at least {target} THB this month.", "บริจาคอย่างน้อย {target} บาทในเดือนนี้"), 100, 10, 20, 100000),
    p("volunteering", 5, tx("Volunteering pledge", "คำมั่นจิตอาสา"),
      tx("Volunteer at least {target} hours this month.", "เป็นจิตอาสาอย่างน้อย {target} ชั่วโมงในเดือนนี้"), 2, 0.5, 1, 60)
  ];
  // Invented starting pledges for the Goals screen.
  var SAMPLE_PLEDGES = [{ id: "sleep", target: 7, streak: 3 }, { id: "learning", target: 3, streak: 1 }, { id: "plastics", target: 2, streak: 0 }];
  var PAST_REVIEWS = ["2026.09.21", "2026.09.14", "2026.09.07"];

  // UI strings. NEW = prototype copy with no app string yet.
  var STRINGS = {
    en: {
      menuOpen: "Open menu", menuClose: "Close menu", langSwitch: "เปลี่ยนเป็นภาษาไทย", langCode: "TH",
      lumi: "Lumi (in the full build)", soon: "not in this prototype",
      navStart: "START", navJourney: "JOURNEY", navHome: "HOME",
      mHome: "HOME", mReview: "WEEKLY REVIEW", mGoals: "GOALS", mCompare: "COMPARE",
      mStart: "START", mJourney: "THE JOURNEY", mAspects: "ASPECTS",
      mYou: "YOU", mProfile: "PROFILE", mMethod: "METHOD", mYear: "YEAR IN REVIEW", mPrivacy: "PRIVACY",
      heroWord: "LIFE BALANCE", heroInc: "INDEX", heroTap: "Play with the star",
      lWhy: "(WHY)",
      lWhyHead: ["Eight parts of one life,", "measured against the evidence."],        // NEW
      lHow: "(HOW IT WORKS)",
      lHowP: [
        "A journey through eight places, from The Market to The Lookout. Each one asks about one part of your life.",  // NEW
        "Your answers are compared with cited Thai and international benchmarks.",
        "Local-first: your answers never leave your device, and there is no account."
      ],
      lAspects: "(THE EIGHT ASPECTS)",
      lBegin: "(BEGIN)",
      lBeginHead: ["Eight chapters.", "One star at the end."],                         // NEW
      lBeginCta: "START THE JOURNEY",
      footMethod: "METHOD", footPrivacy: "PRIVACY", footLocal: "Stored only in this browser",
      qOf: "{i} / {n}", qBack: "BACK",
      qQuiet: "This chapter is kept still on purpose.",                                // NEW
      endContinue: "CONTINUE",
      doneHead: "YOUR STAR IS TAKING SHAPE",                                            // NEW
      doneBody: "In the full journey all eight points fill. Here, three did.",          // NEW
      doneCta: "SEE HOME",
      hWord: "YOUR STAR", hInc: "{n}", hIndexSr: "Balance Index {n}",
      hWeek: "(THIS WEEK)",
      hWeekHead: ["Strongest in {strong}.", "{weak} is asking for more."],             // NEW
      hAspects: "(YOUR EIGHT ASPECTS)", hScoreOf: "OUT OF 100",
      hRecent: "(RECENT)", hAll: "VIEW ALL",
      kind: { review: "WEEKLY REVIEW", goal: "GOAL", journey: "JOURNEY" },
      allRegions: "All eight regions",
      hCheck: "(THIS WEEK'S CHECK-IN)",
      hCheckHead: ["A few questions,", "and your star moves."],                        // NEW
      hCheckCta: "START CHECK-IN",
      flag: "PROTOTYPE · SAMPLE DATA",
      // aspect page
      aStanding: "(STANDING)",
      aHead: "{n} out of 100.",                                                      // NEW
      aAhead: "Ahead of {p}% of people like you.",                                     // NEW
      aUnranked: "Not ranked — on purpose.",
      aCovers: "(WHAT IT MEASURES)",                                                   // NEW
      aParts: "(COMPONENT BREAKDOWN)",
      aTrend: "(TREND)", aTrendRow: "Score {n}", aTrendSame: "Same as the week before", // NEW
      aTrendDelta: "{d} on the week before",                                           // NEW
      aKind: "WEEKLY SNAPSHOT",                                                        // NEW
      aFocus: "(SUGGESTED FOCUS)",
      aReviewCta: "START WEEKLY REVIEW", aReassessCta: "START RE-ASSESSMENT",
      aQuiet: "This region is kept still on purpose.",                                  // NEW
      aOpen: "Open {region}",                                                          // NEW
      // weekly review
      rTitle: "WEEKLY REVIEW",
      rStep: "WEEKLY REVIEW · {i} / {n}",                                              // NEW
      rHead: "How was {region} this week?",                                            // NEW
      rNext: "NEXT", rBack: "BACK", rSubmit: "COMPLETE WEEKLY REVIEW",
      rFix: "Please fix the highlighted fields before continuing.",
      rRange: "Between 0 and {max}.",                                                  // NEW
      rDone: "REVIEWED THIS WEEK.",
      rChanged: "{n} numbers changed. Your scores update from them.",                  // NEW
      rChangedOne: "1 number changed. Your scores update from it.",                    // NEW
      rSteady: "Scores steady.",
      rSeeHome: "SEE HOME", rPast: "(PAST REVIEWS)",
      rPastRow: "Five regions reviewed",                                               // NEW
      // goals
      gWord: "WEEKLY PLEDGES", gInc: "{n} ACTIVE",                                      // NEW (inc)
      gMine: "(YOUR PLEDGES)",                                                         // NEW
      gNone: "No pledges yet — add one from the catalog.",
      gStreak: "{n}-week streak",
      gRemove: "REMOVE", gConfirm: "Remove this pledge? Its streak will be lost.",
      gYes: "REMOVE", gNo: "CANCEL",
      gAdd: "(ADD A PLEDGE)", gTarget: "Weekly target", gAddCta: "ADD PLEDGE", gAdded: "ADDED", // NEW (ADDED)
      gGraded: "(GRADED WEEKLY)",                                                      // NEW
      gGradedHead: ["Graded at your next weekly review."]
    },
    th: {
      menuOpen: "เปิดเมนู", menuClose: "ปิดเมนู", langSwitch: "Switch to English", langCode: "EN",
      lumi: "ลูมิ (ในเวอร์ชันเต็ม)", soon: "ยังไม่มีในต้นแบบนี้",
      navStart: "เริ่ม", navJourney: "การเดินทาง", navHome: "หน้าหลัก",
      mHome: "หน้าหลัก", mReview: "ทบทวนรายสัปดาห์", mGoals: "เป้าหมาย", mCompare: "เปรียบเทียบ",
      mStart: "เริ่มต้น", mJourney: "การเดินทาง", mAspects: "แปดด้าน",
      mYou: "คุณ", mProfile: "โปรไฟล์", mMethod: "ระเบียบวิธี", mYear: "สรุปทั้งปี", mPrivacy: "ความเป็นส่วนตัว",
      heroWord: "LIFE BALANCE", heroInc: "INDEX", heroTap: "เล่นกับดาว",
      lWhy: "(ทำไม)",
      lWhyHead: ["ชีวิตหนึ่งชีวิต แปดด้าน", "วัดเทียบกับหลักฐานจริง"],
      lHow: "(ทำงานอย่างไร)",
      lHowP: [
        "การเดินทางผ่านแปดสถานที่ ตั้งแต่ตลาดไปจนถึงจุดชมวิว แต่ละแห่งถามถึงชีวิตคุณหนึ่งด้าน",
        "คำตอบของคุณถูกเทียบกับเกณฑ์อ้างอิงของไทยและนานาชาติที่มีแหล่งที่มา",
        "ข้อมูลอยู่ในเครื่องคุณเท่านั้น ไม่มีการส่งออกไปที่ใด และไม่ต้องสมัครบัญชี"
      ],
      lAspects: "(แปดด้านของชีวิต)",
      lBegin: "(เริ่มต้น)",
      lBeginHead: ["แปดบท", "และดาวหนึ่งดวงในตอนจบ"],
      lBeginCta: "เริ่มการเดินทาง",
      footMethod: "ระเบียบวิธี", footPrivacy: "ความเป็นส่วนตัว", footLocal: "เก็บไว้ในเบราว์เซอร์นี้เท่านั้น",
      qOf: "{i} / {n}", qBack: "ย้อนกลับ",
      qQuiet: "บทนี้ตั้งใจให้นิ่ง",
      endContinue: "ไปต่อ",
      doneHead: "ดาวของคุณเริ่มเป็นรูปร่าง",
      doneBody: "ในการเดินทางเต็ม ดาวจะครบทั้งแปดแฉก ในต้นแบบนี้ครบสามแฉก",
      doneCta: "ไปหน้าหลัก",
      hWord: "YOUR STAR", hInc: "{n}", hIndexSr: "ดัชนีสมดุล {n}",
      hWeek: "(สัปดาห์นี้)",
      hWeekHead: ["จุดแข็งที่สุดคือ{strong}", "{weak}ยังรอให้คุณใส่ใจอีกนิด"],
      hAspects: "(แปดด้านของคุณ)", hScoreOf: "จาก 100",
      hRecent: "(ล่าสุด)", hAll: "ดูทั้งหมด",
      kind: { review: "ทบทวนรายสัปดาห์", goal: "เป้าหมาย", journey: "การเดินทาง" },
      allRegions: "ครบทั้งแปดแห่ง",
      hCheck: "(เช็กอินสัปดาห์นี้)",
      hCheckHead: ["ตอบไม่กี่ข้อ", "แล้วดาวของคุณจะขยับ"],
      hCheckCta: "เริ่มเช็กอิน",
      flag: "ต้นแบบ · ข้อมูลตัวอย่าง",
      aStanding: "(สถานะ)",
      aHead: "{n} จาก 100",
      aAhead: "สูงกว่า {p}% ของคนที่คล้ายคุณ",
      aUnranked: "ไม่จัดอันดับ — โดยตั้งใจ",
      aCovers: "(สิ่งที่วัด)",
      aParts: "(องค์ประกอบย่อย)",
      aTrend: "(แนวโน้ม)", aTrendRow: "คะแนน {n}", aTrendSame: "เท่ากับสัปดาห์ก่อน",
      aTrendDelta: "{d} จากสัปดาห์ก่อน",
      aKind: "ภาพรวมรายสัปดาห์",
      aFocus: "(จุดที่ควรโฟกัส)",
      aReviewCta: "เริ่มทบทวนรายสัปดาห์", aReassessCta: "เริ่มประเมินซ้ำ",
      aQuiet: "พื้นที่นี้ตั้งใจให้นิ่ง",
      aOpen: "เปิด{region}",
      rTitle: "ทบทวนรายสัปดาห์",
      rStep: "ทบทวนรายสัปดาห์ · {i} / {n}",
      rHead: "สัปดาห์นี้{region}เป็นอย่างไรบ้าง",
      rNext: "ถัดไป", rBack: "ย้อนกลับ", rSubmit: "ส่งการทบทวนรายสัปดาห์",
      rFix: "กรุณาแก้ไขช่องที่ไฮไลต์ก่อนดำเนินการต่อ",
      rRange: "ระหว่าง 0 ถึง {max}",
      rDone: "ทบทวนสัปดาห์นี้แล้ว",
      rChanged: "เปลี่ยนตัวเลข {n} ช่อง คะแนนจะอัปเดตตามนี้",
      rChangedOne: "เปลี่ยนตัวเลข 1 ช่อง คะแนนจะอัปเดตตามนี้",
      rSteady: "คะแนนคงที่",
      rSeeHome: "ไปหน้าหลัก", rPast: "(การทบทวนที่ผ่านมา)",
      rPastRow: "ทบทวนครบห้าพื้นที่",
      gWord: "คำมั่นรายสัปดาห์", gInc: "{n} รายการ",
      gMine: "(คำมั่นของคุณ)",
      gNone: "ยังไม่มีคำมั่น — เพิ่มจากรายการด้านล่าง",
      gStreak: "ต่อเนื่อง {n} สัปดาห์",
      gRemove: "ลบ", gConfirm: "ลบคำมั่นนี้หรือไม่? สถิติต่อเนื่องจะหายไป",
      gYes: "ลบ", gNo: "ยกเลิก",
      gAdd: "(เพิ่มคำมั่นใหม่)", gTarget: "เป้าหมายรายสัปดาห์", gAddCta: "เพิ่มคำมั่น", gAdded: "เพิ่มแล้ว",
      gGraded: "(ตรวจทุกสัปดาห์)",
      gGradedHead: ["จะตรวจในการทบทวนรายสัปดาห์ครั้งถัดไป"]
    }
  };

  window.LBI_PROTO = {
    CHAPTERS: CHAPTERS, QUESTIONS: QUESTIONS, HOME_SAMPLE: HOME_SAMPLE, STRINGS: STRINGS,
    ASPECT_SAMPLE: ASPECT_SAMPLE, FOCUS: FOCUS, REVIEW: REVIEW, PLEDGES: PLEDGES,
    SAMPLE_PLEDGES: SAMPLE_PLEDGES, PAST_REVIEWS: PAST_REVIEWS
  };
})();
