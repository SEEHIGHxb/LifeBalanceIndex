// views/landing.js — the approved Living Atlas welcome page.
// All interactions and styles belong to this view. Begin/resume/return still
// use the original app routes; the sample never writes assessment data.
import { CHAPTERS } from "./journey.js";
import { ASPECT_META } from "../aspects.js";
import { escapeHtml } from "./helpers.js";
import { t, tp, getLang } from "../i18n.js";
import { isReduced } from "../motion.js";
import { mountMotion, onRouteEnd, writeMotionStyle } from "./motion-mount.js";
import { APP_VERSION } from "../version.js";

const WELCOME_TH = {
  "A few honest reflections. One region at a time.": "ค่อย ๆ ทบทวนชีวิตตามจริง ทีละพื้นที่",
  "A few things": "เรื่องเล็กน้อย",
  "A few things to know": "เรื่องที่ควรรู้ก่อนเริ่ม",
  "A glimpse of what comes next": "ลองดูภาพที่จะได้พบ",
  "A horizon worth looking toward.": "อนาคตที่ยังน่ามองไปหา",
  "A little room to breathe.": "พื้นที่เล็ก ๆ ให้หายใจได้คล่องขึ้น",
  "A little room to breathe. Explore the everyday security, choices and freedom your money makes possible.": "พื้นที่เล็ก ๆ ให้หายใจได้คล่องขึ้น สำรวจความมั่นคง ทางเลือก และอิสระที่การเงินช่วยให้คุณมี",
  "A little space to see your life.": "พื้นที่เล็ก ๆ ให้มองเห็นชีวิตตัวเอง",
  "A moment to pause.": "หยุดพักสักครู่",
  "A picture to return to.": "มีภาพชีวิตให้กลับมามอง",
  "A place that helps you flourish.": "พื้นที่ที่ช่วยให้คุณเติบโต",
  "A quiet illustrated market with coral awnings and cream buildings.": "ภาพวาดตลาดอันสงบ มีหลังคาผ้าใบสีปะการังและอาคารสีครีม",
  "A sample picture, not your assessment. Select a region to look closer, or switch to Eight Threads to see the same picture woven together.": "นี่คือภาพตัวอย่าง ยังไม่ใช่ผลของคุณ เลือกพื้นที่เพื่อดูรายละเอียด หรือเปลี่ยนเป็นแปดสายใยเพื่อมองภาพเดียวกันในอีกรูปแบบ",
  "A small journey through your everyday life": "การเดินทางเล็ก ๆ ผ่านชีวิตประจำวันของคุณ",
  "A small step toward what matters.": "ก้าวเล็ก ๆ ไปหาสิ่งที่สำคัญ",
  "A steady base for your days.": "รากฐานที่มั่นคงของแต่ละวัน",
  "A steady base. Keep making room for what supports you.": "พื้นที่นี้เป็นรากฐานที่ดี ค่อย ๆ ดูแลสิ่งที่ช่วยพยุงคุณต่อไป",
  "A wider": "มองให้",
  "A wider view starts here": "เริ่มมองชีวิตให้กว้างขึ้นตรงนี้",
  "An eight-ribbon portrait whose shape reflects the eight sample scores.": "ภาพริบบิ้นแปดสายที่มีรูปทรงตามคะแนนตัวอย่างทั้งแปดด้าน",
  "An illustrated coastal world of violet highlands, a coral market, gardens, bridges and a wild forest around a blue lake.": "โลกริมฝั่งน้ำในภาพวาด มีภูเขาสีม่วง ตลาดสีปะการัง สวน สะพาน และป่ารอบทะเลสาบสีฟ้า",
  "Animation respects your reduced motion preference": "ภาพเคลื่อนไหวหยุดตามการตั้งค่าลดการเคลื่อนไหวของคุณ",
  "Asterism back to top": "Asterism กลับไปด้านบน",
  "Asterism home": "หน้าแรก Asterism",
  "Can I come back later?": "กลับมาทำต่อภายหลังได้ไหม?",
  "Choose a place on the Atlas. Each one is a part of you.": "เลือกพื้นที่บนแผนที่ แต่ละแห่งคือส่วนหนึ่งของชีวิตคุณ",
  "Choose something manageable. Come back to see what changes.": "เลือกสิ่งเล็ก ๆ ที่ทำไหว แล้วกลับมาดูว่าอะไรเปลี่ยนไป",
  "Close navigation": "ปิดเมนู",
  "Eight Threads": "แปดสายใย",
  "Eight places.": "แปดพื้นที่",
  "Eight regions. Your own pace. Room to return.": "แปดพื้นที่ ค่อย ๆ ไปตามจังหวะของคุณ และกลับมาได้เสมอ",
  "Explore": "สำรวจ",
  "Explore eight parts of your life. See what feels steady, what needs a little care, and where your next small step could begin.": "สำรวจชีวิตทั้งแปดด้าน มองเห็นสิ่งที่มั่นคง สิ่งที่อยากดูแลเพิ่ม และจุดเริ่มต้นของก้าวเล็ก ๆ ถัดไป",
  "Explore how you connect with, help and contribute to the world around you.": "สำรวจความเชื่อมโยง การช่วยเหลือ และสิ่งที่คุณมอบให้กับผู้คนรอบตัว",
  "Explore life regions": "สำรวจพื้นที่ชีวิต",
  "Explore the Atlas": "สำรวจแผนที่ชีวิต",
  "Explore the everyday security, choices and freedom your money makes possible.": "สำรวจความมั่นคง ทางเลือก และอิสระที่การเงินช่วยให้คุณมี",
  "Explore this region": "สำรวจพื้นที่นี้",
  "Find one encouraging story about positive change.": "ลองหาเรื่องราวการเปลี่ยนแปลงที่ดีสักเรื่องเพื่อเติมความหวัง",
  "Footer navigation": "เมนูท้ายหน้า",
  "Give one personal project twenty focused minutes.": "ให้เวลายี่สิบนาทีเต็ม ๆ กับสิ่งที่คุณอยากทำสักอย่าง",
  "How the journey works": "การเดินทางเป็นอย่างไร",
  "ILLUSTRATIVE SAMPLE · WEEK 01": "ภาพตัวอย่าง · สัปดาห์ 01",
  "Illustrated landscape": "ภาพวาดภูมิทัศน์",
  "Index": "ชีวิต",
  "Is this a test I can pass or fail?": "นี่เป็นแบบทดสอบที่มีผ่านหรือตกไหม?",
  "Just a place to begin.": "แค่มีสักจุดให้เริ่มต้น",
  "LIFE BALANCE INDEX": "ดัชนีสมดุลชีวิต",
  "Life Balance": "ดัชนีสมดุล",
  "Living Atlas": "แผนที่ชีวิต",
  "Look around. Find a place that feels close to your life today.": "ลองมองไปรอบ ๆ แล้วหาพื้นที่ที่ใกล้กับชีวิตคุณในวันนี้",
  "Look at the hopes, projects and quiet ambitions you want to make space for.": "มองความหวัง สิ่งที่อยากลงมือทำ และความฝันที่คุณอยากให้เวลา",
  "Main navigation": "เมนูหลัก",
  "Make five minutes of quiet space tomorrow.": "ลองเว้นช่วงเงียบ ๆ ให้ตัวเองห้านาทีในวันพรุ่งนี้",
  "Make one corner of your space feel calmer.": "ลองจัดมุมหนึ่งในพื้นที่ของคุณให้รู้สึกสงบขึ้น",
  "Make room for your inner life, and the things that help you feel grounded.": "ให้พื้นที่กับความรู้สึกข้างใน และสิ่งที่ช่วยให้ใจกลับมามั่นคง",
  "Mobile navigation": "เมนูสำหรับมือถือ",
  "No account needed. Go at your own pace.": "ไม่ต้องสร้างบัญชี ค่อย ๆ ไปตามจังหวะของคุณ",
  "No account. Your answers stay in this browser.": "ไม่ต้องมีบัญชี คำตอบเก็บไว้ในเบราว์เซอร์นี้เท่านั้น",
  "No. The experience is a prompt for reflection. Your picture is a starting point for noticing what supports you and what might need more attention.": "ไม่มีผ่านหรือตก นี่คือโอกาสให้ทบทวนตัวเอง ภาพชีวิตเป็นจุดเริ่มต้นในการมองสิ่งที่ช่วยพยุงคุณ และสิ่งที่อาจอยากดูแลมากขึ้น",
  "Notice how your home, everyday surroundings and connection with nature support you.": "สังเกตว่าบ้าน สภาพแวดล้อมในแต่ละวัน และความใกล้ชิดกับธรรมชาติช่วยดูแลคุณอย่างไร",
  "Notice the places that support you, and those asking for care.": "สังเกตพื้นที่ที่ช่วยพยุงคุณ และพื้นที่ที่อยากให้คุณดูแลเพิ่ม",
  "Notice your energy, rest and the ways you care for your body.": "มองพลังงาน การพักผ่อน และวิธีที่คุณดูแลร่างกาย",
  "Offer one small, useful act of help this week.": "ลองช่วยใครสักคนด้วยสิ่งเล็ก ๆ ที่มีประโยชน์ในสัปดาห์นี้",
  "One connected life.": "เชื่อมเป็นชีวิตเดียว",
  "One small step": "ก้าวเล็ก ๆ สักก้าว",
  "Open navigation": "เปิดเมนู",
  "Pause animation": "หยุดภาพเคลื่อนไหว",
  "Pause motion": "หยุดการเคลื่อนไหว",
  "Pink sky over blue water, framed by ink-drawn plants.": "ท้องฟ้าสีชมพูเหนือผืนน้ำสีฟ้า ล้อมด้วยพรรณไม้ลายเส้นหมึก",
  "Play animation": "เล่นภาพเคลื่อนไหว",
  "Play motion": "เล่นการเคลื่อนไหว",
  "Reflect on hope, uncertainty and the future you want to be part of.": "ทบทวนความหวัง ความไม่แน่นอน และอนาคตที่คุณอยากมีส่วนร่วม",
  "Results visual identity": "รูปแบบภาพตัวอย่างผลลัพธ์",
  "Scores by life region": "คะแนนตัวอย่างของแต่ละพื้นที่ชีวิต",
  "See a sample": "ดูภาพตัวอย่าง",
  "See your living picture": "มองเห็นภาพชีวิต",
  "See your picture": "ดูภาพชีวิต",
  "Select": "เลือก",
  "Selected life region": "พื้นที่ชีวิตที่เลือก",
  "Send a thoughtful message to someone you miss.": "ลองส่งข้อความด้วยความใส่ใจถึงใครสักคนที่คุณคิดถึง",
  "Set aside ten minutes to look at your spending.": "ลองใช้เวลาสิบนาทีมองรายจ่ายของคุณ",
  "Small acts, wider circles.": "สิ่งเล็ก ๆ ที่ส่งต่อได้กว้างขึ้น",
  "Some days, one part of life takes up the whole view. Asterism helps you step back and see how the pieces connect.": "บางวัน เรื่องหนึ่งในชีวิตอาจบดบังทุกอย่าง Asterism ช่วยให้คุณถอยมามองว่าแต่ละส่วนเชื่อมโยงกันอย่างไร",
  "Some things feel steady. A small step could make more room.": "บางสิ่งเริ่มมั่นคงแล้ว ก้าวเล็ก ๆ อาจช่วยให้มีพื้นที่หายใจมากขึ้น",
  "Something of your own, taking shape.": "สิ่งที่เป็นของคุณ กำลังค่อย ๆ เป็นรูปเป็นร่าง",
  "Source & license": "ซอร์สโค้ดและสิทธิ์การใช้งาน",
  "Space to hear yourself.": "พื้นที่ให้ได้ยินเสียงตัวเอง",
  "Start with where you are today. The picture can change as you do.": "เริ่มจากชีวิตของคุณในวันนี้ ภาพนี้เปลี่ยนแปลงไปพร้อมกับคุณได้",
  "Switch language": "เปลี่ยนภาษา",
  "Take a ten-minute walk after lunch.": "ลองเดินสิบนาทีหลังมื้อกลางวัน",
  "Take one small step": "ลองก้าวเล็ก ๆ สักก้าว",
  "The Living Atlas": "แผนที่ชีวิต",
  "The eight illustrated regions of the Living Atlas.": "ภาพวาดพื้นที่ทั้งแปดในแผนที่ชีวิต",
  "The eight regions": "พื้นที่ทั้งแปด",
  "The journey": "การเดินทาง",
  "The people who feel like home.": "ผู้คนที่อยู่ด้วยแล้วรู้สึกเหมือนบ้าน",
  "Think about connection, belonging and the people you can lean on.": "คิดถึงความสัมพันธ์ ความรู้สึกเป็นส่วนหนึ่ง และผู้คนที่คุณพึ่งพาได้",
  "Visit each part of life": "แวะมองชีวิตแต่ละด้าน",
  "What happens when I begin?": "เมื่อเริ่มแล้วจะได้ทำอะไรบ้าง?",
  "Where do my answers go?": "คำตอบของฉันเก็บไว้ที่ไหน?",
  "Yes. Your journey is saved as you go. Return to this page and choose “Continue the journey”. You can pick up from the first unfinished part.": "ได้เลย ระบบบันทึกไว้ระหว่างทาง กลับมาที่หน้านี้แล้วเลือก “เดินทางต่อ” เพื่อเริ่มจากส่วนแรกที่ยังทำไม่เสร็จ",
  "You don't need it all figured out.": "ไม่ต้องมีคำตอบให้ทุกเรื่อง",
  "You will visit eight regions and reflect on each part of your life. Your answers are compared with cited Thai and international benchmarks. At the end, you will see your star and can choose a small step.": "คุณจะเดินผ่านแปดพื้นที่และทบทวนชีวิตแต่ละด้าน คำตอบจะถูกเปรียบเทียบกับเกณฑ์อ้างอิงไทยและสากล เมื่อจบแล้ว คุณจะเห็นดาวของตัวเองและเลือกก้าวเล็ก ๆ ถัดไปได้",
  "Your answers stay in this browser on this device. No account is needed. You can save a backup for safekeeping or move it to another device.": "คำตอบอยู่ในเบราว์เซอร์บนอุปกรณ์นี้เท่านั้น ไม่ต้องมีบัญชี คุณสามารถบันทึกไฟล์สำรองไว้ หรือย้ายไปใช้อุปกรณ์อื่นได้",
  "Your first step can be a small one": "ก้าวแรกของคุณไม่จำเป็นต้องใหญ่",
  "Your life.": "ชีวิตของคุณ",
  "Your life. A living picture.": "ภาพชีวิตที่เปลี่ยนไปพร้อมคุณ",
  "Your picture": "ภาพชีวิตของคุณ",
  "out of 100": "จาก 100",
  "to know.": "ก่อนเริ่ม",
  "view.": "กว้างขึ้น"
};
const copy = (s) => getLang() === "th" ? WELCOME_TH[s] ?? t(s) : s;
const e = (s) => escapeHtml(copy(s));
const art = { atlas: "./assets/welcome/atlas.webp", market: "./assets/welcome/market.webp", threads: "./assets/welcome/threads.webp" };
const regionDetails = [
{name:'The Market',aspect:'Finance',x:.13,y:.47,poem:'A little room to breathe.',description:'Explore the everyday security, choices and freedom your money makes possible.',step:'Set aside ten minutes to look at your spending.',color:'#efb299'},
{name:'The Highlands',aspect:'Physical',x:.24,y:.14,poem:'A steady base for your days.',description:'Notice your energy, rest and the ways you care for your body.',step:'Take a ten-minute walk after lunch.',color:'#a5bfd2'},
{name:'The Still Water',aspect:'Mental',x:.55,y:.43,poem:'Space to hear yourself.',description:'Make room for your inner life, and the things that help you feel grounded.',step:'Make five minutes of quiet space tomorrow.',color:'#a7bfa5'},
{name:'The Commons',aspect:'Relationships',x:.477,y:.72,poem:'The people who feel like home.',description:'Think about connection, belonging and the people you can lean on.',step:'Send a thoughtful message to someone you miss.',color:'#dcacb2'},
{name:'The Workshop',aspect:'Personal goals',x:.7,y:.555,poem:'Something of your own, taking shape.',description:'Look at the hopes, projects and quiet ambitions you want to make space for.',step:'Give one personal project twenty focused minutes.',color:'#e9ce94'},
{name:'The Crossroads',aspect:'Social contribution',x:.87,y:.74,poem:'Small acts, wider circles.',description:'Explore how you connect with, help and contribute to the world around you.',step:'Offer one small, useful act of help this week.',color:'#b7a3c2'},
{name:'The Wildwood',aspect:'Environment',x:.9,y:.195,poem:'A place that helps you flourish.',description:'Notice how your home, everyday surroundings and connection with nature support you.',step:'Make one corner of your space feel calmer.',color:'#81b5ad'},
{name:'The Lookout',aspect:'Humanity’s future',x:.402,y:.174,poem:'A horizon worth looking toward.',description:'Reflect on hope, uncertainty and the future you want to be part of.',step:'Find one encouraging story about positive change.',color:'#e8ddbd'}];
const sample = [61, 72, 54, 78, 65, 58, 80, 60];
let selectedRegion = 0, selectedResult = 0, variant = "atlas", motionEnabled = true, langFocusPending = false;

