/* docs/prototype/redesign/content-more.js - the third batch's content.
 *
 * Side by Side, Your year, the share card, Profile, Methodology, Lumi and the
 * mental-health notice. Same rule as content.js: the words are the app's own
 * (views/leaderboard.js, yearreview.js, share.js, profile.js, methodology.js,
 * suggestions.js, with their Thai from th.js) unless a line is marked NEW.
 * Every number here is an invented sample, not anyone's data.
 *
 * Loads after content.js and before proto.js; it adds to window.LBI_PROTO.
 */
(function () {
  "use strict";
  var P = window.LBI_PROTO;
  if (!P) return;
  var tx = function (en, th) { return { en: en, th: th }; };

  // The app's population averages (averages.js AVERAGE_ASPECT_SCORES), in
  // chapter order. The Side by Side marks every score against these.
  var AVERAGES = [49, 62, 69, 70, 57, 32, 50, 50];

  // Invented people for Side by Side, as if their comparison codes were pasted.
  var FRIENDS_SAMPLE = [
    { id: "f1", name: "Nok", aspects: [44, 70, 76, 78, 60, 48, 61, 52] },
    { id: "f2", name: "Ton", aspects: [66, 58, 64, 72, 52, 30, 55, 47] }
  ];

  // Invented profile and year. 2027-03-14 is 170 days after 2026-09-25.
  var PROFILE_SAMPLE = {
    name: "Ploy", age: 29, income: 32000, height: 162, weight: 55,
    gender: tx("Prefer not to say", "ไม่ระบุ"),
    birthday: tx("14 March", "14 มีนาคม"),
    region: tx("Bangkok & Vicinity", "กรุงเทพฯ และปริมณฑล"),
    employment: tx("Office Worker / Salary Employee", "พนักงานออฟฟิศ / พนักงานประจำ"),
    relationship: tx("In a Relationship / Married", "มีแฟน / แต่งงานแล้ว")
  };
  var YEAR_SAMPLE = {
    level: 29, closes: tx("14 Mar", "14 มี.ค."), days: 170, weeks: 24, xp: 186, possible: 240,
    anchor: tx("16 Mar", "16 มี.ค."),
    // [chapter, change since the anchor snapshot], largest first as the app sorts
    movement: [[1, 6], [4, 4], [6, -3], [0, 2], [5, 1]],
    filed: [{ level: 28, closed: "2026.03.14", xp: 412, possible: 520 },
      { level: 27, closed: "2025.03.14", xp: 198, possible: 310 }]
  };

  // Methodology: the first sentence of each aspect's formula (the page has
  // the full text), and who each aspect is compared with (COMPARISON_SAMPLES).
  var FORMULAS = [
    tx("15% income standing + 85% CFPB Financial Well-Being score (official age-banded table).",
      "15% ระดับรายได้ + 85% คะแนนสุขภาวะทางการเงิน CFPB (ตารางทางการแยกช่วงอายุ)"),
    tx("40% activity (IPAQ MET-minutes vs the WHO 600 guideline) + 20% Asian-BMI band + 20% sleep (Jenkins Sleep Scale + reported duration) + 20% nutrition (vegetables + water). Missing measurements are omitted and the weights renormalized — never faked.",
      "40% การเคลื่อนไหว (MET-นาทีตาม IPAQ เทียบเกณฑ์ WHO 600) + 20% ช่วง BMI เอเชีย + 20% การนอน (Jenkins Sleep Scale + ชั่วโมงนอนที่รายงาน) + 20% โภชนาการ (ผัก + น้ำ) ค่าที่ไม่ได้กรอกจะถูกตัดออกและกระจายน้ำหนักใหม่ ไม่มีการแต่งตัวเลขแทน"),
    tx("50% WHO-5 well-being + 50% ST-5 stress resilience (Thai DMH cutoffs, inverted so calmer scores higher). The in-depth PSS-10 refines the stress half when completed.",
      "50% สุขภาวะ WHO-5 + 50% ความทนทานต่อความเครียด ST-5 (เกณฑ์กรมสุขภาพจิต กลับด้านให้ยิ่งสงบยิ่งคะแนนสูง) แบบประเมินเชิงลึก PSS-10 จะละเอียดขึ้นเมื่อทำครบ"),
    tx("40% social network (LSNS-6) + 30% low loneliness (UCLA-3) + 30% relationship satisfaction (RAS, couples only). Singles reweight to 50/50 — being single is never penalized.",
      "40% เครือข่ายสังคม (LSNS-6) + 30% ความเหงาต่ำ (UCLA-3) + 30% ความพึงพอใจในความสัมพันธ์ (RAS เฉพาะคู่รัก) คนโสดกระจายน้ำหนักเป็น 50/50 — ความโสดไม่ถูกหักคะแนน"),
    tx("An equal third each: goal progress (CIT Accomplishment), self-efficacy (GSE), and active learning — half your weekly study hours, half the CIT Learning subscale.",
      "แบ่งเท่ากันสามส่วน: ความคืบหน้าตามเป้าหมาย (CIT Accomplishment), การรับรู้ความสามารถของตนเอง (GSE) และการเรียนรู้เชิงรุก — ครึ่งหนึ่งมาจากชั่วโมงเรียนต่อสัปดาห์ อีกครึ่งมาจากแบบวัด CIT Learning"),
    tx("40% donations (frequency + amount vs income) + 40% action (volunteering hours + helping behavior) + 20% civic participation.",
      "40% การบริจาค (ความถี่ + จำนวนเทียบรายได้) + 40% การลงมือทำ (ชั่วโมงจิตอาสา + พฤติกรรมช่วยเหลือ) + 20% การมีส่วนร่วมทางสังคม"),
    tx("40% waste (daily single-use plastics vs the ~3/day Thai average + recycling habits) + 40% transit choices + 20% conservation habits.",
      "40% ขยะ (พลาสติกใช้ครั้งเดียวต่อวันเทียบค่าเฉลี่ยไทย ~3 ชิ้น/วัน + นิสัยแยกขยะ) + 40% การเลือกการเดินทาง + 20% นิสัยประหยัดพลังงาน"),
    tx("20% future skills + 20% legacy actions + 20% offering (giving toward future generations and passing skills on) + 20% long-horizon planning + 20% maintaining (keeping a home, tools, land, animals or something shared in good order).",
      "20% ทักษะแห่งอนาคต + 20% การสร้างมรดกเชิงบวก + 20% การส่งต่อ (การให้เพื่อคนรุ่นหลังและการถ่ายทอดทักษะ) + 20% การวางแผนระยะยาว + 20% การดูแลรักษา (การดูแลบ้าน เครื่องมือ ที่ดิน สัตว์เลี้ยง หรือของส่วนรวมให้อยู่ในสภาพดี)")
  ];
  var WHERE = {
    thWorking: tx("Thailand · working age", "ไทย · วัยทำงาน"),
    thAdults: tx("Thailand · adults", "ไทย · ผู้ใหญ่"),
    deAdultsAge: tx("Germany · adults, by age band", "เยอรมนี · ผู้ใหญ่ แยกตามช่วงอายุ"),
    multi: tx("25 countries · adults", "25 ประเทศ · ผู้ใหญ่"),
    wrongAgePlusEngland: tx("Norms: wrong age band. Band placement: England · adults 16+",
      "เกณฑ์อ้างอิง: ช่วงอายุไม่ตรง · การจัดช่วง: อังกฤษ · ผู้ใหญ่ 16 ปีขึ้นไป"),
    noThaiNorm: tx("None published — measured, not ranked", "ยังไม่มีที่เผยแพร่ — วัดผล แต่ไม่จัดอันดับ")
  };
  var CLAIM = {
    ranked: tx("Ranked", "จัดอันดับ"),
    table: tx("Ranked from a published table", "จัดอันดับจากตารางที่ตีพิมพ์"),
    band: tx("Band placement", "จัดช่วงตามอัตราการมีส่วนร่วม"),
    none: tx("Not ranked", "ไม่จัดอันดับ"),
    noneBanded: tx("Not ranked — band placement only", "ไม่จัดอันดับ — บอกได้เพียงช่วงคะแนน")
  };
  // sample names stay in English: they name published datasets (as in the app)
  var COMPARED = [
    { sample: "Thai worker wages (Labour Force Survey via Bank of Thailand)", where: "thWorking", claim: "ranked" },
    { sample: "Thai adults meeting the WHO activity guideline; Thai NHES for BMI", where: "thAdults", claim: "ranked" },
    { sample: "WHO-5 community norms, representative German sample (Kliem et al. 2025, Table 2 — cumulative percentiles by age band)", where: "deAdultsAge", claim: "table" },
    { sample: "UCLA-3: US Health and Retirement Study, ages 57-85. LSNS-6: European over-65s. Band placement only: Community Life Survey 2024/25 (DCMS), England, adults 16+.", where: "wrongAgePlusEngland", claim: "noneBanded" },
    { sample: "General Self-Efficacy Scale, 25-country pooled norms (N=19,120)", where: "multi", claim: "ranked" },
    { sample: "CAF World Giving Index — Thai donating and volunteering rates", where: "thAdults", claim: "band" },
    { sample: "Thai single-use plastic use per person per day — placement only, no published distribution", where: "thAdults", claim: "noneBanded" },
    { sample: "No published Thai norm for purpose, legacy or generativity", where: "noThaiNorm", claim: "none" }
  ];

  // The duty-of-care notice (suggestions.js getMentalHealthNotice). The phone
  // numbers are Thailand's and are never translated.
  var NOTICE = {
    title: tx("If things feel heavy, you don't have to face it alone", "ถ้ารู้สึกหนักใจ คุณไม่จำเป็นต้องเผชิญมันเพียงลำพัง"),
    body: tx("Your recent well-being and stress answers suggest you may be going through a difficult time. This is a self-check, not a diagnosis — talking to a professional can help.",
      "คำตอบเรื่องสุขภาวะและความเครียดล่าสุดของคุณ บ่งชี้ว่าคุณอาจกำลังเผชิญช่วงเวลาที่ยากลำบาก นี่เป็นเพียงการประเมินตนเอง ไม่ใช่การวินิจฉัย การพูดคุยกับผู้เชี่ยวชาญสามารถช่วยได้"),
    lines: [
      { label: tx("Dept. of Mental Health hotline (free, 24 hrs)", "สายด่วนสุขภาพจิต กรมสุขภาพจิต (ฟรี ตลอด 24 ชม.)"), tel: "1323" },
      { label: tx("Samaritans of Thailand", "สมาคมสะมาริตันส์แห่งประเทศไทย"), tel: "02-113-6789" },
      { label: tx("Medical emergency", "เหตุฉุกเฉินทางการแพทย์"), tel: "1669" }
    ]
  };

  var MORE = {
    en: {
      lumi: "Lumi's tip",                                                              // NEW
      mShare: "SHARE CARD",                                                            // NEW
      noticeProto: "Shown here so the prototype can show it. The app shows it only when the well-being or stress answers cross the screening cutoff.", // NEW
      // Lumi
      lumiLabel: "(LUMI)", lumiClose: "CLOSE",
      // Side by Side
      cWord: "SIDE BY SIDE", cInc: "YOU + {n}",                                         // NEW (inc)
      cLabel: "(SIDE BY SIDE)",
      cHead: ["Not a ranking.", "Where you differ, not who is ahead."],               // NEW
      cCodes: "(COMPARISON CODES)",
      cCodesP: "Share your code with others over LINE or Discord, and paste theirs below. A code carries only a name and the eight aspect scores — no age, no points, nothing else. Re-paste a newer code any time to update someone.",
      cMine: "Your Comparison Code", cCopy: "COPY", cCopied: "COPIED!",
      cAddLabel: "Add someone's code", cAdd: "ADD",
      cOver: "(OVER EACH OTHER)",                                                       // NEW
      cOverP: "Pick whose star lies over yours. The dashed line is the population average.", // NEW
      cPick: "Whose star to lay over yours",                                           // NEW
      cIntro: "Not a ranking. Each column is one person's eight aspects, marked against the population average — so you can see where you differ, not who is ahead.",
      cNone: "No one added yet. Paste someone's comparison code above to see their eight aspects beside yours.",
      cAvg: "Population average",
      cAbove: "At or above the population average", cBelow: "Below the population average",
      cYou: "{name} (You)", cRemove: "Remove {name}",
      cAspects: "(EIGHT ASPECTS, SIDE BY SIDE)",                                        // NEW
      cLearn: "(WHAT THEY HAVE CLEARED)",                                               // NEW
      cClears: "{name} clears the population average in {aspects}, where you do not yet.",
      cAdded: "{name} added.", cUpdated: "{name} updated.", cRemoved: "{name} removed.", // NEW
      errPrefix: "Comparison codes start with \"{prefix}\".",
      errDamaged: "That code is damaged — ask the participant to copy it again.",
      errVersion: "Unsupported comparison code version.",
      errName: "Comparison code is missing a name.",
      errScores: "Comparison code has invalid aspect scores.",
      errFull: "Participant list is full (max {max}).",
      // Your year
      yWord: "YEAR", yTitle: "Year {level}",
      yLabel: "(YOUR YEAR)",
      yCloses: "Closes on {date} — {days} days from now.", yWeeks: "{weeks} weeks still to run.",
      yPoints: "(THIS YEAR'S POINTS)",
      yPointsP: "{xp} points earned of the {possible} your pledges have offered so far.",
      yLevelP: "Your level is simply your age — a fact about you, not a score you earned. Tell the app which day your year turns and it can close each year and open the next one for you.",
      yPointsAria: "This year's points",
      yMove: "(MOVEMENT THIS YEAR)",
      yMoveP: "Measured against your closest recorded snapshot, {date}.",
      yFiled: "(YEARS FILED)", yFiledRow: "{xp} / {possible} points", yClosed: "CLOSED",   // NEW (CLOSED)
      yTurn: "(THE DAY YOUR YEAR TURNS)",                                               // NEW
      yChange: "Change the day your year turns",
      yChangeCta: "OPEN PROFILE",                                                       // NEW
      // share card
      sTitle: "Share your radar", sLabel: "(SHARE YOUR RADAR)",
      sStyle: "Card style", sLight: "Light", sDark: "Dark",
      sShow: "What to show", sShape: "Shape only", sNames: "Aspect names", sAll: "Everything",
      sNote: "Instagram cannot accept a post directly from a website. Pick Instagram in the share sheet, or save the image and post it from the app.",
      sShare: "SHARE", sSave: "SAVE IMAGE",
      sPreview: "Preview of your shareable card",
      sStar: "YOUR STAR", sIndex: "BALANCE INDEX {n}",                                   // NEW
      // profile
      pWord: "YOUR PROFILE",
      pBlurb: "Update the slower-moving facts about you. Day-to-day quantities like sleep, water, and activity live in the Weekly Review.",
      pIdentity: "(IDENTITY)", pContext: "(LIFE CONTEXT)", pBody: "(FINANCE & BODY)",
      pName: "Name", pAge: "Age", pGender: "Gender (for benchmark norms)", pBirthday: "Birthday",  // NEW (Birthday)
      pRegion: "Primary Region (Cost of Living Mapping)", pEmployment: "Employment Status",
      pRelationship: "Relationship Status",
      pIncome: "Monthly Individual Income (Net THB)", pHeight: "Height (cm)", pWeight: "Weight (kg)",
      pGuide: "Gender and employment guide your benchmarks and recommendations — they don't change your scores.",
      pEditNote: "Editing these is in the full build.",                                 // NEW
      pMotion: "(MOTION)", pReduce: "Reduce motion", pOff: "Off",                       // NEW (Off)
      pReduceP: "Keeps animations to quick fades and finished states. It can only reduce motion; your device's own setting always applies.",
      pData: "(DATA & BACKUP)",
      pDataP: "Your data lives only in this browser. Export a backup regularly — clearing site data erases it.",
      pExport: "EXPORT", pImport: "IMPORT", pReset: "RESET DATA",
      // methodology (x: h is Home's prefix)
      xWord: "HOW SCORES ARE MEASURED",
      xIntro: "Each aspect score (0-100) combines published, validated questionnaires with facts you report about your life. This page shows every instrument, how it is scored, how the parts are weighted, and the known limitations — so no number is a black box.",
      xCare: "This is a self-reflection tool, not a medical or psychological diagnosis. If a score worries you, treat it as a prompt to talk to a professional, not as a verdict.",
      xNot: "(WHAT IT DOES NOT MEASURE)",                                               // NEW (label)
      xWorth: "One thing this app does not measure: your worth as a person. Every number here is built from behavior you reported and circumstances you were handed — what you earn, how you slept, who is near you, how much time you have — and all of those move. Read a low score as a description of a situation, never as a judgment on the person living in it.",
      xEight: "(THE EIGHT ASPECTS)",
      xCompared: "(WHO YOU ARE ACTUALLY COMPARED WITH)",
      xGrades: "(GRADES AND THE BALANCE INDEX)",
      xNo100: "No score in this app reaches 100 — not an aspect, not the Balance Index. The arithmetic is allowed to, and then the displayed figure stops at 99. That is a stance rather than a rounding rule: a perfect score would read as “nothing left to do” on an instrument whose whole purpose is to point at the next step."
    },
    th: {
      lumi: "เคล็ดลับจากลูมิ",
      mShare: "การ์ดแชร์",
      noticeProto: "แสดงไว้ตรงนี้เพื่อให้เห็นในต้นแบบ ในแอปจะแสดงเฉพาะเมื่อคำตอบเรื่องสุขภาวะหรือความเครียดผ่านเกณฑ์คัดกรอง",
      lumiLabel: "(ลูมิ)", lumiClose: "ปิด",
      cWord: "SIDE BY SIDE", cInc: "คุณ + {n}",
      cLabel: "(เทียบเคียงกัน)",
      cHead: ["ไม่ใช่การจัดอันดับ", "ดูว่าต่างกันตรงไหน ไม่ใช่ใครนำใคร"],
      cCodes: "(รหัสเปรียบเทียบ)",
      cCodesP: "แชร์รหัสของคุณให้ผู้อื่นทาง LINE หรือ Discord แล้วนำรหัสของพวกเขามาวางด้านล่าง รหัสมีแค่ชื่อและคะแนนรายด้านทั้งแปด — ไม่มีอายุ ไม่มีคะแนนสะสม ไม่มีอย่างอื่น วางรหัสใหม่ได้ทุกเมื่อเพื่ออัปเดตข้อมูลของแต่ละคน",
      cMine: "รหัสเปรียบเทียบของคุณ", cCopy: "คัดลอก", cCopied: "คัดลอกแล้ว!",
      cAddLabel: "เพิ่มรหัสของคนอื่น", cAdd: "เพิ่ม",
      cOver: "(ซ้อนกัน)",
      cOverP: "เลือกว่าจะวางดาวของใครซ้อนบนดาวของคุณ เส้นประคือค่าเฉลี่ยของประชากร",
      cPick: "ดาวของใครที่จะวางซ้อนบนดาวของคุณ",
      cIntro: "ไม่ใช่การจัดอันดับ แต่ละคอลัมน์คือคะแนนทั้งแปดด้านของแต่ละคน โดยเทียบกับค่าเฉลี่ยของประชากร — เพื่อให้เห็นว่าคุณต่างกันตรงไหน ไม่ใช่ว่าใครนำใคร",
      cNone: "ยังไม่ได้เพิ่มใคร วางรหัสเปรียบเทียบของคนอื่นด้านบนเพื่อดูคะแนนทั้งแปดด้านของเขาเทียบกับของคุณ",
      cAvg: "ค่าเฉลี่ยของประชากร",
      cAbove: "เท่ากับหรือสูงกว่าค่าเฉลี่ยของประชากร", cBelow: "ต่ำกว่าค่าเฉลี่ยของประชากร",
      cYou: "{name} (คุณ)", cRemove: "ลบ {name}",
      cAspects: "(แปดด้าน เทียบเคียงกัน)",
      cLearn: "(ด้านที่เขาทำได้ถึงแล้ว)",
      cClears: "{name} ทำได้ถึงค่าเฉลี่ยของประชากรในด้าน{aspects} ซึ่งคุณยังไปไม่ถึง",
      cAdded: "เพิ่ม {name} แล้ว", cUpdated: "อัปเดต {name} แล้ว", cRemoved: "ลบ {name} แล้ว",
      errPrefix: "รหัสเปรียบเทียบต้องขึ้นต้นด้วย \"{prefix}\"",
      errDamaged: "รหัสนี้เสียหาย — ให้ผู้เข้าร่วมคัดลอกส่งมาใหม่อีกครั้ง",
      errVersion: "เวอร์ชันรหัสเปรียบเทียบไม่รองรับ",
      errName: "รหัสเปรียบเทียบไม่มีชื่อ",
      errScores: "รหัสเปรียบเทียบมีคะแนนรายด้านไม่ถูกต้อง",
      errFull: "รายชื่อผู้เข้าร่วมเต็มแล้ว (สูงสุด {max} คน)",
      yWord: "ปีอายุ", yTitle: "ปีอายุ {level}",
      yLabel: "(ปีของคุณ)",
      yCloses: "ปิดวันที่ {date} — อีก {days} วัน", yWeeks: "ยังเหลืออีก {weeks} สัปดาห์",
      yPoints: "(คะแนนปีนี้)",
      yPointsP: "ได้รับ {xp} คะแนน จาก {possible} คะแนนที่คำมั่นของคุณเปิดโอกาสไว้จนถึงตอนนี้",
      yLevelP: "เลเวลของคุณคืออายุ — เป็นข้อเท็จจริงเกี่ยวกับตัวคุณ ไม่ใช่คะแนนที่ต้องไขว่คว้า บอกแอปว่าปีของคุณเปลี่ยนวันไหน แล้วแอปจะปิดปีเก่าและเปิดปีใหม่ให้คุณ",
      yPointsAria: "คะแนนปีนี้",
      yMove: "(ความเปลี่ยนแปลงในปีนี้)",
      yMoveP: "วัดเทียบกับบันทึกภาพรวมที่ใกล้ที่สุดของคุณ วันที่ {date}",
      yFiled: "(ปีที่บันทึกไว้)", yFiledRow: "{xp} / {possible} คะแนน", yClosed: "ปิดแล้ว",
      yTurn: "(วันที่ปีของคุณเปลี่ยน)",
      yChange: "เปลี่ยนวันที่ปีของคุณเปลี่ยน",
      yChangeCta: "เปิดโปรไฟล์",
      sTitle: "แชร์เรดาร์ของคุณ", sLabel: "(แชร์เรดาร์ของคุณ)",
      sStyle: "รูปแบบการ์ด", sLight: "พื้นสว่าง", sDark: "พื้นเข้ม",
      sShow: "แสดงรายละเอียดแค่ไหน", sShape: "เฉพาะรูปทรง", sNames: "ใส่ชื่อด้าน", sAll: "ทั้งหมด",
      sNote: "อินสตาแกรมไม่รับโพสต์โดยตรงจากเว็บไซต์ กรุณาเลือกอินสตาแกรมในหน้าต่างแชร์ของเครื่อง หรือบันทึกรูปภาพแล้วโพสต์จากแอปโดยตรง",
      sShare: "แชร์", sSave: "บันทึกรูปภาพ",
      sPreview: "ตัวอย่างการ์ดที่จะแชร์",
      sStar: "YOUR STAR", sIndex: "ดัชนีสมดุล {n}",
      pWord: "โปรไฟล์ของคุณ",
      pBlurb: "อัปเดตข้อมูลที่เปลี่ยนแปลงช้าเกี่ยวกับตัวคุณ ปริมาณรายวัน เช่น การนอน น้ำ และการออกกำลังกาย อยู่ในแบบทบทวนประจำสัปดาห์",
      pIdentity: "(ข้อมูลส่วนตัว)", pContext: "(บริบทชีวิต)", pBody: "(การเงินและร่างกาย)",
      pName: "ชื่อ", pAge: "อายุ", pGender: "เพศ (ใช้เทียบเกณฑ์มาตรฐาน)", pBirthday: "วันเกิด",
      pRegion: "ภูมิภาคหลัก (ใช้เทียบค่าครองชีพ)", pEmployment: "สถานะการทำงาน",
      pRelationship: "สถานะความสัมพันธ์",
      pIncome: "รายได้ส่วนตัวต่อเดือน (บาทสุทธิ)", pHeight: "ส่วนสูง (ซม.)", pWeight: "น้ำหนัก (กก.)",
      pGuide: "เพศและสถานะการงานใช้เลือกเกณฑ์เทียบและคำแนะนำ — ไม่ได้เปลี่ยนคะแนนของคุณ",
      pEditNote: "การแก้ไขข้อมูลเหล่านี้อยู่ในเวอร์ชันเต็ม",
      pMotion: "(การเคลื่อนไหว)", pReduce: "ลดการเคลื่อนไหว", pOff: "ปิด",
      pReduceP: "แสดงแอนิเมชันเป็นเพียงการค่อย ๆ ปรากฏ หรือแสดงผลลัพธ์สุดท้ายทันที ตัวเลือกนี้ลดการเคลื่อนไหวได้อย่างเดียว การตั้งค่าในอุปกรณ์ของคุณยังมีผลเสมอ",
      pData: "(ข้อมูลและการสำรอง)",
      pDataP: "ข้อมูลของคุณอยู่ในเบราว์เซอร์นี้เท่านั้น ควรส่งออกสำรองข้อมูลเป็นประจำ — การล้างข้อมูลเว็บไซต์จะลบข้อมูลทิ้ง",
      pExport: "ส่งออก", pImport: "นำเข้า", pReset: "ล้างข้อมูล",
      xWord: "คะแนนวัดอย่างไร",
      xIntro: "คะแนนแต่ละด้าน (0-100) มาจากแบบสอบถามมาตรฐานที่ตีพิมพ์แล้ว ร่วมกับข้อมูลจริงที่คุณรายงาน หน้านี้แสดงเครื่องมือทุกชิ้น วิธีคิดคะแนน น้ำหนักของแต่ละส่วน และข้อจำกัดที่ทราบ — เพื่อให้ไม่มีตัวเลขใดเป็นกล่องดำ",
      xCare: "นี่คือเครื่องมือสำรวจตนเอง ไม่ใช่การวินิจฉัยทางการแพทย์หรือจิตวิทยา หากคะแนนใดทำให้กังวล โปรดถือเป็นสัญญาณให้ปรึกษาผู้เชี่ยวชาญ ไม่ใช่คำตัดสิน",
      xNot: "(สิ่งที่แอปไม่ได้วัด)",
      xWorth: "มีสิ่งหนึ่งที่แอปนี้ไม่ได้วัด นั่นคือคุณค่าความเป็นมนุษย์ของคุณ ทุกตัวเลขที่นี่สร้างขึ้นจากพฤติกรรมที่คุณรายงานและสภาพแวดล้อมที่คุณได้รับมา — รายได้ การนอน ผู้คนรอบตัว เวลาที่คุณมี — และทั้งหมดนั้นเปลี่ยนแปลงได้ โปรดอ่านคะแนนที่ต่ำในฐานะคำอธิบายของสถานการณ์ ไม่ใช่คำตัดสินคุณค่าของคนที่กำลังอยู่ในสถานการณ์นั้น",
      xEight: "(แปดด้านของชีวิต)",
      xCompared: "(คุณถูกเปรียบเทียบกับใครกันแน่)",
      xGrades: "(เกรดและดัชนีสมดุล)",
      xNo100: "ไม่มีคะแนนใดในแอปนี้ที่ถึง 100 ไม่ว่าจะเป็นด้านใดหรือดัชนีสมดุล การคำนวณไปถึง 100 ได้ แต่ตัวเลขที่แสดงจะหยุดที่ 99 นี่เป็นจุดยืน ไม่ใช่กฎการปัดเศษ เพราะคะแนนเต็มย่อมสื่อว่า “ไม่เหลืออะไรให้ทำอีกแล้ว” บนเครื่องมือที่มีขึ้นเพื่อชี้ก้าวต่อไป"
    }
  };

  // New objects rather than edits to content.js's: later keys win.
  window.LBI_PROTO = Object.assign({}, P, {
    STRINGS: {
      en: Object.assign({}, P.STRINGS.en, MORE.en),
      th: Object.assign({}, P.STRINGS.th, MORE.th)
    },
    AVERAGES: AVERAGES, FRIENDS_SAMPLE: FRIENDS_SAMPLE, PROFILE_SAMPLE: PROFILE_SAMPLE,
    YEAR_SAMPLE: YEAR_SAMPLE, FORMULAS: FORMULAS, WHERE: WHERE, CLAIM: CLAIM,
    COMPARED: COMPARED, NOTICE: NOTICE
  });
})();