function regions() {
  return regionDetails.map((r, i) => ({ ...r, name: CHAPTERS[i].region, aspect: t(ASPECT_META[CHAPTERS[i].aspect].label) }));
}
function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="#wl-${name}"/></svg>`; }
function spots(kind, selected) {
  return regions().map((r, i) => `<button type="button" class="spot" data-${kind}="${i}" data-region="${i}" style="left:${r.x * 100}%;top:${r.y * 100}%" aria-label="${e(kind === "explore" ? "Explore" : "Select")} ${escapeHtml(r.name)}, ${escapeHtml(r.aspect)}" aria-pressed="${selected === i}"><span class="spot-dot"></span><span class="spot-label">${escapeHtml(r.name)}</span></button>`).join("");
}
function regionPicker() {
  return regions().map((r, i) => `<button type="button" class="region-tab" data-explore="${i}" aria-pressed="${selectedRegion === i}"><span class="region-no">${String(i + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.aspect)}</small></span></button>`).join("");
}
function scorePicker() {
  return regions().map((r, i) => `<button type="button" class="score-tab" data-result="${i}" aria-pressed="${selectedResult === i}" aria-label="${escapeHtml(r.aspect)}, ${sample[i]} ${e("out of 100")}"><span>${escapeHtml(r.aspect)}</span><b>${sample[i]}</b></button>`).join("");
}
function threadSpots() {
  return regions().map((r, i) => `<button type="button" class="thread-spot" data-result="${i}" data-region="${i}" aria-label="${e("Select")} ${escapeHtml(r.aspect)}" aria-pressed="${selectedResult === i}"><span class="spot-label">${escapeHtml(r.aspect)}</span></button>`).join("");
}

export function landingMarkup({ resume = false, returning = false } = {}) {
  const cta = returning ? t("Open your star") : resume ? t("Continue the journey") : t("Start the journey");
  const go = returning ? "#/dashboard" : "#/journey";
  const restore = returning ? "" : `<div class="restore"><button type="button" id="btn-restore-backup" class="text-link">${escapeHtml(t("Restore from a backup"))}</button><input type="file" id="restore-file-input" accept="application/json,.json" class="d-none" aria-hidden="true" tabindex="-1"></div>`;
  return `<div class="landing living-welcome">

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="wl-asterism" viewBox="0 0 40 40"><path d="M20 1 24 13 34 6 27 17 39 20 27 24 34 34 23 27 20 39 17 27 6 34 13 23 1 20 13 17 6 6 17 13Z"/><circle cx="20" cy="20" r="4"/></symbol><symbol id="wl-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></symbol><symbol id="wl-down" viewBox="0 0 24 24"><path d="M12 4v16m-6-6 6 6 6-6"/></symbol><symbol id="wl-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></symbol><symbol id="wl-pause" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></symbol><symbol id="wl-play" viewBox="0 0 24 24"><path d="m8 4 12 8-12 8Z"/></symbol><symbol id="wl-menu" viewBox="0 0 24 24"><path d="M4 8h16M4 16h16"/></symbol><symbol id="wl-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol><symbol id="wl-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol></defs></svg>
<header class="header"><div class="header-inner"><a href="#" class="brand" aria-label="${e("Asterism home")}"><svg class="star" aria-hidden="true"><use href="#wl-asterism"/></svg><div><span class="wordmark">ASTERISM</span><small>${e("LIFE BALANCE INDEX")}</small></div></a><nav class="desktop-nav" aria-label="${e("Main navigation")}"><a href="#wl-places">${e("The eight regions")}</a><a href="#wl-journey-path">${e("The journey")}</a><a href="#wl-picture">${e("Your picture")}</a></nav><div class="header-actions"><button class="motion" id="wl-motion" aria-label="${e("Pause animation")}" aria-pressed="true"><svg class="icon" aria-hidden="true"><use href="#wl-pause"/></svg><span>${e("Pause motion")}</span></button><a class="primary nav-start" href="${go}">${escapeHtml(cta)} ${icon("arrow")}</a><button class="language" id="wl-lang" type="button" aria-label="${e("Switch language")}">${getLang() === "th" ? "EN" : "ไทย"}</button><button class="menu-button" aria-expanded="false" aria-controls="wl-mobile-menu" aria-label="${e("Open navigation")}"><svg class="icon" aria-hidden="true"><use href="#wl-menu"/></svg></button></div></div><nav class="mobile-menu" id="wl-mobile-menu" hidden aria-label="${e("Mobile navigation")}"><a href="#wl-places">${e("The eight regions")}</a><a href="#wl-journey-path">${e("The journey")}</a><a href="#wl-picture">${e("Your picture")}</a><a href="#wl-questions">${e("A few things to know")}</a></nav></header>
<div id="wl-main">
<section class="hero" aria-labelledby="wl-hero-title"><div class="hero-lead wrap"><div><p class="eyebrow">${e("A small journey through your everyday life")}</p><h1 class="serif" id="wl-hero-title">${e("Your life.")}<br>${e("A wider")}${getLang() === "th" ? "" : " "}<em>${e("view.")}</em></h1></div><div class="hero-description"><p>${e("Explore eight parts of your life. See what feels steady, what needs a little care, and where your next small step could begin.")}</p><div class="hero-links"><a class="primary" href="${go}">${escapeHtml(cta)} ${icon("arrow")}</a><a class="text-link" href="#wl-picture">${e("See a sample")}${getLang() === "th" ? "" : " "}<svg class="icon" aria-hidden="true"><use href="#wl-down"/></svg></a></div><p class="note">${e("No account needed. Go at your own pace.")}</p></div></div><div class="hero-world"><div class="hero-map" id="wl-hero-map"><img src="${art.atlas}" alt="${e("An illustrated coastal world of violet highlands, a coral market, gardens, bridges and a wild forest around a blue lake.")}" fetchpriority="high"><svg class="map-route" viewBox="0 0 1000 562.8" aria-hidden="true"><ellipse class="water-ring" cx="550" cy="262" rx="45" ry="8"/><path class="route-line" id="wl-hero-route"/></svg><div class="map-spots" id="wl-hero-spots">${spots("explore", selectedRegion)}</div></div><div class="hero-peek"><span class="peek-number" id="wl-peek-number">01</span><div><p class="peek-title" id="wl-peek-title">${e("The Market")}</p><p class="peek-aspect" id="wl-peek-aspect">${e("Finance")}</p></div><p class="peek-poem" id="wl-peek-poem">${e("A little room to breathe.")}</p><a class="text-link" href="#wl-places"><span>${e("Explore this region")}</span><svg class="icon" aria-hidden="true"><use href="#wl-arrow"/></svg></a></div></div><div class="hero-bottom"><a href="#wl-journey-path">${e("A wider view starts here")}${getLang() === "th" ? "" : " "}<svg class="icon" aria-hidden="true"><use href="#wl-down"/></svg></a><span>${e("Choose a place on the Atlas. Each one is a part of you.")}</span></div></section>
<section class="intro section" id="wl-journey-path" aria-labelledby="wl-intro-title"><div class="wrap"><div class="intro-head reveal"><div><p class="eyebrow">${e("The journey")}</p><h2 class="serif" id="wl-intro-title">${e("A moment to pause.")}<br>${e("A picture to return to.")}</h2></div><p>${e("Some days, one part of life takes up the whole view. Asterism helps you step back and see how the pieces connect.")}</p></div><div class="steps reveal"><div class="step"><span class="step-num">01</span><h3>${e("Visit each part of life")}</h3><p>${e("A few honest reflections. One region at a time.")}</p></div><div class="step"><span class="step-num">${e("02")}</span><h3>${e("See your living picture")}</h3><p>${e("Notice the places that support you, and those asking for care.")}</p></div><div class="step"><span class="step-num">${e("03")}</span><h3>${e("Take one small step")}</h3><p>${e("Choose something manageable. Come back to see what changes.")}</p></div></div></div></section>
<section class="places" id="wl-places" aria-labelledby="wl-places-title"><div class="wrap"><div class="section-top reveal"><div><p class="eyebrow">${e("The Living Atlas")}</p><h2 class="serif" id="wl-places-title">${e("Eight places.")}<br>${e("One connected life.")}</h2></div><p>${e("Look around. Find a place that feels close to your life today.")}</p></div><div class="places-layout reveal"><div class="chapter-view" id="wl-explore-camera"><img class="camera-image" id="wl-explore-image" src="${art.market}" alt="${e("A quiet illustrated market with coral awnings and cream buildings.")}" loading="lazy" decoding="async"><span class="chapter-tag" id="wl-chapter-tag">${e("01 / 08 · THE MARKET")}</span></div><div class="region-panel"><div class="region-intro" aria-live="polite"><p class="eyebrow" id="wl-region-aspect">${e("Finance")}</p><h3 id="wl-region-name">${e("The Market")}</h3><p id="wl-region-description">${e("A little room to breathe. Explore the everyday security, choices and freedom your money makes possible.")}</p></div><div class="region-picker" id="wl-region-picker" aria-label="${e("Explore life regions")}">${regionPicker()}</div><a class="text-link" href="${go}">${escapeHtml(cta)} ${icon("arrow")}</a></div></div></div></section>
<section class="picture" id="wl-picture" aria-labelledby="wl-picture-title"><div class="wrap"><div class="section-top reveal"><div><p class="eyebrow" id="wl-picture-eyebrow">${e("A glimpse of what comes next")}</p><h2 class="serif" id="wl-picture-title">${e("Your life. A living picture.")}</h2></div><div class="variant-control" role="group" aria-label="${e("Results visual identity")}"><button class="variant-button" data-variant="atlas" aria-pressed="true">${e("Living Atlas")}</button><button class="variant-button" data-variant="threads" aria-pressed="false">${e("Eight Threads")}</button></div></div><div class="result-layout reveal"><div class="result-art" id="wl-result-art"><span class="art-note" id="wl-art-note">${e("ILLUSTRATIVE SAMPLE · WEEK 01")}</span><div class="result-atlas" id="wl-result-atlas"><img src="${art.atlas}" alt="${e("The eight illustrated regions of the Living Atlas.")}" loading="lazy" decoding="async"><div class="map-spots" id="wl-result-spots">${spots("result", selectedResult)}</div></div><div class="thread-stage" id="wl-thread-stage" hidden><img src="${art.threads}" alt="${e("Pink sky over blue water, framed by ink-drawn plants.")}" loading="lazy" decoding="async"><canvas class="thread-canvas" id="wl-thread-canvas" aria-label="${e("An eight-ribbon portrait whose shape reflects the eight sample scores.")}" role="img"></canvas><div id="wl-thread-spots">${threadSpots()}</div></div></div><aside class="result-detail" aria-label="${e("Selected life region")}"><div class="balance-line"><span class="balance-label">${e("Life Balance")}<br>${e("Index")}</span><span class="total"><span id="wl-total">66</span><small>/100</small></span></div><p class="eyebrow" id="wl-detail-aspect">${e("Finance")}</p><h3 id="wl-detail-name">${e("The Market")}</h3><p class="score"><strong id="wl-detail-score">61</strong><span id="wl-detail-change">${e("out of 100")}</span></p><p class="detail-copy" id="wl-detail-copy">${e("Some things feel steady. A small step could make more room.")}</p><p class="step-label">${e("One small step")}</p><p class="small-step" id="wl-small-step">${e("Set aside ten minutes to look at your spending.")}</p></aside></div><div class="scores" id="wl-scores" aria-label="${e("Scores by life region")}">${scorePicker()}</div><div class="picture-footer"><p class="picture-caption" id="wl-picture-caption">${e("A sample picture, not your assessment. Select a region to look closer, or switch to Eight Threads to see the same picture woven together.")}</p><a class="text-link" href="#wl-journey-path">${e("How the journey works")}${getLang() === "th" ? "" : " "}<svg class="icon" aria-hidden="true"><use href="#wl-arrow"/></svg></a></div></div></section>
<section class="return" aria-labelledby="wl-return-title"><div class="return-path" aria-hidden="true"></div><div class="return-path right" aria-hidden="true"></div><div class="wrap reveal"><svg class="star" aria-hidden="true"><use href="#wl-asterism"/></svg><p class="eyebrow">${e("Your first step can be a small one")}</p><h2 class="serif" id="wl-return-title">${e("You don't need it all figured out.")}<br>${e("Just a place to begin.")}</h2><p>${e("Start with where you are today. The picture can change as you do.")}</p><div class="allprojects"><a class="primary" href="${go}">${escapeHtml(cta)} ${icon("arrow")}</a></div><p class="note">${e("Eight regions. Your own pace. Room to return.")}</p>${restore}</div></section>
<section class="questions" id="wl-questions" aria-labelledby="wl-questions-title"><div class="wrap questions-inner"><h2 id="wl-questions-title">${e("A few things")}<br>${e("to know.")}</h2><div><details><summary>${e("What happens when I begin?")}</summary><p>${e("You will visit eight regions and reflect on each part of your life. Your answers are compared with cited Thai and international benchmarks. At the end, you will see your star and can choose a small step.")}</p></details><details><summary>${e("Is this a test I can pass or fail?")}</summary><p>${e("No. The experience is a prompt for reflection. Your picture is a starting point for noticing what supports you and what might need more attention.")}</p></details><details><summary>${e("Where do my answers go?")}</summary><p>${e("Your answers stay in this browser on this device. No account is needed. You can save a backup for safekeeping or move it to another device.")}</p></details><details><summary>${e("Can I come back later?")}</summary><p>${e("Yes. Your journey is saved as you go. Return to this page and choose “Continue the journey”. You can pick up from the first unfinished part.")}</p></details></div></div></section>
</div>
<footer class="footer"><div class="wrap"><div class="footer-main"><div><a href="#" class="brand" aria-label="${e("Asterism back to top")}"><svg class="star" aria-hidden="true"><use href="#wl-asterism"/></svg><span class="wordmark">ASTERISM</span></a><p>${e("A little space to see your life.")}<br>${e("A small step toward what matters.")}</p></div><nav class="footer-links" aria-label="${e("Footer navigation")}"><a href="#wl-places">${e("Explore the Atlas")}</a><a href="#wl-picture">${e("See your picture")}</a><a href="./privacy.html">${e("Privacy & Data")}</a><a href="https://github.com/SEEHIGHxb/LifeBalanceIndex" target="_blank" rel="noopener noreferrer">${e("Source & license")}</a></nav></div><div class="footer-bottom"><span>${e("No account. Your answers stay in this browser.")}</span><span>${escapeHtml(tp("Version {v}", { v: APP_VERSION }))}</span></div></div></footer>
<p class="live" id="wl-announcement" aria-live="polite"></p></div>`;
}

export function renderLanding(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = landingMarkup(options);
  const root = container.querySelector(".living-welcome");
  if (!root) return;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const scope = mountMotion();
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0, frameUntil = 0, lastFrame = 0;
  const startTime = performance.now();
  const announce = (s) => { $("#wl-announcement").textContent = s; };
  const motion = () => motionEnabled && !isReduced();
  function positionCamera() {
    const pane = $("#wl-explore-camera"), img = $("#wl-explore-image");
    if (!pane.clientWidth) return;
    const id = selectedRegion, r = id === 0 ? { x: .35, y: .56 } : regionDetails[id];
    const zoom = Math.max(id === 0 ? 1.55 : 1.95, pane.clientHeight / (pane.clientWidth / 1.7768));
    const w = pane.clientWidth * zoom, h = w / 1.7768;
    const x = Math.max(pane.clientWidth - w, Math.min(0, pane.clientWidth * .48 - r.x * w));
    const y = Math.max(pane.clientHeight - h, Math.min(0, pane.clientHeight * .44 - r.y * h));
    img.src = id === 0 ? art.market : art.atlas;
    img.alt = copy("Illustrated landscape") + ": " + CHAPTERS[id].region;
    writeMotionStyle(img, { transform: `translate(${x}px,${y}px) scale(${zoom})` });
  }
  function selectExplore(i, notify = true) {
    selectedRegion = i;
    const r = regions()[i];
    $("#wl-peek-number").textContent = String(i + 1).padStart(2, "0");
    $("#wl-peek-title").textContent = r.name;
    $("#wl-peek-aspect").textContent = r.aspect;
    $("#wl-peek-poem").textContent = copy(r.poem);
    $("#wl-region-aspect").textContent = r.aspect;
    $("#wl-region-name").textContent = r.name;
    $("#wl-region-description").textContent = copy(r.poem) + " " + copy(r.description);
    $("#wl-chapter-tag").textContent = String(i + 1).padStart(2, "0") + " / 08 · " + r.name.toUpperCase();
    $$('[data-explore]').forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.explore) === i)));
    const x = r.x * 1000, y = r.y * 562.8;
    $("#wl-hero-route").setAttribute("d", `M477 405 Q${(477 + x) / 2 + 22} ${(405 + y) / 2 - 35} ${x} ${y}`);
    positionCamera();
    if (notify) announce(r.name + ": " + r.aspect + ". " + copy(r.poem));
  }
  function renderResult() {
    const i = selectedResult, r = regions()[i];
    $$('[data-result]').forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.result) === i)));
    $("#wl-detail-aspect").textContent = r.aspect;
    $("#wl-detail-name").textContent = r.name;
    $("#wl-detail-score").textContent = sample[i];
    $("#wl-detail-copy").textContent = copy(sample[i] >= 70 ? "A steady base. Keep making room for what supports you." : "Some things feel steady. A small step could make more room.");
    $("#wl-small-step").textContent = copy(r.step);
    $("#wl-result-art").classList.toggle("is-threads", variant === "threads");
    $("#wl-result-atlas").hidden = variant !== "atlas";
    $("#wl-thread-stage").hidden = variant !== "threads";
    $$('[data-variant]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.variant === variant)));
    requestDraw(1800);
  }
  function renderMotion() {
    root.classList.toggle("motion-off", !motion());
    const button = $("#wl-motion");
    button.setAttribute("aria-pressed", String(motion()));
    button.setAttribute("aria-label", copy(motion() ? "Pause animation" : "Play animation"));
    button.querySelector("span").textContent = copy(motion() ? "Pause motion" : "Play motion");
    button.querySelector("use").setAttribute("href", motion() ? "#wl-pause" : "#wl-play");
    button.disabled = isReduced();
    button.title = isReduced() ? copy("Animation respects your reduced motion preference") : "";
    requestDraw(600);
  }
  function closeMenu() {
    $("#wl-mobile-menu").hidden = true;
    $(".menu-button").setAttribute("aria-expanded", "false");
    $(".menu-button").setAttribute("aria-label", copy("Open navigation"));
    $(".menu-button use").setAttribute("href", "#wl-menu");
  }
  scope.listen(root, "click", (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href.startsWith("#/")) return;
      const destination = href === "#" ? root : $(href);
      if (destination) {
        event.preventDefault();
        closeMenu();
        const reduced = isReduced() || !motionEnabled;
        destination.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        const heading = destination.querySelector("h1,h2,h3");
        if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
      }
      return;
    }
    const b = event.target.closest("button");
    if (!b) return;
    if (b.dataset.explore !== undefined) selectExplore(Number(b.dataset.explore));
    else if (b.dataset.result !== undefined) {
      selectedResult = Number(b.dataset.result);
      renderResult();
      announce(regions()[selectedResult].aspect + ": " + sample[selectedResult] + " " + copy("out of 100"));
    } else if (b.dataset.variant) {
      variant = b.dataset.variant;
      renderResult();
      announce(copy(variant === "threads" ? "Eight Threads" : "Living Atlas"));
    } else if (b.id === "wl-motion") {
      motionEnabled = !motionEnabled;
      renderMotion();
    } else if (b.id === "wl-lang") {
      langFocusPending = true;
      document.getElementById("btn-lang")?.click();
    } else if (b.classList.contains("menu-button")) {
      const open = $("#wl-mobile-menu").hidden;
      $("#wl-mobile-menu").hidden = !open;
      b.setAttribute("aria-expanded", String(open));
      b.setAttribute("aria-label", copy(open ? "Close navigation" : "Open navigation"));
      b.querySelector("use").setAttribute("href", open ? "#wl-close" : "#wl-menu");
    }
  });
  scope.listen(root, "keydown", event => {
    if (event.key === "Escape" && !$("#wl-mobile-menu").hidden) { closeMenu(); $(".menu-button").focus(); }
  });
  scope.listen(media, "change", renderMotion);
  scope.listen(document, "visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestDraw(800);
  });
  scope.listen($("#wl-thread-stage"), "pointermove", () => requestDraw(700));

  // Eight ink-drawn ribbons; the welcome sample has fixed illustrative scores.
  const state = { scores: sample, get resultSelected() { return selectedResult; } };
  const transitionFrom = sample, transitionStart = 0;
    function mix(hex,amount){const n=parseInt(hex.slice(1),16),target=amount<0?0:255,a=Math.abs(amount);return `rgb(${[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v+(target-v)*a)).join(',')})`;}
  function ease(t){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),3);}
  function currentScores(now){const t=motion()?ease((now-transitionStart)/1500):1;return state.scores.map((s,i)=>transitionFrom[i]+(s-transitionFrom[i])*t);}
  function threadPoint(i,t,scores,phase,review=false){const theta=i*Math.PI/4-Math.PI/2,r=17+(116+scores[i]*.66+(i===state.resultSelected?11:0))*Math.sin(Math.PI*t),angle=theta+(t-.5)*1.39+.13*Math.sin(t*Math.PI*2),breath=motion()?1+Math.sin(phase+i*.6)*.007:1;return {x:r*Math.cos(angle)*breath,y:r*Math.sin(angle)*breath,z:20*Math.cos(t*Math.PI*2+i*.36)+13*Math.sin(t*Math.PI),width:(9+14*Math.sin(Math.PI*t))*(review ? .8 : 1),roll:Math.PI*2*t+theta*.38};}
  const reflectionBuffer=document.createElement('canvas');
  function drawInkThreads(canvas,now,review=false){
    const rect=canvas.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    const dpr=Math.min(window.devicePixelRatio||1,2),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    const scores=currentScores(now),phase=(now-startTime)*.0005;
    const scale=Math.min(rect.width/480,rect.height/415),cx=rect.width*.5,cy=rect.height*.43;
    const project=p=>({x:cx+(p.x+.16*p.z)*scale,y:cy+(p.y*.83-.42*p.z)*scale});
    const pieces=[];
    for(let i=0;i<8;i++){
      const points=[];
      for(let j=0;j<=96;j++){
        const t=j/96,p=threadPoint(i,t,scores,phase,review),next=threadPoint(i,Math.min(1,t+.005),scores,phase,review),prev=threadPoint(i,Math.max(0,t-.005),scores,phase,review);
        const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;
        const ribbonWidth=p.width*1.4,wx=-dy/len*Math.cos(p.roll)*ribbonWidth,wy=dx/len*Math.cos(p.roll)*ribbonWidth,wz=Math.sin(p.roll)*ribbonWidth;
        points.push({p:project(p),l:project({x:p.x-wx,y:p.y-wy,z:p.z-wz}),r:project({x:p.x+wx,y:p.y+wy,z:p.z+wz}),z:p.z,t,roll:p.roll});
      }
      for(let j=0;j<96;j++)pieces.push({a:points[j],b:points[j+1],i,j,z:(points[j].z+points[j+1].z)/2});
    }
    pieces.sort((a,b)=>a.z-b.z);
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const {a,b,i,j} of pieces){
      const color=regionDetails[i].color,front=Math.cos(a.roll)>.08;
      ctx.fillStyle=front?color:mix(color,-.16);
      ctx.beginPath();ctx.moveTo(a.l.x,a.l.y);ctx.lineTo(b.l.x,b.l.y);ctx.lineTo(b.r.x,b.r.y);ctx.lineTo(a.r.x,a.r.y);ctx.closePath();ctx.fill();
      // Thin ink contours along the continuous long edges, with no segment end strokes.
      ctx.strokeStyle='#414956bb';ctx.lineWidth=Math.max(.45,.8*scale);
      ctx.beginPath();ctx.moveTo(a.l.x,a.l.y);ctx.lineTo(b.l.x,b.l.y);ctx.moveTo(a.r.x,a.r.y);ctx.lineTo(b.r.x,b.r.y);ctx.stroke();
      const point=(p,q)=>({x:p.l.x+(p.r.x-p.l.x)*q,y:p.l.y+(p.r.y-p.l.y)*q});
      if(!front&&j%3===0&&Math.hypot(a.r.x-a.l.x,a.r.y-a.l.y)>6){
        ctx.strokeStyle='#42495466';ctx.lineWidth=.55;
        for(let n=0;n<3;n++){const q=.18+n*.14,p=point(a,q),end=point(b,q+.09);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();}
      }else if(front&&j%11===4){
        const p=point(a,.24+(i%3)*.15),end=point(b,.26+(i%3)*.15);
        ctx.strokeStyle='#4b53663b';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();
      }
      if(j%13===3){const p=point(a,.44);ctx.fillStyle='#47516a25';ctx.fillRect(p.x,p.y,.7,.7);}
    }
    // A faint reflection belongs to the live drawing and changes with its shape.
    if(!review){
      if(reflectionBuffer.width!==width||reflectionBuffer.height!==height){reflectionBuffer.width=width;reflectionBuffer.height=height;}
      const reflected=reflectionBuffer.getContext('2d');reflected.clearRect(0,0,width,height);reflected.drawImage(canvas,0,0);
      ctx.save();ctx.beginPath();ctx.rect(0,rect.height*.68,rect.width,rect.height*.27);ctx.clip();ctx.globalAlpha=.13;ctx.translate(0,rect.height*.92);ctx.scale(1,-.30);ctx.drawImage(reflectionBuffer,0,0,rect.width,rect.height);ctx.restore();
      const spots=$$('.thread-spot');
      for(let i=0;i<8;i++){const p=project(threadPoint(i,.51,scores,phase));writeMotionStyle(spots[i], { transform: `translate(${p.x}px,${p.y}px) translate(-50%,-50%)` });}

    }
  }


  function drawFrame(now) {
    frame = 0;
    if (scope.signal.aborted || !root.isConnected) return;
    if (now - lastFrame > 30) {
      lastFrame = now;
      const box = $("#wl-picture").getBoundingClientRect();
      if (variant === "threads" && box.bottom > 0 && box.top < innerHeight) drawInkThreads($("#wl-thread-canvas"), now);
    }
    if (!isReduced() && motionEnabled && now < frameUntil) frame = requestAnimationFrame(drawFrame);
  }
  function requestDraw(duration = 1800) {
    if (scope.signal.aborted) return;
    frameUntil = performance.now() + duration;
    if (isReduced() || !motionEnabled) {
      if (variant === "threads") drawInkThreads($("#wl-thread-canvas"), performance.now());
    } else if (!frame) frame = requestAnimationFrame(drawFrame);
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        if (entry.target.contains($("#wl-thread-stage"))) requestDraw(2200);
      }
    });
  }, { threshold: .08 });
  $$(".reveal").forEach(el => observer.observe(el));
  root.classList.add("js-reveal");
  const sizes = new ResizeObserver(() => { positionCamera(); requestDraw(600); });
  sizes.observe($("#wl-result-art"));
  sizes.observe($("#wl-explore-camera"));
  onRouteEnd(() => { observer.disconnect(); sizes.disconnect(); cancelAnimationFrame(frame); });
  selectExplore(selectedRegion, false);
  renderResult();
  renderMotion();
  if (langFocusPending) { $("#wl-lang").focus({ preventScroll: true }); langFocusPending = false; }
}
